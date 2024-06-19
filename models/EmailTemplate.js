// models/EmailTemplate.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EmailTemplateSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    variables: [{
        type: String
    }]
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
