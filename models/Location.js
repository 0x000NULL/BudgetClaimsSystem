const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        uniqueCaseInsensitive: true
    }
}, {
    timestamps: true
});

// Add a pre-save hook to convert name to uppercase
locationSchema.pre('save', function(next) {
    // Explicitly check for null and undefined
    if (this.name !== null && this.name !== undefined) {
        this.name = this.name.toUpperCase();
    }
    next();
});

const Location = mongoose.model('Location', locationSchema);
module.exports = { Location };
