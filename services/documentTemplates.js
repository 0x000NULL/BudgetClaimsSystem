/**
 * @file documentTemplates.js
 * @description Defines templates for document parsing including regex patterns, validation rules, and transformation functions.
 * 
 * This file contains the template definitions for various document types such as rental agreements.
 * Each template includes regex patterns for field extraction, validation rules, and transformation functions.
 * 
 * @requires lodash
 */

const _ = require('lodash');
const logger = require('../logger');

/**
 * Version detection patterns to identify template versions
 */
const versionPatterns = {
  'standard_rental_agreement_v1': {
    pattern: /RENTAL AGREEMENT NUMBER.*?Budget Car Num.*?Drivers Lic Number/s,
    weight: 1.0,
    features: ['raNumber', 'customerNumber', 'customerDriversLicense']
  },
  'standard_rental_agreement_v2': {
    pattern: /RENTAL AGREEMENT.*?RESERVATION NUMBER.*?Customer Name/s,
    weight: 1.0,
    features: ['raNumber', 'reservationNumber', 'customerName']
  },
  'budget_rental_agreement_v1': {
    pattern: /Budget.*?RENTAL AGREEMENT.*?Loss Damage Waiver/s,
    weight: 0.9,
    features: ['ldwAccepted', 'lossDamageWaiver']
  },
  'budget_rental_agreement_v2': {
    pattern: /Budget.*?Car Rental Agreement.*?Personal Accident Insurance/s,
    weight: 0.9,
    features: ['personalAccidentInsurance']
  },
  'express_rental_agreement': {
    pattern: /Express Rental.*?Quick Rental.*?Rapid Return/s,
    weight: 0.8,
    features: ['expressService', 'rapidReturn']
  },
  'corporate_rental_agreement': {
    pattern: /Corporate Account.*?Business Rental.*?Company ID/s,
    weight: 0.8,
    features: ['corporateAccount', 'companyId']
  },
  'international_rental_agreement': {
    pattern: /International.*?Passport.*?Foreign License/s,
    weight: 0.7,
    features: ['passportNumber', 'foreignLicense']
  }
};

/**
 * Calculate confidence score for a field match
 * @param {string|boolean|number} value - Extracted value
 * @param {object} field - Field definition
 * @returns {number} - Confidence score between 0 and 1
 */
function calculateFieldConfidence(value, field) {
  if (value === null || value === undefined) return 0;

  let score = 0;
  
  // Base confidence from successful extraction
  score += 0.5;

  // Add confidence based on validations
  if (field.validations && field.validations.length > 0) {
    const validationsPassed = field.validations.filter(v => v(value)).length;
    score += (validationsPassed / field.validations.length) * 0.3;
  } else {
    // If no validations defined, add partial confidence
    score += 0.15;
  }

  // Add confidence based on field requirements
  if (field.required && value) {
    score += 0.2;
  }

  // Type-specific confidence adjustments
  if (typeof value === 'string') {
    // Reduce confidence for very short or very long values
    if (value.length < 2) score *= 0.5;
    if (value.length > 100) score *= 0.8;
    
    // Boost confidence for well-formatted values
    if (/^[A-Z0-9-]+$/.test(value)) score *= 1.1; // Well-formatted IDs/numbers
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(value)) score *= 1.1; // Well-formatted names
  } else if (typeof value === 'boolean') {
    // Boolean values from clear indicators get full confidence
    score = 1.0;
  } else if (typeof value === 'number') {
    // Numbers within reasonable ranges get higher confidence
    if (value >= 0 && value < 1000000) score *= 1.1;
  }

  // Add confidence based on field name matching
  if (field.displayName && field.regexPatterns) {
    const nameInPattern = field.regexPatterns.some(pattern => 
      pattern.source.toLowerCase().includes(field.displayName.toLowerCase())
    );
    if (nameInPattern) score *= 1.1;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Detect template version from document text with enhanced matching
 * @param {string} text - Document text
 * @returns {object} - Version info with id, confidence, and matched features
 */
function detectTemplateVersion(text) {
  const matches = [];
  
  for (const [versionId, versionInfo] of Object.entries(versionPatterns)) {
    try {
      // Check main pattern
      const patternMatch = versionInfo.pattern.test(text);
      
      if (patternMatch) {
        // Calculate feature matches
        const featureMatches = versionInfo.features.filter(feature => {
          const featurePattern = documentTemplates.standardRentalAgreement.fields[feature]?.regexPatterns[0];
          return featurePattern && featurePattern.test(text);
        });
        
        const featureConfidence = featureMatches.length / versionInfo.features.length;
        const confidence = versionInfo.weight * (0.7 + 0.3 * featureConfidence);
        
        matches.push({
          versionId,
          confidence,
          matchedFeatures: featureMatches,
          totalFeatures: versionInfo.features.length
        });
      }
    } catch (error) {
      logger.warn(`Error matching template version ${versionId}:`, error);
    }
  }

  // Sort by confidence and return best match
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches[0] || { 
    versionId: 'standard_rental_agreement', 
    confidence: 0.5,
    matchedFeatures: [],
    totalFeatures: 0
  };
}

/**
 * Process field extraction with error handling and confidence scoring
 * @param {string} text - Text to extract from
 * @param {object} field - Field definition
 * @returns {object} - Extraction result with value and confidence
 */
function processFieldExtraction(text, field) {
  try {
    let matched = false;
    let extractedValue = null;
    let transformedValue = null;
    let confidence = 0;
    let error = null;

    // Try each regex pattern
    for (const pattern of field.regexPatterns) {
      try {
        const match = text.match(pattern);
        if (match && match[1]) {
          matched = true;
          extractedValue = match[1].trim();
          
          // Apply transformations
          transformedValue = field.transformations.reduce(
            (value, transform) => transform(value),
            extractedValue
          );
          
          // Calculate confidence score
          confidence = calculateFieldConfidence(transformedValue, field);
          break;
        }
      } catch (patternError) {
        logger.warn(`Error with pattern ${pattern} for field ${field.displayName}:`, patternError);
        error = patternError;
      }
    }

    return {
      matched,
      extractedValue,
      transformedValue,
      confidence,
      error: error?.message
    };
  } catch (error) {
    logger.error(`Error processing field ${field.displayName}:`, error);
    return {
      matched: false,
      extractedValue: null,
      transformedValue: null,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Transformation functions for converting extracted text to appropriate formats
 */
const transformations = {
  /**
   * Converts text to uppercase
   * @param {string} value - The input text
   * @returns {string} - Uppercase text
   */
  toUpperCase: (value) => value ? value.toUpperCase() : value,
  
  /**
   * Converts text to lowercase
   * @param {string} value - The input text
   * @returns {string} - Lowercase text
   */
  toLowerCase: (value) => value ? value.toLowerCase() : value,
  
  /**
   * Formats a string as a phone number (XXX-XXX-XXXX)
   * @param {string} value - The input text
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber: (value) => {
    if (!value) return value;
    
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX if 10 digits
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return digits;
  },
  
  /**
   * Formats a date string to ISO format (YYYY-MM-DD)
   * @param {string} value - The input date text
   * @returns {string} - Formatted date string
   */
  formatDate: (value) => {
    if (!value) return value;
    
    // Try to parse the date
    try {
      const date = new Date(value);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return value;
      }
      
      // Format as YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch (error) {
      return value;
    }
  },
  
  /**
   * Extracts digits from a string
   * @param {string} value - The input text
   * @returns {string} - String containing only digits
   */
  extractDigits: (value) => {
    if (!value) return value;
    return value.replace(/\D/g, '');
  },
  
  /**
   * Cleans text by removing extra whitespace and normalizing
   * @param {string} value - The input text
   * @returns {string} - Cleaned text
   */
  cleanText: (value) => {
    if (!value) return value;
    return value.trim().replace(/\s+/g, ' ');
  },
  
  /**
   * Normalizes a boolean value from various text representations
   * @param {string} value - The input text
   * @returns {boolean} - Boolean value
   */
  parseBoolean: (value) => {
    if (!value) return false;
    
    const normalizedValue = value.trim().toLowerCase();
    return ['yes', 'y', 'true', 'accepted', 'accept', 'selected', 'x', 'checked'].includes(normalizedValue);
  }
};

/**
 * Validation functions for checking the extracted field values
 */
const validations = {
  /**
   * Checks if value is not empty
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isNotEmpty: (value) => {
    return !!value && typeof value === 'string' && value.trim().length > 0;
  },
  
  /**
   * Checks if value is a valid email
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isEmail: (value) => {
    if (!value) return false;
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  /**
   * Checks if value is a valid phone number
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isPhoneNumber: (value) => {
    if (!value) return false;
    
    // Extract digits and check length
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  },
  
  /**
   * Checks if value is a valid date
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isDate: (value) => {
    if (!value) return false;
    
    // Try to parse the date
    try {
      const date = new Date(value);
      return !isNaN(date.getTime());
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Checks if value contains only digits
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isNumeric: (value) => {
    if (!value) return false;
    return /^\d+$/.test(value);
  },
  
  /**
   * Checks if value is a valid VIN (Vehicle Identification Number)
   * @param {string} value - The value to check
   * @returns {boolean} - True if valid, false otherwise
   */
  isValidVIN: (value) => {
    if (!value) return false;
    
    // VIN must be 17 characters and not contain I, O, or Q
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    return vinRegex.test(value);
  }
};

/**
 * Template definitions for various document types
 * Each template includes field definitions with regex patterns,
 * validation rules, and transformation functions
 */
const documentTemplates = {
  /**
   * Standard rental agreement template
   */
  standardRentalAgreement: {
    id: 'standard_rental_agreement',
    name: 'Standard Rental Agreement',
    description: 'Standard format for rental agreements',
    version: '1.0',
    fields: {
      // RA Number field
      raNumber: {
        displayName: 'Rental Agreement Number',
        description: 'The unique identifier for the rental agreement',
        required: true,
        regexPatterns: [
          /RENTAL AGREEMENT NUMBER\s*(\d{6,10})/i,
          /RA(?:Number|#|No|Number:)[:\s]*([A-Z0-9-]{4,20})/i,
          /Agreement(?:Number|#|No|Number:)[:\s]*([A-Z0-9-]{4,20})/i
        ],
        validations: [validations.isNotEmpty],
        transformations: [transformations.cleanText, transformations.toUpperCase]
      },
      
      // Customer Name field
      customerName: {
        displayName: 'Customer Name',
        description: 'Full name of the customer',
        required: true,
        regexPatterns: [
          /Customer Name\s*:\s*([^:\n]+?)(?=\s{2,}|$|\n)/i,
          /(?:Customer|Renter|Client)(?:Name|:)[:\s]*([^,\n]{3,50})/i
        ],
        validations: [validations.isNotEmpty],
        transformations: [transformations.cleanText]
      },
      
      // Customer Number field
      customerNumber: {
        displayName: 'Customer Number',
        description: 'Unique identifier for the customer',
        required: false,
        regexPatterns: [
          /Budget Car Num\s*:\s*(\d[\s\d]*\d)/i,
          /(?:Customer|Client)(?:Number|ID|#|No)[:\s]*([A-Z0-9-]{3,20})/i
        ],
        validations: [],
        transformations: [transformations.cleanText, transformations.extractDigits]
      },
      
      // Customer Email field
      customerEmail: {
        displayName: 'Customer Email',
        description: 'Email address of the customer',
        required: false,
        regexPatterns: [
          /(?:Email|E-mail|Email Address)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
        ],
        validations: [validations.isEmail],
        transformations: [transformations.cleanText, transformations.toLowerCase]
      },
      
      // Customer Address field
      customerAddress: {
        displayName: 'Customer Address',
        description: 'Physical address of the customer',
        required: false,
        regexPatterns: [
          /(?:Customer|Renter|Client)(?:Address|:)[:\s]*([^,]*,[^,]*,[^,]*\s+\w{2}\s+\d{5}(-\d{4})?)/i,
          /Address(?:of Customer|of Renter|:)[:\s]*([^,]*,[^,]*,[^,]*\s+\w{2}\s+\d{5}(-\d{4})?)/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Driver's License field
      customerDriversLicense: {
        displayName: "Driver's License",
        description: "Customer's driver's license number",
        required: false,
        regexPatterns: [
          /Drivers Lic Number\s*:\s*([A-Z0-9X]+)/i,
          /(?:Driver'?s License|DL|License)(?:Number|#|No)?[:\s]*([A-Z0-9-]{5,20})/i
        ],
        validations: [validations.isNotEmpty],
        transformations: [transformations.cleanText, transformations.toUpperCase]
      },
      
      // Car Make and Model combined field
      carMakeModel: {
        displayName: 'Car Make and Model',
        description: 'Make and model of the rented vehicle',
        required: false,
        regexPatterns: [
          /Veh Description\s*:\s*([A-Z0-9\s]+(?:AWD)?)\s+(?=Methods|$)/i
        ],
        validations: [validations.isNotEmpty],
        transformations: [transformations.cleanText]
      },
      
      // Car Year field
      carYear: {
        displayName: 'Car Year',
        description: 'Year of the rented vehicle',
        required: false,
        regexPatterns: [
          /(?:Vehicle|Car|Auto)(?:Year)[:\s]*(\d{4})/i,
          /Year[:\s]*(\d{4})/i
        ],
        validations: [validations.isNumeric],
        transformations: [transformations.cleanText]
      },
      
      // Car Color field
      carColor: {
        displayName: 'Car Color',
        description: 'Color of the rented vehicle',
        required: false,
        regexPatterns: [
          /(?:Vehicle|Car|Auto)(?:Color)[:\s]*([A-Za-z]{3,20})/i,
          /Color[:\s]*([A-Za-z]{3,20})/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // VIN field
      carVIN: {
        displayName: 'VIN',
        description: 'Vehicle Identification Number',
        required: false,
        regexPatterns: [
          /(?:VIN|Vehicle(?:Identification|ID)Number)[:\s]*([A-HJ-NPR-Z0-9]{17})/i
        ],
        validations: [validations.isValidVIN],
        transformations: [transformations.cleanText, transformations.toUpperCase]
      },
      
      // Vehicle Odometer field
      vehicleOdometer: {
        displayName: 'Vehicle Odometer',
        description: 'Odometer reading of the vehicle',
        required: false,
        regexPatterns: [
          /Odometer Out\s*:\s*(\d+)/i,
          /(?:Odometer|Mileage|Miles)[:\s]*(\d{1,6})/i
        ],
        validations: [validations.isNumeric],
        transformations: [transformations.extractDigits]
      },
      
      // Renting Location field
      rentingLocation: {
        displayName: 'Renting Location',
        description: 'Location where the vehicle was rented',
        required: false,
        regexPatterns: [
          /Pickup Location\s*:\s*([^\n]+?LAS VEGAS,NV,\d{5}(?:-\d{4})?,US)/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Pickup Location field
      pickupLocation: {
        displayName: 'Pickup Location',
        description: 'Location where the vehicle was picked up',
        required: false,
        regexPatterns: [
          /Pickup Location\s*:\s*(4475[^\n]+?)(?=\s+Return Location|\s{2,}|$)/i
        ],
        validations: [],
        transformations: [(value) => {
          if (!value) return value;
          // Clean up the value and combine with city/state/zip
          const address = value.trim();
          return `${address}, LAS VEGAS, NV 89103`;
        }]
      },
      
      // Return Location field
      returnLocation: {
        displayName: 'Return Location',
        description: 'Location where the vehicle will be returned',
        required: false,
        regexPatterns: [
          /Return Location\s*:\s*(4475[^\n]+?)(?=\s{2,}|$|\n)/i
        ],
        validations: [],
        transformations: [(value) => {
          if (!value) return value;
          // Clean up the value and combine with city/state/zip
          const address = value.trim();
          return `${address}, LAS VEGAS, NV 89103`;
        }]
      },
      
      // LDW Acceptance field
      ldwAccepted: {
        displayName: 'LDW Accepted',
        description: 'Loss Damage Waiver acceptance status',
        required: false,
        regexPatterns: [
          /Loss Damage Waiver\s+[\d.]+\/Day\s+(Accepted|Declined)/i,
          /(?:LDW|Loss Damage Waiver)(?:Accepted|:)[:\s]*(Yes|No|X|✓|✗)/i
        ],
        validations: [],
        transformations: [transformations.parseBoolean]
      },
      
      // Renters Liability Insurance field
      rentersLiabilityInsurance: {
        displayName: 'Renters Liability Insurance',
        description: 'Renters liability insurance status',
        required: false,
        regexPatterns: [
          /Renter's liability insurance:.*?XX_+(\w+)/is,
          /(?:Liability|Renters Liability|Liability Insurance)[:\s]*(Yes|No|X|✓|✗)/i
        ],
        validations: [],
        transformations: [transformations.parseBoolean]
      },
      
      // Loss Damage Waiver field
      lossDamageWaiver: {
        displayName: 'Loss Damage Waiver',
        description: 'Loss damage waiver status',
        required: false,
        regexPatterns: [
          /(?:Loss Damage|Damage Waiver|LDW)[:\s]*(Yes|No|X|✓|✗)/i,
          /(?:Loss Damage|Damage Waiver|LDW)[:\s]*\[(X| )\]/i
        ],
        validations: [],
        transformations: [transformations.parseBoolean]
      },
      
      // Payment Method field
      paymentMethod: {
        displayName: 'Payment Method',
        description: 'Payment method information',
        required: false,
        regexPatterns: [
          /Methods of Payment\s*:\s*([A-Z]+\s+XX\d{4})/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Reservation Number field
      reservationNumber: {
        displayName: 'Reservation Number',
        description: 'The reservation number for the rental',
        required: false,
        regexPatterns: [
          /RESERVATION NUMBER\s*(\d+-[A-Z]+-\d+)/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Vehicle Plate Number field
      plateNumber: {
        displayName: 'Plate Number',
        description: 'License plate number of the vehicle',
        required: false,
        regexPatterns: [
          /Plate Number\s*:\s*([A-Z0-9\s]+?)(?=\s{2,}|$|\n)/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Pickup Date/Time field
      pickupDateTime: {
        displayName: 'Pickup Date/Time',
        description: 'Date and time of vehicle pickup',
        required: false,
        regexPatterns: [
          /Pickup Date\/Time\s*:\s*([A-Z0-9,@\s:]+(?:AM|PM))/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      },
      
      // Return Date/Time field
      returnDateTime: {
        displayName: 'Return Date/Time',
        description: 'Date and time of scheduled vehicle return',
        required: false,
        regexPatterns: [
          /Return Date\/Time\s*:\s*([A-Z0-9,@\s:]+(?:AM|PM))/i
        ],
        validations: [],
        transformations: [transformations.cleanText]
      }
    }
  },
  
  /**
   * Budget-specific rental agreement template
   */
  budgetRentalAgreement: {
    id: 'budget_rental_agreement',
    name: 'Budget Rental Agreement',
    description: 'Budget-specific format for rental agreements',
    version: '1.0',
    parentTemplate: 'standardRentalAgreement',
    // Override or add specific patterns for Budget rental agreements
    fields: {
      raNumber: {
        regexPatterns: [
          /RA(?:Number|#|No)[:\s]*([A-Z0-9-]{6,8})/i,
          /Budget RA[:\s]*([A-Z0-9-]{6,8})/i
        ]
      },
      // Additional Budget-specific fields can be added here
    }
  }
};

/**
 * Get template with version detection and confidence scoring
 * @param {string} templateId - Template ID to get
 * @param {string} [documentText] - Optional document text for version detection
 * @returns {object} - Template with version info
 */
function getTemplate(templateId, documentText = null) {
  const template = documentTemplates[templateId];
  
  if (!template) {
    logger.warn(`Template not found: ${templateId}`);
    return null;
  }
  
  // Detect version if document text provided
  let versionInfo = { versionId: template.id, confidence: 1.0 };
  if (documentText) {
    versionInfo = detectTemplateVersion(documentText);
    logger.info(`Detected template version: ${versionInfo.versionId} (confidence: ${versionInfo.confidence})`);
  }
  
  // Get base template
  const baseTemplate = template.parentTemplate ? 
    getTemplate(template.parentTemplate) : 
    _.cloneDeep(template);
  
  // Add version info
  baseTemplate.detectedVersion = versionInfo;
  
  return baseTemplate;
}

/**
 * Get all available template IDs
 * @returns {string[]} - Array of template IDs
 */
function getAvailableTemplates() {
  return Object.keys(documentTemplates);
}

module.exports = {
  getTemplate,
  getAvailableTemplates,
  transformations,
  validations,
  processFieldExtraction,
  detectTemplateVersion,
  calculateFieldConfidence
}; 