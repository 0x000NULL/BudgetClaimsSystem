/**
 * Notice of Intent (NOI) Routes
 * API endpoints for managing and using NOI templates
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const noiService = require('../services/noiService');
const Claim = require('../models/Claim');
const { ensureAuthenticated } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `noi-template-upload-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'), false);
    }
  }
});

/**
 * @route GET /noi/templates
 * @description List all NOI templates
 */
router.get('/templates', async (req, res) => {
  try {
    const result = noiService.listTemplates();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list templates',
      details: error.message
    });
  }
});

/**
 * @route GET /noi/templates/current
 * @description Get the current NOI template information
 */
router.get('/templates/current', async (req, res) => {
  try {
    const templatePath = noiService.getCurrentTemplatePath();
    const validationResult = noiService.validateTemplate(templatePath);
    
    res.json({
      success: true,
      templatePath,
      validationResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get current template',
      details: error.message
    });
  }
});

/**
 * @route POST /noi/templates/upload
 * @description Upload a new NOI template
 */
router.post('/templates/upload', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No template file uploaded'
      });
    }
    
    const templatePath = req.file.path;
    const version = req.body.version || '1.0';
    
    // Validate the uploaded template
    const validationResult = noiService.validateTemplate(templatePath);
    
    if (req.body.setAsCurrent === 'true' && validationResult.success) {
      // Update the current template if requested and validation passed
      const updateResult = await noiService.updateCurrentTemplate(templatePath, version);
      res.json(updateResult);
    } else {
      // Just return the validation result
      res.json({
        success: true,
        message: 'Template uploaded successfully',
        templatePath,
        validationResult
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload template',
      details: error.message
    });
  }
});

/**
 * @route POST /noi/templates/preview
 * @description Generate a preview of an NOI template
 */
router.post('/templates/preview', async (req, res) => {
  try {
    const templatePath = req.body.templatePath || noiService.getCurrentTemplatePath();
    const customData = req.body.data || {};
    
    const previewResult = await noiService.generateTemplatePreview(templatePath, customData);
    
    res.json(previewResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      details: error.message
    });
  }
});

/**
 * @route GET /noi/templates/preview-data
 * @description Get HTML preview of sample data for NOI template
 */
router.get('/templates/preview-data', (req, res) => {
  try {
    const html = noiService.generateDataPreviewHtml();
    res.send(html);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate data preview',
      details: error.message
    });
  }
});

/**
 * @route POST /noi/generate/:claimId
 * @description Generate a Notice of Intent document for a specific claim
 */
router.post('/generate/:claimId', ensureAuthenticated, async (req, res) => {
  try {
    const { claimId } = req.params;
    
    // Find the claim
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }
    
    // Generate NOI document
    const result = await noiService.generateNoiDocument(claim);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate NOI document'
      });
    }
    
    // Get proper paths for the client
    const fileName = path.basename(result.documentPath);
    
    // Log paths for debugging
    console.log('NOI Generated:', {
      fullPath: result.documentPath,
      fileName: fileName,
      returnedFileName: result.fileName
    });
    
    // Verify the file exists
    if (!fs.existsSync(result.documentPath)) {
      console.error('Generated file does not exist:', result.documentPath);
      return res.status(500).json({
        success: false,
        error: 'Generated file does not exist on server'
      });
    }
    
    // Add document to claim's files if it doesn't exist in correspondence
    if (!claim.files) {
      claim.files = {};
    }
    
    if (!claim.files.correspondence) {
      claim.files.correspondence = [];
    }
    
    if (!claim.files.correspondence.includes(fileName)) {
      claim.files.correspondence.push(fileName);
      await claim.save();
    }
    
    // Add a note to the claim about the NOI generation
    if (!claim.notes) {
      claim.notes = [];
    }
    
    claim.notes.push({
      type: 'system',
      content: `Notice of Intent (NOI) document generated: ${fileName}`,
      createdAt: new Date(),
      source: req.user ? req.user.username : 'System'
    });
    
    await claim.save();
    
    // Return success with document path
    return res.json({
      success: true,
      fileName: fileName,
      fromCache: result.fromCache || false
    });
  } catch (error) {
    console.error('NOI generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate NOI document'
    });
  }
});

module.exports = router; 