const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a User
const UserSchema = new Schema({
    name: {
        type: String,
        required: true // User's name is required
    },
    email: {
        type: String,
        required: true, // User's email is required
        unique: true // Email must be unique
    },
    password: {
        type: String,
        required: true // User's password is required
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'employee'], // Define possible roles
        default: 'employee' // Default role is 'employee'
    },
    date: {
        type: Date,
        default: Date.now // Default to current date and time
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false // 2FA is disabled by default
    },
    twoFactorSecret: {
        type: String // Secret key for 2FA
    }
});

// Create a model from the schema
const User = mongoose.model('User', UserSchema);

// Export the model
module.exports = User;
