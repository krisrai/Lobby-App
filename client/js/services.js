/*
 * service module
 */
angular.module('App.services', [])
// visitor service
.service('visitorService', ['$http', function($http) {
	var API_BASE = '/api';
	var service = {};

	service.companyInfo = function(success, error) {
		return $http.get(API_BASE+'/company_info');
	};

	service.checkSignOut = function(visitorName) {
		return $http.post(API_BASE+'/check_signout', {name:visitorName});
	};

	service.getReasons = function() {
		return $http.get(API_BASE+'/reason');
	};

	service.setEmail = function(email) {
		return $http.post(API_BASE+'/email', {email: email});
	}

	// call to check the embedded DocuSign iframe has returned the response
	service.checkSignReturn = function() {
		return $http.get(API_BASE+'/check_sign_return');
	}

	service.getHosts = function() {
		return $http.get(API_BASE+'/host');
	}

	service.confirmSignIn = function(checkinData) {
		return $http.post(API_BASE+'/confirm_signin', checkinData);
	}

	// called when signout to record signout time
	service.confirmSignOut = function(checkinData) {
		return $http.get(API_BASE+'/confirm_signout');
	}

	service.checkSkipSigning= function() {
		return $http.get(API_BASE+'/check_skip_signing');
	}
	
	return service;
}])
// admin services
.service('adminService', ['$http', function($http) {
	var API_BASE = '/admin';
	var service = {};

	service.login = function(password) {
		return $http.post(API_BASE+'/admin_login', {password: CryptoJS.SHA256(password).toString()});
	}

	// get data api
	service.getSettings = function() {
		return $http.get(API_BASE+'/admin_settings');
	}
	service.getLogHistory = function() {
		return $http.get(API_BASE+'/admin_history');
	}
	service.getReasons = function() {
		return $http.get(API_BASE+'/admin_reasons');
	}
	service.getHosts = function() {
		return $http.get(API_BASE+'/admin_hosts');
	}
	service.updateHosts = function(hostFile) {
		return $http.post(API_BASE+'/admin_update_hosts', hostFile, {
			headers: {
				'Content-Type': hostFile.type
			}
		});
	}

	// update api
	service.updateSettings = function(settings) {
		return $http.post(API_BASE+'/admin_update_settings', settings);
	}

	service.updateLogo = function(logoFile) {
		return $http.post(API_BASE+'/admin_update_logo', logoFile, {
			headers: {
				'Content-Type': logoFile.type
			}
		});
	}

	service.testDocuSign = function() {
		return $http.post(API_BASE+'/admin_update_settings', settings);
	}

	service.manualSignout = function(personId) {
		return $http.post(API_BASE+'/admin_manual_signout', {row_id: personId});
	}

	// add/delete/update reason
	service.editReason = function(id, operation, column, value) {
		var reasonEdit = {};
		reasonEdit[operation] = true;
		if (id)
			reasonEdit['row_id'] = id;
		if (column)
			reasonEdit['column'] = column;
		if (value)
			reasonEdit['value'] = value;

		return $http.post(API_BASE+'/admin_reasons_edit', reasonEdit);
	}

	return service;

}])
// dosusign api service
.service('docuSignService', ['$http', function($http) {
	var API_BASE = '/docusign';
	var service = {};

	service.testConnection = function(settings) {
		return $http.post(API_BASE+'/docusign_test', settings);
	}

	service.getTemplates = function() {
		return $http.get(API_BASE+'/dsrest_templates');
	}

	return service;
}]);