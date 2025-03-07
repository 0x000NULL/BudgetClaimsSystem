/**
 * @file processRentalAgreement.js
 * @description Script to process rental agreement PDFs using document templates
 */

const path = require('path');
const { extractTextFromPDF } = require('./pdfService');
const { 
    getTemplate, 
    processFieldExtraction, 
    detectTemplateVersion, 
    calculateFieldConfidence 
} = require('./documentTemplates');
const logger = require('../logger');

const processRentalAgreement = async (pdfPath) => {
    let pdfData = null;
    let template = null;
    
    try {
        // Validate input
        if (!pdfPath) {
            throw new Error('PDF path is required');
        }
        if (!path.isAbsolute(pdfPath)) {
            pdfPath = path.resolve(process.cwd(), pdfPath);
        }

        // Extract text from PDF with error handling
        try {
            pdfData = await extractTextFromPDF(pdfPath);
            if (!pdfData || !pdfData.text) {
                throw new Error('Failed to extract text from PDF');
            }
            const pdfText = pdfData.text;
            
            console.log('\nExtracted Text from PDF:');
            console.log('------------------------');
            console.log(pdfText);

            // Get the template with version detection
            template = getTemplate('standardRentalAgreement', pdfText);
            if (!template) {
                throw new Error('Failed to get document template');
            }
            
            console.log('\nTemplate Version:');
            console.log('----------------');
            console.log(`Detected Version: ${template.detectedVersion.versionId}`);
            console.log(`Version Confidence: ${template.detectedVersion.confidence}`);
            console.log(`Matched Features: ${template.detectedVersion.matchedFeatures?.length || 0}/${template.detectedVersion.totalFeatures || 0}`);
            
            // Validate template confidence
            if (template.detectedVersion.confidence < 0.5) {
                logger.warn('Low confidence in template version detection');
            }
            
            console.log('\nProcessing Fields:');
            console.log('-----------------');
            
            // Process each field in the template
            const extractedData = {};
            const fieldResults = {};
            const errors = [];
            let overallConfidence = 0;
            let processedFields = 0;
            let requiredFieldsMissing = [];

            for (const [fieldName, field] of Object.entries(template.fields)) {
                try {
                    const result = processFieldExtraction(pdfText, field);
                    fieldResults[fieldName] = result;

                    console.log(`${fieldName}: ${result.matched ? 'MATCHED' : 'NOT MATCHED'}`);
                    if (result.matched) {
                        console.log(`  Extracted: ${result.extractedValue}`);
                        console.log(`  Transformed: ${result.transformedValue}`);
                        console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
                        extractedData[fieldName] = result.transformedValue;
                        overallConfidence += result.confidence;
                        processedFields++;
                    } else if (field.required) {
                        requiredFieldsMissing.push(fieldName);
                    }
                    if (result.error) {
                        console.log(`  Error: ${result.error}`);
                        errors.push({ field: fieldName, error: result.error });
                    }
                } catch (fieldError) {
                    logger.error(`Error processing field ${fieldName}:`, fieldError);
                    errors.push({ field: fieldName, error: fieldError.message });
                }
            }

            // Validate required fields
            if (requiredFieldsMissing.length > 0) {
                logger.warn('Required fields missing:', requiredFieldsMissing);
            }

            // Calculate overall confidence score
            const averageConfidence = processedFields > 0 ? overallConfidence / processedFields : 0;

            // Validate overall extraction quality
            if (averageConfidence < 0.6) {
                logger.warn('Low overall confidence in extraction results');
            }
            if (processedFields < Object.keys(template.fields).length * 0.5) {
                logger.warn('Less than 50% of fields were successfully extracted');
            }

            console.log('\nExtraction Summary:');
            console.log('------------------');
            console.log(`Total Fields Processed: ${Object.keys(template.fields).length}`);
            console.log(`Fields Matched: ${processedFields}`);
            console.log(`Required Fields Missing: ${requiredFieldsMissing.length}`);
            console.log(`Errors Encountered: ${errors.length}`);
            console.log(`Overall Confidence: ${averageConfidence.toFixed(2)}`);

            const result = {
                data: extractedData,
                metadata: {
                    templateVersion: template.detectedVersion.versionId,
                    versionConfidence: template.detectedVersion.confidence,
                    matchedFeatures: template.detectedVersion.matchedFeatures,
                    extractionConfidence: averageConfidence,
                    fieldsMatched: processedFields,
                    totalFields: Object.keys(template.fields).length,
                    requiredFieldsMissing,
                    errors: errors.length > 0 ? errors : undefined,
                    fieldResults,
                    processingTime: new Date().toISOString()
                }
            };

            console.log('\nExtracted Data:');
            console.log('--------------');
            console.log(JSON.stringify(result, null, 2));

            return result;

        } catch (extractionError) {
            throw new Error(`PDF extraction failed: ${extractionError.message}`);
        }

    } catch (error) {
        const errorDetails = {
            message: error.message,
            code: error.code,
            pdfPath,
            templateId: template?.id,
            templateVersion: template?.detectedVersion?.versionId,
            stack: error.stack
        };
        
        logger.error('Error processing rental agreement:', errorDetails);
        throw new Error(`Failed to process rental agreement: ${error.message}`);
    }
};

// If running as a script
if (require.main === module) {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        console.error('Please provide the path to a PDF file');
        process.exit(1);
    }
    
    processRentalAgreement(pdfPath)
        .then(data => {
            console.log('\nExtracted Data:');
            console.log('--------------');
            console.log(JSON.stringify(data, null, 2));
        })
        .catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
        });
}

module.exports = { processRentalAgreement }; 