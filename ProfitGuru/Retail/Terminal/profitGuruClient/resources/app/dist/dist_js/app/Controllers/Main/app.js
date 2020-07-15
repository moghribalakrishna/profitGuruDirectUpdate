/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */
// Ionic Starter App
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
//angular.module('profitGuru', ['ionic','ui.bootstrap'])
angular.module('profitGuru', ['ionic', 'chart.js', 'ngResource', 'ngStorage', 'ds.clock', 'cfp.hotkeys', 'ngSanitize', 'templates', 'angular-timeline', 'ngMessages', 'focus-if', 'angular-toArrayFilter', 'luegg.directives', 'ngFileSaver', 'angular-inview', 'dndLists']).run(function ($ionicPlatform) {
  $ionicPlatform.ready(function () {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
}).config(function ($httpProvider, $stateProvider, $urlRouterProvider, $ionicConfigProvider, APPCONFIG, hotkeysProvider) {
  hotkeysProvider.includeCheatSheet = false;

  function getParameterByName(name) {
    url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  var g_appType = getParameterByName("app");
  try {
    var configJsonPath = './dist_js/config.json';

    var userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.indexOf(' electron/') > -1 && APPCONFIG.runEnvironment !== 'electron') {
      configJsonPath = './distProd/dist_js/config.json';
    }
    //Synchronous read
    $.ajax({
      url: configJsonPath,
      async: false,
      dataType: 'json',
      success: function (data) {
        APPCONFIG.appName = data.cloudApp ? g_appType : data.appName;
        APPCONFIG.printLoadDelay = 0;
        APPCONFIG.bAccessRemoteReports = data.bAccessRemoteReports;
        APPCONFIG.bSyncPouch2Couch = data.bSyncPouch2Couch;
        if (data.printLoadDelay) {
          APPCONFIG.printLoadDelay = data.printLoadDelay;
        }
        if (data.isTerminal) {
          APPCONFIG.isTerminal = data.isTerminal;
          APPCONFIG.bLocalServer = data.bLocalServer;
          APPCONFIG.terminalServer = 'http://localhost:' + APPCONFIG.terminalPort[APPCONFIG.appName];
        }
      }
    });

  } catch (err) {
    console.log('Failed to read config fail. AppName unknown');
    throw 'Unknown App Name';
  }

  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.delete = {
    "Content-Type": "application/json;charset=utf-8"
  };

  $ionicConfigProvider.views.maxCache(0);
  $stateProvider.state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'Common/menu.html',
    controller: 'AppCntrlr'
  })
    .state('app.servers', {
      url: '/servers',
      views: {
        'menuContent': {
          templateUrl: 'profitGuruServer/chooseProfitGuruServer.html',
          controller: 'ServerSelectCntrlr'
        }
      }
    })
    .state('app.dbManagersAndTimeMachine', {
      url: '/dbManagersAndTimeMachine',
      views: {
        'menuContent': {
          templateUrl: 'demoAppTemplates/dbManagersAndTimeMachine.html',
          controller: 'dbManagersAndTimeMachine'
        }
      }
    })
    .state('app.chooseapptype', {
      url: '/chooseapptype',
      views: {
        'menuContent': {
          templateUrl: 'Login/ChooseAppType.html',
          controller: 'DemoLoginCntrlr'
        }
      }
    })
    .state('app.login', {
      url: '/login',
      views: {
        'menuContent': {
          templateUrl: 'Login/login.html',
          controller: 'AppCntrlr'
        }
      }
    }).state('app.notes', {
      url: '/notes',
      views: {
        'menuContent': {
          templateUrl: 'Notes/notes.html',
          controller: 'NotesCntrlr'
        }
      }
    }).state('app.items', {
      url: '/items',
      params: {
        receivingId: null
      },
      views: { //restaurantItems.html
        'menuContent': {
          templateUrl: 'Items/Items.html',
          // function () {
          //   if (APPCONFIG.appName == 'Retail') {
          //     return "Items/Items.html";
          //   } else if (APPCONFIG.appName == 'Restaurant') {
          //     return "Items/restaurantItems.html";
          //   } else
          //     return "Items/Items.html";
          // },
          controller: 'ItemsCntrlr'
        }
      }
    }).state('app.suppliers', {
      url: '/suppliers',
      views: {
        'menuContent': {
          templateUrl: 'Suppliers/Suppliers.html',
          controller: 'SuppliersCntrlr'
        }
      }
    }).state('app.customers', {
      url: '/customers',
      params: {
        from: null
      },
      views: {
        'menuContent': {
          templateUrl: 'Customers/Customers.html',
          controller: 'CustomersCntrlr'
        }
      }
    }).state('app.customerSetting', {
      url: '/customerSetting',
      params: {
        from: null
      },
      views: {
        'menuContent': {
          templateUrl: 'Customers/CustomerSetting.html',
          controller: 'CustomersCntrlr'
        }
      }
    }).state('app.permitted_modules', {
      cache: false,
      url: '/permitted_modules',
      views: {
        'menuContent': {
          templateUrl: 'Common/permitted_modules.html',
          controller: 'AppCntrlr'
        }
      }
    }).state('app.sales', {
      cache: false,
      url: '/sales',
      params: {
        'takeAway': null
      },
      views: {
        'menuContent': {
          templateUrl: 'Sales/Sales.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.salesSetting', {
      url: '/salesSetting',
      views: {
        'menuContent': {
          templateUrl: 'Sales/SalesSetting.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.salesreturns', {
      cache: false,
      url: '/salesreturns',
      views: {
        'menuContent': {
          templateUrl: 'SalesReturns/salesReturns.html',
          controller: 'SalesReturnsCntrlr'
        }
      }
    }).state('app.purchaseReturns', {
      cache: false,
      url: '/purchaseReturns',
      views: {
        'menuContent': {
          templateUrl: 'SalesReturns/salesReturns.html',
          controller: 'PurchaseReturnsCntrlr'
        }
      }
    }).state('app.employees', {
      url: '/employees',
      params: {
        from: null
      },
      views: {
        'menuContent': {
          templateUrl: 'Employees/Employees.html',
          controller: 'employeeCntrl'
        }
      }
    }).state('app.receivings', {
      url: '/receivings',
      views: {
        'menuContent': {
          templateUrl: 'Receivings/Receivings.html',
          controller: 'ReceivingsCntrlr'
        }
      }
    }).state('app.payments', {
      url: '/payments',
      views: {
        'menuContent': {
          templateUrl: 'Payments/home.html',
          controller: 'paymentsHome'
        }
      }
    }).state('app.paymentsView', {
      url: '/paymentsView',
      views: {
        'menuContent': {
          templateUrl: './dist/dist_js/app/templates/Payments/paymentsView.html',
          controller: 'PaymentCntrlr'
        }
      }
      //file:///C:/ProfitGuru/Retail/Terminal/profitGuruUpdater/installedServers/currentLive/profitGuruClient/resources/app/dist/dist_js/app/templates/Payments/paymentsView.html
    }).state('app.creditPayments', {
      url: '/creditPayments',
      views: {
        'menuContent': {
          templateUrl: 'Payments/creditPaymentsCart.html',
          controller: 'PaymentCntrlr'
        }
      }
    }).state('app.creditReceivableReport', {
      url: '/creditReceivableReport',
      views: {
        'menuContent': {
          templateUrl: './dist/dist_js/app/templates/Payments/creditReceivableReport.html',
          controller: 'creditReceivableReportCntrlr'
        }
      }
    }).state('app.creditReceivableReportByDate', {
      url: '/creditReceivableReportByDate',
      views: {
        'menuContent': {
          templateUrl: './dist/dist_js/app/templates/Payments/creditReceivableReport.html',
          controller: 'creditReceivableReportCntrlr'
        }
      }
    }).state('app.calulator', {
      url: '/calculator',
      views: {
        'menuContent': {
          templateUrl: 'Common/Calculator.html',
          controller: 'calculatorCntrlr'
        }
      }
    }).state('app.restaurantRefinment', {
      url: '/restaurantRefinment',
      views: {
        'menuContent': {
          templateUrl: 'restaurantRefinment/RestaurantRefinmentMain.html',
          controller: 'RestaurantRefinmentCntrlr'
        }
      }
    }).state('app.restaurant-reports', {
      url: '/restaurant-reports',
      views: {
        'menuContent': {
          templateUrl: 'restaurantRefinment/RestaurantReports.html',
          controller: 'restaurantReportsCntrlr'
        }
      }
    }).state('app.restaurantCart', {
      url: '/restaurantCart',
      views: {
        'menuContent': {
          templateUrl: 'Sales/cart.html',
          controller: 'TakeOrderCntrlr'
        }
      }
    })
    .state('app.takeAway', {
      url: '/TakeAway',
      params: {
        'takeAway': null
      },
      views: {
        'menuContent': {
          templateUrl: 'Sales/Sales.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.cartReceive', {
      url: '/cartReceive',
      views: {
        'menuContent': {
          templateUrl: 'Receivings/CartReceive.html',
          controller: 'ReceivingsCntrlr'
        }
      }
    }).state('app.reports', {
      url: '/reports',
      views: {
        'menuContent': {
          templateUrl: 'Report/Reports.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.reports.graph', {
      url: '/graph',
      views: {
        'graph': {
          templateUrl: 'Report/GraphReport.html',
          controller: 'GraphReportCtrl'
        }
      }
    }).state('app.reports.summary', {
      url: '/summary',
      views: {
        'summary': {
          templateUrl: 'Report/SummaryReport.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.reports.detailed', {
      url: '/detailed',
      views: {
        'detailed': {
          templateUrl: 'Report/DetailedReport.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.reports.inventory', {
      url: '/inventory',
      views: {
        'inventory': {
          templateUrl: 'Report/InventoryReport.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.reports.downloads', {
      url: '/downloads',
      views: {
        'downloads': {
          templateUrl: 'Report/reportDownloads.html',
          controller: 'reportsDownloadCtrl'
        }
      }
    }).state('app.reports.old_view', {
      url: '/old_view',
      views: {
        'old_view': {
          templateUrl: 'Report/Reports.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.abstractSales', {
      cache: false,
      url: '/abstractSales',
      params: {
        'takeAway': null
      },
      views: {
        'menuContent': {
          templateUrl: 'Sales/Sales.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.managesales', {
      url: '/managesales',
      views: {
        'menuContent': {
          templateUrl: 'Sales/manageSales.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.cart', {
      url: '/cart',
      views: {
        'menuContent': {
          templateUrl: 'Sales/cart.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.checkOut', {
      url: '/checkOut',
      views: {
        'menuContent': {
          templateUrl: 'Sales/checkOut.html',
          controller: 'SalesCntrlr'
        }
      }
    }).state('app.storeConfig', {
      url: '/storeConfig',
      params: {
        from: null
      },
      views: {
        'menuContent': {
          templateUrl: 'Settings/StoreConfig.html',
          controller: 'StoreconfigCntrlr'
        }
      }
    }).state('app.appSettingConfig', {
      url: '/appSettingConfig',
      views: {
        'menuContent': {
          templateUrl: 'AppSettingConfig/AppSettingConfig.html',
          controller: 'AppSettingConfigCntrlr'
        }
      }
    }).state('app.orderItems', {
      url: '/orderItems',
      views: {
        'menuContent': {
          templateUrl: 'PlaceOrder/orderItems.html',
          controller: 'PlaceOrder/OrderItemsCntrlr'
        }
      }
    }).state('app.ItemstoBordered', {
      url: '/ItemstoBordered',
      views: {
        'menuContent': {
          templateUrl: 'PlaceOrder/ItemstoBordered.html',
          controller: 'OrderItemsCntrlr'
        }
      }
    }) //fine 2
    .state('app.repgraph', {
      url: '/repgraph',
      views: {
        'menuContent': {
          templateUrl: 'Reports/repgraph.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.custrep', {
      url: '/custrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/customerReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.itemrep', {
      url: '/itemrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/itemreport.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.salerep', {
      url: '/salerep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/saleReport.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.suprep', {
      url: '/suprep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/supReport.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.catsumrep', {
      url: '/catsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/categorySummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.custsumrep', {
      url: '/custsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/CustomerSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.dissumrep', {
      url: '/dissumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/discountSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.empsumrep', {
      url: '/empsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/employeeSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.itemsumrep', {
      url: '/itemsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/itemsSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.paymentsumrep', {
      url: '/paymentsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/paymentSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.salesumrep', {
      url: '/salesumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/saleSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.suppliersumrep', {
      url: '/suppliersumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/suppliersSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.taxsumrep', {
      url: '/taxsumrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/taxesSummary.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.saledetailedrep', {
      url: '/saledetailedrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/saleDetailsReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.recdetailedrep', {
      url: '/recdetailedrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/ReceivingsDetailsReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.custdetailedrep', {
      url: '/custdetailedrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/CustomerDetailReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.disdetailedrep', {
      url: '/disdetailedrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/DiscountDetailReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.empdetailedrep', {
      url: '/empdetailedrep',
      views: {
        'menuContent': {
          templateUrl: 'Reports/EmployeeDetailReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.lowinventory', {
      url: '/lowinventory',
      views: {
        'menuContent': {
          templateUrl: 'Reports/lowInventoryReports.html',
          controller: 'ReportsCtrl'
        }
      }
    })
    .state('app.inventorysum', {
      url: '/inventorysum',
      views: {
        'menuContent': {
          templateUrl: 'Reports/InventorySummaryReports.html',
          controller: 'ReportsCtrl'
        }
      }
    }).state('app.gstrPage', {
      url: '/gstrPage',
      views: {
        'menuContent': {
          templateUrl: 'GSTReports/gstrPage.html',
          controller: 'gstrPage'
        }
      }
    })
    .state('app.gstReports', {
      url: '/gstReports',
      views: {
        'menuContent': {
          templateUrl: 'GSTReports/gstr1.html',
          controller: 'gstrCntrlr'
        }
      }
    }).state('app.gstReports2', {
      url: '/gstReports2',
      views: {
        'menuContent': {
          templateUrl: 'GSTReports/gstr2.html',
          controller: 'gstrCntrlr'
        }
      }
    }).state('app.promo', {
      url: '/promo',
      views: {
        'menuContent': {
          templateUrl: 'Promo/crm.html',
          controller: 'promoCntrlr'
        }
      }
    }).state('app.autoReporter', {
      url: '/autoReporter',
      views: {
        'menuContent': {
          templateUrl: 'AutoReporter/autoReporter.html',
          controller: 'autoReporter'
        }
      }
    }).state('app.loyalty', {
      url: '/loyalty',
      views: {
        'menuContent': {
          templateUrl: 'Loyalty/loyalty.html',
          controller: 'loyaltyCntrlr'
        }
      }
    }).state('app.campaign', {
      url: '/campaign',
      views: {
        'menuContent': {
          templateUrl: 'Promo/index.html',
          controller: 'promoCntrlr'
        }
      }
    }).state('app.crmTemplates', {
      url: '/crmTemplates',
      views: {
        'menuContent': {
          templateUrl: 'Promo/newCrmTemplates.html',
          controller: 'newCrmTemplateCntrls'
        }
      }
    }).state('app.pendingTemplates', {
      url: '/pendingTemplates',
      views: {
        'menuContent': {
          templateUrl: 'Promo/crmTemplates.html',
          controller: 'crmTemplatesCntrlr'
        }
      }
    }).state('app.visit', {
      url: '/visit',
      views: {
        'menuContent': {
          templateUrl: 'Promo/visits.html',
          controller: 'visitsCntrlr'
        }
      }
    }).state('app.allSchedule', {
      url: '/allSchedule',
      views: {
        'menuContent': {
          templateUrl: 'Promo/allSchedule.html',
          controller: 'allScheduleCntrlr'
        }
      }
    }).state('app.allWisher', {
      url: '/allWisher',
      views: {
        'menuContent': {
          templateUrl: 'Promo/allWisher.html',
          controller: 'allWisherCntrlr'
        }
      }
    }).state('app.allDNDCustomer', {
      url: '/allDNDCustomer',
      views: {
        'menuContent': {
          templateUrl: 'Promo/allDNDCustomer.html',
          controller: 'allDNDCntrlr'
        }
      }
    }).state('app.hotel', {
      url: '/hotel',
      views: {
        'menuContent': {
          templateUrl: 'Hotel/index.html',
          controller: 'hotelCntrlr'
        }
      }
    }).state('app.petrol', {
      url: '/petrol',
      views: {
        'menuContent': {
          templateUrl: 'Fuel/fuel.html',
          controller: 'FuelCntrlr'
        }
      }

    }).state('app.bom', {
      url: '/bom',
      views: {
        'menuContent': {
          templateUrl: 'Bom/bomMain.html',
          controller: 'bomCntrlr'
        }
      }
    }).state('app.createBom', {
      url: '/createBom',
      views: {
        'menuContent': {
          templateUrl: 'Bom/templates/createBom.html',
          controller: 'createBomCntrlr'
        }
      }
    }).state('app.productionPlanning', {
      url: '/productionPlanning',
      views: {
        'menuContent': {
          templateUrl: 'ProductionPlanning/templates/productionPlanning.html',
          controller: 'productionPlanningCntrlr'
        }
      }
    }).state('app.createProdPlan', {
      url: '/createProdPlan',
      views: {
        'menuContent': {
          templateUrl: 'ProductionPlanning/templates/createProdPlan.html',
          controller: 'createProdPlanCntrlr'
        }
      }
    }).state('app.productionPlanningDetails', {
      url: '/productionPlanningDetails',
      views: {
        'menuContent': {
          templateUrl: 'ProductionPlanning/templates/productionPlanningDetails.html',
          controller: 'productionPlanningDetailsCntrlr'
        }
      }
    }).state('app.updateStock', {
      url: '/updateStock',
      views: {
        'menuContent': {
          templateUrl: 'UpdateStock/templates/updateStockMain.html',
          controller: 'updateStockCntrlr'
        }
      }
    }).state('app.homeDelivery', {
      url: '/homeDelivery',
      views: {
        'menuContent': {
          templateUrl: 'HomeDelivery/homeDeliveryMain.html',
          controller: 'homeDeliveryCntrlr'
        }
      }
    }).state('app.homeDeliveryOrder', {
      url: '/homeDeliveryOrder',
      views: {
        'menuContent': {
          templateUrl: 'HomeDelivery/templates/homeDeliveryOrder.html',
          controller: 'homeDeliveryOrderCntrlr'
        }
      }
    }).state('app.homeDeliveryPayment', {
      url: '/homeDeliveryPayment',
      views: {
        'menuContent': {
          templateUrl: 'HomeDelivery/templates/homeDeliveryPayment.html',
          controller: 'homeDeliveryPaymentCntrlr'
        }
      }
    }).state('app.tally', {
      url: '/tally',
      views: {
        'menuContent': {
          templateUrl: 'Tally/tallyMain.html',
          controller: 'tallyMainCntrlr'
        }
      }
    }).state('app.tallySettings', {
      url: '/tallySettings',
      views: {
        'menuContent': {
          templateUrl: 'Tally/tallySettings.html',
          controller: 'tallyMainCntrlr'
        }
      }
    }).state('app.salesOrder', {
      url: '/salesOrder',
      views: {
        'menuContent': {
          templateUrl: 'salesOrder/salesOrderMain.html',
          controller: 'salesOrderCntrlr'
        }
      }
    })
    .state('app.expenses', {
      url: '/expenses',
      views: {
        'menuContent': {
          templateUrl: 'Expenses/expensesMain.html',
          controller: 'expensesCntrlr'
        }
      }
    }).state('app.salesQuotation', {
      url: '/salesQuotation',
      views: {
        'menuContent': {
          templateUrl: 'SalesQuotation/salesQuotationMain.html',
          controller: 'salesQuotationCntrlr'
        }
      }
    }).state('app.createExpenses', {
      url: '/createExpenses',
      views: {
        'menuContent': {
          templateUrl: 'Expenses/templates/createExpenses.html',
          controller: 'createExpensesCntrlr'
        }
      }
    }).state('app.expensesTransaction', {
      url: '/expensesTransaction',
      views: {
        'menuContent': {
          templateUrl: 'Expenses/templates/expensesTransaction.html',
          controller: 'expensesTransactionCntrlr'
        }
      }
    }).state('app.createExpensesCategory', {
      url: '/createExpensesCategory',
      views: {
        'menuContent': {
          templateUrl: 'Expenses/templates/createExpensesCategory.html',
          controller: 'createExpensesCategoryCntrlr'
        }
      }
    }).state('app.expensesReports', {
      url: '/expensesReports',
      views: {
        'menuContent': {
          templateUrl: 'Expenses/templates/expensesReports.html',
          controller: 'expensesReportsCntrlr'

        }
      }
    }).state('app.feedback-main', {
      url: '/feedback-main',
      views: {
        'menuContent': {
          templateUrl: 'Feedback/feedbackMainPage.html',
          controller: 'FeedbackCntrlr'
        }
      }
    }).state('app.feedback-form', {
      url: '/feedback-form',
      views: {
        'menuContent': {
          templateUrl: 'Feedback/feedbackgenerate.html',
          controller: 'FeedbackCntrlr'
        }
      }
    }).state('app.feedback-reports', {
      url: '/feedback-reports',
      views: {
        'menuContent': {
          templateUrl: 'Feedback/feedbackReports.html',
          controller: 'FeedbackCntrlr'
        }
      }
    }).state('app.ui-kit', {
      url: '/ui-kit',
      views: {
        'menuContent': {
          templateUrl: 'ui-kit/ui-kit.html',
          controller: 'AppCntrlr'
        }
      }
    }).state('app.alienSaleMapping', {
      url: '/alienSaleMapping',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienSaleMapping.html',
          controller: 'alienSaleMapping'
        }
      }
    }).state('app.alienSales', {
      url: '/alienSales',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienSales.html',
          controller: 'alienSales'
        }
      }
    }).state('app.purchaseOrders', {
      url: '/purchaseOrders',
      views: {
        'menuContent': {
          templateUrl: 'PurchaseOrder/purchaseOrders.html',
          controller: 'purchaseOrdersCtrlr'
        }
      }
    }).state('app.alienhuOrderDetails', {
      url: '/alienhuOrderDetails',
      views: {
        'menuContent': {
          templateUrl: 'PurchaseOrder/alienhuOrderDetails.html',
          controller: 'alienhuOrderDetailsCtrlr'
        }
      }
    }).state('app.alienhuDashboard', {
      url: '/alienhuDashboard',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuDashboard.html',
          controller: 'alienhuDashboardCtrlr'
        }
      }
    }).state('app.alienhuSalePending', {
      url: '/alienhuSalePending',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuSalePending.html',
          controller: 'alienhuSalePendingCtrlr'
        }
      }
    }).state('app.alienhuMarket', {
      url: '/alienhuMarket',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuMarket.html',
          controller: 'alienhuMarketCtrlr'
        }
      }
    }).state('app.alienActivities', {
      url: '/alienActivities',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuActivities.html',
          controller: 'alienActivitiesCtrlr'
        }
      }
    }).state('app.alienScans', {
      url: '/alienScans',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuScans.html',
          controller: 'alienScansCtrlr'
        }
      }
    }).state('app.alienPayments', {
      url: '/alienPayments',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuPayments.html',
          controller: 'alienPaymentsCtrlr'
        }
      }
    }).state('app.alienConnectQR', {
      url: '/alienConnectQR',
      views: {
        'menuContent': {
          templateUrl: 'Aliens/alienhuConnectQR.html',
          controller: 'alienhuConnectQRCtrlr'
        }
      }
    });

  console.log('app name = ' + APPCONFIG.appName);
  if (APPCONFIG.appName === 'combo') {
    $urlRouterProvider.otherwise('/app/chooseapptype');
  } else
    $urlRouterProvider.otherwise('/app/login');
});

angular.module('profitGuru').filter('unique', function () {
  return function (collection, keyname) {

    //http://stackoverflow.com/questions/15914658/how-to-make-ng-repeat-filter-out-duplicate-results
    var output = [],
      keys = [],
      keyCountMap = {};

    angular.forEach(collection, function (row) {
      var item = row[keyname];
      if (item === null || item === undefined) return;
      if (keys.indexOf(item) === -1) {
        keys.push(item);
        keyCountMap[item] = 1;
        // output.push(row);
      } else
        keyCountMap[item]++;
    });
    //}

    return keyCountMap;
  };
});

//Item Card Directive
angular.module('profitGuru').directive('itemInfoCard', function () {
  return {
    templateUrl: 'Items/ItemInfoCard.html',
    restrict: 'E'
  };
});

angular.module('profitGuru').directive('itemInfoCardNew', function () {
  return {
    templateUrl: 'Items/ItemInfoCardNew.html',
    restrict: 'E'
  };
});

angular.module('profitGuru').directive('itemCard', function () {
  return {
    templateUrl: 'Items/infoCard.html',
    restrict: 'E'
  };
});

angular.module('profitGuru').directive('itemInfoCardReceive', function () {
  return {
    templateUrl: 'Items/ItemInfoCardReceive.html',
    restrict: 'E'
  };
});

angular.module('profitGuru').directive('restaurantItemInfoCard', function () {
  return {
    templateUrl: 'Items/restaurantItemsInfocard.html',
    restrict: 'E'
  };
});


//supplier dircetive
angular.module('profitGuru').directive('supplierInfoCard', function () {
  return {
    templateUrl: 'Suppliers/supplierInfoCard.html',
    restrict: 'E'
  };
});

angular.module('profitGuru').directive('employeeInfoCard', function () {
  return {
    templateUrl: 'Employees/employeeInfocard.html',
    restrict: 'E'
  };
});
angular.module('profitGuru').directive('homedeliveryInfoCard', function () {
  return {
    templateUrl: 'HomeDelivery/homedeliveryInfoCard.html',
    restrict: 'E'
  };
});
angular.module('profitGuru').directive('configInfoCard', function () {
  return {
    templateUrl: 'Settings/configInfoCard.html',
    restrict: 'E'
  };
});
angular.module('profitGuru').directive('positiveNumbersOnly', function () {

  return {
    require: '?ngModel',
    link: function (scope, element, attrs, ngModelCtrl) {
      if (!ngModelCtrl) {
        return;
      }

      ngModelCtrl.$parsers.push(function (val) {
        if (angular.isUndefined(val) || val === null) {
          val = '';
        }
        val = val.toString();
        var clean = val.replace(/[^-0-9\.]/g, '');
        var negativeCheck = clean.split('-');
        var decimalCheck = clean.split('.');
        if (!angular.isUndefined(negativeCheck[1])) {
          negativeCheck[1] = negativeCheck[1].slice(0, negativeCheck[1].length);
          clean = negativeCheck[0] + '-' + negativeCheck[1];
          if (negativeCheck[0].length > 0) {
            clean = negativeCheck[0];
          }

        }

        if (!angular.isUndefined(decimalCheck[1])) {
          decimalCheck[1] = decimalCheck[1].slice(0, 2);
          clean = decimalCheck[0] + '.' + decimalCheck[1];
        }

        if (val !== clean) {
          ngModelCtrl.$setViewValue(clean);
          ngModelCtrl.$render();
        }
        return clean;
      });

      element.bind('keypress', function (event) {
        if (event.keyCode === 32) {
          event.preventDefault();
        }
      });
    }
  };
});

angular.module('profitGuru').directive('ionScroll', [
  '$timeout',
  '$controller',
  '$ionicBind',
  '$ionicConfig',
  function ($timeout, $controller, $ionicBind, $ionicConfig) {
    return {
      restrict: 'E',
      scope: true,
      controller: function () { },
      compile: function (element, attr) {
        element.addClass('scroll-view ionic-scroll');

        //We cannot transclude here because it breaks element.data() inheritance on compile
        var innerElement = jqLite('<div class="scroll"></div>');
        innerElement.append(element.contents());
        element.append(innerElement);

        var nativeScrolling = attr.overflowScroll !== "false" && (attr.overflowScroll === "true" || !$ionicConfig.scrolling.jsScrolling());

        return {
          pre: prelink
        };

        function prelink($scope, $element, $attr) {
          $ionicBind($scope, $attr, {
            direction: '@',
            paging: '@',
            $onScroll: '&onScroll',
            scroll: '@',
            scrollbarX: '@',
            scrollbarY: '@',
            zooming: '@',
            minZoom: '@',
            maxZoom: '@'
          });
          $scope.direction = $scope.direction || 'y';

          if (isDefined($attr.padding)) {
            $scope.$watch($attr.padding, function (newVal) {
              innerElement.toggleClass('padding', !!newVal);
            });
          }
          if ($scope.$eval($scope.paging) === true) {
            innerElement.addClass('scroll-paging');
          }

          if (!$scope.direction) {
            $scope.direction = 'y';
          }
          var isPaging = $scope.$eval($scope.paging) === true;

          if (nativeScrolling) {
            $element.addClass('overflow-scroll');
          }

          $element.addClass('scroll-' + $scope.direction);

          var scrollViewOptions = {
            el: $element[0],
            delegateHandle: $attr.delegateHandle,
            locking: ($attr.locking || 'true') === 'true',
            bouncing: $scope.$eval($attr.hasBouncing),
            paging: isPaging,
            scrollbarX: $scope.$eval($scope.scrollbarX) !== false,
            scrollbarY: $scope.$eval($scope.scrollbarY) !== false,
            scrollingX: $scope.direction.indexOf('x') >= 0,
            scrollingY: $scope.direction.indexOf('y') >= 0,
            zooming: $scope.$eval($scope.zooming) === true,
            maxZoom: $scope.$eval($scope.maxZoom) || 3,
            minZoom: $scope.$eval($scope.minZoom) || 0.5,
            preventDefault: true,
            nativeScrolling: nativeScrolling
          };

          if (isPaging) {
            scrollViewOptions.speedMultiplier = 0.8;
            scrollViewOptions.bouncing = false;
          }

          $controller('$ionicScroll', {
            $scope: $scope,
            scrollViewOptions: scrollViewOptions
          });
        }
      }
    };
  }
]);

angular.module('profitGuru').service('fileUpload', ['$http', function ($http) {
  this.uploadFileToUrl = function (file, uploadUrl) {
    var fd = new FormData();
    fd.append('file', file);

    $http.post(uploadUrl, fd, {
      transformRequest: angular.identity,
      headers: {
        'Content-Type': undefined
      }
    })

      .success(function (response) {
        console.log(response);
      })

      .error(function (error) {
        console.log(error);
      });

  };
}]);


angular.module('profitGuru').directive('autofocus', ['$document', function ($document) {
  return {
    link: function ($scope, $element, attrs) {
      setTimeout(function () {
        $element[0].focus();
      }, 100);
    }
  };
}]);



angular.module('profitGuru').directive('fileReader', function () {
  return {
    scope: {
      fileReader: "="
    },
    link: function (scope, element) {
      $(element).on('change', function (changeEvent) {
        var files = changeEvent.target.files;
        if (files.length) {
          var r = new FileReader();
          r.onload = function (e) {
            var contents = e.target.result;
            scope.$apply(function () {
              scope.fileReader = contents;
            });
          };

          r.readAsText(files[0]);
        }
      });
    }
  };
});