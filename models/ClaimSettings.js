const mongoose = require('mongoose');

const INITIAL_CLAIM_NUMBER = 10000000; // Define constant for initial claim number

const claimSettingsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        enum: ['lastClaimNumber']
    },
    value: {
        type: Number,
        required: true,
        min: INITIAL_CLAIM_NUMBER - 1, // Set minimum value
        default: INITIAL_CLAIM_NUMBER - 1 // Set default to one less than initial
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the initialization method
claimSettingsSchema.statics.initializeSettings = async function() {
    try {
        const settings = await this.findOne({ type: 'lastClaimNumber' });
        if (!settings) {
            const newSettings = await this.create({
                type: 'lastClaimNumber',
                value: INITIAL_CLAIM_NUMBER - 1
            });
            return newSettings;
        }
        return settings;
    } catch (error) {
        console.error('Error initializing claim settings:', error);
        throw error;
    }
};

// Add verification and repair method
claimSettingsSchema.statics.verifyAndRepair = async function() {
    try {
        const settings = await this.findOne({ type: 'lastClaimNumber' });
        if (!settings || settings.value < INITIAL_CLAIM_NUMBER - 1) {
            await this.findOneAndUpdate(
                { type: 'lastClaimNumber' },
                { value: INITIAL_CLAIM_NUMBER - 1 },
                { upsert: true }
            );
        }
    } catch (error) {
        console.error('Error verifying claim settings:', error);
        throw error;
    }
};

// Update timestamp before saving
claimSettingsSchema.pre('save', function() {
    this.updatedAt = new Date();
});

// Update timestamp before updating
claimSettingsSchema.pre('findOneAndUpdate', function() {
    this.set({ updatedAt: new Date() });
});

const ClaimSettings = mongoose.model('ClaimSettings', claimSettingsSchema);

// Initialize settings when the model is first loaded
ClaimSettings.initializeSettings().catch(console.error);

// Run verification at startup
ClaimSettings.verifyAndRepair().catch(console.error);

module.exports = {
    ClaimSettings,
    INITIAL_CLAIM_NUMBER
}; 