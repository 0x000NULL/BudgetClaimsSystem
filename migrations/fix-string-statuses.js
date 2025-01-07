require('dotenv').config();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function fixStringStatuses() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        // Get the Open status
        const openStatus = await Status.findOne({ name: 'Open' });
        if (!openStatus) {
            throw new Error('Open status not found');
        }

        // Find all claims with string status using direct MongoDB query
        const claims = await mongoose.connection.collection('claims')
            .find({
                status: { $type: 'string' }
            })
            .toArray();

        console.log(`Found ${claims.length} claims with string status`);

        // Process claims in batches to avoid memory issues
        const batchSize = 50;
        for (let i = 0; i < claims.length; i += batchSize) {
            const batch = claims.slice(i, i + batchSize);
            console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(claims.length/batchSize)}`);

            for (const claim of batch) {
                try {
                    // Find matching status or use Open status
                    let statusId = openStatus._id;
                    if (claim.status) {
                        const matchingStatus = await Status.findOne({
                            name: { $regex: new RegExp(`^${claim.status}$`, 'i') }
                        });
                        if (matchingStatus) {
                            statusId = matchingStatus._id;
                        }
                    }

                    // Update claim directly using MongoDB
                    await mongoose.connection.collection('claims')
                        .updateOne(
                            { _id: claim._id },
                            { $set: { status: statusId } }
                        );

                    console.log(`Updated claim ${claim.claimNumber || claim._id} to status: ${statusId}`);
                } catch (error) {
                    console.error(`Error processing claim ${claim._id}:`, error);
                }
            }
        }

        // Verify the results
        const remainingStringStatuses = await mongoose.connection.collection('claims')
            .countDocuments({
                status: { $type: 'string' }
            });

        if (remainingStringStatuses > 0) {
            console.warn(`Warning: ${remainingStringStatuses} claims still have string statuses`);
        } else {
            console.log('All claims have been updated successfully');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        throw error; // Re-throw to trigger process.exit(1)
    } finally {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('Disconnected from MongoDB');
        }
    }
}

if (require.main === module) {
    fixStringStatuses()
        .then(() => {
            console.log('Migration complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = fixStringStatuses; 