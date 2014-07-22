/*
 * directive module
 */
angular.module('App.directives', [])

/*enter press*/
.directive('templateEdit', [function () {
    console.log('templateEdit -----------------------');
    return {
        restrict: 'A',
        // link: function(scope, element, attrs) {
        //     console.log('templateEdit link -----------------------');
        // }
        template: '<select ng-options="tpl.name for tpl in templates">/<select>'
    }
}])
/*enter press*/
.directive('myEnter', [function () {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    var func = scope.$eval(attrs.myEnter);
                    func();
                });
                event.preventDefault();
            }
        });
    };
}])
/*numeric*/
.directive('validNumber', [function() {
    return {
        require: '?ngModel',
        link: function(scope, element, attrs, ngModelCtrl) {
            if(!ngModelCtrl) {
                return;
            }
            ngModelCtrl.maxVal=$(element).data('max');
            ngModelCtrl.$parsers.push(function(val) {
                var clean = val.replace( /[^0-9]+/g, '');
                if(parseInt(clean) > ngModelCtrl.maxVal){
                    clean =ngModelCtrl.maxVal+'';
                }
                if (val !== clean) {
                    ngModelCtrl.$setViewValue(clean);
                    ngModelCtrl.$render();
                }
                return clean;
            });

            element.bind('keypress', function(event) {
                if(event.keyCode === 32) {
                    event.preventDefault();
                }
            });
        }
    };
}])
// set the fise of signing iframe
.directive('iframeSize', [function() {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.width($(window).width()*0.90);
            element.height($(window).height()*0.95);
        }
    }
}])
// set auto focus
.directive('autoFocus', [function(){
    return {
        restrict: 'A',
        link: {
            post: function postLink($scope, element, attrs) {
                element.focus();
            }
        }
    };
}])
// simple autocomplete with jQuery ui
.directive('autoComplete', ['$timeout', function($timeout) {
    return function(scope, element, attrs) {
        element.autocomplete({
            // minLength: 2,
            source: scope[attrs.uiItems],
            select: function() {
                $timeout(function() {
                  element.trigger('input');
                }, 0);
            }
        });
    };
}])
// auto fill sync
.directive('autoFillSync', function($timeout) {
   return {
      require: 'ngModel',
      link: function(scope, elem, attrs, ngModel) {
          var origVal = elem.val();
          $timeout(function () {
              var newVal = elem.val();
              if(ngModel.$pristine && origVal !== newVal) {
                  ngModel.$setViewValue(newVal);
              }
          }, 100);
      }
   }
});
