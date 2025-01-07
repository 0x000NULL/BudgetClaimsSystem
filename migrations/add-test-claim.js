require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function addTestClaim() {
    try {
        console.log('Connecting to MongoDB at:', process.env.MONGO_URI);
        
        // Get the 'Open' status
        const openStatus = await Status.findOne({ name: 'Open' });
        console.log('\nFound Open status:', openStatus);
        
        if (!openStatus) {
            throw new Error('Open status not found');
        }

        // First try to find existing claim
        let claim = await Claim.findOne({ claimNumber: 'TEST-001' });
        
        if (claim) {
            console.log('\nExisting claim found, updating...');
            claim.status = openStatus._id;
            claim.customerName = 'John Doe';
            claim.description = 'Test claim for system verification';
            claim.amount = 500.00;
            claim.updatedAt = new Date();
            await claim.save();
        } else {
            console.log('\nCreating new claim...');
            claim = new Claim({
                claimNumber: 'TEST-001',
                customerName: 'John Doe',
                status: openStatus._id,
                description: 'Test claim for system verification',
                amount: 500.00,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await claim.save();
        }

        console.log('\nClaim saved:', claim);

        // Try different population approaches
        console.log('\nTrying different population methods:');
        
        // Method 1: Direct populate
        const populated1 = await Claim.findById(claim._id)
            .populate('status')
            .lean();
        console.log('\nMethod 1 - Direct populate:');
        console.log(JSON.stringify(populated1, null, 2));

        // Method 2: Explicit model reference
        const populated2 = await Claim.findById(claim._id)
            .populate({
                path: 'status',
                model: 'Status',
                select: 'name color description'
            })
            .lean();
        console.log('\nMethod 2 - Explicit model reference:');
        console.log(JSON.stringify(populated2, null, 2));

        // Method 3: Raw aggregation
        const aggregated = await Claim.aggregate([
            { $match: { _id: claim._id } },
            {
                $lookup: {
                    from: 'statuses',
                    localField: 'status',
                    foreignField: '_id',
                    as: 'statusData'
                }
            },
            { $unwind: '$statusData' }
        ]);
        console.log('\nMethod 3 - Aggregation pipeline:');
        console.log(JSON.stringify(aggregated[0], null, 2));

    } catch (error) {
        console.error('Error adding test claim:', error);
        console.error('Error stack:', error.stack);
    }
}

if (require.main === module) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('Connected to MongoDB');
            return addTestClaim();
        })
        .then(() => {
            console.log('\nMigration complete');
            return mongoose.disconnect();
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = addTestClaim; 