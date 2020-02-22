"use strict";
(function() {

    const moment = require("moment");

    /*
        type: "defined", //defined vs custom
        start: {
            hour: 19, // 0-23
            minutes: 30 // 0-59
        },
        end: {
            hour: 23,
            minutes: 0
        }
    */

    angular
        .module("firebotApp")
        .controller("mixplaySidebarController", function($scope, backendCommunicator) {
            $scope.sidebarSettings = {
                enabled: true,
                streamSchedule: {
                    enabled: true,
                    utcOffest: moment().utcOffset() / 60,
                    days: {
                        monday: null,
                        tuesday: null,
                        wednesday: null,
                        thursday: null,
                        friday: null,
                        saturday: null,
                        sunday: null
                    }
                },
                streamRules: {
                    enabled: true
                }
            };

            $scope.getSettings = () => {
                backendCommunicator.fireEventAsync("get-sidebar-settings")
                    .then(settings => {
                        $scope.sidebarSettings = settings;
                        if ($scope.sidebarSettings && $scope.sidebarSettings.streamSchedule
                            && $scope.sidebarSettings.streamSchedule.utcOffest === undefined) {
                            $scope.sidebarSettings.streamSchedule.utcOffest = moment().utcOffset() / 60;
                            $scope.saveSettings();
                        }
                    });
            };
            $scope.getSettings();

            $scope.saveSettings = () => {
                backendCommunicator.fireEvent("sidebar-settings-update", $scope.sidebarSettings);
            };

            $scope.getWeekly;

        });
}());
