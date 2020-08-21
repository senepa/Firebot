"use strict";

const raffleCommand = require("./raffle-command");

/**
 * @type {import('../../giveaway-manager').FirebotGiveaway}
 */
module.exports = {
    id: "firebot-raffle",
    name: "Raffle",
    subtitle: "Start a raffle for all users with a currency",
    description: "This giveaway starts a raffle by using a currency. Users with more currency will have a higher chance of winning.",
    icon: "fa-money-bill-wave",
    settingCategories: {
        generalSettings: {
            title: "Currency Raffle Settings",
            sortRank: 2,
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