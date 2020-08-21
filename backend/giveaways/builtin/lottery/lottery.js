"use strict";

const lotteryCommand = require("./lottery-command");

/**
 * @type {import('../../giveaaway-manager').FirebotGiveaway}
 */
module.exports = {
    id: "firebot-lottery",
    name: "Lottery",
    subtitle: "Start a giveaway for chat users",
    description: "This starts a raffle for users in chat. Everyone has the same chance of winning",
    icon: "fa-users",
    settingCategories: {
        generalSettings: {
            title: "Manual Lottery Settings",
            sortRank: 1,
            settings: {
                requireEntry: {
                    type: "boolean",
                    title: "Require Currency",
                    description: "Select if users are required to have currency to enter the raffle.",
                    sortRank: 1,
                    validation: {
                        required: true
                    }
                },
                currencyId: {
                    type: "currency-select",
                    title: "Currency",
                    description: "Which currency to use for the raffle.",
                    sortRank: 1,
                    validation: {
                        required: false
                    }
                },
                startDelay: {
                    type: "number",
                    title: "Start Delay (mins)",
                    description: "The time users are given to enter the lottery.",
                    placeholder: "Enter mins",
                    default: 2,
                    sortRank: 1,
                    validation: {
                        min: 1
                    }
                },
                startMessage: {
                    type: "string",
                    title: "Lottery Started",
                    description: "Sent when the raffle has started.",
                    useTextArea: true,
                    default: "A raffle has begun! Type !enter to join the lottery.",
                    validation: {
                        required: true
                    }
                },
                entryMessages: {
                    title: "Entry Messages",
                    sortRank: 2,
                    settings: {
                        onJoin: {
                            type: "string",
                            title: "On Join",
                            useTextArea: true,
                            default: "{user} has joined the lottery!",
                            tip: "Available variables: {user}",
                            sortRank: 1,
                            validation: {
                                required: true
                            }
                        },
                        alreadyJoined: {
                            type: "string",
                            title: "Already Joined",
                            useTextArea: true,
                            default: "{user}, you've already joined the lottery!",
                            tip: "Available variables: {user}",
                            sortRank: 2,
                            validation: {
                                required: true
                            }
                        }
                    }
                }
            }
        },
        chatSettings: {
            title: "Chat Settings",
            sortRank: 3,
            settings: {
                chatter: {
                    type: "chatter-select",
                    title: "Chat As"
                }
            }
        }
    },
    onLoad: gameSettings => {
        lotteryCommand.registerLotteryCommand();
    },
    onUnload: gameSettings => {
        lotteryCommand.unregisterLotteryCommand();
        lotteryCommand.clearCooldown();
    },
    onSettingsUpdate: gameSettings => {
        lotteryCommand.clearCooldown();
    }
};