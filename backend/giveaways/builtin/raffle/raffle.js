"use strict";

const raffleCommand = require("./raffle-command");

/**
 * @type {import('../../giveaway-manager').FirebotGiveaway}
 */
module.exports = {
    id: "firebot-raffle",
    name: "Raffle",
    subtitle: "Start a raffle",
    description: "Start a raffle.",
    icon: "fa-ticket-alt",
    settingCategories: {
        generalSettings: {
            title: "Currency Raffle Settings",
            sortRank: 1,
            settings: {
                requireEntry: {
                    type: "string",
                    title: "Item",
                    description: "Describe what is being given away.",
                    sortRank: 1,
                    validation: {
                        required: true
                    }
                },
                requireEntry: {
                    type: "boolean",
                    title: "Require Currency",
                    description: "Check this box if users need currency to enter the raffle.",
                    sortRank: 2,
                    validation: {
                        required: true
                    }
                },
                currencyId: {
                    type: "currency-select",
                    title: "Currency",
                    description: "Which currency to use for the raffle.",
                    sortRank: 3,
                    validation: {
                        required: false
                    }
                },
                manualEntry: {
                    type: "boolean",
                    title: "Require Manual Entry",
                    description: "Check this box if users are required to type !enter in chat to participate in the raffle.",
                    sortRank: 4,
                    validation: {
                        min: 1
                    }
                },
                lobbyTime: {
                    type: "number",
                    title: "Entry Window (mins)",
                    description: "This is how long users will be given to participate in the raffle by using the !enter command.",
                    placeholder: "Enter mins",
                    default: 2,
                    sortRank: 5,
                    validation: {
                        min: 1
                    }
                },
                startDelay: {
                    type: "number",
                    title: "Start Delay (secs)",
                    description: "The delay time until the raffle announces a winner.",
                    placeholder: "Enter secs",
                    default: 10,
                    sortRank: 6,
                    validation: {
                        min: 1
                    }
                },
                startMessage: {
                    type: "string",
                    title: "Raffle Started",
                    description: "Sent when the raffle has started.",
                    useTextArea: true,
                    default: "A raffle has begun!",
                    sortRank: 7,
                    validation: {
                        required: true
                    }
                }
            }
        },
        chatSettings: {
            title: "Chat Settings",
            sortRank: 2,
            settings: {
                chatter: {
                    type: "chatter-select",
                    title: "Chat As"
                }
            }
        }
    },
    onLoad: giveawaySettings => {
        raffleCommand.registerRaffleCommand();
    },
    onUnload: giveawaySettings => {
        raffleCommand.unregisterRaffleCommand();
        raffleCommand.clearCooldown();
    },
    onSettingsUpdate: giveawaySettings => {
        raffleCommand.clearCooldown();
    }
};