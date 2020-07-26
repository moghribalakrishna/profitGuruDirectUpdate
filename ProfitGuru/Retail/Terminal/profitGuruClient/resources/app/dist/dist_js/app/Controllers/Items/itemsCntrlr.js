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
    angular
        .module('profitGuru')
        .controller('ItemsCntrlr', [
        '$stateParams',
        'commonControllerValidationSvc',
        'itemsSearchPagination',
        'supplierControllerCommonSvc',
        'applicationCommonSettingsSvc',
        'itemsServerApis',
        'itemsCommonDataSvc',
        '$ionicSideMenuDelegate',
        '$scope',
        '$rootScope',
        '$filter',
        '$ionicPopup',
        '$ionicPopover',
        '$timeout',
        '$q',
        'hotkeys',
        'APPCONFIG',
        'itemDataSvc',
        'supplierDataSvc',
        'exportImportDataSvc',
        'utilsSvc',
        'helperSvc',
        'COMMONFUNC',
        'hotKeyCommonFunc',
        'loggerSvc',
        'AppSettingDataSvc',
        'navHandler',
        '$ionicLoading',
        'configDataSvc',
        'fileUtilsSvc',
        '$injector',
        'salesServerApis',
        'receivingsServerApis',
        ItemsCntrlr
    ]);
    function ItemsCntrlr($stateParams, commonControllerValidationSvc, itemsSearchPagination, supplierControllerCommonSvc, applicationCommonSettingsSvc, itemsServerApis, itemsCommonDataSvc, $ionicSideMenuDelegate, $scope, $rootScope, $filter, $ionicPopup, $ionicPopover, $timeout, $q, hotkeys, APPCONFIG, itemDataSvc, supplierDataSvc, exportImportDataSvc, utilsSvc, helperSvc, COMMONFUNC, hotKeyCommonFunc, loggerSvc, AppSettingDataSvc, navHandler, $ionicLoading, configDataSvc, fileUtilsSvc, $injector, salesServerApis, receivingsServerApis) {
        $ionicSideMenuDelegate.canDragContent(true);
        function callRenderApply() {
            COMMONFUNC.renderApply($scope);
            $scope.clearSearch();
        }
        $scope.$on("$ionicView.beforeLeave", function (event, data) {
            itemDataSvc.unregisterRenderApply('item');
            itemDataSvc.unregisterRenderApply('inventory');
        });
        $scope.showMultiBarPrint = false;
        var commonUtils = {};
        commonControllerValidationSvc.loadScopeWithCommonValidationApis($scope, commonUtils);
        var itemScope = {};
        var REMOVE_MODAL = commonControllerValidationSvc.removeModal;
        supplierControllerCommonSvc.supplierCommonFunctions($scope, itemScope);
        itemsCommonDataSvc.loadScopeWithItemsCommonFunctions($scope, itemScope, itemDataSvc);
        itemsCommonDataSvc.functionsSpecific2Item($scope, itemScope, itemDataSvc, $ionicLoading);
        applicationCommonSettingsSvc.loadScopeWithApplicationCommonSettingsSvc($scope);
        $scope.showItems = false;
        $scope.showallItems = false;
        $scope.inItemsScreen = true;
        // $scope.itemsList = [];
        itemDataSvc.getCommonScopeFunctions($scope);
        COMMONFUNC.itemDisplayFunc($scope);
        COMMONFUNC.pagingViewRep($scope);
        itemsSearchPagination.handleSearch($scope);
        itemsSearchPagination.handlePagination($scope);
        //todo: items
        $scope.itemsList = itemDataSvc.getAllItems();
        if ($rootScope.itemStatusObject.status == "5") {
            $rootScope.itemStatusObject = {
                status: "0",
                searchTypeLabel: "Search By All"
            };
        } // $scope.poc_items = $scope.itemsList.splice(0, 10);
        // $scope.itemQuantities = await itemDataSvc.getItemQuantities();
        if ($stateParams.receivingId) {
            $scope.receivingId = 'REC ' + $stateParams.receivingId;
            itemsCommonDataSvc.bulkItemPrintForReceiving($stateParams.receivingId);
        }
        $scope.generatedBarCodeList = [];
        $scope.allCategoryItem = itemDataSvc.getAllCategoriesItem();
        $scope.allSubCatagoryItem = itemDataSvc.getAllSubCategoriesItem();
        $scope.getAllTaxes = itemDataSvc.getAllTaxes();
        $scope.getAllUnits = itemDataSvc.getAllUnits();
        $scope.allCategories = itemDataSvc.getAllCategories();
        $scope.allDiscounts = itemDataSvc.getAllDiscounts();
        $scope.allSlabs = itemDataSvc.getAllSlabs();
        $scope.categoryList = $scope.allCategories.categoryList;
        $scope.priceProfiles = AppSettingDataSvc.getAllPriceProfiles(); //["ac", "non-ac", "garden"];
        $scope.multipleUnits = false;
        $scope.focusOnItemInput = true;
        var ItemElementJsonConst;
        itemDataSvc
            .getItemElementJson()
            .then(function (ItemElementJson) {
            //$scope.ItemElementJson = ItemElementJson.data;
            ItemElementJsonConst = ItemElementJson;
            $scope.ItemStruct = angular.copy(ItemElementJsonConst.ItemStructur);
            $scope.myItem = angular.copy(ItemElementJsonConst.itemViewStruct);
            $scope.taxStruct = angular.copy(ItemElementJsonConst.taxStruct);
            $scope.purchaseTaxStruct = angular.copy(ItemElementJsonConst.purchaseTaxStruct);
            $scope.salesTaxStruct = angular.copy(ItemElementJsonConst.salesTaxStruct);
            $scope.batch = angular.copy(ItemElementJsonConst.batchStruct);
        });
        COMMONFUNC.pagingView($scope, itemsCommonDataSvc);
        $scope.suppliersList = supplierDataSvc.getAllSuppliers();
        // $scope.currentModal = "";
        $scope.$on('$ionicView.beforeEnter', function (event, viewData) {
            viewData.enableBack = true;
        });
        $scope.$on('$ionicView.enter', function () {
            itemDataSvc.registerForRenderApply('item', callRenderApply);
            itemDataSvc.registerForRenderApply('inventory', callRenderApply);
            $rootScope.bInventoryCheckView = false;
            $scope.currentState = $rootScope.currentState;
            if ($rootScope.isLoggedIn === undefined || $rootScope.isLoggedIn === false) {
                navHandler.setRootAndGo('app.login');
            }
            else {
                $rootScope.salesScreen = false;
                $scope.ItemStruct.supplier_id = 0;
                $scope.dateTimeFormat = utilsSvc.getDateTimeFormat();
                if ($rootScope.isAddItemSale === true) {
                    if ($rootScope.userEntitlements.items.create.allowed) {
                        $scope.addNewItem();
                    }
                }
            }
        });
        $scope.hasData = true;
        $scope.loadMore = function () {
            /**
             * $scope.itemsList
            $scope.poc_items
             */
            var tempArray = $scope.itemsList.splice(0, $scope.poc_items.length + 10);
            $scope.poc_items = tempArray;
            if ($scope.itemsList.length === $scope.poc_items.length) {
                $scope.hasData = false;
            }
        };
        $rootScope.$ionicGoBack = function () {
            $scope.popover.hide();
            if ($stateParams.receivingId) {
                navHandler.pop();
                navHandler.pop();
            }
            if (!$scope.showMultiBarPrint) {
                navHandler.pop();
            }
            else {
                $scope.showMultiBarPrint = false;
                $scope.numberOfSearchResults = null;
                $scope.searchItem("");
                if ($scope.showCategoryView) {
                    $scope.showCategoryView();
                }
            }
        };
        function handleError(errMsg) {
            $scope.elementAddCall = false;
            $scope.showErrorPopUp(JSON.stringify(errMsg));
            console.log('Error Message:' + errMsg);
        }
        $scope.level1Options = {
            onSelect: function (item) {
                var items = [];
                for (var i = 1; i <= 5; i++) {
                    items.push(item + ': Nested ' + i);
                }
                $scope.allCategoryItem = items;
            }
        };
        $scope.searchAsync = function (term) {
            // No search term: return initial items
            if (!term) {
                return ['Item 1', 'Item 2', 'Item 3'];
            }
            var deferred = $q.defer();
            $timeout(function () {
                var result = [];
                for (var i = 1; i <= 3; i++) {
                    result.push(term + ' ' + i);
                }
                deferred.resolve(result);
            }, 300);
            return deferred.promise;
        };
        $scope.nestedItemsLevel1 = ['Item 1', 'Item 2', 'Item 3'];
        $scope.level1 = $scope.nestedItemsLevel1[0];
        $scope.level1Options = {
            onSelect: function (item) {
                var items = [];
                for (var i = 1; i <= 5; i++) {
                    items.push(item + ': Nested ' + i);
                }
                $scope.nestedItemsLevel2 = items;
            }
        };
        $scope.nestedItemsLevel2 = [];
        $scope
            .level1Options
            .onSelect($scope.nestedItemsLevel1[0]);
        $scope.showErrorPopUp = function (error) {
            let template = error;
            let title = 'Error';
            if (!$rootScope.isProfitGuruServerAvailable) {
                title = 'Offline';
                template = 'Server is not Connected';
            }
            $ionicPopup.show({
                template: template,
                title: title,
                scope: $scope,
                buttons: [{
                        text: 'Close'
                    }]
            });
        };
        //$scope.taxStruct = angular.copy(ItemElementJsonConst.taxStruct);
        function getItemDiscountSuss(resp) {
            console.log(resp.item_discount);
            $scope.ItemDiscount = resp.item_discount;
        }
        $scope.expiryConfirm = function (item) {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Warning',
                template: 'This Item is Expired. Do you still want to add this product to Kit?'
            });
            confirmPopup.then(function (res) {
                if (res) {
                    console.log('You are sure');
                    $scope.onTheGoPriceCheck(item);
                }
                else {
                    console.log('You are not sure');
                }
            });
        };
        $scope.deleteItemsJson = {
            item_id: ''
        };
        $scope.myItemInventory = {};
        $scope.IsHidden = true;
        $scope.ShowHide = function () {
            //If DIV is hidden it will be visible and vice versa.
            $scope.IsHidden = $scope.IsHidden ?
                false :
                true;
        };
        $scope.saveResult = '';
        $scope.goToSetting = function () {
            navHandler.push('app.appSettingConfig');
        };
        /**
         * computing base quantity for multiple unit item stock
         */
        $scope.computeQuantity = function (stock, item) {
            for (var unit in stock.unitsInfo) {
                if (parseInt(item.baseUnitId) === parseInt(unit)) {
                    stock.quantity = angular.copy(stock.unitsInfo[unit].quantity);
                }
            }
        };
        var cheatsheet = [{
                key: 'Ctrl + ?',
                function: 'Hotkeys Hint'
            }, {
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
        $scope.toggleValues = function () {
            if (arguments.length == 2) {
                if (typeof $scope[arguments[0]][arguments[1]] === 'undefined') {
                    $scope[arguments[0]][arguments[1]] = true;
                }
                else if (typeof $scope[arguments[0]][arguments[1]] === 'boolean') {
                    $scope[arguments[0]][arguments[1]] = !$scope[arguments[0]][arguments[1]];
                }
            }
            else if (arguments.length == 3) {
                if (typeof $scope[arguments[0]][arguments[1]][arguments[2]] === 'undefined') {
                    $scope[arguments[0]][arguments[1]][arguments[2]] = true;
                }
                else if (typeof $scope[arguments[0]][arguments[1]][arguments[2]] === 'boolean') {
                    $scope[arguments[0]][arguments[1]][arguments[2]] = !$scope[arguments[0]][arguments[1]][arguments[2]];
                }
            }
            else if (arguments.length == 1) {
                if (typeof $scope[arguments[0]] === 'undefined') {
                    $scope[arguments[0]] = true;
                }
                else if (typeof $scope[arguments[0]] === 'boolean') {
                    $scope[arguments[0]] = !$scope[arguments[0]];
                }
            }
            COMMONFUNC.renderApply($scope);
        };
        $scope.categorySelect = function (objName, idKey, categroyName, arrayNameToSearch) {
            $scope.selectModelId(objName, idKey, categroyName, arrayNameToSearch);
            if ($rootScope.mergedConfigurationsData.itemSettings.showAllSubCatFrSubCatSelection) {
                if (objName != 'myItem') {
                    $scope.tempSetSubCatList = [];
                    $scope.itemsCommonStruct.subCategories = [];
                }
                $scope.tempSetSubCatList = angular.copy($scope.allSubCatagoryItem);
            }
            else {
                if (objName != 'myItem') {
                    $scope.setSubCatList($scope.itemsCommonStruct.categoryId);
                }
                else {
                    $scope.setSubCatList($scope.myItem.categoryId);
                }
            }
            $scope.itemsCommonStruct.subCategoryId = '';
            $scope.myItem.subCategoryId = '';
        };
        $scope.supplierSelect = function (a, b, c, d) {
            $scope.supplierName = c;
            $scope.selectModelId(a, b, c, d);
        };
        $scope.subcategorySelect = function (a, b, c, d) {
            $scope.selectedSubCatName = c;
            $scope.selectModelId(a, b, c, d);
            if ($scope.itemsCommonStruct.subCategoryId && a == 'itemsCommonStruct') {
                $scope.addSubCategories($scope.itemsCommonStruct.subCategoryId, $scope.itemsCommonStruct, a);
                $scope.selectedSubCatName = '';
            }
            if ($scope.myItem.subCategoryId && a == 'myItem') {
                $scope.addSubCategories($scope.myItem.subCategoryId, $scope.myItem, a);
                $scope.selectedSubCatName = '';
            }
        };
        $scope.discountSelect = function (item, object) {
            if (!item) {
                return;
            }
            $scope.discountName = item;
            for (let i = 0; i < $scope.allDiscounts.length; i++) {
                let obj = $scope.allDiscounts[i];
                let id = $scope.allDiscounts[i].id;
                let x = obj.name + ' ' + obj.discount + "%";
                if (item == x) {
                    if (object != 'myItem') {
                        $scope.itemUnits[0].pProfilesData[0].discountId = id;
                    }
                    else {
                        $scope.myItem.unitsInfo[$scope.myItem.defaultSellingUnitId].pProfilesData[$scope.defaultPProfileId].discountId = id;
                    }
                    return;
                }
            }
            if (object != 'myItem') {
                $scope.itemUnits[0].pProfilesData[0].discountId = '';
            }
            else {
                $scope.myItem.unitsInfo[$scope.myItem.defaultSellingUnitId].pProfilesData[$scope.defaultPProfileId].discountId = '';
            }
        };
        $scope.selectModelId = function () {
            if (arguments.length == 4) {
                $scope[arguments[0]][arguments[1]] = '';
            }
            else if (arguments.length == 5) {
                $scope[arguments[0]][arguments[1]][arguments[2]] = '';
            }
            else if (arguments.length == 3) {
                $scope[arguments[0]] = '';
            }
            var resItems = [];
            var searchText = '';
            var arrayList = $scope[arguments[arguments.length - 1]];
            searchText = arguments[arguments.length - 2];
            resItems = $filter('filter')(arrayList, function (thisLine) {
                var bKeyMatched = false;
                bKeyMatched = (thisLine.first_name && (searchText == thisLine.first_name));
                if (!bKeyMatched) {
                    bKeyMatched = (thisLine.name && (searchText == thisLine.name));
                }
                return bKeyMatched;
            }, true);
            if (resItems.length) {
                var selectId = '';
                if (arguments[arguments.length - 1] == 'allCategoryItem' || arguments[arguments.length - 1] == 'tempSetSubCatList') {
                    selectId = 'id';
                }
                else if (arguments[arguments.length - 1] == 'suppliersList') {
                    selectId = 'person_id';
                }
                if (arguments.length == 4) {
                    $scope[arguments[0]][arguments[1]] = '';
                    $scope[arguments[0]][arguments[1]] = resItems[0][selectId];
                    if (resItems[0] && arguments[arguments.length - 1] == 'allCategoryItem') {
                        $scope[arguments[0]].hsn = resItems[0].hsn;
                    }
                    else if (!resItems[0] && arguments[arguments.length - 1] == 'allCategoryItem') {
                        $scope[arguments[0]].hsn = "";
                    }
                }
                else if (arguments.length == 5) {
                    $scope[arguments[0]][arguments[1]][arguments[2]] = '';
                    $scope[arguments[0]][arguments[1]][arguments[2]] = resItems[0][selectId];
                }
                else if (arguments.length == 3) {
                    $scope[arguments[0]] = '';
                    $scope[arguments[0]] = resItems[0][arguments[0]];
                }
            }
            COMMONFUNC.renderApply($scope);
        };
        $scope.checkAndUpdateCat = function (subCatList, catId) {
            var catSubCat = $scope.allCategories.categoryList[catId].doc.subCat;
            var categoty = $scope.allCategories.categoryList[catId].doc;
            if (!catSubCat) {
                catSubCat = [];
            }
            for (var i = 0; i < subCatList.length; i++) {
                if (catSubCat.indexOf(subCatList[i].id) === -1) {
                    catSubCat.push(subCatList[i].id);
                }
            }
            $scope.updateCategory(categoty, catSubCat);
        };
        $scope.validateSelectbox = function (categoryName, supplierName) {
            if ((!categoryName || !$scope.itemsCommonStruct.categoryId)) {
                return true;
            }
            if ((!supplierName && $scope.itemsCommonStruct.supplier_id) || (supplierName && !$scope.itemsCommonStruct.supplier_id)) {
                return true;
            }
        };
        $scope.validateDiscount = function (myItem) {
            if (myItem == 'myItem') {
                if ($scope.discountName && !$scope.myItem.unitsInfo[$scope.myItem.defaultSellingUnitId].pProfilesData[$scope.defaultPProfileId].discountId) {
                    return true;
                }
                else if (!$scope.discountName && $scope.myItem.unitsInfo[$scope.myItem.defaultSellingUnitId].pProfilesData[$scope.defaultPProfileId].discountId) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                try {
                    if ($scope.discountName && !$scope.itemUnits[0].pProfilesData[0].discountId) {
                        return true;
                    }
                    else if (!$scope.discountName && $scope.itemUnits[0].pProfilesData[0].discountId) {
                        return true;
                    }
                    else {
                        return false;
                    }
                }
                catch (res) {
                    if ($scope.discountName) {
                        return true;
                    }
                }
            }
        };
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
                    if (angular.element('#closeSettingsModel').length) {
                        $('#closeSettingsModel').click();
                        focusOnFirstClass($scope.currentTabFirstInputClass);
                    }
                    else if (angular.element('#closeCustomerModel').length) {
                        $('#closeCustomerModel').click();
                        focusOnFirstClass($scope.currentTabFirstInputClass);
                    }
                    else if (angular.element('#closeNewItemUniqueDetails').length) {
                        $('#closeNewItemUniqueDetails').click();
                        focusOnFirstClass($scope.currentTabFirstInputClass);
                    }
                    else {
                        $('#closeNewItem').click();
                        $('#serchItemEle').focus();
                    }
                }
                $scope.popover.hide();
                if (!angular.element('#closeNewItem').length) {
                    $('#serchItemEle').focus();
                }
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
                // else if (KEY.tag == 'input') {
                //   // event.preventDefault();
                // }
                // write ur logic here
                else {
                    // if (document.activeElement.id === 'NextTabButton' || document.activeElement.id === 'previousTabButton') {
                    //   return;
                    // }
                    if (KEY.id == 'selectOrDeselectAll') {
                        setTimeout(function () {
                            $('#selectOrDeselectAll').focus();
                        }, 500);
                    }
                    else if (KEY.id == 'showSelectedItems') {
                        setTimeout(function () {
                            $('#showSelectedItems').focus();
                        }, 500);
                    }
                    else if (KEY.id == 'itemNCategoryView') {
                        setTimeout(function () {
                            $('#itemNCategoryView').focus();
                        }, 500);
                    }
                    else if (KEY.id == 'inventoryNNormalView') {
                        setTimeout(function () {
                            $('#inventoryNNormalView').focus();
                        }, 500);
                    }
                    else if (KEY.id == 'previousTabButton') {
                        $scope.focusOnItemInput = false;
                        // setTimeout(function () {
                        //   $('#previousTabButton').focus();
                        // }, 50);
                    }
                    else if (KEY.id == 'NextTabButton') {
                        $scope.focusOnItemInput = false;
                    }
                    else if (KEY.id == 'attribuiteSaveToFocus') {
                        var f = angular.element('.addedAttributesToFocus');
                        event.preventDefault();
                        hotKeyCommonFunc.trigger(document.activeElement, true);
                        if (f && f.length) {
                            $(f[0]).focus();
                        }
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
                if (hotKeyCommonFunc.cheatsheetVisible()) { // hide cheatsheet
                    // hotKeyCommonFunc.closeCheatSheet();
                    event.preventDefault();
                }
                else if (hotKeyCommonFunc.checkIsPopupOn()) {
                    event.preventDefault();
                    // hotKeyCommonFunc.closepopupClicked();
                }
                else {
                    if (angular.element('#closeSettingsModel').length) {
                    }
                    else if (angular.element('#closeCustomerModel').length) {
                    }
                    else if (angular.element('#closeNewItemUniqueDetails').length) {
                    }
                    else {
                        $('#newItemSubmit:enabled').click();
                        $('#serchItemEle').focus();
                    }
                    event.preventDefault();
                }
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
                    focusOnFirstClass($scope.currentTabFirstInputClass);
                    return;
                }
                else if (KEY.id == 'previousTabButton') {
                    if (!angular.element('#newItemSubmit:enabled').length && !angular.element('#NextTabButton').length) {
                        event.preventDefault();
                        focusOnFirstClass($scope.currentTabFirstInputClass);
                        return;
                    }
                    // var cc = angular.element('#newItemSubmit').length
                    // var c1 = angular.element('#NextTabButton').length
                    // if (angular.element('#newItemSubmit:enabled').length) {
                    //   angular.element('#newItemSubmit').focus();
                    //   return;
                    // } else if (angular.element('#NextTabButton').length) {
                    //   angular.element('#NextTabButton').focus();
                    //   return;
                    // } else {
                    //   focusOnFirstClass($scope.currentTabFirstInputClass);
                    //   return;
                    // }
                    // if (cc < 1) {
                    //   if (c1 < 1) {
                    //     focusOnFirstClass($scope.currentTabFirstInputClass);
                    //     return;
                    //   }
                    // }
                }
                else if (KEY.id == 'newItemSubmit') {
                    if (angular.element('#NextTabButton').length) {
                        angular.element('#NextTabButton').focus();
                    }
                    else {
                        focusOnFirstClass($scope.currentTabFirstInputClass);
                    }
                    event.preventDefault();
                    return;
                }
                // else if (KEY.id.indexOf('meiNumber_') != -1) {
                //   // return;
                // }
            }
            else if (KEY.shift && KEY.key == 'tab' && !KEY.ctrl) {
                var x = checkIfFirstClassIsActive($scope.currentTabFirstInputClass);
                if (x) {
                    event.preventDefault();
                    if (angular.element('#NextTabButton').length) {
                        angular.element('.nextClassToFocus').focus();
                    }
                    else if (angular.element('#previousTabButton').length) {
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
        var focusOnFirstClass = function (className) {
            var y = document.getElementsByClassName(className);
            if (y) {
                for (var i = 0; i < y.length; i++) {
                    if (!y[i].disabled) {
                        hotKeyCommonFunc.trigger(y[i]);
                        return;
                    }
                }
            }
            if (angular.element('#NextTabButton').length) {
                angular.element('.nextClassToFocus').focus();
            }
            else if (angular.element('#previousTabButton').length) {
                angular.element('.prevClassToFocus').focus();
            }
        };
        // to search and enter
        // var x;
        //   x = angular.element('#cardContainer item-info-card-new');
        //   hotKeyCommonFunc.trigger(x[0]);
        $scope.focusOnSearch = function () {
            $('#serchItemEle').focus();
        };
        $scope.hotkeysActive = false;
        var page = hotKeyCommonFunc.jqueryFind('body');
        var resp = hotKeyCommonFunc.addEventListener(page[0], $scope.hotkeysListener, $scope)
            .then(function (resp) {
            $scope.hotkeysActive = true;
        })
            .catch(function (err) {
            $scope.hotkeysActive = false;
        });
        $scope.cheatSheetToggle = function () {
            hotKeyCommonFunc.toggleCheatSheet(cheatsheet);
        };
        $scope.saveBeforeSubmit = false;
        $scope.checkMUEdit = function (val) {
            if (!val) {
                $scope.saveBeforeSubmit = true;
            }
        };
        $scope.addOrUpdateItemSuccs = function (resp) {
            //$scope.taxes = [];
            $scope.clearUnitVariables();
            $scope.itemCreateOrUpdateResponseMessage = JSON.stringify(resp.success);
            console.log(resp);
            var n = JSON
                .stringify(resp)
                .search("itemExists");
            if (n > 0) {
                $scope.itemExistsPopUp();
                //alert("Item name already Exists for same Barcode");
            }
            else { }
            $timeout(function () {
                $scope.itemCreateOrUpdateResponseMessage = false;
            }, 3000);
            if ($rootScope.isAddItemSale === true) {
                $rootScope.itemObject = {
                    item_id: resp.item_id
                };
                if ($rootScope.previousState == 'app.sales') {
                    $scope.addItemtoCart = true;
                    salesServerApis.addItem2CartByIdApi($rootScope.itemObject).then(function (res) {
                        if (res && res.err) {
                            const popup = $ionicPopup.show({
                                title: 'Alert!',
                                template: res.err,
                                scope: $scope,
                                buttons: [{
                                        text: 'Ok'
                                    }]
                            });
                            setTimeout(function () {
                                hotKeyCommonFunc.focusOnPopUp();
                            }, 200);
                            popup.then(function () {
                                navHandler.pop();
                            });
                        }
                        else {
                            navHandler.pop();
                        }
                    }).catch($scope.handleError);
                    $rootScope.isAddItemSale = false;
                }
                else if ($rootScope.previousState == 'app.receivings') {
                    receivingsServerApis.additem2RecByIdCartApi($rootScope.itemObject).then(function (res) {
                        if (res && res.err) {
                            const popup = $ionicPopup.show({
                                title: 'Alert!',
                                template: res.err,
                                scope: $scope,
                                buttons: [{
                                        text: 'Ok'
                                    }]
                            });
                            setTimeout(function () {
                                hotKeyCommonFunc.focusOnPopUp();
                            }, 200);
                            popup.then(function () {
                                navHandler.pop();
                            });
                        }
                        else {
                            navHandler.pop();
                        }
                    }).catch($scope.handleError);
                    $rootScope.isAddItemSale = false;
                }
            }
            console.log($scope.myItem);
            console.log($scope.categoryList);
            itemScope.closeModals();
            reloadSubCategoryItems();
        };
        $scope.getUnitName = function (id) {
            return AppSettingDataSvc.getUnitName(id);
        };
        $scope.getPProfileName = function (id) {
            return AppSettingDataSvc.getProfileName(id);
        };
        $scope.getDiscountName = function (id) {
            return AppSettingDataSvc.getDiscountName(id);
        };
        itemScope.closeModals = function () {
            REMOVE_MODAL(newItemModal);
            REMOVE_MODAL($scope.itemDetailsModal);
            $scope.itemsCommonStruct = {};
            $scope.ItemStruct = {};
            $scope.myItem = {};
            destroyCommonObject();
        };
        $scope.itemExistsPopUp = function () {
            var itemExistsPopUpPopup = $ionicPopup.confirm({
                title: 'Warning!',
                template: 'Item name already Exists for same Barcode'
            });
            itemExistsPopUpPopup.then(function (res) {
                if (res) {
                    console.log('You are sure');
                }
                else {
                    console.log('You are not sure');
                }
                $scope.elementAddCall = false;
            });
        };
        //alert("Item name already Exists for same Barcode");
        $scope.cantAddOTGItemAlert = function () {
            var cantAddOTGItemPopup = $ionicPopup.confirm({
                title: 'can\'t add OTG item to Kit cart',
                template: 'OTG item can\'t be added'
            });
            cantAddOTGItemPopup.then(function (res) {
                if (res) {
                    console.log('You are sure');
                }
                else {
                    console.log('You are not sure');
                }
            });
        };
        $scope.onTheGoPriceCheck = function (item) {
            if (item.unit_price === "0.00") {
                $scope.cantAddOTGItemAlert();
            }
            else {
                $scope.item = item;
                $scope.item.OtgItem = false;
            }
        };
        $scope.saveInventory = function (InvData) {
            InvData['expiry'] = String(InvData.expiry);
            itemDataSvc
                .saveInventory(InvData)
                .then(saveInventorySuccs)
                .catch(handleError);
        };
        function saveInventorySuccs(resp) {
            return resp;
        }
        $scope.showCategoryItems = function (selectedCategory) {
            $scope.salesItems = false;
            $scope.selectedCategoryId = parseInt(selectedCategory);
            // not using itemsForCategory. Suppose we add/delete 1 item to the category.
            // itemsforcategory is not updated. So directly filtering with angularyjs in
            // template
            // $scope.itemsForCategory = COMMONFUNC.showCategoryItemsCommon($scope, selectedCategory, itemDataSvc);
            $scope.showallItems = false;
            $scope.showItems = true;
            $scope.subCatView = false;
            $timeout(function () {
                COMMONFUNC.renderApply($scope);
            }, 30);
        };
        $scope.showSubCategoriesOfCategory = function (selectedCategory) {
            $scope.subCategoriesForCategory = COMMONFUNC.getCategorysSubCategory($scope, selectedCategory, itemDataSvc);
            // $scope.itemsWithNoSubCatInAnCatList = COMMONFUNC.getItemsWithNoSubCatInAnCat($scope, selectedCategory, itemDataSvc);
            $scope.showallItems = false;
            $scope.showItems = false;
            $scope.subCatView = true;
            $scope.selected_subCatName = '';
            $scope.selected_subCat = null;
            $scope.selectedCategoryId = parseInt(selectedCategory);
            $scope.getCategoryItems(parseInt(selectedCategory), undefined, true, undefined);
            $timeout(function () {
                COMMONFUNC.renderApply($scope);
            }, 50);
        };
        $scope.subCatView = false;
        $scope.showItemsOfSubCategory = function (selectedSubCategory, subCategory) {
            // $scope.subCategoriesitemsForCategory = COMMONFUNC.getSubCategoryItems($scope, selectedSubCategory, itemDataSvc);
            $scope.showallItems = false;
            $scope.showItems = true;
            $scope.subCatView = true;
            $scope.selected_subCatName = subCategory.name;
            $scope.selected_subCategory = subCategory;
            $scope.selected_subCat = parseInt(selectedSubCategory);
            $scope.currentPage = 0;
            $scope.numberOfItemsInCategory = subCategory.itemCount;
            $scope.getSubCategoryItems($scope.selectedCategoryId, parseInt(selectedSubCategory), undefined);
            $timeout(function () {
                COMMONFUNC.renderApply($scope);
            }, 50);
        };
        $scope.openSelectedCategory = function (catId, category) {
            $scope.itemSearchObject.itemSearch = '';
            $scope.currentPage = 0;
            $scope.numberOfItemsInCategory = category.itemCount;
            $scope.selected_catName = category.name;
            $scope.selected_cat = category;
            if ($rootScope.mergedConfigurationsData.itemSettings.showSubCategoryWiseItems) {
                $scope.noOfSubCategoryItems = category.itemCountExSubCategory;
                $scope.showSubCategoriesOfCategory(catId);
            }
            else {
                $scope.noOfSubCategoryItems = null;
                // $scope.numberOfPages(category.itemCount);
                $scope.showCategoryItems(catId);
                let bNoSubCategory = true;
                $scope.getCategoryItems(parseInt(catId), undefined, bNoSubCategory, undefined);
                $timeout(function () {
                    COMMONFUNC.renderApply($scope);
                }, 50);
            }
        };
        $scope.commonItemsLengthInSubCatNCat = function (selectedSubCategory) {
            return COMMONFUNC.getSubCategoryItems($scope, selectedSubCategory, itemDataSvc, true);
        };
        $scope.deleteItems = function (ItemId) {
            $scope.deleteItemsJson.item_id = ItemId;
            itemsServerApis
                .deleteItemsApi($scope.deleteItemsJson)
                .then(ItemsDeleteSuccess)
                .catch(handleError);
        };
        function reloadSubCategoryItems() {
            if ($rootScope.mergedConfigurationsData.itemSettings.showSubCategoryWiseItems) {
                $timeout(function () {
                    if ($scope.selected_subCatName && $scope.subCatView) {
                        $scope.showItemsOfSubCategory($scope.selected_subCat, $scope.selected_subCatName);
                    }
                    else if ($scope.subCatView && $scope.selected_cat) {
                        $scope.showSubCategoriesOfCategory($scope.selected_cat);
                    }
                }, 1000);
            }
        }
        function ItemsDeleteSuccess(respItemsList) {
            console.log("ItemsDeleteSuccess");
            if (respItemsList.error) {
                $scope.showErrorPopUp(JSON.stringify(respItemsList.error));
            }
            $scope.itemDeleteResponse = JSON.stringify(respItemsList.msg);
            console.log(JSON.stringify($scope.itemDeleteResponse));
            $timeout(function () {
                $scope.itemDeleteResponse = false;
            }, 2000);
            REMOVE_MODAL($scope.itemDetailsModal);
            $scope.myItem = {};
            reloadSubCategoryItems();
            destroyCommonObject();
        }
        $ionicPopover
            .fromTemplateUrl('Items/itemsPopOver2.html', {
            scope: $scope,
            controller: 'ItemsCntrlr'
        })
            .then(function (popover) {
            $scope.popover = popover;
        });
        $scope.focusOnPopoverMainScreen = function (event) {
            $scope.popover.show(event);
            setTimeout(function () {
                angular.element('.itemSettingsPopFirstCard').focus();
            }, 400);
        };
        const focusOnFirstCard = function () {
            var x;
            x = angular.element('.firstItemToFocus');
            hotKeyCommonFunc.trigger(x[0]);
        };
        // $scope.showCategoryModeltoCreateNew = function () {
        //   var categoryIdToAdd = $scope.showCategoryModel();
        // };
        $scope.showconfirm = function (deleteItemId) {
            var confirmPopup = $ionicPopup.confirm({
                title: 'DELETE',
                template: 'Are you sure you want to delete this item name and details?'
            });
            confirmPopup.then(function (res) {
                if (res) {
                    console.log('You are sure');
                    $scope.deleteItems(deleteItemId);
                }
                else {
                    console.log('You are not sure');
                }
            });
        };
        $scope.newNumber = true;
        $scope.showItemeditScreen = function () {
            var group = [];
            group = {
                name: 'Basic Details',
                id: 'basic_info'
            };
            $scope.iSelectTab(group);
            // don't remove below two lines used for tab work
            $scope.itemDetailMode = false;
            $scope.itemEditMode = true;
            $scope.viewItem.edit = true;
            $scope.itemDetails = true;
            $scope.viewItem.inventory = false;
            $scope.viewItem.invDetails = false;
            // $scope.comptConvPurchasePrice($scope.viewItem);
            $scope.myItem.expiry = new Date($scope.myItem.expiry);
        };
        $scope.showItemUpdateScreen = function () {
            //TOdo GANAG change the name of the function
            $scope.itemDetails = false;
            $scope.viewItem.edit = false;
            $scope.viewItem.inventory = true;
            $scope.viewItem.invDetails = false;
        };
        $scope.showInvdetailsScren = function () {
            $scope.viewItem.edit = false;
            $scope.itemDetails = true;
            $scope.viewItem.inventory = false;
            $scope.viewItem.invDetails = true;
        };
        $scope.showCategoryView = function () {
            $scope.showItems = false;
            $scope.showallItems = false;
            $scope.subCatView = false;
            $scope.selected_subCatName = '';
            $scope.selected_subCat = null;
            $scope.selectedCategoryId = '';
        };
        $scope.barcodeSearch = {};
        $scope.barcodeSearch.flag = false;
        $scope.showAllItems = function (barcode14Chars, bStrictMatch) {
            // $scope.barcodeSearch.flag = false;
            // COMMONFUNC.pagingView($scope, itemsCommonDataSvc);
            $scope.salesAllItems = false;
            $scope.selectedCategoryId = '';
            $scope.currentPage = 0;
            $scope.numberOfItemsInCategory = '';
            $scope.noOfSubCategoryItems = '';
            $scope.showallItems = true;
            $scope.showItems = true;
            $scope.subCatView = false;
            $scope.selected_subCatName = '';
            delete $scope.selected_subCategory;
            $scope.selected_subCat = null;
            $timeout(function () {
                COMMONFUNC.renderApply($scope);
            }, 100);
            return itemDataSvc.loadMoreItems({
                limit: $rootScope.mergedConfigurationsData.linesPerPage.value,
                skip: 0
            });
        };
        // hotkeys
        //   .bindTo($scope)
        //   .add({
        //     combo: 'alt+n',
        //     description: 'add new items',
        //     callback: function () {
        //       if (hotkeys.helpVisible) {
        //         hotkeys.toggleCheatSheet();
        //       }
        //       if ($rootScope.userEntitlements.items.create.allowed) {
        //         $scope.addNewItem();
        //       }
        //       //hotkeys.toggleCheatSheet();
        //     }
        //   });
        function bItemsSubModalsNotOpen() {
            var modalsArray = [
                $scope.CategoryConfigModal,
                $scope.unitConfigModal,
                $scope.TaxConfigModal,
                $scope.DiscountConfigModal,
                $scope.addAttributeModal,
                $scope.newSupplierModal,
                $scope.barcodeModal
            ];
            var bNotOpen = $scope.bMultipleModalsOpen(modalsArray);
            return bNotOpen;
        }
        // hotkeys
        //   .bindTo($scope)
        //   .add({
        //     combo: 'esc',
        //     description: 'window should close',
        //     callback: function () {
        //       // REMOVE_MODAL($rootScope.modals[$rootScope.modals.length - 1]);
        //       if (hotkeys.helpVisible) {
        //         hotkeys.toggleCheatSheet();
        //       }
        //       if (!$scope.isattributeModalOn) {
        //         if ($rootScope.isAddItemSale === true) {
        //           $rootScope.isAddItemSale = false;
        //           navHandler.pop();
        //         }
        //         if ($scope.bModalIsNotOpen($scope.imeiModal) && bItemsSubModalsNotOpen()) {
        //           REMOVE_MODAL(newItemModal);
        //           $scope.ItemStruct = angular.copy(ItemElementJsonConst.ItemStructur);
        //         }
        //       }
        //       REMOVE_MODAL(modalCalculator);
        //       if ($scope.bModalOpen(modalCkeckInventory)) {
        //         $scope.closeinventoryDetails();
        //       }
        //       if ($scope.bModalIsNotOpen($scope.stockImeiModal) && bItemsSubModalsNotOpen()) {
        //         REMOVE_MODAL($scope.itemDetailsModal);
        //         $scope.myItem = {};
        //         destroyCommonObject();
        //       }
        //       if ($scope.bModalOpen($scope.addAttributeModal)) {
        //         $scope.closeAddAttributeModal();
        //       }
        //       if ($scope.bModalOpen($scope.stockImeiModal)) {
        //         $scope.closeStockUpdateIMEIModal();
        //       }
        //       if ($scope.bModalOpen($scope.newSupplierModal)) {
        //         REMOVE_MODAL($scope.newSupplierModal);
        //       }
        //       if ($scope.bModalOpen($scope.barcodeModal)) {
        //         REMOVE_MODAL($scope.barcodeModal);
        //       }
        //       if ($scope.bModalOpen($scope.imeiModal)) {
        //         $scope.closeIMEIModal();
        //       }
        //       if ($scope.bModalOpen($scope.CategoryConfigModal)) {
        //         $scope.closeCategoryModel();
        //       }
        //       if ($scope.bModalOpen($scope.unitConfigModal)) {
        //         $scope.closeUnitModel();
        //       }
        //       if ($scope.bModalOpen($scope.TaxConfigModal)) {
        //         $scope.closeTaxModel();
        //       }
        //       if ($scope.bModalOpen($scope.DiscountConfigModal)) {
        //         $scope.closeDiscountModel();
        //       }
        //     }
        //   });
        $scope.Itemparams = {
            item_id_edit: ''
        };
        //TOBE MOVED2DATASVC $scope.myItem = itemDataSvc.getItemViewStruct();
        $scope.searchActive = function () {
            $scope.showItems = true;
        };
        $scope.inventoryCheck = function () {
            $scope.inventoryItemCheck = true;
            $rootScope.bInventoryCheckView = true;
            $scope.showAllItems();
        };
        $scope.inventoryCheckClose = function () {
            $rootScope.bInventoryCheckView = false;
            $scope.inventoryItemCheck = false;
        };
        $scope.addIngredeints4Items = function () {
            createIngridientsModal();
        };
        var modaladdIngredeints4Items;
        function createIngridientsModal() {
            if ($scope.bModalIsNotOpen(modaladdIngredeints4Items)) {
                commonUtils
                    .createModalInstance('Items/addIngredeints4Items.html', 'ItemsCntrlr', $scope)
                    .then(function (modal) {
                    modaladdIngredeints4Items = modal;
                });
            }
        }
        $scope.showaddIngredeints4Items = function () {
            createIngridientsModal();
        };
        $scope.closeaddIngredeints4Itemss = function () {
            modaladdIngredeints4Items.remove();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (modaladdIngredeints4Items)
                modaladdIngredeints4Items.remove();
        });
        // Execute action on hide modal
        $scope.$on('modaladdIngredeints4Items.hidden', function () {
            // Execute action $scope.myItem ={};
        });
        // Execute action on remove modal
        $scope.$on('modaladdIngredeints4Items.removed', function () {
            // Execute action
        });
        var modalCkeckInventory;
        function createInventoryModalInstance() {
            if ($scope.bModalIsNotOpen(modalCkeckInventory)) {
                commonUtils
                    .createModalInstance('Items/inventoryCheck.html', 'ItemsCntrlr', $scope)
                    .then(function (modal) {
                    modalCkeckInventory = modal;
                });
            }
        }
        $scope.showinventoryDetails = function (myItem) {
            return __awaiter(this, void 0, void 0, function* () {
                let liteItem = angular.copy(myItem);
                myItem = yield itemDataSvc.getFullItemJson(myItem._id);
                myItem.quantity = liteItem.quantity;
                $scope.myItem = myItem;
                $scope.setCommonObject($scope.myItem);
                if ($scope.myItem.hasOwnProperty("purchaseUnitId")) {
                    $scope.myItem.purchaseUnit = angular.copy(itemDataSvc.getUnitById(myItem.purchaseUnitId));
                    $scope.hasMeasurementUnit = $scope.myItem.purchaseUnit.id != 1 ?
                        true :
                        false;
                }
                if ($scope.myItem.hasOwnProperty("sellingUnitId")) {
                    $scope.myItem.sellingUnit = angular.copy(itemDataSvc.getUnitById(myItem.sellingUnitId));
                    $scope.hasMeasurementUnit = $scope.myItem.sellingUnit.id != 1 ?
                        true :
                        false;
                }
                $scope.myItem.category = angular.copy(itemDataSvc.getCategoryById(myItem.categoryId));
                let batchObj = yield itemDataSvc.getBatchesByItemId(myItem.item_id);
                $scope.myItem.batches = batchObj.batches;
                $scope.thisItemInventoryData = yield itemDataSvc.getItemInventoryById('inventory_' + myItem.item_id);
                for (var i = 0; i < $scope.thisItemInventoryData.inventory.length; i++) {
                    var unitsInfo = {};
                    for (var j = 0; j < $scope.myItem.batches.length; j++) {
                        if ($scope.myItem.batches[j].stockKey === $scope.thisItemInventoryData.inventory[i].trans_stockKey) {
                            unitsInfo = $scope.myItem.batches[j].unitsInfo;
                        }
                    }
                    $scope.thisItemInventoryData.inventory[i].trans_unit = $scope.thisItemInventoryData.inventory[i].trans_unit ?
                        $scope.thisItemInventoryData.inventory[i].trans_unit :
                        $scope.myItem.baseUnitId;
                    var factor = commonControllerValidationSvc.getFactor($scope.thisItemInventoryData.inventory[i].trans_unit, $scope.myItem.baseUnitId, unitsInfo);
                    $scope.thisItemInventoryData.inventory[i].trans_unit_inventory = $scope.thisItemInventoryData.inventory[i].trans_inventory / factor;
                }
                createInventoryModalInstance();
            });
        };
        $scope.closeinventoryDetails = function () {
            modalCkeckInventory.remove();
            $scope.Itemparams.item_id_edit = undefined;
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (modalCkeckInventory)
                modalCkeckInventory.remove();
        });
        // Execute action on hide modal
        $scope.$on('modalCkeckInventory.hidden', function () {
            // Execute action $scope.myItem ={};
        });
        // Execute action on remove modal
        $scope.$on('modalCkeckInventory.removed', function () {
            // Execute action
        });
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            REMOVE_MODAL($scope.itemDetailsModal);
            $scope.myItem = {};
            destroyCommonObject();
        });
        // Execute action on hide modal
        $scope.$on('itemDetailsModal.hidden', function () {
            // Execute action
            $scope.removedIndex = [];
            $scope.newRemovedIMEInumbers4Batch = [];
            $scope.newAddedIMEInumbers4Batch = [];
            $scope.itemDetails = false;
            $scope.elementAddCall = false;
            $scope.myItem = {};
            destroyCommonObject();
        });
        // Execute action on remove modal
        $scope.$on('itemDetailsModal.removed', function () {
            // Execute action
            $scope.removedIndex = [];
            $scope.newRemovedIMEInumbers4Batch = [];
            $scope.newAddedIMEInumbers4Batch = [];
            $scope.itemDetails = false;
            $scope.elementAddCall = false;
            $scope.myItem = {};
            destroyCommonObject();
            // createItemDetailsModalInstance();
        });
        //}
        var newItemModal;
        function createNewModalInstance() {
            if ($scope.bModalIsNotOpen(newItemModal)) {
                commonUtils
                    .createModalInstance('Items/NEWITEMS.html', 'ItemsCntrlr', $scope)
                    .then(function (modal) {
                    newItemModal = modal;
                });
            }
        }
        $scope.addSubCategories = function (id, item, objName) {
            if (id == null)
                return;
            var subCategorieData = {};
            if (item.subCategories) {
                for (var i = 0; i < item.subCategories.length; i++) {
                    if (id === item.subCategories[i].id) {
                        return;
                    }
                }
                for (var i = 0; i < $scope.tempSetSubCatList.length; i++) {
                    if ($scope.tempSetSubCatList[i].id == id) {
                        subCategorieData.id = id;
                        subCategorieData.name = $scope.tempSetSubCatList[i].name;
                    }
                }
                item.subCategories.push(subCategorieData);
            }
            else {
                for (var i = 0; i < $scope.itemsCommonStruct.subCategories.length; i++) {
                    if (id === $scope.itemsCommonStruct.subCategories[i].id) {
                        return;
                    }
                }
                for (var i = 0; i < $scope.tempSetSubCatList.length; i++) {
                    if ($scope.tempSetSubCatList[i].id === id) {
                        subCategorieData.id = id;
                        subCategorieData.name = $scope.tempSetSubCatList[i].name;
                    }
                }
                $scope.itemsCommonStruct.subCategories.push(subCategorieData);
            }
        };
        $scope.deleteSubCategories = function (subCategorie, item) {
            if (item.subCategories) {
                for (var i = 0; i < item.subCategories.length; i++) {
                    if (item.subCategories[i].id == subCategorie.id) {
                        item.subCategories.splice(i, 1);
                    }
                }
            }
            else {
                for (var i = 0; i < $scope.itemsCommonStruct.subCategories.length; i++) {
                    if ($scope.itemsCommonStruct.subCategories[i].id == subCategorie.id) {
                        $scope.itemsCommonStruct.subCategories.splice(i, 1);
                    }
                }
            }
        };
        $scope.addNewItem = function (category) {
            if (category) {
                $scope.categoryName = category.name;
            }
            else {
                $scope.categoryName = '';
            }
            ;
            $scope.tabVariables('new');
            var group = [];
            group = {
                name: 'Basic Details',
                id: 'basic_info'
            };
            $scope.iSelectTab(group);
            $scope.itemDetailMode = false;
            $scope.itemEditMode = false;
            // $scope.categoryName = '';
            $scope.supplierName = '';
            $scope.discountName = '';
            $scope.previousUnit = $scope.getAllUnits[0].id;
            $scope.itemDetails = false;
            $scope.elementAddCall = false;
            $scope.itemUnits = [{
                    'unit': "",
                    'refUnitId': "",
                    'factor': 1,
                    'purchasePrice': 0,
                    'mrp': 0,
                    'pProfilesData': []
                }];
            $scope.clearVariantsData();
            $scope.ItemStruct = $scope.itemsCommonStruct = angular.copy(ItemElementJsonConst.ItemStructur);
            if (category) {
                $scope.itemsCommonStruct.hsn = category.hsn;
            }
            else {
                $scope.itemsCommonStruct.hsn = '';
            }
            ;
            $scope.taxes = angular.copy($scope.taxStruct);
            $scope.purchaseTaxes = angular.copy(ItemElementJsonConst.purchaseTaxStruct);
            $scope.salesTaxes = angular.copy(ItemElementJsonConst.salesTaxStruct);
            $scope.itemsCommonStruct.ItemType = $rootScope.appType == 'restaurant' ?
                'Prepared' :
                '';
            $scope.ItemTypeArry = ['Prepared', 'Ingrediant', 'FastFood'];
            $scope.itemsCommonStruct.bPPTaxInclusive = $rootScope.mergedConfigurationsData.tax.itemPricesIncludesTax;
            $scope.itemsCommonStruct.bSPTaxInclusive = $rootScope.mergedConfigurationsData.tax.itemPricesIncludesTax;
            if ($rootScope.newBarcode !== undefined) {
                $scope.itemsCommonStruct.item_number = angular.copy($rootScope.newBarcode);
                $rootScope.newBarcode = '';
            }
            if (category !== undefined) {
                $scope.itemsCommonStruct.categoryId = angular.copy(category.id);
            }
            $scope.itemsCommonStruct.supplier_id = '';
            $scope.itemsCommonStruct.itemNprice = 0;
            // $scope.itemsCommonStruct.imei = false;
            // $scope.ItemStruct.isWarranty = false;
            var defaultUnit = itemDataSvc.getDefaultUnit();
            $scope.itemsCommonStruct.baseUnitId = defaultUnit ?
                defaultUnit.id :
                "";
            $scope.itemUnits[0].unit = defaultUnit ?
                defaultUnit.id :
                "";
            $scope.itemUnits[0].refUnitId = $scope.itemsCommonStruct.baseUnitId;
            $scope.itemsCommonStruct.subCategories = [];
            $scope.subCategoryId = "";
            // $scope.newItemModal.show();
            $scope.itemsCommonStruct.bAvailableForPurchaseOrder = $scope.itemsCommonStruct.bAvailableForPurchaseOrder === false ? false : true;
            $scope.myItem = $scope.itemsCommonStruct;
            $scope.setCommonObject($scope.myItem);
            $scope.editingExistingItem = false;
            createNewModalInstance();
        };
        //this code is present in applicationsettings make it common
        var expanded = false;
        $scope.showSubCatSelectMenu = function () {
            var checkboxes = document.getElementById("subCategoryList");
            if (!expanded) {
                checkboxes.style.display = "block";
                expanded = true;
            }
            else {
                checkboxes.style.display = "none";
                expanded = false;
            }
        };
        $scope.listOfSubCatInCat = [];
        $scope.addSubCategory2Cat = function (subCategory, IsAdd) {
            if (!IsAdd) {
                for (var r in $scope.listOfSubCatInCat) {
                    if ($scope.listOfSubCatInCat[r].id === subCategory.id) {
                        removeCategory(r);
                    }
                }
            }
            else {
                $scope.listOfSubCatInCat.push(subCategory);
            }
        };
        function removeCategory(index) {
            $scope.listOfSubCatInCat.splice(index, 1);
        }
        $scope.closeNewItem = function () {
            $scope.ItemStruct = angular.copy(ItemElementJsonConst.ItemStructur);
            $scope.clearVariantsData();
            newItemModal.remove();
            $scope.ItemStruct = {};
            $scope.itemsCommonStruct = {};
            $scope.newVal = {};
            if ($rootScope.isAddItemSale === true) {
                $rootScope.isAddItemSale = false;
                navHandler.pop();
            }
            destroyCommonObject();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (newItemModal)
                newItemModal.remove();
            $scope.ItemStruct = {};
            $scope.itemsCommonStruct = {};
            destroyCommonObject();
        });
        // Execute action on hide modal
        $scope.$on('newItemModal.hidden', function () {
            // Execute action
            $scope.elementAddCall = false;
        });
        // Execute action on remove modal
        $scope.$on('newItemModal.removed', function () {
            // Execute action
            $scope.elementAddCall = false;
            // createNewItemModalInstance();
        });
        var modalCalculator;
        $scope.Calculator = function () {
            //$scope.modalCalculator.show();
            if ($scope.bModalIsNotOpen(modalCalculator)) {
                commonUtils
                    .createModalInstance('Common/Calculator.html', 'SalesCntrlr', $scope)
                    .then(function (modal) {
                    modalCalculator = modal;
                });
            }
        };
        $scope.closeCalc = function () {
            modalCalculator.hide();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (modalCalculator)
                modalCalculator.remove();
        });
        // Execute action on hide modal
        $scope.$on('modalCalculator.hidden', function () {
            // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modalCalculator.removed', function () {
            // Execute action
        });
        var onthrgoItemforKit;
        $scope.inputOntheGoItemPrice = function (item) {
            $scope.item = item;
            // onthrgoItemforKit.show();
            if ($scope.bModalIsNotOpen(onthrgoItemforKit)) {
                commonUtils
                    .createModalInstance('Items/onthrgoItemforKit.html', 'ItemsCntrlr', $scope)
                    .then(function (modal) {
                    onthrgoItemforKit = modal;
                });
            }
        };
        $scope.CloseInputOntheGoItemPrice = function () {
            onthrgoItemforKit.remove();
            $scope.ItemStruct.itemNprice = 0;
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (onthrgoItemforKit)
                onthrgoItemforKit.remove();
        });
        // Execute action on hide modal
        $scope.$on('onthrgoItemforKit.hidden', function () {
            // Execute action
            $scope.ItemStruct.itemNprice = 0;
        });
        // Execute action on remove modal
        $scope.$on('onthrgoItemforKit.removed', function () {
            // Execute action
        });
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
        });
        // Execute action on hide modal
        var importModal;
        $scope.openiportItems = function () {
            //TODO: uNCOMMENT This once import is implemented createImportModalInstance();
            if ($scope.bModalIsNotOpen(importModal)) {
                commonUtils
                    .createModalInstance('Common/importCsv.html', 'ItemsCntrlr', $scope)
                    .then(function (modal) {
                    importModal = modal;
                });
            }
        };
        $scope.closeImportModal = function () {
            importModal.remove();
        };
        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function () {
            if (importModal)
                importModal.remove();
        });
        // Execute action on hide modal
        $scope.$on('importModal.hidden', function () {
            // Execute action
            $scope.importErrors = [];
        });
        // Execute action on remove modal
        $scope.$on('importModal.removed', function () {
            // Execute action createImportModalInstance();
            $scope.importErrors = [];
        });
        $scope.myFile = "";
        $scope.uploadFile2 = function (myFile) {
            // console.log(file2Read); itemsServerApis.importItemsApi({   fPath:
            // $rootScope.fPath }).then(function (resp) {   console.log(resp);
            // }).catch($scope.handleError);
            exportImportDataSvc
                .uploadFile2(myFile, 'items/importItems2')
                .then(handelImportSucces)
                .catch($scope.handleError);
        };
        function handelImportSucces(resp) {
            console.log(resp);
            $scope.ImportCustomerMessages = resp[1];
            if (resp[0].length === 0 || resp[1] === 0) {
                REMOVE_MODAL(importModal);
            }
            else {
                $scope.errorMessage = resp[1] + ' Items Failed to import';
                $scope.importErrors = resp[0];
                $scope.failedData = resp[2];
            }
        }
        //Error Handling.. We need to show a message to user
        $scope.uploadFile = function (files, batchFile) {
            var file = files; //$scope.myFile;
            var batchesFile = batchFile;
            var importUrl = 'items/import/';
            var filesToUpload = {
                file: file,
                batchesFile: batchesFile
            };
            // exportImportDataSvc.uploadFile(file, 'items/import');
            // $scope.importModal.hide();
            exportImportDataSvc
                .importItemsWithBatche(filesToUpload, importUrl, true)
                .then(function (resp) {
                $scope.CustDelMsg = resp;
                $scope.importSuccessResponse = resp[1];
                $scope.importErrors = resp[0];
                $timeout(function () {
                    $scope.CustDelMsg = false;
                }, 2000);
                if ($scope.importErrors.length === 0) {
                    importModal.remove();
                }
            })
                .catch($scope.handleError);
        };
        function exportItemsSuss(resp) {
            $rootScope.items_exportData = resp.items;
            console.log(resp);
            exportImportDataSvc.JSONToCSVConvertor($rootScope.items_exportData, "Exported_Items", true);
        }
        $scope.clearSellingPrice = function (OTG) {
            if (OTG == true) {
                $("#selling_price").val("0");
            }
        };
        $scope.exportFile = function () {
            return __awaiter(this, void 0, void 0, function* () {
                $ionicLoading.show({
                    template: '<p>Export Inprogress...</p><ion-spinner icon="spiral"></ion-spinner>',
                    animation: 'fade-in',
                    showBackdrop: true
                });
                let skip = 0;
                let allItemLen = {
                    count: 0
                };
                var itemsExportData = [];
                var barchesExportData = [];
                yield itemsCommonDataSvc.getItemsCount(allItemLen);
                let chunkSize = 100;
                while (true) {
                    var params = {
                        skip: skip,
                        limit: chunkSize
                    };
                    let response = yield itemDataSvc.getFullItemJsonsInChunks(params);
                    if (response.formatResp.length) {
                        let items2Export = response.formatResp; // angular.copy($scope.itemsList);
                        var formatedData = yield $scope.exportDataFormat(items2Export);
                        itemsExportData = itemsExportData.concat(formatedData.itemsArray);
                        barchesExportData = barchesExportData.concat(formatedData.batchesArray);
                    }
                    //traversed all the items
                    if (response.chunkRespLen <= 0) {
                        break;
                    }
                    skip += response.chunkRespLen;
                }
                var excludeFields = ['_id', 'subCategories'];
                var iRequiredFields = [
                    'batchId',
                    'category',
                    'name',
                    'item_number',
                    'quantity',
                    'serialNumber',
                    'imei_1',
                    'imei_2',
                    'imei_3',
                    'imei_4',
                    'purchasePrice',
                    'mrp',
                    'sellingPrice',
                    'discountId',
                    'description',
                    'purchasePrice',
                    'reorderLevel',
                    'reorderQuantity',
                    'hasExpiryDate',
                    'uniqueItemCode',
                    'is_serialized',
                    'isprepared',
                    'issellable',
                    'isbought',
                    'conversionFactor',
                    'discountId',
                    'hasBatchNumber',
                    'bOTG',
                    'bSPTaxInclusive',
                    'bPPTaxInclusive',
                    'hasVariants',
                    'attributes',
                    'ItemType',
                    'hsn',
                    'salesSlab',
                    'purchaseSlab',
                    'density',
                    'imeiCount',
                    'isWarranty',
                    'warranty',
                    'warrantyTerms',
                    'baseUnitId',
                    'defaultPurchaseUnitId',
                    'defaultSellingUnitId',
                    'multipleUnits',
                    'unitsInfo',
                    'categoryInfo',
                    'purchaseUnit',
                    'saleUnit',
                    'discount',
                    'purchaseTaxes',
                    'salesTaxes',
                    'supplier',
                    'images',
                    'bReadQtyFromWeighingMachine'
                ];
                exportImportDataSvc.JSONToCSVConvertor(itemsExportData, "Exported_Items", true, excludeFields, undefined, undefined, iRequiredFields);
                $ionicLoading.hide();
                yield itemDataSvc.loadMoreItems({ skip: $scope.currentPage * $scope.pageSize, limit: $rootScope.mergedConfigurationsData.linesPerPage.value });
            });
        };
        //TO-Do:restaurant remove this filter in itemdatasvc
        $scope.filteredNotSaleableItemList = function () {
            //todo: items
            var itemList = itemDataSvc.getAllItems();
            var itemsCollection = $filter('filter')(itemList, {
                ItemType: '!Prepared'
            }, true);
            return itemsCollection;
        };
        $scope.exportFileTemplate = function () {
            itemDataSvc
                .exportFileTemplate()
                .then(exportFileTemplateSuss)
                .catch(handleError);
        };
        function exportFileTemplateSuss(resp) {
            exportImportDataSvc.saveCSVFile(resp, 'import_items.csv');
        }
        $scope.itemBatches = {};
        $scope.fileReader = function (file) {
            exportImportDataSvc
                .parseFile(file, function (resp) {
                console.log(resp);
            });
        };
        //for barcode page
        $scope.itemsPerPage = $rootScope.mergedConfigurationsData.linesPerPage.value;
        $scope.searchText.searchObj.pageNumber = '';
        $scope.currentPage = 0;
        // in igroup initial lettet 'i' stands for item (we are using this becouse same variable is used in supplier) 
        $scope.igroups = [];
        var groupNames = [];
        var groupIds = [];
        $scope.tabVariables = function (tabScreen) {
            $scope.igroups = [];
            if (tabScreen === 'new') {
                groupNames = ['Basic Details', 'Pricing', 'Taxes', 'Stock Details']; //, 'Loyalty Details'];
                groupIds = ['basic_info', 'pricing', 'item_taxes', 'stock_details']; //, 'loyalty_details'];
            }
            else if (tabScreen === 'detail') {
                groupNames = ['Basic Details', 'Pricing', 'Taxes', 'Stock Details', 'Inventory']; //, 'Loyalty Details'];
                groupIds = ['basic_info', 'pricing', 'item_taxes', 'stock_details', 'inventory_details'];
            }
            else if (tabScreen === 'Prepared') {
                groupNames = ['Basic Details', 'Pricing', 'Taxes', 'Stock Details']; //, 'Loyalty Details'];
                groupIds = ['basic_info', 'pricing', 'item_taxes', 'stock_details'];
            }
            for (var i = 0; i < groupNames.length; i++) {
                $scope.igroups.push({
                    name: groupNames[i],
                    id: groupIds[i]
                });
            }
        };
        $scope.tabVariables('new');
        var tabFirstInputClass = ['basicDetailFirstInput', 'pricingFirstInput', 'taxesFirstInput', 'stockDetailsFirstInput', 'prevClassToFocus'];
        var previousTab = {};
        var nextTab = {};
        $scope.iSelectedTab = { value: "Basic Details" };
        $scope.iSelectTab = function (group) {
            if ($scope.focusOnItemInput) {
                $scope.focusOnFirstInput(group);
            }
            $scope.focusOnItemInput = true;
            if (group.id === 'inventory_details') {
                $scope.showInvdetailsScren();
            }
            else if ($scope.itemEditMode) {
                $scope.viewItem.edit = true;
                $scope.itemDetails = false;
                $scope.viewItem.inventory = false;
                $scope.viewItem.invDetails = false;
            }
            else if ($scope.itemDetailMode) {
                $scope.viewItem.edit = false;
                $scope.itemDetails = true;
                $scope.viewItem.inventory = false;
                $scope.viewItem.invDetails = false;
            }
            // $scope.viewItem.edit = false;
            // $scope.itemDetails = true;
            // $scope.viewItem.inventory = false;
            // $scope.viewItem.invDetails = true;
            $scope.iSelectedTab.value = group.name;
            for (var i = 0; i < $scope.igroups.length; i++) {
                $scope[$scope.igroups[i].id] = false;
            }
            $scope[group.id] = true;
            var tabIndex = groupIds.indexOf(group.id);
            if (tabIndex == 0) {
                previousTab = {};
            }
            else {
                previousTab = $scope.igroups[tabIndex - 1];
            }
            if (tabIndex == $scope.igroups.length - 1) {
                nextTab = {};
            }
            else {
                nextTab = $scope.igroups[tabIndex + 1];
            }
        };
        $scope.iShowBasicDetails = function () {
            $scope.iSelectTab($scope.igroups[0]);
        };
        $scope.nextTabFun = function () {
            var x = nextTab;
            var y = $scope.focusOnItemInput;
            $scope.iSelectTab(nextTab);
            setTimeout(function () {
                if (!y && !angular.element('#NextTabButton').length) {
                    angular.element('.prevClassToFocus').focus();
                }
                else {
                    angular.element('.nextClassToFocus').focus();
                }
            }, 100);
        };
        $scope.previousTabFun = function () {
            var x = previousTab;
            var y = $scope.focusOnItemInput;
            $scope.iSelectTab(previousTab);
            setTimeout(function () {
                if (!y && !angular.element('#previousTabButton').length) {
                    angular.element('.nextClassToFocus').focus();
                }
                else {
                    angular.element('.prevClassToFocus').focus();
                }
            }, 100);
        };
        $scope.focusOnFirstInput = function (group) {
            setTimeout(function () {
                $scope.currentTabFirstInputClass = tabFirstInputClass[groupIds.indexOf(group.id)];
                if ($scope.currentTabFirstInputClass) {
                    focusOnFirstClass($scope.currentTabFirstInputClass);
                }
            }, 150);
        };
        // $scope.showBasicDetails();
        $scope.setCommonObject = function (obj) {
            $scope.currentItemObject = obj;
            if (!$scope.currentItemObject.images || !Array.isArray($scope.currentItemObject.images)) {
                $scope.currentItemObject.images = [];
            }
            $scope.cancelSelectedItemImage();
        };
        const destroyCommonObject = function () {
            $scope.currentItemObject = {};
            $scope.cancelSelectedItemImage(); // cancel selected image
        };
        const showPopUp = function (title, message) {
            $ionicPopup.show({
                template: message,
                title: title,
                scope: $scope,
                buttons: [{
                        text: 'Close'
                    }]
            });
        };
        $scope.currentImageUpload = {};
        var rangeCtr = 0;
        $scope.changeCompressionValue = function (autoAdding) {
            rangeCtr++;
            setTimeout(function () {
                if (--rangeCtr === 0) {
                    $ionicLoading.show();
                    var promises = [fileUtilsSvc.compressImage($scope.currentImageUpload, $scope.currentImageUpload.compression)];
                    promises.push(fileUtilsSvc.compressImage($scope.currentImageUpload, $scope.currentImageUpload.compression * 0.25));
                    $q.all(promises).then(function (resp) {
                        $scope.currentImageUpload.previewImage = resp[0];
                        $scope.currentImageUpload.previewThumbnail = resp[1];
                        if (autoAdding) {
                            $scope.currentItemObject.images.push(angular.copy({
                                localImage: $scope.currentImageUpload.previewImage,
                                localThumbnail: $scope.currentImageUpload.previewThumbnail,
                                autoAdded: true
                            })); // push new image
                        }
                        COMMONFUNC.renderApply($scope);
                        $ionicLoading.hide();
                    }).catch(function (err) {
                        console.error(err);
                        loggerSvc.error(err);
                        showPopUp("Error", '<b class="red">Image Compression Failed</b>');
                        $ionicLoading.hide();
                    });
                }
            }, 500);
        };
        $scope.deleteThisImage = function (imagesArrayIndex) {
            if ($scope.currentItemObject.images[imagesArrayIndex]) {
                $scope.currentItemObject.images.splice(imagesArrayIndex, 1);
            }
        };
        $scope.uploadItemImage = function () {
            if (!configDataSvc.isElectron()) {
                console.log('not electron');
                return;
            }
            const imageObject = {
                localImage: $scope.currentImageUpload.previewImage,
                localThumbnail: $scope.currentImageUpload.previewThumbnail // it is base64 here
            };
            const itemImageArr = $scope.currentItemObject.images;
            if (itemImageArr.length && itemImageArr[itemImageArr.length - 1].autoAdded) {
                itemImageArr[itemImageArr.length - 1] = angular.copy(imageObject); // replace last image if autoadded
            }
            else {
                itemImageArr.push(angular.copy(imageObject)); // new image
            }
            $scope.cancelSelectedItemImage();
            // image upload is happening before calling api in itemsCommonDataSvc
        };
        $scope.cancelSelectedItemImage = function () {
            $scope.currentImageUpload = {};
        };
        $scope.imageSelectedForItem = function (files) {
            if (!$rootScope.mergedConfigurationsData.resources.images.enable) {
                return; // anyway hidden in UI
            }
            $scope.cancelSelectedItemImage();
            const typeSplit = files[0].type.split("/");
            if (files[0].size > $rootScope.mergedConfigurationsData.resources.images.maximumSize) {
                showPopUp("Warning", '<b class="red">Image Size Exceeded. Please Select Image of Less Size</b>');
                return;
            }
            else if (!(typeSplit[0] === 'image' && $rootScope.mergedConfigurationsData.resources.images.allowedTypes.includes(typeSplit[1]))) {
                showPopUp("Warning", '<b class="red">Inavlid Format. Please Selected Valid Image</b>');
                return;
            }
            var scaleFactor = files[0].size / $rootScope.mergedConfigurationsData.resources.images.original.size;
            if (scaleFactor < 1) {
                scaleFactor = 1;
            }
            $scope.currentImageUpload = files[0];
            $scope.currentImageUpload.compression = scaleFactor;
            $scope.changeCompressionValue(true);
        };
        $scope.isTerminalApp = configDataSvc.isTerminalAppNew();
        $timeout(function () {
            var googleDriveSvc = $injector.get('googleDriveSvc');
            $scope.imageFolder = googleDriveSvc.getItemImageFolder();
        }, 100); // just to let UI not stop for googleDriveSvc
    }
})();
