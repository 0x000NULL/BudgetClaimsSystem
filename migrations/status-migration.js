const mongoose = require('mongoose');
const Status = require('../models/Status');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Default statuses with descriptions
const DEFAULT_STATUSES = [
    {
        name: 'Open',
        description: 'Claim has been created but not yet processed'
    },
    {
        name: 'In Progress',
        description: 'Claim is currently being processed'
    },
    {
        name: 'Pending',
        description: 'Claim is awaiting additional information or action'
    },
    {
        name: 'Under Review',
        description: 'Claim is being reviewed by management'
    },
    {
        name: 'Approved',
        description: 'Claim has been approved for processing'
    },
    {
        name: 'Denied',
        description: 'Claim has been denied'
    },
    {
        name: 'Closed',
        description: 'Claim has been completed and closed'
    },
    {
        name: 'Cancelled',
        description: 'Claim has been cancelled'
    },
    {
        name: 'Unknown',
        description: 'Status is unknown or not specified'
    }
];

async function createStatuses() {
    try {
        console.log('Starting status migration...');
        console.log(`Using MongoDB URI: ${process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully');

        // Get existing statuses
        const existingStatuses = await Status.find({}).lean();
        console.log(`Found ${existingStatuses.length} existing statuses`);

        // Create missing statuses
        let createdCount = 0;
        let skippedCount = 0;
        let errors = [];

        for (const defaultStatus of DEFAULT_STATUSES) {
            try {
                const exists = existingStatuses.some(
                    status => status.name.toLowerCase() === defaultStatus.name.toLowerCase()
                );

                if (!exists) {
                    await Status.create(defaultStatus);
                    console.log(`Created status: ${defaultStatus.name}`);
                    createdCount++;
                } else {
                    console.log(`Status already exists: ${defaultStatus.name}`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`Error creating status ${defaultStatus.name}:`, error.message);
                errors.push({ status: defaultStatus.name, error: error.message });
            }
        }

        // List all statuses after migration
        const finalStatuses = await Status.find({}).lean();
        
        console.log('\nMigration completed');
        console.log(`Statuses created: ${createdCount}`);
        console.log(`Statuses skipped: ${skippedCount}`);
        console.log(`Errors encountered: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\nErrors:');
            errors.forEach(error => {
                console.log(`- ${error.status}: ${error.error}`);
            });
        }

        console.log('\nCurrent statuses in database:');
        finalStatuses.forEach(status => {
            console.log(`- ${status.name} (${status._id})`);
        });

    } catch (error) {
        console.error('\nMigration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Cleaning up...');
    await mongoose.disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Cleaning up...');
    await mongoose.disconnect();
    process.exit(0);
});

createStatuses().catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
}); 