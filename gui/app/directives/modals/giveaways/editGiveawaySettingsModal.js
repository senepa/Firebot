"use strict";

(function () {
    angular.module("firebotApp").component("editGiveawaySettingsModal", {
        template: `
            <div class="modal-header">
                <button type="button" class="close" aria-label="Close" ng-click="$ctrl.dismiss()"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">
                    <div style="font-size: 22px;">Edit Giveaway:</div>
                    <div style="font-weight:bold;font-size: 24px;">{{$ctrl.giveaway.name}}</div>
                </h4>
            </div>
            <div class="modal-body">

                <setting-container ng-if="$ctrl.giveaway.description">
                    <p>{{$ctrl.giveaway.description}}</p>
                </setting-container>

                <setting-container>
                    <div class="controls-fb-inline" style="margin-bottom: 12px;">
                        <label class="control-fb control--checkbox">Enabled
                            <input type="checkbox" ng-model="$ctrl.giveaway.active" aria-label="...">
                            <div class="control__indicator"></div>
                        </label>
                    </div>
                    <p class="muted" style="margin-top: 20px;">Note: Once enabled, you can view the associated !command for this giveaway and edit the trigger or tweak permissions in <strong>Commands</strong> tab > <strong>System Commands</strong></p>
                </setting-container>

                <setting-container ng-if="$ctrl.giveaway.settingCategories != null" ng-repeat="categoryMeta in $ctrl.settingCategoriesArray | orderBy:'sortRank'"  header="{{categoryMeta.title}}" description="{{categoryMeta.description}}" pad-top="$index > 0 ? true : false" collapsed="true">
                    <command-option ng-repeat="setting in categoryMeta.settingsArray | orderBy:'sortRank'"
                                name="setting.settingName"
                                metadata="setting"></command-option>
                </setting-container>

            </div>
            <div class="modal-footer sticky-footer edit-giveaway-footer">
                <button ng-show="$ctrl.giveaway != null" type="button" class="btn btn-danger pull-left" ng-click="$ctrl.resetToDefaults()">Reset to default</button>
                <button type="button" class="btn btn-link" ng-click="$ctrl.dismiss()">Cancel</button>
                <button ng-show="$ctrl.giveaway != null" type="button" class="btn btn-primary" ng-click="$ctrl.run()">Run</button>
            </div>
            <scroll-sentinel element-class="edit-giveaway-footer"></scroll-sentinel>
            `,
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&"
        },
        controller: function (ngToast, utilityService) {
            let $ctrl = this;

            $ctrl.giveaway = null;

            $ctrl.settingCategoriesArray = [];

            $ctrl.$onInit = function () {
                if ($ctrl.resolve.giveaway) {
                    $ctrl.giveaway = JSON.parse(JSON.stringify($ctrl.resolve.giveaway));
                    $ctrl.settingCategoriesArray = Object.values($ctrl.giveaway.settingCategories)
                        .map(sc => {
                            sc.settingsArray = [];
                            const settingNames = Object.keys(sc.settings);
                            for (const settingName of settingNames) {
                                const setting = sc.settings[settingName];
                                setting.settingName = settingName;
                                sc.settingsArray.push(setting);
                            }
                            return sc;
                        });
                } else {
                    $ctrl.dismiss();
                }
            };

            $ctrl.resetToDefaults = () => {
                utilityService
                    .showConfirmationModal({
                        title: `Reset To Defaults`,
                        question: `Are you sure you want reset ${$ctrl.giveaway.name} to default settings?`,
                        confirmLabel: "Reset",
                        confirmBtnType: "btn-danger"
                    })
                    .then(confirmed => {
                        if (confirmed) {
                            $ctrl.close({
                                $value: {
                                    giveawayId: $ctrl.giveaway.id,
                                    action: "reset"
                                }
                            });
                        }
                    });
            };

            function validate() {
                if ($ctrl.giveaway.settingCategories) {
                    for (let category of Object.values($ctrl.giveaway.settingCategories)) {
                        for (let setting of Object.values(category.settings)) {
                            if (setting.validation) {
                                if (setting.validation.required) {
                                    if (setting.type === 'string' && setting.value === "") {
                                        ngToast.create(`Please input a value for the ${setting.title} option`);
                                        return false;
                                    } else if (setting.type === 'editable-list' && (setting.value == null || setting.value.length === 0)) {
                                        ngToast.create(`Please input some text for the ${setting.title} option`);
                                        return false;
                                    } else if (setting.value === null || setting.value === undefined) {
                                        ngToast.create(`Please select/input a value for the ${setting.title} option`);
                                        return false;
                                    }
                                }
                                if (setting.type === "number") {
                                    if (!isNaN(setting.validation.min) && setting.value < setting.validation.min) {
                                        ngToast.create(`The value for the ${setting.title} option must be at least ${setting.validation.min}`);
                                        return false;
                                    }
                                    if (!isNaN(setting.validation.max) && setting.value > setting.validation.max) {
                                        ngToast.create(`The value for the ${setting.title} option must be no more than ${setting.validation.max}`);
                                        return false;
                                    }
                                }
                            }
                        }
                    }
                }
                return true;
            }

            $ctrl.run = () => {
                if (!validate()) return;
                $ctrl.close({
                    $value: {
                        giveaway: $ctrl.giveaway,
                        action: "save"
                    }
                });
            };
        }
    });
}());
