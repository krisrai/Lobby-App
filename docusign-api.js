var request = require("request");
var print = require('./print');

exports.login = function(env, email, password, integratorKey, callback) {
	var url = 'https://' + env + '.docusign.net/restapi/v2/login_information';

	// set request url, method, body, and headers
	var cred = getAuthHeader(email, password, integratorKey);
	var headers = buildHeadersWithDsCredential(cred);
	var options = initializeRequest(url, "GET", '', headers);
	
	// print._('DS API Request: '+JSON.stringify(options));

	// send the request...
	request(options, function(err, res, body) {
		var jsonBody = JSON.parse(body);
		print._("\r\nDS API Result: \r\n", JSON.parse(body));
		if( res.statusCode != 200 && res.statusCode != 201)	{ // success statuses
			print._("Error calling webservice, status is: ", res.statusCode);
			print._("\r\n", err);	// err is null
			if (!err) {
				err = new Error(jsonBody.message);
			}
			callback(err);
		}
		// return baseUrl only
		var loginAccount = jsonBody.loginAccounts[0];
		callback(null, loginAccount.baseUrl);
	});
}


exports.invokeRest = function(url, method, body, headers, callback) {
	// set url, method, body, and headers
	var options = initializeRequest(url, method, body, headers);
	
	// print._('DS API Request: '+JSON.stringify(options));

	// send the request...
	request(options, function(err, res, body) {
		var jsonBody = JSON.parse(body);
		print._("\r\nDS API Result: \r\n", JSON.parse(body));
		if( res.statusCode != 200 && res.statusCode != 201)	{ // success statuses
			print._("Error calling webservice, status is: ", res.statusCode);
			print._("\r\n", err);	// err is null
			if (!err) {
				err = new Error(jsonBody.message);
			}
			callback(err);
		}
		// return JSON object
		callback(null, jsonBody);
	});
}

exports.getHeaders = function(email, password, integratorKey) {
	var cred = getAuthHeader(email, password, integratorKey);
	var headers = buildHeadersWithDsCredential(cred);
    return headers;
}

//***********************************************************************************************
// --- HELPER FUNCTIONS ---
//***********************************************************************************************

function initializeRequest(url, method, body, headers) {	
	var options = {
		"method": method,
		"uri": url,
		"body": body,
		"headers": headers
	};
	return options;
}

function getAuthHeader(email, password, integratorKey) {	
	// JSON formatted authentication header (XML format allowed as well)
    var dsAuthHeader = 
    	'<DocuSignCredentials>' +
            '<Username>' + email + '</Username>' +
            '<Password>' + password + '</Password>' +
            '<IntegratorKey>' + integratorKey + '</IntegratorKey>' +
        '</DocuSignCredentials>';
	return dsAuthHeader;
}

function buildHeadersWithDsCredential(cred) {
	var headers = {
        "X-DocuSign-Authentication": cred
        , "content-type": "application/json"
        , "accept": "application/json"
    };
    return headers;
}

