const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the schema for a User
const UserSchema = new Schema({
    name: {
        type: String,
        required: true // User name is required
    },
    email: {
        type: String,
        required: true, // User email is required
        unique: true // Email must be unique
    },
    password: {
        type: String,
        required: true // User password is required
    },
    role: {
        type: String,
        required: true, // User role is required
        enum: ['admin', 'manager', 'employee'], // Define possible roles
        default: 'employee' // Default role is employee
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false // 2FA is disabled by default
    },
    twoFactorSecret: {
        type: String // Secret for 2FA
    },
    date: {
        type: Date,
        default: Date.now // Default to current date and time
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
