/* Mobile responsive */
$(window).resize(function () {
	setSideBar();
});

/* When the sidebar icon is clicked on, we need to toggle a class
 * on the body to perform the hiding/showing of our sidebar.
 */
$('#sidebar-icon').on('click', function() {
	$('body').toggleClass('sidebar-hidden');
});

function setSideBar() {
	if ($(window).width() < 768) {
		$('body').addClass('sidebar-hidden');
	}
}

// Google map
var map;

// Create a new blank array for all the listing markers.
var markers = [];

var mapTimeout = setTimeout(function() {
	$('#map').html('<em>Failed to load google map</em>');
}, 8000);

var largeInfowindow = new google.maps.InfoWindow();

// Style the markers a bit. This will be our listing marker icon.
var defaultIcon = makeMarkerIcon('0091ff');

// Create a "highlighted location" marker color for when the user
// mouses over the marker.
var highlightedIcon = makeMarkerIcon('FFFF24');

// Constructor creates a new map - only center and zoom are required.
map = new google.maps.Map(document.getElementById('map'), {
	center: {lat: 40.7413549, lng: -73.9980244},
	zoom: 13,
	mapTypeControl: false
});

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, infowindow) {
	// Check to make sure the infowindow is not already opened on this marker.
	if (infowindow.marker != marker) {
		// Clear the infowindow content to give the streetview time to load.
		infowindow.setContent('');
		infowindow.marker = marker;
		infowindow.active = true;
		// Make sure the marker property is cleared if the infowindow is closed.
		infowindow.addListener('closeclick', function() {
			infowindow.marker = null;
			infowindow.active = false;
		});
		infowindow.setContent(
			'<div id="pano"><h4>' + marker.title +
				'</h4></div><div id="streetview"><em>Street view is loading...</em></div>' +
				'<div><ul id="wiki"><em>Wikipedia is loading...</em></ul></div>');
		var streetViewService = new google.maps.StreetViewService();
		var radius = 50;
		// In case the status is OK, which means the pano was found, compute the
		// position of the streetview image, then calculate the heading, then get a
		// panorama from that and set the options
		function getStreetView(data, status) {
			if (status == google.maps.StreetViewStatus.OK) {
				var nearStreetViewLocation = data.location.latLng;
				var heading = google.maps.geometry.spherical.computeHeading(
					nearStreetViewLocation, marker.position);
					var panoramaOptions = {
						position: nearStreetViewLocation,
						pov: {
							heading: heading,
							pitch: 30
						}
					};
				var panorama = new google.maps.StreetViewPanorama(
					document.getElementById('streetview'), panoramaOptions);
			} else if (status == google.maps.StreetViewStatus.UNKNOWN_ERROR) {
				$('#streetview').html('<em>Failed to get street view resources</em>');
			} else {
				$('#streetview').html('<em>No Street View Found</em>');
			}
		}
		// Use streetview service to get the closest streetview image within
		// 50 meters of the markers position
		streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
		var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + marker.title + '&format=json&callback=wikiCallback';
		var wikiTimeout = setTimeout(function() {
			$('#wiki').html('<em>Failed to get wikipedia resources</em>');
		}, 4000);
		$.ajax({
			url: wikiUrl,
			dataType: "jsonp",
			success: function(response) {
				var articleList = response[1];
				if (articleList.length <= 0) {
					$('#wiki').html('<em>No Wikipedia entries</em>');
				} else {
					$('#wiki').html('<h5>Wikipedia entries</h5>');
					for (var i = 0; i < articleList.length; i++) {
						var articleStr = articleList[i];
						var url = 'http://en.wikipedia.org/wiki/' + articleStr;
						$('#wiki').append('<li><a target="_blank" href="' + url + '">' +
							articleStr + '</a></li>');
					}
				}
				clearTimeout(wikiTimeout);
			}
		});
		// Open the infowindow on the correct marker.
		infowindow.open(map, marker);
	}
}

function showMarkerInfo(marker) {
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
	}.bind(marker), 2220);
	populateInfoWindow(marker, largeInfowindow);

	// Highlight selected title of place
	$('.places').each(function() {
		if ($(this).text() === marker.title) {
			$(this).addClass('active');
		} else {
			$(this).removeClass('active');
		}
	});

	setSideBar();
}

function makeMarker(data, i) {
	var marker = new google.maps.Marker({
		position: data.location,
		title: data.title,
		animation: google.maps.Animation.DROP,
		icon: defaultIcon,
		id: i
	});
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
	this.title = data.title;
	this.marker = makeMarker(data, i);
	this.showInfo = function () {
		showMarkerInfo(this.marker);
	};
}

function ViewModel(places) {
	this.filterValue = ko.observable("");

	this.places = ko.observableArray(places.map(function(data, index) {
		return new Place(data, index);
	}));

	this.filteredPlaces = ko.computed(function() {
		return places = this.places().filter(function(place) {
			if (place.title.toUpperCase().indexOf(this.filterValue().toUpperCase()) >= 0) {
				// show marker
				place.marker.setMap(map);
				return true;
			} else {
				// hide marker and close selected marker's info window
				if (largeInfowindow.marker && largeInfowindow.marker.title === place.marker.title) {
					largeInfowindow.close();
					largeInfowindow.marker = null;
				}
				place.marker.setMap(null);
				return false;
			}
		}.bind(this));
	}.bind(this));
}

ko.applyBindings(new ViewModel(places));

// Loop through the markers array and display them all.
var bounds = new google.maps.LatLngBounds();
// Extend the boundaries of the map for each marker and display the marker
for (var i = 0; i < markers.length; i++) {
	markers[i].setMap(map);
	bounds.extend(markers[i].position);
}
map.fitBounds(bounds);

clearTimeout(mapTimeout);
