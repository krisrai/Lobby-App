var nodemailer = require('nodemailer');
var moment = require('moment');
var print = require('../print');
var nconf = require('nconf').file('config.json');


config = nconf.get('MAIL');

// Gmail SMTP worked very well
//   - only need to config sender email and password
// AWS SES works OK
//   - both sender and receiver emails must be verified in the AWS SES console
// Direct transport didn't work


var mailOptions = {
  subject: "DocuSign Lobby App Weekly Report", // Subject line
  text: "Weekly Visitors History Report"+
    		"Please see the attached csv file", // plaintext body
  html: "<b>Weekly Visitors History Report</b>"+
    		"<p>Please see the attached csv file</p>", // html body
}

exports.sendReportToEmails = function(emails, from, data) {
  // I think from should be setting.ds_account_name, but this may or may not work with mail configuration
  // so use 'from_email' for demo
  if (config.from_email) {
  	mailOptions.from = config.from_email;
  } else {
  	mailOptions.from = from;	// this should be setting.ds_account_name
  }
  // set recipients
  mailOptions.to = emails;
  // set csv file as attachment
  var date = moment().format('YYYY-MM-DD');
  var reportFileName = 'report-visitor-history-'+date+'.csv';
  mailOptions.attachments = [];
  var attachment = {
    fileName: reportFileName,
    contents: data
  };
  mailOptions.attachments.push(attachment);
  print._("Mailer: sending report "+reportFileName+', from '+mailOptions.from+', to '+emails);

  var mailTransport = getMailTransport();
  if (!mailTransport) {
  	return;
  }
  mailTransport.sendMail(mailOptions, function(err, response){
  	if (err) {
  	  print._('Mailer: error on sending mail, '+err);
  	} else {
  	  print._("Mailer: report is sent successfully: " + response.message);
  	}
  });
}

// get nodemailer transport based on the MAIL configuration in config.json
var getMailTransport = function() {
  var mailTransport = null;
  if (config.transport === 'SMTP') {
	mailTransport = nodemailer.createTransport("SMTP",{
	  // debug: true,
	  service: config.SMTP.service,
      auth: {
		user: config.SMTP.user,
		pass: config.SMTP.pass
	  }
	});
  } else if (config.transport === 'SES') {		
	mailTransport = nodemailer.createTransport("SES", {
	  AWSAccessKeyID: config.SES.AWSAccessKeyID,
	  AWSSecretKey: config.SES.AWSSecretKey
    });
  } else {
	console.log('Mail transport is not configured, please configure mail in the config.json');
  }
  return mailTransport;
}