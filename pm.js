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

map.on('moveend', function(evt) {
    parseHash();
});

function drawFeat(feat) {
    if (typeof feat === 'string') {
	feat = JSON.parse(feat);
    }
    //    vectorSource.clear();

    var geom = feat.features[0].geometry.rings[0];
    var poly = new ol.Feature(new ol.geom.MultiPoint(geom));

    vectorSource.addFeature(poly);
}

function clicker(evt) {
    document.getElementById('info').innerHTML = '';
    setHash(evt.coordinate);
    view.setCenter(evt.coordinate);
    vectorSource.clear();

    getInfo(evt.coordinate, function(data) {
	fillTable(data);
	drawFeat(data);
    });
}

map.on('singleclick', clicker);

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

function setHash(coords, zoom) {
    var c = coords || view.getCenter();
    var z = zoom || view.getZoom();
    window.location.hash = "/" + z + '/' + c.join('/');
}

function doSearch() {
    var address = $('#search').val();
    geocoder.geocode({'address': address}, function(results, status) {
	if (results.length > 0) {
	    var lng = results[0].geometry.location.lng();
	    var lat = results[0].geometry.location.lat();
	    var coord = [lng, lat];
	    coord = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');

	    vectorSource.clear();
	    vectorSource.addFeature(new ol.Feature(new ol.geom.Point(coord)));

	    view.setCenter(coord);
	    view.setZoom(18);

	    setHash(coord, 18);

	    getInfo(coord, function(data) {
		fillTable(data);
		drawFeat(data);
	    });
	}
    });
}

$('#searchBtn').click(doSearch);

function parseHash(initial) {
    var parts = window.location.hash.split('/');
    if (parts.length > 3) {
	parts.shift(); // clobber the #

	var z = parts.shift();
	var coords = parts;
	//view.setCenter(coords);
	//view.setZoom(z);
	//clicker(coords);
	getInfo(coords, function(data) {
	    fillTable(data);
	    drawFeat(data);
	});
    }
}

parseHash();
/*
  $(window).on('popstate', function() {
  parseHash();
  });



*/
