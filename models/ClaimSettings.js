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
                value: INITIAL_CLAIM_NUMBER - 1 // Start at one less than desired initial number
            });
            console.log('Initialized claim number settings:', newSettings);
            return newSettings;
        }
        return settings;
    } catch (error) {
        console.error('Error initializing claim settings:', error);
        throw error;
    }
};

// Update the verify and repair method
claimSettingsSchema.statics.verifyAndRepair = async function() {
    try {
        // Get the current settings
        let settings = await this.findOne({ type: 'lastClaimNumber' });
        
        if (!settings) {
            settings = await this.initializeSettings();
        }

        // Find the highest claim number in use
        const highestClaim = await mongoose.model('Claim').findOne({})
            .sort('-claimNumber')
            .select('claimNumber');

        if (highestClaim) {
            const highestNumber = parseInt(highestClaim.claimNumber, 10);
            // Ensure the value is at least INITIAL_CLAIM_NUMBER - 1
            const newValue = Math.max(highestNumber, INITIAL_CLAIM_NUMBER - 1);
            
            if (newValue > settings.value) {
                // Update settings to match highest claim number
                await this.findOneAndUpdate(
                    { type: 'lastClaimNumber' },
                    { value: newValue },
                    { new: true }
                );
                console.log('Updated claim number settings to:', newValue);
            }
        } else {
            // If no claims exist, ensure we start from INITIAL_CLAIM_NUMBER - 1
            await this.findOneAndUpdate(
                { type: 'lastClaimNumber' },
                { value: INITIAL_CLAIM_NUMBER - 1 },
                { new: true }
            );
            console.log('Reset claim number settings to initial value:', INITIAL_CLAIM_NUMBER - 1);
        }

        return true;
    } catch (error) {
        console.error('Error verifying claim numbers:', error);
        throw error;
    }
};

// Add middleware to update timestamp
claimSettingsSchema.pre('findOneAndUpdate', function() {
    this.set({ updatedAt: new Date() });
});

const ClaimSettings = mongoose.model('ClaimSettings', claimSettingsSchema);

// Initialize settings when the model is first loaded
ClaimSettings.initializeSettings().catch(console.error);

// Run verification at startup
ClaimSettings.verifyAndRepair().catch(console.error);

module.exports = {
    ClaimSettings: mongoose.model('ClaimSettings', claimSettingsSchema),
    INITIAL_CLAIM_NUMBER
}; 