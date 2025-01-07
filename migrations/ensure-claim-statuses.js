require('dotenv').config();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function ensureClaimStatuses() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        // First ensure we have an Open status
        let openStatus = await Status.findOne({ name: 'Open' });
        if (!openStatus) {
            openStatus = await Status.create({
                name: 'Open',
                color: '#28a745',
                description: 'New claim that needs review'
            });
            console.log('Created Open status');
        }

        console.log('Open status:', openStatus);

        // Find all claims using aggregation to identify those needing updates
        const claims = await Claim.aggregate([
            {
                $match: {
                    $or: [
                        { status: { $exists: false } },
                        { status: null },
                        { 
                            $expr: {
                                $eq: [{ $type: "$status" }, "string"]
                            }
                        }
                    ]
                }
            }
        ]);

        console.log(`Found ${claims.length} claims to update`);

        // Update claims one by one
        for (const claimData of claims) {
            try {
                // Fetch the actual claim document
                const claim = await Claim.findById(claimData._id);
                if (!claim) {
                    console.log(`Claim ${claimData._id} not found`);
                    continue;
                }

                // Set the status to Open
                claim.status = openStatus._id;
                
                // Save with validation disabled to bypass schema restrictions
                await claim.save({ validateBeforeSave: false });
                
                console.log(`Updated claim ${claim.claimNumber || claim._id} with Open status`);
            } catch (error) {
                console.error(`Error processing claim ${claimData._id}:`, error);
            }
        }

        // Verify all claims have valid status references
        const invalidClaims = await Claim.find({
            status: { $not: { $type: "objectId" } }
        }).lean();

        if (invalidClaims.length > 0) {
            console.log(`Warning: ${invalidClaims.length} claims still have invalid status references`);
            console.log('Sample invalid claims:', invalidClaims.slice(0, 3));
        } else {
            console.log('All claims have valid status references');
        }

        console.log('Migration complete');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    ensureClaimStatuses();
}

module.exports = ensureClaimStatuses; 