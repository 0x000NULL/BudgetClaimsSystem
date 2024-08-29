const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Location = mongoose.model('Location', LocationSchema);
module.exports = Location;
