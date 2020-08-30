"use strict";
const moment = require("moment");
const giveawayManager = require("../../giveaway-manager");
const twitchChat = require("../../../chat/twitch-chat");
const commandManager = require("../../../chat/commands/CommandManager");
const currencyDatabase = require("../../../database/currencyDatabase");
const util = require("../../../utility");

/**
 * @typedef RaffleUser
 * @property {string} username - The user's name
 * @property {number} tickets - The amount of currency the user has
 */

/**@type {RaffleUser[]} */
let usersInRaffle = [];

let startDelayTimeoutId = null;
exports.lobbyOpen = false;
exports.raffleRunning = false;

async function runRaffle() {

    const raffleSettings = giveawayManager.getGiveawaySettings("firebot-raffle");
    const chatter = raffleSettings.settings.chatSettings.chatter;
    const currencyId = raffleSettings.settings.currencySettings.currencyId;

    const currency = currencyDatabase.getCurrencyById(currencyId);
    const currencyName = currency.name;

    const startMessage = raffleSettings.settings.manualSettings.startMessage
        .replace("{item}", currencyName);
    twitchChat.sendChatMessage(startMessage, null, chatter);

    usersInRaffle = [];
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

        usersInRaffle = [];

    }, startDelayMins * 60000);

    runRaffle();

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

    if (startDelayTimeoutId != null) {
        clearTimeout(startDelayTimeoutId);
        startDelayTimeoutId = null;
    }
    exports.lobbyOpen = false;
    usersInRaffle = [];
};