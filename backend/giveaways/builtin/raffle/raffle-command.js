"use strict";


const util = require("../../../utility");
const twitchChat = require("../../../chat/twitch-chat");
const commandManager = require("../../../chat/commands/CommandManager");
const giveawayManager = require("../../giveaway-manager");
const currencyDatabase = require("../../../database/currencyDatabase");
const customRolesManager = require("../../../roles/custom-roles-manager");
const twitchRolesManager = require("../../../../shared/twitch-roles");
const moment = require("moment");
const NodeCache = require("node-cache");

let activeRaffleInfo = {
    "active": false,
    "winner": ""
};

let raffleTimer;

const cooldownCache = new NodeCache({ checkperiod: 5 });

const RAFFLE_COMMAND_ID = "firebot:raffle";
const CLAIM_COMMAND_ID = "firebot:raffleClaim";

function purgeCaches() {
    cooldownCache.flushAll();
    activeRaffleInfo = {
        "active": false,
        "winner": ""
    };
}

function stopRaffle(chatter) {
    clearTimeout(raffleTimer);
    twitchChat.sendChatMessage(`${activeRaffleInfo.winner} has won the raffle, type !claim to claim your prize!`, null, chatter);
    purgeCaches();
}

const raffleCommand = {
    definition: {
        id: RAFFLE_COMMAND_ID,
        name: "Raffle",
        active: true,
        trigger: "!enter",
        description: "Allows viewers to participate in a raffle.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true
    },
    onTriggerEvent: async event => {
        const { chatEvent, userCommand } = event;

        const raffleSettings = giveawayManager.getGiveawaySettings("firebot-raffle");
        const chatter = raffleSettings.settings.chatSettings.chatter;

        const currencyId = raffleSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

        // make sure the currency still exists
        if (currency == null) {
            twitchChat.sendChatMessage("Unable to start a raffle as the selected currency appears to not exist anymore.", null, chatter);
            twitchChat.deleteMessage(chatEvent.id);
        }
        // Ensure the raffle has been started and the lobby ready
        if (raffleRunner.lobbyOpen) {

            const userBalance = await currencyDatabase.getUserCurrencyAmount(username, currencyId);

            raffleRunner.addUser({
                username: username,
                tickets: userBalance
            });

        }
    }
};

const raffleClaimCommand = {
    definition: {
        id: CLAIM_COMMAND_ID,
        name: "Claim",
        active: true,
        trigger: "!claim",
        description: "Allows a user to claim raffle winnings.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const bidSettings = giveawayManager.getGiveawaySettings("firebot-raffle");

        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

    }
};

function registerRaffleCommand() {
    if (!commandManager.hasSystemCommand(RAFFLE_COMMAND_ID)) {
        commandManager.registerSystemCommand(raffleCommand);
    }
    if (!commandManager.hasSystemCommand(CLAIM_COMMAND_ID)) {
        commandManager.registerSystemCommand(raffleClaimCommand);
    }
}

function unregisterRaffleCommand() {
    commandManager.unregisterSystemCommand(RAFFLE_COMMAND_ID);
    commandManager.unregisterSystemCommand(CLAIM_COMMAND_ID);
}

exports.purgeCaches = purgeCaches;
exports.registerRaffleCommand = registerRaffleCommand;
exports.unregisterRaffleCommand = unregisterRaffleCommand;