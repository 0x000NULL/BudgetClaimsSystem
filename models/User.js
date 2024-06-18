// Import required module
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a User
const UserSchema = new Schema({
    name: {
        type: String,
        required: true // Name is required
    },
    email: {
        type: String,
        required: true, // Email is required
        unique: true // Email must be unique
    },
    password: {
        type: String,
        required: true // Password is required
    },
    date: {
        type: Date,
        default: Date.now // Default to the current date and time
    }
});

// Create a model from the schema
const User = mongoose.model('User', UserSchema);

// Export the model
module.exports = User;
