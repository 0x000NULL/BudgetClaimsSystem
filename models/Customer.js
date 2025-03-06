const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection

// Define the schema for a Customer
const CustomerSchema = new Schema({
    // Field for the customer's name
    name: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for the customer's email
    email: {
        type: String, // Data type is String
        required: true, // This field is required
        unique: true // Email must be unique
    },
    // Field for the customer's password
    password: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for the associated claims
    claims: [{
        type: Schema.Types.ObjectId, // Data type is ObjectId
        ref: 'Claim' // Reference to the Claim model
    }]
}, {
    timestamps: true // Enable timestamps to keep track of creation and update times
});

// Create a model from the schema
const Customer = mongoose.model('Customer', CustomerSchema);

// Export the model
module.exports = Customer;
