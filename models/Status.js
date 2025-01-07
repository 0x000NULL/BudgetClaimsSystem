const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    color: {
        type: String,
        default: '#007bff',  // Default blue color
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    active: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Case-insensitive search by name
statusSchema.statics.findByName = async function(name) {
    return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

const Status = mongoose.model('Status', statusSchema);

module.exports = Status;
