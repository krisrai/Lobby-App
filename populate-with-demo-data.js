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


var moment = require('moment');
var csv = require('csv');
var db = new (require('sqlite3')).Database('lobby.db');


var stmt = db.prepare('INSERT INTO people VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
stmt.run(1, 'Mikey', 'Mike', 'Interview', null, null, 'mikey@example.org', 'sspecial@example.com', null, moment().valueOf(), null);
stmt.run(2, 'John', 'Peterson', 'Business', 'ACME, LLC', 'Developer', 'john@example.org', 'mikey@example.org', null, moment().subtract('hours', 2).valueOf(), null);
stmt.run(3, 'Joe', 'Schmoe', 'Personal', null, null, 'joe@example.org', 'mikey@example.org', null, moment().subtract('hours', 1).valueOf(), null);
stmt.run(4, 'Some', 'Dude', 'Business', 'Acme, Inc.', 'Sales Engineer', 'somedude@example.com', 'mikey@example.org', null, moment().subtract('days', 1).valueOf(), null);
stmt.run(5, 'Jane', 'Doe', 'Business', 'Acme, Inc.', 'Marketer', 'jane.doe@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(6, 'Jennifer', 'Smith', 'Temporary Badge', null, null, 'jennifer@example.com', '', 'IDQ284', moment().subtract('days', 3).valueOf(), null);
stmt.run(7, 'Ottoline', 'Snyder', 'Business', 'Acme, Inc.', 'Account Executive', 'temp1@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(8, 'Madelina', 'Walker', 'Business', 'Acme, Inc.', 'Support', 'temp1@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(9, 'Gil', 'Booner', 'Business', 'Acme, Inc.', 'Product Manager', 'temp3@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(10, 'Talon', 'Wootton', 'Business', 'Acme, Inc.', 'QA engineer', 'temp78@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(11, 'Topaz', 'Kimberly', 'Business', 'Acme, Inc.', 'Account Manager', 'temp22@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(12, 'Janelle', 'Corey', 'Business', 'Acme, Inc.', 'Supervisor', 'temp12@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(13, 'Ophelia', 'Haggard', 'Business', 'Acme, Inc.', 'Temp', 'temp14@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.run(14, 'Darion', 'Griffin', 'Business', 'Acme, Inc.', 'Sales Engineer', 'temp8@example.com', 'sspecial@example.com', null, moment().subtract('weeks', 1).valueOf(), null);
stmt.finalize();

var hostStmt = db.prepare('INSERT INTO hosts VALUES (?, ?)');
csv().from.path('hosts.csv')
.on('record', function(data, index) {
  hostStmt.run(data);
})
.on('end', function(count) {
  hostStmt.finalize();
});

