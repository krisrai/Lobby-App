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


// run this if the admin password needs to be reset

var db = new (require('sqlite3')).Database('lobby.db');
var nconf = require('nconf').file('config.json');
var crypto = require('crypto');

var defaultPassword = nconf.get('defaultAdminPassword');
var passwordSalt = new Buffer(nconf.get('adminPasswordSalt'), 'base64');
var pbkdf2Password = crypto.pbkdf2Sync(defaultPassword, passwordSalt, 100000, 512).toString('hex');
db.run("UPDATE settings SET admin_password = '" + pbkdf2Password + "' WHERE id = 1");

