require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Status = require('../models/Status');

const defaultStatuses = [
    {
        name: 'Open',
        color: '#28a745', // Green
        description: 'New claim that needs review'
    },
    {
        name: 'In Progress',
        color: '#ffc107', // Yellow
        description: 'Claim is being processed'
    },
    {
        name: 'Closed',
        color: '#dc3545', // Red
        description: 'Claim has been resolved'
    }
];

async function addDefaultStatuses() {
    try {
        console.log('Connecting to MongoDB at:', process.env.MONGO_URI);
        
        for (const status of defaultStatuses) {
            console.log('Adding/updating status:', status.name);
            const result = await Status.findOneAndUpdate(
                { name: status.name },
                status,
                { upsert: true, new: true }
            );
            console.log('Status saved:', result);
        }
        console.log('Default statuses added successfully');
    } catch (error) {
        console.error('Error adding default statuses:', error);
    }
}

// Run this script directly or call this function from your app initialization
if (require.main === module) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('Connected to MongoDB');
            return addDefaultStatuses();
        })
        .then(() => {
            console.log('Migration complete');
            return mongoose.disconnect();
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addDefaultStatuses; 