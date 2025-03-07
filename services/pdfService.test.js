/**
 * @file pdfService.test.js
 * @description Test file for PDF service functionality
 * 
 * This file contains tests for the PDF text extraction service.
 * To run this test: node services/pdfService.test.js
 */

const pdfService = require('./pdfService');
const fs = require('fs');
const path = require('path');

// Test the PDF extraction with a sample file
async function testPDFExtraction() {
    try {
        console.log('Starting PDF extraction test...');
        
        // Using a specific PDF file that we know exists
        const uploadsPath = path.join(__dirname, '..', 'public', 'uploads');
        const pdfFile = 'Summary.pdf'; // Using the Summary.pdf file we found
        
        if (!fs.existsSync(uploadsPath)) {
            console.error(`Uploads directory not found at: ${uploadsPath}`);
            return;
        }
        
        const filePath = path.join(uploadsPath, pdfFile);
        
        if (!fs.existsSync(filePath)) {
            console.error(`Test PDF file not found at: ${filePath}`);
            console.log('Available PDF files:');
            
            // List available PDF files
            const files = fs.readdirSync(uploadsPath);
            const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
            pdfFiles.forEach(file => console.log(` - ${file}`));
            return;
        }
        
        console.log(`Testing with PDF file: ${filePath}`);
        
        // Extract text from the PDF
        const result = await pdfService.extractTextFromPDF(filePath);
        
        console.log('PDF extraction successful:');
        console.log('---------------------------------------------------');
        console.log(`Number of pages: ${result.numPages}`);
        console.log(`PDF version: ${result.version}`);
        
        // Print the first 500 characters of the extracted text
        const previewText = result.text.substring(0, 500);
        console.log('\nText preview (first 500 characters):');
        console.log('---------------------------------------------------');
        console.log(previewText);
        console.log('---------------------------------------------------');
        
        // If the PDF has multiple pages, test page extraction
        if (result.numPages > 1) {
            console.log('\nTesting page extraction...');
            const pageResult = await pdfService.extractPagesFromPDF(filePath, [1]);
            console.log('First page preview:');
            console.log('---------------------------------------------------');
            console.log(pageResult.page1.substring(0, 250));
            console.log('---------------------------------------------------');
        }
        
        console.log('\nPDF extraction test completed successfully.');
    } catch (error) {
        console.error('Error during PDF extraction test:', error);
    }
}

// Run the test
testPDFExtraction(); 