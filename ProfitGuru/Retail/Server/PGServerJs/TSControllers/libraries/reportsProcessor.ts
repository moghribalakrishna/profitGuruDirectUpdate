import { DBSale } from "../interfaces/dbSaleDoc";
import { Reports } from "../interfaces/Reports";
import * as fs from 'fs';

import * as couchDBUtils from '../../controllers/common/CouchDBUtils';
import { AllDocsResponseRow, ViewParams } from "../interfaces/couchdb";
import { Reports as ReportsConstants } from "../Constants/Reports";
import * as shelljs from 'shelljs';
import * as logger from "../../common/Logger";
import { DocType, DocId } from "../interfaces/common";
import { getDataFilePath } from "./Reports";
import { Transform } from "stream";
import * as split from 'split';
import { getReportProcessorHelper } from "./reportsProcessorFactory";
import { DBSaleReturn } from "../interfaces/dbSaleReturnDoc";
import { DBPurchase } from "../interfaces/dbPurchaseDoc";
import { DBPurchaseReturn } from "../interfaces/dbPurchaseReturn";
import { ReportProcessorHelper } from "./reportsProcessorClass";
import { getDocType } from "../utils/common";
import { StockEntry } from "../Receipe";

const mainDBInstance = couchDBUtils.getMainCouchDB();

const getDocsInChunks = async <T>(desingDocName: string, viewName: string, iOffset: number, iChunkLength: number, startkey: string | number, endkey: string | number, includeDoc: boolean): Promise<T[]> => {

    //startkey, endkey or key should be there but not both;


    const params: ViewParams = {
        include_docs: includeDoc,
        limit: iChunkLength,
        skip: iOffset,
        startkey: startkey,
        endkey: endkey
    };

    let docsArr: T[] = await couchDBUtils.getTransView(desingDocName, viewName, params, mainDBInstance);
    return docsArr;
};

const getAllNonGSTTaxTypes = async (): Promise<string[]> => {

    let nonGSTTaxTypeArr: string[] = [];

    const respArr: AllDocsResponseRow[] = await couchDBUtils.getAllDocsByType('tax', mainDBInstance, undefined, false);
    for (let i: number = 0; i < respArr.length; i++) {
        const taxName: string = respArr[i].doc.name.toUpperCase();
        if (!isGSTTaxType(taxName)) {
            nonGSTTaxTypeArr.push(taxName)
        }
    }

    return nonGSTTaxTypeArr;
};


const filterOpeningClosingStock = (docsArr) => {
    if (!docsArr.length) {
        return;
    }

    docsArr = docsArr.sort(function (thisElement, nextElement) {
        if (thisElement.transaction.trans_stockKey < nextElement.transaction.trans_stockKey) {
            return -1
        } else {
            return 1
        }
    });
    const filteredArr = []
    let aboveTransaction = []
    docsArr.map((currentDoc, index, originalDoc) => {
        const transaction = currentDoc.transaction;
        if (index < (originalDoc.length - 1)) {
            if (transaction.trans_stockKey == originalDoc[index + 1].transaction.trans_stockKey) {
                aboveTransaction.push(currentDoc.stock.stock[transaction.trans_stockKey].quantity)
            }
            if (transaction.trans_stockKey !== originalDoc[index + 1].transaction.trans_stockKey) {
                currentDoc.aboveTransaction = aboveTransaction
                filteredArr.push(currentDoc);
                aboveTransaction = []
            }
        }
        if (index == (originalDoc.length - 1)) {
            currentDoc.aboveTransaction = []
            filteredArr.push(currentDoc);
        }
    });

    return filteredArr;
}
// const convertPurchaseDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedPurchaseReportRow[] => {

// };

// const convertSaleReturnDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedSaleReportRow[] => {

// };

// const convertPurchaseReturnDocToDownloadableFormat = (doc: DBSale.SaleDoc): ItemWiseDetailedPurchaseReportRow[] => {

// };

const isGSTTaxType = (taxName: string): boolean => {
    return ['GST', 'CESS'].indexOf(taxName) > -1;
};

const writeToFile = (csvData: string, filePath: string): void => {
    //check if append or new file
    fs.writeFileSync(filePath, csvData, { flag: 'a' });
};

const writeHeader = (csvHeaderArr: string[], filePath: string): void => {
    //check if append or new file
    fs.writeFileSync(filePath, (csvHeaderArr.join(",") + "\n"), { flag: 'w' });
};


const convertKeyToInteger = (metaData: Reports.ReportMetaData, reportProcessorHelper: ReportProcessorHelper) => {
    if (reportProcessorHelper.fetchDocsOfTypePurchaseAndSupplier() || reportProcessorHelper.fetchDocsOfTypeAllUIDSearch() || reportProcessorHelper.fetchOpeningClosingStock()) {
        return;
    }
    metaData.startkey = parseInt(metaData.startDate.toString());
    metaData.endkey = parseInt(metaData.endDate.toString())
}

const getPropsForProcessing = async (metaData: Reports.ReportMetaData, reportProcessorHelper: ReportProcessorHelper): Promise<Reports.ReportsProcessingProps> => {
    let designDocName: string = "";
    let viewName: string = "";

    const nonGSTTaxTypeArr: string[] = await getAllNonGSTTaxTypes();
    let rowKeysArr: string[] = reportProcessorHelper.getReportRowKeys(nonGSTTaxTypeArr);
    if (reportProcessorHelper.fetchGetDocsOfTypeSale()) {
        //sale
        designDocName = "all_sales_info";
        viewName = "all_time";
        if (metaData.reportType === ReportsConstants.EXCLUDE_RETURN) {
            viewName = "all_sale_time";
        } else if (metaData.reportType === ReportsConstants.ONLY_RETURN) {
            viewName = "all_sale_return_time";
        }
    } else if (reportProcessorHelper.fetchDocsOfTypePurchase()) {
        //Purchase
        designDocName = "all_receivings_info";
        viewName = "all_time";
        if (metaData.reportType === ReportsConstants.EXCLUDE_RETURN) {
            viewName = "all_recv_time";
        } else if (metaData.reportType === ReportsConstants.ONLY_RETURN) {
            viewName = "all_recv_return_time";
        }
    } else if (reportProcessorHelper.fetchDocsOfTypeAllUID()) {
        designDocName = "all_inventory_data";
        viewName = "uids_history_by_timestamp";
    } else if (reportProcessorHelper.fetchDocsOfTypeAllUIDSearch()) {
        designDocName = "all_inventory_data";
        viewName = "uids_history";
    } else if (reportProcessorHelper.fetchDocsOfTypeSupplier()) {
        designDocName = "all_receivings_info";
        viewName = "all_supplier_time";
        if (metaData.reportType === ReportsConstants.EXCLUDE_RETURN) {
            viewName = "all_recv_supplier_time";
        } else if (metaData.reportType === ReportsConstants.ONLY_RETURN) {
            viewName = "all_recv_return_supplier_time";
        }
    } else if (reportProcessorHelper.fetchDocsOfTypePurchaseAndSupplier()) {
        designDocName = "all_receivings_info";
        viewName = "all_supplier_time";

    }
    else if (reportProcessorHelper.fetchOpeningClosingStock()) {
        designDocName = "all_inventory_data";
        viewName = "inventory_all_transaction";
    } else {
        logger.error("Unknown Report Name<" + metaData.reportName + ">");
        throw "Unknown Report Name<" + metaData.reportName + ">";
    }

    return {
        designDocName: designDocName,
        viewName: viewName,
        rowKeysArr: rowKeysArr
    };
};

const initializeColumnCount = (rowKeysArr: string[]): Reports.ColumnCountMap => {
    let columnCountMap: Reports.ColumnCountMap = {};

    for (let i: number = 0; i < rowKeysArr.length; i++) {
        columnCountMap[rowKeysArr[i]] = 0;
    }

    return columnCountMap;
};

const cleanupColumns = async (metaData: Reports.ReportMetaData, columnCountMap: Reports.ColumnCountMap, rowKeysArr: string[]): Promise<void> => {
    let indexesToRemoveArr: number[] = [];
    let iIndex: number = 0;
    for (let columnName in columnCountMap) {

        if (!columnCountMap[columnName]) {
            var index = rowKeysArr.indexOf(columnName);
            indexesToRemoveArr.push(index);
        }
    }

    const iIndexesToRemoveArrLength: number = indexesToRemoveArr.length;
    if (!iIndexesToRemoveArrLength) {
        return;
    }

    // rename the file
    const fileName: string = getDataFilePath(metaData);
    const tempFileName: string = fileName + '_';
    shelljs.mv(fileName, tempFileName);

    //create writable stream
    //map it for each line
    //create a pipe
    // use fs readstream

    const rs: fs.ReadStream = fs.createReadStream(tempFileName);
    const ws: fs.WriteStream = fs.createWriteStream(fileName)

    const removeRedundantColumnsPipe: Transform = new Transform({
        transform(chunk: Buffer, encoding, callback) {
            let strArr: string[] = chunk.toString().split(',');

            for (let i: number = iIndexesToRemoveArrLength - 1; i > -1; i--) {
                strArr.splice(indexesToRemoveArr[i], 1);
            }

            const outStr: string = strArr.join(',') + "\n";

            this.push(outStr);
            callback();
        }
    });

    // rs.pipe(es.split()).pipe(upperCaseTr).pipe(ws);
    rs.pipe(split()).pipe(removeRedundantColumnsPipe).pipe(ws);

    const promise: Promise<void> = new Promise((resolve, reject) => {

        ws.on('finish', () => {
            logger.info('done');
            resolve();
        });
    });

    await promise;

    shelljs.rm(tempFileName);
};

export const processReportHelper = async (metaData: Reports.ReportMetaData): Promise<void> => {

    const reportProcessorHelper: ReportProcessorHelper = getReportProcessorHelper(metaData);
    const { designDocName, viewName, rowKeysArr }: Reports.ReportsProcessingProps = await getPropsForProcessing(metaData, reportProcessorHelper);
    const dataFilePath: string = getDataFilePath(metaData);
    writeHeader(rowKeysArr, dataFilePath);

    let columnCountMap: Reports.ColumnCountMap = initializeColumnCount(rowKeysArr);

    let iOffset: number = 0;
    let iChunkLength: number = ReportsConstants.I_DOC_CHUNK_LENGTH;


    convertKeyToInteger(metaData, reportProcessorHelper);

    while (true) {
        let includeDocs = true;
        if (viewName == 'inventory_all_transaction') {
            includeDocs = false
        }
        let docsArr: any[] = await getDocsInChunks<any>(designDocName, viewName, iOffset, iChunkLength, metaData.startkey, metaData.endkey, includeDocs);
        if (viewName == 'inventory_all_transaction') {
            docsArr = filterOpeningClosingStock(docsArr)
        }
        const iDocsArrLength: number = docsArr.length;
        if (iDocsArrLength === 0) {
            break;
        }

        let reportData: Reports.ReportCSVData = {
            data: ""
        };

        for (let i: number = 0; i < iDocsArrLength; i++) {
            const docType: DocType = getDocType(docsArr[i]._id);
            switch (docType) {
                case "sale":
                    const saleDoc: DBSale.SaleDoc = docsArr[i];
                    reportProcessorHelper.convertSaleDocToDownloadableFormat(saleDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "saleReturn":
                    const saleReturnDoc: DBSaleReturn.Doc = docsArr[i];
                    reportProcessorHelper.convertSaleReturnDocToDownloadableFormat(saleReturnDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "receiving":
                    const receivingDoc: DBPurchase.Doc = docsArr[i];
                    reportProcessorHelper.convertPurchaseDocToDownloadableFormat(receivingDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "receivingReturn":
                    const receivingReturnDoc: DBPurchaseReturn.Doc = docsArr[i];
                    reportProcessorHelper.convertPurchaseReturnDocToDownloadableFormat(receivingReturnDoc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "se":
                    const doc: StockEntry = docsArr[i];
                    reportProcessorHelper.convertStockEntryDocToDownloadableFormat(doc, rowKeysArr, reportData, columnCountMap);
                    break;
                case "":
                    const itemDoc = docsArr[i];
                    await reportProcessorHelper.convertOpeingClosingStockItemDownloadableFormat(itemDoc, rowKeysArr, reportData, columnCountMap);
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
        await cleanupColumns(metaData, columnCountMap, rowKeysArr);
    }
};
