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

	describe( "_parseLangsFromTweet", function() {
		
		var expectedTwitter = "moo";
		
		it( 'Twitter code is parsed', function() {
			var activity = {
				lang: expectedTwitter 	
			};
			var response = twitterDataSource._parseLangsFromTweet(activity);
			test.array( response ).hasLength( 1 );
			test.array( response ).hasValue( expectedTwitter );
		});
		
		it( 'No codes are parsed', function() {
			var activity = {
				langz: expectedTwitter
			};
			var response = twitterDataSource._parseLangsFromTweet(activity);
			test.array( response ).hasLength( 0 );
		});

	});

	describe( "_twitterDateToIso8601", function() {
		
		var tweetDate = "Wed Aug 12 00:42:51 -0100 2015";
		var expectedDate = "2015-08-12T01:42:51.000Z";
		
		it( 'Twitter code is parsed', function() {
			test.value( twitterDataSource._twitterDateToIso8601(tweetDate) ).is( expectedDate );
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
