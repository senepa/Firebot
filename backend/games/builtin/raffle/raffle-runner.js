"use strict";
const moment = require("moment");
const gameManager = require("../../game-manager");
const twitchChat = require("../../../chat/twitch-chat");
const commandManager = require("../../../chat/commands/CommandManager");
const currencyDatabase = require("../../../database/currencyDatabase");
const util = require("../../../utility");

/**
 * @typedef RaffleUser
 * @property {string} username - The user's name
 * @property {number} successPercentage - The users win percentage
 */

/**@type {RaffleUser[]} */
let usersInRaffle = [];

let startDelayTimeoutId = null;
exports.lobbyOpen = false;

async function runRaffle() {
    const raffleSettings = gameManager.getGameSettings("firebot-raffle");
    const chatter = raffleSettings.settings.chatSettings.chatter;

    const startMessage = raffleSettings.settings.generalMessages.startMessage;
    twitchChat.sendChatMessage(startMessage, null, chatter);

    // wait a few secs for suspense
    await util.wait(7 * 1000);

    const survivers = [];

    const randomIndex = util.getRandomInt(0, messages.length - 1);
    let outcomeMessage = messages[randomIndex];

    if (usersInHeist.length === 1) {
        outcomeMessage = outcomeMessage
            .replace("{user}", usersInHeist[0].username);
    }

    const currencyId = heistSettings.settings.currencySettings.currencyId;
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

    const winningsMessage = heistSettings.settings.generalMessages.heistWinnings
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

        const heistSettings = gameManager.getGameSettings("firebot-heist");
        const currencyId = heistSettings.settings.currencySettings.currencyId;
        const chatter = heistSettings.settings.chatSettings.chatter;



        twitchChat.sendChatMessage(teamTooSmallMessage, null, chatter);

        usersInRaffle = [];
        return;

        runRaffle();

    }, startDelayMins * 60000);
};

/**
 *
 * @param {RaffleUser} user
 */
exports.addUser = (user) => {
    if (user == null) return;
    if (usersInRaffle.some(u => u.username === user.username)) return;
    usersInRaffle.push(user);
};

exports.userInRaffle = (username) => {
    return usersInRaffle.some(e => e.username === username);
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