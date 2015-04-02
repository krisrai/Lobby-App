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


db.exec(fs.readFileSync('create-tables.sql', 'utf-8'));

var stmt = db.prepare('INSERT INTO settings VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)');
stmt.run(60, 'abd9fc8f711daae0ec63fa5098017f169533379c3b319205571313cdf0329e05e85115f4ae3026e7c3f1f4e3fb3c16b740d2108dfd761fe655f171bfefb1e4a812816a80dc3c9021f605341c59cee45349f387c2a0b2527da1b32e8c97a2dd981608e34587b0c6bb034089eff8b05e94dcc26b83cf1ae0dabff9031abe6cbef13359e172d036d33271346ecc33f3690b99d50133006545c23564cb21203ef5fcbe4dc49ab35a5530aad161f0f12066d76765af5661d02bd784b760dd273f568b1b325d4b70c4c0e59454da99845e816507ab144b5770612fc5ab48eba621aaa81615636745da8c1bb0c84a4d8a502a0dfc3b0a19a1ffcf6d4c2e9a0be3c5e154439245f1b90f0682370f2490dd5c578f3d34cf78545ef03af5b7f0cc7aa88bb198f005af463abc73591186b13b3b8a13d125b09ebee3dfb9d25aa7d9dae966a236035fd5a8b8494fc4531add4a749b3a065aaf9227f31d6bd105e6ab3d5fdb7f1c63b70dd8be35a7d67cc3fe60c5c75f2215a8d2ff9c71b1e40189a15daa810a29e1eea136240267388006adc4ecdbe3045b9b8f90e5ba3a5ad3886b25e73ab90ce1bd8a845445b6d13445338814a5c82e625ae8cae3b383ba26412adbaf2d294116b6c9d2da5dee6dcc8d3be93f5ea2f0fad4727dc929d84226c8b65b36f6129736e2556785aa030360f43496767225709ffca13f498b4730c8abddb122843d', 'ACME LLC', 'Springsfield', 'demo', 'lobby.app@gmail.com', 'LobbyApp1', '');
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

