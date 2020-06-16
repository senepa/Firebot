"use strict";
(function() {
    //This handles settings access for frontend

    const fs = require("fs");
    const { ipcRenderer } = require("electron");

    angular
        .module("firebotApp")
        .factory("settingsService", function(utilityService, logger, profileManager, dataAccess, backendCommunicator) {
            let service = {};

            let settingsCache = {};

            backendCommunicator.on("flush-settings-cache", () => {
                settingsCache = {};
            });

            backendCommunicator.on("settings-updated-main", (settingsUpdate) => {
                if (settingsUpdate == null) return;
                let { path, data } = settingsUpdate;
                if (path == null || path === '') return;
                settingsCache[path] = data;
            });

            function getSettingsFile() {
                return profileManager.getJsonDbInProfile("/settings");
            }

            function pushDataToFile(path, data) {
                try {
                    getSettingsFile().push(path, data);
                    settingsCache[path] = data;
                    backendCommunicator.fireEvent("settings-updated-renderer", { path, data });
                } catch (err) {} //eslint-disable-line no-empty
            }

            function getDataFromFile(path, forceCacheUpdate) {
                try {
                    if (settingsCache[path] == null || forceCacheUpdate) {
                        let data = getSettingsFile().getData(path);
                        settingsCache[path] = data;
                    }
                } catch (err) {
                    if (err.name !== "DataError") {
                        logger.warn(err);
                    }
                }
                return settingsCache[path];
            }

            function deleteDataAtPath(path) {
                try {
                    getSettingsFile().delete(path);
                    delete settingsCache[path];
                    backendCommunicator.fireEvent("settings-updated-renderer", { path, data: null });
                } catch (err) {} //eslint-disable-line no-empty
            }

            service.purgeSettingsCache = function() {
                settingsCache = {};
                backendCommunicator.fireEvent("purge-settings-cache");
            };

            service.getGuardAgainstUnfollowUnhost = function() {
                let enabled = getDataFromFile('/settings/moderation/guardAgainstUnfollowUnhost');
                return enabled != null ? enabled : false;
            };

            service.setGuardAgainstUnfollowUnhost = function(enabled) {
                pushDataToFile('/settings/moderation/guardAgainstUnfollowUnhost', enabled === true);
            };

            service.getKnownBoards = function() {
                try {
                    // This feeds the boardService with known boards and their lastUpdated values.
                    let settingsDb = getSettingsFile();
                    let boards = settingsDb.getData("/boards");
                    return boards;
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.deleteKnownBoard = function(boardId) {
                // This will delete a known board if provided a board id.
                try {
                    deleteDataAtPath("/boards/" + boardId);
                } catch (err) {
                    logger.info(err);
                }
            };

            service.getBoardLastUpdatedDatetimeById = function(id) {
                // Preparing for data from settings.json/boards/$boardId/lastUpdated
                let lastUpdatedDatetime = null;
                // Check if data is present for given board
                try {
                    lastUpdatedDatetime = getSettingsFile().getData(
                        `/boards/${id}/lastUpdated`
                    );
                } catch (err) {
                    logger.info(
                        "We encountered an error, most likely there are no boards in file so we need to build the boards and save them first",
                        err
                    );
                }
                return lastUpdatedDatetime;
            };

            service.setBoardLastUpdatedDatetimeById = function(
                boardId,
                boardName,
                boardDate
            ) {
                // Building the board with ID and lastUpdated before pushing to settings
                let settingsBoard = {
                    boardId: boardId,
                    boardName: boardName,
                    lastUpdated: boardDate
                };
                pushDataToFile(`/boards/${boardId}`, settingsBoard);
            };

            service.getLastMixplayProjectId = function() {
                let projectId;
                try {
                    projectId = getSettingsFile().getData("/mixplay/lastProjectId");
                } catch (err) {
                    logger.warn(err);
                }
                return projectId;
            };

            service.setLastMixplayProjectId = function(id) {
                pushDataToFile("/mixplay/lastProjectId", id);
            };

            service.getActiveMixplayProjectId = function() {
                let projectId;
                try {
                    projectId = getSettingsFile().getData("/mixplay/activeProjectId");
                } catch (err) {
                    logger.warn(err);
                }
                return projectId;
            };

            service.setActiveMixplayProjectId = function(id) {
                pushDataToFile("/mixplay/activeProjectId", id);
            };

            service.getCustomScriptsEnabled = function() {
                return getDataFromFile("/settings/runCustomScripts") === true;
            };

            service.setCustomScriptsEnabled = function(enabled) {
                pushDataToFile("/settings/runCustomScripts", enabled === true);
            };

            service.isBetaTester = function() {
                let betaTester = getDataFromFile("/settings/beta");
                return betaTester != null ? betaTester : "No";
            };

            service.setBetaTester = function(isTester) {
                pushDataToFile("/settings/beta", isTester);
            };

            service.getEmulator = function() {
                let emulator = getDataFromFile("/settings/emulation");
                return emulator != null ? emulator : "Robotjs";
            };

            service.setEmulator = function(emulator) {
                pushDataToFile("/settings/emulation", emulator);
            };

            service.getViewerDB = function() {
                let viewerDB = getDataFromFile("/settings/viewerDB");

                // If viewerDB setting is not set, default to true to avoid future "cant find datapath" errors.
                if (viewerDB == null) {
                    logger.debug('Viewer DB setting not found. Defaulting to true.');
                    service.setViewerDB(true);
                    viewerDB = getDataFromFile("/settings/viewerDB");
                }
                return viewerDB != null ? viewerDB : true;
            };

            service.setViewerDB = function(status) {
                pushDataToFile("/settings/viewerDB", status);

                if (status === true) {
                    ipcRenderer.send("viewerDbConnect");
                } else {
                    ipcRenderer.send("viewerDbDisconnect");
                }
            };

            // Used for settings menu.
            service.getChatFeed = function() {
                let chatFeed = getDataFromFile("/settings/chatFeed");
                if (chatFeed === true) {
                    return "On";
                }
                return "Off";
            };

            // Used for the app itself.
            service.getRealChatFeed = function() {
                return getDataFromFile("/settings/chatFeed");
            };

            service.chatFeedEnabled = function() {
                return getDataFromFile("/settings/chatFeed");
            };

            service.setChatFeed = function(chatFeed) {
                pushDataToFile("/settings/chatFeed", chatFeed === true);
            };

            // Used for settings menu.
            service.getChatViewCount = function() {
                let chatViewCount = getDataFromFile("/settings/chatViewCount");
                if (chatViewCount === true) {
                    return "On";
                }
                return "Off";
            };

            service.setChatViewCount = function(chatViewCount) {
                pushDataToFile("/settings/chatViewCount", chatViewCount === true);
            };

            service.showViewerCount = function() {
                return getDataFromFile("/settings/chatViewCount");
            };

            // Used for settings menu.
            service.getChatViewerList = function() {
                let chatViewerList = getDataFromFile("/settings/chatViewerList");
                if (chatViewerList === true) {
                    return "On";
                }
                return "Off";
            };

            service.showViewerList = function() {
                return getDataFromFile("/settings/chatViewerList");
            };

            service.setChatViewerList = function(chatViewerList) {
                pushDataToFile("/settings/chatViewerList", chatViewerList === true);
            };

            service.isChatCompactMode = function() {
                let compact = getDataFromFile("/settings/chatCompactMode");
                return compact != null ? compact : false;
            };

            service.setChatCompactMode = function(compact) {
                pushDataToFile("/settings/chatCompactMode", compact === true);
            };

            service.chatAlternateBackgrounds = function() {
                let alternate = getDataFromFile('/settings/chatAlternateBackgrounds');
                return alternate != null ? alternate : true;
            };

            service.setChatAlternateBackgrounds = function(alternate) {
                pushDataToFile('/settings/chatAlternateBackgrounds', alternate === true);
            };

            service.setChatShowGifs = function(showGifs) {
                pushDataToFile('/settings/chatShowGifs', showGifs === true);
            };

            service.chatShowGifs = function() {
                let showGifs = getDataFromFile('/settings/chatShowGifs');
                return showGifs != null ? showGifs : true;
            };

            service.setChatShowStickers = function(showStickers) {
                pushDataToFile('/settings/chatShowStickers', showStickers === true);
            };

            service.chatShowStickers = function() {
                let showStickers = getDataFromFile('/settings/chatShowStickers');
                return showStickers != null ? showStickers : true;
            };

            service.chatHideDeletedMessages = function() {
                let hide = getDataFromFile('/settings/chatHideDeletedMessages');
                return hide != null ? hide : false;
            };

            service.setChatHideDeletedMessages = function(hide) {
                pushDataToFile('/settings/chatHideDeletedMessages', hide === true);
            };

            service.getOverlayCompatibility = function() {
                let overlay = getDataFromFile("/settings/overlayImages");
                return overlay != null ? overlay : "Other";
            };

            service.setOverlayCompatibility = function(overlay) {
                let overlaySetting = overlay === "OBS" ? overlay : "Other";
                pushDataToFile("/settings/overlayImages", overlaySetting);
            };

            service.getTheme = function() {
                let theme = getDataFromFile("/settings/theme");
                return theme != null ? theme : "Obsidian";
            };

            service.setTheme = function(theme) {
                pushDataToFile("/settings/theme", theme);
            };

            service.soundsEnabled = function() {
                let sounds = getDataFromFile("/settings/sounds");
                return sounds != null ? sounds : "On";
            };

            service.setSoundsEnabled = function(enabled) {
                pushDataToFile("/settings/sounds", enabled);
            };

            service.getActiveChatUserListEnabled = function() {
                let status = getDataFromFile("/settings/activeChatUsers/status");
                return status != null ? status : true;
            };

            service.setActiveChatUsers = function(status) {
                pushDataToFile("/settings/activeChatUsers/status", status);
            };

            service.getActiveChatUserListTimeout = function() {
                let inactiveTimer = getDataFromFile("/settings/activeChatUsers/inactiveTimer");
                return inactiveTimer != null ? inactiveTimer : "10";
            };

            service.setActiveChatUserListTimeout = function(inactiveTimer) {
                pushDataToFile("/settings/activeChatUsers/inactiveTimer", inactiveTimer);
            };

            service.getActiveMixplayUserListEnabled = function() {
                let status = getDataFromFile("/settings/activeMixplayUsers/status");
                return status != null ? status : true;
            };

            service.setActiveMixplayUsers = function(status) {
                pushDataToFile("/settings/activeMixplayUsers/status", status);
            };

            service.getActiveMixplayUserListTimeout = function() {
                let inactiveTimer = getDataFromFile("/settings/activeMixplayUsers/inactiveTimer");
                return inactiveTimer != null ? inactiveTimer : "10";
            };

            service.setActiveMixplayUserListTimeout = function(inactiveTimer) {
                pushDataToFile("/settings/activeMixplayUsers/inactiveTimer", inactiveTimer);
            };

            /*
            * 0 = off,
            * 1 = bugfix,
            * 2 = feature,
            * 3 = major release,
            * 4 = betas
            */
            service.getAutoUpdateLevel = function() {
                let updateLevel = getDataFromFile("/settings/autoUpdateLevel");
                return updateLevel != null ? updateLevel : 2;
            };

            service.setAutoUpdateLevel = function(updateLevel) {
                pushDataToFile("/settings/autoUpdateLevel", updateLevel);
            };

            service.notifyOnBeta = function() {
                let beta = getDataFromFile("/settings/notifyOnBeta");
                return beta != null ? beta : false;
            };

            service.setNotifyOnBeta = function(beta) {
                pushDataToFile("/settings/notifyOnBeta", beta === true);
            };

            service.isFirstTimeUse = function() {
                let ftu = getDataFromFile("/settings/firstTimeUse");
                return ftu != null ? ftu : true;
            };

            service.setFirstTimeUse = function(ftu) {
                pushDataToFile("/settings/firstTimeUse", ftu === true);
            };

            service.hasJustUpdated = function() {
                let updated = getDataFromFile("/settings/justUpdated");
                return updated != null ? updated : false;
            };

            service.setJustUpdated = function(justUpdated) {
                pushDataToFile("/settings/justUpdated", justUpdated === true);
            };

            service.getButtonViewMode = function(type) {
                if (type === "commands") {
                    let buttonViewMode = getDataFromFile(
                        "/settings/buttonViewModeCommands"
                    );
                    return buttonViewMode != null ? buttonViewMode : "list";
                }

                if (type === "liveEvents") {
                    let buttonViewMode = getDataFromFile(
                        "/settings/buttonViewModeLiveEvents"
                    );
                    return buttonViewMode != null ? buttonViewMode : "grid";
                }

                let buttonViewMode = getDataFromFile("/settings/buttonViewMode");
                return buttonViewMode != null ? buttonViewMode : "grid";
            };

            service.setButtonViewMode = function(buttonViewMode, type) {
                if (type === "commands") {
                    pushDataToFile("/settings/buttonViewModeCommands", buttonViewMode);
                } else if (type === "liveEvents") {
                    pushDataToFile("/settings/buttonViewModeLiveEvents", buttonViewMode);
                } else {
                    pushDataToFile("/settings/buttonViewMode", buttonViewMode);
                }
            };

            service.getOverlayVersion = function() {
                let version = getDataFromFile("/settings/copiedOverlayVersion");
                return version != null ? version : "";
            };

            service.setOverlayVersion = function(newVersion) {
                pushDataToFile("/settings/copiedOverlayVersion", newVersion.toString());
            };

            service.getWebServerPort = function() {
                let serverPort = getDataFromFile("/settings/webServerPort");
                return serverPort != null ? serverPort : 7472;
            };

            service.setWebServerPort = function(port) {
                // Ensure port is a number.
                if (!Number.isInteger(port)) {
                    return;
                }

                // Save to settings file for app front end
                pushDataToFile("/settings/webServerPort", port);

                let path = dataAccess.getPathInWorkingDir(
                    "/resources/overlay/js/port.js"
                );

                // Overwrite the 'port.js' file in the overlay settings folder with the new port
                fs.writeFile(path, `window.WEBSERVER_PORT = ${port}`, "utf8", () => {
                    logger.info(`Set overlay port to: ${port}`);
                });
            };

            service.getWebSocketPort = function() {
                return service.getWebServerPort();
            };

            service.setWebSocketPort = function(port) {
                return service.setWebServerPort(port);
            };

            service.setInactiveTimer = function(inactiveTimer) {
                console.log(inactiveTimer);
            };

            service.showOverlayInfoModal = function(instanceName) {
                utilityService.showOverlayInfoModal(instanceName);
            };

            service.showOverlayEventsModal = function() {
                utilityService.showOverlayEventsModal();
            };

            service.getOverlayEventsSettings = function() {
                let settings = getDataFromFile("/settings/eventSettings");
                return settings != null ? settings : {};
            };

            service.saveOverlayEventsSettings = function(eventSettings) {
                pushDataToFile("/settings/eventSettings", eventSettings);
            };

            service.sparkExemptionEnabled = function() {
                let enabled = getDataFromFile('/settings/sparkExemptionEnabled');
                return enabled != null ? enabled : false;
            };

            service.setSparkExemptionEnabled = function(enabled) {
                pushDataToFile('/settings/sparkExemptionEnabled', enabled === true);
            };

            service.mixPlayPreviewModeEnabled = function() {
                let enabled = getDataFromFile('/settings/mixplayPreviewMode');
                return enabled != null ? enabled : false;
            };

            service.setMixPlayPreviewModeEnabled = function(enabled) {
                pushDataToFile('/settings/mixplayPreviewMode', enabled === true);
            };

            service.centerGuideLinesEnabled = function() {
                let enabled = getDataFromFile('/settings/mixplayCenterGuideLines');
                return enabled != null ? enabled : false;
            };

            service.setCenterGuideLinesEnabled = function(enabled) {
                pushDataToFile('/settings/mixplayCenterGuideLines', enabled === true);
            };


            service.getClearCustomScriptCache = function() {
                let clear = getDataFromFile("/settings/clearCustomScriptCache");
                return clear != null ? clear : false;
            };

            service.setClearCustomScriptCache = function(clear) {
                pushDataToFile("/settings/clearCustomScriptCache", clear === true);
            };

            service.useOverlayInstances = function() {
                let oi = getDataFromFile("/settings/useOverlayInstances");
                return oi != null ? oi : false;
            };

            service.setUseOverlayInstances = function(oi) {
                pushDataToFile("/settings/useOverlayInstances", oi === true);
            };

            service.getOverlayInstances = function() {
                let ois = getDataFromFile("/settings/overlayInstances");
                return ois != null ? ois : [];
            };

            service.setOverlayInstances = function(ois) {
                pushDataToFile("/settings/overlayInstances", ois);
            };

            service.backupKeepAll = function() {
                let backupKeepAll = getDataFromFile("/settings/backupKeepAll");
                return backupKeepAll != null ? backupKeepAll : false;
            };

            service.setBackupKeepAll = function(backupKeepAll) {
                pushDataToFile("/settings/backupKeepAll", backupKeepAll === true);
            };

            service.backupOnExit = function() {
                let save = getDataFromFile("/settings/backupOnExit");
                return save != null ? save : true;
            };

            service.setBackupOnExit = function(backupOnExit) {
                pushDataToFile("/settings/backupOnExit", backupOnExit === true);
            };

            service.backupBeforeUpdates = function() {
                let backupBeforeUpdates = getDataFromFile(
                    "/settings/backupBeforeUpdates"
                );
                return backupBeforeUpdates != null ? backupBeforeUpdates : true;
            };

            service.setBackupBeforeUpdates = function(backupBeforeUpdates) {
                pushDataToFile(
                    "/settings/backupBeforeUpdates",
                    backupBeforeUpdates === true
                );
            };

            service.backupOnceADay = function() {
                let backupOnceADay = getDataFromFile("/settings/backupOnceADay");
                return backupOnceADay != null ? backupOnceADay : true;
            };

            service.setBackupOnceADay = function(backupOnceADay) {
                pushDataToFile("/settings/backupOnceADay", backupOnceADay === true);
            };

            service.maxBackupCount = function() {
                let maxBackupCount = getDataFromFile("/settings/maxBackupCount");
                return maxBackupCount != null ? maxBackupCount : 25;
            };

            service.setMaxBackupCount = function(maxBackupCount) {
                pushDataToFile("/settings/maxBackupCount", maxBackupCount);
            };

            service.getClipDownloadFolder = function() {
                let dlFolder = getDataFromFile('/settings/clips/downloadFolder');
                return dlFolder != null && dlFolder !== "" ? dlFolder : dataAccess.getPathInUserData("/clips/");
            };

            service.setClipDownloadFolder = function(filepath) {
                pushDataToFile('/settings/clips/downloadFolder', filepath);
            };

            service.getAudioOutputDevice = function() {
                let device = getDataFromFile("/settings/audioOutputDevice");
                return device != null
                    ? device
                    : { label: "System Default", deviceId: "default" };
            };

            service.setAudioOutputDevice = function(device) {
                pushDataToFile("/settings/audioOutputDevice", device);
            };

            service.getSidebarControlledServices = function() {
                let services = getDataFromFile("/settings/sidebarControlledServices");
                return services != null
                    ? services
                    : ["interactive", "chat", "constellation"];
            };

            service.setSidebarControlledServices = function(services) {
                pushDataToFile("/settings/sidebarControlledServices", services);
            };

            service.getTaggedNotificationSound = function() {
                let sound = getDataFromFile("/settings/chat/tagged/sound");
                return sound != null ? sound : { name: "None" };
            };

            service.setTaggedNotificationSound = function(sound) {
                pushDataToFile("/settings/chat/tagged/sound", sound);
            };

            service.getTaggedNotificationVolume = function() {
                let volume = getDataFromFile("/settings/chat/tagged/volume");
                return volume != null ? volume : 5;
            };

            service.setTaggedNotificationVolume = function(volume) {
                pushDataToFile("/settings/chat/tagged/volume", volume);
            };

            service.debugModeEnabled = function() {
                let globalSettings = dataAccess.getJsonDbInUserData("/global-settings");
                let enabled;
                try {
                    enabled = globalSettings.getData("/settings/debugMode");
                } catch (err) {} //eslint-disable-line no-empty
                return enabled != null ? enabled : false;
            };

            service.setDebugModeEnabled = function(enabled) {
                let globalSettings = dataAccess.getJsonDbInUserData("/global-settings");
                try {
                    globalSettings.push("/settings/debugMode", enabled === true);
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.getViewerColumnPreferences = function() {
                let prefs = getDataFromFile("/settings/viewerColumnPreferences");
                return prefs != null ? prefs : { lastSeen: true };
            };

            service.setViewerColumnPreferences = function(prefs) {
                pushDataToFile("/settings/viewerColumnPreferences", prefs);
            };

            service.deleteFromViewerColumnPreferences = function(columnName) {
                deleteDataAtPath("/settings/viewerColumnPreferences/" + columnName);
            };

            service.getExtraLifeParticipantId = function() {
                let id = getDataFromFile('/settings/extraLifeId');
                return id;
            };

            service.setExtraLifeParticipantId = function(id) {
                pushDataToFile('/settings/extraLifeId', id);
            };

            service.getDefaultTtsVoiceId = function() {
                let id = getDataFromFile('/settings/defaultTtsVoiceId');
                return id;
            };

            service.setDefaultTtsVoiceId = function(id) {
                pushDataToFile('/settings/defaultTtsVoiceId', id);
            };

            service.getTtsVoiceVolume = function() {
                let volume = getDataFromFile('/settings/ttsVoiceVolume');
                return volume !== undefined ? volume : 0.5;
            };

            service.setTtsVoiceVolume = function(volume) {
                pushDataToFile('/settings/ttsVoiceVolume', volume);
            };

            service.getTtsVoiceRate = function() {
                let rate = getDataFromFile('/settings/ttsVoiceRate');
                return rate !== undefined ? rate : 1;
            };

            service.setTtsVoiceRate = function(rate) {
                pushDataToFile('/settings/ttsVoiceRate', rate);
            };


            service.getWhileLoopEnabled = function() {
                let enabled = getDataFromFile('/settings/whileLoopEnabled');
                return enabled !== undefined ? enabled : false;
            };

            service.setWhileLoopEnabled = function(enabled) {
                pushDataToFile('/settings/whileLoopEnabled', enabled === true);
            };

            return service;
        });
}());
