"use strict";
(function() {

    const moment = require("moment");

    /*
   {
       streaming: true,
       times: [ // array to support multiple streams in one day (ie morning and night streams) in the future
           {
                start: {
                    type: "specific", //specific vs custom
                    hour: 19, // 0-23
                    minutes: 30 // 0-59
                },
                end: {
                    type: "specific",
                    hour: 23,
                    minutes: 0
                },
                description: "MMO Mondays"
            }
        ]
   }
   */

    //how to calc viewer time dif with streamer utc offset: x-(y), where x is viewer utc offset and y is streamer utc offset

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

            $scope.days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

            $scope.getStreamTimeForDay = function(dayName) {
                // todo: implement
                return "";
            };

            $scope.getStreamDescriptionForDay = function(dayName) {
                // todo: implement
                return "";
            };

        });
}());
