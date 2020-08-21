"use strict";

const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");

let getGiveawayDb = () => profileManager.getJsonDbInProfile("/giveaways");

/**
 * @typedef {"string" | "number" | "boolean" | "enum" | "filepath" | "currency-select" | "chatter-select" | "editable-list" | "role-percentages" | "role-numbers"} SettingType
 */

/**
 * @typedef {Object} SettingDefinition - A setting
 * @property {SettingType} type - The type of setting, which determines the UI
 * @property {string} [title] - Human readable title
 * @property {string} [description] - Human readable description
 * @property {string} [tip] - Human readable tip, this is rendered below the field in smaller muted text
 * @property {any} [default] - The default value that is initially set
 * @property {number} [sortRank] - A rank to tell the UI how to order settings
 * @property {boolean} [showBottomHr] - Display a line under the setting
 * @property {Object} [validation] - Various validation properties
 * @property {boolean} [validation.required] - Whether or not a value is required before the user can save
 * @property {number} [validation.min] - The min number value, if type is number
 * @property {number} [validation.max] - The max number value, if type is number
 */

/**
 * @typedef {Object} SettingCategoryDefinition - A setting category which holds a dictionary of settings
 * @property {string} title - Human readable title
 * @property {string} [description] - Human readable description
 * @property {number} [sortRank] - A rank to tell the UI how to order settings
 * @property {Object.<string, SettingDefinition>} settings - the settings dictionary
 */

/**
 * @typedef {Object} GiveawaySettings - all settings data saved for the giveaway
 * @property {boolean} active - If the giveaway has been enabled by the user
 * @property {Object.<string, Object.<string, any>>} settings - Dictionary of dictionaries contained giveaway settings saved by the user
 */

/**
 * @callback GiveawayFn
 * @param {GiveawaySettings} giveawaySettings
 * @returns {void}
 */

/**
  * @typedef FirebotGiveaway - A giveaway in Firebot
  * @property {string} id - Unique id for the giveaway
  * @property {string} name - Human readable name for the giveaway
  * @property {string} subtitle - Very short tagline for the giveaway, shows up in the giveaway tab
  * @property {string} description - Verbose description of the giveaway, shown when clicking edit on the giveaway
  * @property {string} icon - Font Awesome 5 icon to use for the giveaway, ie 'fa-dice-three'
  * @property {Object.<string, SettingCategoryDefinition>} settingCategories - Definitions of setting categories and the settings within them
  * @property {GiveawayFn} onLoad - Called when the giveaway is enabled, either on app load or if the user enables the giveaway later. You can register a system command here or set up any required giveaway state.
  * @property {GiveawayFn} onUnload - Called when the giveaway was previously active but has since been disabled. You should unregister any system commands here and clear out any giveaway state.
  * @property {GiveawayFn} onSettingsUpdate - Called whenever the settings from settingCategories are updated by the user.
  */


/**
 * @type {Object.<string, GiveawaySettings>}
 */
let allGiveawaysSettings = {};

/**@type {FirebotGiveaway[]} */
const registeredGiveaways = [];

/**
 * Register a Firebot giveaway
 * @param {FirebotGiveaway} giveaway - The giveaway to register with the system
 * @returns {void}
 */
function registerGiveaway(giveaway) {
    if (giveaway == null) return;

    if (registeredGiveaways.some(g => g.id === giveaway.id)) return;

    giveaway.active = false;

    let giveaway = allGiveawaysSettings[giveaway.id];
    if (giveaway) {
        giveaway.active = giveawaySettings.active;
    } else {
        giveawaySettings = { active: false };
    }

    if (giveawaySettings.active && giveaway.onLoad) {
        giveaway.onLoad(giveawaySettings);
    }

    registeredGiveaways.push(giveaway);
}

function buildGiveawaySettings(giveaway, savedSettings) {
    let settingsData = {
        active: giveaway.active,
        settings: {}
    };

    if (savedSettings != null) {
        settingsData = savedSettings;
    }

    if (giveaway.settingCategories) {
        for (let categoryId of Object.keys(giveaway.settingCategories)) {
            if (settingsData.settings[categoryId] == null) {
                settingsData.settings[categoryId] = {};
            }
            for (let settingId of Object.keys(giveaway.settingCategories[categoryId].settings)) {
                if (settingsData.settings[categoryId][settingId] === undefined) {
                    settingsData.settings[categoryId][settingId] = giveaway.settingCategories[categoryId].settings[settingId].default;
                }
            }
        }
    }
    return settingsData;
}

function setGiveawaySettingValues(settingCategories, savedSettings) {
    if (settingCategories && savedSettings) {
        for (let categoryId of Object.keys(settingCategories)) {
            for (let settingId of Object.keys(settingCategories[categoryId].settings)) {
                if (savedSettings.settings[categoryId]) {
                    settingCategories[categoryId].settings[settingId].value = savedSettings.settings[categoryId][settingId];
                }
            }
        }
    }
    return settingCategories;
}

function getGiveawaySettingsFromValues(settingCategories, savedSettings) {
    if (settingCategories && savedSettings) {
        for (let categoryId of Object.keys(settingCategories)) {
            for (let settingId of Object.keys(settingCategories[categoryId].settings)) {
                savedSettings.settings[categoryId][settingId] = settingCategories[categoryId].settings[settingId].value;
            }
        }
    }
    return savedSettings;
}

/**
 * Gets the settings for a giveaway
 * @param {string} giveawayId - The id of the giveaway
 * @returns {GiveawaySettings} - The giveaway settings
 */
function getGiveawaySettings(giveawayId) {
    const giveaway = registeredGiveaways.find(g => g.id === giveawayId);
    if (!giveaway) return null;
    return buildGiveawaySettings(giveaway, allGiveawaysSettings[giveaway.id]);
}

function loadGiveawaySettings() {
    try {
        let savedGiveawaySettings = getGiveawayDb().getData("/");
        if (savedGiveawaySettings != null) {
            allGiveawaysSettings = savedGiveawaySettings;
        }
    } catch (error) {
        //
    }
}

function saveAllGiveawaySettings() {
    try {
        getGiveawayDb().push("/", allGiveawaysSettings);
    } catch (error) {
        //
    }
}

function getGiveaways() {
    return registeredGiveaways.map(g => {
        return {
            id: g.id,
            name: g.name,
            subtitle: g.subtitle,
            description: g.description,
            icon: g.icon,
            active: g.active,
            settingCategories: setGiveawaySettingValues(g.settingCategories, buildGiveawaySettings(g, allGiveawaysSettings[g.id]))
        };
    });
}

frontendCommunicator.onAsync('get-giveaways', async () => {
    return getGiveaways();
});

function updateGiveawaySettings(giveawayId, settingCategories, activeStatus) {
    const giveaway = registeredGiveaways.find(g => g.id === giveawayId);

    if (giveaway == null) return;


    let previousSettings = buildGiveawaySettings(giveaway, allGiveawaysSettings[giveaway.id]);
    let previousActiveStatus = previousSettings.active;

    let giveawaySettings;
    if (settingCategories == null) {
        giveawaySettings = {
            active: false
        };

        giveaway.active = false;

        delete allGiveawaysSettings[giveaway.id];
    } else {

        giveawaySettings = getGiveawaySettingsFromValues(settingCategories, previousSettings);
        giveawaySettings.active = activeStatus;
        giveaway.active = activeStatus;

        allGiveawaysSettings[giveaway.id] = giveawaySettings;
    }

    saveAllGiveawaySettings();

    if (giveawaySettings.active) {
        //giveaway has been enabled, load it
        if (previousActiveStatus === false && giveaway.onLoad) {
            giveaway.onLoad(giveawaySettings);
        } else if (giveaway.onSettingsUpdate) {
            // just trigger settings update
            giveaway.onSettingsUpdate(giveawaySettings);
        }
    } else {
        //giveaway has been disabled, unload it
        if (previousActiveStatus === true && giveaway.onUnload) {
            giveaway.onUnload(giveawaySettings);
        }
    }
}

frontendCommunicator.on('giveaway-settings-update', (data) => {
    const { giveawayId, settingCategories, activeStatus } = data;

    updateGiveawaySettings(giveawayId, settingCategories, activeStatus);
});

frontendCommunicator.on('reset-giveaway-to-defaults', (giveawayId) => {
    const giveaway = registeredGiveaways.find(g => g.id === giveawayId);

    if (giveaway == null) return;

    updateGiveawaySettings(giveawayId, null, null);

    frontendCommunicator.send("giveaway-settings-updated", getGiveaways());
});

exports.loadGiveawaySettings = loadGiveawaySettings;
exports.registerGiveaway = registerGiveaway;
exports.getGiveawaySettings = getGiveawaySettings;