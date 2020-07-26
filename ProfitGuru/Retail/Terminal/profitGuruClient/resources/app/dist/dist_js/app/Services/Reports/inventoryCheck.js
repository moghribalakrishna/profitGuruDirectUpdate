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
    .service('stockInventory', function ($q, $filter, itemDataSvc, itemsCommonDataSvc) {
    'use strict';
    this.getInventoryStock = function () {
        return __awaiter(this, void 0, void 0, function* () {
            //todo: items
            let CHUNK_SIZE = 1000;
            let skip = 0;
            let itemsCollection = [];
            let allItemLen = {
                count: 0
            };
            try {
                yield itemsCommonDataSvc.getItemsCount(allItemLen);
                while (true) {
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
            }
            catch (err) {
                throw 'Error fetching items';
            }
            try {
                var inventoryStock = [];
                var today = new Date();
                for (var k = 0; k < itemsCollection.length; k++) {
                    let itemQty = yield itemDataSvc.getItemQutityObj(itemsCollection[k].item_id);
                    var item_id = itemQty.item_id;
                    if (item_id === itemsCollection[k].item_id) {
                        for (var j = 0; j < itemQty.batches.length; j++) {
                            var batch = itemQty.batches[j];
                            if (batch.quantity) {
                                // if (today > new Date(batch.expiry)) {
                                inventoryStock.push({
                                    item_number: itemsCollection[k].item_number ? itemsCollection[k].item_number : 'N/A',
                                    item_name: itemsCollection[k] ? itemsCollection[k].name : 'N/A',
                                    stockKey: batch.stockKey ? batch.stockKey : 'N/A',
                                    batch_id: batch.batchId ? batch.batchId : 'N/A',
                                    quantity: batch.quantity,
                                    reorderLevel: itemsCollection[k].reorderLevel ? itemsCollection[k].reorderLevel : 'N/A',
                                    description: itemsCollection[k].description ? itemsCollection[k].description : 'N/A',
                                    expiry_date: batch.expiry ? $filter('date')(new Date(batch.expiry), 'dd-MM-yyyy') : ''
                                });
                                // }
                            }
                        }
                    }
                }
                return inventoryStock;
            }
            catch (ex) {
                console.log(ex);
            }
        });
    };
});
