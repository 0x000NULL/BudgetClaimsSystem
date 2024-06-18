const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection

// Define the schema for a Customer
const CustomerSchema = new Schema({
    name: {
        type: String,
        required: true // Customer name is required
    },
    email: {
        type: String,
        required: true, // Customer email is required
        unique: true // Email must be unique
    },
    password: {
        type: String,
        required: true // Customer password is required
    },
    claims: [{
        type: Schema.Types.ObjectId,
        ref: 'Claim' // Reference to associated claims
    }]
}, { timestamps: true }); // Enable timestamps to keep track of creation and update times

// Create a model from the schema
const Customer = mongoose.model('Customer', CustomerSchema);

// Export the model
module.exports = Customer;
