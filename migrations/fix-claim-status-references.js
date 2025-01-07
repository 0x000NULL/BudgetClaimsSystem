require('dotenv').config();
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Status = require('../models/Status');

async function fixClaimStatusReferences() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);

        const claims = await Claim.find({});
        console.log(`Found ${claims.length} claims to process`);

        for (const claim of claims) {
            try {
                if (typeof claim.status === 'string') {
                    const status = await Status.findOne({ 
                        name: { $regex: new RegExp(`^${claim.status}$`, 'i') }
                    });
                    
                    if (status) {
                        claim.status = status._id;
                        await claim.save();
                        console.log(`Updated claim ${claim.claimNumber} status reference`);
                    }
                }
            } catch (error) {
                console.error(`Error processing claim ${claim.claimNumber}:`, error);
            }
        }

        console.log('Migration complete');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    fixClaimStatusReferences();
} 