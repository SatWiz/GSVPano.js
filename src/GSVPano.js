var GSVPANO = GSVPANO || {};
GSVPANO.PanoLoader = function (parameters) {

	'use strict';

	var _parameters = parameters || {},
		_location,
		_zoom,
		_panoClient = new google.maps.StreetViewService(),
		_count = 0,
		_total = 0,
		_canvas = document.createElement('canvas'),
		_ctx = _canvas.getContext('2d'),
		rotation = 0,
        composeFromTile,
        self = this;

    //override to receive progress events during load
    this.onProgress = function(p){};
    //override to custom handle errors
    this.onError = function(){
        console.error(message);
    };
    //ovverride to get notified when the panorama has loaded
    this.onPanoramaLoad = function(){};
    //override to get the panorama data
    this.onPanoramaData = function(){};
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


    /**
     * load the individual tiles and paint to their corresponding location on the canvas
     * @param {String} panoId the id to the panoramic image, provided by google (use #find())
     * @param {Function} callback the callback for when the canvas is complete, invoked with signature `( error, callback )`
     */
	this.composePanorama = function ( panoId, callback ) {
	    callback = callback || function(){};
		this.onProgress(0);
		console.log('Loading panorama for zoom ' + _zoom + '...');
		
		var w = Math.pow(2, _zoom),
			h = Math.pow(2, _zoom - 1),
			url,
			x,
			y;

		_count = 0;
		_total = (w) * h;

		
		for( y = 0; y < h; y++) {
			for( x = 0; x < w; x++) {
				url = 'http://maps.google.com/cbk?output=tile&panoid=' + panoId + '&zoom=' + _zoom + '&x=' + x + '&y=' + y + '&' + Date.now();
                console.log(url);
				(function (x, y) { 
					var img = new Image();
					img.addEventListener('load', function () {
                        _ctx.drawImage( this, x*512, y*512 );
                        _count++;
                        var p = Math.round(_count * 100 / _total);
                        self.onProgress(p);
                        if (_count === _total) {
                            self.canvas = _canvas;
                            self.onPanoramaLoad();
                            callback( null, canvas );
                        }	
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
     * @param {Function} callback receives param signature `( err, canvas )` with `this` in scope of the PanoLoader instance
     */
	this.load = function ( location, callback ) {
		console.log('Load for', location);
        self.find( location, function( err, pano ){
            if(err){
                return;
            }
            self.composePanorama( pano.id, callback );
        });
	};

    /**
     * make a request to find panoramic meta-data from google
     * @param {google.maps.LatLng} location
     * @param {Function} callback invoked with param signature `( error, panoData )`
     */
    this.find = function( location, callback ){
        var radius = 50,
            err = null,
            resp = {};

		_panoClient.getPanoramaByLocation(location, radius, function (result, status) {
			if (status === google.maps.StreetViewStatus.OK) {
				self.onPanoramaData( result );
				var h = google.maps.geometry.spherical.computeHeading(location, result.location.latLng);
				rotation = (result.tiles.centerHeading - h) * Math.PI / 180.0;
                //expose the copyright info on the instance
				resp.copyright = result.copyright;
                resp.pitch = result.tiles.originPitch;
                resp.heading = result.tiles.centerHeading;
				resp.location = location;
                resp.imageDate = result.imageDate;
                resp.id = result.location.pano;
            } else {
				self.onNoPanoramaData( status );
                err = Error('Could not retrieve panorama for the following reason: ' + status);
			    self.onError(err.message);
			}
            callback( err, resp );
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
