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
var db = new (require('sqlite3')).Database('lobby.db');
var nconf = require('nconf').file('config.json');
var crypto = require('crypto');

db.exec(fs.readFileSync('create-tables.sql', 'utf-8'));

var defaultPassword = nconf.get('defaultAdminPassword');
var passwordSalt = new Buffer(nconf.get('adminPasswordSalt'), 'base64');
var pbkdf2Password = crypto.pbkdf2Sync(defaultPassword, passwordSalt, 100000, 512).toString('hex');
var stmt = db.prepare('INSERT INTO settings VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)');
stmt.run(60, pbkdf2Password, 'ACME LLC', 'Springsfield', 'demo', 'lobby.app@gmail.com', 'LobbyApp1', '');
stmt.finalize();

oldFile = fs.createReadStream('default_logo.png');
newFile = fs.createWriteStream('public/images/logo.png');     
oldFile.pipe(newFile);

var stmt = db.prepare('INSERT INTO reasons VALUES (?, ?, ?, ?, ?, ?, ?)');
stmt.run(1, 'Business', 'b', 1, 'F75F9D49-2E7C-4EB8-9496-A9F7493798BF', 1, 0);
stmt.run(2, 'Interview', 'i', 0, 'F75F9D49-2E7C-4EB8-9496-A9F7493798BF', 1, 0);
stmt.run(3, 'Personal', 'p', 0, '---', 1, 0);
stmt.run(4, 'Temporary Badge', 't', 0, '---', 0, 1);
stmt.run(5, 'Delivery', 'd', 0, '---', 0, 0);
stmt.run(6, 'Building Personnel', 'u', 0, '---', 0, 0);
stmt.finalize();

