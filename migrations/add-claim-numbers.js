const mongoose = require('mongoose');
const Claim = require('../models/Claim');

async function migrateClaims() {
    try {
        // Find all claims without a claim number
        const claims = await Claim.find({ claimNumber: { $exists: false } });
        
        for (const claim of claims) {
            // Generate a new claim number
            claim.claimNumber = Math.floor(10000000 + Math.random() * 90000000).toString();
            await claim.save();
        }
        
        console.log(`Successfully migrated ${claims.length} claims`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.disconnect();
    }
}

migrateClaims(); 