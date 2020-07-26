/* Copyright (C) AliennHu Pvt Ltd - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Ganesh Mogare, July 2015
 */
angular.module('profitGuru')
    .service('profitGuruSocktServr', ['$rootScope', 'configDataSvc', 'APPCONFIG', '$http', '$state', function ($rootScope, configDataSvc, APPCONFIG, $http, $state) {
        var _self = this;
        var bTerminalUpdateEnabled = false;

        this.isTerminalUpdateEnabled = function () {
            return bTerminalUpdateEnabled;
        };

        //After configuring the profitGuruServer connect to Socket.io server
        //test commmit
        $rootScope.$on('profitGuruServerInitDone', connect2SocketServer);

        function connect2SocketServer(event, profitGuruServerDetails) {
            if (APPCONFIG.appName !== 'cloud') {
                var profitGuruServerUrl = profitGuruServerDetails.profitGuruServerUrl;
                _self.socketServer = io.connect(profitGuruServerDetails.profitGuruServerUrl);

                _self.socketServer.on('connect', function () {
                    void 0;
                    $rootScope.$emit('profitGuruSocktServr_Connctd');
                    //comment by sai
                    //previously here go to login page was there. deepak removed it
                    //may be because it is in login page and again it is going to login page from here
                });

                if (!_self.terminalSocketServer) {
                    _self.connect2TerminalSocketServer();
                }
            }
        }

        this.connect2TerminalSocketServer = function () {
            if (APPCONFIG.appName !== 'cloud') {
                if (configDataSvc.isTerminalProfitGuru()) {
                    $http.get(APPCONFIG.terminalServer + '/profitGuruUpdate/isSelfUpdateEnabled').then(function (resp) {
                        bTerminalUpdateEnabled = resp.data.bSelfUpdate;
                        _self.terminalSocketServer = io.connect(APPCONFIG.terminalServer);
                        _self.terminalSocketServer.on('connect', function () {
                            void 0;
                           // $rootScope.$emit('terminalProfitGuruSocktServr_Connctd');
                        });
                    }).catch(function (err) {
                        void 0;
                    });
                }
            }
        }

    }]);
