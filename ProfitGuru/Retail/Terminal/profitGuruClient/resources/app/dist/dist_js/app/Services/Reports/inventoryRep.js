var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
angular.module('profitGuru')
    .service('inventoryRep', function ($q, $timeout, $rootScope, itemDataSvc, pouchQuerySvc, loggerSvc, utilsSvc, itemsCommonDataSvc) {
    'use strict';
    var localMainDB;
    var CHUNK_SIZE = 1000;
    this.setDB = function (mainDB) {
        localMainDB = mainDB;
    };
    function getSoldQuantity(invDoc, stockKey) {
        var soldQuantity = 0;
        for (var transKey in invDoc.transactions) {
            var transaction = invDoc.transactions[transKey];
            if (stockKey && transaction.trans_stockKey !== stockKey) {
                continue;
            }
            var invoiceArray = angular.copy($rootScope.mergedConfigurationsData.invoiceCheckpointValue);
            invoiceArray.splice(0, 0, $rootScope.mergedConfigurationsData.invoiceDefaultCheckpoint);
            for (var i = 0; i < invoiceArray.length; i++) {
                if (transaction.trans_comment.indexOf(invoiceArray[i].prefix) === 0 || transaction.trans_comment.indexOf(invoiceArray[i].sReturnPrefix) === 0) {
                    soldQuantity += transaction.trans_inventory;
                    break;
                }
            }
        }
        return soldQuantity * -1;
    }
    function batchProcess(data, result, offset) {
        if (offset === undefined) {
            offset = 0;
        }
        var keys = Object.keys(data);
        if (offset === keys.length) {
            var defered = $q.defer();
            defered.resolve(result);
            return defered.promise;
        }
        var start = offset;
        var end = offset + CHUNK_SIZE;
        if (end > keys.length) {
            end = keys.length;
        }
        return processFun(keys.slice(start, end), data, result).then(function () {
            offset = end;
            return batchProcess(data, result, offset);
        });
    }
    /**
     * Assumption: itemscollection order is not expected to mess up
     * @param {*} idPrefix
     * @param {*} idArray
     * @param {*} db
     * @param {*} bRaw
     */
    function getBulkData(idPrefix, idArray, db, bRaw) {
        var m_idArray = angular.copy(idArray);
        m_idArray.sort();
        var params = {
            startkey: idPrefix + m_idArray[0],
            endkey: idPrefix + m_idArray[idArray.length - 1]
        };
        return pouchQuerySvc.queryAllDocsByType(db, undefined, params, false).then(function (resp) {
            if (Object.keys(resp).length < idArray.length) {
                throw 'getBulkData ..not expected to come here';
            }
            var filteredResp = [];
            for (var i = 0; i < idArray.length; i++) {
                var doc = resp[idArray[i]];
                if (!doc) {
                    throw 'getBulkData ..not expected to come here';
                }
                filteredResp.push({
                    id: doc._id,
                    doc: doc
                });
            }
            return filteredResp;
        });
    }
    function processFun(itemIds, data, result) {
        return getBulkData('inventory_', itemIds, localMainDB, true).then(function (rows) {
            for (var i = 0; i < rows.length; i++) {
                var item_id = rows[i].id.split('_')[1];
                if (rows[i].doc) {
                    var stockTQty = 0;
                    for (var stockKey in rows[i].doc.stock) {
                        if (rows[i].doc.stock[stockKey].quantity > 0) {
                            stockTQty += rows[i].doc.stock[stockKey].quantity;
                        }
                    }
                    data[item_id].quantity = stockTQty;
                    result.quantity += stockTQty;
                    data[item_id].soldQuantity = getSoldQuantity(rows[i].doc, undefined);
                    result.soldQuantity += data[item_id].soldQuantity;
                    data[item_id].totalQuantity = stockTQty + data[item_id].soldQuantity;
                }
            }
        }).catch(function (error) {
            console.log('batchProcessInv error');
        });
    }
    /**
     * Stock Evaluation Report :which is to show the inventory report with.
     *  current stock  and the total cost of the current stock with the taxes
     */
    this.getStockEvalRep = function (params) {
        return __awaiter(this, void 0, void 0, function* () {
            // await init();
            var data = {};
            var bUniqueReport = params.bUnique;
            var result = {
                data: [],
                quantity: 0,
                soldQuantity: 0,
                totalQuantity: 0,
                totalCost: 0,
                totalTax: 0,
                totalWithTax: 0
            };
            var itemIds = itemDataSvc.getAllItemIds(true);
            if (!itemIds.length) {
                var defered = $q.defer();
                defered.resolve(result);
                return defered.promise;
            }
            return batchProcess3(result, itemIds, undefined, bUniqueReport).then(function () {
                result.totalQuantity = result.quantity + result.soldQuantity;
                return result;
            }).catch(function (error) {
                console.log('getInvCheckRep');
                return {
                    data: [],
                    quantity: 0,
                    soldQuantity: 0,
                    totalQuantity: 0
                };
            });
        });
    };
    /**
     * bLowInventory to get inventory of only low inventory
     */
    this.getInvRep = function (bLowInventory) {
        return __awaiter(this, void 0, void 0, function* () {
            // await init();
            let CHUNK_SIZE = 1000;
            let skip = 0;
            let itemsCollection = [];
            let allItemLen = {
                count: 0
            };
            yield itemsCommonDataSvc.getItemsCount(allItemLen);
            while (allItemLen.count > itemsCollection.length) {
                let response = yield itemDataSvc.getFullItemJsonsInChunks({
                    skip: skip,
                    limit: CHUNK_SIZE
                });
                if (response.formatResp.length) {
                    itemsCollection = itemsCollection.concat(response.formatResp);
                }
                if (response.chunkRespLen <= 0) {
                    break;
                }
                skip += response.chunkRespLen;
            }
            var data = {};
            var result = {
                data: [],
                quantity: 0,
                soldQuantity: 0,
                totalQuantity: 0
            };
            if (!itemsCollection.length) {
                var defered = $q.defer();
                defered.resolve(result);
                return defered.promise;
            }
            try {
                for (var i = 0; i < itemsCollection.length; i++) {
                    var item = itemsCollection[i];
                    var item_id = item.item_id;
                    if (item.ItemType === 'Prepared') {
                        continue;
                    }
                    if (!bLowInventory || (bLowInventory && item.quantity <= item.reorderLevel)) {
                        data[item_id] = {
                            name: item.name,
                            category: itemDataSvc.getCategoryById(item.categoryId).name,
                            quantity: 0,
                            reorderLevel: item.reorderLevel,
                            totalQuantity: 0,
                            soldQuantity: 0
                        };
                    }
                }
                return batchProcess(data, result, undefined).then(function () {
                    result.totalQuantity = result.quantity + result.soldQuantity;
                    // result.data = Object.values(data);
                    result.data = Object.keys(data).map(function (key) {
                        return data[key];
                    });
                    return result;
                });
            }
            catch (ex) {
                console.log(ex);
                return {
                    data: [],
                    quantity: 0,
                    soldQuantity: 0,
                    totalQuantity: 0
                };
            }
        });
    };
    function processFun2(itemIds, result) {
        return getBulkData('inventory_', itemIds, localMainDB, true).then(function (rows) {
            return getBulkData('item_', itemIds, localMainDB, true).then(function (itemRows) {
                if (rows.length !== itemRows.length) {
                    loggerSvc.error('processFun2<' + rows.length + '><' + itemRows.length + '> Mismatch');
                    return;
                }
                for (var i = 0; i < rows.length; i++) {
                    var item_id = rows[i].id.split('_')[1];
                    if (rows[i].doc && itemRows[i].doc) {
                        var itemDoc = itemRows[i].doc;
                        var name = itemDoc.info.name;
                        for (var stockKey in rows[i].doc.stock) {
                            var stock = rows[i].doc.stock[stockKey];
                            var batchId = 'N/A';
                            if (itemDoc.batches[stockKey]) {
                                batchId = itemDoc.batches[stockKey].batchId;
                                if (itemDoc.batches[stockKey].skuName) {
                                    name = itemDoc.info.name + ' ' + itemDoc.batches[stockKey].skuName;
                                }
                            }
                            if (!batchId) {
                                //for garments we have to show here sku name
                                batchId = 'N/A';
                            }
                            var data = {
                                name: name,
                                category: itemDataSvc.getCategoryById(itemDoc.info.categoryId).name,
                                batchId: batchId,
                                quantity: stock.quantity,
                                reorderLevel: rows[i].doc.info.reorderLevel,
                                soldQuantity: 0,
                                totalQuantity: stock.quantity
                            };
                            if (data.quantity > 0) {
                                result.quantity += data.quantity;
                            }
                            data.soldQuantity = getSoldQuantity(rows[i].doc, stockKey);
                            result.soldQuantity += data.soldQuantity;
                            data.totalQuantity += data.soldQuantity;
                            result.data.push(data);
                        }
                    }
                }
            });
        }).catch(function (error) {
            console.log('batchProcessInv error');
        });
    }
    function batchProcess2(result, itemIds, offset) {
        if (offset === undefined) {
            offset = 0;
        }
        if (offset === itemIds.length) {
            return;
        }
        var start = offset;
        var end = offset + CHUNK_SIZE;
        if (end > itemIds.length) {
            end = itemIds.length;
        }
        return processFun2(itemIds.slice(start, end), result).then(function () {
            offset = end;
            return batchProcess2(result, itemIds, offset);
        });
    }
    //for stock evaluation report
    function processFun3(itemIds, result, bUnique) {
        return getBulkData('inventory_', itemIds, localMainDB, true).then(function (rows) {
            return getBulkData('item_', itemIds, localMainDB, true).then(function (itemRows) {
                if (rows.length !== itemRows.length) {
                    loggerSvc.error('processFun3<' + rows.length + '><' + itemRows.length + '> Mismatch');
                    return;
                }
                for (var i = 0; i < rows.length; i++) {
                    if (bUnique && itemRows[i].doc.info.imeiCount === 0 && !itemRows[i].doc.info.is_serialized) {
                        continue;
                    }
                    var item_id = rows[i].id.split('_')[1];
                    if (rows[i].doc && itemRows[i].doc) {
                        var itemDoc = itemRows[i].doc;
                        var name = itemDoc.info.name;
                        var purchaseTaxes = itemDataSvc.getTaxPercentsById(itemDoc.info.purchaseTaxes);
                        for (var stockKey in rows[i].doc.stock) {
                            var uniqueDetails = [];
                            var stock = rows[i].doc.stock[stockKey];
                            for (var uId in stock.uniqueDetails) {
                                if (!stock.uniqueDetails[uId].sold && stock.uniqueDetails[uId].itemAvailable) {
                                    uniqueDetails.push(stock.uniqueDetails[uId].info);
                                }
                            }
                            var batchId = 'N/A';
                            var purchasePrice = 0;
                            if (itemDoc.batches[stockKey]) {
                                batchId = itemDoc.batches[stockKey].batchId;
                                purchasePrice += itemDoc.batches[stockKey].unitsInfo[itemDoc.info.baseUnitId].purchasePrice;
                                if (itemDoc.batches[stockKey].skuName) {
                                    name = itemDoc.info.name + ' ' + itemDoc.batches[stockKey].skuName;
                                }
                            }
                            var taxPercent = 0;
                            for (var t = 0; t < purchaseTaxes.length; t++) {
                                taxPercent += purchaseTaxes[t];
                            }
                            if (itemDoc.info.bPPTaxInclusive) {
                                purchasePrice = ppExTax(purchasePrice, taxPercent);
                            }
                            if (!batchId) {
                                //for garments we have to show here sku name
                                batchId = 'N/A';
                            }
                            var data = {
                                name: name,
                                batchId: batchId,
                                costP: utilsSvc.numberRoundOffFormat(purchasePrice, 'none'),
                                quantity: stock.quantity,
                                totalCost: utilsSvc.numberRoundOffFormat(stock.quantity * purchasePrice, 'none'),
                                reorderLevel: rows[i].doc.info.reorderLevel,
                                soldQuantity: 0,
                                totalQuantity: stock.quantity,
                                uniqueDetails: uniqueDetails,
                                totalTax: undefined,
                                totalWithTax: undefined
                            };
                            var totalTax = 0;
                            for (var q = 0; q < purchaseTaxes.length; q++) {
                                totalTax += (purchasePrice * 0.01 * purchaseTaxes[q]);
                            }
                            data.totalTax = data.quantity * totalTax;
                            data.totalWithTax = data.totalCost + data.totalTax;
                            data.totalTax = utilsSvc.numberRoundOffFormat(data.totalTax, 'none');
                            data.totalWithTax = utilsSvc.numberRoundOffFormat(data.totalWithTax, 'none');
                            // data.quantity =  utilsSvc.numberRoundOffFormat(data.quantity, 'none')
                            if (data.quantity > 0) {
                                result.quantity += data.quantity;
                            }
                            data.soldQuantity = getSoldQuantity(rows[i].doc, stockKey);
                            result.soldQuantity += data.soldQuantity;
                            data.totalQuantity += data.soldQuantity;
                            result.totalWithTax += data.totalWithTax;
                            result.totalCost += data.totalCost;
                            result.totalTax += data.totalTax;
                            result.data.push(data);
                        }
                    }
                }
                result.totalWithTax = utilsSvc.numberRoundOffFormat(result.totalWithTax, 'none');
                result.totalCost = utilsSvc.numberRoundOffFormat(result.totalCost, 'none');
                result.totalTax = utilsSvc.numberRoundOffFormat(result.totalTax, 'none');
            });
        }).catch(function (error) {
            console.log('batchProcessInv error');
        });
    }
    function ppExTax(pp, pTax) {
        var pPriceExTax = (100 * pp) / (100 + pTax);
        return pPriceExTax;
    }
    function batchProcess3(result, itemIds, offset, bUnique) {
        if (offset === undefined) {
            offset = 0;
        }
        if (offset === itemIds.length) {
            return;
        }
        var start = offset;
        var end = offset + CHUNK_SIZE;
        if (end > itemIds.length) {
            end = itemIds.length;
        }
        return processFun3(itemIds.slice(start, end), result, bUnique).then(function () {
            offset = end;
            return batchProcess3(result, itemIds, offset, bUnique);
        });
    }
    //stock evaluation
    this.getInvCheckRep = function () {
        return __awaiter(this, void 0, void 0, function* () {
            var data = {};
            var result = {
                data: [],
                quantity: 0,
                soldQuantity: 0,
                totalQuantity: 0
            };
            var itemIds = itemDataSvc.getAllItemIds(true);
            if (!itemIds.length) {
                var defered = $q.defer();
                defered.resolve(result);
                return defered.promise;
            }
            return batchProcess2(result, itemIds, undefined).then(function () {
                result.totalQuantity = result.quantity + result.soldQuantity;
                return result;
            }).catch(function (error) {
                console.log('getInvCheckRep');
                return {
                    data: [],
                    quantity: 0,
                    soldQuantity: 0,
                    totalQuantity: 0
                };
            });
        });
    };
});
