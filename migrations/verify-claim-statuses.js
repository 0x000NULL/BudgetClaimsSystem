require('dotenv').config();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function verifyClaimStatuses() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        // Get all statuses
        const statuses = await Status.find().lean();
        console.log('\nAvailable statuses:', statuses.map(s => s.name));

        // Get claims statistics
        const totalClaims = await Claim.countDocuments();
        const validStatusClaims = await Claim.countDocuments({
            status: { $type: "objectId" }
        });
        const invalidStatusClaims = await Claim.find({
            status: { $not: { $type: "objectId" } }
        }).lean();

        console.log('\nClaims Statistics:');
        console.log(`Total claims: ${totalClaims}`);
        console.log(`Claims with valid status: ${validStatusClaims}`);
        console.log(`Claims with invalid status: ${invalidStatusClaims.length}`);

        if (invalidStatusClaims.length > 0) {
            console.log('\nSample invalid claims:');
            invalidStatusClaims.slice(0, 3).forEach(claim => {
                console.log({
                    id: claim._id,
                    claimNumber: claim.claimNumber,
                    status: claim.status,
                    statusType: typeof claim.status
                });
            });
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    verifyClaimStatuses();
} 