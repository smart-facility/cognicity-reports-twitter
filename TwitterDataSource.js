'use strict';

// Prototype object this object extends from - contains basic twitter interaction functions
var BaseTwitterDataSource = require('../BaseTwitterDataSource/BaseTwitterDataSource.js');

// moment time library
var moment = require('moment');

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
	
	self.logger.silly("Processing tweet:");
	self.logger.silly(tweet);
	
	// Keyword check
	for (var i=0; i<self.config.twitter.keywords.length; i++){
		var re = new RegExp(self.config.twitter.keywords[i], "gi");
		if (tweet.text.match(re)){
			self.logger.silly("Tweet matches keyword: " + self.config.twitter.keywords[i]);
			
			// Username check
			for (var j=0; i<self.config.twitter.usernames.length; j++){
				var userRegex = new RegExp(self.config.twitter.usernames[j], "gi");
				if ( tweet.text.match(userRegex) ) {
					self.logger.silly("Tweet matches username: " + self.config.twitter.usernames[j]);
					
					// regexp for city
					var cityRegex = new RegExp(self.config.twitter.city, "gi");
					
					// Geo check
					if ( tweet.coordinates !== null ){
						self.logger.silly("Tweet has coordinates, confirmed report");
						
						self.insertConfirmed(tweet); //user + geo = confirmed report!
						
					} else if(tweet.place !== null && tweet.place.match(cityRegex) || tweet.user.location !== null && tweet.user.location.match(cityRegex)){
						self.logger.silly("Tweet matches city or location: " + self.config.twitter.city);
						
						// City location check
						if (tweet.lang === 'id'){
							self.insertNonSpatial(tweet); // User sent us a message but no geo, log as such
							self._sendReplyTweet(tweet, self.config.twitter.thanks_text.in); // send geo reminder
						} else {
							self.insertNonSpatial(tweet); // User sent us a message but no geo, log as such
							self._sendReplyTweet(tweet, self.config.twitter.thanks_text.en); // send geo reminder
						}
					}
					return;
					
				} else if ( j === self.config.twitter.usernames.length-1 ) {
					self.logger.silly("Tweet does not match any usernames");
					// End of usernames list, no match so message is unconfirmed
					
					// Geo check
					if ( tweet.coordinates !== null ) {
						self.logger.silly("Tweet has coordinates - unconfirmed report, invite user");

						self.insertUnConfirmed(tweet); // insert unconfirmed report, then invite the user to participate
						if ( tweet.lang === 'id' ){
							self._sendReplyTweet(tweet, self.config.twitter.invite_text.in, generateInsertInviteeCallback(tweet));	
						} else {
							self._sendReplyTweet(tweet, self.config.twitter.invite_text.en, generateInsertInviteeCallback(tweet));
						}
						
					} else {
						self.logger.silly("Tweet has no geo data - keyword was present, invite user");
						
						// no geo, no user - but keyword so send invite
						if (tweet.lang === 'id'){
							self._sendReplyTweet(tweet, self.config.twitter.invite_text.in, generateInsertInviteeCallback(tweet));
						} else {
							self._sendReplyTweet(tweet, self.config.twitter.invite_text.en, generateInsertInviteeCallback(tweet));
						}
					}
					
					return;
				}	
			}
		}
	}
	
	self.logger.silly("Tweet processing ended without calling any actions");
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
				"VALUES $1, $2, $3, $4, $5, $6, ST_GeomFromText('POINT(' || $7 || ')',4326) ",
			values: [
			    self._twitterDateToIso8601(tweet.created_at), 
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
	
	self._baseInsertInvitee(tweet.user.screen_name);
};

/**
 * Insert an unconfirmed tweet report into the database
 */
TwitterDataSource.prototype.insertUnConfirmed = function(tweet) {
	var self = this;

	self._baseInsertUnConfirmed(
		self._twitterDateToIso8601(tweet.created_at),
	    tweet.coordinates.coordinates[0]+" "+tweet.coordinates.coordinates[1]
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
				"$1, " +
				"$2, " +
				"$3, " +
				"$4, " +
				"$5, " +
				"$6" +
				");",
			values : [
				self._twitterDateToIso8601(tweet.created_at),
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
 * Send @reply Twitter message
 * @param {object} tweet The tweet object this is a reply to
 * @param {string} message The tweet text to send
 * @param {function} success Callback function called on success
 */
TwitterDataSource.prototype._sendReplyTweet = function(tweet, message, success) {
	var self = this;
	
	self._baseSendReplyTweet(
		tweet.user.screen_name, 
		tweet.id, 
		message, 
		success
	);
};

/**
 * Convert twitter custom date format to ISO8601 format.
 * @param {string} Twitter date string
 * @returns {string} ISO8601 format date string
 */
TwitterDataSource.prototype._twitterDateToIso8601 = function(twitterDate) {
	return moment(twitterDate, "ddd MMM D HH:mm:ss Z YYYY").toISOString();
};

// Export the TwitterDataSource constructor
module.exports = TwitterDataSource;
