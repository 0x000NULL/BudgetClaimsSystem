const express = require('express');
const router = express.Router();
const { 
  listTemplates, 
  generateNoiDocument, 
  generateNoiPdf,
  generateTemplatePreview 
} = require('../services/noiService');
const logger = require('../logger');
const path = require('path');
const fs = require('fs');

/**
 * @route GET /noi/templates
 * @description Lists all available NOI templates
 * @access Private
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = listTemplates();
    res.json(templates);
  } catch (error) {
    logger.error('Error listing NOI templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

/**
 * @route POST /noi/generate
 * @description Generates a NOI document from a template
 * @access Private
 */
router.post('/generate', async (req, res) => {
  try {
    const claimData = req.body;
    
    // Validate required fields
    if (!claimData.claimNumber) {
      return res.status(400).json({ error: 'Claim number is required' });
    }
    
    // Generate the document
    const result = await generateNoiDocument(claimData);
    
    res.json({
      success: true,
      message: 'NOI document generated successfully',
      document: result
    });
  } catch (error) {
    logger.error('Error generating NOI document:', error);
    res.status(500).json({ error: 'Failed to generate document', details: error.message });
  }
});

/**
 * @route POST /noi/generate-pdf
 * @description Generates a NOI PDF document using the fillable PDF template
 * @access Private
 */
router.post('/generate-pdf', async (req, res) => {
  try {
    const claimData = req.body;
    
    // Validate required fields
    if (!claimData.claimNumber) {
      return res.status(400).json({ error: 'Claim number is required' });
    }
    
    // Generate the PDF
    const result = await generateNoiPdf(claimData);
    
    res.json({
      success: true,
      message: 'NOI PDF document generated successfully',
      document: {
        path: result.path,
        fileName: result.fileName
      }
    });
  } catch (error) {
    logger.error('Error generating NOI PDF document:', error);
    res.status(500).json({ error: 'Failed to generate PDF document', details: error.message });
  }
});

/**
 * @route GET /noi/download/:filename
 * @description Downloads a generated NOI document
 * @access Private
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/noi', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    logger.error('Error downloading NOI document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

module.exports = router; 