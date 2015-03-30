var url = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export';

var layers = [
    new ol.layer.Tile({
	source: new ol.source.MapQuest({layer: 'osm'})
    }),
    new ol.layer.Tile({
	extent: [-13884991, 2870341, -7455066, 6338219],
	source: new ol.source.TileArcGISRest({
	    url: url
	})
    })
];

var map = new ol.Map({
    layers: layers,
    target: 'map',
    view: new ol.View({
	center: [-10997148, 4569099],
	zoom: 10
    })
});
