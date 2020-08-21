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
const ENTER_COMMAND_ID = "firebot:raffleEnter";
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
        trigger: "!raffle",
        description: "Allows viewers to participate in a raffle.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
        subCommands: [
            {
                id: "raffleStart",
                arg: "start",
                usage: "start [manual | currency]",
                description: "Starts a raffle.",
                hideCooldowns: true,
                restrictionData: {
                    restrictions: [
                        {
                            id: "sys-cmd-mods-only-perms",
                            type: "firebot:permissions",
                            mode: "roles",
                            roleIds: [
                                "Mod",
                                "ChannelEditor",
                                "Owner"
                            ]
                        }
                    ]
                },
                subCommands: [
                    {
                        id: "raffleManual",
                        arg: "manual",
                        usage: "manual",
                        description: "Starts a raffle for users in chat using manual entry.",
                        hideCooldowns: true,
                        restrictionData: {
                            restrictions: [
                                {
                                    id: "sys-cmd-mods-only-perms",
                                    type: "firebot:permissions",
                                    mode: "roles",
                                    roleIds: [
                                        "Mod",
                                        "ChannelEditor",
                                        "Owner"
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        id: "raffleCurrency",
                        arg: "currency",
                        usage: "currency",
                        description: "Starts a raffle for users in chat using a currency system.",
                        hideCooldowns: true,
                        restrictionData: {
                            restrictions: [
                                {
                                    id: "sys-cmd-mods-only-perms",
                                    type: "firebot:permissions",
                                    mode: "roles",
                                    roleIds: [
                                        "Mod",
                                        "ChannelEditor",
                                        "Owner"
                                    ]
                                }
                            ]
                        }
                    }
                ]
            },
            {
                id: "raffleStop",
                arg: "stop",
                usage: "stop",
                description: "Manually stops the raffle. Selects a winner.",
                hideCooldowns: true,
                restrictionData: {
                    restrictions: [
                        {
                            id: "sys-cmd-mods-only-perms",
                            type: "firebot:permissions",
                            mode: "roles",
                            roleIds: [
                                "Mod",
                                "ChannelEditor",
                                "Owner"
                            ]
                        }
                    ]
                }
            },
            {
                id: "raffleClear",
                arg: "clear",
                usage: "clear",
                description: "Clears the raffle currency for all users.",
                hideCooldowns: true,
                restrictionData: {
                    restrictions: [
                        {
                            id: "sys-cmd-mods-only-perms",
                            type: "firebot:permissions",
                            mode: "roles",
                            roleIds: [
                                "Mod",
                                "ChannelEditor",
                                "Owner"
                            ]
                        }
                    ]
                }
            }
        ]
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

        if (event.userCommand.subcommandId === "raffleStart") {
            const username = userCommand.commandSender;

            if (activeBiddingInfo.active !== false) {
                twitchChat.sendChatMessage(`There is already a raffle running. Use !raffle stop to stop it.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            // When "!raffle start manual" is called, chat users use "!enter" to enter the raffle
            // After timeLimit is reached, a winner is randomly selected from the list of entered users.
            if (event.userCommand.subcommandId === "raffleManual") {

                let timeLimit = raffleSettings.settings.manualSettings.startDelay * 60000;

                activeRaffleInfo = {
                    "active": true
                };

                bidTimer = setTimeout(function () {
                    stopRaffle(chatter);
                }, timeLimit);

                raffleRunner.triggerLobbyStart(startDelay);

                // When "!raffle start currency" is called, the currency of all users is totalled.
                // A random number is picked between 0 and the currency total, called the winning number.
                // A loop iterates through all currency holders, subtracting their currency amounts from the winning number.
                // When the winning number hits 0, that user is selected as the winner and announced to chat
            } else if (event.userCommand.subcommandId === "raffleCurrency") {

                let timeLimit = raffleSettings.settings.currencySettings.startDelay * 60000;

                activeRaffleInfo = {
                    "active": true
                };

                bidTimer = setTimeout(function () {
                    stopRaffle(chatter);
                }, timeLimit);

                raffleRunner.triggerLobbyStart(startDelay);

            }


            // raffleStop stops a manual raffle early
        } else if (event.userCommand.subcommandId === "raffleStop") {

            stopRaffle(chatter);

            // raffleClear removes all of the currency from all holders
        } else if (event.userCommand.subcommandId === "raffleClear") {

            await currencyDatabase.purgeCurrencyById(currencyId);

        } else {
            twitchChat.sendChatMessage(`Incorrect raffle usage: ${userCommand.trigger}`, userCommand.commandSender, chatter);
            twitchChat.deleteMessage(chatEvent.id);
        }
    }
};

const raffleEnterCommand = {
    definition: {
        id: ENTER_COMMAND_ID,
        name: "Enter",
        active: true,
        trigger: "!enter",
        description: "Allows a user to enter a raffle.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const username = userCommand.commandSender;

        const raffleSettings = giveawayManager.getGiveawaySettings("firebot-raffle");

        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

        // Ensure the raffle has been started and the lobby ready
        if (raffleRunner.lobbyOpen) {



            raffleRunner.addUser({
                username: username,
                tickets: 
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
    if (!commandManager.hasSystemCommand(ENTER_COMMAND_ID)) {
        commandManager.registerSystemCommand(raffleEnterCommand);
    }
    if (!commandManager.hasSystemCommand(CLAIM_COMMAND_ID)) {
        commandManager.registerSystemCommand(raffleClaimCommand);
    }
}

function unregisterRaffleCommand() {
    commandManager.unregisterSystemCommand(RAFFLE_COMMAND_ID);
    commandManager.unregisterSystemCommand(ENTER_COMMAND_ID);
    commandManager.unregisterSystemCommand(CLAIM_COMMAND_ID);
}

exports.purgeCaches = purgeCaches;
exports.registerRaffleCommand = registerRaffleCommand;
exports.unregisterRaffleCommand = unregisterRaffleCommand;