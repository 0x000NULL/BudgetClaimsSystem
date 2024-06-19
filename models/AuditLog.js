// models/AuditLog.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AuditLogSchema = new Schema({
    action: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
