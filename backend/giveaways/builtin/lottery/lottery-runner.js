"use strict";
const moment = require("moment");
const giveawayManager = require("../../giveaway-manager");
const twitchChat = require("../../../chat/twitch-chat");
const commandManager = require("../../../chat/commands/CommandManager");
const currencyDatabase = require("../../../database/currencyDatabase");
const util = require("../../../utility");

/**
 * @typedef LotteryUser
 * @property {string} username - The user's name
 * @property {number} tickets - The amount of currency the user has
 */

/**@type {LotteryUser[]} */
let usersInLottery = [];

let startDelayTimeoutId = null;
exports.lobbyOpen = false;

async function runLottery() {
    const lotterySettings = giveawayManager.getLotterySettings("firebot-lottery");
    const chatter = lotterySettings.settings.chatSettings.chatter;

    const startMessage = lotterySettings.settings.manualSettings.startMessage;
    twitchChat.sendChatMessage(startMessage, null, chatter);

    // wait a few secs for suspense
    await util.wait(7 * 1000);

    const randomIndex = util.getRandomInt(0, messages.length - 1);
    let outcomeMessage = messages[randomIndex];

    if (usersInHeist.length === 1) {
        outcomeMessage = outcomeMessage
            .replace("{user}", usersInHeist[0].username);
    }

    const currencyId = lotterySettings.settings.currencySettings.currencyId;
    for (const user of survivers) {
        await currencyDatabase.adjustCurrencyForUser(user.username, currencyId, user.winnings);
    }

    let winningsString;
    if (percentSurvived > 0) {
        winningsString = survivers
            .map(s => `${s.username} (${util.commafy(s.winnings)})`)
            .join(", ");
    } else {
        winningsString = "None";
    }

    const winningsMessage = lotterySettings.settings.generalMessages.heistWinnings
        .replace("{winnings}", winningsString);

    try {
        twitchChat.sendChatMessage(outcomeMessage, null, chatter);
        twitchChat.sendChatMessage(winningsMessage, null, chatter);
    } catch (error) {
        //weird error
    }

    // We've completed the heist, lets clean up!
    usersInHeist = [];
}

exports.triggerLobbyStart = (startDelayMins) => {
    if (exports.lobbyOpen) return;
    exports.lobbyOpen = true;

    if (startDelayTimeoutId != null) {
        clearTimeout(startDelayTimeoutId);
    }

    startDelayTimeoutId = setTimeout(async () => {
        exports.lobbyOpen = false;
        startDelayTimeoutId = null;

        const lotterySettings = giveawayManager.getLotterySettings("firebot-lottery");
        const currencyId = lotterySettings.settings.currencySettings.currencyId;
        const chatter = lotterySettings.settings.chatSettings.chatter;



        twitchChat.sendChatMessage(teamTooSmallMessage, null, chatter);

        usersInLottery = [];
        return;

        runLottery();

    }, startDelayMins * 60000);
};

/**
 *
 * @param {LotteryUser} user
 */
exports.addUser = (user) => {
    if (user == null) return;
    if (usersInLottery.some(u => u.username === user.username)) return;
    usersInLottery.push(user);
};

exports.userInLottery = (username) => {
    return usersInLottery.some(e => e.username === username);
};

exports.clearCooldowns = () => {
    if (cooldownTimeoutId != null) {
        clearTimeout(cooldownTimeoutId);
        cooldownTimeoutId = null;
    }
    exports.cooldownExpireTime = null;

    if (startDelayTimeoutId != null) {
        clearTimeout(startDelayTimeoutId);
        startDelayTimeoutId = null;
    }
    exports.lobbyOpen = false;
    usersInHeist = [];
};