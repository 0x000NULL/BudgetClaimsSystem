/**
 * @fileoverview This file defines the schema for claim templates in the Budget Claims System.
 * Claim templates allow employees to create reusable templates for common claim types,
 * which can be used to quickly create new claims with pre-filled information.
 * 
 * @requires mongoose
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for claim templates
 */
const ClaimTemplateSchema = new Schema({
    // Name of the template
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Description of the template
    description: {
        type: String,
        required: false,
        trim: true
    },
    // Category for organizing templates
    category: {
        type: String,
        required: false,
        trim: true
    },
    // Version of the template
    version: {
        type: Number,
        default: 1
    },
    // Whether the template is shared with other employees
    isShared: {
        type: Boolean,
        default: false
    },
    // User who created the template
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Default field values for the claim
    defaultValues: {
        type: Object,
        default: {}
    },
    // Configuration for required fields
    requiredFields: {
        type: [String],
        default: []
    },
    // Whether the template needs approval before use
    requiresApproval: {
        type: Boolean,
        default: false
    },
    // Approval status
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    // User who approved the template
    approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // Date when the template was approved
    approvedAt: {
        type: Date
    },
    // Whether the template is active
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create a model from the schema
const ClaimTemplate = mongoose.model('ClaimTemplate', ClaimTemplateSchema);

// Export the model
module.exports = ClaimTemplate; 