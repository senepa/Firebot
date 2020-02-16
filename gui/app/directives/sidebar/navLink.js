"use strict";

(function() {
    angular.module("firebotApp").component("navLink", {
        bindings: {
            name: "@",
            page: "@",
            icon: "@",
            secondIcon: "@",
            isIndex: "<",
            badgeText: "<"
        },
        template: `
            <a draggable=false class="fb-nav-link" href="{{$ctrl.href}}" ng-class="{'selected': $ctrl.sbm.tabIsSelected($ctrl.page)}" ng-click="$ctrl.sbm.setTab($ctrl.page, $ctrl.name)"  uib-tooltip="{{!$ctrl.sbm.navExpanded ? $ctrl.name : ''}}" tooltip-placement="right" tooltip-append-to-body="true">
                <div class="nav-link-bar"></div>
                <div class="nav-link-icon" ng-class="{ stacked: $ctrl.stackedIcons() }">
                  <span class="nav-icon-wrapper">
                    <i ng-if="!$ctrl.stackedIcons()" ng-class="$ctrl.getFirstIconClass()"></i>
                    <span ng-if="$ctrl.stackedIcons()" class="fa-stack">
                        <i class="fa-stack-2x" ng-class="$ctrl.getSecondIconClass()"></i>
                        <i class="fa-stack-1x" style="margin-left: 3px;" ng-class="$ctrl.getFirstIconClass()"></i>
                    </span>
                  </span>
                </div>
                <div class="nav-link-title" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">{{$ctrl.name}}</div>
                <div ng-show="$ctrl.hasBadge" class="nav-update-badge" ng-class="{'contracted': !$ctrl.sbm.navExpanded}">
                    <span class="label label-danger">{{$ctrl.badgeText}}</span>
                </div>
            </a>
            `,
        controller: function(sidebarManager) {
            let ctrl = this;

            ctrl.sbm = sidebarManager;

            ctrl.$onInit = function() {
                ctrl.hasBadge = ctrl.badgeText != null && ctrl.badgeText !== "";
                ctrl.href = ctrl.isIndex
                    ? "#"
                    : "#!" + ctrl.page.toLowerCase().replace(/\W/g, "-");
            };

            ctrl.stackedIcons = () => {
                return ctrl.secondIcon != null;
            };

            ctrl.getFirstIconClass = function() {
                let isSelected = sidebarManager.tabIsSelected(ctrl.page);
                let stacked = ctrl.stackedIcons();
                return `${isSelected ? "fad" : (stacked ? "fas" : "fal")} ${ctrl.icon}`;
            };

            ctrl.getSecondIconClass = function() {
                return `fal ${ctrl.secondIcon}`;
            };
        }
    });
}());
