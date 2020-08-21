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

let activeLotteryInfo = {
    "active": false,
    "winner": ""
};

let lotteryTimer;

const cooldownCache = new NodeCache({ checkperiod: 5 });

const LOTTERY_COMMAND_ID = "firebot:lottery";
const ENTER_COMMAND_ID = "firebot:lotteryEnter";
const CLAIM_COMMAND_ID = "firebot:lotteryClaim";

function purgeCaches() {
    cooldownCache.flushAll();
    activeLotteryInfo = {
        "active": false,
        "winner": ""
    };
}

function stopLottery(chatter) {
    clearTimeout(lotteryTimer);
    twitchChat.sendChatMessage(`${activeLotteryInfo.winner} has won the lottery, type !claim to claim your prize!`, null, chatter);
    purgeCaches();
}

const lotteryCommand = {
    definition: {
        id: LOTTERY_COMMAND_ID,
        name: "Lottery",
        active: true,
        trigger: "!lottery",
        description: "Allows viewers to participate in a lottery.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
        subCommands: [
            {
                id: "lotteryStart",
                arg: "start",
                usage: "start [manual | currency]",
                description: "Starts a lottery.",
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
                        id: "lotteryManual",
                        arg: "manual",
                        usage: "manual",
                        description: "Starts a lottery for users in chat using manual entry.",
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
                        id: "lotteryCurrency",
                        arg: "currency",
                        usage: "currency",
                        description: "Starts a lottery for users in chat using a currency system.",
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
                id: "lotteryStop",
                arg: "stop",
                usage: "stop",
                description: "Manually stops the lottery. Selects a winner.",
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
                id: "lotteryClear",
                arg: "clear",
                usage: "clear",
                description: "Clears the lottery currency for all users.",
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

        const lotterySettings = giveawayManager.getGiveawaySettings("firebot-lottery");
        const chatter = lotterySettings.settings.chatSettings.chatter;

        const currencyId = lotterySettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

        if (event.userCommand.subcommandId === "lotteryStart") {
            const username = userCommand.commandSender;

            if (activeBiddingInfo.active !== false) {
                twitchChat.sendChatMessage(`There is already a lottery running. Use !lottery stop to stop it.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            // When "!lottery start manual" is called, chat users use "!enter" to enter the lottery
            // After timeLimit is reached, a winner is randomly selected from the list of entered users.
            if (event.userCommand.subcommandId === "lotteryManual") {

                let timeLimit = lotterySettings.settings.manualSettings.startDelay * 60000;

                activeLotteryInfo = {
                    "active": true
                };

                bidTimer = setTimeout(function () {
                    stopLottery(chatter);
                }, timeLimit);

                // When "!lottery start currency" is called, the currency of all users is totalled.
                // A random number is picked between 0 and the currency total, called the winning number.
                // A loop iterates through all currency holders, subtracting their currency amounts from the winning number.
                // When the winning number hits 0, that user is selected as the winner and announced to chat
            } else if (event.userCommand.subcommandId === "lotteryCurrency") {

                let timeLimit = lotterySettings.settings.currencySettings.startDelay * 60000;

                activeLotteryInfo = {
                    "active": true
                };

                bidTimer = setTimeout(function () {
                    stopLottery(chatter);
                }, timeLimit);

            }


            if (!lotteryRunner.lobbyOpen) {

                const startDelay = lotterySettings.settings.generalSettings.startDelay || 1;
                lotteryRunner.triggerLobbyStart(startDelay);

                const teamCreationMessage = heistSettings.settings.generalMessages.teamCreation
                    .replace("{user}", username)
                    .replace("{command}", userCommand.trigger)
                    .replace("{requiredUsers}", heistSettings.settings.generalSettings.minimumUsers);

                twitchChat.sendChatMessage(teamCreationMessage, null, chatter);
            }

            // lotteryStop stops a manual lottery early
        } else if (event.userCommand.subcommandId === "lotteryStop") {

            stopLottery(chatter);

            // lotteryClear removes all of the currency from all holders
        } else if (event.userCommand.subcommandId === "lotteryClear") {

            await currencyDatabase.purgeCurrencyById(currencyId);

        } else {
            twitchChat.sendChatMessage(`Incorrect lottery usage: ${userCommand.trigger}`, userCommand.commandSender, chatter);
            twitchChat.deleteMessage(chatEvent.id);
        }
    }
};

const lotteryEnterCommand = {
    definition: {
        id: ENTER_COMMAND_ID,
        name: "Enter",
        active: true,
        trigger: "!enter",
        description: "Allows a user to enter a lottery.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const bidSettings = giveawayManager.getGiveawaySettings("firebot-lottery");

        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

    }
};

const lotteryClaimCommand = {
    definition: {
        id: CLAIM_COMMAND_ID,
        name: "Claim",
        active: true,
        trigger: "!claim",
        description: "Allows a user to claim lottery winnings.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const bidSettings = giveawayManager.getGiveawaySettings("firebot-lottery");

        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

    }
};

function registerLotteryCommand() {
    if (!commandManager.hasSystemCommand(LOTTERY_COMMAND_ID)) {
        commandManager.registerSystemCommand(lotteryCommand);
    }
    if (!commandManager.hasSystemCommand(ENTER_COMMAND_ID)) {
        commandManager.registerSystemCommand(lotteryEnterCommand);
    }
    if (!commandManager.hasSystemCommand(CLAIM_COMMAND_ID)) {
        commandManager.registerSystemCommand(lotteryClaimCommand);
    }
}

function unregisterLotteryCommand() {
    commandManager.unregisterSystemCommand(LOTTERY_COMMAND_ID);
    commandManager.unregisterSystemCommand(ENTER_COMMAND_ID);
    commandManager.unregisterSystemCommand(CLAIM_COMMAND_ID);
}

exports.purgeCaches = purgeCaches;
exports.registerLotteryCommand = registerLotteryCommand;
exports.unregisterLotteryCommand = unregisterLotteryCommand;