/**
 * @fileoverview This file defines the schema for customer messages in the Budget Claims System.
 * Customer messages are used for the secure messaging system between customers and employees.
 * 
 * @requires mongoose
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for customer messages
 */
const CustomerMessageSchema = new Schema({
    // The claim this message is related to
    claim: {
        type: Schema.Types.ObjectId,
        ref: 'Claim',
        required: true
    },
    // The customer who sent or received the message
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    // The employee who sent or received the message (if applicable)
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // The sender type (customer or employee)
    senderType: {
        type: String,
        enum: ['customer', 'employee'],
        required: true
    },
    // The message content
    content: {
        type: String,
        required: true,
        trim: true
    },
    // Whether the message has been read by the recipient
    isRead: {
        type: Boolean,
        default: false
    },
    // Attached files (if any)
    attachments: [{
        fileName: String,
        filePath: String,
        fileSize: Number,
        fileType: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Create indexes for faster queries
CustomerMessageSchema.index({ claim: 1, createdAt: -1 });
CustomerMessageSchema.index({ customer: 1, createdAt: -1 });
CustomerMessageSchema.index({ employee: 1, createdAt: -1 });
CustomerMessageSchema.index({ isRead: 1 });

// Create a model from the schema
const CustomerMessage = mongoose.model('CustomerMessage', CustomerMessageSchema);

// Export the model
module.exports = CustomerMessage; 