/**
 * @file pdfService.js
 * @description Service for handling PDF document operations including text extraction.
 * 
 * This service provides functionality to extract text from PDF files using pdf-parse.
 * It is primarily used for processing rental agreements and other documents in the claims system.
 * 
 * @requires pdf-parse
 * @requires fs/promises
 */

const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../logger');

/**
 * Extracts text content from a PDF file
 * 
 * @param {string} filePath - The path to the PDF file
 * @returns {Promise<object>} Object containing the PDF text and metadata
 * @throws {Error} If the file cannot be read or parsed
 */
async function extractTextFromPDF(filePath) {
    try {
        // Validate file path
        if (!filePath) {
            throw new Error('No file path provided');
        }

        // Check if file exists and is accessible
        await fs.access(filePath);

        // Read the PDF file
        const dataBuffer = await fs.readFile(filePath);
        
        // Parse the PDF file
        const data = await pdfParse(dataBuffer);
        
        // Return the extracted text and metadata
        return {
            text: data.text,
            info: data.info,
            metadata: data.metadata,
            numPages: data.numpages,
            version: data.version
        };
    } catch (error) {
        logger.error(`Error extracting text from PDF: ${error.message}`, { filePath });
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}

/**
 * Extracts text content from a PDF buffer
 * 
 * @param {Buffer} dataBuffer - The buffer containing PDF data
 * @returns {Promise<object>} Object containing the PDF text and metadata
 * @throws {Error} If the buffer cannot be parsed
 */
async function extractTextFromBuffer(dataBuffer) {
    try {
        // Validate buffer
        if (!dataBuffer || !Buffer.isBuffer(dataBuffer)) {
            throw new Error('Invalid buffer provided');
        }

        // Parse the PDF buffer
        const data = await pdfParse(dataBuffer);
        
        // Return the extracted text and metadata
        return {
            text: data.text,
            info: data.info,
            metadata: data.metadata,
            numPages: data.numpages,
            version: data.version
        };
    } catch (error) {
        logger.error(`Error extracting text from PDF buffer: ${error.message}`);
        throw new Error(`Failed to extract text from PDF buffer: ${error.message}`);
    }
}

/**
 * Extracts specific pages from a PDF file
 * 
 * @param {string} filePath - The path to the PDF file
 * @param {number[]} pageNumbers - Array of page numbers to extract (1-based)
 * @returns {Promise<object>} Object containing the extracted text by page
 * @throws {Error} If the file cannot be read or parsed
 */
async function extractPagesFromPDF(filePath, pageNumbers) {
    try {
        // Validate file path
        if (!filePath) {
            throw new Error('No file path provided');
        }

        // Check if file exists and is accessible
        await fs.access(filePath);

        // Read the PDF file
        const dataBuffer = await fs.readFile(filePath);
        
        const result = {};
        
        // Parse specific pages
        for (const pageNum of pageNumbers) {
            const options = {
                pagerender: render_page,
                max: pageNum,
                min: pageNum
            };
            
            const data = await pdfParse(dataBuffer, options);
            result[`page${pageNum}`] = data.text;
        }
        
        return result;
    } catch (error) {
        logger.error(`Error extracting pages from PDF: ${error.message}`, { filePath, pageNumbers });
        throw new Error(`Failed to extract pages from PDF: ${error.message}`);
    }
}

// Helper function for page rendering
function render_page(pageData) {
    let render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
        .then(function(textContent) {
            let text = '';
            for (let item of textContent.items) {
                text += item.str + ' ';
            }
            return text;
        });
}

module.exports = {
    extractTextFromPDF,
    extractTextFromBuffer,
    extractPagesFromPDF
}; 