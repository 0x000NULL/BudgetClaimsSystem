const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const logger = require('../logger');
const Claim = require('../models/Claim');

/**
 * Process a rental agreement file and extract relevant information
 * @param {string} filePath - Path to the rental agreement file
 * @returns {Promise<Object>} Extracted data from the rental agreement
 */
async function processRentalAgreement(filePath) {
    try {
        // Read the file
        const dataBuffer = fs.readFileSync(filePath);
        
        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        
        let text;
        if (ext === '.pdf') {
            // Parse PDF
            const data = await pdf(dataBuffer);
            text = data.text;
        } else if (ext === '.doc' || ext === '.docx') {
            // For now, throw error for unsupported formats
            throw new Error('DOC/DOCX processing not yet implemented');
        } else {
            throw new Error('Unsupported file format');
        }

        // Define regex patterns for extraction
        const patterns = {
            raNumber: /RA\s*#?\s*:?\s*(\d+)/i,
            customerName: /Customer\s*Name\s*:?\s*([^\n]+)/i,
            customerNumber: /Customer\s*(?:#|Number|ID)\s*:?\s*(\w+)/i,
            customerEmail: /Email\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
            customerAddress: /Address\s*:?\s*([^\n]+)/i,
            customerDriversLicense: /Driver'?s?\s*License\s*:?\s*([A-Z0-9-]+)/i,
            carMake: /Make\s*:?\s*([^\n]+)/i,
            carModel: /Model\s*:?\s*([^\n]+)/i,
            carYear: /Year\s*:?\s*(\d{4})/i,
            carColor: /Color\s*:?\s*([^\n]+)/i,
            carVIN: /VIN\s*:?\s*([A-HJ-NPR-Z0-9]{17})/i,
            vehicleOdometer: /Odometer\s*:?\s*(\d+)/i,
            rentingLocation: /Location\s*:?\s*([^\n]+)/i,
            ldwAccepted: /LDW\s*Accepted\s*:?\s*(Yes|No)/i,
            rentersLiabilityInsurance: /Renter'?s?\s*Liability\s*Insurance\s*:?\s*(Yes|No)/i,
            lossDamageWaiver: /Loss\s*Damage\s*Waiver\s*:?\s*(Yes|No)/i
        };

        // Extract data using patterns
        const extractedData = {};
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            extractedData[key] = match ? match[1].trim() : null;

            // Convert boolean fields
            if (['ldwAccepted', 'rentersLiabilityInsurance', 'lossDamageWaiver'].includes(key)) {
                extractedData[key] = match ? match[1].toLowerCase() === 'yes' : false;
            }
        }

        // Validate required fields
        const requiredFields = ['raNumber', 'customerName', 'carVIN'];
        const missingFields = requiredFields.filter(field => !extractedData[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        logger.info('Successfully processed rental agreement', { raNumber: extractedData.raNumber });
        return extractedData;

    } catch (error) {
        logger.error('Error processing rental agreement:', error);
        throw new Error(`Failed to process rental agreement: ${error.message}`);
    }
}

/**
 * Generate a unique claim number
 * @returns {Promise<string>} Generated claim number
 */
async function generateClaimNumber() {
    try {
        // Get current year
        const year = new Date().getFullYear().toString().slice(-2);
        
        // Get the latest claim number for this year
        const latestClaim = await Claim.findOne({
            claimNumber: new RegExp(`^${year}-`, 'i')
        }).sort({ claimNumber: -1 });

        let sequence;
        if (latestClaim) {
            // Extract sequence number and increment
            const currentSequence = parseInt(latestClaim.claimNumber.split('-')[1]);
            sequence = (currentSequence + 1).toString().padStart(6, '0');
        } else {
            // Start with 000001 if no claims exist for this year
            sequence = '000001';
        }

        const claimNumber = `${year}-${sequence}`;
        logger.info('Generated new claim number:', { claimNumber });
        return claimNumber;

    } catch (error) {
        logger.error('Error generating claim number:', error);
        throw new Error('Failed to generate claim number');
    }
}

module.exports = {
    processRentalAgreement,
    generateClaimNumber
}; 