CogniCity
===========
**Open Source GeoSocial Intelligence Framework**

####cognicity-reports: NodeJS app to collect unconfirmed reports from Twitter and send verification requests.

### About
Cognicity-reports is the NodeJS reports module for the CogniCity framework, responsible for collecting relevant tweets, and sending users verification messages via Twitter. For detailed framework documentation see [http://cognicity.info](http://cognicity.info).

### Dependencies
* [NodeJS](http://nodejs.org) version 0.10.12 or later
* [PostgreSQL](http://www.postgresql.org) version 9.2 or later, with [PostGIS](http://postgis/) version 2.0 or later.

#### Node Modules
* Express version 3.2.6 or later
* Node-Daemonize 2 version 0.4.2 or later
* Node-Postgres version 2.0.0 or later

### Installation
Download the source code for cognicity-reports from github: [http://github.com/smart-facility/cognicity-reports](http://github.com/smart-facility/cognicity-reports) or view the CogniCity installation documentation at [http://cognicity.info](http://cognicity.info).

Install the node dependencies in package.json using NPM: `npm install`

### PostgreSQL/PostGIS schema
These can be found in the [cognicity-schema](https://github.com/smart-facility/cognicity-schema) repository and consist of
* createdb.sql, which creates an empty database for cognicity, and
* schema.sql, which adds PostGIS support and builds the relational schema for cognicity.
These scripts need to be run in that order in order to set up the database, e.g.
```shell
psql -U postgres -h hostname -f createdb.sql
psql -U postgres -h hostname -d cognicity -f schema.sql
```

#### Platform-specific notes ####
To build on OS X we recommend using [homebrew](http://brew.sh) to install node, npm, and required node modules as follows:
```shell
brew install node
npm install
```

To build on Windows we recommend installing all dependencies (making sure to use all 32 bit or all 64 bit, depending on your architecture) plus following the instructions (for Windows 7 follow the Windows 7/8 instructions) for [node-gyp](https://github.com/TooTallNate/node-gyp) and then:
* You need to add *C:\Program Files\PostgreSQL\9.3\bin* (modifying that location if necessary to point to the installed version of PostgreSQL) to path so the build script finds `pg_config`, and
* You need to create the *%APPDATA%\npm* folder and run cmd (and hence npm) as administrator. *%APPDATA%* is usually under *C:\Users\your_username\AppData\Remote*.
Then you can run `npm install`.

### Configuration
App configuration parameters are stored in a configuration file which is parsed by app.js. See sample-reports-config.js for an example configuration.

#### Twitter stream configuration
Set the app authentication parameters as provided by Twitter. See the [ntwitter-module](https://github.com/AvianFlu/ntwitter) documentation for more details.

#### Twitter stream parameters
* bounding box coordinates - area of interest (lat, long) cognicity-reports will collect all geo-located tweets in the specified area, and then filter by keyword
* track keywords - cognicity-reports will collect all tweets (geo-located and non-spatial) which contains these words
* city - specify user city to help filter tweets without geolocation data
* users - the Twitter account usernames designated for confirmation tweets.
* send_enabled [true | false] - set to true to enable confirmation request tweets to be sent.
* stream [true | false] - set to true to connect to twitter stream.

#### Twitter message text
* invite_in/en - Text for confrmation request tweets [Bahasa Indonesian/English]
* thanks_in/en - Text for geolocation reminders [Bahasa Indonesian/English]

#### Postgres connection
* connection string - PostgreSQL connection details (see [node-postgres module documenation](https://github.com/brianc/node-postgres)).
* postgres tables as defined in the database [schema](https://github.com/smart-facility/cognicity-schema/blob/master/schema.sql)

### Run
The app is run as a background process using the Daemonize 2 library. The process name is set to the configuration instance `config.instance` defined in the configuration file.

```shell
$ cd cognicity-server/
$ node daemon.js sample-config.js start
project-name daemon started. PID 1000

$node daemon.js sample-config.js status
project-name running

$node daemon.js sample-config.js stop
project-name daemon stopped
```

### Logging
Express logger writes to project-name.log

### License
This software is released under the GPLv3 License. See License.txt for details.
