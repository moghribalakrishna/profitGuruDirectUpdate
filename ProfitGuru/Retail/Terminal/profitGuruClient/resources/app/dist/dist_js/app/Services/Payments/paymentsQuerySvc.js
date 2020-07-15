var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
angular.module('profitGuru')
    .service('paymentsQuerySvc', function (pouchQuerySvc, customerDataSvc, supplierDataSvc, $rootScope, computeUtils) {
    var defaultPaymentValue = $rootScope.mergedConfigurationsData.creditPaymentDefaultValue;
    var localMainDB;
    var localUsersDB;
    var _self = this;
    var pymentsWarningDays = defaultPaymentValue.pymentsWarningDays;
    this.setDB = function (mainDB, usersDB) {
        localMainDB = mainDB;
        localUsersDB = usersDB;
    };
    this.getPendingPaymentsByCustomer = function (customerId) {
        return getPendingPayments({
            customerId: customerId,
        }).then(function (resp) {
            try {
                return resp[customerId] ? resp[customerId] : {};
            }
            catch (ex) {
                console.log('getPendingPaymentsByCustomer');
                console.log(ex);
                return {};
            }
        });
    };

    this.getPaidCreditPaymentsByCustomer = function (customerId) {
        return getPaidCreditPayments({
            customerId: customerId,
        }).then(function (resp) {
            try {
                return resp[customerId] ? resp[customerId] : {};
            }
            catch (ex) {
                console.log('getPaidCreditPaymentsByCustomer');
                console.log(ex);
                return {};
            }
        });
    };
    this.getAllPaidCreditPayments = function (params) {
        params = params ? params : {};
        return getPaidCreditPayments(params).then(function (resp) {
            return resp;
        }).catch(function (error) {
            return error;
        });
    };
    
    this.getPendingPaymentsForSupplier = function (supplierId) {
        return getPendingSupplierPayments({
            supplierId: supplierId,
        }).then(function (resp) {
            try {
                return resp[supplierId] ? resp[supplierId] : {};
            }
            catch (ex) {
                console.log('getPendingPaymentsForSupplier');
                console.log(ex);
                return {};
            }
        });
    };
    this.getAllPendingPayments = function (params) {
        params = params ? params : {};
        return getPendingPayments(params).then(function (resp) {
            return resp;
        }).catch(function (error) {
            return error;
        });
    };
    this.getAllSupplierPendingPayments = function (params) {
        params = params ? params : {};
        return getPendingSupplierPayments(params).then(function (resp) {
            return resp;
        }).catch(function (error) {
            return error;
        });
    };
    /**
     *  params
     * customerId
     */
    var start_date;
    var end_date;
    var custId;
    var supId;
    function getPendingPayments(params) {
        // var selector = {};
        var customerId;
        if (params.customerId) {
            customerId = params.customerId;
            custId = params.customerId;
        }
        params = {
            startkey: customerId,
            endkey: customerId,
            include_docs: false
        };
        // return pouchQuerySvc.queryDocs(localMainDB, [], selector).then(queryReturnDocs).catch(queryFailure);
        return pouchQuerySvc.queryTransDocsByViewName('all_sales_info', 'all_customer_pending_payments', params, localMainDB, 'sale').then(queryReturnDocs).catch(queryFailure);
    }

    function getPaidCreditPayments(params) {
        // var selector = {};
        var customerId;
        if (params.customerId) {
            customerId = params.customerId;
            custId = params.customerId;
        }
        params = {
            startkey: customerId,
            endkey: customerId,
            include_docs: false,
            descending:true
        };
        // return pouchQuerySvc.queryDocs(localMainDB, [], selector).then(queryReturnDocs).catch(queryFailure);
        return pouchQuerySvc.queryDocsByViewName('all_sales_info', 'customer_paid_credit_payments', params, localMainDB, 'sale').then(_self.processCustomerPaidCreditPayments).catch(queryFailure);
    }
    
    this.processCustomerPaidCreditPayments = function (resp) {
        return __awaiter(this, void 0, void 0, function* () {
            var paidCreditTxns = resp;
            var response = {};
            response.start_date = start_date ? computeUtils.getFormattedDateForReportDisplay(start_date) : '';
            response.end_date = end_date ? computeUtils.getFormattedDateForReportDisplay(end_date) : '';
            
            for (var i = 0; i < paidCreditTxns.length; i++) {
                                   
                var saleDetails = paidCreditTxns[i].value[1];
                saleDetails.sale_time = computeUtils.getFormattedDateTimeForReportDisplay(saleDetails.sale_time);
              
                //For single Txn & Multiple Payments
                var creditPayemnts=paidCreditTxns[i].value[2];
                for (var q = 0; q < creditPayemnts.length; q++) {

                    var aPaymentTxns = Object.assign(saleDetails, creditPayemnts[q]);
                    
                    var customerId = saleDetails.customer_id;
                    if (customerId) {
                        if (!(customerId in response)) {
                            var custData = yield customerDataSvc.getFullCustomerDoc('customer_' + customerId);
                            var paymentValue = getPaymentValue(custData);
                        response[customerId] = {
                            customer: {
                                first_name: custData.first_name,
                                last_name: custData.last_name,
                                email: custData.email,
                                phone: custData.phone_number,
                                dueDate: {
                                    periodValue: paymentValue.periodValue,
                                    periodType: paymentValue.periodType,
                                    date: ""
                                }
                            },
                            totPaidCredit:0,
                            paidCtreditTransactions: []
                        };
                    }
                    
                    response[customerId].paidCtreditTransactions.push(aPaymentTxns);
                    response[customerId].totPaidCredit += aPaymentTxns.payment_amount;
                    }
                    }
            }
            return response;
        });
    };

    function getPendingSupplierPayments(paramJson) {
        // var selector = {};
        var supplierId;
        if (paramJson.supplierId) {
            supplierId = paramJson.supplierId;
            supId = paramJson.supplierId;
        }
        var params = {
            startkey: supplierId,
            endkey: supplierId,
            include_docs: false
        };
        return pouchQuerySvc.queryTransDocsByViewName('all_receivings_info', 'all_supplier_pending_payments', params, localMainDB, 'purchase').then(queryPurchaseReturnDocs).catch(queryFailure);
    }
    function getPaymentValue(custData) {
        var paymentValue = {
            periodType: "day",
            periodValue: defaultPaymentValue.days
        };
        if (custData.payment_terms) {
            if (custData.payment_terms === "days") {
                paymentValue.periodValue = custData.by_days;
            }
            else if (custData.payment_terms === "weeks") {
                paymentValue.periodValue = custData.by_weeks * 7;
            }
            else if (custData.payment_terms === "months") {
                paymentValue.periodValue = custData.by_months * 30;
            }
        }
        return paymentValue;
    }
    var pendingTransactions = [];
    function queryReturnDocs(resp) {
        pendingTransactions = resp;
        var params = {
            include_docs: false,
            startkey: 1,
            endkey: 'z'
        };
        return pouchQuerySvc.queryTransDocsByViewName('all_sales_info', 'all_sale_return_customer_time', params, localMainDB, 'sale').then(_self.querySuccess).catch(queryFailure);
    }


    this.querySuccess = function (resp) {
        return __awaiter(this, void 0, void 0, function* () {
            var docs = resp;
            var response = {};
            response.start_date = start_date ? computeUtils.getFormattedDateForReportDisplay(start_date) : '';
            response.end_date = end_date ? computeUtils.getFormattedDateForReportDisplay(end_date) : '';
            for (var i = 0; i < pendingTransactions.length; i++) {
                for (var q = 0; q < docs.length; q++) {
                    if (docs[q].info.parentId === pendingTransactions[i].sale_id && docs[q].info.customer_id === custId) {
                        for (var p = 0; p < docs[q].payments.length; p++) {
                            if (docs[q].payments[p].payment_type === "Sale on credit") {
                                pendingTransactions[i].sales_info.pending_amount -= docs[q].payments[p].payment_amount;
                            }
                        }
                    }
                }
                if (pendingTransactions[i].sales_info.pending_amount < 0.000000001 || pendingTransactions[i].bRejected) {
                    pendingTransactions.splice(i, 1);
                    i -= 1;
                    continue;
                }
                var saleDetails = pendingTransactions[i];
                var tempDate = saleDetails.sales_info.sale_time;
                saleDetails.sales_info.sale_time = computeUtils.getFormattedDateTimeForReportDisplay(saleDetails.sales_info.sale_time);
                var customerId = saleDetails.sales_info.customer_id;
                if (customerId) {
                    if (!(customerId in response)) {
                        var custData = yield customerDataSvc.getFullCustomerDoc('customer_' + customerId);
                        var paymentValue = getPaymentValue(custData);
                        response[customerId] = {
                            customer: {
                                first_name: custData.first_name,
                                last_name: custData.last_name,
                                email: custData.email,
                                phone: custData.phone_number,
                                dueDate: {
                                    periodValue: paymentValue.periodValue,
                                    periodType: paymentValue.periodType,
                                    date: ""
                                }
                            },
                            total: 0,
                            pendingAmount: 0,
                            nearDueDateAmt: 0,
                            overDueDateAmt: 0,
                            pendingTransactions: []
                        };
                    }
                    //RelaxTodo imei with batches purchase remove item
                    //RelaxTodo sale_time format has changed
                    response[customerId].pendingTransactions.push(saleDetails);
                    response[customerId].pendingAmount += saleDetails.sales_info.pending_amount;
                    response[customerId].total += saleDetails.sales_info.total;
                    var dueDate = response[customerId].customer.dueDate.date = moment(tempDate).add(response[customerId].customer.dueDate.periodValue, response[customerId].customer.dueDate.periodType).format('LLL');
                    var todayDate = moment(new Date()).startOf('day');
                    var paymentDueDays = moment(dueDate).startOf('day').diff(todayDate, 'day');
                    if (pymentsWarningDays > paymentDueDays && paymentDueDays > 0) {
                        response[customerId].nearDueDateAmt += saleDetails.sales_info.pending_amount;
                    }
                    else if (pymentsWarningDays > paymentDueDays && paymentDueDays <= 0) {
                        response[customerId].overDueDateAmt += saleDetails.sales_info.pending_amount;
                    }
                }
            }
            return response;
        });
    };

    function queryPurchaseReturnDocs(resp) {
        pendingTransactions = resp;
        var params = {
            include_docs: false,
            startkey: 1,
            endkey: 'z'
        };
        return pouchQuerySvc.queryTransDocsByViewName('all_receivings_info', 'all_recv_return_supplier_time', params, localMainDB, 'purchase').then(_self.suppliersCreditQuerySuccess).catch(queryFailure);
    }
    this.suppliersCreditQuerySuccess = function (resp) {
        return __awaiter(this, void 0, void 0, function* () {
            var docs = resp;
            var response = {};
            response.start_date = start_date ? computeUtils.getFormattedDateForReportDisplay(start_date) : '';
            response.end_date = end_date ? computeUtils.getFormattedDateForReportDisplay(end_date) : '';
            for (var i = 0; i < pendingTransactions.length; i++) {
                for (var q = 0; q < docs.length; q++) {
                    if (docs[q].info.parentId === pendingTransactions[i].receiving_id && docs[q].info.supplier_id === supId) {
                        for (var p = 0; p < docs[q].payments.length; p++) {
                            if (docs[q].payments[p].payment_type === "Purchase On Credit") {
                                pendingTransactions[i].receivings_info.pending_amount -= docs[q].payments[p].payment_amount;
                            }
                        }
                    }
                }
                if (pendingTransactions[i].receivings_info.pending_amount < 0.000000001 || pendingTransactions[i].bRejected) {
                    pendingTransactions.splice(i, 1);
                    i -= 1;
                    continue;
                }
                var purchaseDetails = pendingTransactions[i];
                var tempDate = purchaseDetails.receivings_info.receiving_time;
                purchaseDetails.receivings_info.receiving_time = computeUtils.getFormattedDateTimeForReportDisplay(purchaseDetails.receivings_info.receiving_time);
                var supplierId = purchaseDetails.receivings_info.supplier_id;
                if (supplierId) {
                    if (!(supplierId in response)) {
                        var supplierData = yield supplierDataSvc.getFullSupplierDoc('supplier_' + supplierId);
                        var paymentValue = getPaymentValue(supplierData);
                        response[supplierId] = {
                            supplier: {
                                first_name: supplierData.first_name,
                                last_name: supplierData.last_name,
                                email: supplierData.email,
                                phone: supplierData.phone_number,
                                dueDate: {
                                    periodValue: paymentValue.periodValue,
                                    periodType: paymentValue.periodType,
                                    date: ""
                                }
                            },
                            total: 0,
                            pendingAmount: 0,
                            nearDueDateAmt: 0,
                            overDueDateAmt: 0,
                            pendingTransactions: []
                        };
                    }
                    //RelaxTodo imei with batches purchase remove item
                    //RelaxTodo sale_time format has changed
                    response[supplierId].pendingTransactions.push(purchaseDetails);
                    response[supplierId].pendingAmount += purchaseDetails.receivings_info.pending_amount;
                    response[supplierId].total += purchaseDetails.receivings_info.total;
                    var dueDate = response[supplierId].supplier.dueDate.date = moment(tempDate).add(response[supplierId].supplier.dueDate.periodValue, response[supplierId].supplier.dueDate.periodType).format('LLL');
                    var todayDate = moment(new Date()).startOf('day');
                    var paymentDueDays = moment(dueDate).startOf('day').diff(todayDate, 'day');
                    if (pymentsWarningDays > paymentDueDays && paymentDueDays > 0) {
                        response[supplierId].nearDueDateAmt += purchaseDetails.receivings_info.pending_amount;
                    }
                    else if (pymentsWarningDays > paymentDueDays && paymentDueDays <= 0) {
                        response[supplierId].overDueDateAmt += purchaseDetails.receivings_info.pending_amount;
                    }
                }
            }
            return response;
        });
    };
    function queryFailure(error) {
        console.log(error);
    }
});
