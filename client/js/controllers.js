

AppControllers = angular.module('App.controllers', []);
/*main controller*/
AppControllers.controller('visitorsCtrl', ['$scope', '$http', '$timeout', '$window', '$location', '$sce', '$interval', 'visitorService',
    function ($scope, $http, $timeout, $window, $location, $sce, $interval, visitorService) {


        /*set initial step*/
        $scope.currentStep =0;
        // get company info
        visitorService.companyInfo().success(function(data, status) {
                $scope.companyInfo = data;
            });

        /*watch and detect current step*/
        $scope.$watch('currentStep', function() {
            console.log('currentStep watch: '+$scope.currentStep);
            switch($scope.currentStep) {
                case 0:
                    $location.url("/visitorSignIn");
                    break;
                case 1:
                    $location.url("/reasonForVisit");
                    break;
                case 2:
                    $location.url("/nameAndTitle");
                    break;
                case 3:
                    $location.url("/email");
                    break;
                case 4:
                    $location.url("/signNDA");
                    break;
                case 5:
                    $location.url("/visiting");
                    break;
                case 6:
                    $location.url("/badge");
                    break;
                case 7:
                    $location.url("/welcome");
                    break;
                case 8:
                    $location.url("/confirmSignIn");
                    break;
                case 9:
                    $location.url("/signOut");
                    break;

                default:
                    $location.url("/visitorSignIn");
            }
        });

        /*route change*/
        $scope.$on('$routeChangeSuccess', function(next, current) {

            if(current === undefined){
                return false;
            }
            if(current.$$route){
                $scope.currentPage = current.$$route.originalPath;
            }
            console.log('routeChangeSuccess currentPage: '+$scope.currentPage);
            if($scope.currentPage==='/visitorSignIn'){
                $scope.currentStep = 0;
            }else if($scope.currentPage==='/reasonForVisit') {
                $scope.currentStep = 1;
            }else if($scope.currentPage==='/nameAndTitle') {
                $scope.currentStep = 2;
            }else if($scope.currentPage==='/email') {
                $scope.currentStep = 3;
            }else if($scope.currentPage==='/signNDA') {
                $scope.currentStep = 4;
                // skip signing if user already signed and ds_skip_signing enabled
                visitorService.checkSkipSigning().success(function(data){
                    if (data && data.skip_sign) {
                        $scope.nextFlow();          // skip signing, go to next flow
                    } else {
                        // start docusign signing flow
                        startSignFlow();
                    }
                });

            }else if($scope.currentPage==='/visiting') {
                $scope.currentStep = 5;
            }else if($scope.currentPage==='/badge') {
                $scope.currentStep = 6;
            }else if($scope.currentPage==='/welcome') {
                $scope.currentStep = 7;

            }else if($scope.currentPage==='/confirmSignIn') {
                $scope.currentStep = 8;
                // confirm signin by posting checkin data
                visitorService.confirmSignIn(getCheckinData()).success(function() {
                    //
                });
            }else if($scope.currentPage==='/signOut') {
                $scope.currentStep = 9;
                // confirm signout to record signout time
                visitorService.confirmSignOut().success(function() {
                    //
                });
            }else{
                $location.url("/visitorSignIn");
            }
        });

        /*visitor details*/
        $scope.resetVisitorDetails = function(){
            $scope.companyName="";
            $scope.jobTitle="";
            $scope.email="";
            $scope.visitingHost="";
            $scope.badgeNumber = "";
            $scope.iframeUrl = "";
            $scope.ajaxLoading = false;
        };
        $scope.resetVisitorDetails();

        /*step back*/
        $scope.stepBack = function(){
            $scope.clearAlert();
            var prev = $scope.flow.pop();

            if (prev) {
                $scope.flow.unshift($scope.currentPage);
                if (prev === '/signNDA') {  // skip signNDA when back
                    $scope.flow.unshift(prev);
                    prev = $scope.flow.pop();
                }
                $location.url(prev);
            } else {
                $window.history.back();
            }
        };

        $scope.nextFlow = function() {
            $scope.validForm = true;
            $scope.clearAlert();
            var next = $scope.flow.shift();
            if (next) {
                $scope.flow.push($scope.currentPage);
                $location.url(next);
            }
        }

        $scope.validForm = true;

        /*sign in*/
        $scope.visitorName = "";
        $scope.signIn = function(visitorName){
            if(visitorName){
                $scope.visitorName = visitorName;
                $scope.validForm = true;

                // check signin time
                visitorService.checkSignOut(visitorName).success(function(data, status) {
                    if (data && data.signin_time) {     // go to welcome
                        $scope.signinTime = data.signin_time;
                        $location.url('/welcome');
                    }else{  // go to next step, which is reason
                        $scope.signinTime = new Date();
                        $location.url('/reasonForVisit');
                    }
                });           
            }else{
                $scope.validForm = false;
            }
        };

        /*get reasons*/
        $scope.selectedReason={};
        visitorService.getReasons().success(function(data) {
            $scope.visitReasons = data;
        });

        $scope.hosts = [];
        /*fetch host list*/
        visitorService.getHosts().success(function(data) {
            $scope.hosts = data;
        });

        /*set SelectedReason*/
        $scope.setSelectedReason = function(selectedReason){
            if(selectedReason !==""){
                $scope.validForm = true;

                // initialize flow, get next flow
                initFlow(selectedReason);
                $scope.nextFlow();
            }else{
                $scope.validForm = false;
            }
        };

        /*set reasonSelected*/
        $scope.reasonSelected = function(reason){
            angular.forEach($scope.visitReasons, function(value, key) {
                value.select = false;
            });
            if (reason) {
                reason.select = true;
                $scope.selectedReason = reason;
            }
        };

        /*set NameAndTitle*/
        $scope.setCompanyNameAndTitle = function(companyName,jobTitle){
            if(companyName !== '' && jobTitle !== ''){
                $scope.companyName=companyName;
                $scope.jobTitle=jobTitle;
                $scope.validForm = true;
                $scope.nextFlow();
            }else{
                $scope.validForm = false;
            }
        };

        /*set email*/
        $scope.setEmail = function(email){
            if($scope.isEmail(email)){
                $scope.email=email;
                $scope.validForm = true;
                $scope.iframeUrl = '';
                visitorService.setEmail($scope.email).success(function() {
                    $scope.nextFlow();
                });

            }else{
                $scope.validForm = false;
            }
        };

        /*email check*/
        $scope.validEmail=true;
        $scope.checkEmail =function(){
            $scope.validEmail = $scope.isEmail(emailForm.email.value);
        };

        /*email test*/
        $scope.isEmail =function(email){
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        };

        /*set Who Are YouVisiting*/
        var docuSignErrorMsg = 'An error has occurred while calling the DocuSign API. Please contact DocuSign support for assistance.';
        $scope.setWhoAreYouVisiting = function(visitingHost){
            if(visitingHost !== ''){
                $scope.validForm = true;

                // validate host name, and notify host
                if (isValidHost(visitingHost)) {
                    $scope.ajaxLoading = true;
                    $http.get('docusign/dsrest_init').success(function() {
                        $http.get('docusign/dsrest_send_notification?host_name='+visitingHost).success(function() {
                            $scope.visitingHost = visitingHost;
                            $scope.ajaxLoading = false;
                            $scope.nextFlow();
                            return;
                        })
                        .error(function() {
                            $scope.resetVisitorDetails();
                            $location.url('/visitorSignIn');
                            $scope.setAlert(docuSignErrorMsg);
                            return;
                        });
                    })
                    .error(function() {
                            $scope.resetVisitorDetails();
                            $location.url('/visitorSignIn');
                            $scope.setAlert(docuSignErrorMsg);
                            return;
                    });
                } else if (!$scope.warning) {
                    // display message
                    $scope.visitingHost = '';
                    $scope.setAlert('The person is not registered in our system. Click the Next button again to skip this question anyway',
                        60*60);
                    $scope.warning = true;
                    return;
                } else {
                    $scope.nextFlow();
                }
            }else{
                $scope.validForm = false;
            }
        };

        $scope.setBadgeNumber = function(badgeNumber) {
            if (badgeNumber !== '') {
                $scope.badgeNumber = badgeNumber;
                $scope.nextFlow();
            } else {
                $scope.validForm = false;
            }
        }

        /*sign out*/
        $scope.signOut = function(){
            $scope.resetVisitorDetails();
            $location.url('/signOut');
        };

        $scope.reSignIn = function() {
            $scope.reasonSelected(null);    // clear reason
            $location.url('/reasonForVisit');
        }

        /*to Sign In*/
        $scope.toSignIn = function(){
            $scope.visitorName = "";
            $scope.resetVisitorDetails();
            $scope.reasonSelected(null);    // clear reason
            $scope.currentStep=0;
        };

        /* utility methods */

        var isValidHost = function(visitingHost) {
            var invalid = $scope.hosts.every(function(host) {
                if (host === visitingHost) {
                    return false;   // break loop
                }
                return true;
            });
            return !invalid;
        }

        var initFlow = function(reason) {
            $scope.flow = [];
            $scope.resetVisitorDetails();

            if (reason.show_company == 1) {
                $scope.flow.push('/nameAndTitle');
            }
            var re = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/; // GUID format
            if (re.exec(reason.template_guid)) { // is the GUID valid?
                $scope.flow.push('/email');
                $scope.flow.push('/signNDA');
            }
            if (reason.show_host == 1) {
                $scope.flow.push('/visiting');
            }
            if (reason.show_badge == 1) {
                $scope.flow.push('/badge');
            }
            $scope.flow.push('/confirmSignIn');
            $scope.flow.push(null);     // mark the end
        }

        var getCheckinData = function() {
            var checkinData = {visitReason: $scope.selectedReason.reason};
            if ($scope.email)
                checkinData['email'] = $scope.email;
            if ($scope.visitingHost)
                checkinData['visitingHost'] = $scope.visitingHost;
            if ($scope.companyName)
                checkinData['companyName'] = $scope.companyName;
            if ($scope.jobTitle)
                checkinData['jobTitle'] = $scope.jobTitle;
            if ($scope.badgeNumber)
                checkinData['badgeNumber'] = $scope.badgeNumber;
            return checkinData;
        }

        var checkReturnByLongPolling = function() {
           visitorService.checkSignReturn().success(function(data, status) {
                if (data.returned && data.event && data.event === 'signing_complete') {     // move next flow
                    $location.url($scope.flow.shift());
                } else if (data.returned) {                 // this is case decline or cancel(x button on sign page)
                    $scope.resetVisitorDetails();
                    $location.url('/visitorSignIn');
                } else if ($scope.currentPage==='/signNDA') {   // check again
                    checkReturnByLongPolling();
                }
            }).error(function() {
                if ($scope.currentPage==='/signNDA') {
                    checkReturnByLongPolling();
                } else {
                    $scope.resetVisitorDetails();
                    $location.url('/visitorSignIn');
                }
            });
        }

        /* start docusign signing flow */
        var startSignFlow = function() {
            $http.get('docusign/dsrest_init').success(function(data, status) {
                $http.get('docusign/dsrest_create_envelope').success(function(data, status) {
                    $http.get('docusign/dsrest_iframe_url').success(function(data, status) {
                        // set iframe url
                        if (data.url !== '') {
                            $scope.iframeUrl = $sce.trustAsResourceUrl(data.url);

                            // check return
                            checkReturnByLongPolling();
                        } else {
                            $scope.setBack();
                        }
                    })
                    .error(function(data, status) {
                        $scope.setBack();
                    });
                })
                .error(function(data, status) {
                    $scope.setBack();
                });
            })
            .error(function(data, status) {
                $scope.setBack();
            });
        }
    }
]);

/*admin controller*/
AppControllers.controller('adminCtrl', ['$scope', '$http', '$timeout', '$location', 'adminService', 'docuSignService',
    function ($scope, $http, $timeout, $location, adminService, docuSignService) {

        $scope.password = "";
        $scope.currentPage = "";
        $scope.loggedIn = false;
        $scope.footer = true;
        $scope.validForm = true;
        $scope.search = "";

        /*route change*/
        $scope.$on('$routeChangeSuccess', function(next, current) {
            if(current === undefined){
                return;
            }
            if(current.$$route){
                $scope.currentPage = current.$$route.originalPath;
            }
            $scope.footer = $scope.currentPage === '/adminLogin' || $scope.currentPage === '/dashboard';
        });

        $scope.signTemplates = ['---'];
        docuSignService.getTemplates().success(function(data){
            $scope.signTemplates = data;
            $scope.signTemplates.unshift({
                id: '---',
                templateId: '---',
                name: '---'
            });
        });

        /*check login state*/
        adminService.login('password').success(function(data){
            if (data && data.loggedIn) {
                $scope.loggedIn = true;
                $location.url('/dashboard');
            }
            else
                $location.url("/adminLogin");
        });

        /*admin login*/
        $scope.loginAdmin = function(password){
            if(password !== '' && password !== undefined){
                adminService.login(password).success(function(data){
                    if (data && data.loggedIn) {
                        $scope.loggedIn = true;
                        $scope.clearAlert();
                        $location.url('/dashboard');
                        $scope.validForm = true;
                    } else {
                        // display error message
                        $scope.setAlert('Failed to log in to admin page.');
                    }
                });
            }else{
                $scope.validForm = false;
            }
        };

        /*go to*/
        $scope.goTo = function(target){
            $location.url(target);
        };
        /*back*/
        $scope.backToDashboard = function(target){
            $scope.search = "";
            $location.url('/dashboard');
        };

    }
]);

/*admin app Settings Ctrl*/
AppControllers.controller('appSettingsCtrl', ['$scope', '$http', '$timeout', 'adminService', 'docuSignService',
    function ($scope, $http, $timeout, adminService, docuSignService) {

        $timeout(function(){
            $('select.styled').selectbox();
        },300);
        window.scrollTo(0, 0);

        /*set select values*/
        /*set reports values*/
        $scope.weekDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        $scope.week = $scope.weekDays[0];
        $scope.hours = ['1','2','3','4','5','6','7','8','9','10','11','12'];
        $scope.selectedHour = $scope.hours[6];
        $scope.amPm = ['AM','PM'];
        $scope.selectedAmPm = 'AM';
        $scope.days=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
        $scope.selectedDay = 7;
        $scope.seconds = 60;

        /*set environment values*/
        $scope.environment = ['Production','Demo'];

        /*get settings data*/
        $scope.settings = {};
        adminService.getSettings().success(function(data) {
            $scope.settings = data;
            if ($scope.settings.auto_signout_time) {
                var parts = $scope.settings.auto_signout_time.split(":");
                $scope.signout_hour = parts[0];
                $scope.signout_minutes = parts[1];
            }
            if ($scope.settings.report_day_time) {
                var parts = $scope.settings.report_day_time.split(/\s+/);
                $scope.report_week = parts[0];
                $scope.report_hour = parts[1];
                if (parts.length>2)
                    $scope.report_ampm = parts[2];
            }
        });

        $scope.updateGeneral = function() {
            var settings = getDirtySettings(['company_name', 'company_location']);
            adminService.updateSettings(settings).success(function(data) {
                //
            });
            
        }

        $scope.updateAutoSignOut = function() {
            var settings = getDirtySettings(['user_timeout', 'auto_signout_enabled']);
            if (isSettingsDirty(['signout_hour', 'signout_minutes'])) {
                settings.auto_signout_time = $scope.signout_hour+':'+$scope.signout_minutes;
            }
            adminService.updateSettings(settings).success(function(data) {
                //
            });
        }
        $scope.updateReport = function() {
            var settings = getDirtySettings(['report_emails', 'report_num_days']);
            if (isSettingsDirty(['report_week', 'report_hour', 'report_ampm'])) {
                settings.report_day_time = $scope.report_week+' '+$scope.report_hour+' '+$scope.report_ampm;
            }
            adminService.updateSettings(settings).success(function(data) {
                //
            });
        }
        $scope.testDocuSignConnection = function() {
            docuSignService.testConnection($scope.settings).success(function(data) {
                $scope.dsTest = {pass: data};
            });
        }

        $scope.updateDocuSign = function() {
            var settings = getDirtySettings(['ds_env', 'ds_account_name', 'ds_account_password', 'ds_account_key', 'ds_skip_signing']);
            adminService.updateSettings(settings).success(function(data) {
                //
            });
        }

        $scope.updateAdminPassword = function() {
            $scope.currentError = '';
            $scope.newError = '';
            $scope.confirmError = '';

            // check current password
            if (!$scope.current_password) {
                $scope.currentError = 'Current password is required to chagne admin password';
                return;
            }
            var currentHash = CryptoJS.SHA256($scope.current_password).toString();
            if (currentHash !== $scope.settings.admin_password) {
                $scope.currentError = 'Current password does not match';
                return;
            }

            // check new and confirm password
            if (!$scope.new_password) {
                $scope.newError = 'New password is required to chagne admin password';
                return;
            }
            if (!$scope.confirm_password) {
                $scope.confirmError = 'Confirm password is required to chagne admin password';
                return;
            }

            if ($scope.new_password !== $scope.confirm_password) {
                $scope.newError = 'New and confirm password are not same';
                return;
            }
            var newHash = CryptoJS.SHA256($scope.new_password).toString();
            adminService.updateSettings({admin_password: newHash}).success(function(data){
                // 
            });
        }

        $scope.logoMsg = 'There is no logo currently uploaded';
        $scope.showImage = function(input) {
            var logoMsg = '';
            if (input.files && input.files[0]) {
                var file = input.files[0];

                // display logo image
                var reader = new FileReader();
                reader.onload = function (e) {
                    $('#logo').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);

                // check file size
                if (file.type !== 'image/png') {
                   $scope.$apply(function() {
                        $scope.logoMsg = 'Please upload a PNG image file.';
                    });
                } else if (file.size > 1048576) {
                   $scope.$apply(function() {
                        $scope.logoMsg = 'Please upload an image file less than 1MB.';
                    });
                } else {
                    // upload image
                    adminService.updateLogo(file).success(function(data){
                        $scope.logoMsg = 'Uploaded the image successfully, refresh to see new logo.';
                    })
                    .error(function(data){
                        $scope.logoMsg = 'Failed to upload the logo image';
                        // $('#logo').attr('src', 'i/transparent-img.png');
                    });
                }
            }
        }

        // get direty fields from the fields array
        var getDirtySettings = function(fields) {
            var settings = {};
            fields.forEach(function(field) {
                if ($scope.settingForm[field].$dirty) {
                    settings[field] = $scope.settings[field];
                }
            });
            return settings;
        }

        var isSettingsDirty = function(fields) {
            for(var i=0; i<fields.length; i++) {
                if ($scope.settingForm[fields[i]].$dirty) {
                    return true;
                }
            };
            return false;
        }
    }
]);

/*admin log History Ctrl*/
AppControllers.controller('logHistoryCtrl', ['$scope', '$http', '$timeout','$filter', 'ngTableParams', 'adminService',
    function ($scope, $http, $timeout, $filter, ngTableParams, adminService) {

        /*pagination options*/
        $scope.options = ['5','10', '20', 'All'];
        $scope.selection = $scope.options[1];
        $timeout(function(){
            $('select.styled').selectbox();
        },100);

        /*load log history*/
        adminService.getLogHistory().success(function(data) {
            // order by id in reverse order
            $scope.originalLogHistory = $filter('orderBy')(data, 'id', true);
            $scope.logHistory = $scope.originalLogHistory;

            $scope.tableParams = new ngTableParams({
                page: 1,            // show first page
                count: parseInt($scope.selection)           // count per page
            }, {
                total: $scope.logHistory.length, // length of data
                getData: function($defer, params) {
                    $defer.resolve($scope.logHistory.slice((params.page() - 1) * params.count(), params.page() * params.count()));

                }
            });

            // ng-table can filter only one field. To filter all fields, use algularjs filter by watching search keyword.
            // wait 0.5 sec for ng-table is initialized.
            $timeout(function() {
                $scope.$watch('search', function() {
                    // filter the original data by search, reload table
                    $scope.logHistory = $filter('filter')($scope.originalLogHistory, $scope.search);
                    $scope.tableParams.reload();
                });
            }, 500);
        });

        /*changeCount*/
        $scope.changeCount = function(count){
            if(count ==='All'){
                $scope.tableParams.$params.count= 10000;
            }else{
                $scope.tableParams.$params.count= count;
            }
            $scope.tableParams.$params.page= 1;
            $scope.tableParams.reload();
        };

        /*sign out*/
        $scope.signOut = function(user){
            adminService.manualSignout(user.id).success(function(data){
                // signout date is returned
                user.signOutTime = data;
            });
            
        }
    }
]);

/*admin visit reason Ctrl*/
AppControllers.controller('visitReasonCtrl', ['$scope', '$http', '$timeout','$filter', 'ngTableParams', 'adminService', 
    function ($scope, $http, $timeout, $filter, ngTableParams, adminService) {

        /*pagination options*/
        $scope.options = ['5','10', '20', 'All'];
        $scope.selection = $scope.options[1];
        $timeout(function(){
            $('select.styled').selectbox();
        },300);

        /*load templates and reasons*/
        adminService.getReasons().success(function(data) {
            $scope.originalVisitReasons = data;

            // set 0 for non-existing show_* values
            $scope.originalVisitReasons.forEach(function(reason){
                if (!reason.show_company)
                    reason.show_company = 0;
                if (!reason.show_host)
                    reason.show_host = 0;
                if (!reason.show_badge)
                    reason.show_badge = 0;
                reason.templates = $scope.signTemplates;
            });
            $scope.visitReasons = $scope.originalVisitReasons;
            $scope.drawTable();
        });


        /*changeCount*/
        $scope.changeCount = function(count){
            if(count ==='All'){
                $scope.tableParams.$params.count= 10000;
            }else{
                $scope.tableParams.$params.count= parseInt(count);
            }
            $scope.tableParams.$params.page= 1;
            $scope.tableParams.reload();
        };

        /*add reason*/
        $scope.addNewReason = function() {
            // add an empty reason with next row_id
            var lastReason = $scope.originalVisitReasons[$scope.originalVisitReasons.length-1];
            var nextId = lastReason.id + 1;
            adminService.editReason(null, 'add').success(function(data){
                // it returns newly created reason
                $scope.originalVisitReasons.push(data);
                $scope.visitReasons.push(data);
                $scope.tableParams.reload();
            });
        }

        $scope.updateReason = function(reason, column){
            adminService.editReason(reason.id, 'update', column, reason[column]).success(function(data){
                //
            });
        }

        $scope.templateSelected = function(reason) {
            var column = 'template_guid';
            console.log('templateSelected: reason: '+JSON.stringify(reason));
            adminService.editReason(reason.id, 'update', column, reason[column]).success(function(data){
                //
            });
        }


        /*delete reason*/
        $scope.deleteReason = function(reason){
            adminService.editReason(reason.id, 'delete').success(function(data){
                var index = $scope.originalVisitReasons.indexOf(reason);
                $scope.originalVisitReasons.splice(index, 1);
                index = $scope.visitReasons.indexOf(reason);
                $scope.visitReasons.splice(index, 1);
                $scope.tableParams.total($scope.visitReasons.length);
                $scope.tableParams.reload();
            });

        };

        /*draw reason table*/
        $scope.drawTable = function(){

            $scope.tableParams = new ngTableParams({
                page: 1,            // show first page
                count: parseInt($scope.selection)           // count per page
            }, {
                total: $scope.visitReasons.length, // length of data
                getData: function($defer, params) {
                    $defer.resolve($scope.visitReasons.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });

            // ng-table can filter only one field. To filter all fields, use algularjs filter by watching search keyword.
            // wait 0.5 sec for ng-table is initialized.
            $timeout(function() {
                $scope.$watch('search', function() {
                    // filter the original data by search, reload table
                    $scope.visitReasons = $filter('filter')($scope.originalVisitReasons, $scope.search);
                    $scope.tableParams.reload();
                });
            }, 500);
        }
    }
]);

/*admin host Ctrl*/
AppControllers.controller('hostCtrl', ['$scope', '$http', '$timeout','$filter', 'ngTableParams', 'adminService',
    function ($scope, $http, $timeout, $filter, ngTableParams, adminService) {

        /*pagination options*/
        $scope.options = ['5','10', '20', 'All'];
        $scope.selection = $scope.options[1];
        $timeout(function(){
            $('select.styled').selectbox();
        },100);

        /*load log history*/
        adminService.getHosts().success(function(data) {
            $scope.originalHosts = data;
            $scope.hosts = data;
            $scope.drawTable();
        });

        /*changeCount*/
        $scope.changeCount = function(count){
            if(count ==='All'){
                $scope.tableParams.$params.count= 10000;
            }else{
                $scope.tableParams.$params.count= count;
            }
            $scope.tableParams.$params.page= 1;
            $scope.tableParams.reload();
        };

        $scope.updateHost = function(input) {
            if (input.files && input.files[0]) {
                adminService.updateHosts(input.files[0]).success(function(data){
                    adminService.getHosts().success(function(data) {
                        $scope.originalHosts = data;
                        $scope.hosts = data;
                        $scope.tableParams.reload();
                    });
                });
            }
        }

        /*sign out*/
        $scope.delete = function(user){
            var index = $scope.hosts.indexOf(user);
            $scope.hosts.splice(index, 1);
            $scope.tableParams.reload();
        };

        /*draw reason table*/
        $scope.drawTable = function(){

            $scope.tableParams = new ngTableParams({
                page: 1,            // show first page
                count: parseInt($scope.selection)           // count per page
            }, {
                total: $scope.hosts.length, // length of data
                getData: function($defer, params) {
                    $defer.resolve($scope.hosts.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });

            // ng-table can filter only one field. To filter all fields, use algularjs filter by watching search keyword.
            // wait 0.5 sec for ng-table is initialized.
            $timeout(function() {
                $scope.$watch('search', function() {
                    // filter the original data by search, reload table
                    $scope.hosts = $filter('filter')($scope.originalHosts, $scope.search);
                    $scope.tableParams.reload();
                });
            }, 500);
        }
    }
]);

