require('dotenv').config();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function verifyClaims() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        // Get all statuses
        const statuses = await Status.find().lean();
        console.log('\nAvailable statuses:', statuses.map(s => ({
            name: s.name,
            id: s._id.toString()
        })));

        // Get a sample claim
        const sampleClaim = await Claim.findOne().populate('status').lean();
        console.log('\nSample claim:', {
            id: sampleClaim._id,
            claimNumber: sampleClaim.claimNumber,
            status: {
                id: sampleClaim.status?._id,
                name: sampleClaim.status?.name,
                color: sampleClaim.status?.color
            }
        });

        // Check for any claims with invalid status
        const invalidClaims = await Claim.find({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: { $type: 'string' } }
            ]
        }).lean();

        if (invalidClaims.length > 0) {
            console.log('\nFound invalid claims:', invalidClaims.map(c => ({
                id: c._id,
                claimNumber: c.claimNumber,
                status: c.status
            })));
        } else {
            console.log('\nAll claims have valid status references');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

if (require.main === module) {
    verifyClaims();
} 