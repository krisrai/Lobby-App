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

var persist = require('persist');
var type = persist.type;

exports.Ascending = persist.Ascending;
exports.Descending = persist.Descending;

persist.connect(function(err, connection) {
  if (err) throw err;
  exports.connection = connection;
});

exports.Host = persist.define('Host',
  { 'email': { 'type': type.STRING, 'primaryKey': true }
  , 'name': type.STRING
});

exports.Person = persist.define('Person',
  { 'first_name': type.STRING
  , 'last_name': type.STRING
  , 'visit_reason': type.STRING
  , 'company_name': type.STRING
  , 'job_title': type.STRING
  , 'email': type.STRING
  , 'host': type.STRING
  , 'badge_number': type.STRING
  , 'signin_time': type.DATETIME
  , 'signout_time': type.DATETIME
}).hasOne(exports.Host, { 'foreignKey': 'host' });

exports.Setting = persist.define('Setting',
  { 'admin_password': type.STRING
  , 'user_timeout': type.INTEGER
  , 'company_name': type.STRING
  , 'company_location': type.STRING
  , 'ds_env': type.STRING
  , 'ds_account_name': type.STRING
  , 'ds_account_password': type.STRING
  , 'ds_account_key': type.STRING
  , 'auto_signout_time': type.STRING
  , 'auto_signout_enabled': type.BOOLEAN
  , 'report_day_time': type.STRING
  , 'report_num_days': type.INTEGER
  , 'report_emails': type.STRING
});

exports.Reason = persist.define('Reason',
  { 'reason': type.STRING
  , 'access_key': type.STRING
  , 'show_company': type.INTEGER
  , 'template_guid': type.STRING
  , 'show_host': type.INTEGER
  , 'show_badge': type.INTEGER
});

exports.Session = persist.define('Session',
  { 'sid': { 'type': type.STRING, 'primaryKey': true }
  , 'data': type.STRING
});

