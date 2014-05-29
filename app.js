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


/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var fs = require('fs');
var util = require('util');
var moment = require('moment');
var request = require('request');
var pdfkit = require('pdfkit');
var temp = require('temp');
var csv = require('csv');

var SqliteStore = require('./sqlite-store');
var db = require('./database');
var print = require('./print');
var nconf = require('nconf').file('config.json');
var docusignApi = require('./docusign-api');
var scheduler = require('./lib/job-scheduler');
var worker = require('./lib/job-worker');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session(
    { store: new SqliteStore()
    , secret: 'LobbyApp'
  }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/check_signout', routes.check_signout);
app.get('/reason', routes.reason);
app.all('/flow', routes.flow);
app.get('/company', routes.company);
app.get('/email', routes.email);
app.get('/host', routes.host);
app.get('/badge', routes.badge);
app.post('/sign', routes.sign);
app.get('/return', routes.return);
app.get('/confirm_signin', routes.confirm_signin); // for selenium only
app.post('/confirm_signin', routes.confirm_signin);
app.get('/confirm_signout', routes.confirm_signout);

app.post('/timeout', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.user_timeout = req.param('user_timeout');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.get('/back', function(req, res) {
  if (req.session.user.previous_pages.length > 0) {
    req.session.user.flow.unshift(req.headers.referer);
    res.redirect(req.session.user.previous_pages.pop());
  } else {
    res.redirect('/');
  }
});

app.get('/validate_host', function(req, res) {
  db.Host.where(
    'name = ? COLLATE NOCASE', req.param('host_name')
  ).count(db.connection, function(err, count) {
    if (err) throw err;

    res.send(count > 0);
  });
});

app.get('/admin', routes.admin_login);
app.all('/admin_menu', routes.admin_menu);
app.get('/admin_history', routes.admin_history);
app.get('/admin_settings', routes.admin_settings);
app.get('/admin_reasons', routes.admin_reasons);
app.get('/admin_hosts', routes.admin_hosts);

app.post('/admin_reasons_edit', function(req, res) {
  if (req.param('add')) {
    var new_reason = new db.Reason();
    new_reason.save(db.connection, function() {});
    res.send();
    return;
  }

  db.Reason.all(db.connection, function(err, reasons) {
    if (err) throw err;

    var row_id = parseInt(req.param('row_id'), 10);
    var reason = reasons.getById(row_id);

    if (req.param('delete')) {
      reason.delete(db.connection, function() {
        res.send();
      });
      return;
    }

    // update reason
    reason[req.param('column')] = req.param('value');
    reason.save(db.connection, function() {
      res.send(req.param('value'));
    });
  });
});

app.post('/admin_manual_signout', function(req, res) {
  db.Person.all(db.connection, function(err, people) {
    if (err) throw err;

    var row_id = parseInt(req.param('row_id'), 10);
    var person = people.getById(row_id);

    var now = moment();
    person.signout_time = now.valueOf();
    person.save(db.connection, function() {
      res.send(now.format('M/D/YYYY h:mm A'));
    });
  });
});

// On app booting, schedule jobs for signout update and report if enabled
// TODO this code should be moved to some where
db.Setting.first(db.connection, function(err, setting) {
  // schedule signout update job if enabled
  if (setting.auto_signout_enabled) {
    var times = setting.auto_signout_time.split(',');  // multiple times?
    times.forEach(function(time_str, i) {
      if (time_str) {
        var job_time = moment(time_str.trim(), 'hh:mm a');
        scheduler.scheduleJob('job-update-signout-'+i, null, job_time.hours(), job_time.minutes(), worker.update_signout_time);
      }
    });
  }

  // schedule report job if configured
  if (setting.report_day_time && setting.report_emails) {
    var times = setting.report_day_time.split(',');  // multiple times separated bt comma
    times.forEach(function(time_str, i) {
      if (time_str) {
        var tokens = time_str.trim().split(' ');
        var day_str = tokens[0].trim();
        var format = 'd hh:mm a';   // default format
        if (day_str.length == 3)
          format = 'ddd hh:mm a';
        else if (day_str.length > 3)
          format = 'dddd hh:mm a';
        var job_time = moment(time_str.trim(), format);
        scheduler.scheduleJob('job-send-report-'+i, job_time.days(), job_time.hours(), job_time.minutes(), worker.send_report);
      }
    });
  }
});

app.post('/admin_auto_signout', function(req, res) {
  var signout_enabled = req.param('signout_enabled');
  var signout_time = req.param('signout_time');
  print._('auto-signout params: enabled '+signout_enabled+', time '+signout_time);
  if (!signout_time) {
    res.send(true);   // error
  }
  // signout_time is only hh:mm a format, it can be multiple separated by comma
  signout_time = signout_time.replace(/[\s]+/, ' ');  // clean up

  // save it to database
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    // before update, cancel if enabled
    if (setting.auto_signout_enabled) {
      var times = setting.auto_signout_time.split(',');  // multiple times?
      times.forEach(function(time_str, i) {
        if (time_str) {
          scheduler.cancelJob('job-update-signout-'+i);
        }
      });
    }

    // update setting
    setting.auto_signout_enabled = signout_enabled;
    setting.auto_signout_time = signout_time;
    setting.save(db.connection, function() {
      // if enable, schedule it
      if (signout_enabled) {
        var times = signout_time.split(',');  // multiple times?
        times.forEach(function(time_str, i) {
          if (time_str) {
            var job_time = moment(time_str.trim(), 'hh:mm a');
            scheduler.scheduleJob('job-update-signout-'+i, null, job_time.hours(), job_time.minutes(), worker.update_signout_time);
          }
        });
      }
      res.send();
    });
  });
});

app.post('/admin_update_report', function(req, res) {
  var dayandtime = req.param('dayandtime');
  var emails = req.param('emails');
  var numofdays = req.param('numofdays');
  print._('report params: '+dayandtime+', '+emails+', '+numofdays);
  if (!dayandtime || !emails) {
    res.send(true);   // error
  }
  if (numofdays === null || numofdays === undefined) {
    numofdays = 7;
  }
  // dayandtime is d hh:mm a or ddd hh:mm a or dddd hh:mm a format, it can be multiple separated by comma
  dayandtime = dayandtime.trim().replace(/[\s]+/, ' ');  // clean up
  // emails are separate by comma
  emails = emails.replace(/[\s]+/, '');  // clean up

  // save it to database
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    // before update, cancel if enabled
    if (setting.report_day_time && setting.report_emails) {
      var times = setting.report_day_time.split(',');  // multiple times
      times.forEach(function(time_str, i) {
        if (time_str) {
          scheduler.cancelJob('job-send-report-'+i);
        }
      });
    }

    // update setting
    setting.report_day_time = dayandtime;
    setting.report_emails = emails;
    setting.report_num_days = numofdays;
    setting.save(db.connection, function() {
      // if enable, schedule it
      if (dayandtime && emails) {
        var times = dayandtime.split(',');  // multiple times
        times.forEach(function(time_str, i) {
          if (time_str) {
            var tokens = time_str.trim().split(' ');
            var day_str = tokens[0].trim();
            var format = 'd hh:mm a';   // default format
            if (day_str.length == 3)
              format = 'ddd hh:mm a';
            else if (day_str.length > 3)
              format = 'dddd hh:mm a';
            var job_time = moment(time_str.trim(), format);
            scheduler.scheduleJob('job-send-report-'+i, job_time.days(), job_time.hours(), job_time.minutes(), worker.send_report);
          }
        });
      }
      res.send();
    });
  });
});

app.post('/admin_update_name', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.company_name = req.param('new_name');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_location', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.company_location = req.param('new_location');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_logo', function(req, res) {
  var path = 'public/images/logo.png';
  fs.unlinkSync(path); // remove old logo

  req.on('data', function(data) {
    var stream = fs.createWriteStream(path, {'flags': 'a'});
    stream.end(data);
  });
  req.on('end', function() {
    res.send();
  });
});

app.post('/admin_update_hosts', function(req, res) {
  var hosts = '';
  var hostMap = {};

  // import modules
  var sqlite3 = require('sqlite3');
  var db_raw = new sqlite3.Database('lobby.db');

  db_raw.run('DELETE FROM hosts'); // clear old data

  req.on('data', function(data) {
    hosts += data;
  });
  req.on('end', function() {
    var hostStmt = db_raw.prepare('INSERT INTO hosts VALUES (?, ?)');
    csv()
      .from.string(hosts)
      .on('record', function(data, index) {
        // filter out the duplicate emails
        var email = data[0];
        // print._('Updating host '+email);
        if (!hostMap[email]) {
          hostMap[email] = email;
          hostStmt.run(data);
        }
      })
      .on('end', function(count) {
        hostStmt.finalize(function() {
          res.send();
        });
      });
  });
});

app.get('/download_hosts', function(req, res) {
  //TODO should check is_admin?
  db.Host.all(db.connection, function(err, rows) {
    if (err) throw err;

    var hosts = [];
    rows.forEach(function(row) {
      hosts.push(
          [ row.email
          , row.name
        ]);
    });
    csv().from.array(hosts)
      .to.string(function(data) {   // data is entire csv data
        res.attachment('hosts.csv'); 
        res.send(data);
      })
  });
});

app.post('/admin_update_env', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.ds_env = req.param('ds_env');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_admin_password', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.admin_password = req.param('admin_password');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/docusign_test', function(req, res) {
  var env = req.param('env');
  var name = req.param('name');
  var password = req.param('password');
  var key = req.param('key');

  if (key === '')
    key = require('./default_integrator_key').ikey;

  // headers preparation
  var cred = '<DocuSignCredentials>' +
             '<Username>' + name + '</Username>' +
             '<Password>' + password + '</Password>' +
             '<IntegratorKey>' + key + '</IntegratorKey>' +
             '</DocuSignCredentials>';
  var headers = { headers:
    { "X-DocuSign-Authentication": cred
    , "content-type": "application/json"
    , "accept": "application/json"
  }};
  var url = 'https://' + env + '.docusign.net/restapi/v2/login_information';

  var options = {
    url: url,
    headers: headers,
  };

  request.get(options, function(error, response, body) {
    //var json = JSON.parse(body);
    res.send(!('errorCode' in response)); // return true if valid account
  });
});

app.post('/docusign', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.ds_env = req.param('env');
    setting.ds_account_name = req.param('name');
    setting.ds_account_password = req.param('password');
    setting.ds_account_key = req.param('key');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.get('/dsrest_init', function(req, res) {
  if (req.session.user.base_url != null) {
    // we already logged in, so no need to contact DS again
    res.send(false);
    return;
  }

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    var ds_account_name = setting.ds_account_name;
    var ds_account_password = setting.ds_account_password;
    var ds_integrator_key = setting.ds_account_key;
    var ds_env = setting.ds_env;

    // initialize headers that is constant for all API calls
    var ds_integrator_key = setting.ds_account_key;
    if (!ds_integrator_key)
      ds_integrator_key = require('./default_integrator_key').ikey;

    docusignApi.login(ds_env, ds_account_name, ds_account_password, ds_integrator_key, function(err, base_url) {
      if (err)
        res.send(true);

      // save headers and base_url
      req.session.user.base_url = base_url;
      req.session.user.rest_headers = {
        headers: docusignApi.getHeaders(ds_account_name, ds_account_password, ds_integrator_key)
      };
      res.send(false);
    });
  });
});

app.get('/dsrest_templates', function(req, res){
  if (!req.session.user.base_url) {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      var ds_account_name = setting.ds_account_name;
      var ds_account_password = setting.ds_account_password;
      var ds_integrator_key = setting.ds_account_key;
      var ds_env = setting.ds_env;

      // initialize headers that is constant for all API calls
      if (!ds_integrator_key)
        ds_integrator_key = require('./default_integrator_key').ikey;

      if (!ds_integrator_key) {
        print._('DocuSign integrator key is required to get templates list');
        res.send(true);
      }


      docusignApi.login(ds_env, ds_account_name, ds_account_password, ds_integrator_key, function(err, base_url) {
        if (err) throw err;

        req.session.user.base_url = base_url;
        req.session.user.rest_headers = {
          headers: docusignApi.getHeaders(ds_account_name, ds_account_password, ds_integrator_key)
        };

        // url, method, body, authHeader, callback
        var headers = req.session.user.rest_headers.headers;
        docusignApi.invokeRest(base_url+'/templates', 'GET', '', headers, function(err, resp) {
          if (err) throw err;

          var templates = {};
          templates['---'] = '---';
          resp.envelopeTemplates.forEach(function(tpl){
            templates[tpl.templateId] = tpl.templateId;
          })
          print._('templates: '+JSON.stringify(templates));
          res.json(templates);
        });
      });
    });
  } else {
    var base_url = req.session.user.base_url;
    var headers = req.session.user.rest_headers.headers;
    docusignApi.invokeRest(base_url+'/templates', 'GET', '', headers, function(err, resp) {
      if (err) throw err;

      var templates = {};
      templates['---'] = '---';
      resp.envelopeTemplates.forEach(function(tpl){
        templates[tpl.templateId] = tpl.templateId;
      })
      print._('templates: '+JSON.stringify(templates));
      res.json(templates);
    });
  }
});

app.get('/dsrest_create_envelope', function(req, res) {
  var name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var email = req.session.user.email;
  var url = req.session.user.base_url + '/envelopes';

  var headers = {
    'X-DocuSign-Authentication': req.session.user.rest_headers.headers['X-DocuSign-Authentication'],
  };
  headers['content-type'] = 'multipart/form-data';

  var cc_recipients = [];
  var cc_data = nconf.get('DS_SEND_CC_RECIPIENTS');
  for (var i in cc_data) {
    cc_recipients.push({
      name: cc_data[i][0],
      email: cc_data[i][1],
      routingOrder: 2,
      recipientId: parseInt(i, 10) + 2,
    });
  }

  var data = {
    recipients: {
      signers: [{
        name: name,
        email: email,
        recipientId: 1,
        routingOrder: 1,
        clientUserId: 1,
      }],
      carbonCopies: cc_recipients,
    },
    emailSubject: nconf.get('DS_SEND_EMAIL_SUBJECT'),
    documents: [{
      name: 'document.pdf',
      documentId: 1,
    }],
    status: 'sent',
  };

  var tabMap = {
    name: 'fullNameTabs',
    signature: 'signHereTabs',
    date: 'dateSignedTabs',
  };

  var tabConfig = nconf.get('DS_SEND_ANCHOR_TAGS');
  data['recipients']['signers'][0]['tabs'] = {};
  for (var prop in tabConfig) {
    var key = tabMap[prop];

    data['recipients']['signers'][0]['tabs'][key] = [{
      tabLabel: prop,
      documentId: 1,
      pageNumber: tabConfig[prop]['pageNumber'],
      xPosition: tabConfig[prop]['xPosition'],
      yPosition: tabConfig[prop]['yPosition'],
    }];
  }

  var options = {
    url: url,
    headers: headers,
    multipart: [{
      'Content-Type': 'application/json',
      'Content-Disposition': 'form-data',
      body: JSON.stringify(data),
    }, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'file; filename="document.pdf"; documentId=1',
      body: fs.readFileSync(path.join(__dirname, 'document.pdf')),
    }],
  };

  print._('request: ' + url + '\n  ' + JSON.stringify(data));
  request.post(options, function(error, response, body) {
    print._('response: ' + '\n  ' + body);
    body = JSON.parse(body);

    if ('uri' in body)
      req.session.user.view_url = req.session.user.base_url +
                                  body.uri + '/views/recipient';

    res.send('errorCode' in body);
  });
});

app.get('/dsrest_iframe_url', function(req, res) {
  var name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var email = req.session.user.email;
  var headers = req.session.user.rest_headers.headers;
  var exit = 'http://' + req.headers.host + '/return';
  var url = req.session.user.view_url;

  var data = {
    authenticationMethod: "email",
    email: email,
    returnUrl: exit,
    userName: name,
    clientUserId: 1,
  };

  var options = {
    url: url,
    headers: headers,
    json: data,
  };

  print._('request: ' + url + '\n  ' + JSON.stringify(data));
  request.post(options, function(error, response, body) {
    print._('response: ' + '\n  ' + JSON.stringify(body));
    res.send(body);
  });
});

app.get('/dsrest_send_notification', function(req, res) {
  var guest_name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var host_name = req.query.host_name;

  db.Host.where('name = ? COLLATE NOCASE', host_name).first(db.connection, function(err, host) {
    if (err) throw err;

    var url = req.session.user.base_url + '/envelopes';

    var headers = {
      'X-DocuSign-Authentication': req.session.user.rest_headers.headers['X-DocuSign-Authentication'],
    };
    headers['content-type'] = 'multipart/form-data';

    var data = {
      recipients: {
        carbonCopies: [{
          name: host.name,
          email: host.email,
          recipientId: 1,
        }],
      },
      emailSubject: 'Your guest, ' + guest_name + ', has arrived.',
      documents: [{
        name: 'Host Notification',
        documentId: 1,
      }],
      status: 'sent',
    };

    // generate the host notification pdf
    var time = moment();
    var content = util.format('Your guest, %s, has arrived on %s at %s.', guest_name, time.format('MMMM D, YYYY'), time.format('h:mm A'));
    var doc = new pdfkit();
    doc.text(content);
    var notification = temp.path('lobby');

    doc.write(notification, function(err) {
      if (err) throw err;

      var options = {
        url: url,
        headers: headers,
        multipart: [{
          'Content-Type': 'application/json',
          'Content-Disposition': 'form-data',
          body: JSON.stringify(data),
        }, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'file; filename="notify.pdf"; documentId=1',
          body: fs.readFileSync(notification),
        }],
      };

      print._('request: ' + url + '\n  ' + JSON.stringify(data));
      request.post(options, function(error, response, body) {
        print._('response: ' + '\n ' + body);
        body = JSON.parse(body);

        fs.unlinkSync(notification);
        res.send('errorCode' in body);
      });
    });
  });
});

http.createServer(app).listen(app.get('port'), function(){
  print._("Express server listening on port " + app.get('port'));
});

