// Import necessary modules
const mongoose = require('mongoose'); // Import Mongoose to create schema and model
const bcrypt = require('bcryptjs'); // Import Bcrypt for hashing passwords

// Define the user schema with the necessary fields and their validations
const userSchema = new mongoose.Schema({
    // Define the 'name' field
    name: {
        type: String, // Data type is String
        required: true, // This field is required
        trim: true // Automatically trim whitespace from the value
    },
    // Define the 'email' field
    email: {
        type: String, // Data type is String
        required: true, // This field is required
        unique: true, // Ensure that each email is unique in the database
        trim: true, // Automatically trim whitespace from the value
        lowercase: true // Convert the value to lowercase
    },
    // Define the 'role' field - single source of truth for user role
    role: {
        type: String,
        enum: ['admin', 'manager', 'employee'],
        default: 'employee'
    },
    // Define the 'password' field
    password: {
        type: String, // Data type is String
        required: true, // This field is required
        minlength: 6 // Minimum length of the password is 6 characters
    }
}, {
    timestamps: true // Automatically add 'createdAt' and 'updatedAt' fields
});

// Pre-save hook to hash the password before saving it to the database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) { // If the password is not modified, proceed to the next middleware
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
        this.password = await bcrypt.hash(this.password, salt); // Hash the password with the generated salt
        next(); // Proceed to the next middleware
    } catch (err) {
        next(err); // Pass the error to the next middleware
    }
});

// Method to compare a given password with the hashed password stored in the database
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password); // Return the result of the comparison
};

// Create and export the User model based on the user schema
const User = mongoose.model('User', userSchema); // Create the User model
module.exports = User; // Export the User model
