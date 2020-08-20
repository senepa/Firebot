"use strict";

const lotteryCommand = require("./lottery-command");

/**
 * @type {import('../../giveaaway-manager').FirebotGiveaway}
 */
module.exports = {
    id: "firebot-lottery",
    name: "Lottery",
    subtitle: "Make someone a winner using currency",
    description: "This game starts a lottery by using a currency. Users with more currency will have a higher chance of winning.",
    icon: "fa-dice-three",
    settingCategories: {
        manualSettings: {
            title: "Manual Lottery Settings",
            sortRank: 1,
            settings: {
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
                    description: "Sent when the manual lottery has started.",
                    useTextArea: true,
                    default: "A lottery has begun! Type !enter to join the lottery.",
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
        currencySettings: {
            title: "Currency Lottery Settings",
            sortRank: 2,
            settings: {
                currencyId: {
                    type: "currency-select",
                    title: "Currency",
                    description: "Which currency to use for the lottery.",
                    sortRank: 1,
                    validation: {
                        required: true
                    }
                },
                startDelay: {
                    type: "number",
                    title: "Start Delay (secs)",
                    description: "The delay time until the lottery announces a winner.",
                    placeholder: "Enter secs",
                    default: 10,
                    sortRank: 2,
                    validation: {
                        min: 1
                    }
                },
                startMessage: {
                    type: "string",
                    title: "Lottery Started",
                    description: "Sent when the currency lottery has started.",
                    useTextArea: true,
                    default: "A lottery has begun!",
                    validation: {
                        required: true
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