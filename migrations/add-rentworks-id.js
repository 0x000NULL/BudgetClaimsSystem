const mongoose = require('mongoose');
const User = require('../models/User');

async function addRentworksIdField() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Add the field if it doesn't exist
        await User.collection.updateMany(
            { rentworksId: { $exists: false } },
            { $set: { rentworksId: null } }
        );

        console.log('Successfully added rentworksId field');
    } catch (error) {
        console.error('Error adding rentworksId field:', error);
    } finally {
        await mongoose.disconnect();
    }
}

addRentworksIdField(); 