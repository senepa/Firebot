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

async function runRaffle() {
    const raffleSettings = giveawayManager.getGiveawaySettings("firebot-raffle");
    const chatter = raffleSettings.settings.chatSettings.chatter;

    const startMessage = raffleSettings.settings.manualSettings.startMessage;
    twitchChat.sendChatMessage(startMessage, null, chatter);

    // wait a few secs for suspense
    await util.wait(7 * 1000);


    // We've completed the heist, lets clean up!
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

        const raffleSettings = giveawayManager.getGiveawaySettings("firebot-raffle");
        const currencyId = raffleSettings.settings.currencySettings.currencyId;
        const chatter = raffleSettings.settings.chatSettings.chatter;



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

    if (startDelayTimeoutId != null) {
        clearTimeout(startDelayTimeoutId);
        startDelayTimeoutId = null;
    }
    exports.lobbyOpen = false;
    usersInRaffle = [];
};