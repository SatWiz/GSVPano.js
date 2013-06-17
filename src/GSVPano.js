var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function (parameters) {

	'use strict';

	var _parameters = parameters || {},
		_location,
		_zoom,
		_panoId,
		_panoClient = new google.maps.StreetViewService(),
		_count = 0,
		_total = 0,
		_canvas = document.createElement('canvas'),
		_ctx = _canvas.getContext('2d'),
		rotation = 0,
        self = this;

    //override to receive progress events during load
    this.onProgress = function(p){};
    //override to custom handle errors
    this.onError = function(){
        console.error(message);
    };
    //ovverride to get notified when the panorama has loaded
    this.onPanoramaLoad = function(){};
    //override to get events when panorama failed to load data
    this.onNoPanoramaData = function(status){};


    //adapt the texture to the current zoom level
	this.adaptTextureToZoom = function () {
		var w = 416 * Math.pow(2, _zoom),
			h = (416 * Math.pow(2, _zoom - 1));
		_canvas.width = w;
		_canvas.height = h;
		_ctx.translate( _canvas.width, 0);
		_ctx.scale(-1, 1);
	};

    //place a single tile of the panorama into the stitched canvas
	this.composeFromTile = function (x, y, texture) {
		_ctx.drawImage(texture, x * 512, y * 512);
		_count++;
		
		var p = Math.round(_count * 100 / _total);
		self.onProgress(p);
		
		if (_count === _total) {
			this.canvas = _canvas;
			this.onPanoramaLoad();
		}
		
	};

    //load the individual tiles and paint to their corresponding location
    //on the canvas
	this.composePanorama = function () {
	
		this.onProgress(0);
		console.log('Loading panorama for zoom ' + _zoom + '...');
		
		var w = Math.pow(2, _zoom),
			h = Math.pow(2, _zoom - 1),
			url,
			x,
			y;
			
		_count = 0;
		_total = w * h;
		
		for( y = 0; y < h; y++) {
			for( x = 0; x < w; x++) {
				url = 'http://maps.google.com/cbk?output=tile&panoid=' + _panoId + '&zoom=' + _zoom + '&x=' + x + '&y=' + y + '&' + Date.now();
				(function (x, y) { 
					var img = new Image();
					img.addEventListener('load', function () {
						self.composeFromTile(x, y, this);
					});
					img.crossOrigin = '';
					img.src = url;
				})(x, y);
			}
		}
		
	};
	
    /**
     * load the panorama for the provided location
     * @param {google.maps.LatLng} location the geographic location to load
     * @param {Number} [radius] radius to search for closest (in meters), defaults to 50 meters
     */
	this.load = function (location, radius) {
        radius = radius || 50;
		console.log('Load for', location);
		_panoClient.getPanoramaByLocation(location, radius, function (result, status) {
			if (status === google.maps.StreetViewStatus.OK) {
				self.onPanoramaData( result );
				var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
				rotation = (result.tiles.centerHeading - h) * Math.PI / 180.0;
                //expose the copyright info on the instance
				self.copyright = result.copyright;
				_panoId = result.location.pano;
				self.location = location;
				self.composePanorama();
			} else {
				self.onNoPanoramaData( status );
			    self.onError('Could not retrieve panorama for the following reason: ' + status);
			}
		});
		
	};
	
    /**
     * set the zoom level for the panorama
     * @param {Number} z the zoom level
     */
	this.setZoom = function( z ) {
		_zoom = z;
		this.adaptTextureToZoom();
	};

	this.setZoom( _parameters.zoom || 1 );

};
