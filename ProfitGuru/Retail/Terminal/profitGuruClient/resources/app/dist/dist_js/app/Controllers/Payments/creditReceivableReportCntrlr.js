(function () {
    'use strict';
    angular.module("profitGuru").controller("creditReceivableReportCntrlr", ['$scope', '$rootScope', '$timeout', '$state', 'paymentsControllerCommonSvc', 'reportDataSvc', 'navHandler', creditReceivableReportCntrlr]);

    function creditReceivableReportCntrlr($scope, $rootScope, $timeout, $state, paymentsControllerCommonSvc, reportDataSvc, navHandler) {
        paymentsControllerCommonSvc.getPaymentsCommonFunction($scope);
        var thisScope = {};
        reportDataSvc.reportCommonFunction($scope, thisScope);

        $scope.$on("$ionicView.beforeLeave", function (event, data) {
            if ($rootScope.isAddCustomer2Payment || $rootScope.isAddSupplier2Payment) {
                $rootScope.callBackState = $rootScope.previousState;
            } else {
                $rootScope.callBackState = 'app.permitted_modules';
            }
        });

        $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
            $rootScope.currentState = $state.current.name;
            viewData.enableBack = true;
        });

        $scope.$on('$ionicView.enter', function (e) {
            $timeout(function () {
                showHeader();
            }, 100);

            function showHeader() {
                // Having the nav-bar in your template, set an ID to it.
                var header = document.getElementById("header_id");
                if (header.classList) {
                    if (header.classList.contains('hide')) {
                        header.classList.remove('hide');
                    }
                }
            }
        });


        
        $scope.paymentResp = paymentsControllerCommonSvc.paymentResp;
        $scope.currentView = paymentsControllerCommonSvc.currentView;
        $scope.payingAmount = $scope.amount_due = paymentsControllerCommonSvc.payingAmount;
        $scope.paymentOptions = {};
        for (var i = 0; i < $rootScope.mergedConfigurationsData.paymentTerms.value.length; i++) {
            $scope.paymentOptions[$rootScope.mergedConfigurationsData.paymentTerms.value[i]] = $rootScope.mergedConfigurationsData.paymentTerms.value[i];
        }
        $scope.payment_type = $rootScope.mergedConfigurationsData.defaultPaymantTerms.defaultPayTerm;
        $scope.creditReportHeader = paymentsControllerCommonSvc.creditReportHeader;
        $scope.allCreditDetails = angular.copy(paymentsControllerCommonSvc.allCreditDetails);
        $scope.allPaidCreditDetails = angular.copy(paymentsControllerCommonSvc.allPaidCreditDetails);

        $scope.viewCreditPaymentDetailsByCustomer= function(customerId,customerDetails){
            $rootScope.isViewPayment = true;
            paymentsControllerCommonSvc.set2ShowCustomerCreditDetails(customerId, customerDetails,$scope);
            navHandler.popAndPush('app.paymentsView');
        }

        delete $scope.allCreditDetails.start_date;
        delete $scope.allCreditDetails.end_date;
        delete $scope.allPaidCreditDetails.start_date;
        delete $scope.allPaidCreditDetails.end_date;

        $scope.reportTitle = paymentsControllerCommonSvc.reportTitle;
        $scope.personType = paymentsControllerCommonSvc.currentView.title;
        $scope.creditSearchObj = {};
        $scope.creditSearchObj.creditSearch = "";
        $scope.updateSearchVar = function (searchText) {
            $scope.creditSearchObj.creditSearch = searchText;
        }
        $scope.clearCreditSearch = function () {
            $scope.creditSearchObj.creditSearch = "";
        }
        $scope.paymentNotificationType = paymentsControllerCommonSvc.paymentNotificationType;
        $scope.creditsSelectionFilter = paymentsControllerCommonSvc.creditsSelectionFilter;
        $scope.creditsSelectionFilterValue = ""
        $scope.filteredDetails = [];
        $scope.creditsSelectionFilterModel = paymentsControllerCommonSvc.creditsSelectionFilter["All"];
        $scope.setCreditsSelectionFiltervalue = function (creditsSelectionFilterModel) {
            $scope.filteredDetails = [];
            if (creditsSelectionFilterModel == "All") {
                for (var x in $scope.allCreditDetails) {
                    $scope.filteredDetails.push($scope.allCreditDetails[x]);
                }
                return;
            }

            if (creditsSelectionFilterModel == "Crossed due Date") {
                for (var x in $scope.allCreditDetails) {
                    if ($scope.allCreditDetails[x].overDueDateAmt > 0) {
                        $scope.filteredDetails.push($scope.allCreditDetails[x]);
                    }
                }
                return;
            }
            if (creditsSelectionFilterModel == "Near due Date") {
                for (var x in $scope.allCreditDetails) {
                    if ($scope.allCreditDetails[x].nearDueDateAmt > 0) {
                        $scope.filteredDetails.push($scope.allCreditDetails[x]);
                    }
                }
                return;
            }


        }
        $scope.setCreditsSelectionFiltervalue(paymentsControllerCommonSvc.creditsSelectionFilter["All"]);

        $rootScope.$ionicGoBack = function () {
            navHandler.pop();
        };


    }
})();