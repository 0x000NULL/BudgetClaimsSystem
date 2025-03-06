const mongoose = require('mongoose');

const DamageTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const DamageType = mongoose.model('DamageType', DamageTypeSchema);
module.exports = DamageType;
