'use strict';

/* jshint -W079 */ // Ignore this error for this import only, as we get a redefinition problem
var test = require('unit.js');
/* jshint +W079 */
var TwitterDataSource = require('../TwitterDataSource');

// Mock reports
var reports = {
	logger: {},
	tweetAdmin: function(){}
};

// Create server with empty objects
// We will mock these objects as required for each test suite
var twitterDataSource = new TwitterDataSource(
	reports,
	{},
	{
		twitter: {
			track: '',
			users: ''
		}
	}
);

// Mocked logger we can use to let code run without error when trying to call logger messages
twitterDataSource.logger = {
	error:function(){},
	warn:function(){},
	info:function(){},
	verbose:function(){},
	debug:function(){}
};
twitterDataSource.reports.logger = twitterDataSource.logger;

// Test harness for CognicityReportsPowertrack object
describe( 'TwitterDataSource', function() {

	describe( "sendReplyTweet", function() {
		var tweetId = '12345678';
		var tweetUser = 'ragnar';
		var tweet = {
			user: {
				screen_name: tweetUser
			},
			id_str: tweetId
		};
		var oldBaseSendReplyTweet;
		var baseSendReplyTweetArgs = {};
		
		before( function() {
			oldBaseSendReplyTweet = twitterDataSource._baseSendReplyTweet;
			twitterDataSource._baseSendReplyTweet = function(user, id, msg, success) {
				baseSendReplyTweetArgs.user = user;
				baseSendReplyTweetArgs.id = id;
				baseSendReplyTweetArgs.msg = msg;
				baseSendReplyTweetArgs.success = success;
			};
		});

		beforeEach( function() {
			baseSendReplyTweetArgs = {};
		});

		it( "Username extracted from tweet activity", function() {
			twitterDataSource._sendReplyTweet( tweet, 'a', 'b' );
			test.value( baseSendReplyTweetArgs.user ).is( tweetUser );
		});

		it( "ID extracted from tweet activity", function() {
			twitterDataSource._sendReplyTweet( tweet, 'a', 'b' );
			test.value( baseSendReplyTweetArgs.id ).is( tweetId );
		});

		after( function(){
			twitterDataSource._baseSendReplyTweet = oldBaseSendReplyTweet;
		});
	});
	
// Test template
//	describe( "suite", function() {
//		before( function() {
//		});
//
//		beforeEach( function() {
//		});
//
//		it( 'case', function() {
//		});
//
//		after( function(){
//		});
//	});

});
