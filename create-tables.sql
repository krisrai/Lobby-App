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

CREATE TABLE hosts
  ( email TEXT PRIMARY KEY
  , name TEXT NOT NULL
);

CREATE TABLE people
  ( id INTEGER PRIMARY KEY ASC
  , first_name TEXT NOT NULL
  , last_name TEXT NOT NULL
  , visit_reason TEXT NOT NULL
  , company_name TEXT
  , job_title TEXT
  , email TEXT
  , host TEXT
  , badge_number TEXT
  , signin_time DATETIME NOT NULL
  , signout_time DATETIME
);

CREATE TABLE settings
  ( id INTEGER PRIMARY KEY ASC
  , user_timeout INTEGER NOT NULL
  , admin_password TEXT NOT NULL
  , company_name TEXT NOT NULL
  , company_location TEXT NOT NULL
  , ds_env TEXT NOT NULL
  , ds_account_name TEXT NOT NULL
  , ds_account_password TEXT NOT NULL
  , ds_account_key TEXT NOT NULL
  , auto_signout_time TEXT
  , auto_signout_enabled BOOLEAN DEFAULT false
  , report_day_time TEXT
  , report_num_days INTEGER DEFAULT 7
  , report_emails TEXT
);

CREATE TABLE reasons
  ( id INTEGER PRIMARY KEY ASC
  , reason TEXT UNIQUE
  , access_key TEXT
  , show_company INTEGER DEFAULT 0
  , template_guid TEXT
  , show_host INTEGER DEFAULT 0
  , show_badge INTEGER DEFAULT 0
);

CREATE TABLE sessions
  ( sid TEXT PRIMARY KEY
  , data TEXT
);

