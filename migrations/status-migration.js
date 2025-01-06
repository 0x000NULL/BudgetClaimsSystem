const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Migration script to convert claim statuses from arrays to ObjectId references
 */
async function migrateStatuses() {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI not found in environment variables');
        }
        
        console.log('Using MongoDB URI:', mongoUri);
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('Connected to MongoDB, starting migration...');

        // Get all claims and statuses
        const claims = await Claim.find({});
        const statuses = await Status.find({});
        
        console.log(`Found ${claims.length} claims to process`);
        console.log(`Available statuses: ${statuses.map(s => s.name).join(', ')}`);

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process each claim
        for (const claim of claims) {
            try {
                let currentStatus;
                
                // Handle different status formats
                if (Array.isArray(claim.status)) {
                    currentStatus = claim.status[0]; // Take first status from array
                } else if (typeof claim.status === 'string') {
                    currentStatus = claim.status;
                } else if (!claim.status) {
                    currentStatus = 'Open'; // Default status
                }

                // Skip if already a valid ObjectId
                if (mongoose.Types.ObjectId.isValid(claim.status) && 
                    !Array.isArray(claim.status) && 
                    typeof claim.status !== 'string') {
                    skipped++;
                    console.log(`Skipped claim ${claim.claimNumber} - already has valid status`);
                    continue;
                }

                // Find or create the status
                let statusDoc = await Status.findOne({ name: currentStatus });
                if (!statusDoc) {
                    statusDoc = await Status.create({ name: currentStatus });
                    console.log(`Created new status: ${currentStatus}`);
                }

                // Update the claim
                claim.status = statusDoc._id;
                await Claim.updateOne(
                    { _id: claim._id },
                    { $set: { status: statusDoc._id } },
                    { runValidators: false }
                );
                
                updated++;
                console.log(`Updated claim ${claim.claimNumber}: ${currentStatus} -> ${statusDoc._id}`);

            } catch (error) {
                errors++;
                console.error(`Error processing claim ${claim.claimNumber}:`, error);
            }
        }

        console.log('\nMigration completed:');
        console.log(`- Updated: ${updated} claims`);
        console.log(`- Skipped: ${skipped} claims`);
        console.log(`- Errors: ${errors} claims`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Close the MongoDB connection
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

// Run the migration if this file is run directly
if (require.main === module) {
    console.log('Starting status migration...\n');
    migrateStatuses()
        .then(() => {
            console.log('Migration script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = migrateStatuses; 