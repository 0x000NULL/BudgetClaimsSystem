const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Create a fillable NOI PDF template with form fields
 * Implements tasks from lines 5-12 of NOI-OCR-TODO.md
 */
async function createNoiTemplate() {
  try {
    // Create directory if it doesn't exist
    const templatesDir = path.join(__dirname, '..', 'templates', 'noi');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }

    // Read the existing PDF
    const inputPdfPath = path.join(__dirname, '..', 'noi.pdf');
    const pdfBytes = fs.readFileSync(inputPdfPath);
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get the first page
    const page = pdfDoc.getPages()[0];
    
    // Add company letterhead and branding
    // We'll insert this at the top of the page
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Add form fields for the NOI template
    const form = pdfDoc.getForm();
    
    // Claim Information
    const claimNumberField = form.createTextField('claimNumber');
    claimNumberField.setText('');
    claimNumberField.addToPage(page, { 
      x: 150, 
      y: 700, 
      width: 200, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Customer Information section
    const customerNameField = form.createTextField('customerName');
    customerNameField.setText('');
    customerNameField.addToPage(page, { 
      x: 150, 
      y: 650, 
      width: 300, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const customerAddressField = form.createTextField('customerAddress');
    customerAddressField.setText('');
    customerAddressField.addToPage(page, { 
      x: 150, 
      y: 620, 
      width: 300, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const customerCityStateZipField = form.createTextField('customerCityStateZip');
    customerCityStateZipField.setText('');
    customerCityStateZipField.addToPage(page, { 
      x: 150, 
      y: 590, 
      width: 300, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Vehicle Information
    const vehicleMakeField = form.createTextField('vehicleMake');
    vehicleMakeField.setText('');
    vehicleMakeField.addToPage(page, { 
      x: 150, 
      y: 540, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const vehicleModelField = form.createTextField('vehicleModel');
    vehicleModelField.setText('');
    vehicleModelField.addToPage(page, { 
      x: 350, 
      y: 540, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const vinField = form.createTextField('vin');
    vinField.setText('');
    vinField.addToPage(page, { 
      x: 150, 
      y: 510, 
      width: 350, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Incident Information
    const incidentDateField = form.createTextField('incidentDate');
    incidentDateField.setText('');
    incidentDateField.addToPage(page, { 
      x: 150, 
      y: 460, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const damageAmountField = form.createTextField('damageAmount');
    damageAmountField.setText('');
    damageAmountField.addToPage(page, { 
      x: 350, 
      y: 460, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Description field
    const descriptionField = form.createTextField('description');
    descriptionField.setText('');
    descriptionField.addToPage(page, { 
      x: 150, 
      y: 380, 
      width: 350, 
      height: 60,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
      multiline: true,
    });
    
    // Company Representative
    const representativeNameField = form.createTextField('representativeName');
    representativeNameField.setText('');
    representativeNameField.addToPage(page, { 
      x: 150, 
      y: 300, 
      width: 300, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const representativeTitleField = form.createTextField('representativeTitle');
    representativeTitleField.setText('');
    representativeTitleField.addToPage(page, { 
      x: 150, 
      y: 270, 
      width: 300, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Contact Information
    const contactPhoneField = form.createTextField('contactPhone');
    contactPhoneField.setText('');
    contactPhoneField.addToPage(page, { 
      x: 150, 
      y: 240, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    const contactEmailField = form.createTextField('contactEmail');
    contactEmailField.setText('');
    contactEmailField.addToPage(page, { 
      x: 350, 
      y: 240, 
      width: 150, 
      height: 20,
      borderWidth: 1,
      borderColor: rgb(0, 0, 0),
    });
    
    // Flatten the form (uncomment to make fields non-editable after creation)
    // form.flatten();
    
    // Save the PDF with form fields
    const pdfWithFields = await pdfDoc.save();
    
    // Output paths
    const outputPath = path.join(templatesDir, 'noi-template-fillable.pdf');
    const versionedPath = path.join(templatesDir, 'noi-template-fillable-v1.0.pdf');
    
    // Write the PDF with form fields
    fs.writeFileSync(outputPath, pdfWithFields);
    fs.writeFileSync(versionedPath, pdfWithFields);
    
    console.log('Successfully created fillable NOI template at:');
    console.log('- ' + outputPath);
    console.log('- ' + versionedPath);
  } catch (error) {
    console.error('Error creating NOI template:', error);
  }
}

// Create the scripts directory if it doesn't exist
if (!fs.existsSync(path.dirname(__filename))) {
  fs.mkdirSync(path.dirname(__filename), { recursive: true });
}

// Run the function
createNoiTemplate(); 