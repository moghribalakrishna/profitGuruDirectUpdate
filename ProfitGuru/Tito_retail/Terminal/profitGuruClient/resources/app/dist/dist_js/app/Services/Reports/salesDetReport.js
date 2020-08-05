/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Sai, September 2016
 */

angular.module('profitGuru')
  .service('salesDetReport', ['$rootScope', '$filter', '$q', 'utilsSvc', 'computeUtils', 'salesQuerySvc', 'reportCommon', function ($rootScope, $filter, $q, utilsSvc, computeUtils, salesQuerySvc, reportCommon) {

    'use strict';

    var title = 'Detailed Sales Report';
    var header_width = 8;
    var headersJson = {
      "summary": ["Sale ID", "Date", "Count", "Sold By", "Sold To", "Subtotal", "Total", "Tax", "Cost", "Profit", "Payment Type", "Comments"],
      "details": ["Name", "Category", "Serial #", "Description", "Count", "Subtotal", "Total", "Tax", "Cost", "Profit", "Discount"]
    };
    var editable = 'sales';
    var export_excel = '0';
    var fieldsDB = ['name', 'item_number', 'description', 'quantity', 'reorder_level'];
    var start_date = '';
    var end_date = '';
    var sale_type = '';

    this.getResult = function (paramJson) {

      export_excel = '0';
      if (paramJson.hasOwnProperty('export_excel')) {
        export_excel = paramJson.export_excel;
      }

      start_date = computeUtils.getFormattedDateForReportDisplay(paramJson.start_date);
      end_date = computeUtils.getFormattedDateForReportDisplay(paramJson.end_date);
      sale_type = paramJson.sale_type;
      paramJson.queryCategories = true;
      paramJson.isDetailRep = true;

      return $q.all([salesQuerySvc.getSalesDetails(paramJson), salesQuerySvc.getAllTaxes()]).then(function (respArr) {
        return formatData2(respArr[0], respArr[1]);
      }).catch(function (err) {
        void 0;
        throw err;
      });

    };

  function retrieveTaxable(taxPercent, salesItemList){
	  let realsubTotal=0;
	  let taxAmounts={};
	  salesItemList.forEach(function(item){
		  let totTaxPercent=0;
		  
		  item.itemTaxList.forEach(function(tax){
			  totTaxPercent+=tax.percent;
			});
		  
		  if(totTaxPercent.toString() === taxPercent){
			  //lets collect the individual taxes & their names
			for (var aTax in item.taxes) {
				if (item.taxes.hasOwnProperty(aTax)) {
					//ignore Total
					if(aTax !== "Total") {
						if(taxAmounts[aTax]){
							taxAmounts[aTax] += item.taxes[aTax];;
							}
						else {
							taxAmounts[aTax] = item.taxes[aTax];
							}
						}
					}
				}
				// The sub Total
				realsubTotal+=item.subTotal;
			}
	  });
	return {
		subTotal:realsubTotal,
		taxesAmountList:taxAmounts
	};	  
	
  }
    function formatData2(docs, allTaxes) {

      var summaryDataArray = [];
      var detailsDataArray = [];
      var overallSummaryData = {};
      overallSummaryData.total = 0;
      overallSummaryData.subtotal = 0;
      overallSummaryData.tax = 0;
      overallSummaryData.cost = 0;
      overallSummaryData.profit = 0;
      overallSummaryData.taxes = {
        CGST: 0,
        SGST: 0,
        IGST: 0,
        CESS: 0,
        Total: 0
      };
      overallSummaryData.totalDiscount = 0;
      var taxPercentFilter = {};
      var returnsStartingIndex = -1;
      var summaryDataHeaderArry = ['CGST', 'SGST', 'IGST', 'CESS'];

      for (var v in allTaxes) {
        if (allTaxes[v].name != 'GST' && allTaxes[v].name != 'CESS') {
          summaryDataHeaderArry.push(allTaxes[v].name);
        }
      }
      for (var i = 0; i < docs.length; i++) {
        var summaryData = {};

        var doc = docs[i];
        var bReturn = false;
        var sales_info = doc.sales_info;
        if (!sales_info) {
          bReturn = true;
          sales_info = doc.info;
        }
        var timeStamp = sales_info.sale_time;
        if (!timeStamp) {
          timeStamp = sales_info.time;
        }
        var invoicePrefix = '';
        var invoiceRetPrefix = '';
        if (!sales_info.invoicePrefix) {
          invoicePrefix = $rootScope.mergedConfigurationsData.invoiceDefaultCheckpoint.prefix;
          invoiceRetPrefix = $rootScope.mergedConfigurationsData.invoiceDefaultCheckpoint.sReturnPrefix;
        } else {
          invoicePrefix = sales_info.invoicePrefix;
          invoiceRetPrefix = sales_info.invoicePrefix;
        }
        sales_info.sale_id = doc.sale_id;
        if (!sales_info.sale_id) {
          sales_info.id = doc.id;
        }
        var saleID = reportCommon.getSaleId(sales_info, invoicePrefix, invoiceRetPrefix, bReturn);

        summaryData.prefix = invoicePrefix;
        summaryData.id = doc.sale_id ? doc.sale_id : doc.id;
        summaryData.sale_id = saleID;
        summaryData.num = sales_info.num;
        summaryData.invoiceCheckpoint = sales_info.invoiceCheckpoint ? sales_info.invoiceCheckpoint : 1;
        summaryData._id = doc._id;
        summaryData.gstin = sales_info.GSTIN ? sales_info.GSTIN : '';
        summaryData.bReject = doc.bRejected ? doc.bRejected : false;
        summaryData.bReturned = doc.bReturned;

        if (sales_info.bHomeDelivery) {
          summaryData.bHomeDelivery = sales_info.bHomeDelivery;
        } else {
          summaryData.bHomeDelivery = false;
        }

        // if (doc.mods && doc.mods.length) {
        //   summaryData.bReturned = true;
        // }

        summaryData.sale_date = computeUtils.getFormattedDateForReportDisplay(timeStamp);
        var customerID = sales_info.customer_id;
        summaryData.customer = '';
        if (sales_info.customer) {
          summaryData.customer = sales_info.customer;
        } else if (sales_info.wcInfo && sales_info.wcInfo.name) {
          summaryData.customer = sales_info.wcInfo.name;
        }
        summaryData.employee = sales_info.employee ? sales_info.employee : '';



        summaryData.comment = '';
        if (sales_info.comment)
          summaryData.comment = sales_info.comment;

        summaryData.payment_type = '';
        doc.payments.forEach(function (payment) {
          summaryData.payment_type += payment.payment_type + ' ' + payment.payment_amount + ', ';
        });
        summaryData.payment_type = summaryData.payment_type.substring(0, summaryData.payment_type.length - 2);
        summaryData.payments = doc.payments;

        summaryData.quantity = parseFloat(sales_info.quantity);
        summaryData.cost = parseFloat(sales_info.cost);
        summaryData.sub = parseFloat(sales_info.subtotal);
        summaryData.total = parseFloat(sales_info.total);
        summaryData.profit = parseFloat(sales_info.profit);
        summaryData.tax = parseFloat(sales_info.taxes.Total);
        summaryData.details = [];
        summaryData.taxes = sales_info.taxes;
        summaryData.discount = sales_info.discount ? parseFloat(sales_info.discount) : 0;

        var reverseSign = 1;
        var items = docs[i].sale_items;
        if (!items) {
          returnsStartingIndex = returnsStartingIndex === -1 ? i : returnsStartingIndex;
          // reverseSign = returnsStartingIndex === 0 ? 1 : -1;
          if (sale_type !== 'returns') reverseSign = -1;
          items = docs[i].items;
        }
        if (doc.bRejected) {
          reverseSign = 0;
        }
        // summaryData.taxPercentFilter = {};
        // var calculations = {};
        // for (var k = 0; k < items.length; k++) {
        //   var itemInfo = items[k];
        //   var itemID = itemInfo.item_id;
        //   // var itemComputeInfo = computeUtils.computeItem(itemInfo, 1, calculations);
        //   var itemDetails = {};
        //   itemDetails.name = itemsDictionary[itemID].info.name;
        //   itemDetails.category = categoriesDictionary[itemsDictionary[itemID].info.category];
        //   itemDetails.serialnumber = itemInfo.serialnumber;
        //   itemDetails.imeiNumbers = itemInfo.imeiNumbers;
        //   itemDetails.description = itemInfo.description;
        //   itemDetails.quantity = computeUtils.mathRoundOf(itemInfo.quantity);

        //   summaryData.details.push(itemDetails);
        //   detailsDataArray.push(itemDetails);
        // }


        summaryData.quantity = $filter('decimalsLimitFilter')(summaryData.quantity, $rootScope.mergedConfigurationsData.numberFormat.decimalDigits).toString();
        summaryData.cost = utilsSvc.numberRoundOffFormat(summaryData.cost, 'none');

        summaryData.total = utilsSvc.numberRoundOffFormat(summaryData.total, sales_info.round_off_method);
        summaryData.deliveryCharge = sales_info.deliveryCharge ? sales_info.deliveryCharge : 0;
        // summaryData.total = utilsSvc.numberRoundOffFormat(summaryData.total, sales_info.round_off_method);
        summaryData.tax = utilsSvc.numberRoundOffFormat(summaryData.taxes.Total, 'none');
        summaryData.sub = utilsSvc.numberRoundOffFormat(summaryData.sub, 'none');
        summaryData.discount = utilsSvc.numberRoundOffFormat(summaryData.discount, 'none');

        for (var taxKey in summaryData.taxes) {
          summaryData.taxes[taxKey] = utilsSvc.numberRoundOffFormat(summaryData.taxes[taxKey], 'none');
          overallSummaryData.taxes[taxKey] += summaryData.taxes[taxKey] * reverseSign;
        }
        for (var w in summaryDataHeaderArry) {
          if (summaryData.taxes[summaryDataHeaderArry[w]]) {
            summaryData[summaryDataHeaderArry[w]] = summaryData.taxes[summaryDataHeaderArry[w]];
          } else {
            summaryData[summaryDataHeaderArry[w]] = 0;
          }
        }
        summaryData.TotalTax = summaryData.tax ? summaryData.tax : 0;
        summaryData.taxes['Total'] = summaryData.tax;

        overallSummaryData.subtotal += summaryData.sub * reverseSign;
        overallSummaryData.tax += summaryData.tax * reverseSign;
        overallSummaryData.cost += summaryData.cost * reverseSign;
        overallSummaryData.total += summaryData.total * reverseSign;
        overallSummaryData.profit += summaryData.profit * reverseSign;
        overallSummaryData.totalDiscount += summaryData.discount * reverseSign;
        if (doc.sale_id) {
          summaryData.profit = utilsSvc.numberRoundOffFormat(summaryData.profit, 'none');
          // summaryData.profit = utilsSvc.numberRoundOffFormat(computeUtils.subtract(summaryData.sub, summaryData.cost), 'none');
        } else {
          summaryData.profit = "---";
        }

		var nonZeroTaxSubTotal=0;
        for (var tp in sales_info.taxDetailed) {

          var subTotal = sales_info.taxDetailed[tp].taxable;
          delete sales_info.taxDetailed[tp].taxable;
          sales_info.taxDetailed[tp]["Sale Id"] = summaryData.sale_id; // summaryData.prefix + summaryData.id;
          sales_info.taxDetailed[tp]["Date"] = summaryData.sale_date;
          sales_info.taxDetailed[tp]["GSTIN"] = sales_info.GSTIN ? sales_info.GSTIN : "";
		  
		   // this is backcalcualation & error fix for the tax list whoich is missing taxable from them
		  // this may occur in multiple cases as one of them is below
		  // when a tax item(ex 12% tax) is sold at zero Selling price then 12% entry in taxDetailed will not have taxable field!!!!
		  //Why? Need to analyze, till then lets live with following fix
		   
		let taxRetrievdResp={};
		  if (tp === "0"){
			  continue;
		  } else {
			   if(!subTotal){
				taxRetrievdResp = retrieveTaxable(tp, items);
				subTotal = taxRetrievdResp.subTotal;
				//adding tax info to sales_info
				for (var aTax in taxRetrievdResp.taxesAmountList) {
				
					if (taxRetrievdResp.taxesAmountList.hasOwnProperty(aTax)) {
						sales_info.taxDetailed[tp][aTax]=taxRetrievdResp.taxesAmountList[aTax];
						}
					}
			   }
			   //The calculated subTotal
			  nonZeroTaxSubTotal+= subTotal;
		  }
			  		  
          sales_info.taxDetailed[tp]["Sub Total"] = subTotal ? subTotal : summaryData.sub; 
		  		 
          if (tp in taxPercentFilter) {
            taxPercentFilter[tp].push(sales_info.taxDetailed[tp]);
          } else {
            taxPercentFilter[tp] = [sales_info.taxDetailed[tp]];
          }
        }
		
		//Handling "0%" Tax items or Non Tax items
		if((summaryData.sub - nonZeroTaxSubTotal) > 0){
			var zeroTaxJson={};
			
		  zeroTaxJson["Sale Id"] = summaryData.sale_id; // summaryData.prefix + summaryData.id;
          zeroTaxJson["Date"] = summaryData.sale_date;
          zeroTaxJson["GSTIN"] = sales_info.GSTIN ? sales_info.GSTIN : "";
          zeroTaxJson["Sub Total"] = summaryData.sub - nonZeroTaxSubTotal;
		  
         
		   if ( "0" in taxPercentFilter) {
            taxPercentFilter["0"].push(zeroTaxJson);
          } else {
           taxPercentFilter["0"] = [zeroTaxJson];
          }
		}

        summaryDataArray.push(summaryData);
      }
      for (var taxKey in overallSummaryData.taxes) {
        overallSummaryData.taxes[taxKey] = utilsSvc.numberRoundOffFormat(overallSummaryData.taxes[taxKey], 'none');
      }
      overallSummaryData.taxes['Total'] = utilsSvc.numberRoundOffFormat(overallSummaryData.tax, 'none');
      overallSummaryData.total = utilsSvc.to_currency(overallSummaryData.total.toString());
      overallSummaryData.profit = utilsSvc.to_currency(overallSummaryData.profit.toString());
      overallSummaryData.subtotal = utilsSvc.to_currency(overallSummaryData.subtotal.toString());
      overallSummaryData.tax = utilsSvc.to_currency(overallSummaryData.tax.toString());
      overallSummaryData.cost = utilsSvc.to_currency(overallSummaryData.cost.toString());
      overallSummaryData.totalDiscount = utilsSvc.to_currency(overallSummaryData.totalDiscount.toString());

      var data = {};
      data.title = title;
      data.subtitle = start_date + '-' + end_date;
      data.headers = headersJson;
      data.header_width = header_width;
      data.start = start_date;
      data.end = end_date;
      data.editable = editable;
      data.summ_data = summaryDataArray;
      data.overall_summary_data = overallSummaryData;
      data.export_excel = export_excel;
      data.taxPercentFilter = taxPercentFilter;

      return data;
    }

  }]);
