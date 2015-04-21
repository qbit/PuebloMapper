var padUrl = 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer';
var geocoder = new google.maps.Geocoder();
var vectorSource = new ol.source.Vector();
var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: getStyle
});
var utfGridSource = new ol.source.TileUTFGrid({
    //url: "http://wms.deftly.net/utfgrid_water_wells/{z}/{x}/{y}.json"
    url: "http://wms.deftly.net/utfgrid_water_wells/0/0/0.json"
});
var utfGridLayer = new ol.layer.Tile({source: utfGridSource});

function prettyUrl(key, val, attrs) {
    key = key || val;
    if (val && val !== "") {
	return $('<a>').text(key).attr('href', val);
    }
}

function totalImprovement(key, val, attrs) {
    var tot = parseInt(attrs["ImprovementsActualValue"], 10) + parseInt(attrs["LandActualValue"], 10);
    return "$ " + tot;
}

function prettyMoney(key, val, attrs) {
    var ret = "";
    if (val) {
	ret = "$ " + val;
    }
    return ret;
}

var prettyMap = {
    "Parcel Number": "PAR_NUM",

    "break0": "Owner Info:",

    "Owner": ["OwnerOverflow", "SubOnwer1", "SubOwner2"],
    "Owner Address": ["OwnerStreetAddress", "OwnerCity", "OwnerState", "OwnerZip", "OwnerCountry"],
    "Legal Description": "LegalDescription",

    "break1": "Values:",

    "Total Improvement Value": {"_": totalImprovement},
    "Actual Improvement Value": {"ImprovementsActualValue": prettyMoney},
    "Actual Land Value": {"LandActualValue": prettyMoney},
    "Assessed Improvement Value": {"ImprovementsAssessedValue": prettyMoney},
    "Assessed Land Value": {"LandAssessedValue": prettyMoney},
    "Property Tax": {"PropertyTax": prettyMoney},

    "break5": "Links:",

    "Assessor Link": {"AssessorURL": prettyUrl},
    "Levy Link": {"LevyURL": prettyUrl},
    "Zoning Link": {"ZoningURL": prettyUrl},

    "break2": "Services:",

    "Electricity Provider": "electric",
    "Fire Department": "Fire",
    "Gas Provider": "gas",
    "Telecom Provider": "telecom",
    "Water Provider": "water",

    "break3": "Land Information:",

    "Acres": {"Shape.STArea()": function(k, v) {
	var val = parseFloat(v) / parseFloat("43560.00");
	val = Number((val).toFixed(1));
	return val;
    }},
    "Mobile Home": "MobileHomePresent",
    "Neighborhood": "Neighborhood",
    "Senior Exemption": "SeniorExemption",
    "Subdivision": "Subdivision",

    "break4": "Tax:",

    "Tax District": "TaxDistrict",
    "Tax Exemption": "TaxExempt",


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

var deftXYZsrc = new ol.source.XYZ({
    url: 'http://wms.deftly.net/water_wells/{z}/{x}/{y}.png',
    attributions: [
	new ol.Attribution({
	    html: '<a href="http://water.state.co.us/Home/Pages/default.aspx">CDNR</a>'
	})
    ]
});

var layers = [
    new ol.layer.Tile({
	style: 'OSM',
	visible: false,
	source: new ol.source.OSM()
    }),
    new ol.layer.Tile({
	style: 'Road',
	visible: false,
	source: new ol.source.MapQuest({layer: 'osm'})
    }),
    new ol.layer.Tile({
	style: 'Satellite',
	visible: false,
	source: new ol.source.BingMaps({key: 'Aq7e23Eva6DtRFf1iZPllRqUNjHM-zN7ap_TegK6IUm9HuO7a8KeeeiU3b10tFr9', imagerySet: 'Aerial'})
    }),
    new ol.layer.Group({
	style: 'SatWithLabels',
	visible: true,
	layers: [
	    new ol.layer.Tile({
		source: new ol.source.BingMaps({key: 'Aq7e23Eva6DtRFf1iZPllRqUNjHM-zN7ap_TegK6IUm9HuO7a8KeeeiU3b10tFr9', imagerySet: 'AerialWithLabels'})
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
		source: deftXYZsrc
	    }),
	    vectorLayer,
	    utfGridLayer
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
	    if (key.match(/^break\d/)) {
		table.append($('<tr>').append($('<td colspan="2">').html("<b>" + val + "</b>")));
	    } else {
		if (key && feat.features[0].attributes[val]) {
		    table.append($('<tr>').append($('<td>').html(key), $('<td>').html(feat.features[0].attributes[val])));
		}
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
		    var nvv = vv(key, feat.features[0].attributes[kk], feat.features[0].attributes);
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

var mapElement = document.getElementById('map');

var displayCountryInfo = function(coordinate) {
    var viewResolution = /** @type {number} */ (view.getResolution());
    utfGridSource.forDataAtCoordinateAndResolution(coordinate, viewResolution, function(data) {
	// If you want to use the template from the TileJSON,
	//  load the mustache.js library separately and call
	//  info.innerHTML = Mustache.render(gridSource.getTemplate(), data);
	mapElement.style.cursor = data ? 'pointer' : '';
	if (data) {
	    console.log(data);
	}
    });
};

map.on('pointermove', function(evt) {
    if (evt.dragging) {
	return;
    }
    var coordinate = map.getEventCoordinate(evt.originalEvent);
    displayCountryInfo(coordinate);
});
