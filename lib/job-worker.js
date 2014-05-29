var db = require('../database');
var moment = require('moment');
var mailer = require('./mailer');
var csv = require('csv');
var print = require('../print');

// update signout time if enabled
exports.update_signout_time = function(job) {

  print._('Worker: running '+job);

  db.Person.all(db.connection, function(err, people) {
    if (err) throw err;

    people.forEach(function(person) {
      if (!person.signout_time) { // update only if it's null
		  // update the signout time to the timestamp when the job executes
		var now = moment();
        person.signout_time = now.valueOf();
        person.save(db.connection, function() {
        	print._('Worker['+job+'] updated signout time to '+now.toString()+' for '+person.email);
        });
      }
    });
  });

}

// create & send report to the email list
exports.send_report = function(job) {

  print._('Worker: running '+job);

  db.Setting.first(db.connection, function(err, setting) {
    if (err) throw err;

    // report_day_time, report_emails, report_num_days
    db.Host.all(db.connection, function(err, rows) {
	  var hosts = {};
	  rows.forEach(function(row) {
	    hosts[row.email] = row.name;
	  });

	  var now = moment();
	  var pastndays = now.dates(-1 * setting.report_num_days);
	  var pastntime = pastndays.valueOf();

	  db.Person.all(db.connection, function(err, rows) {
	    if (err) throw err;

        var people = [];
        rows.forEach(function(row) {

          // only include visitors who came in during the past n days
          if (row.signin_time > pastntime) {
	        if (row.signout_time) {
	          var signout_time = moment(row.signout_time).format('M/D/YYYY h:mm A');
	        }

	        people.push(
	          [ row.id
	          , row.first_name
	          , row.last_name
	          , row.visit_reason
	          , row.email
	          , row.company_name
	          , row.job_title
	          , hosts[row.host]
	          , row.badge_number
	          , moment(row.signin_time).format('M/D/YYYY h:mm A')
	          , signout_time
	        ]);
      	  }
        });

	    csv().from.array(people)
	      .to.string(function(data) {   // data is string of entire csv data
	        // send email to the email list
	        mailer.sendReportToEmails(setting.report_emails, setting.ds_account_name, data);
	      })
	  });	// Person
	});	// Host
  }); // Setting

}


