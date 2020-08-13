var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */
(function () {
    'use strict';
    angular.module('profitGuru').controller('CustomersCntrlr', ['$stateParams', 'commonControllerValidationSvc', 'GOBACK', 'customerControllerCommonSvc', '$ionicSideMenuDelegate', '$scope', '$rootScope', '$filter', '$ionicModal', '$ionicPopup', '$ionicPopover', '$ionicLoading', '$window', '$timeout', '$state', '$http', '$interval', 'APPCONFIG', 'customerDataSvc', 'exportImportDataSvc', 'customersServerApis', 'salesServerApis', 'paymentsControllerCommonSvc', 'COMMONFUNC', 'hotKeyCommonFunc', 'salesQuerySvc', 'campaignSvc', 'tallyServerApis', 'settingsDataSvc', 'gstUtils', 'navHandler', 'dataSetGetSvc', 'alienCommonSvc', 'paymentsQuerySvc', CustomersCntrlr]);
    function CustomersCntrlr($stateParams, commonControllerValidationSvc, GOBACK, customerControllerCommonSvc, $ionicSideMenuDelegate, $scope, $rootScope, $filter, $ionicModal, $ionicPopup, $ionicPopover, $ionicLoading, $window, $timeout, $state, $http, $interval, APPCONFIG, customerDataSvc, exportImportDataSvc, customersServerApis, salesServerApis, paymentsControllerCommonSvc, COMMONFUNC, hotKeyCommonFunc, salesQuerySvc, campaignSvc, tallyServerApis, settingsDataSvc, gstUtils, navHandler, dataSetGetSvc, alienCommonSvc, paymentsQuerySvc) {
        $ionicSideMenuDelegate.canDragContent(true);
        $scope.tempTag = {
            "value": ""
        };
        //load common Apis
        $scope.importParams = {};
        var commonUtils = {};
        $scope.customeVars = {
            deleteCustomField: false,
            editCustomField: false,
            lablename: ''
        };
        $scope.customeVars.typeOption = ["Text", 'Number'];
        commonControllerValidationSvc.loadScopeWithCommonValidationApis($scope, commonUtils);
        $scope.customerTags = campaignSvc.getCustomerTags();
        $scope.mergedConfigurationsData = $rootScope.mergedConfigurationsData;
        var CREATE_MODAL_INSTANCE = commonUtils.createModalInstance;
        var REMOVE_MODAL = commonControllerValidationSvc.removeModal;
        var commonFoo = {};
        if ($stateParams.from) {
            $scope.goBackTo = $stateParams.from;
        }
        $scope.goBack = function () {
            var restaurantState = COMMONFUNC.getRestRefinementState();
            // $scope.serverSalesDataClone.salesData
            if (restaurantState === "ORDERDETAIL") {
                COMMONFUNC.setRestRefinementState();
                $rootScope.takeOrderCartInfo = true;
                $rootScope.clearCartB4Enter = true;
            }
            navHandler.goBack();
        };
        function showCustomerDetailsPO(customerId) {
            const customerDetails = customerDataSvc.getCustomerById(customerId);
            $scope.showCustomerDetails(customerDetails);
        }
        customerControllerCommonSvc.loadApis($scope, commonFoo);
        commonFoo.resetAddCustomerLink();
        COMMONFUNC.itemDisplayFunc($scope);
        $scope.state = $rootScope.STATE.CREATE;
        function callRenderApply() {
            COMMONFUNC.renderApply($scope);
        }
        $scope.$on('$ionicView.enter', function () {
            customerDataSvc.registerForRenderApply('customer', callRenderApply);
            if ($rootScope.previousState === 'app.purchaseOrders') {
                const customerId = dataSetGetSvc.customerId.get();
                if (customerId) {
                    showCustomerDetailsPO(customerId);
                }
            }
            $scope.currentState = $rootScope.currentState;
            if ($rootScope.isLoggedIn === undefined || $rootScope.isLoggedIn === false) {
                navHandler.setRootAndGo('app.login');
            }
            else {
                $rootScope.salesScreen = false;
                initCustmerCntrlr();
            }
        });
        $scope.$on('$ionicView.beforeLeave', function (event, viewData) {
            customerDataSvc.unregisterRenderApply('customer');
            $scope.popoverMainScreen.hide();
            if ($rootScope.previousState) {
            }
            $scope.isTempCustValue = false;
            COMMONFUNC.setCustomerValue(false);
            COMMONFUNC.setOrderId(null);
        });
        // $scope.hotkeysListener = function (event) {
        //   var isLocalEvent = hotKeyCommonFunc.elementKeyEvent(event, $scope);
        //   if (isLocalEvent) return;
        // }
        var cheatsheet = [{
                key: 'Escape (Esc)',
                function: 'Cancel / Reset Focus'
            }, {
                key: 'Enter',
                function: 'Done'
            }, {
                key: 'Tab',
                function: 'Move Forward'
            }, {
                key: 'Shift + Tab',
                function: 'Move Backward'
            }, {
                key: 'Ctrl + Backspace',
                function: 'Go to Back Screen'
            }, {
                key: 'Ctrl + M',
                function: 'Side Menu'
            }, {
                key: 'Ctrl + Plus',
                function: 'Add New Item'
            }, {
                key: 'Ctrl + ArrowRight',
                function: 'Next Page'
            }, {
                key: 'Ctrl + ArrowLeft',
                function: 'Previous Page'
            }, {
                key: 'Ctrl + E',
                function: 'Edit Item'
            }, {
                key: 'Ctrl + D',
                function: 'Delete Item'
            }];
        $scope.hotkeysListener = function (event) {
            var KEY = hotKeyCommonFunc.get(event);
            var resp = hotKeyCommonFunc.elementKeyEvent(event, $scope);
            if (resp)
                return; // local event found
            if (KEY.ctrl && (KEY.key == '/' || KEY.key == '?')) {
                if (cheatsheet)
                    hotKeyCommonFunc.toggleCheatSheet(cheatsheet);
                return;
            }
            else if (KEY.ctrl && (KEY.key == "arrowright")) {
                event.preventDefault();
                $('#nextTabId').click();
            }
            else if (KEY.ctrl && (KEY.key == "arrowleft")) {
                event.preventDefault();
                $('#previousTabId').click();
            }
            else if ((KEY.key == '+' || KEY.key == '=') && KEY.ctrl) {
                event.preventDefault();
                $('#addNewItem').click();
            }
            else if (KEY.ctrl && (KEY.key == "e")) {
                event.preventDefault();
                $('#editItemId').click();
            }
            else if (KEY.ctrl && (KEY.key == "d")) {
                event.preventDefault();
                $('#deleteItemId').click();
            }
            else if ((KEY.key == 'f') && event.ctrlKey) {
                event.preventDefault();
                focusOnFirstCard();
            }
            if (KEY.key == 'escape') {
                if (hotKeyCommonFunc.cheatsheetVisible()) { // hide cheatsheet
                    hotKeyCommonFunc.closeCheatSheet();
                }
                else if (hotKeyCommonFunc.checkIsPopupOn()) {
                    hotKeyCommonFunc.closepopupClicked();
                }
                else {
                    $('#closeCustomerModel').click();
                }
                $scope.popoverMainScreen.hide();
                $('#serchItemEle').focus();
                // write ur logic here
                return;
            }
            else if (KEY.key == 'enter' && !KEY.ctrl) {
                // event.preventDefault();
                if (hotKeyCommonFunc.cheatsheetVisible()) {
                    hotKeyCommonFunc.closeCheatSheet();
                }
                else if (hotKeyCommonFunc.checkIsPopupOn()) {
                    hotKeyCommonFunc.focusOnPopUp(true);
                }
                //  else if (KEY.tag == 'input') {
                //   event.preventDefault();
                // }
                else if (KEY.id == 'addCustomerToCart') {
                    // if ($scope.isAddCustomer2Sale || $scope.isAddCustomer2Payment || $scope.isAddCustomer4Orders || $scope.isTempCustValue) {
                    event.preventDefault();
                    setTimeout(function () {
                        var x = $(event.srcElement).attr('hotkey-index');
                        x = parseInt(x);
                        setTimeout(function () {
                            var y = document.getElementsByClassName('addCustomerToCartClass');
                            if (!$scope.isPopupOpen)
                                hotKeyCommonFunc.trigger(y[x], true);
                        }, 200);
                    }, 0);
                    return;
                }
                // write ur logic here
                else {
                    if (KEY.id == 'previousTabButton') {
                        $scope.focusOnItemInput = false;
                    }
                    if (KEY.id == 'NextTabButton') {
                        $scope.focusOnItemInput = false;
                    }
                    if (KEY.tag != 'select') {
                        event.preventDefault();
                    }
                    hotKeyCommonFunc.trigger(document.activeElement, true);
                }
                return;
            }
            if (hotKeyCommonFunc.cheatsheetVisible() || hotKeyCommonFunc.checkIsPopupOn()) {
                event.preventDefault();
                return;
            }
            else if (KEY.ctrl && (KEY.key == 's')) {
                event.preventDefault();
                console.log("ctrl S called");
                $('#newItemSubmit:enabled').click();
                $('#itemTransactionSearch:enabled').click();
                // write ur logic here
            }
            else if (KEY.ctrl && !KEY.shift && KEY.key == 'r') {
                event.preventDefault();
                // write ur logic here
            }
            else if (KEY.ctrl && KEY.key == 'delete') {
                // event.preventDefault();
                // write ur logic here
            }
            else if (!KEY.ctrl && KEY.key == 'tab' && !KEY.shift) {
                if (KEY.id == 'NextTabButton') {
                    event.preventDefault();
                    $scope.focusOnFirstClass($scope.currentTabFirstInputClass);
                }
                else if (KEY.id == 'itemTransactionSearch') {
                    event.preventDefault();
                    angular.element('.prevClassToFocus').focus();
                }
                else if (KEY.id == 'previousTabButton') {
                    if (!angular.element('#newItemSubmit:enabled').length && !angular.element('#NextTabButton').length) {
                        event.preventDefault();
                        $scope.focusOnFirstClass($scope.currentTabFirstInputClass);
                        return;
                    }
                }
                else if (KEY.id == 'newItemSubmit') {
                    // if (!angular.element('#NextTabButton').length) {
                    //   event.preventDefault();
                    //   $scope.focusOnFirstClass($scope.currentTabFirstInputClass);
                    //   return;
                    // }
                    if (angular.element('#NextTabButton').length) {
                        angular.element('#NextTabButton').focus();
                    }
                    else {
                        $scope.focusOnFirstClass($scope.currentTabFirstInputClass);
                    }
                    event.preventDefault();
                    return;
                }
            }
            else if (KEY.shift && KEY.key == 'tab' && !KEY.ctrl) {
                var x = checkIfFirstClassIsActive($scope.currentTabFirstInputClass);
                if (x) {
                    if (angular.element('#NextTabButton').length) {
                        event.preventDefault();
                        angular.element('.nextClassToFocus').focus();
                    }
                    else if (angular.element('#previousTabButton').length) {
                        event.preventDefault();
                        angular.element('.prevClassToFocus').focus();
                    }
                }
            }
        };
        var checkIfFirstClassIsActive = function (className) {
            var y = document.getElementsByClassName(className);
            if (y) {
                for (var i = 0; i < y.length; i++) {
                    if (!y[i].disabled) {
                        if (y[i] === document.activeElement) {
                            return true;
                        }
                        break;
                    }
                }
            }
        };
        $scope.hotkeysActive = false;
        var page = hotKeyCommonFunc.jqueryFind('body');
        var resp = hotKeyCommonFunc.addEventListener(page[0], $scope.hotkeysListener, $scope).then(function (resp) {
            $scope.hotkeysActive = true;
            console.log(resp);
        }).catch(function (err) {
            $scope.hotkeysActive = false;
            console.log(err);
        });
        $scope.toggelGender = function (value) {
            if (value == '0') {
                $scope.CustomerStruct.gender = "1";
            }
            else {
                $scope.CustomerStruct.gender = "0";
            }
            COMMONFUNC.renderApply($scope);
        };
        $scope.toggleAllowCredit = function (value) {
            if (value) {
                $scope.CustomerStruct.allow_credit = '';
            }
            else {
                $scope.CustomerStruct.allow_credit = 'Allow';
            }
            COMMONFUNC.renderApply($scope);
        };
        $scope.toggleValues = function () {
            if (arguments.length == 2) {
                if (typeof $scope[arguments[0]][arguments[1]] === 'boolean') {
                    $scope[arguments[0]][arguments[1]] = !$scope[arguments[0]][arguments[1]];
                }
                else if (typeof $scope[arguments[0]][arguments[1]] === 'undefined') {
                    $scope[arguments[0]][arguments[1]] = true;
                }
            }
            else if (arguments.length == 3) {
                if (typeof $scope[arguments[0]][arguments[1]][arguments[2]] === 'boolean') {
                    $scope[arguments[0]][arguments[1]][arguments[2]] = !$scope[arguments[0]][arguments[1]][arguments[2]];
                }
                else if (typeof $scope[arguments[0]][arguments[1]][arguments[2]] === 'undefined') {
                    $scope[arguments[0]][arguments[1]][arguments[2]] = true;
                }
            }
            else if (arguments.length == 1) {
                if (typeof $scope[arguments[0]] === 'boolean') {
                    $scope[arguments[0]] = !$scope[arguments[0]];
                }
                else if (typeof $scope[arguments[0]] === 'undefined') {
                    $scope[arguments[0]] = true;
                }
            }
            COMMONFUNC.renderApply($scope);
        };
        $scope.focusToElement = function (selector, event, click) {
            if (event)
                try {
                    event.preventDefault();
                }
                catch (err) {
                    console.log('failed to prevent default of event');
                    console.log(err);
                }
            hotKeyCommonFunc.triggerBySelector(selector, click);
        };
        const focusOnFirstCard = function () {
            var x;
            x = angular.element('#customerList .firstCustomerCard');
            hotKeyCommonFunc.trigger(x[0]);
        };
        $scope.add2Customer2SaleParams = {
            customer_id: ''
        };
        $scope.file = null;
        $scope.importFromTally = function (data) {
            tallyServerApis.importCustomerFromTally(data).then(function (resp) {
                //  $scope.dataConverstionResp = resp;
                $scope.custSaveResultMsgs = resp.data;
                $timeout(function () {
                    $scope.custSaveResultMsgs = false;
                }, 2000);
                $scope.file = null;
                $scope.custTallyImportPage = false;
                modalImp.remove();
            }).catch(function (error) { });
        };
        $scope.tallyXmlFile = undefined;
        function initCustmerCntrlr() {
            if ($rootScope.isAddCustomer2Sale === true) {
                $scope.isAddCustomer2Sale = true;
            }
            else {
                $scope.isAddCustomer2Sale = false;
            }
        }
        $scope.fillPanNumber = function () {
            if ($scope.CustomerStruct.pan_number && $scope.CustomerStruct.pan_number.length > 9) {
                return;
            }
            $scope.CustomerStruct.pan_number = $scope.CustomerStruct.gstin_number ? $scope.CustomerStruct.gstin_number.substr(2, 10) : '';
        };
        $scope.addCustomer2customersLoyality = function (customer_id) {
            $rootScope.giftCustomer_id = customer_id;
            navHandler.pop();
        };
        $scope.addThisCustomer2Orders = function (customer) {
            $rootScope.serverSalesDataClone = {};
            if (customer.loyalty == 1) {
                $rootScope.customerEligible4Loyalty = true;
            }
            else {
                $rootScope.customerEligible4Loyalty = false;
                if ($rootScope.changeCustomerfrmRestaurantCart === true) {
                    $scope.customerNotEligibleAlert();
                }
                else {
                    navHandler.pop();
                    setAllAddToAsFalse();
                }
            }
            $rootScope.currentTableOrder.customer_id = customer.person_id;
            $rootScope.custName4order = customer.first_name + " " + customer.last_name;
            customersServerApis.addCustomer2OrdersApi({
                customer_id: customer.person_id
            }).then(addCustomer2OrderSuccs).catch($scope.handleError);
            $rootScope.serverSalesDataClone.salesData['customer'] = customer.first_name + " " + customer.last_name;
        };
        function addCustomer2OrderSuccs(resp) {
            console.log(resp);
            if ($rootScope.customerEligible4Loyalty === true) {
                setAllAddToAsFalse();
                navHandler.pop();
            }
        }
        $scope.addCustomer4Orders = function (customer) {
            $rootScope.serverSalesDataClone = {};
            if (customer.loyalty == 1) {
                $rootScope.customerEligible4Loyalty = true;
            }
            else {
                $rootScope.customerEligible4Loyalty = false;
            }
            $rootScope.currentTableOrder.customer_id = customer.person_id;
            $rootScope.custName4order = customer.first_name + " " + customer.last_name;
            $rootScope.iscust4orderChanged = true;
            customersServerApis.addCustomer2OrdersApi({
                customer_id: customer.person_id
            }).then(addCustomer4OrderSuccs).catch($scope.handleError);
        };
        var setAllAddToAsFalse = function () {
            $rootScope.isAddCustomer4Orders = false;
            $rootScope.isAddCustomer2Sale = false;
            $rootScope.isAddCustomer2Payment = false;
            $rootScope.callBackState = 'app.permitted_modules';
        };
        $scope.customerNotEligibleAlert = function () {
            var customerNotEligibleAlertPopup = $ionicPopup.confirm({
                title: 'Customer Not Eligible For Loyalty',
                template: 'Not Eligible'
            });
            customerNotEligibleAlertPopup.then(function (res) {
                if (res) {
                    console.log('go back');
                    navHandler.pop();
                    setAllAddToAsFalse();
                    $rootScope.changeCustomerfrmRestaurantCart = false;
                    $rootScope.changeCustfrmRestCart = false;
                }
                else {
                    console.log('cancle');
                }
            });
        };
        function addCustomer4OrderSuccs(resp) {
            console.log(resp);
            navHandler.pop();
            setAllAddToAsFalse();
        }
        $scope.checkpattern = function (phone_number, number) {
            if (phone_number === true) {
                $scope.showErrMsg4ReserveContact = false;
                $scope.previousNumber4ReserveContact = number;
            }
            else {
                if ($scope.previousNumber4ReserveContact.length == 1) {
                    $scope.CustomerStruct.phone_number = '';
                }
                else {
                    $scope.showErrMsg4ReserveContact = true;
                    $scope.CustomerStruct.phone_number = $scope.previousNumber4ReserveContact;
                }
            }
        };
        $scope.addCustomerCheck = function (customer_id, customer) {
            return __awaiter(this, void 0, void 0, function* () {
                customer = yield customerDataSvc.getFullCustomerDoc(customer._id);
                if ($rootScope.isAddCustomer2Sale || $scope.isTempCustValue) {
                    $scope.addCustomer2Sale(customer_id, customer);
                    return;
                }
                if ($rootScope.isAddCustomer2Payment) {
                    $scope.addCustomer2Payments(customer_id, customer);
                    return;
                }
            });
        };
        $scope.addCustomer2Sale = function (customer_id, customer) {
            if ($rootScope.g_paymentType == "Sale on credit") {
                if (!customer.allow_credit) {
                    $scope.showErrorPopUp('Sale on Credit is not allowed for ' + customer.first_name + " " + customer.last_name + '. Please update the credit details and try again. ', "ERROR");
                    return;
                }
            }
            if (customer.loyalty == 1) {
                $rootScope.custEligible4LoyaltySales = true;
            }
            else {
                $rootScope.custEligible4LoyaltySales = false;
            }
            $scope.add2Customer2SaleParams.customer_id = customer_id;
            $rootScope.addCustomerTocustomersLoyality = customer_id;
            if ($rootScope.processOrder) {
                $scope.add2Customer2SaleParams.order_no = $rootScope.currentTableOrder.order_no;
                $scope.add2Customer2SaleParams.table_no = $rootScope.currentTableNo;
                customersServerApis.addCustomer2OrdersApi($scope.add2Customer2SaleParams).then(addCustomer2SaleSuccs).catch($scope.handleError);
            }
            else {
                $scope.add2Customer2SaleParams.doc_id = COMMONFUNC.getOrderId();
                salesServerApis.addCustomer2SaleApi($scope.add2Customer2SaleParams).then(addCustomer2SaleSuccs).catch($scope.handleError);
            }
        };
        function setaddCustomer2TakeOrder(resp) {
            COMMONFUNC.setaddCustomer2TakeOrder(resp);
        }
        ;
        function addCustomer2SaleSuccs(resp) {
            console.log("Add Customer2Sale Success");
            console.log(resp);
            $rootScope.sales_address.state_name = resp.cust_state_name;
            $rootScope.sales_address.pin_code = resp.pincode;
            $rootScope.sales_address.shippingAddress = resp.customer_address;
            $rootScope.custName4order = resp.customer;
            if (COMMONFUNC.getRestRefinementState()) {
                setaddCustomer2TakeOrder(resp);
                navHandler.pop();
            }
            else {
                navHandler.pop();
                setAllAddToAsFalse();
            }
            $rootScope.clearCartB4Enter4TakeAway = false;
            delete $rootScope.wcNameIsDisabled;
            setAllAddToAsFalse();
        }
        $scope.addCustomer2Payments = function (customer_id, customer) {
            $rootScope.isAddCustomer2Payment = false;
            $rootScope.isViewPayment = true;
            paymentsControllerCommonSvc.setCustomerDetails(customer_id, customer);
            navHandler.popAndPush('app.paymentsView');
            // navHandler.pop();
            setAllAddToAsFalse();
        };
        $rootScope.$ionicGoBack = function () {
            navHandler.pop();
            setAllAddToAsFalse();
        };
        $scope.AddCustomer2SaleFrmCart = function (customer_id, customer) {
            if (customer.loyalty == 1) {
                $rootScope.custEligible4LoyaltySales = true;
            }
            else {
                $rootScope.custEligible4LoyaltySales = false;
                if ($rootScope.changeCustomerfrmSalesCart === true) {
                    $scope.customerNotEligibleAlert();
                    $rootScope.changeCustomerfrmSalesCart = false;
                }
                else {
                    navHandler.pop();
                    setAllAddToAsFalse();
                }
            }
            $scope.add2Customer2SaleParams.customer_id = customer_id;
            $rootScope.addCustomerTocustomersLoyality = customer_id;
            salesServerApis.addCustomer2SaleApi($scope.add2Customer2SaleParams).then(AddCustomer2SaleFrmCartSuccs).catch($scope.handleError);
        };
        function AddCustomer2SaleFrmCartSuccs(resp) {
            console.log("Add Customer2Sale Success");
            console.log(resp);
            if ($rootScope.custEligible4LoyaltySales === true) {
                $rootScope.isAddCustomer2Sale = false;
                navHandler.pop();
            }
            $rootScope.clearCartB4Enter4TakeAway = false;
        }
        $scope.setcustfalse = function () {
            $scope.customerdataloaded = false;
        };
        $scope.deleteCustomer = function (PersonId) {
            $scope.deleteCustomerJson.person_id = PersonId;
            customerDataSvc.deleteCustomer($scope.deleteCustomerJson).then(CustomerDeleteSuccess).catch($scope.handleError);
        };
        function CustomerDeleteSuccess(respCustomers) {
            console.log("CustomerDeleteSuccess");
            $scope.CustDelmessage = respCustomers.message;
            $scope.CustDelMsg = JSON.stringify($scope.CustDelmessage);
            console.log("result is " + JSON.stringify($scope.CustDelmessage));
            $timeout(function () {
                $scope.CustDelMsg = false;
            }, 2000);
            modalNewCust.remove();
            navHandler.popAndPush('app.customers', {
                reload: true
            });
        }
        $scope.confirmCustomerDelete = function (deletePersonId, isCredit) {
            if (isCredit == 0 || angular.isUndefined(isCredit)) {
                if (deletePersonId) {
                    var confirmPopup = $ionicPopup.confirm({
                        title: 'DELETE',
                        template: 'Are you sure you want to delete this Customer name and details?'
                    });
                    confirmPopup.then(function (res) {
                        if (res) {
                            console.log('You are sure');
                            $scope.deleteCustomer(deletePersonId);
                        }
                        else {
                            console.log('You are not sure');
                        }
                    });
                }
                else {
                    console.log('Error :undefined deletePersonId ');
                }
            }
            else {
                console.log('the custemer having credit balance');
                var confirmPopup = $ionicPopup.confirm({
                    title: 'Warning',
                    template: 'This customer is having credit balance'
                });
            }
        };
        $ionicPopover.fromTemplateUrl('Customers/customerPopOver.html', {
            scope: $scope,
            controller: 'CustomersCntrlr'
        }).then(function (popover) {
            $scope.popover = popover;
        });
        $ionicPopover.fromTemplateUrl('Customers/customerMainScreenPopOver.html', {
            scope: $scope,
            controller: 'CustomersCntrlr'
        }).then(function (popover) {
            $scope.popoverMainScreen = popover;
        });
        $scope.focusOnPopoverMainScreen = function (event) {
            $scope.popoverMainScreen.show(event);
            setTimeout(function () {
                angular.element('.itemSettingsPopFirstCard').focus();
                // var target = angular.element(document).find('#itemSettingsPopFirstCard');
            }, 400);
        };
        function isObject(value) {
            return value && typeof value === 'object' && value.constructor === Object;
        }
        ;
        $scope.changeCustState = function (gstin_number) {
            if (!gstin_number || gstin_number.length != 15)
                return;
            var stateObj = gstUtils.validateGSTIN(gstin_number);
            if (isObject(stateObj) && stateObj.state) {
                if (!$scope.CustomerStruct.state_name)
                    $scope.CustomerStruct.state_name = stateObj.state;
            }
        };
        //filter by invoice id
        $scope.searchByTypeFilter = {};
        $scope.searchType = function (value) {
            $scope.searchByTypeFilter = {
                sales_info: {
                    num: value
                }
            };
        };
        function handleArrayQuantity(resetContainer) {
            if (resetContainer)
                $scope.salesInfo.main = [];
            var i = $scope.salesInfo.main.length;
            var n = $scope.salesInfo.parent.length;
            var o = (i + 10) < n ? i + 10 : n;
            for (var ctr = i; ctr < o; ctr++) {
                let saleTS = $scope.salesInfo.parent[ctr].sales_info ? $scope.salesInfo.parent[ctr].sales_info.sale_time : $scope.salesInfo.parent[ctr].info.time;
                $scope.salesInfo.parent[ctr].formatSaleDateTime = moment(saleTS).format($rootScope.mergedConfigurationsData.dateTime.dateformat +
                    ' ' + $rootScope.mergedConfigurationsData.dateTime.timeformat);
                $scope.salesInfo.main.push($scope.salesInfo.parent[ctr]);
            }
            if ($scope.salesInfo.main.length > 10) {
                $scope.showUp = true;
            }
        }
        ;
        $scope.summary = {
            quantity: 0,
            total: 0,
            pending: 0,
            count: 0
        };
        var firstRun = 1;
        $scope.myPagingFunction = function () {
            console.log('i am here.');
            firstRun += 1;
            handleArrayQuantity(undefined);
        };
        $scope.goTop = function () {
            $("#customerDetails")[0].scrollIntoView();
            // $scope.showUp = false;
        };
        $scope.getDefaultDate = function () {
            $scope.tempDate = {
                endDate: new Date(moment().format()),
                startDate: new Date(moment().subtract(1, 'month').format()),
            };
            $scope.dateChangeHandler();
        };
        $scope.dateChangeHandler = function () {
            $scope.tempDate.isCorrect = isDateGreater($scope.tempDate.startDate, $scope.tempDate.endDate);
        };
        function isDateGreater(startDate, endDate) {
            var a = moment(startDate);
            var b = moment(endDate);
            return b >= a;
        }
        function calculateTotals(salesInfo) {
            var summary = {
                quantity: 0,
                total: 0,
                pending: 0,
                count: salesInfo.length
            };
            for (var i = 0; i < salesInfo.length; i++) {
                summary.quantity += salesInfo[i].sale_items ? salesInfo[i].sale_items.length : salesInfo[i].items.length;
                summary.total += salesInfo[i].sales_info ? salesInfo[i].sales_info.total : salesInfo[i].info.total;
                summary.pending += salesInfo[i].sales_info ? salesInfo[i].sales_info.pending_amount : 0;
            }
            $scope.summary = summary;
        }
        $scope.goTop = function () {
            $("#customerDetails")[0].scrollIntoView();
            // $scope.showUp = false;
        };
        //Modals
        var modalNewCust;
        var oldAlienIdString = '';
        $scope.fillCustomerInfoIfNotGiven = function (obj) {
            alienCommonSvc.getNickNameOfAlienUser(obj.alienId).then(function (nickName) {
                if (nickName) {
                    obj.nickName = nickName;
                }
            }).catch(function (err) {
                console.error(err);
            });
            return;
            var alienId = obj.alienId ? obj.alienId : '';
            var paramsToFill = ['first_name', 'last_name', 'phone_number'];
            var deletingKeys = false;
            if (oldAlienIdString.length > alienId.length)
                deletingKeys = true;
            oldAlienIdString = alienId;
            for (var i = 0; i < paramsToFill.length; i++) {
                var thisParam = paramsToFill[i];
                var key1 = alienId;
                var key2 = obj[thisParam];
                if (deletingKeys) {
                    key2 = alienId;
                    key1 = obj[thisParam];
                }
                if (!obj[thisParam] || bKey1IncludesKey2(key1, key2, true)) {
                    obj[thisParam] = alienId;
                }
            }
        };
        const bKey1IncludesKey2 = function (key1, key2, bCheckLength) {
            var bLengthValid = bCheckLength ? (key1.length) === (key2.length + 1) : true;
            return (key1.indexOf(key2) === 0 && bLengthValid);
        };
        $scope.gotoCustSetting = function () {
            navHandler.push("app.customerSetting");
        };
        $scope.deleteFieldFromCust = function (index) {
            $scope.CustomerStruct.CustomInput.splice(index, 1);
        };
        $scope.gotoCustomer = function () {
            // navHandler.push('app.customers');
            navHandler.pop();
        };
        $scope.addFieldsToCust = function (data) {
            if (!$scope.CustomerStruct.CustomInput) {
                $scope.CustomerStruct.CustomInput = [];
            }
            if (checkIfExist(data.label, $scope.CustomerStruct.CustomInput)) {
                return;
            }
            else {
                var temp = {};
                temp = {
                    label: data.label,
                    order: data.order,
                    type: data.type,
                };
                temp.value = data.type.toLowerCase() == 'text' ? "" : 0;
                $scope.CustomerStruct.CustomInput.push(temp);
            }
        };
        $scope.addCustomFields = function (label, type, order) {
            type = type ? type : "text";
            order = order ? order : 0;
            var temp = {};
            temp = {
                label: label,
                order: order,
                type: type
            };
            $scope.mergedConfigurationsData.CustomInput.push(temp);
            $scope.customeVars.lablename = '';
        };
        function checkIfExist(label, data) {
            var temp = false;
            for (var i = 0; i < data.length; i++) {
                if (data[i].label === label) {
                    temp = true;
                }
            }
            return temp;
        }
        ;
        var lableDeleteMsg = '';
        $scope.deleteCustomField = function (index) {
            $scope.customeVars.index = index;
            lableDeleteMsg = 'Lable deleted successfully';
            var msg = "Are You sure want to delete" + ' ' + $scope.mergedConfigurationsData.CustomInput[index].label;
            $scope.confirmPopup(msg, "Alert!", $scope.deleteCustomFieldCnf);
        };
        $scope.deleteCustomFieldCnf = function () {
            $scope.mergedConfigurationsData.CustomInput.splice($scope.customeVars.index, 1);
            settingsDataSvc.updateSettings($scope.mergedConfigurationsData).then(updateProfileSuccess).catch($scope.handleError);
            delete $scope.customeVars.index;
        };
        // $scope.getobjectname = function (data) {
        //   return Object.keys(data)[0];
        // }
        $scope.updateApplicationSettings = function (updateConfigData) {
            $scope.customeVars.deleteCustomField = false;
            $scope.customeVars.editCustomField = false;
            settingsDataSvc.updateSettings(updateConfigData).then(updateProfileSuccess).catch($scope.handleError);
        };
        var updateProfileSuccess = function (resp) {
            if (lableDeleteMsg) {
                var msg = lableDeleteMsg;
                lableDeleteMsg = '';
            }
            else {
                var msg = "Successfully Updated Customer Settings";
            }
            $scope.showFlashMessage(msg, true, 5000);
        };
        $scope.handleError = function (errMsg) {
            var msg = "Error Msg : " + errMsg;
            $scope.showFlashMessage(msg, true, 5000);
        };
        function createNewCustomermodalInstance() {
            if ($scope.bModalIsNotOpen(modalNewCust)) {
                CREATE_MODAL_INSTANCE('Customers/newCustomer.html', 'CustomersCntrlr', $scope).then(function (modal) {
                    modalNewCust = modal;
                });
            }
        }
        $scope.gotoLoyalty = function () {
            navHandler.push('app.loyalty');
        };
        $scope.openModal = function () {
            $scope.elementAddCall = false;
            $scope.CustomerStruct = angular.copy($scope.newCustmrStructConst);
            $scope.CustomerStruct.CustomInput = [];
            $scope.CustomerStruct.tags = [];
            $scope.CustomerStruct.gender = "0";
            //to open the default tab in the customer new item modal     
            $scope.customerModalState = 'New Customer';
            $scope.currentState = $rootScope.STATE.CREATE;
            $scope.isDisabled = false;
            $scope.showBasicDetails();
            $scope.numberExistMessage = '';
            //modalNewCust.show();
            createNewCustomermodalInstance();
        };
        $scope.closeModal = function () {
            // $scope.CustomerStruct = angular.copy(newCustmrStructConst);
            REMOVE_MODAL(modalNewCust);
            oldAlienIdString = '';
            $scope.CustomerStruct.CustomInput = [];
            if ($rootScope.previousState === 'app.purchaseOrders') {
                dataSetGetSvc.customerId.set(undefined);
                navHandler.pop();
            }
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            REMOVE_MODAL(modalNewCust);
            oldAlienIdString = '';
            //$scope.modal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modalNewCust.hidden', function () {
            $scope.CustomerStruct = {};
            $scope.elementAddCall = false;
        });
        // Execute action on remove modal
        $scope.$on('modalNewCust.removed', function () {
            // Execute action
            $scope.CustomerStruct = {};
            $scope.elementAddCall = false;
            // createNewCustomermodalInstance();
        });
        //$scope.ItemList = $scope.getItemsApi.get({q:''}); 
        $scope.showCustomerDetails = function (myCustomer) {
            return __awaiter(this, void 0, void 0, function* () {
                myCustomer = yield customerDataSvc.getFullCustomerDoc(myCustomer._id);
                //Drayan, Credit_balance from customer jsons is seen miss matching with the one fethced from views as in credit Payments
                // so using the one from views which seems to be correct
                // TODO!! !!IMPORTANT!! Looks like the job updating credit_balance is the cause of error
                paymentsQuerySvc.getPendingPaymentsByCustomer(myCustomer.person_id).then(function (creditResp) {
                    myCustomer.credit_balance = creditResp.pendingAmount ? creditResp.pendingAmount : 0;
                    myCustomer.credit_balance = parseFloat(myCustomer.credit_balance.toFixed($rootScope.mergedConfigurationsData.numberFormat.decimalDigits));
                    $scope.elementAddCall = false;
                    $scope.CustomerStruct = angular.copy(myCustomer);
                    $scope.CustomerStruct.tags = $scope.CustomerStruct.tags || [];
                    //we need a back up when we go from edit to details, 
                    //so we need a back up of original data to copy again to the CustomerStruct.
                    $scope.CustomerStructBackUp = angular.copy(myCustomer);
                    $scope.currentState = $rootScope.STATE.VIEW;
                    $scope.customerModalState = 'Details of ' + $scope.CustomerStruct.first_name;
                    $scope.CustomerStruct = $scope.dateConvertion($scope.CustomerStruct);
                    $scope.isDisabled = true;
                    $scope.showBasicDetails();
                    $scope.numberExistMessage = '';
                    // modalNewCust.show();
                    createNewCustomermodalInstance();
                }).catch(function (error) {
                    console.error('Error:getPendingPaymentsByCustomer');
                });
            });
        };
        $scope.closeCustomerDetails = function () {
            //$scope.custSaveResultMsgs = false;
            REMOVE_MODAL(modalNewCust);
            $scope.myCustomer = {};
            oldAlienIdString = '';
        };
        var modalImp;
        function createImportModalInstance() {
            if ($scope.bModalIsNotOpen(modalImp)) {
                CREATE_MODAL_INSTANCE('Common/importCsv.html', 'CustomersCntrlr', $scope).then(function (modal) {
                    modalImp = modal;
                });
            }
        }
        $scope.importCustomer = function (isTallyImport) {
            if (isTallyImport) {
                $scope.custTallyImportPage = true;
            }
            createImportModalInstance();
        };
        $scope.closeImportModal = function () {
            REMOVE_MODAL(modalImp);
            $scope.ImportCustomerMessages = [];
            $scope.custTallyImportPage = false;
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            REMOVE_MODAL(modalImp);
        });
        // Execute action on hide modal
        $scope.$on('modalImp.hidden', function () {
            // Execute action
            $scope.ImportCustomerMessages = [];
        });
        // Execute action on remove modal
        $scope.$on('modalImp.removed', function () {
            // Execute action
            $scope.numberExistMessage = '';
            $scope.ImportCustomerMessages = [];
            // createImportModalInstance();
        });
        $scope.uploadFile2 = function (file2Import) {
            var importUrl = 'customers/importCustomerRestApi/';
            console.log("$scope.sendWelSMS is : " + $scope.importParams.sendWelSMS);
            exportImportDataSvc.uploadFile(file2Import, importUrl, $scope.importParams).then(function (resp) {
                //$scope.ImportCustomerMessages = resp;
                $scope.importErrors = [];
                if (resp.data.failed.length !== 0) {
                    // $scope.ImportCustomerMessages = resp.data.failed;
                    for (var i = 0; i < resp.data.failed.length; i++) {
                        $scope.errorMessage = resp.message;
                        $scope.importErrors.push('line#' + resp.data.failed[i].lineNo + ' ' + resp.data.failed[i].name + ' ' + resp.data.failed[i].reason);
                    }
                    //Responsemessage.message = 'Import action was unsuccessfull , Reason:' + resp.data.err.errors[0].message;
                }
                else {
                    $scope.ImportCustomerMessages = resp[1];
                    $scope.custSaveResultMsgs = resp.message;
                    $timeout(function () {
                        $scope.custSaveResultMsgs = false;
                    }, 2000);
                    modalImp.remove();
                }
            }).catch($scope.handleError);
        };
        $scope.addTag = function (tag) {
            if (!tag) {
                return;
            }
            if ($scope.CustomerStruct.tags.indexOf(tag) !== -1) {
                var popUp = $ionicPopup.show({
                    template: "Tag already exists",
                    title: "Duplicate",
                    scope: $scope,
                    buttons: [{
                            text: 'Close'
                        }]
                });
                return;
            }
            $scope.CustomerStruct.tags.push(tag);
            $scope.tempTag.value = "";
        };
        $scope.deleteTag = function (index) {
            $scope.CustomerStruct.tags.splice(index, 1);
        };
        /**
         * #ShortCutTodo
         * Author: Amar
         *  shorcut tab in title bar to move next tab in new item
         */
    }
})();
