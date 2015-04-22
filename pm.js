var geocoder = new google.maps.Geocoder();
function prettyUrl(key, val, attrs) {
    key = key || val;
    if (val && val !== "") {
	return $('<a>').text(key).attr('href', val).attr('target', "_blank");
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

var wellMap = {
    receipt:	"Receipt: ",
    aquifer1:	"Aquifer: ",
    welldepth:	"Well Depth: ",
    permit:	"Permit: "
};

var wellKeyMap = {
    receipt: function(p) {
	return $('<a>').text(p)
	    .attr('href', 'http://www.dwr.state.co.us/WellPermitSearch/View.aspx?receipt=' + p)
	    .attr('target', '_blank');
    }
};

function prettyWell(well) {
    var t = $('<table>'), k, v, i, l, r = [];

    t.addClass('table-striped');

    for (k in well) {
	if (well[k]) {
	    r.push({key: k, val: well[k]});
	}
    }
    r = r.sort();

    for (i = 0, l = r.length; i < l; i++) {
	var tr = $('<tr>');
	var rr = r[i];
	for (k in rr) {
	    if (k === 'key') {
		tr.append($('<td>').text(wellMap[rr.key]));
	    } else {
		if (wellKeyMap[rr.key]) {
		    rr.val = wellKeyMap[rr.key](rr.val);
		}
		tr.append($('<td>').html(rr.val));
	    }
	}
	t.append(tr);
    }
    return t;
}

var prettyMap = {
    "Parcel Number": "PAR_NUM",

    "break0": "Owner Info:",

    "Owner": ["Owner", "OwnerOverflow", "SubOnwer1", "SubOwner2"],
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

function fillTable(feat) {
    $('#info').html('');
    var table = $('<table>');

    table.addClass('table-striped');
    if (!feat.features) {
	return;
    }

    for (var namer in prettyMap) {
	key = namer;
	val = prettyMap[namer];
	switch (typeof prettyMap[namer]) {
	case "string":
	    if (key.match(/^break\d/)) {
		table.append($('<tr>').append($('<td colspan="2">').html("<b>" + val + "</b>")));
	    } else {
		if (key && feat.features[0].properties[val]) {
		    table.append($('<tr>').append($('<td>').html(key), $('<td>').html(feat.features[0].properties[val])));
		}
	    }
	    break;
	case "object":
	    if (val.hasOwnProperty(length)) {
		var ii, ll, v = [];

		for (ii = 0, ll = val.length; ii < ll; ii++) {
		    var item = feat.features[0].properties[val[ii]];
		    if (item) {
			item = item.trim();
		    } else {
			item = "";
		    }
		    if (item !== "") {
			v.push(feat.features[0].properties[val[ii]]);
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
		    var nvv = vv(key, feat.features[0].properties[kk], feat.features[0].properties);
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

var utfGrid = new L.UtfGrid('http://wms.deftly.net/utfgrid_water_wells/{z}/{x}/{y}.json?callback={cb}', {
});

var wellImg = L.tileLayer("http://wms.deftly.net/water_wells/{z}/{x}/{y}.png", {
    maxZoom: 18,
    minZoom: 16
});

var bl = new L.Google('HYBRID');

var parcels = new L.esri.imageMapLayer("http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/export", {
    maxZoom: 18,
    minZoom: 16,
    format: 'png32',
    transparent: true,
    noData: 0
});

var popupTemplate = "<h3>{PAR_NUM}</h3><small></small>";
var wellTemplate = "<h3>{receipt}</h3><small>Permit: {permit}</small>";
var log = true;

utfGrid.on('mouseover', function (e) {
    $('#well').html(prettyWell(e.data));
});

var map = L.map('map', {
    center: [38.25, -104.65],
    zoom: 13,
    layers: [bl, parcels, wellImg]
});

var service = L.esri.Services.featureLayer({
    url: 'http://maps.co.pueblo.co.us/outside/rest/services/pueblo_county_parcels_bld_footprints/MapServer/2'
});

var geoL = L.geoJson(null, {
    style: function() {
	return {"color": "red"};
    }
}).addTo(map);

map.on('click', function(e) {
    geoL.clearLayers();

    service.query().nearby(e.latlng).run(function(error, featureCollection, response){
	geoL.addData(featureCollection);
	fillTable(featureCollection);
    });
});


map.addLayer(utfGrid);

var baseMaps = {
    "Google": bl
};

var overlayMaps = {
    "Wells": wellImg,
    "Parcels": parcels
};

L.control.layers(baseMaps, overlayMaps).addTo(map);

function doSearch() {
    var address = $('#search').val();
    $('#well').html("");
    geocoder.geocode({'address': address}, function(results, status) {
	if (results.length > 0) {
	    var lng = results[0].geometry.location.lng();
	    var lat = results[0].geometry.location.lat();
	    map.panTo([lat, lng]);
	    map.setZoom(17);
	    service.query().contains(L.latLng(lat, lng)).run(function(error, featureCollection, response){
		geoL.addData(featureCollection);
		fillTable(featureCollection);
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

var hash = new L.Hash(map);
