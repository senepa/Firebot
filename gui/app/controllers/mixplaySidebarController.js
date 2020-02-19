"use strict";
(function() {
    angular
        .module("firebotApp")
        .controller("mixplaySidebarController", function($scope, backendCommunicator) {
            $scope.sidebarSettings = {
                enabled: true,
                streamSchedule: {
                    enabled: true,
                    weekly: {
                        monday: {
                            timeType: "specific", //"specific" or "custom"
                            startTime: "", //json date time, we will just always ignore the date part
                            endTime: "", //json date time, we will just always ignore the date part
                            customTime: "", //ie "Afternoon"
                            description: "" //ie "MMO Mondays", "Viewer Game Day", etc
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
