const mongoose = require('mongoose');
const { ClaimSettings, INITIAL_CLAIM_NUMBER } = require('../models/ClaimSettings');
const Claim = require('../models/Claim');
require('dotenv').config();

async function initializeClaimNumbers() {
    try {
        // Connect to MongoDB using the MONGO_URI from .env
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find all claims and sort by date
        const claims = await Claim.find().sort({ date: 1 });
        
        // Initialize the counter starting at INITIAL_CLAIM_NUMBER
        let counter = INITIAL_CLAIM_NUMBER;
        
        console.log(`Found ${claims.length} claims to update`);
        
        // Update each claim with a sequential number
        for (const claim of claims) {
            const newClaimNumber = counter.toString().padStart(8, '0');
            console.log(`Updating claim ${claim._id} with new number: ${newClaimNumber}`);
            
            // Update directly using updateOne to bypass middleware
            await Claim.updateOne(
                { _id: claim._id },
                { $set: { claimNumber: newClaimNumber } }
            );
            
            counter++;
        }

        // Set the last claim number in settings
        const lastNumber = Math.max(counter - 1, INITIAL_CLAIM_NUMBER - 1);
        await ClaimSettings.findOneAndUpdate(
            { type: 'lastClaimNumber' },
            { value: lastNumber },
            { upsert: true }
        );

        console.log(`Successfully initialized claim numbers. Last number used: ${lastNumber}`);
        process.exit(0);
    } catch (error) {
        console.error('Error initializing claim numbers:', error);
        process.exit(1);
    }
}

initializeClaimNumbers(); 