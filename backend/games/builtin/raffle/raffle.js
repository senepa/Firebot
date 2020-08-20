"use strict";

const raffleCommand = require("./raffle-command");

/**
 * @type {import('../../game-manager').FirebotGame}
 */
module.exports = {
    id: "firebot-raffle",
    name: "Raffle",
    subtitle: "Make someone a winner using currency",
    description: "This game starts a raffle by using a currency. Users with more currency will have a higher chance of winning.",
    icon: "fa-sack-dollar",
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
                announcementDelay: {
                    type: "number",
                    title: "Start Delay (secs)",
                    description: "The delay time before the raffle announces a winner.",
                    placeholder: "Enter secs",
                    default: 10,
                    sortRank: 2,
                    validation: {
                        min: 1
                    }
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