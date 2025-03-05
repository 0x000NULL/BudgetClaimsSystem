const mongoose = require('mongoose');
const Status = require('../models/Status');

async function seedDefaultStatus() {
    try {
        const defaultStatus = await Status.findOne({ name: 'New' });
        if (!defaultStatus) {
            await Status.create({ name: 'New' });
            console.log('Default status created successfully');
        }
    } catch (error) {
        console.error('Error seeding default status:', error);
    }
}

// Call this function when initializing your application 