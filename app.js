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
  , https = require('https')
  , path = require('path');

var fs = require('fs');
var util = require('util');
var moment = require('moment');
var request = require('request');
var pdfkit = require('pdfkit');
var temp = require('temp');

var SqliteStore = require('./sqlite-store');
var db = require('./database');
var print = require('./print');
var nconf = require('nconf').file('config.json');

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

app.get('/timeout', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    res.send(setting.user_timeout.toString());
  });
});

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
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin reasons edit request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

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

    reason[req.param('column')] = req.param('value');
    reason.save(db.connection, function() {
      res.send(req.param('value'));
    });
  });
});

app.post('/admin_manual_signout', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin manual signout request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

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

app.post('/admin_update_name', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin name update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.company_name = req.param('new_name');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_location', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin location update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.company_location = req.param('new_location');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_logo', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin logo update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

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
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin hosts update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

  var hosts = '';

  // import modules
  var sqlite3 = require('sqlite3');
  var db_raw = new sqlite3.Database('lobby.db');
  var csv = require('csv');

  db_raw.run('DELETE FROM hosts'); // clear old data

  req.on('data', function(data) {
    hosts += data;
  });
  req.on('end', function() {
    var hostStmt = db_raw.prepare('INSERT INTO hosts VALUES (?, ?)');
    csv()
      .from.string(hosts)
      .on('record', function(data, index) {
        hostStmt.run(data);
      })
      .on('end', function(count) {
        hostStmt.finalize(function() {
          res.send();
        });
      });
  });
});

app.post('/admin_update_env', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin env update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.ds_env = req.param('ds_env');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/admin_update_admin_password', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized admin password update request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    setting.admin_password = req.param('admin_password');
    setting.save(db.connection, function() {
      res.send();
    });
  });
});

app.post('/docusign_test', function(req, res) {
  if (!req.session.is_admin) {
    console.log('Alert:Unauthorized docusign test request from req.connection.remoteAddress: %s, req.headers[\'x-forwarded-for\']: %s', req.connection.remoteAddress, req.headers['x-forwarded-for']);
    res.status(401).send('Not authorized');
    return;
  }

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

    // initialize headers that is constant for all API calls
    var ds_account_name = setting.ds_account_name;
    var ds_account_password = setting.ds_account_password;
    var ds_integrator_key = setting.ds_account_key;
    var ds_env = setting.ds_env;

    if (ds_integrator_key === '')
      ds_integrator_key = require('./default_integrator_key').ikey;

    var cred = '<DocuSignCredentials>' +
               '<Username>' + ds_account_name + '</Username>' +
               '<Password>' + ds_account_password + '</Password>' +
               '<IntegratorKey>' + ds_integrator_key + '</IntegratorKey>' +
               '</DocuSignCredentials>';
    req.session.user.rest_headers = { headers:
      { "X-DocuSign-Authentication": cred
      , "content-type": "application/json"
      , "accept": "application/json"
    }};

    req.session.user.login_url = 'https://' + ds_env + '.docusign.net/restapi/v2/login_information';

    var url = req.session.user.login_url;
    var headers = req.session.user.rest_headers.headers;

    // contact DS now
    var options = {
      url: url,
      headers: headers,
    };

    print._('request: ' + url + '\n  ' + JSON.stringify(headers));
    request.get(options, function(error, response, body) {
      var json = JSON.parse(body);
      print._('response: ' + '\n  ' + JSON.stringify(json));

      if ('loginAccounts' in json)
        req.session.user.base_url = json.loginAccounts[0].baseUrl;

      res.send('errorCode' in json);
    });
  });
});

app.get('/dsrest_create_envelope', function(req, res) {
  var name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var email = req.session.user.email;
  var url = req.session.user.base_url + '/envelopes';
  var headers = req.session.user.rest_headers.headers;
  var template_id = req.session.user.template_guid;

  var data = {
    templateId: template_id,
    templateRoles: [{
      name: name,
      email: email,
      roleName: 'Signer',
      clientUserId: 1,
    }],
    status: 'sent',
  };

  var options = {
    url: url,
    headers: headers,
    json: data,
  };

  print._('request: ' + url + '\n  ' + JSON.stringify(data));
  request.post(options, function(error, response, body) {
    print._('response: ' + '\n  ' + body);

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

var options = {
  key: fs.readFileSync('ssl-key.pem'),
  cert: fs.readFileSync('ssl-cert.pem'),
};

https.createServer(options, app).listen(app.get('port'), function(){
  print._("Express server listening on port " + app.get('port'));
});

