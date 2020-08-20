"use strict";

const mixerRoleConstants = require("../../shared/mixer-roles");
const twitchRoleConstants = require("../../shared/twitch-roles");
const firebotRoleConstants = require("../../shared/firebot-roles");

(function() {

    angular
        .module("firebotApp")
        .factory("viewerRolesService", function(logger, backendCommunicator) {
            let service = {};

            let customRoles = {};

            service.loadCustomRoles = async function() {
                let roles = await backendCommunicator.fireEventAsync("getCustomRoles");
                if (roles != null) {
                    customRoles = roles;
                }
            };
            service.loadCustomRoles();

            backendCommunicator.on("custom-role-update", () => {
                service.loadCustomRoles();
            });

            service.getCustomRoles = function() {
                return Object.values(customRoles);
            };

            service.getCustomRole = function(id) {
                return customRoles[id];
            };

            service.addUserToRole = function(roleId, username) {
                if (!roleId || !username) return;

                let role = service.getCustomRole(roleId);
                if (!role) return;

                if (role.viewers.some(v => v.toLowerCase() === username.toLowerCase())) return;

                role.viewers.push(username);
                service.saveCustomRole(role);
            };


            service.removeUserFromRole = function(roleId, username) {
                if (!roleId || !username) return;

                let role = service.getCustomRole(roleId);
                if (!role) return;

                if (!role.viewers.some(v => v.toLowerCase() === username.toLowerCase())) return;

                role.viewers = role.viewers.filter(v => v.toLowerCase() !== username.toLowerCase());
                service.saveCustomRole(role);
            };

            service.saveCustomRole = function(role) {
                if (!role) return;
                customRoles[role.id] = role;
                backendCommunicator.fireEvent("saveCustomRole", role);
            };

            service.deleteCustomRole = function(roleId) {
                if (!roleId) return;
                delete customRoles[roleId];
                backendCommunicator.fireEvent("deleteCustomRole", roleId);
            };

            const firebotRoles = firebotRoleConstants.getFirebotRoles();
            service.getFirebotRoles = function() {
                return firebotRoles;
            };

            const mixerRoles = mixerRoleConstants.getMixerRoles();
            service.getMixerRoles = function() {
                return mixerRoles;
            };

            const twitchRoles = twitchRoleConstants.getTwitchRoles();
            service.getTwitchRoles = function() {
                return twitchRoles;
            };

            service.getAllRoles = () => {
                return service.getTwitchRoles().concat(service.getFirebotRoles()).concat(service.getCustomRoles());
            };

            service.getRoleById = function(id) {
                let customRole = customRoles[id];
                if (customRole != null) {
                    return customRole;
                }

                return twitchRoles.find(r => r.id === id);
            };

            service.doesRoleExist = function(id) {
                const role = service.getRoleById(id);
                return role != null;
            };

            return service;
        });
}());