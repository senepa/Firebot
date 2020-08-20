"use strict";

(function () {
    angular
        .module("firebotApp")
        .controller("giveawaysController", function ($scope, giveawaysService, utilityService) {
            $scope.giveawaysService = giveawaysService;

            $scope.openEditGiveawaySettingsModal = function (giveaway) {
                utilityService.showModal({
                    component: "editGiveawaySettingsModal",
                    windowClass: "no-padding-modal",
                    resolveObj: {
                        giveaway: () => giveaway
                    },
                    closeCallback: resp => {
                        const action = resp.action;

                        if (action === 'save') {
                            const updatedGiveaway = resp.giveaway;
                            if (updatedGiveaway == null) return;
                            giveawaysService.saveGiveaway(updatedGiveaway);
                        }

                        if (action === 'reset') {
                            giveawaysService.resetGiveawayToDefault(resp.giveawayId);
                        }
                    }
                });
            };
        });
}());
