var url = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export';

var geocoder = new google.maps.Geocoder();

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
	url: url
    })
});

var vectorSource = new ol.source.Vector();

var vStyle = [new ol.style.Style({
    stroke: new ol.style.Stroke({
	color: 'blue',
	width: 10
    }),
    fill: new ol.style.Fill({
	color: 'rgba(0, 0, 255, 0.1)'
    })
})];

var vectorLayer = new ol.layer.Vector({
    source: vectorSource
});


var layers = [
    new ol.layer.Tile({
	source: new ol.source.MapQuest({layer: 'osm'})
    }),
    pgis,
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
    vectorSource.clear();

    if (typeof feat === 'string') {
	feat = JSON.parse(feat);
    }

    var geom = feat.features[0].geometry.rings[0];

    var i, l;
    for (i = 0, l = geom.length; i < l; i++) {
    }

    var poly = new ol.Feature(new ol.geom.Polygon(geom));
    poly.setStyle(vStyle);

    vectorSource.addFeature(poly);
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
	fn.call(null, JSON.parse(data));
	drawFeat(data);
    });
}

function fillTable(feat) {
    $('#info').html('');
    var table = $('<table>');

    table.addClass('table-striped');

    for (key in feat.features[0].attributes) {
	var val = feat.features[0].attributes[key];

	if (key.match(/AssessorURL/i)) {
	    val = "http://www.co.pueblo.co.us/cgi-bin/webatrbroker.wsc/propertyinfo.p?par=" + feat.features[0].attributes.PAR_NUM;
	}

	if (val && typeof val === 'string' && val.match(/http/i)) {
	    val = $('<a>').text(val).attr('href', val);
	}

	table.append($('<tr>').append($('<td>').html(key), $('<td>').html(val)))
    }

    $('#info').append(table);
}

map.on('singleclick', function(evt) {
    document.getElementById('info').innerHTML = '';

    getInfo(evt.coordinate, function(data) {
	fillTable(data);
    });
});

$('#searchBtn').click(function() {
    var address = $('#search').val();
    geocoder.geocode({'address': address}, function(results, status) {
	if (results.length > 0) {
	    var lng = results[0].geometry.location.lng();
	    var lat = results[0].geometry.location.lat();
	    var coord = [lng, lat];
	    coord = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
	    view.setCenter(coord);
	    view.setZoom(19);

	    getInfo(coord, function(data) {
		fillTable(data);
	    });
	}
    });
});
