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

const raffleRunner = require("./raffle-runner");

const RAFFLE_COMMAND_ID = "firebot:raffle";
const CLAIM_COMMAND_ID = "firebot:raffleClaim";

const cooldownCache = new NodeCache({ checkperiod: 5 });

let raffleTimer;

let activeRaffleInfo = {
    "active": false,
    "claimed": false,
    "winner": ""
};

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

const raffleEnterCommand = {
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
        const requireCurrency = raffleSettings.settings.generalSettings.requireCurrency;
        const currencyId = raffleSettings.settings.currencySettings.currencyId;

        const currency = currencyDatabase.getCurrencyById(currencyId);

        const username = userCommand.commandSender;
        const triggeredArg = userCommand.args[1];
        const bidAmount = parseInt(triggeredArg);

        if (raffleRunner.lobbyOpen) {
            if (requireCurrency) {
                // make sure the currency still exists
                if (currency == null) {
                    twitchChat.sendChatMessage("Unable to enter the raffle as the selected currency appears to not exist anymore.", null, chatter);
                    twitchChat.deleteMessage(chatEvent.id);
                }

                if (isNaN(bidAmount)) {
                    twitchChat.sendChatMessage(`Invalid amount. Please enter a number to enter the raffle.`, username, chatter);
                    twitchChat.deleteMessage(chatEvent.id);
                    return;
                }

                const userBalance = await currencyDatabase.getUserCurrencyAmount(chatter, currencyId);

                raffleRunner.addUser({
                    username: chatter,
                    tickets: userBalance
                });

            } else {
                raffleRunner.addUser({
                    username: chatter,
                    tickets: null
                });
            }
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
        hideCooldowns: true
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
        commandManager.registerSystemCommand(raffleEnterCommand);
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