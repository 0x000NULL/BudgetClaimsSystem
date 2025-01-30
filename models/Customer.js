const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const pinoLogger = require('../logger');

/**
 * Customer Schema
 * @typedef {Object} Customer
 * @property {string} email - Customer's email address
 * @property {string} password - Hashed password
 * @property {string} firstName - Customer's first name
 * @property {string} lastName - Customer's last name
 * @property {string} phone - Customer's phone number
 * @property {string} address - Customer's address
 * @property {string} city - Customer's city
 * @property {string} state - Customer's state
 * @property {string} zipCode - Customer's ZIP code
 * @property {string} role - User role (always 'customer')
 * @property {Date} createdAt - Account creation date
 * @property {Date} lastLogin - Last login date
 * @property {boolean} isActive - Account status
 */
const CustomerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long']
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^\+?[\d\s-]{10,}$/, 'Please enter a valid phone number']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2
    },
    zipCode: {
        type: String,
        required: [true, 'ZIP code is required'],
        match: [/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code']
    },
    role: {
        type: String,
        default: 'customer',
        immutable: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Pre-save middleware to hash password
CustomerSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        pinoLogger.error({
            message: 'Error hashing password',
            error: error.message,
            customerId: this._id
        });
        next(error);
    }
});

// Method to compare password for login
CustomerSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        pinoLogger.error({
            message: 'Error comparing password',
            error: error.message,
            customerId: this._id
        });
        throw error;
    }
};

// Method to update last login
CustomerSchema.methods.updateLastLogin = async function() {
    try {
        this.lastLogin = new Date();
        await this.save();
    } catch (error) {
        pinoLogger.error({
            message: 'Error updating last login',
            error: error.message,
            customerId: this._id
        });
        throw error;
    }
};

// Virtual for full name
CustomerSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for full address
CustomerSchema.virtual('fullAddress').get(function() {
    return `${this.address}, ${this.city}, ${this.state} ${this.zipCode}`;
});

// Ensure virtuals are included in JSON output
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer; 