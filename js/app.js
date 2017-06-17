// Google map
var map = null;

// Create a new blank array for all the listing markers.
var markers = [];

// Infomation window
var largeInfowindow = null;

// Style the markers a bit. This will be our listing marker icon.
var defaultIcon = null;

// Create a "highlighted location" marker color for when the user
// mouses over the marker.
var highlightedIcon = null;

// Selected place
var selectedPlace = null;

// These are the real estate listings that will be shown to the user.
// Normally we'd have these in a database instead.
var places = [
	{title: 'Central Park', location: {lat: 40.7828647, lng: -73.9653551}},
	{title: 'Statue of Liberty', location: {lat: 40.6892497, lng: -74.0445001}},
	{title: 'Park Ave Penthouse', location: {lat: 40.7713024, lng: -73.9632393}},
	{title: 'Chelsea Loft', location: {lat: 40.7444883, lng: -73.9949465}},
	{title: 'Union Square Open Floor Plan', location: {lat: 40.7347062, lng: -73.9895759}},
	{title: 'East Village Hip Studio', location: {lat: 40.7281777, lng: -73.984377}},
	{title: 'TriBeCa Artsy Bachelor Pad', location: {lat: 40.7195264, lng: -74.0089934}},
	{title: 'Chinatown Homey Space', location: {lat: 40.7180628, lng: -73.9961237}}
];

// Place model
function Place(data, i) {
	this.isActive = ko.observable(false);
	this.title = data.title;
	this.marker = makeMarker(this, data, i);
	this.showInfo = function () {
		showMarkerInfo(this.marker);
	};
}

function ViewModel() {
	this.loadingInfo = ko.observable('Map is loading ...');
	this.isSidebarHidden = ko.observable(true);

	// When the sidebar icon is clicked on, we need to toggle a class
	// on the body to perform the hiding/showing of our sidebar.
	this.sideBarIconClick = function() {
		this.isSidebarHidden(!this.isSidebarHidden());
	};

	this.resetSideBar = function() {
		if ($(window).width() < 768) {
			this.isSidebarHidden(true);
		} else {
			this.isSidebarHidden(false);
		}
	};

	this.filterValue = ko.observable("");

	this.places = ko.observableArray([]);

	this.filteredPlaces = ko.computed(function() {
		var places = this.places().filter(function(place) {
			if (place.title.toUpperCase().indexOf(this.filterValue().toUpperCase()) >= 0) {
				// show marker
				place.marker.setVisible(true);
				return true;
			} else {
				// hide marker and close selected marker's info window
				if (largeInfowindow.marker && largeInfowindow.marker.title === place.marker.title) {
					largeInfowindow.close();
					largeInfowindow.marker = null;
					place.isActive(false);
				}
				place.marker.setVisible(false);
				return false;
			}
		}.bind(this));
		return places;
	}.bind(this));
}

var viewModel = new ViewModel();
ko.applyBindings(viewModel);

// Mobile responsive
$(window).resize(function () {
	viewModel.resetSideBar();
});

// Error callback for GMap API request
function mapErrorHandler() {
	viewModel.loadingInfo('Failed to load google map');
}

// Callback after async loading google map api
function initMap() {
	// Style the markers a bit. This will be our listing marker icon.
	defaultIcon = makeMarkerIcon('0091ff');

	// Create a "highlighted location" marker color for when the user
	// mouses over the marker.
	highlightedIcon = makeMarkerIcon('FFFF24');

	viewModel.places(places.map(function(data, index) {
		return new Place(data, index);
	}));

	// Constructor creates a new map - only center and zoom are required.
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 40.7413549, lng: -73.9980244},
		zoom: 13,
		mapTypeControl: false
	});

	largeInfowindow = new google.maps.InfoWindow();
	// Make sure the marker property is cleared if the infowindow is closed.
	largeInfowindow.addListener('closeclick', function() {
		largeInfowindow.marker.place.isActive(false);
		largeInfowindow.marker = null;
		largeInfowindow.active = false;
	});

	// Loop through the markers array and display them all.
	var bounds = new google.maps.LatLngBounds();
	// Extend the boundaries of the map for each marker and display the marker
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
		bounds.extend(markers[i].position);
	}
	map.fitBounds(bounds);

	google.maps.event.addDomListener(window, 'resize', function() {
		map.fitBounds(bounds);
	});
}

function showMarkerInfo(marker) {
	// Highlight current selected place
	if (selectedPlace) {
		selectedPlace.isActive(false);
	}
	marker.place.isActive(true);
	selectedPlace = marker.place;

	// Stop previous animation
	if (largeInfowindow.marker && largeInfowindow.marker !== null) {
		largeInfowindow.marker.setAnimation(null);
	}
	// Set current animation
	marker.setAnimation(google.maps.Animation.BOUNCE);
	window.setTimeout(function() {
		if (this.getAnimation() !== null) {
			this.setAnimation(null);
		}
	}.bind(marker), 1400);
	populateInfoWindow(marker, largeInfowindow);

	viewModel.resetSideBar();
}

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow) {
	// Check to make sure the infowindow is not already opened on this marker.
	if (infowindow.marker != marker) {
		// Clear the infowindow content to give the wikipedia time to load.
		infowindow.setContent('<div id="pano"></div>');
		infowindow.marker = marker;
		infowindow.active = true;
		var html =
			'<div id="pano">' +
				'<h4>' + marker.title + '</h4>' +
				'%entry%' +
			'</div>';
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
		}).done(function(data) {
			var articleList = data[1];
			if (articleList.length <= 0) {
				infowindow.setContent(html.replace('%entry%', '<em>No Wikipedia entries</em>'));
			} else {
				var entry = '<ul>';
				for (var i = 0; i < articleList.length; i++) {
					var articleStr = articleList[i];
					var url = 'http://en.wikipedia.org/wiki/' + articleStr;
					entry += '<li><a target="_blank" href="' + url + '">' +
						articleStr + '</a></li>';
				}
				entry += '</ul>';
				infowindow.setContent(html.replace('%entry%', entry));
			}
		}).fail(function(jqXHR, textStatus) {
			infowindow.setContent(html.replace('%entry%', '<em>Failed to get wikipedia resources</em>'));
		});
		// Open the infowindow on the correct marker.
		infowindow.open(map, marker);
	}
}

// Creates a new marker and push it into marker list
function makeMarker(place, data, i) {
	var marker = new google.maps.Marker({
		position: data.location,
		title: data.title,
		animation: google.maps.Animation.DROP,
		icon: defaultIcon,
		id: i
	});
	marker.place = place;
	// Create an onclick event to open the large infowindow at each marker.
	marker.addListener('click', function() {
		showMarkerInfo(this);
	});
	// Two event listeners - one for mouseover, one for mouseout,
	// to change the colors back and forth.
	marker.addListener('mouseover', function() {
		this.setIcon(highlightedIcon);
	});
	marker.addListener('mouseout', function() {
		this.setIcon(defaultIcon);
	});
	// Push the marker to our array of markers.
	markers.push(marker);
	return marker;
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high, have an origin
// of 0, 0 and be anchored at 10, 34).
function makeMarkerIcon(markerColor) {
	var markerImage = new google.maps.MarkerImage(
		'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
		'|40|_|%E2%80%A2',
		new google.maps.Size(21, 34),
		new google.maps.Point(0, 0),
		new google.maps.Point(10, 34),
		new google.maps.Size(21,34));
	return markerImage;
}
