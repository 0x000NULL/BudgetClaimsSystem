/**
 * NOI Template Preview Generator
 * Generates previews of Word document templates for Notice of Intent (NOI)
 * Fills in sample data for previewing merge fields
 */

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { createReport } = require('docx-templates');

/**
 * Sample data for NOI template preview
 */
const SAMPLE_DATA = {
  claimNumber: 'CL-2023-00123',
  customerName: 'John Q. Sample',
  customerAddress: '123 Main Street, Anytown, CA 90210',
  rentalAgreementNumber: 'RA-9876543',
  vehicleDescription: '2022 Toyota Camry (White) - VIN: 1HGCM82633A123456',
  damageDescription: 'Front bumper damage and scratches to passenger side door',
  claimAmount: '$1,250.00',
  incidentDate: '2023-12-15',
  generatedDate: new Date().toLocaleDateString('en-US'),
  adjustorName: 'Jane Smith',
  adjustorPhone: '(555) 555-1234',
  companyName: 'Budget Car Rental',
  companyAddress: '456 Corporate Plaza, Suite 300, Business City, CA 94123',
  companyLogo: '[COMPANY LOGO]'
};

/**
 * Generates a preview of a NOI template with sample data
 * @param {string} templatePath - Path to the template file
 * @param {Object} customData - Optional custom data to override default sample data
 * @returns {Promise<Object>} Result with preview file path
 */
async function generateTemplatePreview(templatePath, customData = {}) {
  try {
    // Merge default sample data with any custom data
    const data = { ...SAMPLE_DATA, ...customData };
    
    // Create preview directory if it doesn't exist
    const previewDir = path.join(__dirname, '../templates/noi/previews');
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }
    
    // Set output path for preview
    const previewPath = path.join(
      previewDir,
      `preview-${path.basename(templatePath, '.docx')}-${Date.now()}.docx`
    );
    
    // Generate preview document with sample data
    const content = fs.readFileSync(templatePath);
    const buffer = await createReport({
      template: content,
      data: data,
      cmdDelimiter: ['{', '}'],
    });
    
    fs.writeFileSync(previewPath, buffer);
    
    return {
      success: true,
      previewPath,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate template preview',
      details: error.message,
      templatePath
    };
  }
}

/**
 * Simple method to generate HTML preview of data that will be inserted
 * @param {Object} data - Data object to preview
 * @returns {string} HTML representation of data
 */
function generateDataPreviewHtml(data = SAMPLE_DATA) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2>NOI Template Data Preview</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Field</th>
          <th style="text-align: left; padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Value</th>
        </tr>
        ${Object.entries(data).map(([key, value]) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${key}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
  
  return html;
}

module.exports = {
  generateTemplatePreview,
  generateDataPreviewHtml,
  SAMPLE_DATA
}; 