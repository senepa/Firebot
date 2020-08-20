"use strict";
const { ipcMain } = require("electron");
const userDatabase = require("./userDatabase");
const profileManager = require("../common/profile-manager");
const logger = require("../logwrapper");
const { settings } = require("../common/settings-access.js");
const channelAccess = require("../common/channel-access");
const customRolesManager = require("../roles/custom-roles-manager");
const mixerRolesManager = require("../../shared/mixer-roles");
const firebotRolesManager = require("../roles/firebot-roles-manager");
const util = require("../utility");
const twitchChat = require("../chat/twitch-chat");

let currencyCache = {};

// Checks the settings to see if viewer DB is set to on.
function isViewerDBOn() {
    return settings.getViewerDbStatus();
}

// Refresh our currency settings cache.
function refreshCurrencyCache() {
    if (!isViewerDBOn()) {
        return;
    }
    let db = profileManager.getJsonDbInProfile("/currency/currency");
    currencyCache = db.getData("/");
}

//run when class first loads
refreshCurrencyCache();

// Returns our currency settings, or goes and gets a fresh copy.
function getCurrencies() {
    return currencyCache;
}

function getCurrencyById(currencyId) {
    let currencies = Object.values(currencyCache);
    return currencies.find(c => c.id === currencyId);
}

// Adjust Currency
// This adjust currency for a user. Can be given negative values. Provide it with the database record for a user.
function adjustCurrency(user, currencyId, value, adjustType = "adjust") {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve();
        }

        // Dont do anything if value is not a number or is 0.
        if (isNaN(value) || parseInt(value) === 0) {
            return resolve();
        }

        value = parseInt(value);
        adjustType = adjustType.toLowerCase();
        let newUserValue = value;

        switch (adjustType) {
            case "set":
                logger.debug("Currency: Setting " + user.username + " currency " + currencyId + " to: " + value + ".");
                newUserValue = value;
                break;
            default:
                logger.debug("Currency: Adjusting " + value + " currency to " + user.username + ". " + currencyId);
                newUserValue = (user.currency[currencyId] += parseInt(value));
        }

        let db = userDatabase.getUserDb();
        let updateDoc = {};
        let currencyLimit = isNaN(currencyCache[currencyId].limit) ? 0 : currencyCache[currencyId].limit;

        // If new value would put them over the currency limit set by the user...
        // Just set them at currency limit. Otherwise add currency to what they have now.

        let valueToSet = newUserValue;
        if (newUserValue > currencyLimit && currencyLimit !== 0) {
            valueToSet = currencyLimit;
        } else if (newUserValue < 0) {
            valueToSet = 0;
        } else {
            valueToSet = newUserValue;
        }

        updateDoc[`currency.${currencyId}`] = valueToSet;

        // Update the DB with our new currency value.
        db.update({ _id: user._id }, { $set: updateDoc }, {}, function (err) {
            if (err) {
                logger.error("Currency: Error setting currency on user.", err);
            } else {
                let updateObj = {};
                updateObj[`currency:${currencyId}`] = util.commafy(valueToSet);
            }
            return resolve();
        });
    });
}

// Adjust currency for user.
// This adjust currency when given a username. Can be given negative values to remove currency.
async function adjustCurrencyForUser(username, currencyId, value, adjustType = "adjust") {
    if (!isViewerDBOn()) {
        return false;
    }

    // Validate inputs.
    if (username === null || currencyId === null || value === null || isNaN(value)) {
        return false;
    }

    // Try to make value an integer.
    value = parseInt(value);

    // Trim username just in case we have extra spaces.
    username = username.trim();

    // Okay, it passes... let's try to add it.
    let user = await userDatabase.getUserByUsername(username);

    if (user !== false) {
        await adjustCurrency(user, currencyId, value, adjustType);
        return true;
    }

    return false;
}

// Add Currency to Usergroup
// This will add an amount of currency to all online users in a usergroup.
function addCurrencyToUserGroupOnlineUsers(roleIds = [], currencyId, value, ignoreDisable = false, adjustType = "adjust") {
    return new Promise(async resolve => {
        if (!isViewerDBOn()) {
            return resolve();
        }

        // Run our checks. Stop if we have a bad value, currency, or roles.
        value = parseInt(value);
        if (roleIds === [] || currencyId === null || value === null || value === 0 || isNaN(value)) {
            return resolve();
        }

        let currentList = await twitchChat.getViewerList();

        let currentViewers = currentList || [];
        const userIdsInRoles = currentViewers
            .map(u => {
                let mixerRoles = (u.user_roles || [])
                    .filter(mr => mr !== "User")
                    .map(mr => mixerRolesManager.mapMixerRole(mr));
                let customRoles = customRolesManager.getAllCustomRolesForViewer(u.username);
                let firebotRoles = firebotRolesManager.getAllFirebotRolesForViewer(u.username);
                u.allRoles = mixerRoles.concat(customRoles).concat(firebotRoles);
                return u;
            })
            .filter(u => u.allRoles.some(r => roleIds.includes(r.id)))
            .map(u => u.userId);

        // Log it.
        logger.debug('Paying out ' + value + ' currency (' + currencyId + ') for online users:');
        logger.debug("role ids", roleIds);
        logger.debug("user ids", userIdsInRoles);

        // GIVE DEM BOBS.
        let db = userDatabase.getUserDb();
        db.find({ online: true, _id: { $in: userIdsInRoles } }, async (err, docs) => {
            if (!err) {
                for (let user of docs) {
                    if (user != null && (ignoreDisable || !user.disableAutoStatAccrual)) {
                        await adjustCurrency(user, currencyId, value, adjustType);
                    }
                }
            }

            resolve();
        });
    });
}

// Add Currency to all Online Users
// This will add an amount of currency to all users who are currently seen as online.
function addCurrencyToOnlineUsers(currencyId, value, ignoreDisable = false, adjustType = "adjust") {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return reject();
        }

        // Don't do anything for 0 points or non numbers.
        value = parseInt(value);
        if (isNaN(value) || value === 0) {
            return resolve();
        }

        let db = userDatabase.getUserDb();
        db.find({ online: true }, (err, docs) => {
            // If error
            if (err) {
                return reject(err);
            }

            // Do the loop!
            for (let user of docs) {
                if (user != null && (ignoreDisable || !user.disableAutoStatAccrual)) {
                    adjustCurrency(user, currencyId, value, adjustType);
                }
            }
            return resolve();
        });
    });
}

// Add Currency To All Users
// This will add currency to all users regardless of if they're online or not.
function addCurrencyToAllUsers(currencyId, value) {
    if (!isViewerDBOn()) {
        return;
    }
    let db = userDatabase.getUserDb();
    let updateDoc = {};
    updateDoc[`currency.${currencyId}`] = value;
    db.update({}, { $set: updateDoc }, { multi: true }, function (
        err
    ) {
        if (err) {
            logger.error("Error adding currency to all users", err);
        }
    });
}

// This adds all of our active currencies to a new user.
function addCurrencyToNewUser(user) {
    if (!isViewerDBOn()) {
        return;
    }
    let currencies = getCurrencies();
    Object.keys(currencies).forEach(function (currency) {
        currency = currencies[currency];
        user.currency[currency.id] = 0;
    });

    return user;
}

// Get User Currency Amount
// This will retrieve the amount of currency that a user has.
function getUserCurrencyAmount(username, currencyId) {
    return new Promise((resolve) => {
        if (!isViewerDBOn()) {
            return resolve(0);
        }
        userDatabase.getUserByUsername(username).then(user => {
            if (user != null && !isNaN(user.currency[currencyId])) {
                return resolve(user.currency[currencyId]);
            }
            return resolve(0);

        });
    });
}

// Get Total Currency Amount
// This will retrieve the amount of currency in circulation.
function getTotalCurrencyAmount(currencyId) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }

        let db = userDatabase.getUserDb();

        //TODO: write aggregation query

        db.find({}).exec(function (err, docs) {
            if (err) {
                logger.error("Error getting top currency holders: ", err);
                return resolve([]);
            }
            return resolve(docs || []);
        });
    });
}

function getTopCurrencyHolders(currencyId, count) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }

        let db = userDatabase.getUserDb();

        const sortObj = {};
        sortObj[`currency.${currencyId}`] = -1;

        const projectionObj = { username: 1 };
        projectionObj[`currency.${currencyId}`] = 1;

        db.find({}).sort(sortObj).limit(count).projection(projectionObj).exec(function (err, docs) {
            if (err) {
                logger.error("Error getting top currency holders: ", err);
                return resolve([]);
            }
            return resolve(docs || []);
        });
    });
}

function getAllCurrencyHolders(currencyId) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }

        let db = userDatabase.getUserDb();

        const sortObj = {};
        sortObj[`currency.${currencyId}`] = -1;

        const projectionObj = { username: 1 };
        projectionObj[`currency.${currencyId}`] = 1;

        db.find({}).sort(sortObj).projection(projectionObj).exec(function (err, docs) {
            if (err) {
                logger.error("Error getting top currency holders: ", err);
                return resolve([]);
            }
            return resolve(docs || []);
        });
    });
}

// Purge Currency
// This will set all users to 0 for a specific currency.
function purgeCurrencyById(currencyId) {
    if (!isViewerDBOn()) {
        return;
    }
    let db = userDatabase.getUserDb();
    let updateDoc = {};
    updateDoc[`currency.${currencyId}`] = 0;
    db.update({}, { $set: updateDoc }, { multi: true }, function (
        err
    ) {
        if (err) {
            logger.error("Error purging currency to all users", err);
        }
    });
}

// Delete Currency
// This will completely delete a currency from the DB.
function deleteCurrencyById(currencyId) {
    if (!isViewerDBOn()) {
        return;
    }
    let db = userDatabase.getUserDb();
    db.find({}, function (err, docs) {
        for (let i = 0; i < docs.length; i++) {
            let user = docs[i];
            delete user.currency[currencyId];
            db.update({ _id: user._id }, { $set: user }, {}, function (
                err
            ) {
                if (err) {
                    logger.error("Error purging currency to all users", err);
                }
            });
        }
    });

    // Send to viewersService.js to delete from ui.
    renderWindow.webContents.send(
        "delete-currency-def",
        "currency." + currencyId
    );
}

//////////////////
// Event Listeners

// Refresh Currency Cache
// This gets a message from front end when a currency needs to be created.
// This is also triggered in the currencyManager.
ipcMain.on("refreshCurrencyCache", () => {
    if (!isViewerDBOn()) {
        return;
    }
    logger.debug("Refreshing the currency cache.");
    refreshCurrencyCache();
});

// Create Currency Event
// This gets a message from front end when a currency needs to be created.
ipcMain.on("createCurrency", (event, currencyId) => {
    if (!isViewerDBOn()) {
        return;
    }
    logger.info("Creating a new currency with id " + currencyId);
    addCurrencyToAllUsers(currencyId, 0);
});

// Purge Currency Event
// This gets a message from front end when a currency needs to be purged.
ipcMain.on("purgeCurrency", (event, currencyId) => {
    if (!isViewerDBOn()) {
        return;
    }
    logger.info("Purging currency with id " + currencyId);
    purgeCurrencyById(currencyId);
});

// Delete Currency Event
// This gets a message from front end when a currency needs to be deleted
ipcMain.on("deleteCurrency", (event, currencyId) => {
    if (!isViewerDBOn()) {
        return;
    }
    logger.info("Deleting currency with id " + currencyId);
    deleteCurrencyById(currencyId);
});

exports.adjustCurrencyForUser = adjustCurrencyForUser;
exports.addCurrencyToOnlineUsers = addCurrencyToOnlineUsers;
exports.addCurrencyToOnlineUsers = addCurrencyToOnlineUsers;
exports.getUserCurrencyAmount = getUserCurrencyAmount;
exports.getTotalCurrencyAmount = getTotalCurrencyAmount;
exports.purgeCurrencyById = purgeCurrencyById;
exports.addCurrencyToNewUser = addCurrencyToNewUser;
exports.refreshCurrencyCache = refreshCurrencyCache;
exports.getCurrencies = getCurrencies;
exports.getCurrencyById = getCurrencyById;
exports.addCurrencyToUserGroupOnlineUsers = addCurrencyToUserGroupOnlineUsers;
exports.isViewerDBOn = isViewerDBOn;
exports.getTopCurrencyHolders = getTopCurrencyHolders;
exports.getAllCurrencyHolders = getAllCurrencyHolders;
