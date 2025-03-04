/**
 * @fileoverview This file defines the schema for customer satisfaction surveys in the Budget Claims System.
 * Customer surveys allow customers to provide feedback on their claim experience.
 * 
 * @requires mongoose
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for customer satisfaction surveys
 */
const CustomerSurveySchema = new Schema({
    // The claim this survey is related to
    claim: {
        type: Schema.Types.ObjectId,
        ref: 'Claim',
        required: true
    },
    // The customer who completed the survey
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    // Overall satisfaction rating (1-5)
    overallSatisfaction: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Communication rating (1-5)
    communicationRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Speed of resolution rating (1-5)
    speedRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Fairness rating (1-5)
    fairnessRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Ease of use rating (1-5)
    easeOfUseRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Would recommend (1-5)
    recommendationRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Comments
    comments: {
        type: String,
        trim: true
    },
    // Areas for improvement (multiple choice)
    areasForImprovement: [{
        type: String,
        enum: [
            'communication',
            'speed',
            'fairness',
            'ease_of_use',
            'customer_service',
            'documentation',
            'follow_up',
            'other'
        ]
    }],
    // Specific improvement suggestions
    improvementSuggestions: {
        type: String,
        trim: true
    },
    // Whether the customer allows follow-up contact
    allowFollowUp: {
        type: Boolean,
        default: false
    },
    // Whether the survey has been reviewed by staff
    isReviewed: {
        type: Boolean,
        default: false
    },
    // Staff member who reviewed the survey
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // Date when the survey was reviewed
    reviewedAt: {
        type: Date
    },
    // Staff notes on the survey (internal only)
    staffNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Create indexes for faster queries
CustomerSurveySchema.index({ claim: 1 });
CustomerSurveySchema.index({ customer: 1 });
CustomerSurveySchema.index({ overallSatisfaction: 1 });
CustomerSurveySchema.index({ isReviewed: 1 });
CustomerSurveySchema.index({ createdAt: -1 });

// Create a model from the schema
const CustomerSurvey = mongoose.model('CustomerSurvey', CustomerSurveySchema);

// Export the model
module.exports = CustomerSurvey; 