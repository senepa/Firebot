"use strict";

(function () {

    angular
        .module("firebotApp")
        .factory("giveawayService", function ($q, logger, backendCommunicator) {
            let service = {};

            service.giveaways = [];

            service.loadGiveaways = () => {
                $q.when(backendCommunicator.fireEventAsync("get-giveaways"))
                    .then(giveaways => {
                        if (giveaways) {
                            service.giveaways = giveaways;
                        }
                    });
            };

            backendCommunicator.on("giveaway-settings-updated", (giveaways) => {
                if (giveaways) {
                    service.giveaways = giveaways;
                }
            });

            service.saveGiveaway = (giveaway) => {
                const index = service.giveaways.findIndex(g => g.id === giveaway.id);
                if (index < 0) return;
                service.giveaways[index] = giveaway;

                backendCommunicator.fireEvent("giveaway-settings-update", {
                    giveawayId: giveaway.id,
                    activeStatus: giveaway.active,
                    settingCategories: giveaway.settingCategories
                });
            };

            service.resetGiveawayToDefault = giveawayId => {
                backendCommunicator.fireEvent("reset-giveaway-to-defaults", giveawayId);
            };

            return service;
        });
}());
