//sample-config.js - sample configuration file for cognicity-reports module

/**
 * Configuration for cognicity-reports-twitter
 * @namespace {object} config
 * @property {object} pg Postgres configuration object
 * @property {string} pg.table_all_users Postgres table name for all user records
 * @property {string} pg.table_tweets Postgres table name for tweet records
 * @property {string} pg.table_invitees Postgres table name for invited user records
 * @property {string} pg.table_unconfirmed Postgres table name for unconfirmed reports
 * @property {string} pg.table_nonspatial_tweet_reports Postgres table name for non-spatial tweet reports
 * @property {string} pg.table_nonspatial_users Postgres table name for non-spatial users
 * @property {object} twitter Configuration object for Twitter interface
 * @property {boolean} twitter.stream If true, connect to the twitter streaming API and retrieve tweets to process
 * @property {boolean} twitter.send_enabled If true, send tweets to users asking them to verify their reports
 * @property {number} twitter.url_length Length that URLs in tweets are shortened to
 * @property {string} twitter.bbox Twitter streaming API search parameters bounding box
 * @property {string} twitter.track Twitter streaming API search parameters keywords
 * @property {string} twitter.users Usernames for which tweets will be processed (i.e., usernames for the data source to monitor)
 * @property {number} twitter.timeout Connection will be recreated if no tweets received in this time (in ms)
 * @property {string} twitter.city City name matched against tweet place or user location for non-geo location match
 * @property {object} twitter.usernameVerify Twitter username (without @) authorised to verify reports via retweet functionality
 * @property {string} twitter.usernameReplyBlacklist Twitter usernames (without @, comma separated for multiples) which will never be responded to as part of tweet processing
 * @property {string} twitter.consumer_key Take from the twitter dev admin interface
 * @property {string} twitter.consumer_secret Take from the twitter dev admin interface
 * @property {string} twitter.access_token_key Take from the twitter dev admin interface
 * @property {string} twitter.access_token_secret Take from the twitter dev admin interface
 * @property {object} twitter.invite_text Object of twitter message texts mapping a language code to a message
 * @property {string} twitter.invite_text.(name) Language code to resolve
 * @property {string} twitter.invite_text.(value) Message to be tweeted
 * @property {object} twitter.thanks_text Object of twitter message texts mapping a language code to a message
 * @property {string} twitter.thanks_text.(name) Language code to resolve
 * @property {string} twitter.thanks_text.(value) Message to be tweeted
 * @property {boolean} twitter.addTimestamp If true, append a timestamp to each sent tweet
 */
var config = {};

config.pg = {};
config.pg.table_all_users = 'tweet_all_users';
config.pg.table_tweets = 'tweet_reports';
config.pg.table_invitees = 'tweet_invitees';
config.pg.table_unconfirmed = 'tweet_reports_unconfirmed';
config.pg.table_nonspatial_tweet_reports = 'nonspatial_tweet_reports';
config.pg.table_nonspatial_users = 'nonspatial_tweet_users';

//Twitter stream config
config.twitter = {};
config.twitter.stream = true; //Set to false to turn off twitter connection (for testing)

//Twitter stream parameters
config.twitter.send_enabled = false; //send verfication requests?
config.twitter.url_length = 0; // URLs no longer count as part of tweet limits so this should be 0

config.twitter.bbox = '106.5894, -6.4354, 107.0782, -5.9029'; // Jakarta appx.
config.twitter.track = 'flood, banjir'; //Twitter track keywords
config.twitter.users = '@petajkt'; //Verification twitter account
config.twitter.timeout = 900000; //Default twitter stream timeout (milliseconds) 600000 (10 minutes)
config.twitter.city = 'jakarta'; //User profile location keyword

config.twitter.usernameVerify = ''; // Twitter username (without @) authorised to verify reports via retweet functionality
config.twitter.usernameReplyBlacklist = ''; // Twitter usernames (without @, comma separated for multiples) which will never be sent to in response to tweet processing

//Twitter app authentication details
config.twitter.consumer_key = '';
config.twitter.consumer_secret = '';
config.twitter.access_token_key = '';
config.twitter.access_token_secret = '';

//Twitter message texts
config.twitter.invite_text = {};
config.twitter.invite_text.in = 'Invite/Verification Tweet Text [IN]';
config.twitter.invite_text.en = 'Invite/Verification Tweet Text [EN]';
config.twitter.thanks_text = {};
config.twitter.thanks_text.in = 'Thanks/location-enabled reminder Tweet Text [IN]';
config.twitter.thanks_text.en = 'Thanks/location-enabled reminder Tweet Text [EN]';

//Append a timestamp to each sent tweet except response to confirmed reports with unique urls
config.twitter.addTimestamp = true;

module.exports = config;
