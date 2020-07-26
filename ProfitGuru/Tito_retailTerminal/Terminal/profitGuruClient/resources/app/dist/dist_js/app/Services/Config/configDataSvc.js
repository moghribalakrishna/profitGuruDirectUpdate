/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */
angular.module('profitGuru')
	.service('configDataSvc', ['$state', '$q', '$http', 'APPCONFIG', '$rootScope', '$timeout', 'utilsSvc', '$injector', function ($state, $q, $http, APPCONFIG, $rootScope, $timeout, utilsSvc, $injector) {

		$rootScope.ACCESS_TYPE = {
			ONSITE: 0,
			OFFSITE: 1,
			ONLINE: 2
		};

		$rootScope.STATE = {
			CREATE: 0,
			EDIT: 1,
			VIEW: 2
		};

		var _self = this;

		var APP_TYPE;
		var UI_THEME_TYPE;

		this.isAppRunOnNW = function () {
			return (APPCONFIG.runEnvironment === 'nodeWebKit' || APPCONFIG.runEnvironment === 'electron');
		};


		this.setAppType = function (appType, bSetTheme) {
			APP_TYPE = appType;
			if (bSetTheme) {
				_self.setAppTypeForUI(appType);
			}
		}

		this.getAppType = function () {
			return APP_TYPE;
		}

		this.getAppTypeForUI = function () {
			return UI_THEME_TYPE;
		}

		this.setAppTypeForUI = function (appType) {
			UI_THEME_TYPE = appType;
		}

		this.getAppNameFull = function () {
			var t_appName = _self.appName;

			if (!t_appName) {
				t_appName = APPCONFIG.appName;
			} else {
				t_appName = _self.appName;
			}
			return t_appName;
		}

		this.getAppName = function () {
			var t_appName = _self.appName;

			if (!t_appName) {
				t_appName = APPCONFIG.appName;
			} else {
				t_appName = _self.appName;
			}

			if (t_appName.indexOf('tito') > -1) {
				t_appName = t_appName.split('_')[1];
				return t_appName;
			};
			return t_appName;
		}

		var getStoreDocFile = function (dirPath) {
			if (dirPath[dirPath.length - 1] !== '/') {
				dirPath += '/';
			}
			return dirPath + "reginfo_" + APPCONFIG.appName + ".json";
		}


		var loadRegInfoFile = function () {
			if (!_self.isAppRunOnNW()) {
				return;
			}

			var fullFilePath = getStoreDocFile(APPCONFIG.storeDocPath);
			try {
				var fs = require('fs');
				var buffer = fs.readFileSync(fullFilePath);
				storeRegistrationDoc = JSON.parse(buffer);
				
			} catch (error) {
				//failed to load file
			}
		}

		loadRegInfoFile();

		_self.getStoreRegistrationDoc = function () {
			return storeRegistrationDoc;
		}

		_self.goToLoginOrRegistration = function () {
			$state.go('app.storeRegistration');
		}
		_self.checkForRegistrationFile = function () {
			$state.go('app.storeRegistration');
		}

		_self.initProfitGuruRestAPIs = function () {
			return getprofitGuruCoreData().then(function (resp) {
				void 0;
				$state.go('app.login');
			}).catch(function (err) {
				void 0;
			});
		}

		var profiGuruConfigDone = false;
		this.appName = APPCONFIG.appName;
		this.serverConfig = "";
		var connectionType = $rootScope.ACCESS_TYPE.ONSITE;
		var selectedOffSiteServer;

		var profitGuruLock = {
			status: false,
			reason: ''
		};

		this.getProfitGuruLockStatus = function () {
			return profitGuruLock;
		};

		this.setProfitGuruLockStatus = function (lockStatus) {
			profitGuruLock = lockStatus;
		};

		var serverHost;
		var restApisAndServerConfig, profitGuruElements, profitGuruProfiles;
		var mobileDeviceDetails;
		var myStoredprofitGuruServerInfo;

		//For aboutMe page
		$rootScope.aboutMe = APPCONFIG;

		initConfigDataSvc();

		this.isOffSiteAccess = function () {
			return connectionType === $rootScope.ACCESS_TYPE.OFFSITE;
		};

		this.getStoreDBContext = function () {
			try {
				return _self.restApisAndServerConfig.serverConfig.dbContext;
			} catch (err) {
				void 0;
				throw 'DB Context not found';
			}
		}

		this.isOnSiteAccess = function () {
			return connectionType === $rootScope.ACCESS_TYPE.ONSITE;
		};

		this.isNotOnSiteAccess = function () {
			return connectionType !== $rootScope.ACCESS_TYPE.ONSITE;
		};

		this.isOnlineAccess = function () {
			return connectionType === $rootScope.ACCESS_TYPE.ONLINE;
		};

		this.bringOffsiteApp2Live = function () {
			connectionType = $rootScope.ACCESS_TYPE.ONSITE;
		};

		this.isOffSiteServerGoingLive = function () {
			return connectionType === $rootScope.ACCESS_TYPE.ONSITE;
		};

		this.isThisCurrentOffSiteServer = function (serverId, appName) {
			if (selectedOffSiteServer) {
				return selectedOffSiteServer.serverInfo.serverSerilaNumber === serverId && selectedOffSiteServer.serverInfo.appName === appName;
			} else {
				return false;
			}
		};

		this.setConnectionType = function (_type) {
			connectionType = _type;
		};

		this.setOffSiteServerDetails = function (selectedOffSiteServerParam) {
			selectedOffSiteServer = selectedOffSiteServerParam;
		};
		this.getOffSiteServerDetails = function (selectedOffSiteServerParam) {
			return selectedOffSiteServer;
		};

		this.switch2Home = function () {

			if (APPCONFIG.appRunLocation == 'cloud' || APPCONFIG.appName === 'combo') {
				return $state.go('app.chooseapptype');
			} else
				return $state.go('app.login');
		};

		function initConfigDataSvc() {
			$rootScope.disableRestApiIonicLoading = false;
			$rootScope.$on('profitGuruServerInitDone', saveServerInitData);
		}

		this.amIHostedMAPP = function () {
			var url = window.location.href;
			return url.indexOf('mobileApp') >= 0;
		}

		this.getProfitGuruServerIp = function () {
			return myStoredprofitGuruServerInfo ? myStoredprofitGuruServerInfo.serverIp : undefined;
		};

		var storeRegistrationDoc;
		this.saveStoreRegistrationFile = function (storeRegistrationDoc) {
			var fullFilePath = getStoreDocFile(APPCONFIG.storeDocPath);
			_self.setStoreRegistrationDoc(storeRegistrationDoc);

			if (!_self.isAppRunOnNW()) {
				return;
			}

			try {
				var fs = require('fs');
				fs.writeFileSync(fullFilePath, JSON.stringify(storeRegistrationDoc));
			} catch (error) {
				console,log(error);//file save failed
			}
		}

		this.setStoreRegistrationDoc = function (registrationDoc) {
			storeRegistrationDoc = registrationDoc;
		}

		this.getProfitGuruServerUrl = function () {
			return myStoredprofitGuruServerInfo ? myStoredprofitGuruServerInfo.profitGuruServerUrl : undefined;
		};

		this.getRecentProfitGuruServerInfo = function () {
			return myStoredprofitGuruServerInfo;
		};

		this.isDemoApp = function () {
			return APPCONFIG.appName == 'combo' || APPCONFIG.appName == 'cloud' || APPCONFIG.appRunLocation == 'cloud';
		};
		this.isAppDevRunWithIonic = function () {
			return APPCONFIG.runEnvironment === 'ionic';
		};

		this.isAppRunOnMobileDevice = function () {
			return APPCONFIG.runEnvironment === 'mobileDevice';
		};

		this.isAppRunOnCloud = function () {
			return APPCONFIG.runEnvironment === 'cloud' || APPCONFIG.appName === 'cloud';
		};

		//for localServer, the flow is different, we don't have app.servers page, it will be handled in login page itself
		this.doSerach4LocalProfitGuruServers = function () {
			return ((_self.isTerminalProfitGuru() || _self.isAppRunOnMobileDevice()) && APPCONFIG.runEnvironment !== 'cloud' && APPCONFIG.appName !== 'cloud' && !_self.isLocalServer())
		};

		this.isValidAppType = function (appName) {
			return ['retail', 'restaurant', 'lodging', 'petrolbunk', 'crm', 'connect', 'tito_retail', 'tito_restaurant'].indexOf(appName) >= 0;
		};

		this.isTerminalProfitGuru = function () {
			return APPCONFIG.isTerminal === true;
		};

		this.isTerminalAPP = function () {
			return (APPCONFIG.isTerminal && !this.isOnHostProfitGuruClient() && !this.isAppRunOnMobileDevice())
		}

		this.isLocalServer = function () {
			return APPCONFIG.bLocalServer;
		};

		this.isProfitGuruServerConfigDone = function () {
			return _self.profiGuruConfigDone;
		}

		function isNonDemoNonTerminalDAPP() {
			return !_self.isDemoApp() && !_self.isTerminalProfitGuru();
		}

		function isOnHostNonDemoProfitGuruServerApp() {
			return !_self.isDemoApp() && !_self.isTerminalProfitGuru() && !_self.isAppRunOnMobileDevice();
		}

		function isOnHostDemoProfitGuruServerApp() {
			return _self.isDemoApp() && !_self.isTerminalProfitGuru() && !_self.isAppRunOnMobileDevice();
		}


		this.isOnHostProfitGuruClient = function () {
			return (_self.isTerminalProfitGuru() && _self.isLocalServer()) || (!_self.isTerminalProfitGuru() && !_self.isAppRunOnMobileDevice());
		};

		this.isNonHostProfitGuruClient = function () {
			return (_self.isTerminalProfitGuru() && !_self.isLocalServer()) || _self.isAppRunOnMobileDevice();
		};

		this.isAppRunWithIonic = function () {
			return APPCONFIG.server === "";
		};

		this.listen2DBChangeEvents = function () {
			return _self.isDemoApp() || _self.isTITO(); // || isMultiChainApp
		};

		function setServerHost4RestApis(profitGuruServer, app) {
			_self.serverHost = profitGuruServer;
			var inDbServerString;
			for (var module in _self.restApisAndServerConfig.apis) {
				if (!utilsSvc.isObject(_self.restApisAndServerConfig.apis[module])) {
					continue;
				}
				for (var api in _self.restApisAndServerConfig.apis[module]) {
					var newUrl = _self.restApisAndServerConfig.apis[module][api].replace('http://localhost:3000', _self.serverHost);
					_self.restApisAndServerConfig.apis[module][api] = newUrl;
				}
			}
		}

		this.setAppName = function (app) {
			_self.appName = app;
		};


		this.isTITO = function () {
			var t_appName = _self.appName;

			if (!t_appName) {
				t_appName = APPCONFIG.appName;
			} else {
				t_appName = _self.appName;
			}

			if (t_appName.indexOf('tito') > -1) {
				return true;
			};

			return false;
		};

		this.from = function (api) {
			if (!_self.isOnSiteAccess()) {
				return 'http://localhost:3000' + api;
			}
			//For terminal and Mobile apps we can check the server connection here and update
			//Icon on UI saying they are not connected to the internet and parllely we can start interval
			//thread to update this variable for connection
			if (profitGuruLock.status) {
				utilsSvc.showLoading({
					template: '<p>' + profitGuruLock.reason + '</p><ion-spinner icon="spiral"></ion-spinner>'
				});
			} else {
				if (_self.serverHost) {
					reconnectionCount = 0;
					var moduleAndApi = api.split('/');
					if (_self.restApisAndServerConfig) {
						//console.log('Calling RestApi:', _self.restApisAndServerConfig.apis[moduleAndApi[0]][moduleAndApi[1]]);
						return _self.restApisAndServerConfig.apis[moduleAndApi[0]][moduleAndApi[1]];
					} else {
						if (myStoredprofitGuruServerInfo) {
							saveServerInitData(undefined, myStoredprofitGuruServerInfo);
						} else {
							//console.log('Cant load ProfitGuru Core Data as, No profitGuruServer Info  ');
						}
					}
				} else {
					_self.reconnecProfitGuruServer();
				}
			}
		};

		this.getProfitGuruElement = function (element) {
			return _self.profitGuruElements[element];
		};

		this.getProfitGuruProfile = function () {
			return _self.profitGuruProfiles;
		}

		var reconnectionCount = 0;

		this.reconnecProfitGuruServer = function () {
			//$rootScope.message = 'Please wait trying to connect to server...'
			$timeout(function () {
				$rootScope.$emit('serverUnreachable');
			}, 1000 * 60);
			//$rootScope.message = msg;
			// var confirmPopup = $ionicPopup.confirm({
			// 	title: 'ERROR',
			// 	scope: $rootScope,
			// 	template: msg
			// });

			// confirmPopup.then(function (res) {
			// 	if (res && reconnectionCount < 5) {
			// 		$rootScope.$emit('reconnectProfitGuruServer');
			// 		reconnectionCount++;
			// 	} else if (res && reconnectionCount >= 5) {
			// 		var maxReconnectionMsg = 'Sorry, Cant Connect ProfitGuruServer, Max Retry Done!! Please Restart';
			// 		var maxReconnectionConfirmPopup = $ionicPopup.confirm({
			// 			title: 'ERROR',
			// 			scope: $rootScope,
			// 			template: maxReconnectionMsg
			// 		});

			// 		maxReconnectionConfirmPopup.then(function (res) {
			// 			//console.log(maxReconnectionMsg);

			// 			if (_self.doSerach4LocalProfitGuruServers()) {
			// 				$state.go('app.servers');
			// 			}
			// 		});
			// 	} else {

			// 		if (_self.doSerach4LocalProfitGuruServers()) {
			// 			$state.go('app.servers');
			// 		}
			// 	}

			// });
		}

		function publish_initPouchSvc(appName, serverIp, port) {
			var profitGuruServerParams;
			profitGuruServerParams = _self.restApisAndServerConfig.serverConfig;
			profitGuruServerParams.appName = appName;
			profitGuruServerParams.serverIp = serverIp;
			profitGuruServerParams.port = port;
			profitGuruServerParams.profitGuruServerUrl = myStoredprofitGuruServerInfo.profitGuruServerUrl;
			$rootScope.$emit('initPouchSvc', profitGuruServerParams);
			_self.profiGuruConfigDone = true;

		}

		$rootScope.$on('storeSelected', function (event, data) {
			return getProfitGuruElements(profitGuruServerUrl, _self.appName);
		});

		var profitGuruServerUrl;

		function saveServerInitData(event, profitGuruServerInfo) {

			myStoredprofitGuruServerInfo = profitGuruServerInfo;
			profitGuruServerUrl = profitGuruServerInfo.profitGuruServerUrl;
			_self.appName = profitGuruServerInfo.appName;
			if (event && event.name === 'profitGuruServerInitDone')
				_self.checkForRegistrationFile();
		}

		function getprofitGuruCoreData() {
			return getprofitGuruRestApis(profitGuruServerUrl, _self.appName).then(function () {
				//#TITO blocker
				// 
			}).then(function (response) {
				$rootScope.isProfitGuruServerAvailable = true;
				publish_initPouchSvc(_self.appName, myStoredprofitGuruServerInfo.serverIp, myStoredprofitGuruServerInfo.port);
			}).catch(function (reason) {

				_self.reconnecProfitGuruServer();
			});

		}

		this.getConfigDataToStore4OffSiteApp = function () {

			return {
				restApis: _self.restApisAndServerConfig,
				elementsData: _self.profitGuruElements
			};
		};

		this.loadOffSiteAppStoredConfig = function () {
			var storedConfigData = selectedOffSiteServer.coreData;

			_self.restApisAndServerConfig = storedConfigData.restApis;
			//TODO BK set setServerHost4RestApis when we find this live server i.e. by serverID
			//and PopUp the user saying that he is connected to serer and make all the 
			//operations

			//	_self.setServerHost4RestApis(serverUrl, appName);
			_self.profitGuruElements = storedConfigData.elementsData;
		}

		function getProfitGuruElements(serverParam, appName) {

			var defered = $q.defer();

			$http.get(serverParam + '/core/profitGuruElements', {
				params: {
					"appName": appName
				}
			}).then(function (PGElementsResponse) {
				//console.log(PGElementsResponse);
				_self.profitGuruElements = PGElementsResponse.data;
				defered.resolve(true);
			}).catch(function (err) {
				//console.log('could not read/set ProfitGuruElements JSON', err);
				defered.reject(err);
			});

			return defered.promise;
		}

		// function getProfitGuruProfiles(serverUrl, appName) {

		// 	var defered = $q.defer();

		// 	$http.get(serverUrl + '/core/profitGuruProfiles', {
		// 		params: {
		// 			"appName": appName
		// 		}
		// 	}).then(function (PGElementsResponse) {
		// 		//console.log(PGElementsResponse);
		// 		_self.profitGuruProfiles = PGElementsResponse.data;
		// 		defered.resolve(true);
		// 	}).catch(function (err) {
		// 		//console.log('could not read/set profitGuruProfiles JSON', err);
		// 		defered.reject(err);
		// 	});

		// 	return defered.promise;
		// }

		function getprofitGuruRestApis(serverUrl, appName) {
			var defered = $q.defer();
			//hack.. processServerList was getting called while this was processing
			//eliminate event based programming they are async
			$rootScope.bGetRestApiInvoked = true;
			$http.get(serverUrl + '/core/profitGuruRestApis', {
				params: {
					"appName": appName,
					storeRegistrationId: _self.getStoreRegistrationDoc()._id
				}
			}).then(function (restApis) {
				$rootScope.bGetRestApiInvoked = false;
				//console.log(restApis);
				_self.restApisAndServerConfig = restApis.data;
				setServerHost4RestApis(serverUrl, appName);
				// _self.goToLoginOrRegistration();
				$state.go('app.login');
				defered.resolve(true);

			}).catch(function (err) {
				$rootScope.bGetRestApiInvoked = false;
				//console.log('could not read/set RestApis JSON', err);
				defered.reject(err);
			});
			return defered.promise;
		}

	}]);
