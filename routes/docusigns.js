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

var express = require('express');
var router = express.Router();

var fs = require('fs');
var path = require('path');
var request = require('request');
var moment = require('moment');
var util = require('util');
var pdfkit = require('pdfkit');
var temp = require('temp');

var db = require('../database');
var nconf = require('nconf').file('config.json');
var docusignApi = require('../lib/docusign-api');

var print = require('../print');


router.post('/docusign_test', function(req, res) {
  var env = (req.param('ds_env') === 'Production') ? 'www' : 'demo';
  var name = req.param('ds_account_name');
  var password = req.param('ds_account_password');
  var key = req.param('ds_account_key');

  if (key === '')
    key = require('../default_integrator_key').ikey;

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
    res.send(!('errorCode' in response)); // return true if valid account
  });
});

router.get('/dsrest_init', function(req, res) {
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
      ds_integrator_key = require('../default_integrator_key').ikey;

    docusignApi.login(ds_env, ds_account_name, ds_account_password, ds_integrator_key, function(err, base_url) {
      if (err) {
        res.send(true);
        return;
      }

      // save headers and base_url
      req.session.user.base_url = base_url;
      req.session.user.rest_headers = {
        headers: docusignApi.getHeaders(ds_account_name, ds_account_password, ds_integrator_key)
      };

      res.send(false);
    });
  });
});

router.get('/dsrest_templates', function(req, res){
  if (!req.session.user.base_url) {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      var ds_account_name = setting.ds_account_name;
      var ds_account_password = setting.ds_account_password;
      var ds_integrator_key = setting.ds_account_key;
      var ds_env = setting.ds_env;

      // initialize headers that is constant for all API calls
      if (!ds_integrator_key)
        ds_integrator_key = require('../default_integrator_key').ikey;

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

          res.json(resp.envelopeTemplates);
        });
      });
    });
  } else {
    var base_url = req.session.user.base_url;
    var headers = req.session.user.rest_headers.headers;
    docusignApi.invokeRest(base_url+'/templates', 'GET', '', headers, function(err, resp) {
      if (err) throw err;

      res.json(resp.envelopeTemplates);
    });
  }
});

router.get('/dsrest_create_envelope', function(req, res) {
  var name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var email = req.session.user.email;
  var url = req.session.user.base_url + '/envelopes';
  var headers = req.session.user.rest_headers.headers;
  var template_id = req.session.user.template_guid;

  if (template_id == null) {
    template_id = 'E716DEED-C869-4508-9CFD-8AD784730AD2';
  }

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
    print._('response: ' + '\n  ');
    print._(body);

    if ('uri' in body) {
      req.session.user.view_url = req.session.user.base_url +
                                  body.uri + '/views/recipient';
    }

    // save envelopeId to session
    if ('envelopeId' in body) {
      req.session.user.envelopeId = body.envelopeId;
    }

    res.send('errorCode' in body);
  });
});

router.get('/dsrest_iframe_url', function(req, res) {
  var name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var email = req.session.user.email;
  var headers = req.session.user.rest_headers.headers;
  var exit = 'http://' + req.headers.host + '/api/return';
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

router.get('/dsrest_send_notification', function(req, res) {
  var guest_name = req.session.user.first_name + ' ' + req.session.user.last_name;
  var host_name = req.query.host_name;

  db.Host.where('name = ? COLLATE NOCASE', host_name).first(db.connection, function(err, host) {
    if (err) throw err;

    req.session.user.host_name = host_name;
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

module.exports = router;

