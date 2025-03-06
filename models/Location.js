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
    if (this.name) {
        this.name = this.name.toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Location', locationSchema);
