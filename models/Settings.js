const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['fileSize', 'fileCount', 'fileType']
    },
    settings: {
        photos: {
            type: Number,
            required: true,
            min: 0
        },
        documents: {
            type: Number,
            required: true,
            min: 0
        },
        invoices: {
            type: Number,
            required: true,
            min: 0
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update the updatedAt timestamp
settingsSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Pre-findOneAndUpdate middleware to update the updatedAt timestamp
settingsSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

// Static method to get settings by type
settingsSchema.statics.getSettingsByType = async function(type) {
    try {
        const settings = await this.findOne({ type });
        console.log(`Fetching settings for type ${type}:`, settings);
        // Return just the settings object, or null if not found
        return settings?.settings || null;
    } catch (error) {
        console.error(`Error fetching settings for type ${type}:`, error);
        return null;
    }
};

// Static method to update settings
settingsSchema.statics.updateSettings = async function(type, newSettings) {
    try {
        const result = await this.findOneAndUpdate(
            { type },
            {
                $set: {
                    type,
                    settings: newSettings,
                    updatedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true
            }
        );
        return result.settings;
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings; 