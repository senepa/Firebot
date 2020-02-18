"use strict";

const logger = require("../logwrapper");
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");

let mixplaySidebarSettings = {
    enabled: true,
    streamSchedule: {
        enabled: true
    },
    streamRules: {
        enabled: true
    }
};

function getMixPlaySidebarDb() {
    return profileManager.getJsonDbInProfile("mixplay-sidebar");
}

function loadSidebarSettings() {
    logger.debug(`Attempting to load roles data...`);

    let sidebarDb = getMixPlaySidebarDb();

    try {
        let sidebarSettings = sidebarDb.getData("/");

        if (sidebarSettings && sidebarSettings.enabled !== undefined) {
            mixplaySidebarSettings = sidebarSettings;
        }

        logger.debug(`Loaded mixplay sidebar settings.`);
    } catch (err) {
        logger.warn(`There was an error reading mixplay sidebar file.`, err);
    }
}

function saveSettings() {
    try {
        let rolesDb = getMixPlaySidebarDb();

        rolesDb.push("/", mixplaySidebarSettings);

        logger.debug(`Saved mixplay sidebar setings to file.`);

    } catch (err) {
        logger.warn(`There was an error saving mixplay sidebar settings to file.`, err);
    }
}

frontendCommunicator.onAsync("get-sidebar-settings", async () => {
    return mixplaySidebarSettings;
});

frontendCommunicator.on("sidebar-settings-update", (settings) => {
    if (settings) {
        mixplaySidebarSettings = settings;
        saveSettings();

        const mixplay = require("./mixplay");
        if (mixplay.mixplayIsConnected()) {
            mixplay.client.updateWorld({
                sidebar: {
                    settings: mixplaySidebarSettings
                }
            });
        }
    }
});

exports.loadSidebarSettings = loadSidebarSettings;
exports.getSidebarSettings = () => mixplaySidebarSettings;