"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReportHelper = void 0;
const fs = require("fs");
const couchDBUtils = require("../../controllers/common/CouchDBUtils");
const Reports_1 = require("../Constants/Reports");
const shelljs = require("shelljs");
const logger = require("../../common/Logger");
const Reports_2 = require("./Reports");
const stream_1 = require("stream");
const split = require("split");
const reportsProcessorFactory_1 = require("./reportsProcessorFactory");
const common_1 = require("../utils/common");
const mainDBInstance = couchDBUtils.getMainCouchDB();
const getDocsInChunks = (desingDocName, viewName, iOffset, iChunkLength, startkey, endkey, includeDoc) => __awaiter(void 0, void 0, void 0, function* () {
    //startkey, endkey or key should be there but not both;
    const params = {
        include_docs: includeDoc,
        limit: iChunkLength,
        skip: iOffset,
        startkey: startkey,
        endkey: endkey
    };
    let docsArr = yield couchDBUtils.getTransView(desingDocName, viewName, params, mainDBInstance);
    return docsArr;
});
const getAllNonGSTTaxTypes = () => __awaiter(void 0, void 0, void 0, function* () {
    let nonGSTTaxTypeArr = [];
    const respArr = yield couchDBUtils.getAllDocsByType('tax', mainDBInstance, undefined, false);
    for (let i = 0; i < respArr.length; i++) {
        const taxName = respArr[i].doc.name.toUpperCase();
        if (!isGSTTaxType(taxName)) {
            nonGSTTaxTypeArr.push(taxName);
        }
    }
    return nonGSTTaxTypeArr;
});
const filterOpeningClosingStock = (docsArr) => {
    if (!docsArr.length) {
        return;
    }
    docsArr = docsArr.sort(function (thisElement, nextElement) {
        if (thisElement.transaction.trans_stockKey < nextElement.transaction.trans_stockKey) {
            return -1;
        }
        else {
            return 1;
        }
    });
    const filteredArr = [];
    let aboveTransaction = [];
    docsArr.map((currentDoc, index, originalDoc) => {
        const transaction = currentDoc.transaction;
        if (index < (originalDoc.length - 1)) {
            if (transaction.trans_stockKey == originalDoc[index + 1].transaction.trans_stockKey) {
                aboveTransaction.push(currentDoc.stock.stock[transaction.trans_stockKey].quantity);
            }
            if (transaction.trans_stockKey !== originalDoc[index + 1].transaction.trans_stockKey) {
                currentDoc.aboveTransaction = aboveTransaction;
                filteredArr.push(currentDoc);
                aboveTransaction = [];
            }
        }
        if (index == (originalDoc.length - 1)) {
            currentDoc.aboveTransaction = [];
            filteredArr.push(currentDoc);
        }
    });
    return filteredArr;
};
// const convertPurchaseDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedPurchaseReportRow[] => {
// };
// const convertSaleReturnDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedSaleReportRow[] => {
// };
// const convertPurchaseReturnDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedPurchaseReportRow[] => {
// };
const isGSTTaxType = (taxName) => {
    return ['GST', 'CESS'].indexOf(taxName) > -1;
};
const writeToFile = (csvData, filePath) => {
    //check if append or new file
    fs.writeFileSync(filePath, csvData, { flag: 'a' });
};
const writeHeader = (csvHeaderArr, filePath) => {
    //check if append or new file
    fs.writeFileSync(filePath, (csvHeaderArr.join(",") + "\n"), { flag: 'w' });
};
const convertKeyToInteger = (metaData, reportProcessorHelper) => {
    if (reportProcessorHelper.fetchDocsOfTypePurchaseAndSupplier() || reportProcessorHelper.fetchDocsOfTypeAllUIDSearch() || reportProcessorHelper.fetchOpeningClosingStock()) {
        return;
    }
    metaData.startkey = parseInt(metaData.startDate.toString());
    metaData.endkey = parseInt(metaData.endDate.toString());
};
const getPropsForProcessing = (metaData, reportProcessorHelper) => __awaiter(void 0, void 0, void 0, function* () {
    let designDocName = "";
    let viewName = "";
    const nonGSTTaxTypeArr = yield getAllNonGSTTaxTypes();
    let rowKeysArr = reportProcessorHelper.getReportRowKeys(nonGSTTaxTypeArr);
    if (reportProcessorHelper.fetchGetDocsOfTypeSale()) {
        //sale
        designDocName = "all_sales_info";
        viewName = "all_time";
        if (metaData.reportType === Reports_1.Reports.EXCLUDE_RETURN) {
            viewName = "all_sale_time";
        }
        else if (metaData.reportType === Reports_1.Reports.ONLY_RETURN) {
            viewName = "all_sale_return_time";
        }
    }
    else if (reportProcessorHelper.fetchDocsOfTypePurchase()) {
        //Purchase
        designDocName = "all_receivings_info";
        viewName = "all_time";
        if (metaData.reportType === Reports_1.Reports.EXCLUDE_RETURN) {
            viewName = "all_recv_time";
        }
        else if (metaData.reportType === Reports_1.Reports.ONLY_RETURN) {
            viewName = "all_recv_return_time";
        }
    }
    else if (reportProcessorHelper.fetchDocsOfTypeAllUID()) {
        designDocName = "all_inventory_data";
        viewName = "uids_history_by_timestamp";
    }
    else if (reportProcessorHelper.fetchDocsOfTypeAllUIDSearch()) {
        designDocName = "all_inventory_data";
        viewName = "uids_history";
    }
    else if (reportProcessorHelper.fetchDocsOfTypeSupplier()) {
        designDocName = "all_receivings_info";
        viewName = "all_supplier_time";
        if (metaData.reportType === Reports_1.Reports.EXCLUDE_RETURN) {
            viewName = "all_recv_supplier_time";
        }
        else if (metaData.reportType === Reports_1.Reports.ONLY_RETURN) {
            viewName = "all_recv_return_supplier_time";
        }
    }
    else if (reportProcessorHelper.fetchDocsOfTypePurchaseAndSupplier()) {
        designDocName = "all_receivings_info";
        viewName = "all_supplier_time";
    }
    else if (reportProcessorHelper.fetchOpeningClosingStock()) {
        designDocName = "all_inventory_data";
        viewName = "inventory_all_transaction";
    }
    else {
        logger.error("Unknown Report Name<" + metaData.reportName + ">");
        throw "Unknown Report Name<" + metaData.reportName + ">";
    }
    return {
        designDocName: designDocName,
        viewName: viewName,
        rowKeysArr: rowKeysArr
    };
});
const initializeColumnCount = (rowKeysArr) => {
    let columnCountMap = {};
    for (let i = 0; i < rowKeysArr.length; i++) {
        columnCountMap[rowKeysArr[i]] = 0;
    }
    return columnCountMap;
};
const cleanupColumns = (metaData, columnCountMap, rowKeysArr) => __awaiter(void 0, void 0, void 0, function* () {
    let indexesToRemoveArr = [];
    let iIndex = 0;
    for (let columnName in columnCountMap) {
        var index = rowKeysArr.indexOf(columnName);
        if (!columnCountMap[columnName]) {
            indexesToRemoveArr.push(index);
            let my = index + iIndex;
            console.log(my);
        }
        iIndex++;
    }
    const iIndexesToRemoveArrLength = indexesToRemoveArr.length;
    if (!iIndexesToRemoveArrLength) {
        return;
    }
    // rename the file
    const fileName = Reports_2.getDataFilePath(metaData);
    const tempFileName = fileName + '_';
    shelljs.mv(fileName, tempFileName);
    //create writable stream
    //map it for each line
    //create a pipe
    // use fs readstream
    const rs = fs.createReadStream(tempFileName);
    const ws = fs.createWriteStream(fileName);
    const removeRedundantColumnsPipe = new stream_1.Transform({
        transform(chunk, encoding, callback) {
            let strArr = chunk.toString().split(',');
            for (let i = iIndexesToRemoveArrLength - 1; i > -1; i--) {
                strArr.splice(indexesToRemoveArr[i], 1);
            }
            const outStr = strArr.join(',') + "\n";
            this.push(outStr);
            callback();
        }
    });
    // rs.pipe(es.split()).pipe(upperCaseTr).pipe(ws);
    rs.pipe(split()).pipe(removeRedundantColumnsPipe).pipe(ws);
    const promise = new Promise((resolve, reject) => {
        ws.on('finish', () => {
            logger.info('done');
            resolve();
        });
    });
    yield promise;
    shelljs.rm(tempFileName);
});
exports.processReportHelper = (metaData) => __awaiter(void 0, void 0, void 0, function* () {
    const reportProcessorHelper = reportsProcessorFactory_1.getReportProcessorHelper(metaData);
    const { designDocName, viewName, rowKeysArr } = yield getPropsForProcessing(metaData, reportProcessorHelper);
    const dataFilePath = Reports_2.getDataFilePath(metaData);
    writeHeader(rowKeysArr, dataFilePath);
    let columnCountMap = initializeColumnCount(rowKeysArr);
    let iOffset = 0;
    let iChunkLength = Reports_1.Reports.I_DOC_CHUNK_LENGTH;
    convertKeyToInteger(metaData, reportProcessorHelper);
    while (true) {
        let includeDocs = true;
        if (viewName == 'inventory_all_transaction') {
            includeDocs = false;
        }
        let docsArr = yield getDocsInChunks(designDocName, viewName, iOffset, iChunkLength, metaData.startkey, metaData.endkey, includeDocs);
        if (viewName == 'inventory_all_transaction') {
            docsArr = filterOpeningClosingStock(docsArr);
        }
        const iDocsArrLength = docsArr.length;
        if (iDocsArrLength === 0) {
            break;
        }
        let reportData = {
            data: ""
        };
        for (let i = 0; i < iDocsArrLength; i++) {
            const docType = common_1.getDocType(docsArr[i]._id);
            switch (docType) {
                case "sale":
                    const saleDoc = docsArr[i];
                    reportProcessorHelper.convertSaleDocToDownloadableFormat(saleDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "saleReturn":
                    const saleReturnDoc = docsArr[i];
                    reportProcessorHelper.convertSaleReturnDocToDownloadableFormat(saleReturnDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "receiving":
                    const receivingDoc = docsArr[i];
                    reportProcessorHelper.convertPurchaseDocToDownloadableFormat(receivingDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "receivingReturn":
                    const receivingReturnDoc = docsArr[i];
                    reportProcessorHelper.convertPurchaseReturnDocToDownloadableFormat(receivingReturnDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "se":
                    const doc = docsArr[i];
                    reportProcessorHelper.convertStockEntryDocToDownloadableFormat(doc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "":
                    const itemDoc = docsArr[i];
                    yield reportProcessorHelper.convertOpeingClosingStockItemDownloadableFormat(itemDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                default:
                    throw "processReportHelper<" + metaData.reportName + ">Unknown DocType<" + docType + ">";
            }
        }
        if (reportData.data) {
            //it is synchronous -- it is bad -- optimize later
            writeToFile(reportData.data, dataFilePath);
        }
        iOffset += iDocsArrLength;
        if (iDocsArrLength < iChunkLength) {
            break;
        }
    }
    //remove empty columns
    if (iOffset) {
        yield cleanupColumns(metaData, columnCountMap, rowKeysArr);
    }
});
