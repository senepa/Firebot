"use strict";

const {ipcMain} = require('electron');

const FIREBOT_MIXPLAY_VERSION_ID = 334620;
const FIREBOT_MIXPLAY_SHARECODE = "moo33cku";

const { settings } = require('../common/settings-access');
const accountAccess = require('../common/account-access');
const logger = require("../logwrapper");

const mixplayManager = require('./mixplay-project-manager');

const controlManager = require("./control-manager");

// Setup mixer Interactive and make it a global variable for use throughout the app.
const interactive = require("@mixer/interactive-node");
const ws = require('ws');

interactive.setWebSocket(ws);
const mixplayClient = new interactive.GameClient();


function mapMixplayControl(firebotControl) {
    let mixplayControl = firebotControl.mixplay;

    mixplayControl.controlID = firebotControl.id;
    mixplayControl.kind = firebotControl.kind;
    mixplayControl.position = firebotControl.position;
    mixplayControl.disabled = !firebotControl.active;

    return mixplayControl;
}

function mapMixplayScene(firebotScene, id) {
    let mixplayScene = {
        sceneID: id,
        controls: []
    };

    if (firebotScene.controls) {
        for (let fbControl of firebotScene.controls) {
            let mixplayControl = mapMixplayControl(fbControl);
            mixplayScene.controls.push(mixplayControl);
        }
    }

    return mixplayScene;
}

function buildMixplayModalFromProject(project) {
    //copy the scenes to avoid issues with references
    let firebotScenes = JSON.parse(JSON.stringify(project.scenes));

    let defaultScene;
    let otherScenes = [];
    for (let fbScene of firebotScenes) {
        if (fbScene.id === project.defaultSceneId) {
            defaultScene = mapMixplayScene(fbScene, 'default');
        } else {
            otherScenes.push(mapMixplayScene(fbScene, fbScene.id));
        }
    }

    return {
        id: project.id,
        defaultScene: defaultScene,
        otherScenes: otherScenes,
        groups: []
    };
}

// Helper function factory to bind events
function addControlHandlers(controls) {
    const addHandler = (control, event) => {
        control.on(event, (inputEvent, participant) => {

            const inputData = inputEvent.input;
            const controlId = inputData.controlID;
            const control = mixplayClient.state.getControl(controlId);
            const sceneId = control.scene.sceneID;

            logger.debug(`Control event "${event}" for control "${inputData.controlID}" in scene "${sceneId}"`);

            controlManager.handleInput(event, sceneId, inputData, participant);
        });
    };

    controls.forEach(control => {
        addHandler(control, "mousedown");
        addHandler(control, "mouseup");
        addHandler(control, "keydown");
        addHandler(control, "keyup");
        addHandler(control, "submit");
        addHandler(control, "move");
    });
}

function connectToMixplay() {
    let currentProjectId = settings.getLastMixplayProjectId();

    let currentProject = mixplayManager.getProjectById(currentProjectId);

    let model = buildMixplayModalFromProject(currentProject);

    accountAccess.updateAccountCache();
    let accessToken = accountAccess.getAccounts().streamer.accessToken;

    console.log('Attempting to connect to interactive...');

    mixplayManager.setConnectedProjectId(currentProjectId);

    // Connect
    mixplayClient.open({
        authToken: accessToken,
        versionId: FIREBOT_MIXPLAY_VERSION_ID,
        sharecode: FIREBOT_MIXPLAY_SHARECODE
    }).then(() => {
        console.log('Connected to Interactive!');

        mixplayClient.synchronizeState()
            .then(() => {
                console.log('attempting to build default scene...');

                const defaultScene = mixplayClient.state.getScene('default');
                defaultScene.deleteAllControls();

                console.log('Cleared default scene.');

                return defaultScene.createControls(model.defaultScene.controls);
            })
            .then(() => {
                console.log('syncing scenes...');
                return mixplayClient.synchronizeScenes();
            })
            .then(scenes => {

                console.log('synced scenes');

                scenes.forEach(scene => {
                    let controls = scene.getControls();

                    console.log('adding controls');
                    console.log(controls);

                    addControlHandlers(controls);
                    //console.log(mixplayClient.state.getScene(scene.sceneID).getControls());
                    /*logger.info("Scene Controls: " + scene.);
                    */
                });
            })
            .then(() => {
                // create groups
            })
            .then(() => {
                mixplayClient.ready(true);
                renderWindow.webContents.send('connection', "Online");
            });
    }, reason => {
        logger.error("Failed to connect to MixPlay.", reason);
        mixplayManager.setConnectedProjectId(null);
    });
}

mixplayClient.on('error', err => {
    console.log("FAILED TO CONNECT", err);

    renderWindow.webContents.send('connection', "Offline");
});

mixplayClient.state.on('participantJoin', participant => {
    console.log(`${participant.username} (${participant.sessionID}) Joined`);
});

// Auth Process
// This kicks off the login process once refresh tokens are recieved.
ipcMain.on("gotRefreshToken", function() {
    connectToMixplay();
});