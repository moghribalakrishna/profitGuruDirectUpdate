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
//For disabling Disable Warning Justification:
//Using bracket notation so Google Closure Compiler
/*jshint -W069 */
angular.module('profitGuru')
    .service('itemDataSvc', function (profitGuruPouchSvc, $rootScope, $q, loggerSvc, $timeout, $filter, itemsServerApis, configDataSvc, itemsFormateDataSvc, itemsCommonDataSvc, AppSettingDataSvc, pouchPreChangesHelper, helperSvc, pouchQuerySvc, itemDataSvcV2, $ionicPopup) {
    'use strict';
    let _self = this;
    //Reference  
    //a) https://github.com/raymatos/ng-pouchdb-collection/tree/master/demo/ionic-pouchdb
    //b) https://github.com/danielzen/ng-pouchdb
    function PouchDbItem(item, index) {
        this.$index = index;
        angular.extend(this, item);
    }
    //   [{
    //     "id": 1010,
    //     "_id": "item_1010",
    //     "name": "Hamam",
    //     "categoryId": 1506408058960,
    //     "item_number": "8901030561566",
    //     "ItemType": "Normal",
    //     "baseUnitId":1506179428731,
    //     "stock":10
    //     "unitsInfo": {
    //         "1506179428731": {
    //             "refUnitId": 1506179428731,
    //             "factor": 1,
    //             "pProfilesData": {
    //                 "1525670022645": {
    //                     "sellingPrice": 31
    //                 }
    //             },
    //             "purchasePrice": 28.7,
    //             "mrp": 31
    //         }
    //     },
    //     "batches": { "id_1010_batch_1506690384940": { "barcode": "" } }
    // }]
    //Later add this to configDataSvc
    function cleanUpCollectionsB4syncToNewPouchDB() {
        //Clean up collections  
        fullItemsCollection.length = 0;
        itemInventory.length = 0;
        //Clean Up Indexs
        for (let thisIndex in itemsIndexes) {
            delete itemsIndexes[thisIndex];
        }
        for (let thisIndexInv in itemInventoryIndexes) {
            delete itemInventoryIndexes[thisIndexInv];
        }
        //Clean Up categories
        for (let mainCategory in allCategories) {
            for (let thisCat in allCategories[mainCategory]) {
                delete allCategories[mainCategory][thisCat];
            }
        }
        allSubCategoriesItemCountByCategory = {};
        listenToPouchDbReplicationEvents();
    }
    let itemsCollection = [];
    let fullItemsCollection = [];
    let allUniqueNosMap = {};
    let itemInventory = [];
    let discountList = null;
    let taxesList = null;
    let unitList = null;
    let itemsIndexes = {};
    let itemInventoryIndexes = {};
    /**
     *Todo: Ideally we can have single object for category.
     *Currently categoryList in itemDataSvc and categoryCollection in AppSettingDataSvc.
     *Merge both of them and have as a key, value in AppSettingDataSvc
     */
    let allCategories = itemsCommonDataSvc.allCategories;
    //Items data changes
    let itemEventActions = {
        addItem: 1,
        updateItem: 2,
        deleteItem: 3
    };
    let localPouch_maindb;
    if (!localPouch_maindb) {
        listenToPouchDbReplicationEvents();
    }
    if (configDataSvc.listen2DBChangeEvents()) {
        $rootScope.$on('syncToNewPouchDB', cleanUpCollectionsB4syncToNewPouchDB);
    }
    function updateUniqueNos(inventoryDoc, item_id, bAdd, bDeleted, bUpdate) {
        if (bDeleted || bUpdate) {
            removeUniqueDetails(item_id);
        }
        if (bAdd || bUpdate) {
            loopForUniqueDetails(inventoryDoc);
        }
    }
    const STOCKKEY_UNIQUEDETAILKEY_SEPARATOR = '___';
    function stringifyStockKeyUniqueKey(stockKey, detailKey) {
        return stockKey + STOCKKEY_UNIQUEDETAILKEY_SEPARATOR + detailKey;
    }
    function parseStockKeyUniqueKey(key) {
        let strArr = key.split(STOCKKEY_UNIQUEDETAILKEY_SEPARATOR);
        return {
            stockKey: strArr[0],
            detailKey: strArr[1]
        };
    }
    const addUniqueDetails = (serialnumber, imeiNumbers, stockKey, detailKey) => {
        if (serialnumber) {
            allUniqueNosMap[serialnumber] = stringifyStockKeyUniqueKey(stockKey, detailKey);
        }
        for (let i = 0; i < imeiNumbers.length; i++) {
            allUniqueNosMap[imeiNumbers[i]] = stringifyStockKeyUniqueKey(stockKey, detailKey);
        }
    };
    const removeUniqueDetails = (item_id) => {
        for (let unqiueNo in allUniqueNosMap) {
            let value = allUniqueNosMap[unqiueNo];
            if (value.indexOf('id_' + item_id + '_') !== 0) {
                continue;
            }
            delete allUniqueNosMap[unqiueNo];
        }
    };
    function loopForUniqueDetails(inventoryDoc) {
        let stock = inventoryDoc.stock;
        for (let stockKey in stock) {
            let uniqueDetails = stock[stockKey].uniqueDetails;
            if (!uniqueDetails) {
                continue;
            }
            for (let detailKey in uniqueDetails) {
                if (!uniqueDetails[detailKey].itemAvailable || uniqueDetails[detailKey].sold) {
                    continue;
                }
                let serialnumber = uniqueDetails[detailKey].info.serialnumber;
                let imeiNumbers = uniqueDetails[detailKey].info.imeiNumbers;
                if (!imeiNumbers) {
                    imeiNumbers = [];
                }
                addUniqueDetails(serialnumber, imeiNumbers, stockKey, detailKey);
            }
        }
    }
    function handleItemsChange(change) {
        //format new db structure to old db structure
        clearSearchProp();
        let bDeleted = false;
        if (change.deleted) {
            bDeleted = change.deleted;
        }
        else if (change.doc && change.doc.deleted && change.doc.deleted === '1') {
            bDeleted = true;
        }
        if (!bDeleted) {
            let itemDoc = itemsFormateDataSvc.formatShortItem(change.doc);
            if (itemsIndexes[change.id] === undefined) { // CREATE
                let tempDbItem = new PouchDbItem(itemDoc, fullItemsCollection.length);
                addChild(fullItemsCollection.length, tempDbItem, itemsIndexes, fullItemsCollection); // Add to end    
                updateCategoriesList(itemEventActions.addItem, tempDbItem, change.doc._rev);
            }
            else { // UPDATE
                let index = itemsIndexes[change.id];
                let item = new PouchDbItem(itemDoc, index);
                updateCategoriesList(itemEventActions.updateItem, item, change.doc._rev);
                updateChild(index, item, fullItemsCollection);
            }
            syncData(change.doc._id);
        }
        else if (fullItemsCollection.length && itemsIndexes[change.id] !== undefined) { //Last case i           
            console.log("Delete");
            //Need to decrement the category Item count, if its the only Item in the category need to delete the category too
            let itemBeingDeleted = _self.getItemCollectionItemById(change.id);
            updateCategoriesList(itemEventActions.deleteItem, itemBeingDeleted, change.doc._rev);
            updateIndexes(removeChild(change.id, itemsIndexes, fullItemsCollection), itemsIndexes, fullItemsCollection, undefined);
        }
        let docType = change.doc._id.substring(0, change.doc._id.indexOf('_'));
        if (docType in rendeFunctionsMap) {
            rendeFunctionsMap[docType]();
        }
    }
    function handleInventoryChange(change) {
        let bDeleted = false;
        if (change.deleted) {
            bDeleted = change.deleted;
        }
        else if (change.doc && change.doc.deleted === '1') {
            bDeleted = true;
        }
        if (!bDeleted) {
            let inventoryDoc = change.doc;
            change.doc = itemsFormateDataSvc.formatShortInventory(inventoryDoc);
            let bAdd;
            let bUpdate;
            if (itemInventoryIndexes[change.id] === undefined) { // CREATE / READ
                bAdd = true;
                addChild(itemInventory.length, new PouchDbItem(change.doc, itemInventory.length), itemInventoryIndexes, itemInventory); // Add to end              
                //updateIndexes(0, itemInventoryIndexes, itemInventory);
            }
            else { // UPDATE
                bUpdate = true;
                let index = itemInventoryIndexes[change.id];
                let item = new PouchDbItem(change.doc, index);
                updateChild(index, item, itemInventory);
            }
            updateUniqueNos(inventoryDoc, change.id.split('_')[1], bAdd, false, bUpdate);
            syncData(change.doc._id);
        }
        else if (itemInventory.length && itemInventoryIndexes[change.id] !== undefined) { //DELETE
            updateUniqueNos(undefined, change.id.split('_')[1], false, true, false);
            updateIndexes(removeChild(change.id, itemInventoryIndexes, itemInventory), itemInventoryIndexes, itemInventory, undefined);
        }
        let docType = change.doc._id.substring(0, change.doc._id.indexOf('_'));
        if (docType in rendeFunctionsMap) {
            rendeFunctionsMap[docType]();
        }
    }
    var rendeFunctionsMap = {};
    this.registerForRenderApply = function (type, func) {
        rendeFunctionsMap[type] = func;
    };
    this.unregisterRenderApply = function (docType) {
        if (rendeFunctionsMap[docType]) {
            delete rendeFunctionsMap[docType];
        }
    };
    function listenToPouchDbReplicationEvents() {
        localPouch_maindb = profitGuruPouchSvc.getThisLocalPouchDB('maindb');
        if (localPouch_maindb) {
            pouchPreChangesHelper.listenToMainDBChanges({ docType: 'item', handleChangesFoo: handleItemsChange });
            pouchPreChangesHelper.listenToMainDBChanges({ docType: 'inventory', handleChangesFoo: handleInventoryChange });
        }
    }
    let allSubCategoriesItemCountByCategory = {};
    this.getAllCategories = function () {
        return allCategories;
    };
    this.getAllCategoriesAsArray = function () {
        let vals = [];
        Object.keys(allCategories.categoryList).map(function (key) {
            vals.push(allCategories.categoryList[key]);
        });
        return vals;
    };
    //Note Even using categoryList: {} variable and updating it here would achieve automatic
    //scope.apply in UI, as it has many categories i have considered this
    //Accidentaly I did not see the cats getting updated on UI automatically when
    //return JSON and assigned scope JSON had same name
    function deltaSubCategoryCount(subCategoriesKey, categoryId, key, delta) {
        if (!subCategoriesKey) {
            return;
        }
        let subCateogryIdArr = subCategoriesKey.split('_');
        //first and last will be empty because of appending '_'
        for (let i = 1; i < subCateogryIdArr.length - 1; i++) {
            let subCatId = subCateogryIdArr[i];
            initSubCatCat(subCatId, categoryId);
            allSubCategoriesItemCountByCategory[subCatId][categoryId][key] += delta;
        }
    }
    function initSubCatCat(subCatId, categoryId) {
        if (!allSubCategoriesItemCountByCategory[subCatId]) {
            allSubCategoriesItemCountByCategory[subCatId] = {};
        }
        if (!allSubCategoriesItemCountByCategory[subCatId][categoryId]) {
            allSubCategoriesItemCountByCategory[subCatId][categoryId] = initSubCategoryCount();
        }
    }
    function initSubCategoryCount() {
        return {
            itemCount: 0,
            liquorCount: 0,
            ingredientsCount: 0,
            preparedItemsCount: 0,
            normalItemsCount: 0,
            purchaseItemCount: 0,
            salesItemCount: 0,
            bomCount: 0
        };
    }
    function deltaItemCount(categoryObj, item, delta, rev) {
        let itemType = item.ItemType;
        let countKeys = ['itemCountExSubCategory', 'purchaseItemCountExSubCategory', 'saleItemCountExSubCategory', 'ingredientsCount', 'liquorCount', 'normalItemsCount', 'preparedItemsCount', 'bomCount', 'bomCountExSubCategory'];
        for (let i = 0; i < countKeys.length; i++) {
            if (categoryObj[countKeys[i]] === undefined) {
                categoryObj[countKeys[i]] = 0;
            }
        }
        categoryObj.itemCount = categoryObj.itemCount + delta;
        deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'itemCount', delta);
        if (!item.subCategoriesKey) {
            categoryObj.itemCountExSubCategory = categoryObj.itemCountExSubCategory + delta;
        }
        let g_itemType = $rootScope.mergedConfigurationsData.itemType;
        switch (itemType) {
            case g_itemType.Ingredient:
                categoryObj.purchaseItemCount = categoryObj.purchaseItemCount + delta;
                categoryObj.ingredientsCount = categoryObj.ingredientsCount + delta;
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'ingredientsCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'purchaseItemCount', delta);
                if (!item.subCategoriesKey) {
                    categoryObj.purchaseItemCountExSubCategory = categoryObj.purchaseItemCountExSubCategory + delta;
                }
                break;
            case g_itemType.Liquor:
                categoryObj.purchaseItemCount = categoryObj.purchaseItemCount + delta;
                categoryObj.salesItemCount = categoryObj.salesItemCount + delta;
                categoryObj.liquorCount = categoryObj.liquorCount + delta;
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'liquorCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'purchaseItemCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'salesItemCount', delta);
                if (!item.subCategoriesKey) {
                    categoryObj.purchaseItemCountExSubCategory = categoryObj.purchaseItemCountExSubCategory + delta;
                    categoryObj.saleItemCountExSubCategory = categoryObj.saleItemCountExSubCategory + delta;
                }
                break;
            case g_itemType.Prepared:
                categoryObj.salesItemCount = categoryObj.salesItemCount + delta;
                categoryObj.preparedItemsCount = categoryObj.preparedItemsCount + delta;
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'salesItemCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'preparedItemsCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'bomCount', delta);
                if (!item.subCategoriesKey) {
                    categoryObj.saleItemCountExSubCategory = categoryObj.saleItemCountExSubCategory + delta;
                    if (item.bHasBOMData) {
                        categoryObj.bomCountExSubCategory = categoryObj.bomCountExSubCategory + delta;
                    }
                }
                if (item.bHasBOMData) {
                    categoryObj.bomCount = categoryObj.bomCount + delta;
                }
                break;
            case g_itemType.Normal:
                categoryObj.purchaseItemCount = categoryObj.purchaseItemCount + delta;
                categoryObj.salesItemCount = categoryObj.salesItemCount + delta;
                categoryObj.normalItemsCount = categoryObj.normalItemsCount + delta;
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'normalItemsCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'purchaseItemCount', delta);
                deltaSubCategoryCount(item.subCategoriesKey, item.categoryId, 'salesItemCount', delta);
                if (!item.subCategoriesKey) {
                    categoryObj.purchaseItemCountExSubCategory = categoryObj.purchaseItemCountExSubCategory + delta;
                    categoryObj.saleItemCountExSubCategory = categoryObj.saleItemCountExSubCategory + delta;
                }
                break;
        }
    }
    function handleUpdateAndDeleteCategories(categoryList, event, thisItem) {
        let oldItem = _self.getItemCollectionItemById(thisItem._id);
        //take the action depending on the event
        if (itemEventActions.updateItem === event) {
            //Need to check whether category is being updated
            let newCategory = thisItem.categoryId;
            let oldCategory = oldItem.categoryId;
            if (oldCategory !== newCategory) {
                deltaItemCount(categoryList[oldCategory], oldItem, -1, undefined);
                deltaItemCount(categoryList[newCategory], thisItem, 1, undefined);
            }
            else if (oldItem.ItemType !== thisItem.ItemType) {
                deltaItemCount(categoryList[oldCategory], oldItem, -1, undefined);
                deltaItemCount(categoryList[oldCategory], thisItem, 1, undefined);
            }
            else if (oldItem.subCategoriesKey !== thisItem.subCategoriesKey) {
                deltaItemCount(categoryList[oldCategory], oldItem, -1, undefined);
                deltaItemCount(categoryList[oldCategory], thisItem, 1, undefined);
            }
        }
        else if (itemEventActions.deleteItem === event) {
            let categoryOftheItem2Delete = oldItem.categoryId;
            deltaItemCount(categoryList[categoryOftheItem2Delete], oldItem, -1, undefined);
        }
    }
    this.getCategoryItemList = function () {
        return itemsCommonDataSvc.allCategories.categoryList;
    };
    //This function is written to sync name from AppSettingDataSvc
    //g_itemType.Ingredient
    //TodoVS: categoryList Json changed. modify ui changes
    // vijay - need kt for (categoryList4SellableItemsResturant,categoryList4Recevings,categoryList4Ingrediants)
    function updateCategoriesList(event, thisItem, rev) {
        if (!allCategories.categoryList[thisItem.categoryId]) {
            allCategories.categoryList[thisItem.categoryId] = itemsCommonDataSvc.getCategoryJson();
        }
        if (itemEventActions.addItem === event) {
            deltaItemCount(allCategories.categoryList[thisItem.categoryId], thisItem, 1, rev);
        }
        else {
            handleUpdateAndDeleteCategories(allCategories.categoryList, event, thisItem);
        }
    }
    function addChild(index, item, thisIndexes, collection) {
        thisIndexes[item._id] = index;
        collection.splice(index, 0, item);
    }
    this.getItemCollectionItemById = function (itemId) {
        return fullItemsCollection[itemsIndexes[itemId]];
    };
    this.getBulkItemsAndInventoryDocsInChunks = (iOffset, iChunkLength) => __awaiter(this, void 0, void 0, function* () {
        let start = +new Date;
        let respArr1 = (yield pouchQuerySvc.queryAllDocsByType(localPouch_maindb, undefined, {
            limit: iChunkLength,
            skip: iOffset,
            startkey: 'item_',
            endkey: 'item_z'
        }, true, true)).rows;
        let end = +new Date;
        console.log("get items =====", end - start);
        let start1 = +new Date;
        let respArr2 = (yield pouchQuerySvc.queryAllDocsByType(localPouch_maindb, undefined, {
            limit: iChunkLength,
            skip: iOffset,
            startkey: 'inventory_',
            endkey: 'inventory_z'
        }, true, true)).rows;
        let end1 = +new Date;
        console.log("get inv docs =====", end1 - start1);
        if (respArr1.length !== respArr2.length) {
            loggerSvc.error('getBulkItemAndInventoryDocs<' + iOffset + '> <' + iChunkLength + '> mismatch. ItemsLength<' + respArr1.length + '> InventoryLength<' + respArr2.length + '>');
            throw 'Contact Support Team. Items Issue.';
        }
        let itemDocsArr = [];
        let inventoryDocsArr = [];
        let start2 = +new Date;
        for (let i = 0; i < respArr1.length; i++) {
            const itemDoc = respArr1[i].doc;
            if (itemDoc.deleted) {
                continue;
            }
            const inventoryDoc = respArr2[i].doc;
            if (inventoryDoc._id.replace('inventory', 'item') !== itemDoc._id) {
                loggerSvc.error('getBulkItemAndInventoryDocs<' + iOffset + '> <' + iChunkLength + '> mismatch. ItemDocId<' + itemDoc._id + '> InventoryDocId<' + inventoryDoc._id + '>');
                throw 'Contact Support Team. Items Issue.';
            }
            itemDocsArr.push(itemDoc);
            inventoryDocsArr.push(inventoryDoc);
        }
        let end2 = +new Date;
        console.log("check items and inventory docs ======", end2 - start2);
        return [itemDocsArr, inventoryDocsArr];
    });
    this.getBulkItemAndInventoryDocsByItemDocIds = function (itemDataArr) {
        return __awaiter(this, void 0, void 0, function* () {
            let start = +new Date;
            let itemDocsArr = [];
            let inventoryDocsArr = [];
            let itemDocIdsArr = [];
            let inventoryDocIdArr = [];
            for (let i = 0; i < itemDataArr.length; i++) {
                const itemDocId = itemDataArr[i]._id;
                itemDocIdsArr.push(itemDocId);
                inventoryDocIdArr.push(itemDocId.replace('item', 'inventory'));
            }
            const iChunkLength = 100;
            let iOffset = 0;
            while (true) {
                if (iOffset > itemDocIdsArr.length) {
                    break;
                }
                let docIdArr = itemDocIdsArr.slice(iOffset, iOffset + iChunkLength);
                Array.prototype.push.apply(docIdArr, inventoryDocIdArr.slice(iOffset, iOffset + iChunkLength));
                let respRowsArr;
                try {
                    let start = +new Date;
                    respRowsArr = yield pouchQuerySvc.getBulkData('', docIdArr, localPouch_maindb, true);
                    let end2 = +new Date;
                    console.log("check items and inventory docs ======", end2 - start);
                }
                catch (error) {
                    loggerSvc.error('getBulkItemAndItemQuantityJson. Bulk Fetch Failed');
                    throw 'Try Again Later.';
                }
                let iTotalNoOfDocs = respRowsArr.length;
                let errorsArr = [];
                for (let i = 0; i < iTotalNoOfDocs / 2; i++) {
                    if (!respRowsArr[i].doc) {
                        errorsArr.push(docIdArr[i]);
                        continue;
                    }
                    const itemDoc = respRowsArr[i].doc;
                    itemDocsArr.push(itemDoc);
                }
                if (errorsArr.length) {
                    loggerSvc.error(errorsArr);
                    loggerSvc.error('getBulkItemAndItemQuantityJson. few item docs fetch failed.');
                    throw 'Try Again Later';
                }
                for (let i = iTotalNoOfDocs / 2; i < iTotalNoOfDocs; i++) {
                    if (!respRowsArr[i].doc) {
                        errorsArr.push(docIdArr[i]);
                        continue;
                    }
                    let inventoryDoc = respRowsArr[i].doc;
                    inventoryDocsArr.push(inventoryDoc);
                }
                if (errorsArr.length) {
                    loggerSvc.error(errorsArr);
                    loggerSvc.error('getBulkItemAndItemQuantityJson. few inventory docs fetch failed.');
                    throw 'Try Again Later';
                }
                iOffset += iChunkLength;
            }
            return [itemDocsArr, inventoryDocsArr];
        });
    };
    this.getFullItemJson = function (itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (typeof itemId !== 'string') {
                    itemId = 'item_' + itemId;
                }
                let resp = yield pouchQuerySvc.queryDocById(itemId, localPouch_maindb);
                let itemDoc = itemsFormateDataSvc.formatItemData(resp);
                itemDoc.quantity = itemInventory[itemInventoryIndexes['inventory_' + itemDoc.item_id]].quantity;
                return itemDoc;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getFullItemJson::not expected to come here.');
            }
        });
    };
    this.getItemImageView = () => __awaiter(this, void 0, void 0, function* () {
        try {
            const viewResp = yield pouchQuerySvc.queryDocsByViewName("all_items_data", "item-all-images", undefined, localPouch_maindb);
            return viewResp;
        }
        catch (err) {
            throw err;
        }
    });
    this.getItemQuantityItemById = function (itemId) {
        //use _self.getItemQutityObj();
        throw 'getItemQuantityItemById::sai removed. fetch from db';
    };
    this.getOnlyBatchByItemId = function (itemId) {
        throw 'getOnlyBatchByItemId::sai removed. fetch from db';
    };
    this.getItemByBarcodeNumber = function (barcodeNumber) {
        for (let i = 0; i < fullItemsCollection.length; i++) {
            if (!isNaN(barcodeNumber) && parseInt(fullItemsCollection[i].item_number).toString() === parseInt(barcodeNumber).toString()) {
                return fullItemsCollection[i];
            }
        }
        return {};
    };
    this.getItemByBarcodeNew = function (barcode) {
        let matchFun;
        switch ($rootScope.mergedConfigurationsData.salesConfig.barcodeMatchType) {
            case 'Ignore Case':
                matchFun = function (item) {
                    return item.item_number.toLowerCase() === barcode.toLowerCase();
                };
                break;
            case 'Ignore Outer Spaces':
                matchFun = function (item) {
                    return item.item_number.trimRight().trimLeft() === barcode.trimLeft().trimRight();
                };
                break;
            case 'Ignore Outer Spaces And Case':
                matchFun = function (item) {
                    return item.item_number.trimRight().trimLeft().toLowerCase() === barcode.trimLeft().trimRight().toLowerCase();
                };
                break;
            default:
                matchFun = function (item) {
                    return item.item_number === barcode;
                };
        }
        let searchResult = $filter('filter')(fullItemsCollection, matchFun, true);
        return searchResult ? searchResult : [];
    };
    this.getItemIDFromBarcode = function (barcode) {
        let allDelimeterIndices = findAllIndex(barcode, ':');
        let itemId;
        if (allDelimeterIndices && allDelimeterIndices.length && barcode.length > 1) {
            itemId = parseInt(barcode.substr(1, allDelimeterIndices[1]));
        }
        return itemId;
    };
    this.getSubCatategoryByCategoryId = function (catId) {
        let selectedCategory = _self.getCategoryById(catId);
        let allSubCategory = AppSettingDataSvc.getAllSubCategory();
        let subCatObjList = [];
        for (let i = 0; i < allSubCategory.length; i++) {
            let curSubCat = allSubCategory[i];
            if (selectedCategory.subCat && selectedCategory.subCat.indexOf(curSubCat.id) > -1) {
                initSubCatCat(curSubCat.id, catId);
                curSubCat.itemCount = allSubCategoriesItemCountByCategory[curSubCat.id][catId].itemCount;
                curSubCat.purchaseItemCount = allSubCategoriesItemCountByCategory[curSubCat.id][catId].purchaseItemCount;
                curSubCat.salesItemCount = allSubCategoriesItemCountByCategory[curSubCat.id][catId].salesItemCount;
                subCatObjList.push(curSubCat);
            }
        }
        return subCatObjList;
    };
    function findAllIndex(str, key) {
        let indices = [];
        for (let i = 0; i < str.length; i++) {
            if (str[i] === key)
                indices.push(i);
        }
        return indices;
    }
    this.createSystemGeneratedBarcodeNew = function (item_id, batch) {
        let barcode = ':' + item_id;
        let attributeInfo = batch.attributeInfo;
        if (attributeInfo) {
            for (let attributeId in attributeInfo) {
                barcode += ':' + attributeInfo[attributeId];
            }
        }
        return barcode;
    };
    this.getItemByItemCode = function (itemCode) {
        for (let i = 0; i < fullItemsCollection.length; i++) {
            if (fullItemsCollection[i].uniqueItemCode && fullItemsCollection[i].uniqueItemCode.toString() == itemCode.toString()) {
                return fullItemsCollection[i];
            }
        }
        return {};
    };
    this.getItemInventoryById = function (id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield pouchQuerySvc.queryDocById(id, localPouch_maindb);
                let invDoc = itemsFormateDataSvc.formatInventoryData(resp);
                return invDoc;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getItemInventoryById::Not Expected To Come Here.');
            }
        });
    };
    this.getItemInventoryDoc = function (id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield pouchQuerySvc.queryDocById(id, localPouch_maindb);
                return resp;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getItemInventoryDoc::Not Expected To Come Here.');
            }
        });
    };
    function removeChild(id, thisIndexes, collection) {
        let index = thisIndexes[id];
        // Remove the item from the collection
        collection.splice(index, 1);
        thisIndexes[id] = undefined;
        //delete thisIndexes[id]
        console.log('removed: ', id);
        return index;
    }
    function updateChild(index, item, collection) {
        collection[index] = item;
    }
    /*
     *Update Quantity, Description
     */
    function syncData(docId) {
        //extract id example item_1 itemquantity_1 and then query the related ids from itemcollection and itemquantity
        let id = '';
        let uidx;
        if ((uidx = docId.indexOf("_")) > 0) {
            id = docId.substring(uidx + 1);
        }
        if (id === '')
            return;
        let itemIndex = itemsIndexes['item_' + id];
        if (itemIndex === undefined) {
            return;
        }
        let inventoryIndex_ = itemInventoryIndexes['inventory_' + id];
        if (inventoryIndex_ === undefined) {
            return;
        }
        fullItemsCollection[itemIndex].quantity = itemInventory[inventoryIndex_].quantity;
    }
    function searchUniqueNo(searchText) {
        return __awaiter(this, void 0, void 0, function* () {
            let key = allUniqueNosMap[searchText];
            if (!key) {
                //no match found
                return 0;
            }
            let { stockKey, detailKey } = parseStockKeyUniqueKey(key);
            let item_id = stockKey.split('_')[1];
            let itemDocId = 'item_' + item_id;
            let inventoryDocId = 'inventory_' + item_id;
            try {
                let respArr = yield pouchQuerySvc.getBulkData('', [itemDocId, inventoryDocId], localPouch_maindb, true);
                let fullItemJson = itemsFormateDataSvc.formatItemData(respArr[0].doc);
                let batches = respArr[0].doc.batches[stockKey];
                let uniqueDetails = respArr[1].doc.stock[stockKey].uniqueDetails[detailKey];
                return {
                    data: fullItemJson,
                    batches: batches,
                    uniqueDetails: uniqueDetails
                };
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('searchUniqueNo:Not Expected To Come Here.');
                return 0; //no match found
            }
        });
    }
    this.getItemQutity = function (id) {
        throw 'getItemQutity::sai removed. fetch from db';
    };
    /*
      Do we need to do this ourselves. Is there some datastructure to do this for us?
    */
    function updateIndexes(from, thisIndexes, collection, to) {
        let length = collection.length;
        to = to || length;
        if (to > length) {
            to = length;
        }
        for (let index = from; index < to; index++) {
            let item = collection[index];
            item.$index = thisIndexes[item._id] = index;
        }
        //afterChangeCompleteCallBack();
    }
    this.getItemElementJson = function () {
        let defered = $q.defer();
        defered.resolve(configDataSvc.getProfitGuruElement('ItemsElements'));
        return defered.promise;
    };
    this.exportFile = function () {
        return itemsServerApis.exportItems();
    };
    this.exportFileTemplate = function () {
        return itemsServerApis.exportItemsTemplate();
    };
    this.getFilteredItemsCollection = function () {
        return itemsCollection;
    };
    this.getAllItems = function () {
        clearSearchProp();
        search('', undefined, undefined, undefined, undefined, undefined, '', undefined, undefined, $rootScope.mergedConfigurationsData.linesPerPage.value, 0);
        return itemsCollection;
    };
    function copyToItemsCollection(itemsArr) {
        itemsCollection.length = 0;
        Array.prototype.push.apply(itemsCollection, itemsArr);
    }
    this.loadMoreItems = function (params) {
        search('', undefined, undefined, undefined, undefined, undefined, '', undefined, undefined, params.limit, params.skip);
    };
    this.loadMoreCategoryItems = function (params, bNoSubCategory, type) {
        let skip = params.skip ? params.skip : 0;
        let limit = params.limit ? params.limit : $rootScope.mergedConfigurationsData.linesPerPage.value;
        let bHasBOMData = undefined;
        if ($rootScope.currentState === 'app.createProdPlan') {
            bHasBOMData = true;
        }
        if (params.subCategory) {
            bNoSubCategory = false;
        }
        else {
            bNoSubCategory = true;
        }
        search('', undefined, undefined, undefined, params.category, params.subCategory, type, bHasBOMData, bNoSubCategory, limit, skip);
        return;
    };
    let bSearchInProgress = false;
    this.findByItemCode = function (searchStr, limit, skip, cId, subCatId, type, bHasBOMData, bNoSubCategory) {
        return search(searchStr, undefined, undefined, searchStr, cId, subCatId, type, bHasBOMData, bNoSubCategory, limit, skip);
    };
    this.findByName = function (searchStr, limit, skip, cId, subCatId, type, bHasBOMData, bNoSubCategory) {
        return search(searchStr, searchStr, undefined, undefined, cId, subCatId, type, bHasBOMData, bNoSubCategory, limit, skip);
    };
    this.findByAll = function (searchStr, limit, skip, cId, subCatId, type, bHasBOMData, bNoSubCategory) {
        return search(searchStr, searchStr, searchStr, searchStr, cId, subCatId, type, bHasBOMData, bNoSubCategory, limit, skip);
    };
    this.findByBarcode = function (searchStr, limit, skip, cId, subCatId, type, bHasBOMData, bNoSubCategory) {
        return search(searchStr, undefined, searchStr, undefined, cId, subCatId, type, bHasBOMData, bNoSubCategory, limit, skip);
    };
    this.addSerialNoOrImeiItemInCart = function (searchtext) {
        _self.getAllItems(); //This is to reset previous search params and any other variables. It doesnt do any computations. just reset of variables
        // searchAndAddItemByUniqueDetails(type, searchtext);
        return searchUniqueNo(searchtext);
    };
    this.getFullItemJsonsInChunks = function (params, errMsg) {
        return __awaiter(this, void 0, void 0, function* () {
            let paramObject = {
                startkey: 'item_',
                endkey: 'item_z',
                limit: params.limit,
                skip: params.skip,
                include_docs: true
            };
            try {
                let resp = yield localPouch_maindb.allDocs(paramObject);
                let formattedItemDocs = [];
                for (let i = 0; i < resp.rows.length; i++) {
                    if (resp.rows[i].doc.deleted) {
                        continue;
                    }
                    let itemDoc = itemsFormateDataSvc.formatItemData(resp.rows[i].doc);
                    itemDoc.quantity = itemInventory[itemInventoryIndexes['inventory_' + itemDoc.item_id]].quantity;
                    formattedItemDocs.push(itemDoc);
                }
                return {
                    formatResp: formattedItemDocs,
                    chunkRespLen: resp.rows.length
                };
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getFullItemJsonsInChunks::not expected to come here.');
            }
            ;
        });
    };
    //this function will be called right after search
    this.getBarcodeMatchedBatchRespForSalesAddToCart = function (searchStr) {
        return __awaiter(this, void 0, void 0, function* () {
            if (itemsCollection.length !== 1) {
                return;
            }
            let iMatchedStockKeyIndex = -1;
            let item = itemsCollection[0];
            let iStockKeyCount = -1;
            let batchCount = 0;
            for (let stockKey in item.batches) {
                iStockKeyCount++;
                if (item.batches[stockKey].barcode !== searchStr) {
                    continue;
                }
                iMatchedStockKeyIndex = iStockKeyCount;
                batchCount += 1;
            }
            if (iMatchedStockKeyIndex === -1 || batchCount > 1) {
                return;
            }
            let itemDoc;
            try {
                itemDoc = yield pouchQuerySvc.queryDocById(item._id, localPouch_maindb);
            }
            catch (error) {
                loggerSvc.error('not expected to come here. getBarcodeMatchedBatchRespForSalesAddToCart');
                return;
            }
            let formattedItem = itemsFormateDataSvc.formatItemData(itemDoc);
            itemDoc.quantity = itemInventory[itemInventoryIndexes['inventory_' + itemDoc.item_id]].quantity;
            let invDoc = yield pouchQuerySvc.queryDocById('inventory_' + itemDoc.item_id, localPouch_maindb);
            let formattedBatchData = itemsFormateDataSvc.getFormattedBatchDataFromItem(itemDoc, invDoc);
            return {
                item: formattedItem,
                batch: formattedBatchData.batches[iMatchedStockKeyIndex]
            };
        });
    };
    function getExcludeItemType() {
        let excludeItemType = '';
        if ($rootScope.appType !== 'restaurant') {
            return excludeItemType;
        }
        switch ($rootScope.currentState) {
            case 'app.takeAway':
            case 'app.sales':
            case 'app.takeOrder':
            case 'app.abstractSales':
            case 'app.restaurantRefinment':
                excludeItemType = 'Ingredient';
                break;
            case 'app.receivings':
                excludeItemType = 'Prepared';
                break;
            case 'app.items':
                if ($rootScope.bInventoryCheckView) {
                    excludeItemType = 'Prepared';
                }
                break;
            default:
                break;
        }
        return excludeItemType;
    }
    function isItSubCategoryView() {
        if ($rootScope.clientType === "MobileApp") {
            return false;
        }
        switch ($rootScope.currentState) {
            case 'app.takeAway':
            case 'app.sales':
            case 'app.items':
            case 'app.abstractSales':
                return true;
                break;
            case 'app.receivings':
                break;
            default:
                break;
        }
        return false;
    }
    function escapeRegExp(text) {
        if (!text) {
            return;
        }
        return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
    }
    const I_SEARCH_MEMORY_LIMIT = 500;
    function search(searchStr, name, barcode, uniqueItemCode, cId, subCatId, type, bHasBOMData, bNoSubCategory, iLimit, iSkip) {
        if ($rootScope.currentState === 'app.createProdPlan') {
            bHasBOMData = true;
        }
        let excludedType = getExcludeItemType();
        if (bSearchInProgress) {
            return;
        }
        bSearchInProgress = true;
        if (isEmptySearch(searchStr, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory)) {
            clearSearchProp();
            copyToItemsCollection(fullItemsCollection.slice(iSkip, iSkip + iLimit));
            bSearchInProgress = false;
            return;
        }
        if (isSearchPropSame(searchStr, name, barcode, uniqueItemCode, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory)) {
            copyToItemsCollection(prevItemCollection.slice(iSkip, iSkip + iLimit));
            bSearchInProgress = false;
            return;
        }
        saveSearchProp(searchStr, name, barcode, uniqueItemCode, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory);
        prevItemCollection = [];
        let nameRegExp;
        if (name) {
            try {
                name = escapeRegExp(name);
                nameRegExp = new RegExp(name.replace(' ', '.*?'), 'i');
            }
            catch (err) {
                //@ts-ignore
                nameRegExp = name;
                loggerSvc.error(err);
            }
        }
        let barcodeRegExp;
        if (name === barcode) {
            try {
                //find by all .. so we are allowing wild match
                barcode = escapeRegExp(barcode);
                barcodeRegExp = new RegExp(barcode, 'i');
            }
            catch (err) {
                loggerSvc.error(err);
            }
        }
        let iItemsCount = fullItemsCollection.length;
        let iMatchedCount = 0;
        for (let i = 0; i < iItemsCount; i++) {
            let item = fullItemsCollection[i];
            if (!isMatch(item, searchStr, cId, subCatId, name, nameRegExp, barcode, barcodeRegExp, uniqueItemCode, type, excludedType, bHasBOMData, bNoSubCategory)) {
                continue;
            }
            iMatchedCount++;
            if (iSkip) {
                if (iMatchedCount <= iSkip) {
                    continue;
                }
            }
            prevItemCollection.push(item);
            if (iMatchedCount === I_SEARCH_MEMORY_LIMIT || (iSkip && iSkip + iLimit === iMatchedCount)) {
                //we will not search more and keep in memory
                break;
            }
        }
        //we are not using iSkip below because we already skipped
        copyToItemsCollection(prevItemCollection.slice(0, iLimit));
        if (prevItemCollection.length === I_SEARCH_MEMORY_LIMIT || iSkip) {
            //let it compute again. we wont save in memory
            //if iSkip is specified it is not fresh. so we will not save in memory
            prevItemCollection = [];
            clearSearchProp();
        }
        bSearchInProgress = false;
    }
    this.validateUniqueItemCode = function (uniqueItemCode, itemId) {
        let iItemsCount = fullItemsCollection.length;
        for (let i = 0; i < iItemsCount; i++) {
            let item = fullItemsCollection[i];
            if (itemId === item.id) {
                continue;
            }
            ;
            if (isMatch(item, true, '', '', '', undefined, '', undefined, uniqueItemCode, '', '', undefined, undefined)) {
                return true;
            }
        }
        return false;
    };
    function clearSearchProp() {
        saveSearchProp('', '', '', '', '', '', '', '', undefined, undefined);
    }
    function isMatch(item, searchStr, cId, subCatId, name, nameRegExp, barcode, barcodeRegExp, uniqueItemCode, type, excludedType, bHasBOMData, bNoSubCategory) {
        if (cId && item.categoryId != cId) {
            return false;
        }
        if (subCatId && item.subCategoriesKey.indexOf('_' + subCatId + '_') === -1) {
            return false;
        }
        if (bNoSubCategory !== undefined && $rootScope.mergedConfigurationsData.itemSettings.showSubCategoryWiseItems && isItSubCategoryView()) {
            if (bNoSubCategory && item.subCategoriesKey) {
                //bNoSubCategory is true but subcategories exist
                return false;
            }
            if (!bNoSubCategory && !item.subCategoriesKey) {
                return false;
            }
        }
        if (type && item.ItemType !== type) {
            return false;
        }
        if (excludedType && item.ItemType === excludedType) {
            return false;
        }
        try {
            if (name && item.name.search(nameRegExp) > -1) {
                return true;
            }
        }
        catch (err) {
        }
        if (uniqueItemCode && item.uniqueItemCode == uniqueItemCode) {
            return true;
        }
        if (barcode && isBarcodeMatchInShortItem(item, barcode, barcodeRegExp)) {
            return true;
        }
        if (bHasBOMData !== undefined && item.bHasBOMData !== bHasBOMData) {
            return false;
        }
        if (!searchStr) {
            //this will be used to just get category or by type
            return true;
        }
        return false;
    }
    function isBarcodeMatchInShortItem(item, searchStr, barcodeRegExp) {
        let comparisonFoo = getBarcodeSearchFun(searchStr, barcodeRegExp);
        if (comparisonFoo(item.item_number)) {
            return true;
        }
        for (let stockKey in item.batches) {
            if (comparisonFoo(item.batches[stockKey].barcode)) {
                return true;
            }
        }
        return false;
    }
    function getBarcodeSearchFun(searchStr, barcodeRegExp) {
        if (barcodeRegExp) {
            return function (barcode) {
                try {
                    if (barcode.toString().search(barcodeRegExp) > -1 && !$rootScope.mergedConfigurationsData.salesConfig.bEnableBarcodeStrictMatch) {
                        return true;
                    }
                    else if (barcode === searchStr && $rootScope.mergedConfigurationsData.salesConfig.bEnableBarcodeStrictMatch) {
                        return true;
                    }
                }
                catch (err) {
                    return false;
                }
                return false;
            };
        }
        return function (barcode) {
            if (barcode == searchStr) {
                return true;
            }
            return false;
        };
    }
    function isEmptySearch(searchStr, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory) {
        if (searchStr) {
            return false;
        }
        if (cId) {
            return false;
        }
        if (subCatId) {
            return false;
        }
        if (type) {
            return false;
        }
        if (excludedType) {
            return false;
        }
        if (bHasBOMData !== undefined) {
            return false;
        }
        if (bNoSubCategory && $rootScope.mergedConfigurationsData.itemSettings.showSubCategoryWiseItems && isItSubCategoryView()) {
            return false;
        }
        return true;
    }
    function isSearchPropSame(searchStr, name, barcode, uniqueItemCode, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory) {
        if (prevSearchProp.searchStr !== searchStr) {
            return false;
        }
        if (prevSearchProp.name !== name) {
            return false;
        }
        if (prevSearchProp.barcode != barcode) {
            return false;
        }
        if (prevSearchProp.uniqueItemCode != uniqueItemCode) {
            return false;
        }
        if (prevSearchProp.cId != cId) {
            return false;
        }
        if (prevSearchProp.subCatId != subCatId) {
            return false;
        }
        if (prevSearchProp.type !== type) {
            return false;
        }
        if (prevSearchProp.excludedType !== excludedType) {
            return false;
        }
        if (prevSearchProp.bHasBOMData !== bHasBOMData) {
            return false;
        }
        if (prevSearchProp.bNoSubCategory !== bNoSubCategory && $rootScope.mergedConfigurationsData.itemSettings.showSubCategoryWiseItems && isItSubCategoryView()) {
            return false;
        }
        return true;
    }
    function saveSearchProp(searchStr, name, barcode, uniqueItemCode, cId, subCatId, type, excludedType, bHasBOMData, bNoSubCategory) {
        prevSearchProp.searchStr = searchStr;
        prevSearchProp.name = name;
        prevSearchProp.barcode = barcode;
        prevSearchProp.uniqueItemCode = uniqueItemCode;
        prevSearchProp.cId = cId;
        prevSearchProp.subCatId = subCatId;
        prevSearchProp.type = type;
        prevSearchProp.excludedType = excludedType;
        prevSearchProp.bHasBOMData = bHasBOMData;
        prevSearchProp.bNoSubCategory = bNoSubCategory;
    }
    let prevSearchProp = {
        searchStr: '',
        name: '',
        barcode: '',
        uniqueItemCode: '',
        cId: '',
        subCatId: '',
        type: '',
        excludedType: '',
        bHasBOMData: undefined,
        bNoSubCategory: undefined
    };
    let prevItemCollection = [];
    this.getSearchResultLength = function () {
        return prevItemCollection.length;
    };
    this.getAllItemIds = function (bExcludePrepared) {
        let itemIds = [];
        for (let i = 0; i < fullItemsCollection.length; i++) {
            if (fullItemsCollection[i].ItemType === 'Prepared') {
                continue;
            }
            itemIds.push(fullItemsCollection[i].id);
        }
        return itemIds;
    };
    /**
     *    This function is for orderItemCntrlrs
     */
    this.getItemsById = function (inArray) {
        let outArray = [];
        for (let i = 0; i < inArray.length; i++) {
            outArray.push(fullItemsCollection[itemsIndexes[inArray[i]._id]]);
        }
        return outArray;
    };
    this.getCategoryByItemId = function (id) {
        for (let i = 0; i < fullItemsCollection.length; i++) {
            if (fullItemsCollection[i].item_id === id)
                return fullItemsCollection[i].categoryId;
        }
        return undefined;
    };
    this.getItemInventory = function () {
        throw 'getItemInventory::sai removed. fetch from db';
    };
    this.getFullItemQuantitiesInChunks = function (params, errMsg) {
        return __awaiter(this, void 0, void 0, function* () {
            let itemParamObject = {
                startkey: 'item_',
                endkey: 'item_z',
                limit: params.limit,
                skip: params.skip,
                include_docs: true
            };
            let inventoryParamObject = {
                startkey: 'inventory_',
                endkey: 'inventory_z',
                limit: params.limit,
                skip: params.skip,
                include_docs: true
            };
            try {
                let resp = yield localPouch_maindb.allDocs(itemParamObject);
                let inventoryResp = yield localPouch_maindb.allDocs(inventoryParamObject);
                let formattedItemDocs = [];
                for (let i = 0; i < resp.rows.length; i++) {
                    if (resp.rows[i].doc.deleted) {
                        continue;
                    }
                    let invDoc = inventoryResp.rows[i].doc;
                    let batchDoc = itemsFormateDataSvc.getFormattedBatchDataFromItem(resp.rows[i].doc, invDoc);
                    formattedItemDocs.push(batchDoc);
                }
                return formattedItemDocs;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getFullItemQuantitiesInChunks:: not expected to come here');
            }
            ;
        });
    };
    this.getItemQutityObj = function (id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (typeof id !== 'string') {
                    id = 'item_' + id;
                }
                let inventoryDocId = 'inventory_' + id.substr(id.indexOf('_') + 1, id.length - 1);
                let resp = yield pouchQuerySvc.getBulkData('', [id, inventoryDocId], localPouch_maindb, true);
                let batchDoc = itemsFormateDataSvc.getFormattedBatchDataFromItem(resp[0].doc, resp[1].doc);
                return batchDoc;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getItemQutityObj:Not Expected To Come Here.');
            }
        });
    };
    this.getItemInventoryIndexes = function () {
        throw 'getItemInventoryIndexes::sai removed. fetch from db';
    };
    this.getExcludedItemType = function (itemList, type) {
        let result = $filter('filter')(itemList, {
            ItemType: '!' + type
        }, true);
        return result;
    };
    this.getUnitByKey = function (unitlist, unitId) {
        let unitsCollection = $filter('filter')(unitlist, {
            id: unitId
        }, true);
        return unitsCollection;
    };
    this.getPreparedItemCategories = function (allPreparedItems, allcategoryList) {
        let count = {};
        let allBomPreparedCategories = [];
        for (let i = 0; i < allPreparedItems.length; i++) {
            if (!count[allPreparedItems[i].categoryId]) {
                allBomPreparedCategories.push(allcategoryList[allPreparedItems[i].categoryId]);
                count[allPreparedItems[i].categoryId] = 1;
            }
        }
        ;
        return allBomPreparedCategories;
    };
    function validateItemB4CreateOrUpdate(itemDataB4CreateOrUpdate) {
        if (configDataSvc.appName == 'restaurant') {
            switch (itemDataB4CreateOrUpdate.ItemType) {
                case "Prepared":
                    itemDataB4CreateOrUpdate.isprepared = true;
                    itemDataB4CreateOrUpdate.issellable = true;
                    itemDataB4CreateOrUpdate.isbought = false;
                    itemDataB4CreateOrUpdate.quantity = 1;
                    break;
                case "Ingrediant":
                    itemDataB4CreateOrUpdate.isprepared = false;
                    itemDataB4CreateOrUpdate.issellable = false;
                    itemDataB4CreateOrUpdate.isbought = true;
                    break;
                default:
                    itemDataB4CreateOrUpdate.isprepared = false;
                    itemDataB4CreateOrUpdate.issellable = true;
                    itemDataB4CreateOrUpdate.isbought = true;
                    break;
            }
        }
        else {
            itemDataB4CreateOrUpdate.isprepared = false;
            itemDataB4CreateOrUpdate.issellable = false;
            itemDataB4CreateOrUpdate.isbought = false;
            itemDataB4CreateOrUpdate.ItemType = '';
        }
        itemDataB4CreateOrUpdate['item_number'] = itemDataB4CreateOrUpdate['item_number'] ? itemDataB4CreateOrUpdate['item_number'] : '';
        itemDataB4CreateOrUpdate['unit_price'] = itemDataB4CreateOrUpdate['itemNprice'] == 1 ? 0 : (itemDataB4CreateOrUpdate['unit_price'] === null ? 0 : itemDataB4CreateOrUpdate['unit_price']);
        itemDataB4CreateOrUpdate['cost_price'] = itemDataB4CreateOrUpdate['cost_price'] === null ? 0 : itemDataB4CreateOrUpdate['cost_price'];
        itemDataB4CreateOrUpdate['itemNprice'] = itemDataB4CreateOrUpdate['itemNprice'] === null ? 0 : itemDataB4CreateOrUpdate['itemNprice'];
        itemDataB4CreateOrUpdate['is_deleted'] = itemDataB4CreateOrUpdate['is_deleted'] ? itemDataB4CreateOrUpdate['is_deleted'] : ''; // === null ? '' : itemDataB4CreateOrUpdate['is_deleted'];
        itemDataB4CreateOrUpdate['quantity'] = itemDataB4CreateOrUpdate['quantity'] === null ? 1 : itemDataB4CreateOrUpdate['quantity'];
        itemDataB4CreateOrUpdate['1_quantity'] = itemDataB4CreateOrUpdate['quantity'] === null ? 1 : itemDataB4CreateOrUpdate['quantity'];
        itemDataB4CreateOrUpdate['description'] = itemDataB4CreateOrUpdate['description'] ? itemDataB4CreateOrUpdate['description'] : '';
        itemDataB4CreateOrUpdate['allow_alt_description'] = itemDataB4CreateOrUpdate['allow_alt_description'] ? itemDataB4CreateOrUpdate['allow_alt_description'] : ''; //  === null ? '' : itemDataB4CreateOrUpdate['allow_alt_description'];
        itemDataB4CreateOrUpdate['is_serialized'] = itemDataB4CreateOrUpdate['is_serialized'] === null ? '' : itemDataB4CreateOrUpdate['is_serialized'];
        itemDataB4CreateOrUpdate['receiving_quantity'] = itemDataB4CreateOrUpdate['receiving_quantity'] === null ? '' : itemDataB4CreateOrUpdate['receiving_quantity'];
        itemDataB4CreateOrUpdate['discount'] = itemDataB4CreateOrUpdate['discount'] === null ? 0 : itemDataB4CreateOrUpdate['discount'];
        itemDataB4CreateOrUpdate['loyaltyPerc'] = itemDataB4CreateOrUpdate['loyaltyPerc'] === null ? 0 : itemDataB4CreateOrUpdate['loyaltyPerc'];
        //NEW if 
        if (!itemDataB4CreateOrUpdate.isUpdate) {
            if (itemDataB4CreateOrUpdate['item_id'] === "" || itemDataB4CreateOrUpdate['item_id']) {
                console.log('Field itemDataB4CreateOrUpdate[\'item_id\']', 'should not Exist while creating New Item');
                delete itemDataB4CreateOrUpdate['item_id'];
            }
        }
        if (itemDataB4CreateOrUpdate.hasOwnProperty('supplier_id')) {
            if (itemDataB4CreateOrUpdate['supplier_id'] === '' || itemDataB4CreateOrUpdate['supplier_id'] === "")
                delete itemDataB4CreateOrUpdate['supplier_id'];
        }
        //OLD #4 there was no discount_expiry column 
        //New
        itemDataB4CreateOrUpdate['discount_expiry'] = itemDataB4CreateOrUpdate['discount_expiry'] ? itemDataB4CreateOrUpdate['expiry'] : null; // == null? '' : itemDataB4CreateOrUpdate['expiry'];
        //OLD #5
        //      itemDataB4CreateOrUpdate['expiry'] = itemDataB4CreateOrUpdate['expiry'] ? itemDataB4CreateOrUpdate['expiry'] : ''; // == null? '' : itemDataB4CreateOrUpdate['expiry'];
        //New
        itemDataB4CreateOrUpdate['expiry_date'] = itemDataB4CreateOrUpdate['expiry_date'] ? itemDataB4CreateOrUpdate['expiry_date'] : ''; // == null? '' : itemDataB4CreateOrUpdate['expiry'];
        return itemDataB4CreateOrUpdate;
    }
    this.createItem = function (itemDataB4CreateOrUpdate) {
        if (itemDataB4CreateOrUpdate['reorder_level'] === null) {
            itemDataB4CreateOrUpdate['reorder_level'] = 0;
        }
        if (itemDataB4CreateOrUpdate['expiry_date'] !== null) {
            itemDataB4CreateOrUpdate['expiry_date'] = String(itemDataB4CreateOrUpdate.expiry_date);
        }
        return itemsServerApis.createItemApi(validateItemB4CreateOrUpdate(itemDataB4CreateOrUpdate));
    };
    this.updateItem = function (itemData) {
        if (itemData['reorder_level'] === null) {
            itemData['reorder_level'] = 0;
        }
        if (itemData['expiry_date'] !== null) {
            itemData['expiry_date'] = String(itemData.expiry_date);
        }
        if (itemData['showLoyalty'] === false) {
            itemData['loyaltyPerc'] = 0;
        }
        return itemsServerApis.updateItemApi(validateItemB4CreateOrUpdate(itemData));
    };
    this.saveInventory = function (InvData) {
        let item = {};
        item.item_id = InvData['item_id'];
        item.name = InvData['name'];
        item.categoryId = InvData['category'];
        item.newQuantity = InvData['newquantity'];
        item.stock_location = InvData['stock_location'];
        item.quantity = InvData['quantity'];
        item.item_number = InvData['item_number'];
        item.batchId = InvData.batchId;
        item.comment = InvData['trans_comment'] === null ? '' : InvData['trans_comment'];
        item.uniqueDetails = InvData.uniqueDetails;
        return itemsServerApis.saveInventoryApi(item); //.then(saveInventorySuccs).catch(handleError);
    };
    this.updateBatch = function (batchData) {
        return itemsServerApis.updateBatch(batchData); //.then(saveInventorySuccs).catch(handleError);
    };
    this.getCategoryById = function (categoryId) {
        let categoryList = _self.getAllCategories();
        let category = categoryList.categoryList[categoryId];
        return category.doc;
    };
    this.getSubCategoryById = function (subCategoryId) {
        let subCategoryList = _self.getAllSubCategoriesItem();
        let subCategory;
        if (subCategoryId) {
            subCategory = $filter('filter')(subCategoryList, {
                id: subCategoryId
            }, true)[0];
        }
        return subCategory;
    };
    this.getSupplierById = function (supplierId, suppliersArray) {
        //$scope.suppliersList
        let supplier;
        if (supplierId) {
            supplier = $filter('filter')(suppliersArray, {
                person_id: supplierId
            }, true)[0];
        }
        return supplier;
    };
    this.getDiscountById = function (discountId) {
        if (!discountList.length) {
            discountList = _self.getAllDiscounts();
        }
        let discount = {};
        if (discountId) {
            discount = $filter('filter')(discountList, {
                id: discountId
            }, true)[0];
        }
        return discount;
    };
    this.getUnitById = function (unitId) {
        if (!unitList.length) {
            unitList = _self.getAllunits();
        }
        let unit = {};
        if (unitId) {
            unit = $filter('filter')(unitList, {
                id: unitId
            }, true)[0];
        }
        return unit;
    };
    this.getDefaultUnit = function () {
        unitList = AppSettingDataSvc.getAllUnits();
        for (let i = 0; i < unitList.length; i++) {
            if (unitList[i].name === 'Nos' || unitList[i].name === "") {
                return unitList[i];
            }
        }
    };
    this.getTaxesById = function (taxArray) {
        let taxes = [];
        if (!taxesList.length) {
            taxesList = _self.getAllTaxes();
        }
        if (taxArray.length) {
            for (let i = 0; i < taxArray.length; i++) {
                taxes.push($filter('filter')(taxesList, {
                    id: taxArray[i]
                }, true)[0]);
            }
        }
        return taxes;
    };
    this.getTaxPercentsById = function (taxArray) {
        let taxes = [];
        if (!taxesList || !taxesList.length) {
            taxesList = _self.getAllTaxes();
        }
        if (taxArray.length) {
            for (let i = 0; i < taxArray.length; i++) {
                let tax = $filter('filter')(taxesList, {
                    id: taxArray[i]
                }, true)[0]['percent'];
                taxes.push(tax);
                tax = '';
            }
        }
        return taxes;
    };
    this.getTaxById = function (taxArray, headerPrefix, item, headers) {
        let taxes = [];
        if (!taxesList.length) {
            taxesList = _self.getAllTaxes();
        }
        if (taxArray.length) {
            for (let i = 0; i < taxArray.length; i++) {
                let tax = $filter('filter')(taxesList, {
                    id: taxArray[i]
                }, true)[0];
                let taxNamePercent = tax['name'] + '-' + tax['percent'];
                let taxCol = tax['name'] + ' ' + headerPrefix;
                item[taxCol] = tax['percent'];
                if (headers && headers.indexOf(taxCol) === -1) {
                    headers.push(taxCol);
                }
                taxes.push(taxNamePercent);
                tax = [];
            }
        }
        return taxes;
    };
    let bomList;
    this.filterBomList = function () {
        bomList = [];
        for (let count = 0; count < fullItemsCollection.length; count++) {
            if (fullItemsCollection[count].bomData) {
                bomList.push(fullItemsCollection[count]);
            }
        }
    };
    /**
     *
     * @param {*} item_id 1, 100
     */
    this.getItemByItemId = function (item_id) {
        return fullItemsCollection[itemsIndexes['item_' + item_id]];
    };
    /**
     *
     * @param {*} item_id 1, 100
     */
    this.getLatestBatchForItemId = function (item_id) {
        return __awaiter(this, void 0, void 0, function* () {
            let batchObj = yield _self.getBatchesByItemId(item_id);
            let batches = batchObj.batches;
            return batches[batches.length - 1];
        });
    };
    this.getAllBomList = function () {
        return bomList;
    };
    this.getTotalTaxPercent = function (taxesIdArray, bPPTaxInclusive) {
        let taxPercent = 0;
        if (!bPPTaxInclusive) {
            for (let i = 0; i < taxesIdArray.length; i++) {
                taxPercent += AppSettingDataSvc.getTaxPercent(taxesIdArray[i]);
            }
        }
        return taxPercent;
    };
    this.getTotalCostIngredientItem = function (item, unitId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            let taxesIdArray = item.purchaseTaxes;
            let taxPercent = _self.getTotalTaxPercent(taxesIdArray, item.bPPTaxInclusive);
            //calculate with latest price from batches
            let batch = yield _self.getLatestBatchForItemId(item.item_id);
            return batch.unitsInfo[unitId].purchasePrice * quantity * (1 + taxPercent * 0.01);
        });
    };
    this.getBatchesByItemId = function (itemId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let resp = yield pouchQuerySvc.queryDocById('item_' + itemId, localPouch_maindb);
                let invDoc = yield pouchQuerySvc.queryDocById('inventory_' + itemId, localPouch_maindb);
                var batchDoc = itemsFormateDataSvc.getFormattedBatchDataFromItem(resp, invDoc);
                return batchDoc;
            }
            catch (err) {
                loggerSvc.error(err);
                loggerSvc.error('getBatchesByItemId::Not Expected To Come Here.<' + itemId + '>');
            }
        });
    };
    this.getAllCategoriesItem = function () {
        return AppSettingDataSvc.getAllCategory();
    };
    this.getAllSubCategoriesItem = function () {
        return AppSettingDataSvc.getAllSubCategory();
    };
    this.getAllTaxes = function () {
        taxesList = AppSettingDataSvc.getAllTaxes();
        return taxesList;
    };
    this.getAllUnits = function () {
        unitList = AppSettingDataSvc.getAllUnits();
        return unitList;
    };
    this.getAllDiscounts = function () {
        discountList = AppSettingDataSvc.getAllDiscounts();
        return discountList;
    };
    this.getAllVariant = function () {
        return AppSettingDataSvc.getAllVariant();
    };
    this.getAttributeName = function (attributeId) {
        return AppSettingDataSvc.getAttributeName(attributeId);
    };
    this.getAttributeValueName = function (attributeId, attributeValueId) {
        return AppSettingDataSvc.getAttributeValueName(attributeId, attributeValueId);
    };
    this.getAllSlabs = function () {
        return AppSettingDataSvc.getAllSlabs();
    };
    this.updateItemImages = function (itemId, itemImagesArr) {
        return itemsServerApis.updateItemImages(itemId, itemImagesArr);
    };
    //Use the below function to fill all common functions b/w DAPP and MAPP
    this.getCommonScopeFunctions = function (itemScope) {
        itemScope.defaultPProfileId = $rootScope.mergedConfigurationsData.salesConfig.pProfileId ? $rootScope.mergedConfigurationsData.salesConfig.pProfileId : AppSettingDataSvc.getDefaultProfileId();
        itemScope.comptConvPurchasePrice = function (item) {
            if (itemScope.itemUnits[0].factor) {
                item.convPurchasePrice = (item.purchasePrice / item.conversionFactor);
            }
            else {
                if (itemScope.itemUnits[0].factor == 0) {
                    item.conversionFactor = 1;
                    itemScope.itemUnits[0].factor = 1;
                }
                item.convPurchasePrice = item.purchasePrice;
            }
        };
        //Is there a smart way of doing it? Because memory doubles
        itemScope.exportDataFormat = function (itemsArray) {
            return __awaiter(this, void 0, void 0, function* () {
                let batchesArray = [];
                let formattedItems = [];
                let headers = Object.keys(itemsArray[0]);
                let reqFields = ["Name", "Category Name", "Sub Category", "Barcode", "Item Code", "Item Type", "Description", "Supplier Name", "Has Expiry Date", "Expiry", "Has Batch Number", "Batch Id", "Auto Generated Barcode", "OTG", "PP Tax Inclusive", "Purchase Price", "MRP", "SP Tax Inclusive", "Selling Price", "Purchase Unit Name", "Conversion Factor", "Selling Unit Name", "Discount%", "Quantity", "Reorder Level", "Reorder Quantity", "Has Serial Number", "IMEI COUNT", "SERIAL NUMBER", "IMEI NUMBERS", "Has Variants", "Attributes", "SKU Name", "HSN", "Sales Slab", "Purchase Slab", "Density", "Has Warranty", "Warranty", "Warranty Terms", "Images", "AlienHu Market", "Read from Weighing Machine"];
                let excludedArryList = ["Has Serial Number", "IMEI COUNT", "SERIAL NUMBER", "IMEI NUMBERS"];
                for (let idx = 0; idx < reqFields.length; idx++) {
                    if ($rootScope.appType == 'restaurant' && (excludedArryList.indexOf(reqFields[idx]) !== -1)) {
                        continue;
                    }
                    if (headers.indexOf(reqFields[idx]) === -1) {
                        headers.push(reqFields[idx]);
                    }
                }
                for (let ix = 0; ix < itemsArray.length; ix++) {
                    let item = itemsArray[ix];
                    let originalFields = ["name", "item_number", "uniqueItemCode", "ItemType", "subCategories", "description", "reorderLevel", "reorderQuantity", "is_serialized", "imeiCount", "hasExpiryDate", "hasBatchNumber", "bOTG", "bSPTaxInclusive", "bPPTaxInclusive", "hasVariants", "attributes", "hsn", "salesSlab", "purchaseSlab", "density", "isWarranty", "warranty", "warrantyTerms", "images", "bAvailableForPurchaseOrder", "bReadQtyFromWeighingMachine"];
                    let fieldsToMap = ["Name", "Barcode", "Item Code", "Item Type", "Sub Category", "Description", "Reorder Level", "Reorder Quantity", "Has Serial Number", "IMEI COUNT", "Has Expiry Date", "Has Batch Number", "OTG", "SP Tax Inclusive", "PP Tax Inclusive", "Has Variants", "Attributes", "HSN", "Sales Slab", "Purchase Slab", "Density", "Has Warranty", "Warranty", "Warranty Terms", "Images", "AlienHu Market", "Read from Weighing Machine"];
                    //"SERIAL NUMBER", "IMEI NUMBERS",
                    for (let l = 0; l < originalFields.length; l++) {
                        item[fieldsToMap[l]] = item[originalFields[l]];
                    }
                    if (item.hasOwnProperty("categoryId")) {
                        let category = _self.getCategoryById(item.categoryId);
                        item["Category Name"] = category.name;
                    }
                    else {
                        item["Category Name"] = "";
                    }
                    if (item.images && item.images.length) {
                        item["Images"] = item.images[item.images.length - 1].localImage; // only last image
                    }
                    else {
                        item["Images"] = "";
                    }
                    if (item.bAvailableForPurchaseOrder === false) {
                        item["AlienHu Market"] = "No";
                    }
                    else {
                        item["AlienHu Market"] = "Yes";
                    }
                    item["Read from Weighing Machine"] = "No";
                    if (item.bReadQtyFromWeighingMachine) {
                        item["Read from Weighing Machine"] = "Yes";
                    }
                    let subCategory = item["Sub Category"];
                    if (subCategory) {
                        let subCategoryNames = "";
                        for (let s in subCategory) {
                            subCategoryNames = subCategoryNames + subCategory[s].name + '|';
                        }
                        subCategoryNames = subCategoryNames.slice(0, -1);
                        item["Sub Category"] = subCategoryNames;
                    }
                    else {
                        item["Sub Category"] = "";
                    }
                    if (item.hasOwnProperty('Attributes')) {
                        let variants = item["Attributes"]; // item["Attributes"].split(',');
                        let attributes = [];
                        for (let v = 0; v < variants.length; v++) {
                            attributes[v] = _self.getAttributeName(variants[v]);
                        }
                        item["Attributes"] = attributes.join('/');
                    }
                    let myItem = {};
                    let discounts = [];
                    let batches = yield _self.getBatchesByItemId(item.item_id);
                    if (item.hasOwnProperty("purchaseTaxes")) {
                        let purTaxes = [];
                        purTaxes = angular.copy(item.purchaseTaxes);
                        item.purchaseTaxes = _self.getTaxById(purTaxes, 'Purchase Taxes%', item, headers);
                    }
                    if (item.hasOwnProperty("salesTaxes")) {
                        let salesTaxes = [];
                        salesTaxes = angular.copy(item.salesTaxes);
                        _self.getTaxById(salesTaxes, 'Sales Taxes%', item, headers);
                    }
                    if (item.hasOwnProperty("supplier_id")) {
                        let supplier = (item.supplier_id === undefined || item.supplier_id === null || item.supplier_id === '') ? '' : _self.getSupplierById(item.supplier_id, itemScope.suppliersList);
                        item["Supplier Name"] = supplier ? supplier.company_name : '';
                    }
                    else {
                        item["Supplier Name"] = "";
                    }
                    for (let b = 0; b < batches.batches.length; b++) {
                        let batchItem = angular.copy(item);
                        let imeiRows = [];
                        addBatchItem(batchItem, batches.batches[b], headers, imeiRows);
                        formattedItems.push(batchItem);
                        for (let uId = 0; uId < imeiRows.length; uId++) {
                            formattedItems.push(imeiRows[uId]);
                        }
                    }
                }
                formatHeaders(headers);
                formattedItems.forEach(function (item, itemIndex) {
                    let itemJson = {};
                    for (let i = 0; i < headers.length; i++) {
                        itemJson[headers[i]] = item[headers[i]] ? item[headers[i]] : "";
                    }
                    formattedItems[itemIndex] = itemJson;
                });
                let formattedDataArrays = {
                    itemsArray: formattedItems,
                    batchesArray: batchesArray
                };
                return formattedDataArrays;
            });
        };
        function addBatchItem(item, batch, headers, imeiItems) {
            item["Expiry"] = item.hasExpiryDate ? new Date(batch.expiry) : "";
            //batch.uniqueDetails 
            /**
             * batch.uniqueDetails = [
             *    {
             *      "serialnumber":"",
             *      imeiNumbers:[]
             *    }
             *  ]
             */
            if (batch.uniqueDetails) {
                if (batch.uniqueDetails.length) {
                    item["SERIAL NUMBER"] = batch.uniqueDetails[0].serialnumber;
                    item["IMEI NUMBERS"] = batch.uniqueDetails[0].imeiNumbers;
                    for (let row = 1; row < batch.uniqueDetails.length; row++) {
                        let imeiItem = {};
                        for (let h = 0; h < headers.length; h++) {
                            imeiItem[headers[h]] = "";
                        }
                        imeiItem["SERIAL NUMBER"] = batch.uniqueDetails[row].serialnumber;
                        imeiItem["IMEI NUMBERS"] = batch.uniqueDetails[row].imeiNumbers;
                        imeiItems.push(imeiItem);
                    }
                }
                else {
                    item["SERIAL NUMBER"] = "";
                    item["IMEI NUMBERS"] = [];
                }
            }
            let pu = item.defaultPurchaseUnitId;
            let su = item.defaultSellingUnitId;
            let cf = batch.unitsInfo[item.defaultPurchaseUnitId] ? batch.unitsInfo[item.defaultPurchaseUnitId].factor : 1;
            if (batch.unitsInfo) {
                let unitKeys = Object.keys(batch.unitsInfo);
                pu = unitKeys[unitKeys.length - 1];
                su = unitKeys[0];
                cf = batch.unitsInfo[pu].factor;
                item["Purchase Price"] = batch.unitsInfo[pu].purchasePrice;
                item["Conversion Factor"] = cf; // batch.unitsInfo[item.defaultPurchaseUnitId].factor;
                item["MRP"] = batch.unitsInfo[su].mrp;
                let profiles = Object.keys(batch.unitsInfo[su].pProfilesData);
                item["Selling Price"] = batch.unitsInfo[su].pProfilesData[profiles[0]].sellingPrice;
                let discount = batch.unitsInfo[su].pProfilesData[profiles[0]].discountId ? _self.getDiscountById(batch.unitsInfo[su].pProfilesData[profiles[0]].discountId) : 0;
                item["Discount%"] = discount === 0 ? 0 : discount.discount;
                item["Quantity"] = (batch.uniqueDetails && batch.uniqueDetails.length) ? batch.uniqueDetails.length : batch.quantity;
                item["Batch Id"] = batch.batchId;
                item["SKU Name"] = batch.skuName;
                item["Auto Generated Barcode"] = batch.barcode;
                // discounts.push(item.discount);
            }
            if (item.hasOwnProperty("defaultPurchaseUnitId")) {
                let unit = _self.getUnitById(parseInt(pu));
                item["Purchase Unit Name"] = unit.name;
            }
            else {
                item["Purchase Unit Name"] = "";
            }
            if (item.hasOwnProperty("defaultSellingUnitId")) {
                let SalesUnit = _self.getUnitById(parseInt(su));
                item["Selling Unit Name"] = SalesUnit.name; //_self.getUnitById(item.sellingUnitId);
            }
            else {
                item["Selling Unit Name"] = "";
            }
        }
        function formatHeaders(headers) {
            let exProperties = ['item_id', 'isprepared', 'issellable', 'isbought', 'name', 'item_number', "uniqueItemCode", "ItemType", "description", "reorderLevel", "reorderQuantity", "is_serialized", "imeiCount", "hasExpiryDate", "hasBatchNumber", "bOTG", "bSPTaxInclusive", "bPPTaxInclusive", "hasVariants", "attributes", "hsn", "salesSlab", "purchaseSlab", "density", "isWarranty", "warranty", "warrantyTerms", 'categoryId', 'defaultPurchaseUnitId', 'defaultSellingUnitId', 'expiry', 'quantity', 'salesTaxes', 'purchaseTaxes', 'supplier_id', '_rev', '_id', '$index', 'bomData', 'multipleUnits', 'unitsInfo', 'baseUnitId', 'categoryInfo', 'tax1_percent', 'tax2_percent', 'brandId', 'loyalityId', 'purchaseUnitId', 'sellingUnitId', 'purchasePrice', 'mrp', 'sellingPrice', 'conversionFactor', 'discountId', 'discount', 'images', 'bAvailableForPurchaseOrder', 'bReadQtyFromWeighingMachine'];
            for (let i = 0; i < exProperties.length; i++) {
                let idx = headers.indexOf(exProperties[i]);
                if (idx !== -1) {
                    headers.splice(idx, 1);
                }
            }
        }
        function removeExProperty(item) {
            let exProperties = ['item_id', 'isprepared', 'issellable', 'isbought', 'name', 'item_number', "uniqueItemCode", "ItemType", "description", "reorderLevel", "reorderQuantity", "is_serialized", "imeiCount", "hasExpiryDate", "hasBatchNumber", "bOTG", "bSPTaxInclusive", "bPPTaxInclusive", "hasVariants", "attributes", "hsn", "salesSlab", "purchaseSlab", "density", "isWarranty", "warranty", "warrantyTerms", 'categoryId', 'defaultPurchaseUnitId', 'defaultSellingUnitId', 'expiry', 'quantity', 'salesTaxes', 'purchaseTaxes', 'supplier_id', '_rev', '_id', '$index', 'bomData', 'multipleUnits', 'unitsInfo', 'baseUnitId', 'categoryInfo', 'tax1_percent', 'tax2_percent', 'brandId', 'loyalityId', 'purchaseUnitId', 'sellingUnitId', 'purchasePrice', 'mrp', 'sellingPrice', 'conversionFactor', 'discountId', 'discount', "uniqueItemCode", "ItemType", "description", "reorderLevel", "reorderQuantity", "isWarranty", "warranty", "warrantyTerms", "density", "attributes", "salesSlab", "purchaseSlab", "hsn", "hasVariants", "bPPTaxInclusive", "bSPTaxInclusive", "bOTG", "is_serialized", "imeiCount", "hasExpiryDate", "hasBatchNumber"];
            for (let q = 0; q < exProperties.length; q++) {
                if (item.hasOwnProperty(exProperties[q])) {
                    delete item[exProperties[q]];
                }
            }
        }
    };
});
