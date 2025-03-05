/**
 * @fileoverview This file defines the schema for customer appointments in the Budget Claims System.
 * Customer appointments allow customers to schedule meetings with employees regarding their claims.
 * 
 * @requires mongoose
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for customer appointments
 */
const CustomerAppointmentSchema = new Schema({
    // The claim this appointment is related to
    claim: {
        type: Schema.Types.ObjectId,
        ref: 'Claim',
        required: true
    },
    // The customer who scheduled the appointment
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    // The employee assigned to the appointment (if applicable)
    employee: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    // The appointment title
    title: {
        type: String,
        required: true,
        trim: true
    },
    // The appointment description
    description: {
        type: String,
        trim: true
    },
    // The appointment date and time
    appointmentDateTime: {
        type: Date,
        required: true
    },
    // The appointment duration in minutes
    duration: {
        type: Number,
        default: 30,
        min: 15,
        max: 120
    },
    // The appointment status
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'],
        default: 'scheduled'
    },
    // The appointment type
    type: {
        type: String,
        enum: ['in-person', 'phone', 'video'],
        default: 'phone'
    },
    // Additional notes for the appointment
    notes: {
        type: String,
        trim: true
    },
    // For video appointments, the meeting link
    meetingLink: {
        type: String,
        trim: true
    },
    // For phone appointments, the phone number to call
    phoneNumber: {
        type: String,
        trim: true
    },
    // For in-person appointments, the location
    location: {
        type: String,
        trim: true
    },
    // Reminder settings
    reminders: [{
        type: {
            type: String,
            enum: ['email', 'sms'],
            required: true
        },
        time: {
            type: Number, // Minutes before appointment
            required: true
        },
        sent: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

// Create indexes for faster queries
CustomerAppointmentSchema.index({ customer: 1, appointmentDateTime: 1 });
CustomerAppointmentSchema.index({ employee: 1, appointmentDateTime: 1 });
CustomerAppointmentSchema.index({ claim: 1 });
CustomerAppointmentSchema.index({ status: 1 });
CustomerAppointmentSchema.index({ appointmentDateTime: 1 });

// Create a model from the schema
const CustomerAppointment = mongoose.model('CustomerAppointment', CustomerAppointmentSchema);

// Export the model
module.exports = CustomerAppointment; 