"use strict";
(function() {
    const moment = require('moment');

    const uuid = require("uuid/v4");

    angular
        .module('firebotApp')
        .factory('chatMessagesService', function ($rootScope, logger, listenerService, settingsService,
            soundService, connectionService, $timeout, $interval, $http, backendCommunicator) {
            let service = {};

            // Chat Message Queue
            service.chatQueue = [];

            // the number of messages to show at any given time. This helps performance
            service.chatMessageDisplayLimit = 75;

            // Chat User List
            service.chatUsers = [];

            // Tells us if we should process in app chat or not.
            service.getChatFeed = function() {
                return settingsService.getRealChatFeed();
            };

            // Return the chat queue.
            service.getChatQueue = function() {
                return service.chatQueue;
            };

            // Clear Chat Queue
            service.clearChatQueue = function() {
                service.chatQueue = [];
            };

            // Return User List
            service.getChatUsers = function() {
                // Sort list so we are in alphabetical order
                let userList = service.chatUsers;
                if (userList.length > 0) {
                    userList.sort(function(a, b) {
                        return a.username.localeCompare(b.username);
                    });
                }
                return userList;
            };

            // Clear User List
            service.clearUserList = function() {
                service.chatUsers = [];
            };

            // Full Chat User Refresh
            // This replaces chat users with a fresh list pulled from the backend in the chat processor file.
            service.chatUserRefresh = function(data) {
                let users = data.chatUsers.map(u => {
                    u.id = u.userId;
                    return u;
                });
                service.chatUsers = users;
            };

            // User joined the channel.
            service.chatUserJoined = function (data) {
                if (!service.chatUsers.some(u => u.id === data.id)) {
                    service.chatUsers.push(data);
                }
            };

            // User left the channel.
            service.chatUserLeft = function(data) {
                let userId = data.id,
                    arr = service.chatUsers,
                    userList = arr.filter(x => x.id !== userId);

                service.chatUsers = userList;
            };

            // Delete Chat Message
            service.deleteChatMessage = function(data) {
                let arr = service.chatQueue,
                    message = arr.find(message => message.id === data.id);

                if (message) {
                    message.deleted = true;
                    message.eventInfo = "Deleted by " + data.moderator.user_name + '.';
                }

            };

            // Purge Chat Message
            service.purgeChatMessages = function(data) {
                let chatQueue = service.chatQueue;

                let cachedUserName = null;
                chatQueue.forEach(message => {
                    // If user id matches, then mark the message as deleted.
                    if (message.user_id === data.user_id) {
                        if (cachedUserName == null) {
                            cachedUserName = message.user_name;
                        }
                        message.deleted = true;

                        let modName = "a mod";
                        if (data.moderator) {
                            modName = data.moderator.user_name;
                        }
                        message.eventInfo = `Purged by ${modName}.`;

                    }
                });

                if (data.cause && cachedUserName) {
                    if (data.cause.type === "timeout") {
                        service.chatAlertMessage(`${cachedUserName} was timed out by ${data.moderator.user_name} for ${data.cause.durationString}.`);
                    } else if (data.cause.type === "ban") {
                        service.chatAlertMessage(`${cachedUserName} was banned by ${data.moderator.user_name}.`);
                    }
                }
            };

            // Chat Alert Message
            service.chatAlertMessage = function(message) {
                let data = {
                    id: "System" + uuid(),
                    user_name: "Alert", // eslint-disable-line
                    user_id: "firebot-system-message", // eslint-disable-line
                    user_roles: [ // eslint-disable-line
                        "System"
                    ],
                    user_avatar: "../images/logo.png", // eslint-disable-line
                    message: {
                        message: [
                            {
                                type: "text",
                                data: message,
                                firebotSubsegments: [
                                    {
                                        type: "rawText",
                                        text: message
                                    }
                                ]
                            }
                        ],
                        meta: {
                            me: true
                        }
                    },
                    messageHTML: message,
                    date: new Date(),
                    whisper: false,
                    action: true,
                    mainColorRole: "System",
                    subscriber: false,
                    timestamp: moment(new Date()).format('h:mm A')
                };
                //service.chatQueue.push(data);
            };

            backendCommunicator.on("chat-feed-system-message", (message) => {
                service.chatAlertMessage(message);
            });

            // Poll Update
            // This is fired when a poll starts or is updated.
            // Mixer fires this every second or so, but we only display chat alerts every 30 seconds.
            service.pollUpdate = function(data) {
                // If we aren't running a poll, display data right away. Otherwise display update every 30 seconds.
                if (
                    service.pollCache === false ||
          service.pollCache >= data.duration + 30000
                ) {
                    let votes = data.responses,
                        stringHolder = [],
                        answers = [];

                    // Parse vote data so we can form a string out of it.
                    Object.keys(votes).forEach(key => {
                        stringHolder.push(key + " (" + votes[key] + " votes)");
                    });

                    // If more than one answer, join it together into a string.
                    if (stringHolder.length > 1) {
                        answers = stringHolder.join(", ");
                    } else {
                        answers = stringHolder[0];
                    }

                    service.chatAlertMessage(
                        data.author.user_name +
              " is running a poll. Question: " +
              data.q +
              ". Answers: " +
              answers +
              "."
                    );

                    // Update Poll Cache
                    service.pollCache = data.duration;
                }
            };

            // Poll End
            // This will find the winner(s) and output an alert to chat.
            service.pollEnd = function(data) {
                let answers = data.responses,
                    winners = [],
                    winnerVotes = 0;
                Object.keys(answers).forEach(key => {
                    let answerVotes = answers[key];
                    if (answerVotes === winnerVotes) {
                        // We have a tie, push to the winner array.
                        winners.push(key);
                        winnerVotes = answerVotes;
                    } else if (answerVotes > winnerVotes) {
                        // This one has more votes. Clear winner array so far and push this one in there.
                        winners = [];
                        winners.push(key);
                        winnerVotes = answerVotes;
                    }
                });
                winners = winners.join(", ");
                service.chatAlertMessage(
                    data.author.user_name +
            "'s poll has ended. Question: " +
            data.q +
            ". Winner(s): " +
            winners +
            "."
                );

                // Clear poll cache.
                service.pollCache = false;
            };

            // User Update
            // This is sent when a user's roles are updated. For example, when someone is banned.
            // Currently, this only checks for bans. It does not automatically unban the user after.
            // Reason is, people can be added to our banned user group without being banned from the channel.
            // But we're assuming here that if they're banned from the channel we should ban them from interactive always.
            service.userUpdate = function(data) {
            };

            // Chat Update Handler
            // This handles all of the chat stuff that isn't a message.
            // This will only work when chat feed is turned on in the settings area.
            service.chatUpdateHandler = function(data) {
                switch (data.fbEvent) {
                case "ClearMessages":
                    logger.info("Chat cleared");
                    service.clearChatQueue();

                    service.chatAlertMessage('Chat has been cleared by ' + data.clearer.user_name + '.');
                    break;
                case "DeleteMessage":
                    logger.info("Chat message deleted");
                    service.deleteChatMessage(data);
                    break;
                case "PurgeMessage":
                    logger.info("Chat message purged");
                    service.purgeChatMessages(data);
                    break;
                case "PollStart":
                    service.pollUpdate(data);
                    break;
                case "PollEnd":
                    service.pollEnd(data);
                    break;
                case "UserJoin":
                    logger.debug("Chat User Joined");

                    // Standardize user roles naming.
                    data.user_roles = data.roles; // eslint-disable-line

                    service.chatUserJoined(data);
                    break;
                case "UserLeave":
                    logger.debug("Chat User Left");

                    // Standardize user roles naming.
                    data.user_roles = data.roles; // eslint-disable-line

                    service.chatUserLeft(data);
                    break;
                case "UserUpdate":
                    logger.debug("User updated");
                    service.userUpdate(data);
                    break;
                case "Disconnected":
                    // We disconnected. Clear messages, post alert, and then let the reconnect handle repopulation.
                    logger.info("Chat Disconnected!");
                    service.clearChatQueue();
                    service.chatAlertMessage("Chat has been disconnected.");
                    break;
                case "UsersRefresh":
                    logger.info("Chat userlist refreshed.");
                    service.chatUserRefresh(data);
                    break;
                case "ChatAlert":
                    logger.debug("Chat alert from backend.");
                    service.chatAlertMessage(data.message);
                    break;
                default:
                    // Nothing
                    logger.warn("Unknown chat event sent", data);
                }
            };

            // Prune Messages
            // If message count is over 200, prune down
            service.pruneChatQueue = function() {
                let arr = service.chatQueue,
                    overflowChat = arr.length - service.chatMessageDisplayLimit * 2;

                // Overflow chat is how many messages we need to remove to bring it back down
                // to service.chatMessageDisplayLimit x 2.
                if (overflowChat > 0) {

                    // Recalculate to overflow over the set display limit so we arent pruning after every
                    // message once we hit chatMessageDisplayLimit x 2.
                    let bufferOverflowAmmount = arr.length - service.chatMessageDisplayLimit;

                    // Start at 0 in the array and delete X number of messages.
                    // The oldest messages are the first ones in the array.
                    arr.splice(0, bufferOverflowAmmount);
                }
            };

            service.getSubIcon = function() {
                return "";
            };

            service.levels = {};


            // This submits a chat message to mixer.
            service.submitChat = function(sender, message) {
                backendCommunicator.send("send-chat-message", {
                    message: message,
                    accountType: sender
                });
            };

            // Gets view count setting for ui.
            service.getChatViewCountSetting = function() {
                let viewCount = settingsService.getChatViewCount();
                if (viewCount === "On") {
                    return true;
                }
                return false;
            };

            // Gets view count setting for ui.
            service.getChatViewerListSetting = function() {
                let viewerList = settingsService.getChatViewerList();
                if (viewerList === "On") {
                    return true;
                }
                return false;
            };

            service.deleteMessage = messageId => {
                backendCommunicator.send("delete-message", messageId);
            };

            service.changeModStatus = (username, shouldBeMod) => {
                backendCommunicator.send("update-user-mod-status", {
                    username,
                    shouldBeMod
                });
            };


            let messageHoldingQueue = [];

            $interval(() => {
                if (messageHoldingQueue.length > 0) {
                    service.chatQueue = service.chatQueue.concat(messageHoldingQueue);
                    messageHoldingQueue = [];

                    // Trim messages.
                    service.pruneChatQueue();

                    //hacky way to ensure we stay scroll glued
                    $timeout(() => {
                        $rootScope.$broadcast('ngScrollGlue.scroll');
                    }, 1);
                }
            }, 250);

            backendCommunicator.on("twitch:chat:rewardredemption", redemption => {
                if (settingsService.getRealChatFeed()) {

                    const redemptionItem = {
                        id: uuid(),
                        type: "redemption",
                        data: redemption
                    };

                    if (messageHoldingQueue && messageHoldingQueue.length > 0) {
                        const lastQueueItem = messageHoldingQueue[messageHoldingQueue.length - 1];
                        if (!lastQueueItem.rewardMatched &&
                            lastQueueItem.type === "message" &&
                            lastQueueItem.data.customRewardId != null &&
                            lastQueueItem.data.customRewardId === redemption.reward.id &&
                            lastQueueItem.data.userId === redemption.user.id) {
                            lastQueueItem.rewardMatched = true;
                            messageHoldingQueue.splice(-1, 0, redemptionItem);
                            return;
                        }
                    }

                    messageHoldingQueue.push(redemptionItem);
                }
            });


            backendCommunicator.on("twitch:chat:message", chatMessage => {
                if (chatMessage.tagged) {
                    soundService.playChatNotification();
                }

                const now = moment();
                chatMessage.timestamp = now;
                chatMessage.timestampDisplay = now.format('h:mm A');

                if (chatMessage.profilePicUrl == null) {
                    chatMessage.profilePicUrl = "../images/placeholders/default-profile-pic.png";
                }

                if (settingsService.getRealChatFeed()) {
                    // Push new message to queue.
                    const messageItem = {
                        id: uuid(),
                        type: "message",
                        data: chatMessage
                    };

                    if (chatMessage.customRewardId != null &&
                        messageHoldingQueue &&
                        messageHoldingQueue.length > 0) {
                        const lastQueueItem = messageHoldingQueue[messageHoldingQueue.length - 1];
                        if (lastQueueItem.type === "redemption" &&
                            lastQueueItem.data.reward.id === chatMessage.customRewardId &&
                            lastQueueItem.data.user.id === chatMessage.userId) {
                            messageItem.rewardMatched = true;
                        }
                    }

                    messageHoldingQueue.push(messageItem);
                }
            });

            // Watches for an chat update from main process
            // This handles clears, deletions, timeouts, etc... Anything that isn't a message.
            listenerService.registerListener(
                { type: listenerService.ListenerType.CHAT_UPDATE },
                data => {
                    if (settingsService.getRealChatFeed() === true) {
                        service.chatUpdateHandler(data);
                    }
                }
            );

            // Connection Monitor
            // Recieves event from main process that connection has been established or disconnected.
            listenerService.registerListener(
                { type: listenerService.ListenerType.CHAT_CONNECTION_STATUS },
                isChatConnected => {
                    if (isChatConnected) {
                        service.chatQueue = [];
                    }
                }
            );

            return service;
        });
}());
