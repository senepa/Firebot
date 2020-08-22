"use strict";

const giveawayManager = require("./giveaway-manager");

exports.loadGiveaways = () => {
    giveawayManager.registerGiveaway(require("./builtin/bid/bid"));
    giveawayManager.registerGiveaway(require("./builtin/raffle/raffle"));
};