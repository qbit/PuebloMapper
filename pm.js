var padUrl = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export';

var geocoder = new google.maps.Geocoder();

var styles = {
    'Point': [new ol.style.Style({
	image: new ol.style.Circle({
	    radius: 5,
	    fill: new ol.style.Fill({color: 'red'}),
	    stroke: new ol.style.Stroke({color: 'red', width: 1})
	})
    })],
    'MultiPoint': [new ol.style.Style({
	image: new ol.style.Circle({
	    radius: 1,
	    fill: new ol.style.Fill({color: 'red'}),
	    stroke: new ol.style.Stroke({color: 'red', width: 3})
	}),
	fill: new ol.style.Fill({color: 'rgba(255,255,255,0.4)'}),
	stroke: new ol.style.Stroke({color: 'green', width: 1})
    })]
};

function getStyle(feat, geom) {
    return styles[feat.getGeometry().getType()];
}

function extend(coord) {
    var a = [];
    a.push(coord);
    a.push([coord[0] - 10, coord[1]]);
    a.push([coord[0] - 10, coord[1] - 10]);
    a.push([coord[0], coord[1] - 10]);
    a.push([coord[0], coord[1]]);
    return a;
}

var pgis = new ol.layer.Tile({
    extent: [-13884991, 2870341, -7455066, 6338219],
    source: new ol.source.TileArcGISRest({
	url: padUrl
    })
});

var wells =   new ol.layer.Tile({
    extent: [-13884991, 2870341, -7455066, 6338219],
    source: new ol.source.XYZ({
	url: 'http://localhost:8080/example/{z}/{x}/{y}.png',
    })
});

var vectorSource = new ol.source.Vector();

var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: getStyle
});

var OSM = new ol.layer.Group({
    layers: [
	new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: 'osm'})
	})
    ]
});

var SAT = new ol.layer.Group({
    layers:[
	new ol.layer.Tile({
	    source: new ol.source.MapQuest({layer: 'sat'})
	})
    ]
});

var layers = [
    SAT,
    pgis,
    wells,
    vectorLayer
];

var view = new ol.View({
    center: ol.proj.transform([-104.65, 38.25], 'EPSG:4326', 'EPSG:3857'),
    zoom: 15
});

var map = new ol.Map({
    layers: layers,
    target: 'map',
    view: view
});

function drawFeat(feat) {
    console.log('drawfeat');
    if (typeof feat === 'string') {
	feat = JSON.parse(feat);
    }

    if (feat.features.length > 0) {

	var geom = feat.features[0].geometry.rings[0];
	var poly = new ol.Feature(new ol.geom.MultiPoint(geom));

	vectorSource.addFeature(poly);
    }
}

function getInfo(coord, fn) {
    var jsonUrl = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/2/query';
    var jsonOpts = {
	f: 'json',
	returnGeometry: 'true',
	spatialRel: 'esriSpatialRelIntersects',
	geometry: JSON.stringify({
	    rings: [extend(coord)],
	    spatialReference: {
		wkid: 102100,
		latestWkid: 3857
	    }
	}),
	geometryType: 'esriGeometryPolygon',
	inSR: '102100',
	outFields: '*',
	outSR: '102100'
    };

    var a = jsonUrl + '?' + $.param(jsonOpts);


    $.get(a, function(data) {
	drawFeat(data);
	fn.call(null, JSON.parse(data));
    });
}

function fillTable(feat) {
    $('#info').html('');
    var table = $('<table>');

    table.addClass('table-striped');

    for (var key in feat.features[0].attributes) {
	var val = feat.features[0].attributes[key];

	if (key.match(/Shape.STArea\(\)/)) {
	    key = "Acres";
	    val = parseFloat(val) / parseFloat("43560.00");
	    val = Number((val).toFixed(1));
	}

	if (key.match(/AssessorURL/i)) {
	    val = "http://www.co.pueblo.co.us/cgi-bin/webatrbroker.wsc/propertyinfo.p?par=" + feat.features[0].attributes.PAR_NUM;
	}

	if (val && typeof val === 'string' && val.match(/http/i)) {
	    val = $('<a>').text(val).attr('href', val);
	}

	table.append($('<tr>').append($('<td>').html(key), $('<td>').html(val)));
    }

    $('#info').append(table);
}

map.on('singleclick', function(evt) {
    document.getElementById('info').innerHTML = '';
    vectorSource.clear();

    setLocation(evt.coordinate, view.getZoom());
    saveLocation(evt.coordinate);
    setHash();

    getInfo(evt.coordinate, function(data) {
	fillTable(data);
    });
});

function saveLocation(coords, zoom) {
    console.log("savelocation");
    $.cookie('coords', coords || view.getCenter());
}

function getLocation() {
    var c = $.cookie('coords'), i, l;
    if (c) {
	c = c.split(',');
	for (i = 0, l = c.length; i < l; i++) {
	    c[i] = parseFloat(c[i]);
	}
	return c;
    }
}


function setHash(coords, zoom) {
    console.log("sethash");
    var c = coords || view.getCenter();
    var z = zoom || view.getZoom();
    window.location.hash = "/" + z + '/' + c.join('/');
}

function parseHash(initial) {
    var parts = window.location.hash.split('/');
    if (parts.length > 3) {
	parts.shift(); // clobber the #

	var z = parts.shift();
	var coords = parts;

	var oldCoords = getLocation();
	if (oldCoords && oldCoords.length === 2 && initial) {
	    view.setCenter(oldCoords);
	    getInfo(oldCoords, function(data) {
		fillTable(data);
	    });
	} else {
	    setLocation(coords, z);
	}
    }
}


function setLocation(coords, zoom) {
    console.log("setlocation");
    view.setCenter(coords);
    view.setZoom(zoom || 19);
}

function doSearch() {
    var address = $('#search').val();

    geocoder.geocode({'address': address}, function(results, status) {
	if (results.length > 0) {
	    var lng = results[0].geometry.location.lng();
	    var lat = results[0].geometry.location.lat();
	    var coord = [lng, lat];
	    coord = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');

	    vectorSource.addFeature(new ol.Feature(new ol.geom.Point(coord)));
	    setLocation(coord);

	    getInfo(coord, function(data) {
		fillTable(data);
	    });
	}
    });
}

parseHash(true);

$(window).on('popstate', function() {
    parseHash();
});


$('#searchBtn').click(doSearch);
