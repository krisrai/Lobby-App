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

var moment = require('moment');
var db = require('../database');
var print = require('../print');


router.get('/company_info', function(req, res) {
  if (!req.session.user) {
    req.session.user = {};
  }

  db.Setting.first(db.connection, function(err, setting) {
    res.json(
      { company_name: setting.company_name
      , company_location: setting.company_location
    });
  });
});

// this was check_signout
router.post('/check_signout', function(req, res) {
  var name = req.param('name');
  var names = name.split(/\s+/);

  if (!req.session.user) {
    req.session.user = {};
  }

  // firstname lastname
  req.session.user.first_name = names[0];
  if (names.length>1)
    req.session.user.last_name = names[1];

  db.Person.where(
    'first_name = ? COLLATE NOCASE AND last_name = ? COLLATE NOCASE AND signout_time IS NULL',
    [req.session.user.first_name, req.session.user.last_name]
  ).orderBy('signin_time', db.Descending).all(db.connection, function(err, people) {
    if (err) throw err;

    if (people.length > 0) {
      req.session.user.person = people[0];
      res.json({
          signin_time: req.session.user.person.signin_time
      });
    } else {
      res.json(null);   // res.json(null) sends 'null' string! not null object
    }
  });
});

router.get('/confirm_signout', function(req, res) {
  db.Person.getById(db.connection, req.session.user.person.id, function(err, person) {
    person.signout_time = moment().valueOf();
    person.save(db.connection, function(err) {
      if (err)
        print._('confirm_signout: person save error, '+JSON.stringify(err));

      res.send();
    });
  });
});

router.get('/reason', function(req, res) {

  db.Reason.all(db.connection, function(err, rows) {
    if (err) throw err;

    var reasons = [];
    rows.forEach(function(row) {
      reasons.push(
        { id: row.id
        , reason: row.reason
        , show_company: row.show_company
        , template_guid: row.template_guid
        , show_host: row.show_host
        , show_badge: row.show_badge
      });
    });
    res.json(reasons);
  });
});

var checkRequest = [];
router.get('/check_sign_return', function(req, res) {
  checkRequest = [];
  // implement a long polling by saving request  
  checkRequest.push({req: res, res: res});
})

router.get('/return', function(req, res) {
  print._('return event: '+req.param('event'));

  // event can be 'signing_complete', 'decline' or 'cancel(clicking X in sign document)'
  var event = req.param('event');

  var request = checkRequest.pop();
  if (request) {
    request.res.json({returned: true, event: event});
  }
  res.send(200);

  if (event === 'signing_complete') {
      var signature = new db.Signature(
        { email: req.session.user.email
        , envelope_id: req.session.user.envelopeId
      })

      signature.save(db.connection, function() {
        print._('Signature is saved: '+JSON.stringify(signature));
      });
  }

});

router.post('/email', function(req, res) {
  var email = req.param('email');
  if (email) {
    req.session.user.email = email.trim();
  } else {
    req.session.user.email = 'noreply@example.com';
  }

  res.send();
});

router.get('/host', function(req, res) {
  db.Host.all(db.connection, function(err, rows) {
    if (err) throw err;

    var hosts = [];
    rows.forEach(function(row) {
      hosts.push(row.name);
    });
    res.json(hosts);
  });
});

router.post('/confirm_signin', function(req, res) {
  var visitReason = req.param('visitReason');
  var visitingHost = req.param('visitingHost');
  if (!visitReason)
    print._('visitReason is required in confirm_signin, person save will fail');


  db.Host.where({ name: req.session.user.host_name }).first(db.connection, function(err, host) {
    var host_email = (host != null) ? host.email : '';

    var person = new db.Person(
      { first_name: req.session.user.first_name
      , last_name: req.session.user.last_name
      , visit_reason: visitReason
      , company_name: req.param('companyName')
      , job_title: req.param('jobTitle')
      , email: req.session.user.email
      , host: host_email
      , badge_number: req.param('badgeNumber')
      , signin_time: moment().valueOf()
    });

    person.save(db.connection, function(err) {
      if (err)
        print._('person save failed: '+JSON.stringify(err));

      res.send();
    });
  });
});

// check whether user needs to sign or not.
// if setting.ds_skip_signing is enabled and user already has signed it, then skip signing
router.get('/check_skip_signing', function(req, res) {
  
  if (req.session.user.email !== 'noreply@example.com') {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      if (setting.ds_skip_signing) {
        db.Signature.where({email: req.session.user.email}).first(db.connection, function(err, signature) {
          if (err) throw err

          var skipSign = false; 
          if (signature) {    // skip signing, go to next flow
            skipSign = true;
          }
          res.json({skip_sign: skipSign});
          
        });
      } else {
        res.json({skip_sign: false});
      }
    });
  } else {
    res.json({skip_sign: false});
  }

});

module.exports = router;
