/*app module*/
var App = angular.module('App', ['ngRoute','ngTable', 'App.services', 'App.directives', 'App.controllers']);

App.run(function($rootScope, $window, $timeout) {

    $rootScope.back = function() {
        $window.history.back();
    }

    $rootScope.alert = '';
    $rootScope.setAlert = function(msg, expire) {
        $rootScope.alert = msg;

        // remove it by timeout
        if (!expire)
            expire = 20;
        $timeout(function() {
            $rootScope.alert = '';
        }, expire*1000);
    }

    $rootScope.clearAlert = function() {
        $rootScope.alert = '';
    }
});

App.config(function ($routeProvider) {
    $routeProvider.
        when('/visitorSignIn', {
            templateUrl: 'templates/visitorSignIn.html'
        }).
        when('/reasonForVisit', {
            templateUrl: 'templates/reasonForVisit.html'
        }).
        when('/nameAndTitle', {
            templateUrl: 'templates/companyNameAndTitle.html'
        }).
        when('/email', {
            templateUrl: 'templates/email.html'
        }).
        when('/signNDA', {
            templateUrl: 'templates/signNDA.html'
        }).
        when('/visiting', {
            templateUrl: 'templates/whoYouAreVisiting.html'
        }).
        when('/badge', {
            templateUrl: 'templates/badge.html'
        }).
        when('/welcome', {
            templateUrl: 'templates/welcome.html'
        }).
        when('/confirmSignIn', {
            templateUrl: 'templates/confirmSignIn.html'
        }).
        when('/signOut', {
            templateUrl: 'templates/signOut.html'
        }).
        when('/adminLogin', {
            templateUrl: 'templates/adminLogin.html'
        }).
        when('/dashboard', {
            templateUrl: 'templates/adminDashboard.html'
        }).
        when('/appSettings', {
            templateUrl: 'templates/adminAppSettings.html',
            controller: 'appSettingsCtrl'
        }).
        when('/logHistory', {
            templateUrl: 'templates/adminLogHistory.html',
            controller: 'logHistoryCtrl'
        }).
        when('/visitReason', {
            templateUrl: 'templates/adminVisitReason.html',
            controller: 'visitReasonCtrl'
        }).
        when('/listOfHosts', {
            templateUrl: 'templates/adminListOfHosts.html',
            controller: 'hostCtrl'
        }).
        when('/searchResults', {
            templateUrl: 'templates/searchResults.html'
        });
});