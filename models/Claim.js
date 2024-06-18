const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection

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
        required: true, // Status is required
        enum: ['Open', 'In Progress', 'Closed'] // Define possible statuses
    },
    date: {
        type: Date,
        default: Date.now // Default to current date and time
    },
    files: [{
        type: String // Store file names
    }]
});

// Create a model from the schema
const Claim = mongoose.model('Claim', ClaimSchema);

// Export the model
module.exports = Claim;
