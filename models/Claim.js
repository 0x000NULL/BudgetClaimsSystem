// Import required module
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a Claim
const ClaimSchema = new Schema({
    mva: {
        type: String,
        required: true // MVA is required
    },
    customerName: {
        type: String,
        required: true // Customer name is required
    },
    description: {
        type: String,
        required: true // Description is required
    },
    status: {
        type: String,
        default: 'Open' // Default status is 'Open'
    },
    date: {
        type: Date,
        default: Date.now // Default to the current date and time
    },
    files: [{
        type: String // Array of file names
    }]
});

// Create a model from the schema
const Claim = mongoose.model('Claim', ClaimSchema);

// Export the model
module.exports = Claim;
