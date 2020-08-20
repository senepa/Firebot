// Migration: done

"use strict";

const {
    EffectTrigger
} = require("../../effects/models/effectModels");

const { OutputDataType } = require("../../../shared/variable-contants");

let triggers = {};
triggers[EffectTrigger.EVENT] = ["streamlabs:donation", "streamlabs:eldonation", "tipeeestream:donation"];
triggers[EffectTrigger.MANUAL] = true;

const model = {
    definition: {
        handle: "donationAmountFormatted",
        description: "The amount (w/currency symbol) of a donation from StreamLabs/Tipeee/ExtraLife",
        triggers: triggers,
        possibleDataOutput: [OutputDataType.TEXT]
    },
    evaluator: (trigger) => {
        const formattedDonationAmount = (trigger.metadata.eventData && trigger.metadata.eventData.formattedDonationAmount) || 0;

        return formattedDonationAmount;
    }
};

module.exports = model;
