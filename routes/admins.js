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
var moment = require('moment');
var db = require('../database');
var csv = require('csv');
var print = require('../print');

var scheduler = require('../lib/job-scheduler');
var worker = require('../lib/job-worker');

router.post('/admin_login', function(req, res) {
  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    var loggedIn = false;
    if (setting.admin_password == req.param('password') || req.session.is_admin) {
      req.session.is_admin = true;
      // set admin user to session
      req.session.user = {
        first_name: 'admin',
        last_name: 'admin'
      };
      loggedIn = true;
    }
    res.json({loggedIn: loggedIn});
  });
});

router.get('/timeout', function(req, res) {
  if (req.session.is_admin) {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      // number becomes status code, need to send string.
      // it's 60 sec by default, it's annoying in devel mode, so return 1hr.
      setting.user_timeout = 60*60;
      res.send(setting.user_timeout.toString());
    });
  } else {
    res.redirect('/admin');
  }
});

router.get('/admin_history', function(req, res){
  if (req.session.is_admin) {
    db.Host.all(db.connection, function(err, rows) {
      var hosts = {};
      rows.forEach(function(row) {
        hosts[row.email] = row.name;
      });

      db.Person.all(db.connection, function(err, rows) {
        if (err) throw err;

        var people = [];
        rows.forEach(function(row) {
          people.push(
            { id: row.id
            , name: row.first_name+' '+row.last_name
            // , lastName: row.last_name
            , visitReason: row.visit_reason
            , email: row.email
            , companyName: row.company_name
            , jobTitle: row.job_title
            , host: hosts[row.host]
            , badgeNumber: row.badge_number
            , signInTime: row.signin_time
            , signOutTime: row.signout_time
          });
        });
        res.json(people);
      });
    });
  } else {
    res.redirect('/admin');
  }
});

router.get('/admin_settings', function(req, res){
  if (req.session.is_admin) {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      var key = setting.ds_account_key;
      if (key === '')
        key = require('../default_integrator_key').ikey;
      setting['ds_account_key'] = key;

      res.json(setting);
    });
  } else {
     res.redirect('/admin');
  }
});

var cancelJobs = function(updatedSetting, setting) {
    // if auto_signout is changed, cancel current job
    if ((updatedSetting['auto_signout_time'] || updatedSetting['auto_signout_enabled']) && setting.auto_signout_enabled) {
      scheduler.cancelJob('job-update-signout-0');  // only one signout job
    }
    // if report is changed, cancel current job
    if (updatedSetting['report_day_time'] && setting.report_day_time && setting.report_emails) {
      scheduler.cancelJob('job-send-report-0');   // only one report job
    }
}

// schedule auto signout
var scheduleAutoSignout = function(setting) {
  if (setting.auto_signout_enabled) {
    var job_time = moment(setting.auto_signout_time, 'hh:mm a');
    scheduler.scheduleJob('job-update-signout-0', null, job_time.hours(), job_time.minutes(), worker.update_signout_time);
  }
}

// schedule report
var scheduleReport = function(setting) {
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
}

// update settings
router.post('/admin_update_settings', function(req, res) {
  if (req.session.is_admin) {
    db.Setting.first(db.connection, function(err, setting) {
      if (err) throw err;

      // body is setting object
      var updatedSetting = req.body;

      // before update, check auto_signout or report, cancel if scheduled 
      cancelJobs(updatedSetting, setting);


      // merge properties
      for (prop in updatedSetting) {
        if (updatedSetting.hasOwnProperty(prop)) {
          setting[prop] = updatedSetting[prop];
        }
      }

      setting.save(db.connection, function(err) {
        if (err)
          print._('Failed to save setting, '+JSON.stringify(err));

        // if auto_signout is changed and enabled, schedule new one
        if ((updatedSetting['auto_signout_time'] || updatedSetting['auto_signout_enabled']) && setting.auto_signout_enabled) {
          scheduleAutoSignout(setting);
        }
        // if report is changed, schedule new one
        if (updatedSetting['report_day_time'] && setting.report_day_time && setting.report_emails) {
          scheduleReport(setting);
        }

        res.send();
      });
    });
  } else {
     res.redirect('/admin');
  }
});

router.post('/admin_update_logo', function(req, res) {
  if (req.session.is_admin) {
    var path = 'client/i/logo.png';
    fs.unlinkSync(path); // remove old logo

    req.on('data', function(data) {
      var stream = fs.createWriteStream(path, {'flags': 'a'});
      stream.end(data);
    });
    req.on('end', function() {
      res.send();
    });
  } else {
     res.redirect('/admin');
  }
});

router.get('/admin_reasons', function(req, res){
  if (req.session.is_admin) { 
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
  } else {
     res.redirect('admin');
  }
});

// update reason table
router.post('/admin_reasons_edit', function(req, res) {
  if (req.param('add')) {     // add new reason
    var new_reason = new db.Reason({
        template_guid: '---'
      , show_company: 0
      , show_host: 0
      , show_badge: 0
    });
    new_reason.save(db.connection, function(err, reason) {
      if (err) throw err;

      res.send(reason);
    });
    return;
  }

  db.Reason.all(db.connection, function(err, reasons) {
    if (err) throw err;

    var row_id = parseInt(req.param('row_id'), 10);
    var reason = reasons.getById(row_id);

    if (req.param('delete')) {    // delete reason
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


router.get('/admin_hosts', function(req, res){
  if (req.session.is_admin) {
    db.Host.all(db.connection, function(err, rows) {
      if (err) throw err;

      var hosts = [];
      rows.forEach(function(row) {

        hosts.push(
          { email: row.email
          , name: row.name
        });
      });
      res.json(hosts);
    });
  } else {
     res.redirect('/admin');
  }
});

router.post('/admin_update_hosts', function(req, res) {
  if (req.session.is_admin) {
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
  } else {
     res.redirect('/admin');
  }
});


router.get('/download_hosts', function(req, res) {
  if (req.session.is_admin) {
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
  } else {
     res.redirect('/admin');
  }
});

router.post('/admin_manual_signout', function(req, res) {
  if (req.session.is_admin) { 
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
  } else {
     res.redirect('/admin');
  }
});

// private unility methods -------------


module.exports = router;
