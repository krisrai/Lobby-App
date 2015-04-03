Environment
===========

This is the software used during the development and testing of the Lobby App:

* Ubuntu Linux 13.04
* NodeJS 0.10
* SQLite 3.7.15.2

Installation
============

Prerequisite Software
---------------------

For Debian Linux-based systems (such as Ubuntu), run these commands to
install the prerequisite software (please note that '$' means that it
should be run on the command-line terminal):

```
$ sudo apt-get install nodejs-legacy npm ant make g++
```

Lobby App Installation
----------------------

Let's assume that the app is in a directory called "lobby".

Run these commands to install the app:

```
$ cd lobby/
$ ant install
```

Setting Up the Document
-----------------------

The document that a visitor may need to sign must be a PDF file and be
named "document.pdf", placed at the root of the app installation (where
"app.js" is located).

This document can be configured to be sent as carbon copies (CC) to people
other than the signer. A sample configuration JSON file is provided as
"config.json.sample". You may copy this file into "config.json" and modify
the values accordingly.

You will need the file config.json in order for the app to run. If you do
not require CC recipients, you may leave that config field blank like so:

```
  "DS_SEND_CC_RECIPIENTS": []
```

Integrator Key
--------------

You may need to set an integrator key in the admin panel (more details in the
"Administrator Access" section). You can always get a key for free here:

http://www.docusign.com/developer-center

To set the integrator key into the app, go into the admin panel (available at
https://{hostname}/admin) and click on the "Change App Settings" button. There
should be a text field where you can put in your integrator key.

The integrator key is required for these functions of the app:

* Signing an NDA.
* Sending a visitor notification email to the host.

The integrator key generated for a DocuSign account can work with a different
provisioning account. This means that you can leave the default provisioning
account (lobby.app@gmail.com) alone when you set in your integrator key into
the app settings.

Installing as a Daemon on Ubuntu
--------------------------------

For Ubuntu Linux systems, you can run this command to install the app as a
daemon. Doing this will make sure that the app is running even after the
entire operating system has been rebooted:

```
$ sudo ant daemon
```

You may run the daemon like so:

```
$ sudo start lobby
```

To restart the daemon:

```
$ sudo restart lobby
```

To stop the daemon:

```
$ sudo stop lobby
```

When running as a daemon, the app will log various events into this file:
/var/log/lobby-app.log

Setting the Time Zone on Debian-based Systems
---------------------------------------------

On Debian-based systems (such as Ubuntu Linux), you may have to set the time
zone. Not doing this will make the lobby app display the wrong time on the
visitor history page.

```
$ sudo dpkg-reconfigure tzdata
```


Executing the Lobby App
=======================

The app can be executed by using this command:

```
$ node app
```

Now point your browser to this address: https://localhost:3000


Browser Settings for Lobby App Usage
------------------------------------

Third-party cookies are loaded when the Lobby App is interacting with DocuSign.
You may have to change your browser settings to allow third-party cookies
usage. If this is not enabled, you will see a white screen where the DocuSign
screen should be.

For the default iPad browser (Safari), go into the browser setting page and
change the setting labeled "Accept Cookies" from "From visited" to "Always".


Using a Different Port Number
-----------------------------

If you would like to use a different port number other than the default
number of 3000, you may do so as follows:

```
$ PORT=31415 node app
```

If your desired port number is less than 1024, you will have to prepend the
command with "sudo", like so:

```
$ sudo PORT=80 node app
```


Administrator Access
====================

To access the administrator panel for the app, go to this address from your
browser: https://localhost:3000/admin

The default password is "CHANGEME". This password may be changed through the
app interface.


Uninstalling
============

Uninstalling the app can be done by simply deleting the directory that has
the app code:

```
$ rm -rf lobby/
```


Testing [optional]
==================

Loading Demo Data for Testing Purposes
--------------------------------------

If you are developing or testing, then you should run this command:

```
$ ant database-dev
```

This command will populate the database with test data.

Running Tests
-------------

To run the unit tests for the app, you may run this command:

```
$ ant test
```

Getting Coverage Data
---------------------

To get coverage data, you may run this command:

```
$ ant coverage
```

Then open this file in your browser: build/coverage.html


Resetting the Administrator Password
====================================

As a last resort, one may reset the Lobby App administrator password by
running the following command:

```
$ node reset-admin-password.js
```

