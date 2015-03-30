var url = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export';

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


var layers = [
    new ol.layer.Tile({
	source: new ol.source.MapQuest({layer: 'osm'})
    }),
    pgis
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

map.on('singleclick', function(evt) {
    document.getElementById('info').innerHTML = '';
    var jsonUrl = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/2/query';

    var jsonOpts = {
	f: 'json',
	returnGeometry: 'true',
	spatialRel: 'esriSpatialRelIntersects',
	geometry: JSON.stringify({
	    rings: [extend(evt.coordinate)],
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

    $('#info').innerHTML = '';

    $.get(a, function(data) {
	var feat = JSON.parse(data);
	var table = $('<table>');

	table.addClass('table-striped');

	for (key in feat.features[0].attributes) {
	    var val = feat.features[0].attributes[key];

	    table.append($('<tr>').append($('<td>').html(key), $('<td>').html(val)))
	}

	$('#info').append(table);
    });
});
