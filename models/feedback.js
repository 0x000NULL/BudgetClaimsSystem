const mongoose = require('mongoose'); // Import Mongoose to interact with MongoDB
const Schema = mongoose.Schema; // Use Schema to define the structure of documents in the collection

// Define the schema for Feedback
const FeedbackSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the user providing the feedback
        required: true // User is required
    },
    message: {
        type: String,
        required: true // Feedback message is required
    },
    type: {
        type: String,
        enum: ['Issue', 'Suggestion', 'General'], // Define possible feedback types
        default: 'General' // Default type is 'General'
    },
    date: {
        type: Date,
        default: Date.now // Default to current date and time
    }
});

// Create a model from the schema
const Feedback = mongoose.model('Feedback', FeedbackSchema);

// Export the model
module.exports = Feedback;
