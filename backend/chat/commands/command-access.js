"use strict";
const { ipcMain } = require("electron");
const moment = require("moment");
const logger = require("../../logwrapper");
const profileManager = require("../../common/profile-manager");
const frontendCommunicator = require("../../common/frontend-communicator");

let getCommandsDb = () => profileManager.getJsonDbInProfile("/chat/commands");

// in memory commands storage
let commandsCache = {
    systemCommandOverrides: {},
    customCommands: []
};

function saveSystemCommandOverride(command) {
    let commandDb = getCommandsDb();

    // remove forward slashes just in case
    let id = command.id.replace("/", "");

    try {
        commandDb.push("/systemCommandOverrides/" + id, command);
    } catch (err) {} //eslint-disable-line no-empty
}

function removeSystemCommandOverride(id) {
    let commandDb = getCommandsDb();

    // remove forward slashes just in case
    id = id.replace("/", "");
    try {
        commandDb.delete("/systemCommandOverrides/" + id);
    } catch (err) {} //eslint-disable-line no-empty
}

// Refreshes the commands cache
function refreshCommandCache(retry = 1) {
    // FB: I've set a weird retry thing here because I ran into a rare issue where upon saving settings the app tried to
    // save and get the same file at the same time which threw errors and caused the cache to get out
    // of sync.

    // Get commands file
    let commandsDb = getCommandsDb();

    // We've got the last used board! Let's update the interactive cache.
    if (commandsDb != null) {
        if (retry <= 3) {
            let cmdData;
            try {
                cmdData = commandsDb.getData("/");
            } catch (err) {
                logger.info(
                    "Command cache update failed. Retrying. (Try " + retry + "/3)"
                );
                retry = retry + 1;
                logger.error("error getting command data", err);
                refreshCommandCache(retry);
                return;
            }

            if (cmdData.systemCommandOverrides) {
                commandsCache.systemCommandOverrides = cmdData.systemCommandOverrides;
            }

            if (cmdData.customCommands) {
                commandsCache.customCommands = Object.values(
                    cmdData.customCommands
                ).map(c => {
                    c.type = "custom";
                    return c;
                });
            }

            logger.info("Updated Command cache.");
        } else {
            renderWindow.webContents.send(
                "error",
                "Could not sync up command cache. Reconnect to try resyncing."
            );
        }
    }
}

function saveNewCustomCommand(command) {
    logger.debug("saving newcommand: " + command.trigger);
    if (command.id == null || command.id === "") {
        // generate id for new command
        const uuidv1 = require("uuid/v1");
        command.id = uuidv1();

        command.createdBy = "Imported";
        command.createdAt = moment().format();
    } else {
        command.lastEditBy = "Imported";
        command.lastEditAt = moment().format();
    }

    if (command.count == null) {
        command.count = 0;
    }

    let commandDb = getCommandsDb();

    try {
        commandDb.push("/customCommands/" + command.id, command);
    } catch (err) {} //eslint-disable-line no-empty
}

refreshCommandCache();

// Refresh Command Cache
// Refreshes backend command cache
ipcMain.on("refreshCommandCache", function() {
    refreshCommandCache();
});

exports.triggerUiRefresh = () => {
    frontendCommunicator.send("custom-commands-updated");
};

exports.refreshCommandCache = refreshCommandCache;
exports.getSystemCommandOverrides = () => commandsCache.systemCommandOverrides;
exports.saveSystemCommandOverride = saveSystemCommandOverride;
exports.removeSystemCommandOverride = removeSystemCommandOverride;
exports.saveNewCustomCommand = saveNewCustomCommand;

exports.getCustomCommands = () => commandsCache.customCommands;
exports.getCustomCommand = id =>
    commandsCache.customCommands.find(c => c.id === id);
