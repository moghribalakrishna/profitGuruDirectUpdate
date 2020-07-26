/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */
(function () {
  'use strict';
  angular.module('profitGuru').controller('ServerSelectCntrlr', ['$scope', '$rootScope', '$ionicPopover', 'profitGuruServerSvc', 'profitGuruPouchSvc', 'configDataSvc', 'APPCONFIG', 'loginServerApis', ServerSelectCntrlr]);

  function ServerSelectCntrlr($scope, $rootScope, $ionicPopover, profitGuruServerSvc, profitGuruPouchSvc, configDataSvc, APPCONFIG, loginServerApis) {
    profitGuruServerSvc.profitGuruServersCommonFunctions($scope, loginServerApis);
    $scope.$on('$ionicView.enter', function () {
      $rootScope.appType = APPCONFIG.appName;
      if ($rootScope.profitGuruServerList === 0)
        alert('no Terminal Server tp select');
    });
    $rootScope.isAppRunOnCloud = configDataSvc.isAppRunOnCloud();
    $scope.selectThisProfitGuruServer = function (profitGuruServer) {
      //      $rootScope.systemIp = 'http://' + server.ip + ':4080';
      var serverIp = profitGuruServer.serverIp;
      var appName = profitGuruServer.appName;
      var selectServerParams = {
        "serverIp": serverIp,
        "appName": 'tito_retail',
        "port": profitGuruServer.port
      };
      $rootScope.$emit('onProfitGuruServerSelect', selectServerParams);
    };
    // $ionicPopover
    //   .fromTemplateUrl('profitGuruServer/serversPopover.html', {
    //     scope: $scope
    //   })
    //   .then(function (popover) {
    //     $scope.popover = popover;
    //   });

    $rootScope.cloudConnection = false;
	      function getAllLocalIPS () {
            var os = require('os');
            var ifaces = os.networkInterfaces();
            var allIPs = [];
            Object.keys(ifaces).forEach(function (ifname) {
                var alias = 0;

                ifaces[ifname].forEach(function (iface) {
                    if ('IPv4' !== iface.family || iface.internal !== false) {
                        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                        return;
                    }
                    if (alias >= 1) {
                        // this single interface has multiple ipv4 addresses
                        console.log(ifname + ':' + alias, iface.address);
                    } else {
                        // this interface has only one ipv4 adress
                        console.log(ifname, iface.address);

                    }
                    allIPs.push({ ip: iface.address, mac: iface.mac });
                    ++alias;
                });
                console.log(allIPs);
            });
            return allIPs;
        }
// This isn't working as fix		
	//iterateAllIpsInLocalNetwork();
	
        function iterateAllIpsInLocalNetwork() {
            var baseIPCounter = {};
            if (!configDataSvc.isAppRunOnMobileDevice()) {
                let ips = getAllLocalIPS();
                for (var i = 0; i < ips.length; i++) {
                    var ip = ips[i].ip;
                    loop0to255(ip, baseIPCounter)
                }
            } else {
                try {
                    // let ip = await networkinterface.getIPAddress();
                    networkinterface.getIPAddress(function (ip, error) {
                        loop0to255(ip, baseIPCounter)
                    });

                } catch (e) {
                    console.log(e);
                }
            }

        }
		
		
        function loop0to255(ip, baseIPCounter) {
            if (true) {
                var ipSegments = ip.split('.');
                var baseIp = ipSegments[0] + '.' + ipSegments[1] + '.' + ipSegments[2];
                if (!baseIPCounter[baseIp]) {
                    baseIPCounter[baseIp] = 1;
                } else {
                    baseIPCounter[baseIp]++;
                    return;
                }
                for (var machineCount = 1; machineCount < 255; machineCount++) {
                    // for (var app in APPCONFIG.PORT) {
                    var appPort = APPCONFIG.PORT[APPCONFIG.appName];

                    var serverIp = baseIp + '.' + machineCount + ':' + appPort;
                    pingAndGetServerDetails(serverIp);
                    // }
                }

            }
        }
		
		
		
		 function pingAndGetServerDetails(serverIp) {
            var profitGuruServerUrl = 'http://' + serverIp;
            var url = profitGuruServerUrl + "/licence/pingtestApi?time=" + new Date().getTime();
            $http.get(url, {
                timeout: 10000
            }).then(function (response) {
                var response = response.data;
                if (response && response.name && response.serverId && response.appType === APPCONFIG.appName && !_self.profitGuruLocalServerList4MAPP[response.serverId]) {
                    _self.profitGuruLocalServerList4MAPP[response.serverId] = {
                        name: response.name,
                        port: response.port,
                        server: response.server,
                        hostName: response.hostname,
                        serverIp: response.serverIp,
                        profitGuruServerUrl: 'http://' + response.serverIp + ':' + response.port,
                        serverId: response.serverId,
                        appName: response.appType,
                        locationName: response.locationName
                    };
                    if (!configDataSvc.isTerminalProfitGuru()) {
                        showLicencedServers();
                    } else {
                        $rootScope.isProfitGuruServerAvailable = true;
                        _self.profitGuruServerList.push(_self.profitGuruLocalServerList4MAPP[response.serverId]);
                        $rootScope.profitGuruServerList.push(_self.profitGuruLocalServerList4MAPP[response.serverId])

                    }
                }

            }).catch(function (reason) {

            });
        }


  }
})();
