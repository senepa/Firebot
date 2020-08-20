"use strict";


const util = require("../../../utility");
const twitchChat = require("../../../chat/twitch-chat");
const commandManager = require("../../../chat/commands/CommandManager");
const gameManager = require("../../game-manager");
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
                usage: "start",
                description: "Starts a raffle and gives users time to enter.",
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
                        description: "Starts a raffle for users in chat without using manual entry.",
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
                    },
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

        const bidSettings = gameManager.getGameSettings("firebot-raffle");
        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

        if (event.userCommand.subcommandId === "raffleStart") {
            const username = userCommand.commandSender;

            if (activeBiddingInfo.active !== false) {
                twitchChat.sendChatMessage(`There is already a raffle running. Use !raffle stop to stop it.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            activeRaffleInfo = {
                "active": true
            };

            let raiseMinimum = bidSettings.settings.currencySettings.minIncrement;
            let minimumBidWithRaise = activeBiddingInfo.currentBid + raiseMinimum;
            twitchChat.sendChatMessage(`Bidding has started at ${bidAmount} ${currencyName}. Type !bid ${minimumBidWithRaise} to start bidding.`, null, chatter);

            let timeLimit = bidSettings.settings.timeSettings.timeLimit * 60000;
            bidTimer = setTimeout(function () {
                stopBidding(chatter);
            }, timeLimit);

        } else if (event.userCommand.subcommandId === "raffleStop") {
            stopBidding(chatter);
        } else if (event.userCommand.subcommandId === "raffleClear") {

            const triggeredArg = userCommand.args[0];
            const bidAmount = parseInt(triggeredArg);
            const username = userCommand.commandSender;

            if (activeBiddingInfo.active === false) {
                twitchChat.sendChatMessage(`There is no active bidding in progress.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let cooldownExpireTime = cooldownCache.get(username);
            if (cooldownExpireTime && moment().isBefore(cooldownExpireTime)) {
                const timeRemainingDisplay = util.secondsForHumans(Math.abs(moment().diff(cooldownExpireTime, 'seconds')));
                twitchChat.sendChatMessage(`You placed a bid recently! Please wait ${timeRemainingDisplay} before placing another bid.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (activeBiddingInfo.topBidder === username) {
                twitchChat.sendChatMessage("You are already the top bidder. You can't bid against yourself.", username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            if (bidAmount < 1) {
                twitchChat.sendChatMessage("Bid amount must be more than 0.", username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            const minBid = bidSettings.settings.currencySettings.minBid;
            if (minBid != null & minBid > 0) {
                if (bidAmount < minBid) {
                    twitchChat.sendChatMessage(`Bid amount must be at least ${minBid} ${currencyName}.`, username, chatter);
                    twitchChat.deleteMessage(chatEvent.id);
                    return;
                }
            }

            const userBalance = await currencyDatabase.getUserCurrencyAmount(username, currencyId);
            if (userBalance < bidAmount) {
                twitchChat.sendChatMessage(`You don't have enough ${currencyName}!`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let raiseMinimum = bidSettings.settings.currencySettings.minIncrement;
            let minimumBidWithRaise = activeBiddingInfo.currentBid + raiseMinimum;
            if (bidAmount < minimumBidWithRaise) {
                twitchChat.sendChatMessage(`You must bid at least ${minimumBidWithRaise} ${currencyName}.`, username, chatter);
                twitchChat.deleteMessage(chatEvent.id);
                return;
            }

            let previousHighBidder = activeBiddingInfo.topBidder;
            let previousHighBidAmount = activeBiddingInfo.currentBid;
            if (previousHighBidder != null && previousHighBidder !== "") {
                await currencyDatabase.adjustCurrencyForUser(previousHighBidder, currencyId, previousHighBidAmount);
                twitchChat.sendChatMessage(`You have been out bid! You've been refunded ${previousHighBidAmount} ${currencyName}.`, previousHighBidder, chatter);
            }

            await currencyDatabase.adjustCurrencyForUser(username, currencyId, -Math.abs(bidAmount));
            let newTopBidWithRaise = bidAmount + raiseMinimum;
            twitchChat.sendChatMessage(`${username} is the new high bidder at ${bidAmount} ${currencyName}. To bid, type !bid ${newTopBidWithRaise} (or higher).`);

            // eslint-disable-next-line no-use-before-define
            setNewHighBidder(username, bidAmount);

            let cooldownSecs = bidSettings.settings.cooldownSettings.cooldown;
            if (cooldownSecs && cooldownSecs > 0) {
                const expireTime = moment().add(cooldownSecs, 'seconds');
                cooldownCache.set(username, expireTime, cooldownSecs);
            }
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
        description: "Allows viewers to enter a raffle.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const bidSettings = gameManager.getGameSettings("firebot-raffle");

        const chatter = bidSettings.settings.chatSettings.chatter;

        const currencyId = bidSettings.settings.currencySettings.currencyId;
        const currency = currencyDatabase.getCurrencyById(currencyId);
        const currencyName = currency.name;

    }
};

const raffleClaimCommand = {
    definition: {
        id: CLAIM_COMMAND_ID,
        name: "Claim",
        active: true,
        trigger: "!claim",
        description: "Allows users to claim raffle winnings.",
        autoDeleteTrigger: false,
        scanWholeMessage: false,
        hideCooldowns: true,
    },
    onTriggerEvent: async event => {

        const { chatEvent, userCommand } = event;

        const bidSettings = gameManager.getGameSettings("firebot-raffle");

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