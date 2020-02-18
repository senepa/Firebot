"use strict";
(function() {
    angular
        .module("firebotApp")
        .controller("mixplaySidebarController", function($scope, backendCommunicator) {
            $scope.sidebarSettings = {
                enabled: true,
                streamSchedule: {
                    enabled: true
                },
                streamRules: {
                    enabled: true
                }
            };

            $scope.getSettings = () => {
                backendCommunicator.fireEventAsync("get-sidebar-settings")
                    .then(settings => {
                        debugger;
                        $scope.sidebarSettings = settings;
                    });
            };
            $scope.getSettings();

            $scope.saveSettings = () => {
                backendCommunicator.fireEvent("sidebar-settings-update", $scope.sidebarSettings);
            };

        });
}());
