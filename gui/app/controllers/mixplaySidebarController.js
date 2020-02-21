"use strict";
(function() {
    angular
        .module("firebotApp")
        .controller("mixplaySidebarController", function($scope, backendCommunicator) {
            $scope.sidebarSettings = {
                enabled: true,
                streamSchedule: {
                    enabled: true,
                    utcOffest: -6, //streamers utc offset, moment().utcOffset() / 60;
                    days: {
                        monday: {
                            type: "defined", //defined vs custom
                            start: {
                                hour: 19, // 0-23
                                minutes: 30 // 0-59
                            },
                            end: {
                                hour: 23,
                                minutes: 0
                            }
                        }
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
                    });
            };
            $scope.getSettings();

            $scope.saveSettings = () => {
                backendCommunicator.fireEvent("sidebar-settings-update", $scope.sidebarSettings);
            };

            $scope.getWeekly;

        });
}());
