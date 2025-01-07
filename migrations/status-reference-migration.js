const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Validate environment variables
if (!process.env.MONGO_URI) {
    console.error('ERROR: MONGO_URI is not defined in environment variables');
    process.exit(1);
}

async function migrateStatuses() {
    try {
        console.log('Starting status reference migration...');
        console.log(`Using MongoDB URI: ${process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully');

        // Get the native MongoDB collection
        const claimsCollection = mongoose.connection.db.collection('claims');

        // First, let's check what kinds of status values we have
        const statusTypes = await claimsCollection.aggregate([
            {
                $group: {
                    _id: { $type: "$status" },
                    count: { $sum: 1 },
                    examples: { $push: { id: "$_id", status: "$status" } }
                }
            }
        ]).toArray();

        console.log('\nStatus types in database:');
        console.log(JSON.stringify(statusTypes, null, 2));

        // Get all claims that need migration using native MongoDB query
        const claimsToMigrate = await claimsCollection.find({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: "" },
                { 
                    $and: [
                        { status: { $exists: true } },
                        { status: { $not: { $type: "objectId" } } }
                    ]
                }
            ]
        }).toArray();

        console.log(`\nFound ${claimsToMigrate.length} claims that need migration`);

        if (claimsToMigrate.length === 0) {
            console.log('No claims need migration. Exiting...');
            await mongoose.disconnect();
            return;
        }

        let processedCount = 0;
        let skippedCount = 0;
        let errors = [];

        // Get all existing statuses for reference
        const existingStatuses = await Status.find({}).lean();
        console.log(`Found ${existingStatuses.length} existing statuses`);

        for (const claim of claimsToMigrate) {
            try {
                console.log(`\nProcessing claim ${claim._id}:`);
                console.log('Original status:', claim.status);
                console.log('Status type:', typeof claim.status);

                // Determine the status string
                let statusString = 'Unknown';
                if (claim.status && typeof claim.status === 'string') {
                    statusString = claim.status.trim() || 'Unknown';
                }

                console.log('Using status string:', statusString);

                // Try to find existing status first
                let status = existingStatuses.find(s => 
                    s.name.toLowerCase() === statusString.toLowerCase()
                );

                if (!status) {
                    console.log(`Creating new status: ${statusString}`);
                    status = await Status.create({
                        name: statusString,
                        description: `Auto-created during migration for status: ${statusString}`
                    });
                    existingStatuses.push(status.toObject());
                }

                // Use native update to avoid Mongoose casting
                await claimsCollection.updateOne(
                    { _id: claim._id },
                    { $set: { status: new mongoose.Types.ObjectId(status._id) } }
                );
                processedCount++;

                console.log(`Updated claim ${claim._id} with status: ${status.name} (${status._id})`);
            } catch (error) {
                console.error(`Error processing claim ${claim._id}:`, error);
                errors.push({ claimId: claim._id, error: error.message });
            }
        }

        console.log('\nMigration completed');
        console.log(`Claims processed: ${processedCount}`);
        console.log(`Claims skipped: ${skippedCount}`);
        console.log(`Errors encountered: ${errors.length}`);
        
        if (errors.length > 0) {
            console.log('\nErrors:');
            errors.forEach(error => {
                console.log(`- Claim ${error.claimId}: ${error.error}`);
            });
        }

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

migrateStatuses().catch(error => {
    console.error('Unhandled error during migration:', error);
    process.exit(1);
}); 