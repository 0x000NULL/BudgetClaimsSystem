/**
 * NOI Template Validator
 * Validates Word document templates for Notice of Intent (NOI)
 * Ensures required merge fields are present and properly formatted
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * List of required merge fields that must be present in any NOI template
 */
const REQUIRED_MERGE_FIELDS = [
  'claimNumber',
  'customerName',
  'customerAddress',
  'rentalAgreementNumber',
  'vehicleDescription',
  'damageDescription',
  'claimAmount',
  'incidentDate',
  'generatedDate',
  'adjustorName',
  'adjustorPhone',
  'companyName',
  'companyAddress',
  'companyLogo'
];

/**
 * Validates a Word template to ensure it has all required merge fields
 * @param {string} templatePath - Path to the template file
 * @returns {Object} Validation results with success flag and any missing fields
 */
function validateTemplate(templatePath) {
  try {
    // Read the template
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    // Parse the document content (document.xml)
    let documentXml;
    try {
      documentXml = zip.files['word/document.xml'].asText();
    } catch (error) {
      return {
        success: false,
        error: 'Invalid Word document structure',
        missingFields: [],
        details: error.message
      };
    }
    
    // Check for each required merge field
    const missingFields = [];
    for (const field of REQUIRED_MERGE_FIELDS) {
      // Look for merge field pattern in the Word XML
      if (!documentXml.includes(`{${field}}`) && !documentXml.includes(`{ ${field} }`)) {
        missingFields.push(field);
      }
    }
    
    return {
      success: missingFields.length === 0,
      templatePath,
      missingFields,
      validFields: REQUIRED_MERGE_FIELDS.filter(field => !missingFields.includes(field))
    };
  } catch (error) {
    return {
      success: false,
      error: 'Template validation failed',
      details: error.message,
      templatePath
    };
  }
}

/**
 * Saves a template with version control
 * @param {string} sourcePath - Original template path
 * @param {string} version - Version string (e.g., "1.0")
 * @returns {Object} Result of the save operation
 */
function saveTemplateVersion(sourcePath, version) {
  try {
    const fileName = path.basename(sourcePath);
    const versionDir = path.join(__dirname, '../templates/noi/versions');
    const destPath = path.join(versionDir, `noi-template-v${version}-${Date.now()}.docx`);
    
    // Ensure directory exists
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }
    
    // Copy file to versions directory
    fs.copyFileSync(sourcePath, destPath);
    
    return {
      success: true,
      message: `Template saved as version ${version}`,
      versionPath: destPath
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to save template version',
      details: error.message
    };
  }
}

module.exports = {
  validateTemplate,
  saveTemplateVersion,
  REQUIRED_MERGE_FIELDS
}; 