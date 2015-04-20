var padUrl = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export';
var geocoder = new google.maps.Geocoder();
var vectorSource = new ol.source.Vector();
var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: getStyle
});

function prettyUrl(key, val) {
    key = key || val;
    if (val && val !== "") {
	return $('<a>').text(key).attr('href', val);
    }
}

function prettyMoney(key, val) {
    var ret = "";
    if (val) {
	ret = "$ " + val;
    }
    return ret;
}

var prettyMap = {
    "Actual Improvement Value": {"ImprovementsActualValue": prettyMoney},
    "Actual Land Value": {"LandActualValue": prettyMoney},
    "Acres": {"Shape.STArea()": function(k, v) {
	var val = parseFloat(v) / parseFloat("43560.00");
	val = Number((val).toFixed(1));
	return val;
    }},
    "Assessed Improvement Value": {"ImprovementsAssessedValue": prettyMoney},
    "Assessed Land Value": {"LandAssessedValue": prettyMoney},
    "Assessor Link": {"AssessorURL": prettyUrl},
    "Electricity Provider": "electric",
    "Fire Department": "Fire",
    "Gas Provider": "gas",
    "Legal Description": "LegalDescription",
    "Levy Link": {"LevyURL": prettyUrl},
    "Mobile Home": "MobileHomePresent",
    "Neighborhood": "Neighborhood",
    "Owner Address": ["OwnerStreetAddress", "OwnerCity", "OwnerState", "OwnerZip", "OwnerCountry"],
    "Owner": ["OwnerOverflow", "SubOnwer1", "SubOwner2"],
    "Parcel Number": "PAR_NUM",
    "Property Tax": {"PropertyTax": prettyMoney},
    "Senior Exemption": "SeniorExemption",
    "Subdivision": "Subdivision",
    "Tax District": "TaxDistrict",
    "Tax Exemption": "TaxExempt",
    "Telecom Provider": "telecom",
    "Water Provider": "water",
    "Zoning Link": {"ZoningURL": prettyUrl},
    "Zoning": "Zoning"
};

var agisSrc = new ol.source.TileArcGISRest({
    url: padUrl,
    attributions: [
	new ol.Attribution({
	    html: 'Pueblo County ' +
		'<a href="http://maps.pueblo.org">Maps</a>'
	})
    ]
});

var layers = [
    new ol.layer.Tile({
	style: 'OSM',
	source: new ol.source.OSM()
    }),
    new ol.layer.Tile({
	style: 'Road',
	source: new ol.source.MapQuest({layer: 'osm'})
    }),
    new ol.layer.Tile({
	style: 'Aerial',
	visible: false,
	source: new ol.source.MapQuest({layer: 'sat'})
    }),
    new ol.layer.Group({
	style: 'AerialWithLabels',
	visible: false,
	layers: [
	    new ol.layer.Tile({
		source: new ol.source.MapQuest({layer: 'sat'})
	    }),
	    new ol.layer.Tile({
		source: new ol.source.MapQuest({layer: 'hyb'})
	    })
	]
    }),
    new ol.layer.Group({
	visible: true,
	style: 'AlwaysShow',
	layers: [
	    new ol.layer.Tile({
		extent: [-13884991, 2870341, -7455066, 6338219],
		visible: true,
		source: agisSrc
	    }),
	    new ol.layer.Tile({
		extent: [-13884991, 2870341, -7455066, 6338219],
		visible: true,
		source: new ol.source.XYZ({
		    url: 'http://wms.deftly.net/water_wells/{z}/{x}/{y}.png',
		})
	    }),
	    vectorLayer
	]
    })
];

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

var view = new ol.View({
    center: ol.proj.transform([-104.65, 38.25], 'EPSG:4326', 'EPSG:3857'),
    zoom: getHash('zoom') || 15
});

var map = new ol.Map({
    layers: layers,
    target: 'map',
    view: view
});



function drawFeat(feat, caller) {
    if (typeof feat === 'string') {
	feat = JSON.parse(feat);
    }

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
	drawFeat(data, "clicker");
    });
}

map.on('singleclick', clicker);
map.on('moveend', function(evt) {
    setHash();
});

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

    for (var namer in prettyMap) {
	key = namer;
	val = prettyMap[namer];
	switch (typeof prettyMap[namer]) {
	case "string":
	    if (key && feat.features[0].attributes[val]) {
		table.append($('<tr>').append($('<td>').html(key), $('<td>').html(feat.features[0].attributes[val])));
	    }
	    break;
	case "object":
	    if (val.hasOwnProperty(length)) {
		var ii, ll, v = [];

		for (ii = 0, ll = val.length; ii < ll; ii++) {
		    var item = feat.features[0].attributes[val[ii]];
		    if (item) {
			item = item.trim();
		    } else {
			item = "";
		    }
		    if (item !== "") {
			v.push(feat.features[0].attributes[val[ii]]);
		    }
		}
		val = v.join("<br />");
		if (key && val) {
		    table.append($('<tr>').append($('<td>').html(key), $('<td>').html(val)));
		}
	    } else {
		var kk, vv;
		for (kk in val) {
		    vv = val[kk];
		    var nvv = vv(key, feat.features[0].attributes[kk]);
		    if (key && nvv) {
			table.append($('<tr>').append($('<td>').html(key), $('<td>').html(nvv)));
		    }
		}
	    }
	    break;
	default:
	    if (namer && val) {
		table.append($('<tr>').append($('<td>').html(namer), $('<td>').html(val)));
	    }
	    break;
	}
    }

    $('#info').append(table);
}

function getHash(item) {
    var ret;
    var parts = parseHash();
    if (parts) {

	if (item === 'zoom') {
	    ret = parts[0];
	}

	if (item === 'coords') {
	    ret = parts[1];
	}
	return ret;
    }
}

function setHash(coords, zoom) {
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
	if (initial) {
	    getInfo(coords, function(data) {
		fillTable(data);
		drawFeat(data, "parsehash");
	    });
	} else {
	    return [z, coords];
	}
    }
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
		drawFeat(data, "dosearch");
	    });
	}
    });
}

$('#searchBtn').click(doSearch);
$('#search').keyup(function(e) {
    if (e.which === 13) {
	doSearch();
    }
});

parseHash(true);

$('#layer-select').change(function() {
    var style = $(this).find(':selected').val();
    var i, ii;
    for (i = 0, ii = layers.length; i < ii; ++i) {
	var ls = layers[i].get('style');
	if (ls != 'AlwaysShow') {
	    layers[i].set('visible', (layers[i].get('style') == style));
	}
    }
});

$('#layer-select').trigger('change');
