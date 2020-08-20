"use strict";

const raffleCommand = require("./lottery-command");

/**
 * @type {import('../../game-manager').FirebotGame}
 */
module.exports = {
    id: "firebot-raffle",
    name: "Raffle",
    subtitle: "Make someone a winner using currency",
    description: "This game starts a raffle by using a currency. Users with more currency will have a higher chance of winning.",
    icon: "fa-dice-three",
    settingCategories: {
        manualSettings: {
            title: "Manual Raffle Settings",
            sortRank: 1,
            settings: {
                startDelay: {
                    type: "number",
                    title: "Start Delay (mins)",
                    description: "The time users are given to enter the raffle.",
                    placeholder: "Enter mins",
                    default: 2,
                    sortRank: 1,
                    validation: {
                        min: 1
                    }
                },
                startMessage: {
                    type: "string",
                    title: "Raffle Started",
                    description: "Sent when the manual raffle has started.",
                    useTextArea: true,
                    default: "A raffle has begun! Type !enter to join the raffle.",
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
                            default: "{user} has joined the raffle!",
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
                            default: "{user}, you've already joined the raffle!",
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
            title: "Currency Raffle Settings",
            sortRank: 2,
            settings: {
                currencyId: {
                    type: "currency-select",
                    title: "Currency",
                    description: "Which currency to use for the raffle.",
                    sortRank: 1,
                    validation: {
                        required: true
                    }
                },
                startDelay: {
                    type: "number",
                    title: "Start Delay (secs)",
                    description: "The delay time until the raffle announces a winner.",
                    placeholder: "Enter secs",
                    default: 10,
                    sortRank: 2,
                    validation: {
                        min: 1
                    }
                },
                startMessage: {
                    type: "string",
                    title: "Raffle Started",
                    description: "Sent when the currency raffle has started.",
                    useTextArea: true,
                    default: "A raffle has begun!",
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
        raffleCommand.registerRaffleCommand();
    },
    onUnload: gameSettings => {
        raffleCommand.unregisterRaffleCommand();
        raffleCommand.clearCooldown();
    },
    onSettingsUpdate: gameSettings => {
        raffleCommand.clearCooldown();
    }
};