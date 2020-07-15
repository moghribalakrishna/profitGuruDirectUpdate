angular.module('profitGuru')
    .service('paymentsControllerCommonSvc', function ($q, $ionicLoading, $ionicPopup, $ionicModal, $state, $rootScope, $filter, profitGuruPouchSvc, paymentsQuerySvc, paymentsServerApis, commonControllerValidationSvc, reportDataSvc, printHelperSvc, commonServerApis, html2PdfSvc, customerDataSvc, navHandler) {
        'use strict';
        var _self = this;
        this.paymentResp = {};
        this.currentView = {};
        this.payingAmount = 0;
        this.updatedPaymentResp = {};
        this.updatedPaymentResp.pendingTransactions = []
        this.allCreditDetails = {};
        this.allPaidCreditDetails = {};
        this.reportTitle = '';

        function getSMSMessage(msg, jsonParam) {
            if (!jsonParam) {
                return msg;
            }
            var res = msg;
            if (jsonParam.amount) res = res.replace("AMOUNT", jsonParam.amount + ' INR');
            if (jsonParam.company) res = res.replace("COMPANY", jsonParam.company);
            if (jsonParam.customer) res = res.replace("CUSTOMER", jsonParam.customer);
            if (jsonParam.date) res = res.replace("DATE", jsonParam.date);
            return res;
        }

        this.setCustomerDetails = function (customer_id, customer) {
            _self.customer_id = customer_id;
            _self.customer = customer;
        };

        
        this.set2ShowCustomerCreditDetails = function (customer_id, customer,$scope) {
            _self.customer_id = customer_id;
            _self.customer = customer;
            _self.currentView = $scope.viewElements.customer;
        };
        this.setSupplierDetails = function (supplier_id, supplier) {
            _self.supplier_id = supplier_id;
            _self.supplier = supplier;
        };
        this.paymentSelectionList = {
            "Select Transaction Manually": "Select Transaction Manually",
            "Select All Txns": "Select All Txns"
        };
        this.paymentNotificationType = {
            "SMS": "SMS",
            "email": "email"
        }
        this.creditsSelectionFilter = {
            "All": "All",
            "Crossed due Date": "Crossed due Date",
            "Near due Date": "Near due Date"
        }
        this.creditReportDate = {
            today: new Date(),
            adjustMonth: function (offset) {
                var d = new Date();
                d.setMonth(d.getMonth() + offset);
                return d;
            }
        }
        this.creditReportHeader = {
            receviableHeader: {
                header: ["Select Customer", "Customer name", "Pendind Amount", "Remaning Credit Amount", "Process for Receive", "Sales History"],
                dataObj: ["sale_time", "total", "pending_amount"]
            },
            payableHeader: ["Customer name", "Pendind Amount", "Remaning Credit Amount", "Process for Receive", "Sales History"]
        };
        this.initPaymentSelectionType = function () {
            this.paymentSelectionType = _self.paymentSelectionList["Select All Txns"];

        }
        _self.initPaymentSelectionType();
        this.getAllCustomerCreditDetails = function () {
            _self.setDatabase();
            return paymentsQuerySvc.getAllPendingPayments().then(function (resp) {
                return resp;
            }).catch(function (error) {
                return error;
            });
        }
        this.getAllCustomerPaidCreditDetails = function () {
            _self.setDatabase();
            return paymentsQuerySvc.getAllPaidCreditPayments().then(function (resp) {
                return resp;
            }).catch(function (error) {
                return error;
            });
        }
        this.getAllSupplierCreditDetails = function () {
            _self.setDatabase();
            return paymentsQuerySvc.getAllSupplierPendingPayments().then(function (resp) {
                return resp;
            }).catch(function (error) {
                return error;
            });
        }
        //todo : switch dbs
        // var localPouchMaindb = profitGuruPouchSvc.getThisDB('maindb');
        var localPouchUsers = profitGuruPouchSvc.getThisDB('_users');

        var localPouchMaindb;

        //review: can be skipped
        this.setDatabase = function (params) {
            if ($rootScope.clientType !== "MobileApp" || ($rootScope.offsiteView && !$rootScope.cloudOnlineView)) {
                localPouchMaindb = profitGuruPouchSvc.getThisLocalPouchDB('maindb');
            } else if (params) {
                return profitGuruPouchSvc.getThisDBForReports('maindb', params).then(function (db) {
                    localPouchMaindb = db;
                    setDBS();
                });

            } else {
                //review : can be skipped
                localPouchMaindb = profitGuruPouchSvc.getThisRemotePouchDB('maindb');
            }
            setDBS();

        }
        _self.setDatabase();

        function setDBS() {
            paymentsQuerySvc.setDB(localPouchMaindb, localPouchUsers);
        }


        this.getPaymentsCommonFunction = function ($scope) {
            //Intializing the screen
            $scope.bShowPaidCreditPaymentHistory=false;
            $scope.showCreditPaymentHistoryButtonMsg="View Paid Credits";
            $scope.paymentsView = [];
            var thisScope = {};
            reportDataSvc.reportCommonFunction($scope, thisScope);
            var commonUtils = {};
            commonControllerValidationSvc.loadScopeWithCommonValidationApis($scope, commonUtils);
            var CREATE_MODAL_INSTANCE = commonUtils.createModalInstance;
            $scope.paymentSelectionList = _self.paymentSelectionList;
            $scope.paymentSelectionType = _self.paymentSelectionType;
            $scope.viewElements = {
                customer: {
                    title: "Customer",
                    transaction: "Sales",
                    header: ["Sales Date", "Sales On Credit Amount", "Pending Amount"],
                    creditsHeaderDetails: ["Payment Type", "Payment Amount", "Payment Date"],
                    dataObj: ["date", "amount", "pendingAmount"],
                    paidCreditHeaders: ["Paid Date", "Payment Type","Amount", "Comment"]
                },
                supplier: {
                    title: "Supplier",
                    transaction: "Purchase",
                    header: ["Purchase Date", "Purchase On Credit Amount", "Pending Amount"],
                    creditsHeaderDetails: ["Payment Type", "Payment Amount", "Payment Date"],
                    dataObj: ["date", "amount", "pendingAmount"]
                }

            };


            $scope.paymentResp = {};

            $scope.payingAmount = 0;
            (function () {
                if ($rootScope.isViewPayment) {
                    _self.initPaymentSelectionType();
                    $scope.paymentSelectionType = _self.paymentSelectionType;
                    $rootScope.isViewPayment = false;
                    delete $rootScope.isViewPayment;
                    switch (_self.currentView.title) {
                        case 'Customer':
   
                         return paymentsQuerySvc.getPendingPaymentsByCustomer(_self.customer_id).then(function (resp) {
                                $scope.paymentResp = resp;
                                $scope.paymentResp.customer_id = _self.customer_id;
                                $scope.paymentResp.name = _self.customer.first_name + " " + _self.customer.last_name;
                                _self.paymentResp = angular.copy($scope.paymentResp);
                                $scope.payingAmount = $scope.amount_due = $scope.paymentResp.pendingAmount;
                                _self.payingAmount = angular.copy($scope.payingAmount);
                                _self.renderApply($scope);
                                return paymentsQuerySvc.getPaidCreditPaymentsByCustomer(_self.customer_id).then(function (resp) {
                                    $scope.paidCreditResp = resp;
                                    //$scope.paymentResp.customer_id = _self.customer_id;
                                    //$scope.paymentResp.name = _self.customer.first_name + " " + _self.customer.last_name;
                                    // _self.paymentResp = angular.copy($scope.paymentResp);
                                    // $scope.payingAmount = $scope.amount_due = $scope.paymentResp.pendingAmount;
                                    // _self.payingAmount = angular.copy($scope.payingAmount);
                                    // _self.renderApply($scope);
                                }).catch(function (error) {
                                    console.log(error);
                                });
                            }).catch(function (error) {
                                console.log(error);
                            });
                       // }
                        case 'Supplier':
                            return paymentsQuerySvc.getPendingPaymentsForSupplier(_self.supplier_id).then(function (resp) {
                                $scope.paymentResp = resp;
                                $scope.paymentResp.supplier_id = _self.supplier_id;
                                $scope.paymentResp.name = _self.supplier.first_name + " " + _self.supplier.last_name;
                                _self.paymentResp = angular.copy($scope.paymentResp);
                                $scope.payingAmount = $scope.amount_due = $scope.paymentResp.pendingAmount;
                                _self.payingAmount = angular.copy($scope.payingAmount)
                                _self.renderApply($scope);
                            }).catch(function (error) {
                                console.log(error);
                            });
                    }


                }
            })();

            this.renderApply = function (scope, tryAgain, retryCount) {
                retryCount = (retryCount === undefined) ? 100 : retryCount;
                tryAgain = (tryAgain === undefined) ? true : tryAgain;
                if (scope.$root.$$phase != '$apply' && scope.$root.$$phase != '$digest') {
                    scope.$apply();
                } else if (tryAgain && retryCount) {
                    console.log('renderApply called');
                    setTimeout(function () {
                        _self.renderApply(scope, tryAgain, retryCount - 1);
                    }, 1);
                }
            };
            $scope.showCreditPaymentHistory = function(){
                $scope.bShowPaidCreditPaymentHistory = !$scope.bShowPaidCreditPaymentHistory;
                if(!$scope.bShowPaidCreditPaymentHistory){
                    $scope.showCreditPaymentHistoryButtonMsg="View Paid Credits";
                }else{
                    $scope.showCreditPaymentHistoryButtonMsg="View Pending Credits";
                }
                
            }
            $scope.openCustomerSelect = function () {
                $rootScope.isAddCustomer2Payment = true;
                $rootScope.callBackState = "app.paymentsView";
                navHandler.push('app.customers');
                _self.currentView = $scope.viewElements.customer;
            };

            $scope.openSupplierSelect = function () {
                $rootScope.isAddSupplier2Rec = false;
                $rootScope.isAddSupplier2Payment = true;
                $rootScope.callBackState = "app.paymentsView";
                navHandler.push('app.suppliers');
                delete ($rootScope.supplierClickedinmenu);
                _self.currentView = $scope.viewElements.supplier;

            };


            $scope.Add2payingAmount = function (amount, paymentIsChecked, pendingTransactionsObj, index) {

                if (paymentIsChecked) {
                    $scope.payingAmount += amount;
                    //    _self.updatedPaymentResp.pendingTransactions[index] = pendingTransactionsObj;
                    _self.paymentResp.pendingTransactions[index].checked = true;
                } else {
                    $scope.payingAmount -= amount;
                    _self.paymentResp.pendingTransactions[index].checked = false;
                    //     delete _self.updatedPaymentResp.pendingTransactions[index];
                }
                _self.payingAmount = $scope.payingAmount
            }
            $scope.onpaymentSelectionTypeChange = function (paymentSelectionType) {
                _self.paymentSelectionType = angular.copy(paymentSelectionType);
                for (var x in _self.paymentResp.pendingTransactions) {
                    _self.paymentResp.pendingTransactions[x].checked = false;
                }
                $scope.paymentList = {};
                if (paymentSelectionType === "Select All Txns") {
                    $scope.payingAmount = $scope.amount_due = $scope.paymentResp.pendingAmount;
                } else {
                    $scope.payingAmount = $scope.amount_due = 0;
                }
                _self.payingAmount = angular.copy($scope.payingAmount)
            }

            $scope.makePayment = function () {
                navHandler.push('app.creditPayments');
            }
            $scope.paymentList = {}

            $scope.showIndex = -1;
            $scope.showRefNo = function (refIndex) {
                if ($scope.showIndex == refIndex)
                    $scope.showIndex = -1;
                else
                    $scope.showIndex = refIndex;
            }

            $scope.duplicatePaymenTypeIndex = '';
            $scope.duplicatePaymentType = function (pay_type) {
                if ($scope.paymentsView != undefined) {
                    for (var i = 0; i < $scope.paymentsView.length; i++) {
                        if ($scope.paymentsView[i].payment_type === pay_type) {
                            $scope.duplicatePaymenTypeIndex = i;
                            return true;
                        }

                    }
                } else
                    return false;
            };
            $scope.totalPaidAmount = 0;
            $scope.acceptPayment = function (pay_type, pay_amount, ref_no, payingAmount) {
                $scope.amount_due = $scope.amount_due - pay_amount;
                if (pay_amount > payingAmount) {
                    // console.log("Can't Enter more value than the Due amount!");
                    $scope.mesg = "<b> Don't Enter More than  RS  </b>" + payingAmount + "<br>Note: Amount Entered should be Less than or Equal to RS " + payingAmount;
                    console.log($scope.mesg);
                    $scope.showAlertPopup('WARNING', $scope.mesg);
                    $scope.amount_due = payingAmount;
                    // _self.amount_due = payingAmount;
                    return;
                }
                if ($scope.paymentList[pay_type]) {
                    $scope.paymentList[pay_type] += pay_amount;
                    $scope.totalPaidAmount += pay_amount;
                } else {
                    $scope.paymentList[pay_type] = pay_amount;
                    $scope.totalPaidAmount += pay_amount;
                }

                if ($scope.duplicatePaymentType(pay_type)) {
                    $scope.paymentsView[$scope.duplicatePaymenTypeIndex].payment_amount += pay_amount;
                } else {
                    $scope.paymentsView.push({
                        payment_type: pay_type,
                        payment_amount: pay_amount,
                        ref_no: ref_no
                    });
                }

            }

            $scope.deletePayment = function (pay_type, pay_amount) {
                $scope.amount_due = $scope.amount_due + pay_amount;
                $scope.totalPaidAmount -= pay_amount;
                if ($scope.paymentList[pay_type]) {
                    delete $scope.paymentList[pay_type]; //.slice(pay_type, 1);
                }
                $scope.duplicatePaymentType(pay_type)
                $scope.paymentsView.splice($scope.duplicatePaymenTypeIndex, 1);
                $scope.duplicatePaymenTypeIndex = '';
            }
            $scope.openCreditReceivableReport = function () {
                $ionicLoading.show({
                    template: '<p>Loading...</p><ion-spinner icon="spiral"></ion-spinner>'
                });
                setTimeout(function () {
                    $ionicLoading.hide();
                }, 5000);
                (function () {
                    _self.allCreditDetails = {};
                    _self.allPaidCreditDetails
                    _self.reportTitle = '';
                    _self.getAllCustomerCreditDetails().then(function (resp) {
                        _self.allCreditDetails = resp;
                        _self.reportTitle = 'Overall Pending Payments';
                        _self.currentView.title = "Customer";
                        return _self.getAllCustomerPaidCreditDetails().then(function (resp) {
                            _self.allPaidCreditDetails = resp;
                            navHandler.push('app.creditReceivableReport');
                            $ionicLoading.hide();
                            _self.renderApply();
                        });
                    }).catch(function (error) {
                        console.log(error);
                        $ionicLoading.hide();
                    });
                })();
            }


            $scope.openCreditPaybleReport = function () {
                $ionicLoading.show({
                    template: '<p>Loading...</p><ion-spinner icon="spiral"></ion-spinner>'
                });
                setTimeout(function () {
                    $ionicLoading.hide();
                }, 5000);
                (function () {
                    _self.allCreditDetails = {};
                    _self.reportTitle = '';
                    _self.getAllSupplierCreditDetails().then(function (resp) {
                        _self.allCreditDetails = resp;
                        _self.reportTitle = 'Overall Pending Payments';
                        _self.currentView.title = "Supplier";
                        navHandler.push('app.creditReceivableReport');
                        $ionicLoading.hide();
                        _self.renderApply();
                    }).catch(function (error) {
                        console.log(error);
                        $ionicLoading.hide();
                    });
                })();
            }


            $scope.getCreditReportByDate = function (dateParams, type) {
                if (type === 'Customer') {
                    getCreditReceivableReportByDate(dateParams);
                } else {
                    getCreditPaybleReportByDate(dateParams);
                }

            }

            function getCreditReceivableReportByDate(dateParams) {
                $ionicLoading.show({
                    template: '<p>Loading...</p><ion-spinner icon="spiral"></ion-spinner>'
                });
                setTimeout(function () {
                    $ionicLoading.hide();
                }, 5000);
                var params = {};
                params.start_date = dateParams.start_date;
                params.end_date = dateParams.end_date;
                _self.setDatabase(params);
                return paymentsQuerySvc.getAllPendingPayments(params).then(function (resp) {
                    _self.allCreditDetails = resp;
                    _self.reportTitle = _self.allCreditDetails.start_date ? ('From ' + _self.allCreditDetails.start_date + ' To ' + _self.allCreditDetails.end_date) : '';
                    delete _self.allCreditDetails.start_date;
                    delete _self.allCreditDetails.end_date;
                    // navHandler.push($state.current, {}, {
                    //     reload: true
                    // });
                    $ionicLoading.hide();
                }).catch(function (error) {
                    console.log(error);
                    $ionicLoading.hide();
                });

            };

            function getCreditPaybleReportByDate(dateParams) {
                $ionicLoading.show({
                    template: '<p>Loading...</p><ion-spinner icon="spiral"></ion-spinner>'
                });
                setTimeout(function () {
                    $ionicLoading.hide();
                }, 5000);
                var params = {};
                params.start_date = dateParams.start_date;
                params.end_date = dateParams.end_date;
                _self.setDatabase(params);
                return paymentsQuerySvc.getAllSupplierPendingPayments(params).then(function (resp) {
                    _self.allCreditDetails = resp;
                    _self.reportTitle = _self.allCreditDetails.start_date ? ('From ' + _self.allCreditDetails.start_date + ' To ' + _self.allCreditDetails.end_date) : '';
                    delete _self.allCreditDetails.start_date;
                    delete _self.allCreditDetails.end_date;
                    // navHandler.push($state.current, {}, {
                    //     reload: true
                    // });
                    $ionicLoading.hide();
                }).catch(function (error) {
                    console.log(error);
                    $ionicLoading.hide();
                });

            };
            $scope.YTI = function () {
                $scope.showErrorPopUp('comming soon... :)', "Message");
            }
            var tempPaymentReqData = {};
            $scope.confirmCompletePayment = function (paymentComment, print_after_sale) {
                /**
                 *        var params = {
                               customerId: selectedCustomerId,
                               payments: {
                                   Cash: selectedCustomerHistory.pending_amount * 0.3,
                                   Cheque: selectedCustomerHistory.pending_amount * 0.2
                               },
                               pendingTransactions: selectedCustomerHistory.pendingTransactions,
                               comment: 'hello world',
                               employeeId: 'admin'
                           };
                 */
                var m_pendingTransaction = {};
                if ($scope.paymentSelectionType === _self.paymentSelectionList["Select Transaction Manually"]) {
                    m_pendingTransaction = $filter('filter')($scope.paymentResp.pendingTransactions, {
                        checked: true
                    }, true);
                } else if ($scope.paymentSelectionType === _self.paymentSelectionList["Select All Txns"]) {
                    m_pendingTransaction = $scope.paymentResp.pendingTransactions;
                }
                var reqParams = {
                    customerId: _self.customer_id,
                    payments: $scope.paymentList,
                    pendingTransactions: m_pendingTransaction,
                    comment: paymentComment,
                    print_after_sale: print_after_sale,
                    paymentsView: $scope.paymentsView
                }
                tempPaymentReqData = reqParams;
                paymentsServerApis.completeCustomerCreditPaymentApi(reqParams).then(function (resp) {
                    if (resp.error) {
                        $scope.showPopUp(resp.error, "ERROR");
                        return
                    }
                    tempPaymentReqData.employee = resp.employee;
                    formateReciptData(tempPaymentReqData);

                    $scope.showCreditPaymentReceiptModal(resp);
                    if ($scope.print_after_sale) {
                        $scope.creditPaymentData.print_after_sale = 1;
                        printHelperSvc.printCreditReceipt($scope.creditPaymentData);
                    }
                    //    $scope.showPopUp("payment successfully completed", "SUCCESS");

                }).catch(function (error) {
                    $scope.showPopUp(error, "ERROR");
                });
            }
            $scope.print_after_sale = $scope.mergedConfigurationsData.invoiceSettings.printReceiptByDefault && $rootScope.mergedConfigurationsData.invoiceSettings.printInvoice;
            $scope.setPrintOfSale = function (bPrint) {
                $scope.print_after_sale = bPrint;
            };

            $scope.reprintCreditReceipt = function () {
                $scope.creditPaymentData.print_after_sale = 1;
                printHelperSvc.printCreditReceipt($scope.creditPaymentData);
            }
            $scope.reprintReceipt = function (reprintData) {
                reprintData.print_after_sale = 1;
                if ($scope.currentView.title == 'Supplier') {
                    printHelperSvc.printReceiveReciept(reprintData, 1);
                } else {
                    reprintData.bRePrint = true;
                    printHelperSvc.print(reprintData, 1);
                }
            }

            $scope.gotToCreditPayments = function (paymentComment, print_after_sale) {
                if ($scope.payingAmount < $scope.totalPaidAmount) {
                    $scope.showPopUp("Payment more then credit amount is not allowed, please pay exact amount and try again!", "ERROR");
                    return;
                }
                if (_self.currentView.title === 'Customer') {
                    $scope.confirmCompletePayment(paymentComment, print_after_sale);
                } else {
                    $scope.confirmCompletePaymentForSupplier(paymentComment, print_after_sale);
                }
                $scope.receiptDate = moment($scope.receiptDate).format($rootScope.mergedConfigurationsData.dateTime.dateformat +
                    ' ' + $rootScope.mergedConfigurationsData.dateTime.timeformat);
            }

            $scope.confirmCompletePaymentForSupplier = function (paymentComment, print_after_sale) {

                var m_pendingTransaction = {};
                if ($scope.paymentSelectionType === _self.paymentSelectionList["Select Transaction Manually"]) {
                    m_pendingTransaction = $filter('filter')($scope.paymentResp.pendingTransactions, {
                        checked: true
                    }, true);
                } else if ($scope.paymentSelectionType === _self.paymentSelectionList["Select All Txns"]) {
                    m_pendingTransaction = $scope.paymentResp.pendingTransactions;
                }
                var reqParams = {
                    supplierId: _self.supplier_id,
                    payments: $scope.paymentList,
                    pendingTransactions: m_pendingTransaction,
                    comment: paymentComment,
                    print_after_sale: print_after_sale,
                    paymentsView: $scope.paymentsView
                }
                tempPaymentReqData = reqParams;
                paymentsServerApis.completeSupplierCreditPaymentApi(reqParams).then(function (resp) {
                    if (resp.error) {
                        $scope.showPopUp(resp.error, "ERROR");
                        return
                    }
                    tempPaymentReqData.employee = resp.employee;

                    formatSupplierCreditReciptData(tempPaymentReqData);

                    $scope.showCreditPaymentReceiptModal(resp);
                    if ($scope.print_after_sale) {
                        $scope.creditPaymentData.print_after_sale = 1;
                        printHelperSvc.printCreditReceipt($scope.creditPaymentData);
                    }

                }).catch(function (error) {
                    $scope.showPopUp(error, "ERROR");
                });
            }

            var creditPaymentReceiptModal;
            $ionicModal.fromTemplateUrl('Payments/creditPaymentReceipt.html', {
                scope: $scope,
                animation: 'slide-in-up',
                controller: 'PaymentCntrlr',
                backdropClickToClose: false,
                hardwareBackButtonClose: false
            }).then(function (modal) {
                creditPaymentReceiptModal = modal;
            });
            $scope.showCreditPaymentReceiptModal = function () {
                console.log($scope.paymentData);
                creditPaymentReceiptModal.show();
            };
            $scope.$on('creditPaymentReceiptModal.shown', function () {
                console.log("Receipt Modal showned");
                //$scope.scrollReceipt2Bottom();
            });
            $scope.$on('$destroy', function () {
                creditPaymentReceiptModal.remove();

            });
            // Execute action on hide modal
            $scope.closeCreditPaymentReceiptModal = function () {
                creditPaymentReceiptModal.hide();
                // navHandler.pop();
                navHandler.goBackTo("app.payments");
                // $scope.showPopUp("payment successfully completed", "SUCCESS");
            };
            $scope.$on('creditPaymentReceiptModal.hidden', function () {
                console.log("Modal Hidden");

            });
            // Execute action on remove modal
            $scope.$on('creditPaymentReceiptModal.removed', function () {
                console.log("Modal Removed");
            });
            $scope.creditPaymentData = {};
            var formateReciptData = function (tempPaymentReqData) {
                $scope.customer_data = customerDataSvc.getAllCustomers();
                $scope.customerInfo = $filter('filter')($scope.customer_data, {
                    person_id: tempPaymentReqData.customerId
                }, true);
                $scope.creditPaymentData = {
                    comment: tempPaymentReqData.comment,
                    customerId: tempPaymentReqData.customerId,
                    employee: tempPaymentReqData.employee,
                    paidAmount: $scope.totalPaidAmount,
                    customer: $scope.customerInfo[0],
                    balanceCredit: $scope.paymentResp.pendingAmount,
                    currentCreditAmt: ($scope.paymentResp.pendingAmount - $scope.totalPaidAmount)
                };
                $scope.creditPaymentData.payments = tempPaymentReqData.payments;
                $scope.serverSalesDataClone.salesData = $scope.creditPaymentData;
            }

            var formatSupplierCreditReciptData = function (tempPaymentReqData) {
                $scope.supplierInfo = $filter('filter')($scope.supplier_data, {
                    person_id: tempPaymentReqData.supplierId
                }, true);
                $scope.creditPaymentData = {
                    comment: tempPaymentReqData.comment,
                    supplierId: tempPaymentReqData.supplierId,
                    employee: tempPaymentReqData.employee,
                    paidAmount: $scope.totalPaidAmount,
                    supplier: $scope.supplierInfo[0],
                    balanceCredit: $scope.paymentResp.pendingAmount,
                    currentCreditAmt: ($scope.paymentResp.pendingAmount - $scope.totalPaidAmount)
                };
                $scope.creditPaymentData.payments = tempPaymentReqData.payments;
            }


            $scope.showPopUp = function (message, title) {
                var template = message;
                var title = title;
                $ionicPopup.show({
                    template: template,
                    title: title,
                    scope: $scope,
                    buttons: [{
                        text: 'Close'
                    }]
                });
            };
            $scope.creditRpt = {
                start_date: _self.creditReportDate.adjustMonth(-2),
                end_date: _self.creditReportDate.today //_self.creditReportDate.adjustMonth(-1) 

            }
            $scope.customerCBox = [];
            $scope.sendCreditNotification = function (type) {
                var message = '';
                var personType = $scope.personType === 'Customer' ? 'customer' : 'supplier';
                console.log($scope.customerCBox);
                var smsSent = 0;
                var promisesArray = [];
                for (var i = 0; i < $scope.checkedCreditArray.length; i++) {

                    if (type === 'email') {
                        console.log($scope.checkedCreditArray[i]);
                        if ($scope.checkedCreditArray[i][personType].email && $scope.checkedCreditArray[i][personType].email !== '') {
                            var data = {
                                nearDueDateAmt: $scope.checkedCreditArray[i].nearDueDateAmt,
                                overDueDateAmt: $scope.checkedCreditArray[i].overDueDateAmt,
                                pendingAmount: $scope.checkedCreditArray[i].pendingAmount,
                                total: $scope.checkedCreditArray[i].total,
                                isCredit: true
                            }

                            data[personType] = $scope.checkedCreditArray[i][personType].first_name + ' ' + $scope.checkedCreditArray[i][personType].last_name;

                            var emailParams = {
                                email: $scope.checkedCreditArray[i][personType].email,
                                data: data,
                                title: $rootScope.mergedConfigurationsData.ownersInfo.company + " : Pending Credit Report"

                            }

                            thisScope.emailReport(emailParams);

                        } else {
                            message = 'Email id of ' + $scope.checkedCreditArray[i][personType].first_name + ' ' + $scope.checkedCreditArray[i][personType].last_name + ' is not available';
                            $scope.showPopUp(message, "Error");
                        }
                    } else if (type === 'SMS') {
                        if ($rootScope.mergedConfigurationsData.enableSMS.value !== true) {
                            $scope.showPopUp('Please enables SMS from Configuration', "SMS not enabled");
                            console.log('sms not enabled');
                            return;
                        }
                        if ($scope.checkedCreditArray[i][personType].phone && $scope.checkedCreditArray[i][personType].phone !== '' && personType === 'customer') {
                            var jsonParam = {
                                amount: $scope.checkedCreditArray[i].total.toFixed($rootScope.mergedConfigurationsData.numberFormat.decimalDigits),
                                saleId: '',
                                company: $rootScope.mergedConfigurationsData.ownersInfo.company,
                                date: $scope.checkedCreditArray[i][personType].dueDate.date,
                                customer: $scope.checkedCreditArray[i][personType].first_name
                            };
                            // $scope.showPopUp("Coming Soon :-)", "Message");
                            var params = {
                                To: '',
                                Msg: getSMSMessage($rootScope.mergedConfigurationsData.enableSMS.creditSMS, jsonParam),
                                type: "payments",
                                Type: 'TRANS',
                            };
                            if ($scope.checkedCreditArray[i][personType].phone)
                                params.To += $scope.checkedCreditArray[i][personType].phone + ',';
                            var smsResp = "";

                            promisesArray.push(commonServerApis.sendSMS(params).then(function (resp) {
                                // console.log(resp);
                                if (resp.data.msg == 'Success') smsSent += 1;
                            }).catch(function (err) {
                                // console.error(err);
                            }));

                        } else {
                            message = 'Phone number of ' + $scope.checkedCreditArray[i][personType].first_name + ' ' + $scope.checkedCreditArray[i][personType].last_name + ' is not available or its a seller.';
                            $scope.showPopUp(message, "Error");
                        }
                    } else {
                        message = "Select Notification Type";
                        $scope.showPopUp(message, "Error");
                    }
                }
                if (type == 'SMS') {
                    $q.all(promisesArray).then(function () {
                        $scope.showPopUp(message, smsSent + " sms sent");
                    });
                }
                setTimeout(function () {
                    $rootScope.disableRestApiIonicLoading = true;
                    if (type == 'SMS' && smsSent == 0) {
                        $scope.showPopUp("Sending SMS taking more time...", "Bad Network");
                    }
                }, 4000);

            };

            var creditDetailsModal;

            function createReceiptModalInstance() {

                CREATE_MODAL_INSTANCE('Payments/creditTransactions.html', 'creditReceivableReportCntrlr', $scope).then(function (modal) {
                    creditDetailsModal = modal;
                });
            }

            $scope.showCreditDetails = function (details) {
                $scope.creditsOfThis = details.pendingTransactions;
                createReceiptModalInstance();
            }

            $scope.closeCreditDetails = function () {
                creditDetailsModal.remove();
            };


            $scope.checkedCreditArray = [];
            $scope.m_checkThisRow = function (rowItem) {
                $scope.checkedCreditArray.push(rowItem);
            }

            $scope.print2pdf = function (bResendMail) {
                if (!$rootScope.bSendMail && !bResendMail) {
                    return;
                }
                $rootScope.bSendMail = false;
                var type = 'sales';
                if ($rootScope.appType == 'restaurant') type = 'takeAway';
                setTimeout(function () {
                    html2PdfSvc.setInfo($scope.serverSalesDataClone.salesData);
                    html2PdfSvc.html2Pdf(document.getElementById('print2pdf'), type);
                }, 1000);
            }

        }
    });

/**
 * CreditsToDo:
 *  fix initial pay amount for Automatic selection
 *  getting credits with 0 
 *  Payments total in checkout creditPayment screen
 *  negative numbers is showing brackets
 */