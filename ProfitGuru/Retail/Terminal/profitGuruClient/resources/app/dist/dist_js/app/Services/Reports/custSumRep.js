/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Sai, September 2016
 */

angular.module('profitGuru')
    .service('custSumRep', function (salesQuerySvc, $q, utilsSvc, computeUtils, customerDataSvc, reportCommon) {

        var export_excel = '0';
        var start_date = '';
        var end_date = '';
        var sale_type;
        var title = 'Customers Summary Report';
        var headers = ["Customer", "Count", "Subtotal", "Total", "Tax", "Cost", "Profit"];
        var _self = this;
        this.getResult = function (paramJson) {
            var defered = $q.defer();

            export_excel = '0';
            if (paramJson.hasOwnProperty('export_excel')) {
                export_excel = paramJson.export_excel;
            }

            start_date = computeUtils.getFormattedDateForReportDisplay(paramJson.start_date);
            end_date = computeUtils.getFormattedDateForReportDisplay(paramJson.end_date);


            paramJson.queryEmployees = false;
            paramJson.queryCustomers = true;
            paramJson.queryItems = false;
            sale_type = paramJson.sale_type;
            salesQuerySvc.getSalesDetails(paramJson).then(function (resp) {
                defered.resolve(_self.format4CustSumData(resp));
            }).catch(function (err) {
                console.log("Customers Summary Report Failed");
                defered.reject(err);
            });
            return defered.promise;
        };

        this.format4CustSumData = function (docs) {

            var customerDetails = {};

            var returnsStartingIndex = -1;
            for (var i = 0; i < docs.length; i++) {
                var doc = docs[i];
                if (doc.bRejected) {
                    continue;
                }

                var sales_info = doc.sales_info;
                if (!sales_info) {
                    sales_info = doc.info;
                }
                var customerId = sales_info.customer_id;
                if (customerId) {
                    var customerInfo = customerDataSvc.getCustomerById(customerId);
                    if (customerInfo) {
                        sales_info.customer = customerInfo.first_name + ' ' + customerInfo.last_name;
                    } else {
                        sales_info.customer = customerId;
                    }
                }
                //Assuming if customer is not added to sale customer_id value is nul

                if (!customerId || !customerInfo) {
                    customerId = 'WalkIn-Customer'
                }
                if ((customerId in customerDetails) === false) {
                    //Initializing the customerDetails structure
                    customerDetails[customerId] = {};
                    if (customerInfo) {
                        var companyName = customerInfo.company_name;
                        customerDetails[customerId].customer = companyName ? companyName : customerInfo.first_name + customerInfo.last_name;
                    } else {
                        customerDetails[customerId].customer = customerId;
                    }
                    customerDetails[customerId].quantity = 0;
                    customerDetails[customerId].subtotal = 0;
                    customerDetails[customerId].total = 0;
                    customerDetails[customerId].tax = 0;
                    customerDetails[customerId].cost = 0;
                    customerDetails[customerId].profit = 0;
                    // customerDetails[customerId].deliveryCharge = 0;
                }


                var reverseSign = 1;
                var items = doc.sale_items;
                if (!items) {
                    returnsStartingIndex = returnsStartingIndex === -1 ? i : returnsStartingIndex;
                    //todo
                    // reverseSign = returnsStartingIndex === 0 ? 1 : -1;
                    if (sale_type !== 'returns') reverseSign = -1;
                    items = doc.items;
                }

                var subtotal = sales_info.subtotal;
                var total = sales_info.total;
                var cost = sales_info.cost;
                var tax = sales_info.taxes.Total;
                var profit = sales_info.profit;
                customerDetails[customerId].quantity += sales_info.quantity * reverseSign;

                customerDetails[customerId].cost += utilsSvc.numberRoundOffFormat(cost, 'none') * reverseSign;
                customerDetails[customerId].profit += utilsSvc.numberRoundOffFormat(profit, 'none') * reverseSign;
                customerDetails[customerId].tax += utilsSvc.numberRoundOffFormat(tax, 'none') * reverseSign;
                customerDetails[customerId].subtotal += utilsSvc.numberRoundOffFormat(subtotal, 'none') * reverseSign;
                customerDetails[customerId].total += utilsSvc.numberRoundOffFormat(total, sales_info.round_off_method) * reverseSign;


            }

            var result = {};
            result.summary_data = {};
            result.summary_data.subtotal = 0;
            result.summary_data.total = 0;
            result.summary_data.tax = 0;
            result.summary_data.cost = 0;
            result.summary_data.profit = 0;
            // result.summary_data.deliveryCharge = 0;
            result.data = [];
            if (customerDetails['WalkIn-Customer']) {
                delete customerDetails['WalkIn-Customer'];
            }
            for (var customerId in customerDetails) {
                if (customerDetails.hasOwnProperty(customerId)) {
                    result.summary_data.total += customerDetails[customerId].total;
                    result.summary_data.subtotal += customerDetails[customerId].subtotal;
                    result.summary_data.cost += customerDetails[customerId].cost;
                    result.summary_data.profit += customerDetails[customerId].profit;
                    result.summary_data.tax += customerDetails[customerId].tax;
                    // result.summary_data.deliveryCharge += customerDetails[customerId].deliveryCharge;
                    customerDetails[customerId].cost = utilsSvc.numberRoundOffFormat(customerDetails[customerId].cost, 'none');
                    customerDetails[customerId].tax = utilsSvc.numberRoundOffFormat(customerDetails[customerId].tax, 'none');
                    customerDetails[customerId].subtotal = utilsSvc.numberRoundOffFormat(customerDetails[customerId].subtotal, 'none');
                    customerDetails[customerId].total = utilsSvc.numberRoundOffFormat(customerDetails[customerId].total, 'none');
                    customerDetails[customerId].profit = utilsSvc.numberRoundOffFormat(customerDetails[customerId].profit, 'none');
                    customerDetails[customerId].quantity = utilsSvc.numberRoundOffFormat(customerDetails[customerId].quantity, 'none');

                    result.data.push(customerDetails[customerId]);
                }
            }
            result.summary_data.total = utilsSvc.to_currency2(result.summary_data.total);
            result.summary_data.profit = utilsSvc.to_currency2(result.summary_data.profit);
            result.summary_data.subtotal = utilsSvc.to_currency2(result.summary_data.subtotal);
            result.summary_data.tax = utilsSvc.to_currency2(result.summary_data.tax);
            result.summary_data.cost = utilsSvc.to_currency2(result.summary_data.cost);

            result.title = title;
            result.subtitle = start_date + '-' + end_date;
            result.headers = headers;
            result.start = start_date;
            result.end = end_date;
            result.export_excel = export_excel;

            return result;
        }


    });
