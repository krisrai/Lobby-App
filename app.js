/**
 * @copyright Copyright (C) DocuSign, Inc.  All rights reserved.
 *
 * This source code is intended only as a supplement to DocuSign SDK
 * and/or on-line documentation.
 * 
 * This sample is designed to demonstrate DocuSign features and is not intended
 * for production use. Code and policy for a production application must be
 * developed to meet the specific data and security requirements of the
 * application.
 *
 * THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY
 * KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
 * PARTICULAR PURPOSE.
 */

var fs = require('fs');
var moment = require('moment');
var path = require('path');

// express and middleware
var express = require('express');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var methodOverride = require('method-override');
var errorhandler = require('errorhandler');

var SqliteStore = require('./sqlite-store');
var db = require('./database');
var print = require('./print');
var scheduler = require('./lib/job-scheduler');
var worker = require('./lib/job-worker');


var app = express();

app.set('port', process.env.PORT || 3000);
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser());
app.use(cookieParser());
app.use(session(
  { store: new SqliteStore()
  ,  secret: 'LobbyApp'
  , name: 'lobby-app'
  , resave: true
  , saveUninitialized: false

}));
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'client')));

if (process.env.NODE_ENV === 'development') {
  app.use(errorhandler());
}


// visitor home page html
app.get('/', function(req, res) {
  res.sendfile('client/visitors.html');
});
// admin home page html
app.get('/admin', function(req, res) {
  res.sendfile('client/admin.html');
});

// mount api routes
var admins = require('./routes/admins');
var visitors = require('./routes/visitors');
var docusigns = require('./routes/docusigns');

app.use('/api', visitors);
app.use('/admin', admins);
app.use('/docusign', docusigns);



// On app booting, schedule jobs for signout update and report if enabled
db.Setting.first(db.connection, function(err, setting) {
  // schedule signout update job if enabled
  if (setting.auto_signout_enabled && setting.auto_signout_time) {
    var job_time = moment(setting.auto_signout_time.trim(), 'hh:mm a');
    scheduler.scheduleJob('job-update-signout-0', null, job_time.hours(), job_time.minutes(), worker.update_signout_time);
  }

  // schedule report job if configured
  if (setting.report_day_time && setting.report_emails) {
    var tokens = setting.report_day_time.trim().split(' ');
    var day_str = tokens[0].trim();
    var format = 'd hh:mm a';   // default format
    if (day_str.length == 3)
      format = 'ddd hh:mm a';
    else if (day_str.length > 3)
      format = 'dddd hh:mm a';
    var job_time = moment(setting.report_day_time.trim(), format);
    scheduler.scheduleJob('job-send-report-0', job_time.days(), job_time.hours(), job_time.minutes(), worker.send_report);
  }
});

app.listen(app.get('port'), function(){
  print._("Express server listening on port " + app.get('port'));
});

