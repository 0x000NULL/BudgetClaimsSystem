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

// Remove the pre-save hook that converts name to uppercase
// This allows preserving the original case of location names

module.exports = mongoose.model('Location', locationSchema);
