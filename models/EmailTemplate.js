// Import necessary modules
const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema class from Mongoose

// Define the EmailTemplate schema
const EmailTemplateSchema = new Schema({
    // Field for the name of the email template
    name: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for the subject of the email template
    subject: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for the body of the email template
    body: {
        type: String, // Data type is String
        required: true // This field is required
    },
    // Field for the variables used in the email template
    variables: [{
        type: String // Data type is String
    }]
});

// Export the EmailTemplate model
module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema); // Create and export the EmailTemplate model
