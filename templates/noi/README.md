# Notice of Intent (NOI) PDF Template

This directory contains the PDF templates used for generating Notice of Intent documents in the Budget Claims System.

## Template Files

- `noi-template-fillable.pdf` - The current version of the fillable PDF template
- `noi-template-fillable-v1.0.pdf` - The versioned copy of the fillable PDF template
- `noi-template-current.pdf` - The original non-fillable PDF template
- `noi-template-v1.0.pdf` - The original versioned non-fillable PDF template

## Form Fields

The fillable PDF template contains the following form fields that can be programmatically filled:

### Claim Information
- `claimNumber` - The unique identifier for the claim

### Customer Information
- `customerName` - The full name of the customer
- `customerAddress` - The street address of the customer
- `customerCityStateZip` - The city, state, and ZIP code of the customer

### Vehicle Information
- `vehicleMake` - The make of the vehicle (e.g., Ford, Toyota)
- `vehicleModel` - The model of the vehicle (e.g., Focus, Camry)
- `vin` - The Vehicle Identification Number

### Incident Information
- `incidentDate` - The date when the incident occurred
- `damageAmount` - The monetary amount of damage caused

### Description
- `description` - Detailed description of the incident and damages (multiline field)

### Company Representative
- `representativeName` - The name of the company representative
- `representativeTitle` - The title of the company representative

### Contact Information
- `contactPhone` - The phone number for further contact
- `contactEmail` - The email address for further contact

## Template Modification

To modify the template:

1. Edit the script at `scripts/create-noi-template.js`
2. Adjust the form field coordinates or add new fields as needed
3. Run the script to generate an updated template

## Usage in the Application

The NOI generation service uses these templates to generate personalized Notice of Intent documents by:

1. Loading the template PDF
2. Filling in the form fields with claim data
3. Saving the result as a new PDF document
4. Providing the document for preview and printing

## Template Versions

Version history:
- **v1.0** - Initial template with basic form fields (Current)

## Directory Structure

- `noi-template-current.docx` - Current active template used for NOI generation
- `noi-template-v1.0.docx` - Base template (version 1.0)
- `/versions/` - Contains archived versions of templates
- `/previews/` - Contains generated previews of templates

## Required Merge Fields

The NOI template must contain the following merge fields (enclosed in curly braces, e.g., `{claimNumber}`):

- `{claimNumber}` - The unique claim identifier
- `{customerName}` - The customer's full name
- `{customerAddress}` - The customer's complete address
- `{rentalAgreementNumber}` - The rental agreement number
- `{vehicleDescription}` - Description of the vehicle (year, make, model, color, VIN)
- `{damageDescription}` - Description of the damage or incident
- `{claimAmount}` - The monetary amount of the claim
- `{incidentDate}` - The date when the incident occurred
- `{generatedDate}` - The date when the NOI was generated
- `{adjustorName}` - The name of the claims adjustor
- `{adjustorPhone}` - The adjustor's contact phone number
- `{companyName}` - The company name
- `{companyAddress}` - The company address
- `{companyLogo}` - The company logo (image placeholder)

## Template Customization Guidelines

1. **Preserve Merge Fields**: When modifying a template, ensure all merge fields remain intact.
2. **Version Control**: Save a new version for any significant changes.
3. **Formatting**: Maintain consistent formatting and branding.
4. **Testing**: Always generate a preview to test changes before using in production.

## Validation and Preview

The system includes validation to ensure templates contain all required merge fields.
Preview functionality allows you to see how a template looks with sample data before using it.

## API Endpoints

- `GET /noi/templates` - List all available templates
- `GET /noi/templates/current` - Get information about the current template
- `POST /noi/templates/upload` - Upload a new template
- `POST /noi/templates/preview` - Generate a preview with sample data
- `GET /noi/templates/preview-data` - View HTML representation of sample data

## Troubleshooting

If you encounter issues with template generation:

1. Verify all required merge fields are present
2. Check merge field spelling and format (including curly braces)
3. Ensure the template file is a valid .docx format
4. Review server logs for specific error messages 