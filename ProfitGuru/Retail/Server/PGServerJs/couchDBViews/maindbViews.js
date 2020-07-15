/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */

var couchViewHelper = require('./couchViewHelper');

/**
 *  DB Design Thoughts
 *  Tools : update handler, file locks, views, reduce, worker process
 *  1 big document vs multiple small documents -- don't think relational, views are very good
 *  upgrade to couchdb 2.0 -> mango query .. even for trivial queries, we have to write queries and suppose we want to emit only few fields, we have to write 1 more view
 *                                             1 index different outputs, we have to explicitly emit 2 times which is again may be costly
 *  When we are writing we want to use as minimal apis as possible => Hence grouping the inventory, quantity in 1 table
 *  Updating frequently => more revisions => until compaction is run the document size grows because of revisions -> inventory doc
 *  When we are querying -> we want to query in 1 shot -> may be same field in 2 docs like reorderLevel, isPrepared, quantity
 *  Views: How costly -> performance and memory. Each document update should go through all the views in the database. View is again 1 more document.. We could have everything (Example inventory each transaction of each item in separate document) in separate documents (each item each batch is separate document). Create views wherever required. This will lead to many views? Really? Think of it?
 */

//RelaxTodo study filter vs views? 
//RelaxTodo Can we have a filter ourselves in the code?
//How to control deleted docs? In views it is easy and it is pre computed. In case of filters it is on the fly
//CouchDB 2.0 ? Few things like email
//Inside views version is not yet used
//https://stackoverflow.com/questions/40753347/couchdb-mango-performance-vs-map-reduce-views

var maindbViews = function () {

    //key [[key1, id1], [key2, id2], [key3, id3], [key4, id4]]
    //values [value1, value2, value3]
    var queryMaxId = function (key, values, rereduce) {
        var max = 0;
        for (var i = 0; i < values.length; i++) {
            var id = values[i];
            if (max < id) {
                max = id;
            }
        }

        return max;
    };

    var queryMaxIdWithKey = function (key, values, rereduce) {
        var max = 0;
        for (var i = 0; i < key.length; i++) {
            var id = key[i][0];
            if (max < id) {
                max = id;
            }
        }

        return max;
    };

    this.updatesDesignDocs = [{
        name: 'all_updates',
        version: 26,
        updates: [{
            update_name: 'update',
            function: function (doc, req) {
                var newDoc = JSON.parse(req.body);
                var rev = doc._rev;
                doc = newDoc;
                doc._rev = rev;
                var message = doc._id.toString();
                return [doc, message];
            }
        }, {
            update_name: 'invDocUpdateItemInfo',
            function: function (doc, req) {
                var info = JSON.parse(req.body);
                doc.info = info;
                var message = doc._id.toString();
                return [doc, message];
            }
        }, {
            update_name: 'add_delete_flag',
            function: "function(doc, req) {var message = \"1\"; doc.deleted = \"1\"; return [doc, message];}"
        }, {
            update_name: 'add_inv_delete_flag',
            function: "function(doc, req) {var message = \"1\"; doc.item_info.deleted = \"1\"; return [doc, message];}"
        }, {
            update_name: 'add_kot',
            function: "function (doc, req) {    var orderInfo = JSON.parse(req.body);    var orderNo = orderInfo.order_no;    var kotInfo = orderInfo.kotInfo;    var message = \"Order#\" + orderNo.toString() + \" SaleId#\" + kotInfo.sale_id.toString();    var index = -1;    for (var i = 0; i < doc.orders.length; i++) {        if (doc.orders[i].order_no === orderNo) {            index = i;            break;        }    }    if (index != -1) {        doc.orders[index].Kots.push(kotInfo);    }    return [doc, message];};"
        }, {
            update_name: 'delete_kot',
            function: "function (doc, req) {    var orderInfo = JSON.parse(req.body);    var orderNo = orderInfo.order_no;    var saleId = orderInfo.kotInfo.saleId;    var message = \"Order#\" + orderNo.toString() + \" SaleId#\" + saleId.toString();    var orderIndex = -1;    for (var i = 0; i < doc.orders.length; i++) {        if (doc.orders[i].order_no === orderNo) {            orderIndex = i;            break;        }    }    if (orderIndex != -1) {        var saleIndex = -1;        for (var j = 0; j < doc.orders[orderIndex].Kots.length; j++) {            if (doc.orders[orderIndex].Kots[j].sale_id === saleId) {                saleIndex = j;                break;            }        }        if (saleIndex != -1) {            doc.orders[orderIndex].Kots.splice(saleIndex, 1);        }    }    return [doc, message];};"
        }, {
            update_name: 'add_order',
            function: function (doc, req) {
                var orderInfo = JSON.parse(req.body);
                var message = orderInfo.order_no.toString();
                doc.orders.push(orderInfo);
                if (doc.maxOrderNo < orderInfo.order_no) {
                    doc.maxOrderNo = orderInfo.order_no;
                }

                return [doc, message];
            }
        }, {
            update_name: 'delete_order',
            function: function (doc, req) {
                var orderInfo = JSON.parse(req.body);
                var orderNo = orderInfo.order_no;
                var message = orderNo.toString();
                var index = -1;
                for (var i = 0; i < doc.orders.length; i++) {
                    if (doc.orders[i].order_no === orderNo) {
                        index = i;
                        break;
                    }
                }
                if (index != -1) {
                    doc.orders.splice(index, 1);
                }
                return [doc, message];
            }
        }, {
            update_name: 'add_reservation',
            function: "function (doc, req) {    var reservationInfo = JSON.parse(req.body);    var message = reservationInfo.reservation_id.toString();    doc.reservations.push(reservationInfo);    return [doc, message];};"
        }, {
            update_name: 'delete_reservation',
            function: "function (doc, req) {    var reservationInfo = JSON.parse(req.body);    var reservationId = reservationInfo.reservation_id;    var message = reservationId.toString();    var index = -1;    for (var i = 0; i < doc.reservations.length; i++) {        if (doc.reservations[i].reservation_id === reservationId) {            index = i;            break;        }    }    if (index != -1) {        doc.reservations.splice(index, 1);    }    return [doc, message];};"
        }, {
            update_name: 'update_item_info',
            function: function (doc, req) {
                //Update Batch and Update Item Info. Not to add any new batcch
                var updateItemInfo = JSON.parse(req.body);

                function isEmptyObject(obj) {
                    if (obj && Object.keys(obj).length && obj.constructor === Object) {
                        return false;
                    }

                    return true;
                }

                //DRY Implement #define equivalent in javascript https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/toString

                if (!isEmptyObject(updateItemInfo.info)) {
                    doc.info = updateItemInfo.info;
                }

                if (!isEmptyObject(updateItemInfo.batches)) {
                    for (var stockKey in updateItemInfo.batches) {
                        doc.batches[stockKey] = updateItemInfo.batches[stockKey]; //Upto the caller to make any validations
                    }
                }

                var message = 'Update Success';
                return [doc, message];
            }
        }, {
            update_name: 'update_batch_info',
            function: function (doc, req) {
                var updateBatchInfo = JSON.parse(req.body);

                function isEmptyObject(obj) {
                    if (obj && Object.keys(obj).length && obj.constructor === Object) {
                        return false;
                    }

                    return true;
                }

                //DRY Implement #define equivalent in javascript https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/toString

                //If item doesn't have batchNumber, update item details also
                if (!isEmptyObject(updateBatchInfo.batches)) {
                    if (!doc.info.hasBatchNumber && !doc.info.hasVariants) {
                        //If item doesn't have batchNumber, update item details also
                        var keys = Object.keys(updateBatchInfo.batches);
                        if (keys.length === 1) {
                            var batchInfo = updateBatchInfo.batches[keys[0]];
                            //Update all the details to info
                            for (var key in batchInfo) {
                                doc.info[key] = batchInfo[key];
                            }
                        }
                    }

                    for (var stockKey in updateBatchInfo.batches) {
                        //Is the below required?
                        // if (doc.batches.hasOwnProperty(stockKey)) {
                        //     var batchInfo = updateBatchInfo.batches[kstockKey];
                        //     //Update all the details to info
                        //     for (var key in batchInfo) {
                        //         doc.info[key] = batchInfo[key];
                        //     }
                        // } else {
                        doc.batches[stockKey] = updateBatchInfo.batches[stockKey]; //Upto the caller to make any validations
                        // }
                    }
                }

                var message = 'Update Success';
                return [doc, message];
            }
        }, {
            //RelaxTodo log the return of the update functions and send proper message back
            update_name: 'rev_inv_trans',
            function: function (doc, req) {
                function getDeltaQuantity(oldUniqueDetail, newUniqueDetail) {
                    if (!oldUniqueDetail) {
                        oldUniqueDetail = {
                            sold: undefined,
                            itemAvailable: undefined,
                            info: undefined
                        };
                    }
                    var bOldSoldFlag = oldUniqueDetail.sold;
                    var bOldItemAvailable = oldUniqueDetail.itemAvailable;
                    var bNewSoldFlag = newUniqueDetail.sold;
                    var bNewItemAvailable = newUniqueDetail.itemAvailable;
                    var iDeltaQuantityFromSold = getDeltaQuantityFromSoldFlags(bOldSoldFlag, bNewSoldFlag, bOldItemAvailable);
                    var iDeltaQuantityFromItemAvailable = getDeltaQuantityFromItemAvailableFlags(bOldItemAvailable, bNewItemAvailable, bOldSoldFlag);
                    var bNotExpected = iDeltaQuantityFromItemAvailable * iDeltaQuantityFromSold === -1;
                    if (bNotExpected) {
                        throw 'Not Expected.';
                    }
                    return iDeltaQuantityFromItemAvailable ? iDeltaQuantityFromItemAvailable : iDeltaQuantityFromSold;
                }

                function getDeltaQuantityFromSoldFlags(bOldSoldFlag, bNewSoldFlag, bOldItemAvailableFlag) {
                    if (bNewSoldFlag === bOldSoldFlag) {
                        return 0;
                    }
                    if (bNewSoldFlag === undefined) {
                        //no change
                        return 0;
                    }
                    if (bNewSoldFlag === true && !bOldSoldFlag && bOldItemAvailableFlag) {
                        //sold
                        // old can be undefined or false
                        return -1;
                    }
                    if (bNewSoldFlag === false && bOldSoldFlag === true && bOldItemAvailableFlag) {
                        return 1;
                    }
                    //bNewSoldFlag = false and bOldSoldFlag = undefined -> no change
                    return 0;
                }

                function getDeltaQuantityFromItemAvailableFlags(bOldItemAvailableFlag, bNewItemAvailableFlag, bOldSoldFlag) {
                    if (bOldItemAvailableFlag === bNewItemAvailableFlag) {
                        return 0;
                    }
                    if (bNewItemAvailableFlag === undefined) {
                        //no change --
                        return 0;
                    }
                    if (bNewItemAvailableFlag === true && !bOldItemAvailableFlag && !bOldSoldFlag) {
                        //sold
                        // old can be undefined or false
                        return 1;
                    }
                    if (bNewItemAvailableFlag === false && bOldItemAvailableFlag === true && !bOldSoldFlag) {
                        return -1;
                    }
                    //bNewItemAvailableFlag = false and bOldItemAvailableFlag = undefined -> no change
                    return 0;
                }

                var deltaDoc = JSON.parse(req.body);

                var stock = doc.stock;
                var transactions = doc.transactions;
                var revTransactions = deltaDoc.transactions;
                var deltaStock = deltaDoc.stock;
                for (var key in revTransactions) {
                    if (transactions.hasOwnProperty(key)) {
                        var stockKey = transactions[key].trans_stockKey; //stockKey is compulsory       
                        if (!stock[stockKey]) {
                            //console.log('stock not found' + stockKey);
                            continue;
                        }

                        //Check for uniqueDetails
                        var deltaUniqueDetails = deltaStock[stockKey].uniqueDetails;
                        var uniqueDetails = stock[stockKey].uniqueDetails;
                        for (var detailKey in deltaUniqueDetails) {
                            if (uniqueDetails.hasOwnProperty(detailKey)) {
                                var iDeltaQuantity = getDeltaQuantity(uniqueDetails[detailKey], deltaUniqueDetails[detailKey]);
                                stock[stockKey].quantity += iDeltaQuantity;
                                doc.quantity += iDeltaQuantity;
                                for (var infoKey in deltaUniqueDetails[detailKey]) {
                                    uniqueDetails[detailKey][infoKey] = deltaUniqueDetails[detailKey][infoKey]; //The assumption is all the serialnumber, imeidetails are present
                                }
                            } else {
                                //console.log('not expected to come here. New unique details during reverse');
                            }
                        }

                        //sold - false -> true -> increase quantity
                        //sold - true -> false -> decrease quantity
                        //available -> false -> true -> increase quantity
                        //available -> true -> false -> decrease quantity

                        //reversing quantity
                        if (!deltaUniqueDetails || !Object.keys(deltaUniqueDetails).length) {
                            stock[stockKey].quantity += (transactions[key].trans_inventory * -1);
                            doc.quantity += (transactions[key].trans_inventory * -1);
                        }
                        delete transactions[key];
                    }
                }

                var message = 'Transaction Completed';
                return [doc, message];
            }
        }, {
            //RelaxTodo log the return of the update functions and send proper message back
            update_name: 'write_inv_trans',
            function: function (doc, req) {
                //updateFunctions.ts any update here please update there also
                var deltaDoc = JSON.parse(req.body);

                var stock = doc.stock;
                var transactions = doc.transactions;
                var newTransactions = deltaDoc.transactions;
                var transactions2Delete = deltaDoc.transactions2Delete;
                var deltaStock = deltaDoc.stock;

                function getDeltaQuantity(oldUniqueDetail, newUniqueDetail) {
                    if (!oldUniqueDetail) {
                        oldUniqueDetail = {
                            sold: undefined,
                            itemAvailable: undefined,
                            info: undefined
                        };
                    }
                    var bOldSoldFlag = oldUniqueDetail.sold;
                    var bOldItemAvailable = oldUniqueDetail.itemAvailable;
                    var bNewSoldFlag = newUniqueDetail.sold;
                    var bNewItemAvailable = newUniqueDetail.itemAvailable;
                    var iDeltaQuantityFromSold = getDeltaQuantityFromSoldFlags(bOldSoldFlag, bNewSoldFlag, bOldItemAvailable);
                    var iDeltaQuantityFromItemAvailable = getDeltaQuantityFromItemAvailableFlags(bOldItemAvailable, bNewItemAvailable, bOldSoldFlag);
                    var bNotExpected = iDeltaQuantityFromItemAvailable * iDeltaQuantityFromSold === -1;
                    if (bNotExpected) {
                        throw 'Not Expected.';
                    }
                    return iDeltaQuantityFromItemAvailable ? iDeltaQuantityFromItemAvailable : iDeltaQuantityFromSold;
                }

                function getDeltaQuantityFromSoldFlags(bOldSoldFlag, bNewSoldFlag, bOldItemAvailableFlag) {
                    if (bNewSoldFlag === bOldSoldFlag) {
                        return 0;
                    }
                    if (bNewSoldFlag === undefined) {
                        //no change
                        return 0;
                    }
                    if (bNewSoldFlag === true && !bOldSoldFlag && bOldItemAvailableFlag) {
                        //sold
                        // old can be undefined or false
                        return -1;
                    }
                    if (bNewSoldFlag === false && bOldSoldFlag === true && bOldItemAvailableFlag) {
                        return 1;
                    }
                    //bNewSoldFlag = false and bOldSoldFlag = undefined -> no change
                    return 0;
                }

                function getDeltaQuantityFromItemAvailableFlags(bOldItemAvailableFlag, bNewItemAvailableFlag, bOldSoldFlag) {
                    if (bOldItemAvailableFlag === bNewItemAvailableFlag) {
                        return 0;
                    }
                    if (bNewItemAvailableFlag === undefined) {
                        //no change --
                        return 0;
                    }
                    if (bNewItemAvailableFlag === true && !bOldItemAvailableFlag && !bOldSoldFlag) {
                        //sold
                        // old can be undefined or false
                        return 1;
                    }
                    if (bNewItemAvailableFlag === false && bOldItemAvailableFlag === true && !bOldSoldFlag) {
                        return -1;
                    }
                    //bNewItemAvailableFlag = false and bOldItemAvailableFlag = undefined -> no change
                    return 0;
                }

                function deleteTransactions() {
                    for (var deleteKey in transactions2Delete) {
                        if (transactions[deleteKey]) {
                            var stockKey = transactions[deleteKey].trans_stockKey; //stockKey is compulsory       
                            if (deltaStock[stockKey].bDeleted) {
                                //only deleted which were left in the normal loop gets executed here

                                //Check for uniqueDetails
                                var deltaUniqueDetails = deltaStock[stockKey].uniqueDetails;
                                var uniqueDetails = stock[stockKey].uniqueDetails;
                                for (var detailKey in deltaUniqueDetails) {
                                    var iDeltaQuantity = getDeltaQuantity(uniqueDetails[detailKey], deltaUniqueDetails[detailKey]);
                                    stock[stockKey].quantity += iDeltaQuantity;
                                    doc.quantity += iDeltaQuantity;

                                    if (uniqueDetails.hasOwnProperty(detailKey)) {
                                        for (var infoKey in deltaUniqueDetails[detailKey]) {
                                            uniqueDetails[detailKey][infoKey] = deltaUniqueDetails[detailKey][infoKey]; //The assumption is all the serialnumber, imeidetails are present
                                        }
                                    } else {
                                        uniqueDetails[detailKey] = deltaUniqueDetails[detailKey]; //The assumption is all the serialnumber, imeidetails are present
                                    }
                                }

                                if (!deltaUniqueDetails || !Object.keys(deltaUniqueDetails).length) {
                                    stock[stockKey].quantity += deltaStock[stockKey].quantity;
                                    doc.quantity += deltaStock[stockKey].quantity;
                                }

                            }

                            delete transactions[deleteKey];
                        }
                    }
                }

                if (transactions2Delete) {
                    deleteTransactions();
                }

                for (var key in newTransactions) {
                    if (!transactions.hasOwnProperty(key) || transactions[key].v !== newTransactions[key].v) {
                        if (transactions.hasOwnProperty(key) && transactions[key].trans_quantity === -1 * newTransactions[key].trans_quantity) {
                            delete transactions[key];
                        } else {
                            transactions[key] = newTransactions[key];
                        }
                        var stockKey = newTransactions[key].trans_stockKey; //stockKey is compulsory       
                        if (!stock[stockKey]) {
                            //New Batch
                            stock[stockKey] = {
                                quantity: 0,
                                uniqueDetails: {}
                            };
                        }
                        //Check for uniqueDetails
                        var deltaUniqueDetails = deltaStock[stockKey].uniqueDetails;
                        var uniqueDetails = stock[stockKey].uniqueDetails;
                        for (var detailKey in deltaUniqueDetails) {
                            var iDeltaQuantity = getDeltaQuantity(uniqueDetails[detailKey], deltaUniqueDetails[detailKey]);
                            stock[stockKey].quantity += iDeltaQuantity;
                            doc.quantity += iDeltaQuantity;

                            if (uniqueDetails.hasOwnProperty(detailKey)) {
                                for (var infoKey in deltaUniqueDetails[detailKey]) {
                                    uniqueDetails[detailKey][infoKey] = deltaUniqueDetails[detailKey][infoKey]; //The assumption is all the serialnumber, imeidetails are present
                                }
                            } else {
                                uniqueDetails[detailKey] = deltaUniqueDetails[detailKey]; //The assumption is all the serialnumber, imeidetails are present
                            }
                        }

                        if (!deltaUniqueDetails || !Object.keys(deltaUniqueDetails).length) {
                            stock[stockKey].quantity += deltaStock[stockKey].quantity;
                            doc.quantity += deltaStock[stockKey].quantity;
                        }

                    } //have a flag that it is edit and write it here
                    // if returns are there don't edit
                }

                var message = 'Transaction Completed';
                return [doc, message];
            }
        }, {
            update_name: 'delta_pending_amount',
            function: function (doc, req) {
                var data = JSON.parse(req.body);
                var message = doc._id.toString();
                var commonFields = ['discount'];
                var intFields = ['item_id', 'line', 'imeiCount', 'categoryId', 'num', 'invoiceCheckpoint', 'sale_time', 'receiving_time', 'time', 'supplier_id', 'customer_id', 'pProfileId', 'parentId'];
                var floatFields = ['price', 'baseUnitPrice', 'sellingPriceExcludingTax', 'totalTaxPercent', 'totalPurchaseTaxPercent', 'purchasePrice', 'mrp', 'reorder_level', 'total', 'subTotal', 'subtotal', 'cost', 'profit', 'quantity', 'deliveryCharge', 'pending_amount', 'discount', 'discount_percent', 'quantity_purchased', 'sellingPrice', 'gDiscountPercent', 'loyaltyEarned', 'rmPnts'];
                var objFields = ['wcInfo', 'slab', 'taxes', 'taxDetailed', 'shippingDetails', 'globalDiscountInfo', 'imeiNumbers', 'unitDocs', 'chargesList', 'chargesTaxList', 'unitsInfo', 'itemTaxList', 'uniqueDetails'];
                var boolFields = ['isNew', 'interState', 'is_serialized', 'hasBatchNumber', 'bOTG', 'hasExpiryDate', 'bSPTaxInclusive', 'bPPTaxInclusive', 'isWarranty'];

                function bStringifiedJSON(value) {
                    if (value.indexOf('{') > -1 &&
                        value.indexOf('}') > -1 &&
                        value.indexOf('":"') > -1 &&
                        Object.keys(JSON.parse(value)).length
                    ) {
                        return true;
                    }
                    return false;
                }

                function converValue(val, key) {
                    // var val = itemVals[iF];
                    if (commonFields.indexOf(key) !== -1 && bStringifiedJSON(val)) {
                        val = JSON.parse(val);
                    } else if (intFields.indexOf(key) !== -1) {
                        val = val ? parseInt(val) : 0;
                    } else if (floatFields.indexOf(key) !== -1) {
                        val = val ? parseFloat(val) : 0;
                    } else if (objFields.indexOf(key) !== -1) {
                        val = val ? JSON.parse(val) : (key === 'wcInfo' ? undefined : {});
                    } else if (boolFields.indexOf(key) !== -1) {
                        if (val && (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true')) {
                            val = true;
                        } else {
                            val = false;
                        }
                    }
                    return val;
                }

                function transformSaleDoc(doc, type, infoFields, itemFields) {
                    var infoKey = 'sales_info';
                    var itemsKey = 'sale_items';
                    if (type === 'saleReturn' || type === 'purchaseReturn') {
                        infoKey = 'info';
                        itemsKey = 'items';
                    } else if (type === 'purchase') {
                        infoKey = 'receivings_info';
                        itemsKey = 'receiving_items';
                    }

                    var items = doc[itemsKey];
                    var info = doc[infoKey];
                    var itemsArray = [];

                    for (var q = 0; q < items.length; q++) {
                        var itemVals = items[q].split(';');
                        var itemInfo = {};
                        for (var iF = 0; iF < itemFields.length; iF++) {
                            var val = converValue(itemVals[iF], itemFields[iF]);

                            itemInfo[itemFields[iF]] = val;
                        }
                        itemsArray.push(itemInfo);
                    }
                    items = itemsArray;
                    var salesInfoVals = info.split(';');
                    var salesInfo = {};
                    salesInfo._id = salesInfoVals[0];
                    for (var s = 0; s < infoFields.length; s++) {
                        var infoVal = converValue(salesInfoVals[s + 1], infoFields[s]);
                        salesInfo[infoFields[s]] = infoVal;
                    }
                    info = salesInfo;
                    doc[infoKey] = info;
                    doc[itemsKey] = items;
                    doc.payments = JSON.parse(doc.payments);
                    return doc

                }

                if (!data.newPayments.length) {
                    return;
                }

                var infoKey = 'sales_info';
                var paymentIdKey = 'payment_sale_id';
                var type = 'sale';
                var infoFields = ['num', 'invoicePrefix', 'invoiceCheckpoint', 'sale_time', 'refBookingId', 'checkNo', 'wcInfo', 'customer_id', 'employee_id', 'customer', 'employee', 'comment', 'vehicle_phNo', 'vehicleNo', 'total', 'subtotal', 'taxes', 'taxDetailed', 'cost', 'profit', 'quantity', 'deliveryCharge', 'deliveryBoy', 'bHomeDelivery', 'pending_amount', 'type', 'state_name', 'GSTIN', 'round_off_method', 'shippingDetails', 'globalDiscountInfo', 'tableNo', 'pProfileId', 'order_no', 'loyaltyEarned', 'rmPnts', 'discount', 't_no', 'purchaseOrderDocId'];
                var itemFields = ['name', 'category', 'hsn', 'item_id', 'uniqueItemCode', 'ItemType', 'stockKey', 'batchId', 'skuName', 'unit', 'unitId', 'baseUnitId', 'unitsInfo', 'line', 'quantity_purchased', 'discount_percent', 'gDiscountPercent', 'purchasePrice', 'sellingPrice', 'mrp', 'item_location', 'bSPTaxInclusive', 'bPPTaxInclusive', 'taxes', 'itemTaxList', 'slab', 'expiry', 'stock_name', 'chargesList', 'chargesTaxList', 'warranty', 'warrantyTerms', 'total', 'subTotal', 'cost', 'profit', 'imeiNumbers', 'serialnumber'];
                if (doc.info) {
                    type = 'saleReturn';
                    infoFields = ['num', 'invoicePrefix', 'invoiceCheckpoint', 'time', 'refBookingId', 'checkNo', 'wcInfo', 'customer_id', 'employee_id', 'customer', 'employee', 'comment', 'vehicle_phNo', 'vehicleNo', 'total', 'subtotal', 'taxes', 'taxDetailed', 'cost', 'profit', 'quantity', 'deliveryCharge', 'deliveryBoy', 'bHomeDelivery', 'pending_amount', 'type', 'state_name', 'GSTIN', 'round_off_method', 'shippingDetails', 'globalDiscountInfo', 'tableNo', 'pProfileId', 'order_no', 'parentId', 'rmPnts', 'discount', 't_no', 'purchaseOrderDocId'];
                }
                if (doc._id.indexOf('receiving') === 0) {
                    //receiving                
                    infoKey = 'receivings_info';
                    paymentIdKey = 'payment_receiving_id';
                    type = 'purchase';
                    infoFields = ['receiving_time', 'checkNo', 'supplier_id', 'employee_id', 'supplier', 'employee', 'comment', 'invoice_number', 'payment_type', 'pending_amount', 'total', 'subtotal', 'taxes', 'taxDetailed', 'quantity', 'receiving_id', 'type', 'round_off_method', 'amount_tendered', 'GSTIN', 'state_name', 'discount', 'interState'];
                    itemFields = ['name', 'hsn', 'item_id', 'batchId', 'stockKey', 'skuName', 'line', 'description', 'quantity_purchased', 'taxes', 'total', 'subTotal', 'expiry', 'unitId', 'baseUnitId', 'unitsInfo', 'bPPTaxInclusive', 'item_location', 'itemTaxList', 'slab', 'unit', 'hasExpiryDate', 'is_serialized', 'hasBatchNumber', 'imeiCount', 'hasVariants', 'discount', 'uniqueDetails'];
                    if (doc.info) {
                        type = 'purchaseReturn';
                        infoFields = ['time', 'checkNo', 'supplier_id', 'employee_id', 'supplier', 'employee', 'comment', 'invoice_number', 'payment_type', 'pending_amount', 'total', 'subtotal', 'taxes', 'taxDetailed', 'quantity', 'id', 'type', 'round_off_method', 'amount_tendered', 'GSTIN', 'state_name', 'discount', 'interState', 'parentId'];
                    }
                }
                // if (doc._id.indexOf('Credit') === -1) {
                doc = transformSaleDoc(doc, type, infoFields, itemFields);
                // }

                var bUpdate = true;
                for (var i = 0; i < doc.payments; i++) {
                    if (doc.payments[i][paymentIdKey] === data.newPayments[0][paymentIdKey]) {
                        //checking with 0 is enough .. because all the ids will be same
                        //already updated .. second time coming to update the same thing
                        bUpdate = false;
                        break;
                    }
                }

                if (bUpdate) {
                    doc[infoKey].pending_amount -= data.paidAmount;
                    Array.prototype.push.apply(doc.payments, data.newPayments);
                }

                function getValString(val) {
                    if (val === undefined || val === null) {
                        val = ""
                    } else if (typeof val === "object") {
                        val = JSON.stringify(val);
                    }
                    if (typeof val === 'string' && val.indexOf(';') > -1) {
                        val = val.replace(';', '');
                    }
                    return val;
                }

                function encodeTransDoc(doc, type, infoFields, itemFields) {
                    var infoKey = 'sales_info';
                    var itemsKey = 'sale_items';
                    if (type === 'saleReturn' || type === 'purchaseReturn') {
                        infoKey = 'info';
                        itemsKey = 'items';
                    } else if (type === 'purchase') {
                        infoKey = 'receivings_info';
                        itemsKey = 'receiving_items';
                    }
                    var info = doc[infoKey];
                    if (type === 'saleReturn') {
                        info.num = doc.id;
                    }
                    var items = doc[itemsKey];
                    var transInfo = doc._id + ';';
                    for (var i = 0; i < infoFields.length; i++) {
                        var val = getValString(info[infoFields[i]])
                        transInfo += val + ';';
                    }
                    var itemsList = [];
                    for (var j = 0; j < items.length; j++) {
                        var itemString = "";
                        for (var k = 0; k < itemFields.length; k++) {
                            var fieldVal = getValString(items[j][itemFields[k]])
                            itemString += fieldVal + ';';
                        }
                        itemsList.push(itemString);
                    }

                    // var payments = "";
                    // for (var l = 0; l < doc.payments.length; l++) {
                    //     payments += doc.payments[l].payment_type + ';' + doc.payments[l].payment_amount + ';' + (doc.payments[l].returnAmt ? doc.payments[l].returnAmt : 0) + ';';
                    // }
                    doc.payments = JSON.stringify(doc.payments);
                    doc[infoKey] = transInfo;
                    doc[itemsKey] = itemsList;
                    return doc;

                }
                // if (doc._id.indexOf('Credit') === -1) {
                doc = encodeTransDoc(doc, type, infoFields, itemFields);
                // }
                return [doc, message];
            }
        }, {
            update_name: 'delta_element_trans',
            function: function (doc, req) {
                var data = JSON.parse(req.body);
                var message = doc._id.toString();

                var transactions = doc.transactions;
                if (!transactions) {
                    transactions = {};
                }

                var timeStamp = data.timeStamp
                if (transactions[timeStamp]) {
                    if (transactions[timeStamp] === data.v) {
                        return [doc, message];
                    } else if (transactions[timeStamp] > data.v) {
                        //not expected to come here
                    }
                }
                transactions[timeStamp] = data.v;

                var date = new Date(parseInt(timeStamp));
                var year = date.getFullYear();
                var month = date.getMonth();
                var key = year + '-' + month;
                if (!doc.stats) {
                    doc.stats = {};
                }
                if (!doc.stats[key]) {
                    doc.stats[key] = 0;
                }
                if (!doc.visitCount) {
                    doc.visitCount = 0;
                }
                if (!doc.loyaltyPnts) {
                    doc.loyaltyPnts = 0;
                }

                doc.stats[key]++;
                doc.visitCount++;
                doc.lastTS = timeStamp;
                if (data.total) {
                    doc.total += data.total;
                }
                doc.credit_balance += data.balance;
                doc.transactions = transactions;
                if (data.loyaltyPnts) { // if loyaltyPnts are not there in params then existing will be NaN
                    doc.loyaltyPnts += data.loyaltyPnts;
                }

                return [doc, message];
            }
        }, {

            update_name: 'update_returns_docId',

            function: function (doc, req) {
                var data = JSON.parse(req.body);
                var message = doc._id.toString();

                if (!doc.mods) {
                    doc.mods = [];
                }

                var index = doc.mods.indexOf(data.returnDocId);
                if (data.bReverse) {
                    if (index > -1) {
                        doc.mods.splice(index, 1);
                    }
                } else {
                    if (index === -1) {
                        doc.mods.push(data.returnDocId);
                    }
                }

                return [doc, message];
            }
        }, {
            update_name: 'update_customer',
            function: function (doc, req) {
                var commonFields = ['discount'];
                var intFields = ['item_id', 'line', 'imeiCount', 'categoryId', 'num', 'invoiceCheckpoint', 'sale_time', 'receiving_time', 'time', 'supplier_id', 'customer_id', 'pProfileId', 'parentId'];
                var floatFields = ['price', 'baseUnitPrice', 'sellingPriceExcludingTax', 'totalTaxPercent', 'totalPurchaseTaxPercent', 'purchasePrice', 'mrp', 'reorder_level', 'total', 'subTotal', 'subtotal', 'cost', 'profit', 'quantity', 'deliveryCharge', 'pending_amount', 'discount', 'discount_percent', 'quantity_purchased', 'sellingPrice', 'gDiscountPercent', 'loyaltyEarned', 'rmPnts'];
                var objFields = ['wcInfo', 'slab', 'taxes', 'taxDetailed', 'shippingDetails', 'globalDiscountInfo', 'imeiNumbers', 'unitDocs', 'chargesList', 'chargesTaxList', 'unitsInfo', 'itemTaxList', 'uniqueDetails'];
                var boolFields = ['isNew', 'interState', 'is_serialized', 'hasBatchNumber', 'bOTG', 'hasExpiryDate', 'bSPTaxInclusive', 'bPPTaxInclusive', 'isWarranty'];

                function bStringifiedJSON(value) {
                    if (value.indexOf('{') > -1 &&
                        value.indexOf('}') > -1 &&
                        value.indexOf('":"') > -1 &&
                        Object.keys(JSON.parse(value)).length
                    ) {
                        return true;
                    }
                    return false;
                }

                function converValue(val, key) {
                    // var val = itemVals[iF];
                    if (commonFields.indexOf(key) !== -1 && bStringifiedJSON(val)) {
                        val = JSON.parse(val);
                    } else if (intFields.indexOf(key) !== -1) {
                        val = val ? parseInt(val) : 0;
                    } else if (floatFields.indexOf(key) !== -1) {
                        val = val ? parseFloat(val) : 0;
                    } else if (objFields.indexOf(key) !== -1) {
                        val = val ? JSON.parse(val) : (key === 'wcInfo' ? undefined : {});
                    } else if (boolFields.indexOf(key) !== -1) {
                        if (val && (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true')) {
                            val = true;
                        } else {
                            val = false;
                        }
                    }
                    return val;
                }

                function transformSaleDoc(doc, type, infoFields, itemFields) {
                    var infoKey = 'sales_info';
                    var itemsKey = 'sale_items';
                    if (type === 'saleReturn' || type === 'purchaseReturn') {
                        infoKey = 'info';
                        itemsKey = 'items';
                    } else if (type === 'purchase') {
                        infoKey = 'receivings_info';
                        itemsKey = 'receiving_items';
                    }

                    var items = doc[itemsKey];
                    var info = doc[infoKey];
                    var itemsArray = [];

                    for (var q = 0; q < items.length; q++) {
                        var itemVals = items[q].split(';');
                        var itemInfo = {};
                        for (var iF = 0; iF < itemFields.length; iF++) {
                            var val = converValue(itemVals[iF], itemFields[iF]);

                            itemInfo[itemFields[iF]] = val;
                        }
                        itemsArray.push(itemInfo);
                    }
                    items = itemsArray;
                    var salesInfoVals = info.split(';');
                    var salesInfo = {};
                    salesInfo._id = salesInfoVals[0];
                    for (var s = 0; s < infoFields.length; s++) {
                        var infoVal = converValue(salesInfoVals[s + 1], infoFields[s]);
                        salesInfo[infoFields[s]] = infoVal;
                    }
                    info = salesInfo;
                    doc[infoKey] = info;
                    doc[itemsKey] = items;
                    doc.payments = JSON.parse(doc.payments);
                    return doc

                }
                var infoKey = 'sales_info';
                var paymentIdKey = 'payment_sale_id';
                var type = 'sale';
                var infoFields = ['num', 'invoicePrefix', 'invoiceCheckpoint', 'sale_time', 'refBookingId', 'checkNo', 'wcInfo', 'customer_id', 'employee_id', 'customer', 'employee', 'comment', 'vehicle_phNo', 'vehicleNo', 'total', 'subtotal', 'taxes', 'taxDetailed', 'cost', 'profit', 'quantity', 'deliveryCharge', 'deliveryBoy', 'bHomeDelivery', 'pending_amount', 'type', 'state_name', 'GSTIN', 'round_off_method', 'shippingDetails', 'globalDiscountInfo', 'tableNo', 'pProfileId', 'order_no', 'loyaltyEarned', 'rmPnts', 'discount', 't_no', 'purchaseOrderDocId'];
                var itemFields = ['name', 'category', 'hsn', 'item_id', 'uniqueItemCode', 'ItemType', 'stockKey', 'batchId', 'skuName', 'unit', 'unitId', 'baseUnitId', 'unitsInfo', 'line', 'quantity_purchased', 'discount_percent', 'gDiscountPercent', 'purchasePrice', 'sellingPrice', 'mrp', 'item_location', 'bSPTaxInclusive', 'bPPTaxInclusive', 'taxes', 'itemTaxList', 'slab', 'expiry', 'stock_name', 'chargesList', 'chargesTaxList', 'warranty', 'warrantyTerms', 'total', 'subTotal', 'cost', 'profit', 'imeiNumbers', 'serialnumber'];
                if (doc.info) {
                    type = 'saleReturn';
                    infoFields = ['num', 'invoicePrefix', 'invoiceCheckpoint', 'time', 'refBookingId', 'checkNo', 'wcInfo', 'customer_id', 'employee_id', 'customer', 'employee', 'comment', 'vehicle_phNo', 'vehicleNo', 'total', 'subtotal', 'taxes', 'taxDetailed', 'cost', 'profit', 'quantity', 'deliveryCharge', 'deliveryBoy', 'bHomeDelivery', 'pending_amount', 'type', 'state_name', 'GSTIN', 'round_off_method', 'shippingDetails', 'globalDiscountInfo', 'tableNo', 'pProfileId', 'order_no', 'parentId', 'rmPnts', 'discount', 't_no', 'purchaseOrderDocId'];
                }
                var data = JSON.parse(req.body);
                if (doc._id.indexOf('suspendedSale_') < 0) {
                    doc = transformSaleDoc(doc, type, infoFields, itemFields)
                }

                var message = doc._id.toString();

                doc.sales_info.customer_id = data.customer_id;

                function getValString(val) {
                    if (val === undefined || val === null) {
                        val = ""
                    } else if (typeof val === "object") {
                        val = JSON.stringify(val);
                    }
                    if (typeof val === 'string' && val.indexOf(';') > -1) {
                        val = val.replace(';', '');
                    }
                    return val;
                }

                function encodeTransDoc(doc, type, infoFields, itemFields) {
                    var infoKey = 'sales_info';
                    var itemsKey = 'sale_items';
                    if (type === 'saleReturn' || type === 'purchaseReturn') {
                        infoKey = 'info';
                        itemsKey = 'items';
                    } else if (type === 'purchase') {
                        infoKey = 'receivings_info';
                        itemsKey = 'receiving_items';
                    }
                    var info = doc[infoKey];
                    if (type === 'saleReturn') {
                        info.num = doc.id;
                    }
                    var items = doc[itemsKey];
                    var transInfo = doc._id + ';';
                    for (var i = 0; i < infoFields.length; i++) {
                        var val = getValString(info[infoFields[i]])
                        transInfo += val + ';';
                    }
                    var itemsList = [];
                    for (var j = 0; j < items.length; j++) {
                        var itemString = "";
                        for (var k = 0; k < itemFields.length; k++) {
                            var fieldVal = getValString(items[j][itemFields[k]])
                            itemString += fieldVal + ';';
                        }
                        itemsList.push(itemString);
                    }

                    doc.payments = JSON.stringify(doc.payments);
                    doc[infoKey] = transInfo;
                    doc[itemsKey] = itemsList;
                    return doc;

                }
                if (doc._id.indexOf('suspendedSale_') < 0) {
                    doc = encodeTransDoc(doc, type, infoFields, itemFields);
                }
                return [doc, message];
            }
        }, {
            update_name: 'update_transaction_status',
            function: function (doc, req) {
                var data = JSON.parse(req.body);
                var message = doc._id.toString();

                var statusKey = 'status';
                if (doc.transStatus) {
                    statusKey = 'transStatus';
                }

                for (var key in data) {
                    var transKey;

                    var transType = key.substring(0, key.indexOf('_'));
                    switch (transType) {
                        case 'inventory':
                            transKey = 'inventoryTrans';
                            if (doc[statusKey].bReverse || doc[statusKey].bReject) {
                                transKey = 'reverseInvTrans';
                            }
                            break;
                        case 'item':
                            transKey = 'items';
                            break;
                        case 'sale':
                            transKey = 'parentSalesTrans';
                            //Temporary solution. parentSalesTrans and parentDoc can't exist in the same doc.
                            if (!doc[statusKey].hasOwnProperty(transKey)) {
                                transKey = 'parentDoc';
                            }

                            break;
                        case 'receiving':
                            transKey = 'parentReceivingTrans';
                            if (!doc[statusKey].hasOwnProperty(transKey)) {
                                transKey = 'parentDoc';
                            }

                            break;
                        case 'customer':
                            transKey = 'customers';
                            break;
                        case 'supplier':
                            transKey = 'suppliers';
                            break;
                        default:
                        //console.log('unknown type');
                    }

                    if (!transKey) {
                        return;
                    }

                    var currentStatus = doc[statusKey][transKey][key];
                    var updatedStatus = data[key];

                    for (var prop in updatedStatus) {
                        currentStatus[prop] = updatedStatus[prop];
                    }

                    if (currentStatus.status === 0) {
                        delete currentStatus.doc;
                    }
                }

                var bCompleted = true;
                for (var transType in doc[statusKey]) {
                    if (transType === 'status' || transType === 'bReverse' || transType === 'bReject' || transType === 'reason') {
                        continue;
                    }

                    for (key in doc[statusKey][transType]) {
                        var transaction = doc[statusKey][transType][key];
                        if (transaction.status) {
                            bCompleted = false;
                            break;
                        }
                    }

                    if (!bCompleted) {
                        break;
                    }
                }

                if (bCompleted) {
                    doc[statusKey].status = 0;
                    if (doc[statusKey].bReverse) {
                        doc._deleted = true;
                    } else if (doc[statusKey].bReject) {
                        doc.bRejected = true;
                        doc.reason = doc[statusKey].reason;
                    }
                }

                return [doc, message];
            }
        }]
    }];

    this.designDocs = [{
        name: "ui_data",
        version: 3,
        filters: [{
            name: "ui_data",
            function: function (doc, req) {
                if (Object.keys(doc).length === 2) {
                    //dummy docs
                    return false;
                }

                var doctype = doc._id;
                var uidx = doc._id.indexOf("_");
                if (uidx > 0) {
                    doctype = doc._id.substring(0, uidx);
                } else if (uidx === 0) {
                    //design docs
                    return false;
                }

                var excludedChangeFields = ['sale', 'saleCredit', 'saleReturn', 'receiving', 'receivingCredit', 'receivingReturn', 'suspendedSale', 'roomSale', 't'];
                if (excludedChangeFields.indexOf(doctype) > -1) {
                    return false;
                }

                if (doc._id === doctype && doc._deleted && doc._id !== 'loyalty') {
                    //doc is deleted 
                    //wrote it for dummy documents
                    return false;
                }

                return true;
            }
        }],
        views: []
    },
    {
        name: 'all_unique_data',
        version: 1,
        views: [{
            viewName: 'unique_data',
            function: function (doc) {
                if (doc.deleted) {
                    return;
                }

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === "tariff" || doctype === "room" || doctype === "addOn") {
                        if (typeof (doc.name) === "string") {
                            emit(doctype + '_' + doc.name.toLowerCase());
                        } else {
                            emit(doctype + '_' + doc.name);
                        }
                    }
                }
            }
        }]
    },
    {
        name: 'all_dependents_data',
        version: 1,
        views: [{
            viewName: 'dependents_data',
            function: function (doc) {
                if (doc.deleted) {
                    return;
                }

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === "room") {
                        emit('tariff_' + doc.tariff);
                    } else if (doctype === "roomTrans") {
                        for (var i = 0; i < doc.roomsInfo.length; i++) {
                            emit('room_' + doc.roomsInfo[i].roomId);
                        }
                    }
                }
            }
        }]
    },
    {
        name: 'all_customers_data',
        version: 3,
        views: [{
            viewName: 'all_customers_unique_data',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'customer') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.phone_number);
                        if (doc.email) {
                            emit(doc.email);
                        }
                        if (doc.alienId) {
                            emit('alien_' + doc.alienId); // using delimitter to avoid confusion in dummy phone and alien number
                        }
                    }
                }
            },
            version: 1
        }]
    }, {
        name: 'all_variants_data',
        version: 1,
        views: [{
            viewName: 'all_variants_unique_data',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'variant') {
                        if (doc.deleted) {
                            emit(null, doc.id); // id has to be emitted for maintain auto-increment
                            return;
                        }
                        emit(doc.name.toLowerCase(), doc.id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    }, {
        name: 'all_items_data',
        version: 45,
        views: [{
            viewName: 'item-hash',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'item') {
                        var key = doc.info.name.toLowerCase() + '-' + doc.info.categoryId;
                        if (doc.info.item_number) {
                            key += '-' + doc.info.item_number;
                        }
                        if (doc.info.uniqueItemCode) {
                            key += '-' + doc.info.uniqueItemCode;
                        }
                        if (doc.deleted) {
                            key = null; // item_id has to be emitted for maintain auto-increment                                                       
                        }

                        emit(key, doc.item_id);
                    }
                }

            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'item-search',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'item') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.info.name + '_n');
                        emit(doc.info.categoryId + '_' + doc.info.name + '_n');
                        if (doc.info.item_number) {
                            emit(doc.info.item_number + '_b');
                            emit(doc.info.categoryId + '_' + doc.info.item_number + '_b');
                        }

                        if (doc.info.uniqueItemCode) {
                            emit(doc.info.uniqueItemCode + '_uc');
                            emit(doc.info.categoryId + '_' + doc.info.uniqueItemCode + '_uc');
                        }
                    }
                }

            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'items-by-type',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'item') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.info.ItemType + '_' + 'category_' + doc.info.categoryId, doc.item_id)
                    }
                }

            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'item-settings',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'item') {
                        if (doc.deleted) {
                            return;
                        }

                        //Emitting the related settings so that they cannot be deleted without item being deleted
                        var info = doc.info;
                        var bHasBOM = doc.info.bomData ? true : false;
                        //,info.ItemType as value to because itemTuype is being used to count the salesItem count and purchase itemcount of categories
                        if (info.brandId) {
                            emit('brand_' + info.brandId, [info.ItemType, info.subCategories]);
                        }

                        emit('category_' + info.categoryId, [info.ItemType, info.subCategories, bHasBOM]);
                        for (var uId in info.unitsInfo) {
                            emit('unit_' + uId, [info.ItemType, info.subCategories]);
                            for (var pId in info.unitsInfo[uId].pProfilesData) {
                                emit('pProfile_' + pId, [info.ItemType, info.subCategories]);
                            }
                        }
                        if (info.subCategories) {
                            for (var s = 0; s < info.subCategories.length; s++) {
                                emit('subCategory_' + info.subCategories[s].id, [info.ItemType, info.subCategories]);
                            }
                        }
                        for (var i = 0; i < info.salesTaxes.length; i++) {
                            emit('tax_' + info.salesTaxes[i], [info.ItemType, info.subCategories]);
                        }
                        for (var j = 0; j < info.purchaseTaxes.length; j++) {
                            emit('tax_' + info.purchaseTaxes[j], [info.ItemType, info.subCategories]);
                        }
                        if (info.salesSlab) {
                            emit('slab_' + info.salesSlab, [info.ItemType, info.subCategories]);
                        }
                        if (info.purchaseSlab) {
                            emit('slab_' + info.purchaseSlab, [info.ItemType, info.subCategories]);
                        }

                        if (info.loyalityId) {
                            emit('loyality_' + loyalityId, [info.ItemType, info.subCategories]);
                        }

                        var batches = doc.batches;
                        for (var stockKey in batches) {


                            for (var uId in batches[stockKey].unitsInfo) {
                                emit('unit_' + uId, [info.ItemType, batches[stockKey].subCategories]);
                                for (var pId in batches[stockKey].unitsInfo[uId].pProfilesData) {
                                    emit('pProfile_' + pId, [info.ItemType, batches[stockKey].subCategories]);
                                    var discountId = batches[stockKey].unitsInfo[uId].pProfilesData[pId].discountId
                                    if (discountId) {
                                        emit('discount_' + discountId, [info.ItemType, info.subCategories]);
                                    }
                                }
                            }
                        }

                    } else if (doctype === 'profile') {
                        if (doc.slab) {
                            emit('slab_' + doc.slab);
                        }

                        function emitArray(arr, type) {
                            if (arr && arr.length) {
                                for (var i = 0; i < arr.length; i++) {
                                    emit(type + '_' + arr[i]);
                                }
                            }
                        }

                        emitArray(doc.normalTaxes, 'tax');
                        emitArray(doc.preparedTaxes, 'tax');
                        emitArray(doc.liquorTaxes, 'tax');
                        emitArray(doc.charges, 'charge');
                    }
                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'all_purchase_order_items',
            function: function (doc) {
                if (doc._id.indexOf("item_") === 0) {
                    const getProfileDoc = function (itemInfo) {
                        const priceDoc = itemInfo.unitsInfo[itemInfo.baseUnitId].pProfilesData;
                        return priceDoc[Object.keys(priceDoc)[0]];
                    }
                    if (doc.info.ItemType !== 'Ingredient' && doc.info.ItemType !== 'Service' && doc.info.bAvailableForPurchaseOrder !== false && !doc.deleted) {
                        const profileDoc = getProfileDoc(doc.info);
                        if (profileDoc.sellingPrice) {
                            emit(doc.info.name, {
                                rev: doc._rev,
                                categoryId: doc.info.categoryId
                            });
                        }
                    }
                }

            }
        },
        {
            viewName: 'item-all-images',
            function: function (doc) {
                if (doc._id.indexOf("item_") === 0 && doc.info && doc.info.images && doc.info.images.length) {
                    emit(doc.item_id, doc.info.images);
                }
            }
        },
        {
            viewName: 'item-settings_unique_category',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'category') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.name.toLowerCase());
                    }
                }
            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_subCategory',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'subCategory') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.name.toLowerCase());
                    }
                }
            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_unit',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'unit') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.name.toLowerCase());
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_brand',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'brand') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.name.toLowerCase());
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_discount',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'discount') {
                        if (doc.deleted) {
                            return;
                        }
                        var docUniqueKey = doc.name.toLowerCase() + '_' + doc.discount;
                        emit(docUniqueKey);
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_tax',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'tax') {
                        if (doc.deleted) {
                            return;
                        }
                        var docUniqueKey = doc.name.toLowerCase() + '_' + doc.percent;
                        emit(docUniqueKey);
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_profile',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'profile') {
                        if (doc.deleted) {
                            return;
                        }
                        var docUniqueKey = doc.name.toLowerCase();
                        emit(docUniqueKey);
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_slab',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'slab') {
                        if (doc.deleted) {
                            return;
                        }
                        var docUniqueKey = doc.name.toLowerCase();
                        emit(docUniqueKey);
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'item-settings_unique_charge',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'charge') {
                        if (doc.deleted) {
                            return;
                        }
                        var docUniqueKey = doc.name.toLowerCase() + '_' + doc.percent;
                        emit(docUniqueKey);
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        },
        {
            viewName: 'item-settings_unique_pProfile',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'pProfile') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.name.toLowerCase());
                    }

                }

            },
            reduceFunction: "_count",
            version: 1
        }, {
            viewName: 'batchId-stockKey',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'item') {
                        if (doc.deleted) {
                            return;
                        }

                        for (var stockKey in doc.batches) {
                            emit(stockKey, doc.batches[stockKey]);
                        }
                    } else if (doctype === 'inventory') {
                        if (doc.deleted) {
                            return;
                        }

                        emit('id_' + doc.item_id, {
                            quantity: doc.quantity,
                            info: doc.info
                        });
                        for (var stockKey in doc.stock) {
                            emit(stockKey, doc.stock[stockKey].quantity);
                        }
                    }
                }

            },
            version: 1
        }, {
            viewName: 'all_bom_itemid',
            function(doc) {
                var doctype,
                    uidx;
                var dirtyObj = {};
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc
                        ._id
                        .substring(0, uidx);
                    if (doctype === 'item') {
                        var key = doc
                            .info
                            .name
                            .toLowerCase() + '-' + doc.info.categoryId;
                        if (doc.info.item_number) {
                            key += '-' + doc.info.item_number;
                        }

                        if (doc.info.uniqueItemCode) {
                            key += '-' + doc.info.uniqueItemCode;
                        }
                        if (doc.info.bomData) {
                            var ingredientArr = doc.info.bomData.ingredient_info;
                            for (var i = 0; i < ingredientArr.length; i++) {
                                var itemId = ingredientArr[i].ingredientsId
                                if (dirtyObj[itemId]) {
                                    continue;
                                }
                                dirtyObj[itemId] = 1;
                                emit(itemId, null);
                            }
                        }
                    }
                }

            },
            version: 1
        }
        ]
    }, {
        name: 'all_inventory_data',
        version: 23,
        views: [{
            viewName: 'uids',
            function: function (doc) {

                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'inventory') {
                        if (doc.deleted) {
                            return;
                        }
                        var stock = doc.stock;
                        for (var batchId in stock) {
                            //RelaxTodo hasOwnProperty is it required?
                            var batch = stock[batchId];
                            for (var detailKey in batch.uniqueDetails) {
                                var detail = batch.uniqueDetails[detailKey];
                                if (!detail.itemAvailable) {
                                    /**
                                     * The following cases will end up here
                                     * 1. Do Sales without adding item/imeidetails first
                                     * 2. If imei details were added but removed later through stock update
                                     * 3. Purchase Return
                                     */
                                    continue;
                                }

                                var detailInfo = detail.info; //#RelaxNext Good if we can have itemName here to show nice error response if uniqueValidation fails
                                if (detailInfo.serialnumber) {
                                    emit(detailInfo.serialnumber, detailInfo); //passing detailInfo to know the item's status
                                }
                                //RelaxTodo make sure pass empty imeiNumbers array
                                for (var i = 0; i < detailInfo.imeiNumbers.length; i++) {
                                    emit(detailInfo.imeiNumbers[i], detailInfo);
                                }
                            }
                        }

                    }
                }

            }
        }, {
            viewName: 'inventory_all_transaction',
            function: function (doc) {
                if (doc._id.indexOf('inventory_') === 0 && !doc.deleted) {

                    var transaction = doc.transactions;
                    for (key in transaction) {
                        var stockKey = doc.stock[transaction[key].trans_stockKey];
                        var transactionObj = {
                            item_id: doc.item_id,
                            stock: stockKey,
                            transaction: transaction[key]
                        }
                        emit(key, transactionObj)
                    }
                }

            }
        },
        {
            viewName: 'uids_include_sold',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'inventory') {
                        if (doc.deleted) {
                            return;
                        }
                        var stock = doc.stock;
                        for (var batchId in stock) {
                            //RelaxTodo hasOwnProperty is it required?
                            var batch = stock[batchId];
                            for (var detailKey in batch.uniqueDetails) {
                                var detail = batch.uniqueDetails[detailKey];
                                if (!detail.itemAvailable && !detail.sold) {
                                    continue;
                                }

                                var detailInfo = detail.info; //#RelaxNext Good if we can have itemName here to show nice error response if uniqueValidation fails
                                if (detailInfo.serialnumber) {
                                    emit(detailInfo.serialnumber, detailInfo); //passing detailInfo to know the item's status
                                }
                                //RelaxTodo make sure pass empty imeiNumbers array
                                for (var i = 0; i < detailInfo.imeiNumbers.length; i++) {
                                    emit(detailInfo.imeiNumbers[i], detailInfo);
                                }
                            }
                        }

                    }
                }

            }
        },
        {
            viewName: 'uids_history_by_timestamp',
            function: function (doc) {
                var doctype, uidx;
                var commonFields = ['discount'];
                var intFields = ['item_id', 'line', 'imeiCount', 'categoryId', 'num', 'invoiceCheckpoint', 'sale_time', 'receiving_time', 'time', 'supplier_id', 'customer_id', 'pProfileId', 'parentId'];
                var floatFields = ['price', 'baseUnitPrice', 'sellingPriceExcludingTax', 'totalTaxPercent', 'totalPurchaseTaxPercent', 'purchasePrice', 'mrp', 'reorder_level', 'total', 'subTotal', 'subtotal', 'cost', 'profit', 'quantity', 'deliveryCharge', 'pending_amount', 'discount', 'discount_percent', 'quantity_purchased', 'sellingPrice', 'gDiscountPercent', 'loyaltyEarned', 'rmPnts'];
                var objFields = ['wcInfo', 'slab', 'taxes', 'taxDetailed', 'shippingDetails', 'globalDiscountInfo', 'imeiNumbers', 'unitDocs', 'chargesList', 'chargesTaxList', 'unitsInfo', 'itemTaxList', 'uniqueDetails'];
                var boolFields = ['isNew', 'interState', 'is_serialized', 'hasBatchNumber', 'bOTG', 'hasExpiryDate', 'bSPTaxInclusive', 'bPPTaxInclusive', 'isWarranty'];

                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    var docTypes = ['se', 'sale', 'receiving', 'saleReturn', 'receivingReturn'];
                    var docIndex = docTypes.indexOf(doctype);
                    if (docIndex > -1) {
                        if (doc.deleted) {
                            return;
                        }
                        var items = [];
                        var ts = doc.timeStamp ? doc.timeStamp : parseInt(doc._id.substring(uidx + 1, doc._id.length));
                        var itemFields = ['name', 'category', 'hsn', 'item_id', 'uniqueItemCode', 'ItemType', 'stockKey', 'batchId', 'skuName', 'unit', 'unitId', 'baseUnitId', 'unitsInfo', 'line', 'quantity_purchased', 'discount_percent', 'gDiscountPercent', 'purchasePrice', 'sellingPrice', 'mrp', 'item_location', 'bSPTaxInclusive', 'bPPTaxInclusive', 'taxes', 'itemTaxList', 'slab', 'expiry', 'stock_name', 'chargesList', 'chargesTaxList', 'warranty', 'warrantyTerms', 'total', 'subTotal', 'cost', 'profit', 'imeiNumbers', 'serialnumber'];
                        if (docIndex === 0) {
                            items = doc.items;
                            ts = parseInt(ts);
                        } else if (docIndex === 1) {
                            items = decodeItems(doc.sale_items, itemFields);
                            var tempArray = doc.sales_info.split(';');
                            ts = parseInt(tempArray[4]);

                        } else if (docIndex === 2) {
                            itemFields = ['name', 'hsn', 'item_id', 'batchId', 'stockKey', 'skuName', 'line', 'description', 'quantity_purchased', 'taxes', 'total', 'subTotal', 'expiry', 'unitId', 'baseUnitId', 'unitsInfo', 'bPPTaxInclusive', 'item_location', 'itemTaxList', 'slab', 'unit', 'hasExpiryDate', 'is_serialized', 'hasBatchNumber', 'imeiCount', 'hasVariants', 'discount', 'uniqueDetails'];
                            items = decodeItems(doc.receiving_items, itemFields);
                            var tempArray = doc.receivings_info.split(';');
                            ts = parseInt(tempArray[1]);
                        } else if (docIndex === 3) {
                            items = decodeItems(doc.items, itemFields);
                            var tempArray = doc.info.split(';');
                            ts = parseInt(tempArray[4]);

                        } else if (docIndex === 4) {
                            itemFields = ['name', 'hsn', 'item_id', 'batchId', 'stockKey', 'skuName', 'line', 'description', 'quantity_purchased', 'taxes', 'total', 'subTotal', 'expiry', 'unitId', 'baseUnitId', 'unitsInfo', 'bPPTaxInclusive', 'item_location', 'itemTaxList', 'slab', 'unit', 'hasExpiryDate', 'is_serialized', 'hasBatchNumber', 'imeiCount', 'hasVariants', 'discount', 'uniqueDetails'];
                            items = decodeItems(doc.items, itemFields);
                            var tempArray = doc.info.split(';');
                            ts = parseInt(tempArray[1]);
                        }

                        for (var i = 0; i < items.length; i++) {
                            if (docIndex === 1 || docIndex === 3) {
                                if (items[i].serialnumber || (items[i].imeiNumbers && items[i].imeiNumbers.length)) {
                                    emit(ts);
                                    return;
                                }
                            } else {
                                if ((items[i].uniqueDetails && items[i].uniqueDetails.length)) {
                                    emit(ts);
                                    return;
                                }
                            }
                        }

                    }
                }

                function decodeItems(items, itemFields) {

                    var itemsArray = [];
                    for (var q = 0; q < items.length; q++) {
                        var itemVals = items[q].split(';');
                        var itemInfo = {};
                        for (var iF = 0; iF < itemFields.length; iF++) {
                            var val = converValue(itemVals[iF], itemFields[iF]);

                            itemInfo[itemFields[iF]] = val;
                        }
                        itemsArray.push(itemInfo);
                    }
                    return itemsArray;
                }

                function converValue(val, key) {
                    // var val = itemVals[iF];
                    if (commonFields.indexOf(key) !== -1 && bStringifiedJSON(val)) {
                        val = JSON.parse(val);
                    } else if (intFields.indexOf(key) !== -1) {
                        val = val ? parseInt(val) : 0;
                    } else if (floatFields.indexOf(key) !== -1) {
                        val = val ? parseFloat(val) : 0;
                    } else if (objFields.indexOf(key) !== -1) {
                        val = val ? JSON.parse(val) : (key === 'wcInfo' ? undefined : {});
                    } else if (boolFields.indexOf(key) !== -1) {
                        if (val && (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true')) {
                            val = true;
                        } else {
                            val = false;
                        }
                    }
                    return val;
                }

                function bStringifiedJSON(value) {
                    if (value.indexOf('{') > -1 &&
                        value.indexOf('}') > -1 &&
                        value.indexOf('":"') > -1 &&
                        Object.keys(JSON.parse(value)).length
                    ) {
                        return true;
                    }
                    return false;
                }
            }
        },
        {
            viewName: 'uids_history',
            function: function (doc) {
                var commonFields = ['discount'];
                var intFields = ['item_id', 'line', 'imeiCount', 'categoryId', 'num', 'invoiceCheckpoint', 'sale_time', 'receiving_time', 'time', 'supplier_id', 'customer_id', 'pProfileId', 'parentId'];
                var floatFields = ['price', 'baseUnitPrice', 'sellingPriceExcludingTax', 'totalTaxPercent', 'totalPurchaseTaxPercent', 'purchasePrice', 'mrp', 'reorder_level', 'total', 'subTotal', 'subtotal', 'cost', 'profit', 'quantity', 'deliveryCharge', 'pending_amount', 'discount', 'discount_percent', 'quantity_purchased', 'sellingPrice', 'gDiscountPercent', 'loyaltyEarned', 'rmPnts'];
                var objFields = ['wcInfo', 'slab', 'taxes', 'taxDetailed', 'shippingDetails', 'globalDiscountInfo', 'imeiNumbers', 'unitDocs', 'chargesList', 'chargesTaxList', 'unitsInfo', 'itemTaxList', 'uniqueDetails'];
                var boolFields = ['isNew', 'interState', 'is_serialized', 'hasBatchNumber', 'bOTG', 'hasExpiryDate', 'bSPTaxInclusive', 'bPPTaxInclusive', 'isWarranty'];

                function decodeItems(items, itemFields) {

                    var itemsArray = [];
                    for (var q = 0; q < items.length; q++) {
                        var itemVals = items[q].split(';');
                        var itemInfo = {};
                        for (var iF = 0; iF < itemFields.length; iF++) {
                            var val = converValue(itemVals[iF], itemFields[iF]);

                            itemInfo[itemFields[iF]] = val;
                        }
                        itemsArray.push(itemInfo);
                    }
                    return itemsArray;
                }

                function converValue(val, key) {
                    // var val = itemVals[iF];
                    if (commonFields.indexOf(key) !== -1 && bStringifiedJSON(val)) {
                        val = JSON.parse(val);
                    } else if (intFields.indexOf(key) !== -1) {
                        val = val ? parseInt(val) : 0;
                    } else if (floatFields.indexOf(key) !== -1) {
                        val = val ? parseFloat(val) : 0;
                    } else if (objFields.indexOf(key) !== -1) {
                        val = val ? JSON.parse(val) : (key === 'wcInfo' ? undefined : {});
                    } else if (boolFields.indexOf(key) !== -1) {
                        if (val && (val.toLowerCase() === 'yes' || val.toLowerCase() === 'true')) {
                            val = true;
                        } else {
                            val = false;
                        }
                    }
                    return val;
                }

                function bStringifiedJSON(value) {
                    if (value.indexOf('{') > -1 &&
                        value.indexOf('}') > -1 &&
                        value.indexOf('":"') > -1 &&
                        Object.keys(JSON.parse(value)).length
                    ) {
                        return true;
                    }
                    return false;
                }

                var uidx = doc._id.indexOf('_');

                if (uidx === -1) {
                    return;
                }

                var doctype = doc._id.substring(0, uidx);
                var docTypes = ['se', 'sale', 'receiving', 'saleReturn', 'receivingReturn'];
                var docIndex = docTypes.indexOf(doctype);
                if (docIndex === -1) {
                    return;
                }
                if (doc.deleted) {
                    return;
                }

                var ts = doc.timeStamp ? doc.timeStamp : parseInt(doc._id.substring(uidx + 1, doc._id.length));

                var items = [];
                var itemFields = ['name', 'category', 'hsn', 'item_id', 'uniqueItemCode', 'ItemType', 'stockKey', 'batchId', 'skuName', 'unit', 'unitId', 'baseUnitId', 'unitsInfo', 'line', 'quantity_purchased', 'discount_percent', 'gDiscountPercent', 'purchasePrice', 'sellingPrice', 'mrp', 'item_location', 'bSPTaxInclusive', 'bPPTaxInclusive', 'taxes', 'itemTaxList', 'slab', 'expiry', 'stock_name', 'chargesList', 'chargesTaxList', 'warranty', 'warrantyTerms', 'total', 'subTotal', 'cost', 'profit', 'imeiNumbers', 'serialnumber'];
                if (docIndex === 0) {
                    items = doc.items;
                } else if (docIndex === 1) {
                    items = decodeItems(doc.sale_items, itemFields);
                    var tempArray = doc.sales_info.split(';');
                    ts = parseInt(tempArray[4]);
                } else if (docIndex === 2) {
                    itemFields = ['name', 'hsn', 'item_id', 'batchId', 'stockKey', 'skuName', 'line', 'description', 'quantity_purchased', 'taxes', 'total', 'subTotal', 'expiry', 'unitId', 'baseUnitId', 'unitsInfo', 'bPPTaxInclusive', 'item_location', 'itemTaxList', 'slab', 'unit', 'hasExpiryDate', 'is_serialized', 'hasBatchNumber', 'imeiCount', 'hasVariants', 'discount', 'uniqueDetails'];
                    items = decodeItems(doc.receiving_items, itemFields);
                    var tempArray = doc.receivings_info.split(';');
                    ts = parseInt(tempArray[1]);
                } else if (docIndex === 3) {
                    items = decodeItems(doc.items, itemFields);
                    var tempArray = doc.info.split(';');
                    ts = parseInt(tempArray[4]);

                } else if (docIndex === 4) {
                    itemFields = ['name', 'hsn', 'item_id', 'batchId', 'stockKey', 'skuName', 'line', 'description', 'quantity_purchased', 'taxes', 'total', 'subTotal', 'expiry', 'unitId', 'baseUnitId', 'unitsInfo', 'bPPTaxInclusive', 'item_location', 'itemTaxList', 'slab', 'unit', 'hasExpiryDate', 'is_serialized', 'hasBatchNumber', 'imeiCount', 'hasVariants', 'discount', 'uniqueDetails'];
                    items = decodeItems(doc.items, itemFields);
                    var tempArray = doc.info.split(';');
                    ts = parseInt(tempArray[1]);
                }

                for (var i = 0; i < items.length; i++) {
                    if (docIndex === 1 || docIndex === 3) {
                        if (items[i].serialnumber) {
                            emit(items[i].serialnumber.toString() + '___' + ts);
                        }
                        if (items[i].imeiNumbers && items[i].imeiNumbers.length) {
                            for (var j = 0; j < items[i].imeiNumbers.length; j++) {
                                emit(items[i].imeiNumbers[j].toString() + '___' + ts);
                            }
                        }
                    } else {
                        if ((items[i].uniqueDetails && items[i].uniqueDetails.length)) {
                            for (var j = 0; j < items[i].uniqueDetails.length; j++) {
                                if (items[i].uniqueDetails[j].serialnumber) {
                                    emit(items[i].uniqueDetails[j].serialnumber.toString() + '___' + ts);
                                }
                                if (items[i].uniqueDetails[j].imeiNumbers && items[i].uniqueDetails[j].imeiNumbers.length) {
                                    for (var k = 0; k < items[i].uniqueDetails[j].imeiNumbers.length; k++) {
                                        emit(items[i].uniqueDetails[j].imeiNumbers[k].toString() + '___' + ts);
                                    }
                                }
                            }
                        }
                    }
                }

            }
        }
        ]
    },
    {
        name: 'all_suppliers_data',
        version: 2,
        views: [{
            viewName: 'all_suppliers_unique_data',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'supplier') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.phone_number);
                        if (doc.email) {
                            emit(doc.email);
                        }
                    }
                }
            },
            version: 1
        }]
    },
    {
        name: 'all_tables_data',
        version: 1,
        views: [{
            viewName: 'max_table_number',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'table') {
                        // if (doc.deleted) {
                        //     emit(null, doc.id); // id has to be emitted for maintain auto-increment
                        //     return;
                        // }
                        emit(doc.table_no);
                    }
                }
            },
            reduceFunction: queryMaxIdWithKey,
            version: 1
        }]
    },
    {
        name: 'all_homedelivery_info',
        version: 1,
        views: [{
            viewName: 'max_id',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'hd') {
                        emit(doc.id, doc.id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    },
    {
        name: 'all_SalesOrder_info',
        version: 1,
        views: [{
            viewName: 'max_id',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'so') {
                        emit(doc.id, doc.id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    },
    {
        name: 'all_SalesQuotation_info',
        version: 1,
        views: [{
            viewName: 'max_id',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sq') {
                        emit(doc.id, doc.id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    },
    {
        name: 'all_expenses',
        version: 5,
        views: [{
            viewName: 'all_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'ex') {
                        //interface Expense.ts
                        if (doc.deleted) {
                            return;
                        }
                        var id = doc._id.substr(uidx + 1);
                        id = parseInt(id);
                        emit(doc.info.timestamp, id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    },
    {
        name: 'all_sales_info',
        version: 49,
        filters: [{
            name: 'replicate_since_date',
            function: function (doc, req) {
                var transDateString = "";
                if ("sales_info" in doc) {
                    transDateString = doc.sales_info.sale_time;
                }
                if ("receivings_info" in doc) {
                    transDateString = doc.receivings_info.receiving_time;
                }
                return transDateString > req.query.time;
            }
        }],
        views: [{
            viewName: 'sales_info',
            function: function (doc) {
                var doctype, uidx;
                var num = "";
                var checkpoint = 1;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'table' && doc.orders.length > 0) {
                        for (var i = 0; i < doc.orders.length; i++) {
                            if (doc.orders[i].invoiceCheckPoint) {
                                checkpoint = doc.orders[i].invoiceCheckPoint;
                                num = doc.orders[i].invoice_no;
                                emit(checkpoint, num);
                            }
                        }
                    } else if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var num = "";
                        var infoValArray = doc.sales_info.split(';');
                        if (infoValArray[1]) {
                            num = infoValArray[1]; //doc.sales_info.num;
                        } else {
                            num = doc.sale_id;
                        }

                        num = parseInt(num);
                        var checkpoint = parseInt(infoValArray[3]);
                        if (!checkpoint) {
                            checkpoint = 1;
                        }
                        emit(checkpoint, num); //use key or value differently

                        //emit multiple documents for status also
                    }
                }
            },
            reduceFunction: queryMaxId
        }, {
            viewName: 'sales_maxId',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var infoValArray = doc.sales_info.split(';');

                        var checkpoint = parseInt(infoValArray[3]);
                        if (!checkpoint) {
                            checkpoint = 1;
                        }
                        emit(checkpoint, doc.sale_id); //use key or value differently

                        //emit multiple documents for status also
                    }
                }
            },
            reduceFunction: queryMaxId,
            version: 10
        }, {
            viewName: 'invoiceNumber_checkPoint',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var num = "";
                        var infoValArray = doc.sales_info.split(';');
                        if (infoValArray[1]) {
                            num = infoValArray[1]; //doc.sales_info.num;
                        } else {
                            // num = doc.sales_info.sale_id;
                            return;
                        }
                        num = parseInt(num);
                        var checkpoint = infoValArray[3];
                        if (!checkpoint) {
                            checkpoint = 1;
                        }
                        emit(checkpoint + '_' + num); //use key or value differently

                        //emit multiple documents for status also
                    }
                }
            }
        }, {
            viewName: 'token_sale_info', //work for takeAway(Restaurant)
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var token = "";
                        var sales_info = doc.sales_info;
                        var x1 = sales_info.split(';');
                        var t_no = x1[38];
                        var sale_time = parseInt(x1[4]);
                        if (!t_no) { //token number
                            return;
                        }
                        token = t_no;
                        token = parseInt(token);
                        emit(sale_time, token); //use key or value differently
                    }
                }
            },
            reduceFunction: queryMaxId
        }, {
            viewName: 'credit_payments',
            function: function (doc) {
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleCredit') {
                        var id = parseInt(doc._id.substr(uidx + 1));
                        emit(doc.sales_info.sale_time, id);
                    }
                }
            },
            reduceFunction: queryMaxId
        },{
            viewName: 'customer_paid_credit_payments',
            function: function (doc) {
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleCredit') {
                        var id = parseInt(doc._id.substr(uidx + 1));
                        // var id = doc.sale_id ? {
                        //     'sale_id': doc.sale_id
                        // } : {
                        //         'id': doc.id
                        //     };
                        //var items=[];
                        //id = JSON.stringify(id);
                        //items = JSON.stringify(items);
                        var values =[id,doc.sales_info,doc.payments];
                        //var values = [id, info, items, doc.payments, bReturned, bRejected];
                        //values = JSON.stringify(values);
                        emit(doc.sales_info.customer_id, values);
                    }
                }
            }
        },  {
            viewName: 'All_Alien_Pending_Sales',
            function: function (doc) {
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {

                        var num = "";
                        var infoValArray = doc.sales_info.split(';');
                        if (infoValArray[1]) {
                            num = infoValArray[1]; //doc.sales_info.num;
                        } else {
                            num = doc.sale_id;
                        }
                        num = parseInt(num);
                        if (doc.customerApp && doc.customerApp.alienId && !doc.customerApp.bSyncStatus && doc.customerApp.shopId) {
                            emit(doc.customerApp.alienId + "_" + doc.customerApp.shopId + '_' + doc.sale_id, {
                                num: num,
                                alienNumber: doc.customerApp.alienId
                            }); // value so in UI it can be read without any computation
                        }
                    }
                }
            }
        }, {
            viewName: 'all_customer_pending_payments',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info;
                        var tempArray = doc.sales_info.split(';');
                        if (!tempArray[8]) {
                            return;
                        }
                        var pending_amount = parseFloat(tempArray[25]);
                        if (!pending_amount || pending_amount < 0.000000001) {
                            return;
                        }
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : [];
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        if (doc.sales_info) {
                            emit(parseInt(tempArray[8]), values);
                        }
                    }
                }
            }
        }, {
            viewName: 'all_trans_with_salesOnCredit',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info ? doc.sales_info : doc.info;
                        var tempArray = info.split(';');
                        if (!tempArray[8]) {
                            return;
                        }
                        var payments = JSON.parse(doc.payments);
                        var SalesOnCredit = false;
                        for (var i = 0; i < payments.length; i++) {
                            if (payments[i].payment_type == 'Sale on credit') {
                                SalesOnCredit = true
                                continue;
                            }
                        }
                        if (!SalesOnCredit) {
                            return;
                        }
                        // var pending_amount = parseFloat(tempArray[25]);
                        // if (!pending_amount || pending_amount < 0.000000001) {
                        //     return;
                        // }
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        if (info) {
                            emit(parseInt(tempArray[4]), values);
                        }
                    }
                }
            }

        }, {
            viewName: 'all_time_payments',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale' || doctype === 'saleCredit') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info;
                        var tempArray;
                        var sale_time;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        if (typeof info === 'object') {
                            sale_time = info.sale_time;
                            id.bCredit = true;
                            info = JSON.stringify(info);

                        } else {
                            tempArray = doc.sales_info.split(';');
                            sale_time = parseInt(tempArray[4]);
                        }

                        // var val = id + ";";
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : [];
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        if (doc.sales_info) {
                            emit(sale_time, values);
                        }
                    }
                }
            }
        }, {
            viewName: 'sales_return_info',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleReturn') {
                        if (doc.deleted) {
                            return;
                        }

                        emit(null, doc.id); //use key or value differently
                        //emit multiple documents for status also
                    }
                }
            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'all_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'saleCredit' && doctype.indexOf('sale') === 0) {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info ? doc.sales_info : doc.info;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = info.split(';');
                        emit(parseInt(tempArray[4]), values);

                    }
                }
            }
        }, {
            viewName: 'all_customer_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'saleCredit' && doctype.indexOf('sale') === 0) {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info ? doc.sales_info : doc.info;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var custId = parseInt(infoVals[8]);
                        var time = parseInt(infoVals[4]);
                        if (custId) {
                            emit(custId + '-' + time, values);
                        }

                    }
                }
            }
        }, {
            viewName: 'all_employee_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'saleCredit' && doctype.indexOf('sale') === 0) {
                        if (doc.deleted) {
                            return;
                        }

                        var info = doc.sales_info ? doc.sales_info : doc.info;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var empId = infoVals[9];
                        var time = parseInt(infoVals[4]);
                        if (empId) {
                            emit(empId + '-' + time, values);
                        }

                    }
                }
            }
        }, {
            viewName: 'all_sale_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info;
                        var id = {
                            'sale_id': doc.sale_id
                        };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = doc.sales_info.split(';');
                        emit(parseInt(tempArray[4]), values);
                    }
                }
            }
        }, {
            viewName: 'all_sale_customer_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var custId = parseInt(infoVals[8]);
                        var time = parseInt(infoVals[4]);
                        if (custId) {
                            emit(custId + '-' + time, values);
                        }
                    }
                }
            }
        }, {
            viewName: 'all_sale_employee_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'sale') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.sales_info;
                        var id = doc.sale_id ? {
                            'sale_id': doc.sale_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.sale_items ? doc.sale_items : doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var empId = infoVals[9];
                        var time = parseInt(infoVals[4]);
                        if (empId) {
                            emit(empId + '-' + time, values);
                        }
                    }
                }
            }
        }, {
            viewName: 'all_sale_return_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.info;
                        var id = {
                            'id': doc.id
                        };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = info.split(';');
                        emit(parseInt(tempArray[4]), values);
                    }
                }
            }
        }, {
            viewName: 'all_sale_return_customer_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.info;
                        var id = {
                            'id': doc.id
                        };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var custId = parseInt(infoVals[8]);
                        var time = parseInt(infoVals[4]);
                        if (custId) {
                            emit(custId + '-' + time, values);
                        }
                    }
                }
            }
        }, {
            viewName: 'all_sale_return_employee_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'saleReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.info;
                        var id = {
                            'id': doc.id
                        };
                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.items;
                        items = JSON.stringify(items);
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var infoVals = info.split(';');
                        var empId = infoVals[9];
                        var time = parseInt(infoVals[4]);
                        if (empId) {
                            emit(empId + '-' + time, values);
                        }
                    }
                }
            }
        }]
    },
    {
        name: 'all_receivings_info',
        version: 24,
        views: [{
            viewName: 'receivings_info',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receiving') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.receiving_id, doc.receiving_id); //use key or value differently
                        //emit multiple documents for status also
                    }
                }
            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'all_trans_with_purchaseOnCredit',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receiving') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info ? doc.receivings_info : doc.info;
                        var tempArray = info.split(';');
                        if (!tempArray[1]) {
                            return;
                        }
                        var payments = JSON.parse(doc.payments);
                        var purchaseOnCredit = false;
                        for (var i = 0; i < payments.length; i++) {
                            if (payments[i].payment_type == 'Purchase On Credit') {
                                purchaseOnCredit = true
                                continue;
                            }
                        }
                        if (!purchaseOnCredit) {
                            return;
                        }
                        // var pending_amount = parseFloat(tempArray[25]);
                        // if (!pending_amount || pending_amount < 0.000000001) {
                        //     return;
                        // }
                        var id = doc.receiving_id ? {
                            'receiving_id': doc.receiving_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        id = JSON.stringify(id);
                        var items = doc.receiving_items ? doc.receiving_items : doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        if (info) {
                            emit(parseInt(tempArray[1]), values);
                        }
                    }
                }
            }

        }, {
            viewName: 'credit_payments',
            function: function (doc) {
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receivingCredit') {
                        var id = parseInt(doc._id.substr(uidx + 1));
                        emit(id, id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }, {
            viewName: 'all_supplier_pending_payments',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receiving') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info;
                        var tempArray = doc.receivings_info.split(';');

                        if (!tempArray[3]) {
                            return;
                        }
                        var pending_amount = parseFloat(tempArray[10]);
                        if (pending_amount < 0.000000001) {
                            return;
                        }
                        var id = doc.receiving_id ? {
                            'receiving_id': doc.receiving_id
                        } : {
                                'id': doc.id
                            };
                        // var val = id + ";";
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;
                        id = JSON.stringify(id);
                        var items = doc.receiving_items ? doc.receiving_items : [];
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        if (doc.receivings_info) {
                            emit(parseInt(tempArray[3]), values);
                        }
                    }
                }
            }
        }, {
            viewName: 'receivings_return_info',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receivingReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc.id, doc.id); //use key or value differently
                        //emit multiple documents for status also
                    }
                }
            },
            reduceFunction: queryMaxId,
            version: 1
        }, {
            viewName: 'all_supplier_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype.indexOf('receiving') === 0) {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info ? doc.receivings_info : doc.info;
                        var tempArray = info.split(';');
                        if (!tempArray[3]) {
                            return;
                        }
                        var id = doc.receiving_id ? {
                            'receiving_id': doc.receiving_id
                        } : {
                                'id': doc.id
                            };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.receiving_items ? doc.receiving_items : doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        emit(parseInt(tempArray[3]) + '-' + tempArray[1], values);

                    }
                }
            }
        }, {
            viewName: 'all_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'receivingCredit' && doctype.indexOf('receiving') === 0) {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info ? doc.receivings_info : doc.info;
                        var id = doc.receiving_id ? {
                            'receiving_id': doc.receiving_id
                        } : {
                                'id': doc.id
                            };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.receiving_items ? doc.receiving_items : doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = info.split(';');
                        emit(parseInt(tempArray[1]), values);

                    }
                }
            }
        }, {
            viewName: 'all_recv_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'receivingCredit' && doctype === 'receiving') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info;
                        var id = {
                            'receiving_id': doc.receiving_id
                        };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.receiving_items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = info.split(';');
                        emit(parseInt(tempArray[1]), values);

                    }
                }

            }
        }, {
            viewName: 'all_recv_supplier_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype !== 'receivingCredit' && doctype === 'receiving') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.receivings_info;
                        var tempArray = info.split(';');
                        if (!tempArray[3]) {
                            return;
                        }
                        var id = {
                            'receiving_id': doc.receiving_id
                        };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.receiving_items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        emit(tempArray[3] + '-' + tempArray[1], values);

                    }
                }

            }
        }, {
            viewName: 'all_recv_return_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'receivingReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.info;
                        var id = {
                            'id': doc.id
                        };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);
                        var tempArray = info.split(';');
                        emit(parseInt(tempArray[1]), values);

                    }
                }

            }
        }, {
            viewName: 'all_recv_return_supplier_time',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);

                    if (doctype === 'receivingReturn') {
                        if (doc.deleted) {
                            return;
                        }
                        var info = doc.info;
                        var tempArray = info.split(';');
                        if (!tempArray[3]) {
                            return;
                        }
                        var id = {
                            'id': doc.id
                        };
                        var bReturned = false;
                        if (doc.mods && doc.mods.length) {
                            bReturned = true;
                        }
                        var bRejected = doc.status.bReject ? doc.status.bReject : false;

                        // var val = id + ";";
                        id = JSON.stringify(id);
                        var items = doc.items;
                        items = JSON.stringify(items);
                        var values = [id, info, items, doc.payments, bReturned, bRejected];
                        values = JSON.stringify(values);

                        emit(tempArray[3] + '-' + tempArray[1], values);

                    }
                }
            }
        }]
    },
    {
        name: 'all_pending_transactions_info',
        version: 7,
        views: [{
            viewName: 'pending_transactions',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    var validDocTypes = ['sale', 'receiving', 'saleReturn', 'receivingReturn', 'saleCredit', 'receivingCredit', 'pp', 'se'];
                    if (validDocTypes.indexOf(doctype) > -1) {
                        if (doc.deleted) {
                            return;
                        }

                        var statusKey = 'status';
                        if (doc.transStatus) {
                            statusKey = 'transStatus';
                        }

                        if (!doc[statusKey].status) {
                            return; //No pending transactions
                        }

                        function getTransKey(transType) {
                            var transKey = -1;
                            switch (transType) {
                                case 'inventoryTrans':
                                    transKey = 1;
                                    break;
                                case 'items':
                                    transKey = 2;
                                    break;
                                case 'parentSalesTrans':
                                    transKey = 3;
                                    break;
                                case 'customers':
                                case 'suppliers':
                                    transKey = 4;
                                    break;
                                case 'parentReceivingTrans':
                                    transKey = 5;
                                    break;
                                case 'parentDoc':
                                    transKey = 6;
                                    break;
                                case 'reverseInvTrans':
                                    transKey = 7;
                                    break;
                                default:
                                //console.log('unknown type');
                            }

                            return transKey;
                        }

                        for (transType in doc[statusKey]) {
                            if (transType === 'status' || transType === 'bReverse' || transType === 'bReject' || transType === 'reason') {
                                continue;
                            }

                            var transKey = getTransKey(transType);

                            for (var key in doc[statusKey][transType]) {
                                var trans = doc[statusKey][transType][key];
                                if (trans.status) {
                                    var timeStamp = 0;
                                    if (trans.lastAttempt && trans.waitTime) {
                                        timeStamp = trans.lastAttempt + trans.waitTime;
                                    }
                                    emit(timeStamp.toString(), [transKey, trans]);
                                }
                            }

                        }

                    }
                }
            }
        }]
    },
    {
        name: 'all_room_data',
        version: 10,
        views: [{
            viewName: 'payments_info',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'roomTrans') {
                        if (!doc.payments) {
                            return;
                        }

                        for (var i = 0; i < doc.payments.length; i++) {
                            emit(doc.payments[i].id, doc.payments[i].id);
                        }
                    }
                }
            },
            reduceFunction: queryMaxId
        }, {
            viewName: 'sales_info',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'roomSale') {
                        var id = parseInt(doc._id.substr(uidx + 1));
                        emit(id, id);
                    }
                }
            },
            reduceFunction: queryMaxId
        }]
    },
    {
        name: 'all_feedback_data',
        version: 3,
        views: [{
            viewName: 'all_feedback_replies',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 'f') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(doc._id);
                    }
                }
            }
        }]
    },
    {
        name: 'all_checkout_order',
        version: 3,
        views: [{
            viewName: 'checkout_order',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf('_')) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === 't') {
                        if (doc.deleted) {
                            return;
                        }
                        emit(null);
                    }
                }
            },
            version: 1
        }]
    },
    {
        name: 'crm',
        version: 8,
        views: [{
            viewName: 'pending_cmp',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === "cmp" && doc.status === "pending") {
                        var nextTime = doc.nextTime;
                        if (!nextTime) {
                            nextTime = doc.eventDateTime;
                        }
                        var retryCount = doc.retryCount;
                        if (!retryCount) {
                            retryCount = 0;
                        }
                        if (retryCount < 10) {
                            retryCount = '0' + retryCount;
                        }
                        emit(retryCount, nextTime);
                    }
                }
            }
        },
        {
            viewName: 'pending_schedules',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    //interface ScheduledCampaign
                    if (["schedule", "wisher"].indexOf(doctype) !== -1 && doc.status === "pending") {
                        var nextTime = doc.nextTime;
                        if (!nextTime) {
                            nextTime = doc.scheduleStatusArr[0].timestamp;
                        }

                        var retryCount = doc.retryCount;
                        if (!retryCount) {
                            retryCount = 0;
                        }
                        if (retryCount < 10) {
                            retryCount = '0' + retryCount;
                        }
                        emit(retryCount, nextTime);
                    }
                }
            }
        },
        {
            viewName: 'pending_wishers',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === "wisher" && doc.status === "pending") {
                        emit(null);
                    }
                }
            }
        },
        {
            viewName: 'pending_auto_reporter',
            function: function (doc) {
                var doctype, uidx;
                if (doc._id && (uidx = doc._id.indexOf("_")) > 0) {
                    doctype = doc._id.substring(0, uidx);
                    if (doctype === "autoreporter" && doc.status === "pending") {
                        emit(null);
                    }
                }
            }
        }
        ]
    }
    ];

};

module.exports = new maindbViews();