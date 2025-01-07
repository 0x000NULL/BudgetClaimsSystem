const mongoose = require('mongoose');

const reportTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fields: [{
        name: String,
        source: String, // e.g., 'claims.customerName'
        label: String,
        type: String, // e.g., 'text', 'number', 'date'
        width: Number,
        sortable: Boolean,
        filterable: Boolean
    }],
    charts: [{
        type: String, // e.g., 'bar', 'line', 'pie'
        title: String,
        dataSource: String,
        options: mongoose.Schema.Types.Mixed
    }],
    conditions: [{
        field: String,
        operator: String, // e.g., 'equals', 'contains', 'greaterThan'
        value: mongoose.Schema.Types.Mixed,
        formatting: {
            textColor: String,
            backgroundColor: String,
            bold: Boolean,
            italic: Boolean
        }
    }],
    schedule: {
        enabled: Boolean,
        frequency: String, // e.g., 'daily', 'weekly', 'monthly'
        time: String,
        dayOfWeek: Number,
        dayOfMonth: Number,
        recipients: [{
            email: String,
            format: String // 'pdf', 'excel', 'csv'
        }]
    },
    accessControl: {
        roles: [String],
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date
});

module.exports = mongoose.model('ReportTemplate', reportTemplateSchema); 