'use strict';

// RSVP promises module
var RSVP = require('rsvp');

// Prototype object this object extends from - contains basic twitter interaction functions
var BaseTwitterDataSource = require('../BaseTwitterDataSource/BaseTwitterDataSource.js');

/**
 * The Twitter data source.
 * Connect to the Twitter stream and process matching tweet data.
 * @constructor
 * @augments BaseTwitterDataSource
 * @param {Reports} reports An instance of the reports object.
 * @param {object} twitter Configured instance of twitter object from ntwitter module
 * @param {object} config Twitter specific configuration.
 */
var TwitterDataSource = function TwitterDataSource(
		reports,
		twitter,
		config
	){

	// Store references to constructor arguments
	this.config = config;

	BaseTwitterDataSource.call(this, reports, twitter);
	
	// Create a list of keywords and usernames from config
	this.config.twitter.keywords = this.config.twitter.track.split(',');
	this.config.twitter.usernames = this.config.twitter.users.split(',');

	// Set constructor reference (used to print the name of this data source)
	this.constructor = TwitterDataSource;
};

// Set our prototype to be the base object
TwitterDataSource.prototype = Object.create( BaseTwitterDataSource.prototype );

/**
 * Data source configuration.
 * This contains the data source specific configuration.
 * @type {object}
 */
TwitterDataSource.prototype.config = {};

/**
 * Connect the Twitter stream.
 */
TwitterDataSource.prototype.start = function(){
	var self = this;

	// Stream
	function connectStream(){

		if (self.config.twitter.stream === true) {
			self.twitter.stream( 'statuses/filter', {
					'locations': self.config.twitter.bbox, 
					'track': self.config.twitter.track
				}, function(stream){
					stream.on('data', function (data){
						if (data.warning) {
							self.logger.warn( JSON.stringify(data.warning.code) + ':' + JSON.stringify(data.warning.message) );
						}
						if (data.disconnect) {
							self.logger.error( 'disconnect code:' + JSON.stringify(data.disconnect.code) );
						} else {
							self.filter(data);					
							time = new Date().getTime(); // Updated the time with last tweet.
						}
					});
					stream.on('error', function(error, code){
						self.logger.error( 'Twitter stream error: ' + JSON.stringify(error) + JSON.stringify(code) );
						self.logger.error( 'Stream error details: ' + JSON.stringify(arguments)); // Added extra log details to help with debugging.
					});
					stream.on('end', function(){
						self.logger.info('stream has been disconnected');
					});
					stream.on('destroy', function(){
						self.logger.info('stream has died');
					});
					// Catch an un-handled disconnection
					if ( time !== 0 ){
						if ( new Date().getTime() - time > self.config.twitter.stream.timeout ){
							// Try to destroy the existing stream
							self.logger.error( new Date()+': Un-handled stream error, reached timeout - attempting to reconnect' );
							stream.destroy();
							// Start stream again and reset time.
							time = 0;
							connectStream();
						}
					}
				}
			);
		}
	}

	var time = 0;
	// Brute force stream management  - create a new stream if existing one dies without a trace.
	function forceStreamAlive(){
		if (time !== 0){
			if ( new Date().getTime() - time > self.config.twitter.timeout ){
				self.logger.error(new Date()+': Timeout for connectStream() function - attempting to create a new stream');
				time = 0;
				connectStream();
			}
		}
		setTimeout( forceStreamAlive, 1000 );
	}

	self.logger.info( 'stream started' );
	connectStream();
	forceStreamAlive();
};

/**
 * Handle an incoming tweet.
 * Filter it based on our matching criteria and respond appropriately -
 * saving to the database, sending a tweet to the author, ignoring, etc.
 */
TwitterDataSource.prototype.filter = function(tweet) {
	var self = this;
	
	function generateInsertInviteeCallback(tweet) {
		return function() {
			self.insertInvitee(tweet);
		};
	}
	
	// Keyword check
	for (var i=0; i<self.config.twitter.keywords.length; i++){
		var re = new RegExp(self.config.twitter.keywords[i], "gi");
		if (tweet.text.match(re)){
			
			// Username check
			for (var j=0; i<self.config.twitter.usernames.length; j++){
				var userRegex = new RegExp(self.config.twitter.usernames[j], "gi");
				if ( tweet.text.match(userRegex) ) {
					// regexp for city
					var cityRegex = new RegExp(self.config.twitter.city, "gi");
					
					// Geo check
					if ( tweet.coordinates !== null ){
						self.insertConfirmed(tweet); //user + geo = confirmed report!
						
					} else if(tweet.place !== null && tweet.place.match(cityRegex) || tweet.user.location !== null && tweet.user.location.match(cityRegex)){
						// City location check
						if (tweet.lang === 'id'){
							self.insertNonSpatial(tweet); // User sent us a message but no geo, log as such
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.thanks_text_in); // send geo reminder
						} else {
							self.insertNonSpatial(tweet); // User sent us a message but no geo, log as such
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.thanks_text_en); // send geo reminder
						}
					}
					return;
					
				} else if ( j === self.config.twitter.usernames.length-1 ) {
					// End of usernames list, no match so message is unconfirmed
					
					// Geo check
					if ( tweet.coordinates !== null ) {
						self.logger.silly("2 Filtering tweet:");
						self.logger.silly(tweet);
						
						self.insertUnConfirmed(tweet); // insert unconfirmed report, then invite the user to participate
						if ( tweet.lang === 'id' ){
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.invite_text_in, generateInsertInviteeCallback(tweet));	
						} else {
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.invite_text_en, generateInsertInviteeCallback(tweet));
						}
						
					} else {
						// no geo, no user - but keyword so send invite
						if (tweet.lang === 'id'){
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.invite_text_in, generateInsertInviteeCallback(tweet));
						} else {
							self.sendReplyTweet(tweet.user.screen_name, self.config.twitter.invite_text_en, generateInsertInviteeCallback(tweet));
						}
					}
					
					return;
				}	
			}
		}
	}
};

/**
 * Send @reply Twitter message
 */
TwitterDataSource.prototype.sendReplyTweet = function(user, message, callback) {
	var self = this;
	
	self.reports.dbQuery(
		{
			text: "SELECT user_hash FROM " + self.config.pg.table_all_users + " WHERE user_hash = md5($1);",
			values: [ user ]
		},
		function(result) {
			if (result && result.rows && result.rows.length === 0) {
				if (self.config.twitter.send_enabled === true){
					self.twitter.updateStatus('@'+user+' '+message, function(err, data) {
						if (err) {
							self.logger.error('Tweeting failed: '+err);
						} else {
							if (callback) {
								callback();
							}
						}
					});	
			
				} else { // for testing
					self.logger.debug('sendReplyTweet is in test mode - no message will be sent. Callback will still run.');
					self.logger.debug('@'+user+' '+message);
					if (callback) {
						callback();
					}
				}
			} else {
				self.logger.debug("Not performing callback as user already exists");
			}
		}
	);

};

/**
 * Insert a confirmed tweet report into the database
 */
TwitterDataSource.prototype.insertConfirmed = function(tweet) {
	var self = this;
	
	self.reports.dbQuery(
		{
			text: "INSERT INTO " + self.config.pg.table_tweets + " " +
				"(created_at, text, hashtags, urls, user_mentions, lang, the_geom) " +
				"VALUES to_timestamp($1::text, 'Dy Mon DD YYYY HH24:MI:SS +ZZZZ'), $2, $3, $4, $5, $6, ST_GeomFromText('POINT(' || $7 || ')',4326) ",
			values: [
			    new Date(Date.parse(tweet.created_at)).toLocaleString(), 
			    tweet.text, 
			    JSON.stringify(tweet.entities.hashtags), 
			    JSON.stringify(tweet.entities.urls),
			    JSON.stringify(tweet.entities.user_mentions), 
			    tweet.lang,
			    tweet.coordinates.coordinates[0]+" "+tweet.coordinates.coordinates[1]
			]
		},
		function(result) {
			self.logger.info( 'logged confirmed tweet report' );
			self.insertConfirmedUser(tweet);
		}
	);
};

/**
 * Insert a confirmed user into the database
 */
TwitterDataSource.prototype.insertConfirmedUser = function(tweet) {
	var self = this;
	
	self.reports.dbQuery(
		{
			text : "SELECT upsert_tweet_users(md5($1));",
			values : [
			    tweet.user.screen_name
			]
		},
		function(result) {
			self.logger.info('Logged confirmed tweet user');
		}
	);
};

/**
 * Insert an invited user into the database
 */
TwitterDataSource.prototype.insertInvitee = function(tweet) {
	var self = this;

	self.reports.dbQuery(
		{
			text : "INSERT INTO " + self.config.pg.table_invitees + " (user_hash) VALUES (md5($1));",
			values : [ tweet.user.screen_name ]
		},
		function(result) {
			self.logger.info('Logged new invitee');
		}
	);
};

/**
 * Insert an unconfirmed tweet report into the database
 */
TwitterDataSource.prototype.insertUnConfirmed = function(tweet) {
	var self = this;

	self.reports.dbQuery(
		{
			text : "INSERT INTO " + self.config.pg.table_unconfirmed + " " +
				"(created_at, the_geom) " +
				"VALUES ( " +
				"to_timestamp($1::text, 'Dy Mon DD YYYY HH24:MI:SS +ZZZZ'), " +
				"ST_GeomFromText('POINT(' || $2 || ')',4326)" +
				");",
			values : [
			    new Date(Date.parse(tweet.created_at)).toLocaleString(),
			    tweet.coordinates.coordinates[0]+" "+tweet.coordinates.coordinates[1]
			]
		},
		function(result) {
			self.logger.info('Logged unconfirmed tweet report');
		}
	);
};

/**
 * Insert a non-spatial tweet report into the database
 */
TwitterDataSource.prototype.insertNonSpatial = function(tweet) {
	var self = this;

	self.reports.dbQuery(
		{
			text : "INSERT INTO " + self.config.pg.table_nonspatial_tweet_reports + " " +
				"(created_at, text, hashtags, urls, user_mentions, lang) " +
				"VALUES (" +
				"to_timestamp($1::text, 'Dy Mon DD YYYY H24:MI:SS +ZZZZ', " +
				"$2, " +
				"$3, " +
				"$4, " +
				"$5, " +
				"$6" +
				");",
			values : [
				new Date(Date.parse(tweet.created_at)).toLocaleString(),
				tweet.text,
				JSON.stringify(tweet.entities.hashtags),
				JSON.stringify(tweet.entities.urls),
				JSON.stringify(tweet.entities.user_mentions),
				tweet.lang
			]
		},

		function(result) {
			self.logger.info('Inserted non-spatial tweet');
			self.insertNonSpatialUser(tweet);
		}
	);
};

/**
 * Insert a non-spatial user into the database
 */
TwitterDataSource.prototype.insertNonSpatialUser = function(tweet) {
	var self = this;
	
	self._ifNewUser( tweet.user.screen_name, function(result) {
		self.reports.dbQuery(
			{
				text : "INSERT INTO " + self.config.pg.table_nonspatial_users + " (user_hash) VALUES (md5($1));",
				values : [ tweet.user.screen_name ]
			},
			function(result) {
				self.logger.info("Inserted non-spatial user");
			}
		);
	});
};

/**
 * Validate the data source configuration.
 * Check twitter credentials and tweet message lengths.
 * @return {Promise} Validation promise, throws an error on any validation error
 */
TwitterDataSource.prototype.validateConfig = function() {
	var self = this;
		
	// Contain separate validation promises in one 'all' promise
	return RSVP.all([
	    self.validateTwitterConfig()
	]);
};

// Export the TwitterDataSource constructor
module.exports = TwitterDataSource;
