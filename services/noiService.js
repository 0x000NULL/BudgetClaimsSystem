/**
 * Notice of Intent (NOI) Service
 * Provides functionalities for managing and using NOI templates
 */

const fs = require('fs');
const path = require('path');
const { validateTemplate, saveTemplateVersion, REQUIRED_MERGE_FIELDS } = require('../utils/templateValidator');
const { generateTemplatePreview, generateDataPreviewHtml, SAMPLE_DATA } = require('../utils/templatePreview');
const { createReport } = require('docx-templates');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const logger = require('../logger');

// Define paths
const TEMPLATES_DIR = path.join(__dirname, '../templates/noi');
const CURRENT_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'noi-template-current.docx');
const CURRENT_PDF_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'noi-template-fillable.pdf');
const GENERATED_DIR = path.join(__dirname, '../uploads/noi');
const CACHE_DIR = path.join(__dirname, '../uploads/noi/cache');

// Ensure directories exist
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Get the current NOI template path
 * @param {boolean} usePdf - Whether to use PDF template instead of Word
 * @returns {string} Path to the current NOI template
 */
function getCurrentTemplatePath(usePdf = false) {
  if (usePdf) {
    if (fs.existsSync(CURRENT_PDF_TEMPLATE_PATH)) {
      return CURRENT_PDF_TEMPLATE_PATH;
    }
    
    // If no current PDF template exists, use the default one
    const defaultPdfPath = path.join(TEMPLATES_DIR, 'noi-template-fillable-v1.0.pdf');
    if (fs.existsSync(defaultPdfPath)) {
      // Create a copy as the current template
      fs.copyFileSync(defaultPdfPath, CURRENT_PDF_TEMPLATE_PATH);
      return CURRENT_PDF_TEMPLATE_PATH;
    }
    
    throw new Error('No NOI PDF template found. Please create a PDF template first.');
  }
  
  // For Word documents
  if (fs.existsSync(CURRENT_TEMPLATE_PATH)) {
    return CURRENT_TEMPLATE_PATH;
  }
  
  // If no current template exists, use the default one
  const defaultPath = path.join(TEMPLATES_DIR, 'noi-template-v1.0.docx');
  if (fs.existsSync(defaultPath)) {
    // Create a copy as the current template
    fs.copyFileSync(defaultPath, CURRENT_TEMPLATE_PATH);
    return CURRENT_TEMPLATE_PATH;
  }
  
  throw new Error('No NOI template found. Please create a template first.');
}

/**
 * Updates the current NOI template with a new version
 * @param {string} templatePath - Path to the new template
 * @param {string} version - Version string for the new template
 * @returns {Object} Result of the update operation
 */
async function updateCurrentTemplate(templatePath, version) {
  try {
    // Validate the template first
    const validationResult = validateTemplate(templatePath);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Template validation failed',
        details: validationResult
      };
    }
    
    // Save the current template as a versioned backup
    const timestamp = Date.now();
    const versionResult = saveTemplateVersion(templatePath, version);
    
    // Update the current template pointer
    fs.copyFileSync(templatePath, CURRENT_TEMPLATE_PATH);
    
    return {
      success: true,
      message: `NOI template updated to version ${version}`,
      validationResult,
      versionResult
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to update current template',
      details: error.message
    };
  }
}

/**
 * Lists all available NOI templates including versions
 * @returns {Object} List of available templates
 */
function listTemplates() {
  try {
    const templates = [];
    const versionsDir = path.join(TEMPLATES_DIR, 'versions');
    
    // Get current template if it exists
    if (fs.existsSync(CURRENT_TEMPLATE_PATH)) {
      templates.push({
        name: 'Current Template',
        path: CURRENT_TEMPLATE_PATH,
        isCurrent: true,
        stats: fs.statSync(CURRENT_TEMPLATE_PATH)
      });
    }
    
    // Get all versioned templates
    if (fs.existsSync(versionsDir)) {
      const versionFiles = fs.readdirSync(versionsDir)
        .filter(file => file.endsWith('.docx'))
        .map(file => {
          const filePath = path.join(versionsDir, file);
          return {
            name: file,
            path: filePath,
            isCurrent: false,
            stats: fs.statSync(filePath)
          };
        })
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      templates.push(...versionFiles);
    }
    
    return {
      success: true,
      templates
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to list templates',
      details: error.message
    };
  }
}

/**
 * Formats an address for consistent presentation
 * @param {string} address - Address to format
 * @returns {string} Formatted address
 */
function formatAddress(address) {
  if (!address) return '';
  
  // Clean up the address by removing extra spaces and newlines
  let formatted = address.trim().replace(/\s+/g, ' ');
  
  // Add line breaks for standard address format if not present
  // Check if the address already has commas
  if (formatted.includes(',')) {
    // Replace commas with line breaks
    return formatted.split(',').map(part => part.trim()).join('\n');
  }
  
  return formatted;
}

/**
 * Create vehicle description from claim data
 * @param {Object} claim - The claim object
 * @returns {string} Formatted vehicle description
 */
function createVehicleDescription(claim) {
  const parts = [];
  
  if (claim.carYear) parts.push(claim.carYear);
  if (claim.carMake) parts.push(claim.carMake);
  if (claim.carModel) parts.push(claim.carModel);
  
  let description = parts.join(' ');
  
  if (claim.carColor) {
    description += ` (${claim.carColor})`;
  }
  
  if (claim.carVIN) {
    description += ` - VIN: ${claim.carVIN}`;
  }
  
  return description;
}

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get cache key for a document
 * @param {string} claimId - ID of the claim
 * @param {Object} templateInfo - Information about the template
 * @returns {string} Cache key
 */
function getCacheKey(claimId, templateInfo) {
  const templateStats = fs.statSync(templateInfo.path);
  const templateLastModified = templateStats.mtime.getTime();
  
  return crypto
    .createHash('md5')
    .update(`${claimId}-${templateInfo.path}-${templateLastModified}`)
    .digest('hex');
}

/**
 * Check if a valid cached version exists
 * @param {string} cacheKey - The cache key to check
 * @returns {Object|null} Cache info or null if not found
 */
function checkCache(cacheKey) {
  const cachedPath = path.join(CACHE_DIR, `${cacheKey}.docx`);
  
  if (fs.existsSync(cachedPath)) {
    const stats = fs.statSync(cachedPath);
    const fileAge = Date.now() - stats.mtime.getTime();
    
    // Cache expires after 24 hours
    if (fileAge < 24 * 60 * 60 * 1000) {
      // Create a copy in the main directory with proper naming
      const fileName = `NOI-Cached-${Date.now()}.docx`;
      const outputPath = path.join(GENERATED_DIR, fileName);
      
      try {
        // Copy cached file to main directory with standard naming
        fs.copyFileSync(cachedPath, outputPath);
        console.log(`Using cached NOI document: ${cachedPath} -> ${outputPath}`);
        
        return {
          path: outputPath,
          fileName: fileName
        };
      } catch (error) {
        console.error('Failed to copy cached file:', error);
        return null;
      }
    }
    
    // Cache expired, delete it
    try {
      fs.unlinkSync(cachedPath);
    } catch (error) {
      console.error('Failed to delete expired cache:', error);
    }
  }
  
  return null;
}

/**
 * Map claim data to NOI template fields
 * @param {Object} claim - The claim data
 * @returns {Object} Mapped data for template
 */
function mapClaimDataToTemplateFields(claim) {
  return {
    claimNumber: claim.claimNumber || '',
    customerName: claim.customerName || '',
    customerAddress: formatAddress(claim.customerAddress || ''),
    rentalAgreementNumber: claim.raNumber || '',
    vehicleDescription: createVehicleDescription(claim),
    damageDescription: claim.description || '',
    claimAmount: claim.damagesTotal ? `$${parseFloat(claim.damagesTotal).toFixed(2)}` : '$0.00',
    incidentDate: formatDate(claim.accidentDate),
    generatedDate: formatDate(new Date()),
    adjustorName: claim.insuranceAdjuster || '',
    adjustorPhone: claim.insurancePhoneNumber || '',
    companyName: 'Budget Car Rental',
    companyAddress: '456 Corporate Plaza, Suite 300, Business City, CA 94123',
    companyLogo: '[COMPANY LOGO]' // Placeholder - would be replaced with actual image in a real implementation
  };
}

/**
 * Generates a Notice of Intent (NOI) document for a claim
 * @param {Object} claim - The claim data
 * @returns {Promise<Object>} Result object with success flag and document path
 */
async function generateNoiDocument(claim) {
  try {
    // Get the current template
    const templateInfo = {
      path: getCurrentTemplatePath(),
      name: 'Current Template'
    };
    
    // Generate cache key
    const cacheKey = getCacheKey(claim._id, templateInfo);
    
    // Check cache first
    const cachedInfo = checkCache(cacheKey);
    if (cachedInfo) {
      return {
        success: true,
        documentPath: cachedInfo.path,
        fileName: cachedInfo.fileName,
        fromCache: true
      };
    }
    
    // Map claim data to template fields
    const templateData = mapClaimDataToTemplateFields(claim);
    
    // Generate output filename with standardized prefix for easier identification in frontend
    const fileName = `NOI-${claim.claimNumber.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}.docx`;
    
    // Generate output path
    const outputPath = path.join(GENERATED_DIR, fileName);
    
    // Cache path
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.docx`);
    
    // Read template
    const templateContent = fs.readFileSync(templateInfo.path);
    
    // Generate document
    const buffer = await createReport({
      template: templateContent,
      data: templateData,
      cmdDelimiter: ['{', '}']
    });
    
    // Write to output file
    fs.writeFileSync(outputPath, buffer);
    
    // Save to cache
    fs.writeFileSync(cachePath, buffer);
    
    // Log success
    console.log(`NOI document generated successfully: ${outputPath}`);
    
    return {
      success: true,
      documentPath: outputPath,
      fileName: fileName,
      fromCache: false,
      data: templateData
    };
  } catch (error) {
    console.error('NOI generation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate NOI document',
      details: error.stack
    };
  }
}

/**
 * Service for generating Notice of Intent PDF documents
 */
class NoiService {
  /**
   * Generates a Notice of Intent PDF document based on claim data
   * @param {Object} claimData - The claim data to populate the template with
   * @returns {Promise<Buffer>} - A buffer containing the generated PDF
   */
  async generateNoiPdf(claimData) {
    try {
      logger.info(`Generating NOI PDF for claim ${claimData.claimNumber}`);
      
      // Path to the fillable PDF template
      const templatePath = getCurrentTemplatePath(true);
      
      // Read the template file
      const templateBytes = fs.readFileSync(templatePath);
      
      // Load the template as a PDF document
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Get the form from the PDF
      const form = pdfDoc.getForm();
      
      // Fill in the form fields from the claim data
      this._fillFormFields(form, claimData);
      
      // Flatten the form to make it non-editable
      form.flatten();
      
      // Save the PDF document
      const pdfBytes = await pdfDoc.save();
      
      // Save the generated PDF to the uploads directory
      const fileName = `NOI-${claimData.claimNumber}-${Date.now()}.pdf`;
      const outputPath = path.join(GENERATED_DIR, fileName);
      fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
      
      logger.info(`Successfully generated NOI PDF for claim ${claimData.claimNumber} at ${outputPath}`);
      return {
        buffer: Buffer.from(pdfBytes),
        path: outputPath,
        fileName
      };
    } catch (error) {
      logger.error(`Error generating NOI PDF: ${error.message}`, { error, claimNumber: claimData.claimNumber });
      throw new Error(`Failed to generate NOI PDF: ${error.message}`);
    }
  }
  
  /**
   * Fills in form fields of the PDF with claim data
   * @param {PDFForm} form - The PDF form to fill
   * @param {Object} claimData - The claim data to use
   * @private
   */
  _fillFormFields(form, claimData) {
    // Map claim data to form fields
    const fieldMappings = {
      claimNumber: claimData.claimNumber || '',
      customerName: claimData.customerName || '',
      customerAddress: this._formatAddress(claimData.customerAddress) || '',
      customerCityStateZip: this._formatCityStateZip(
        claimData.customerCity,
        claimData.customerState,
        claimData.customerZip
      ),
      vehicleMake: claimData.carMake || '',
      vehicleModel: claimData.carModel || '',
      vin: claimData.carVIN || '',
      incidentDate: this._formatDate(claimData.incidentDate) || '',
      damageAmount: this._formatCurrency(claimData.damageAmount) || '',
      description: claimData.description || '',
      representativeName: claimData.representativeName || 'Budget Claims Representative',
      representativeTitle: claimData.representativeTitle || 'Claims Adjuster',
      contactPhone: claimData.contactPhone || '1-800-555-1234',
      contactEmail: claimData.contactEmail || 'claims@budgetclaims.example.com'
    };
    
    // Set each form field
    Object.entries(fieldMappings).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
        }
      } catch (error) {
        logger.warn(`Could not set field ${fieldName}: ${error.message}`);
      }
    });
  }
  
  /**
   * Formats address lines into a single string
   * @param {Object|string} address - Address info
   * @returns {string} - Formatted address
   * @private
   */
  _formatAddress(address) {
    if (!address) return '';
    
    // If address is already a string, return it
    if (typeof address === 'string') return address;
    
    // If address is an object with line1, line2 properties
    if (typeof address === 'object') {
      const { line1, line2 } = address;
      if (line2) {
        return `${line1}, ${line2}`;
      }
      return line1 || '';
    }
    
    return '';
  }
  
  /**
   * Formats city, state and zip into a single string
   * @param {string} city - City name
   * @param {string} state - State code
   * @param {string} zip - ZIP/Postal code
   * @returns {string} - Formatted city, state, and ZIP
   * @private
   */
  _formatCityStateZip(city = '', state = '', zip = '') {
    if (!city && !state && !zip) return '';
    
    let result = '';
    if (city) result += city;
    if (state) {
      if (result) result += ', ';
      result += state;
    }
    if (zip) {
      if (result) result += ' ';
      result += zip;
    }
    
    return result;
  }
  
  /**
   * Formats a date value into a string
   * @param {Date|string} date - Date to format
   * @returns {string} - Formatted date string
   * @private
   */
  _formatDate(date) {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      logger.warn(`Error formatting date: ${error.message}`);
      return String(date);
    }
  }
  
  /**
   * Formats a currency value
   * @param {number|string} amount - Amount to format
   * @returns {string} - Formatted currency string
   * @private
   */
  _formatCurrency(amount) {
    if (amount === undefined || amount === null) return '';
    
    try {
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return numAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });
    } catch (error) {
      logger.warn(`Error formatting currency: ${error.message}`);
      return String(amount);
    }
  }
}

// Create a singleton instance of the service
const noiService = new NoiService();

// Export as a single consistent module
module.exports = {
  getCurrentTemplatePath,
  updateCurrentTemplate,
  listTemplates,
  formatAddress,
  createVehicleDescription,
  formatDate,
  generateNoiDocument: async (claim) => {
    // Legacy word document generation or new PDF generation based on configuration
    const usePdf = true; // Change this to a configuration option later
    
    if (usePdf) {
      return await noiService.generateNoiPdf(claim);
    } else {
      // Legacy Word document generation code
      // ... This would be the original generateNoiDocument implementation
    }
  },
  generateNoiPdf: (claim) => noiService.generateNoiPdf(claim),
  generateTemplatePreview,
  generateDataPreviewHtml,
  mapClaimDataToTemplateFields,
  REQUIRED_MERGE_FIELDS,
  SAMPLE_DATA
}; 