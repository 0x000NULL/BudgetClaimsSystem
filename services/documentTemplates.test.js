/**
 * @file documentTemplates.test.js
 * @description Test file for document template definitions
 * 
 * This file contains tests for the document template definitions,
 * including validation rules, transformation functions, and template inheritance.
 */

const documentTemplates = require('./documentTemplates');

// Test transformation functions
console.log('\nTesting transformation functions:');
console.log('--------------------------------');

const transformationTests = [
    {
        name: 'toUpperCase',
        input: 'test string',
        expected: 'TEST STRING',
        fn: documentTemplates.transformations.toUpperCase
    },
    {
        name: 'toLowerCase',
        input: 'TEST STRING',
        expected: 'test string',
        fn: documentTemplates.transformations.toLowerCase
    },
    {
        name: 'formatPhoneNumber',
        input: '1234567890',
        expected: '123-456-7890',
        fn: documentTemplates.transformations.formatPhoneNumber
    },
    {
        name: 'cleanText',
        input: '  test   string  with   spaces  ',
        expected: 'test string with spaces',
        fn: documentTemplates.transformations.cleanText
    },
    {
        name: 'parseBoolean',
        input: 'Yes',
        expected: true,
        fn: documentTemplates.transformations.parseBoolean
    }
];

transformationTests.forEach(test => {
    const result = test.fn(test.input);
    const passed = result === test.expected;
    console.log(`${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) {
        console.log(`  Expected: ${test.expected}`);
        console.log(`  Got: ${result}`);
    }
});

// Test validation functions
console.log('\nTesting validation functions:');
console.log('----------------------------');

const validationTests = [
    {
        name: 'isNotEmpty',
        input: 'test',
        expected: true,
        fn: documentTemplates.validations.isNotEmpty
    },
    {
        name: 'isEmail',
        input: 'test@example.com',
        expected: true,
        fn: documentTemplates.validations.isEmail
    },
    {
        name: 'isPhoneNumber',
        input: '1234567890',
        expected: true,
        fn: documentTemplates.validations.isPhoneNumber
    },
    {
        name: 'isNumeric',
        input: '12345',
        expected: true,
        fn: documentTemplates.validations.isNumeric
    },
    {
        name: 'isValidVIN',
        input: '1HGCM82633A123456',
        expected: true,
        fn: documentTemplates.validations.isValidVIN
    }
];

validationTests.forEach(test => {
    const result = test.fn(test.input);
    const passed = result === test.expected;
    console.log(`${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) {
        console.log(`  Expected: ${test.expected}`);
        console.log(`  Got: ${result}`);
    }
});

// Test template inheritance
console.log('\nTesting template inheritance:');
console.log('----------------------------');

// Get the Budget rental agreement template
const budgetTemplate = documentTemplates.getTemplate('budgetRentalAgreement');

// Check if template inheritance worked
const inheritanceTests = [
    {
        name: 'Template ID',
        expected: 'budget_rental_agreement',
        actual: budgetTemplate.id
    },
    {
        name: 'Template Version',
        expected: '1.0',
        actual: budgetTemplate.version
    },
    {
        name: 'Has Parent Fields',
        expected: true,
        actual: !!budgetTemplate.fields.customerName
    },
    {
        name: 'Override Fields',
        expected: true,
        actual: budgetTemplate.fields.raNumber.regexPatterns.some(pattern => 
            pattern.toString().includes('Budget RA'))
    }
];

inheritanceTests.forEach(test => {
    const passed = test.expected === test.actual;
    console.log(`${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) {
        console.log(`  Expected: ${test.expected}`);
        console.log(`  Got: ${test.actual}`);
    }
});

// Test regex patterns with sample text
console.log('\nTesting regex patterns:');
console.log('----------------------');

const sampleText = `
Rental Agreement Number: RA123456
Customer Name: John Doe
Email: john.doe@example.com
Driver's License: DL123456789
Vehicle Make: Toyota
Vehicle Model: Camry
Vehicle Year: 2023
Vehicle Color: Silver
VIN: 1HGCM82633A123456
Odometer: 12345
Location: Budget Rental - Airport
LDW Accepted: Yes
Liability Insurance: [X]
`;

const standardTemplate = documentTemplates.getTemplate('standardRentalAgreement');

// Test field extraction
Object.entries(standardTemplate.fields).forEach(([fieldName, field]) => {
    let matched = false;
    let value = null;
    
    for (const pattern of field.regexPatterns) {
        const match = pattern.exec(sampleText);
        if (match) {
            matched = true;
            value = match[1];
            break;
        }
    }
    
    console.log(`${fieldName}: ${matched ? 'MATCHED' : 'NOT MATCHED'}`);
    if (matched) {
        // Apply transformations
        const transformedValue = field.transformations.reduce(
            (val, transform) => transform(val),
            value
        );
        console.log(`  Extracted: ${value}`);
        console.log(`  Transformed: ${transformedValue}`);
    }
});

console.log('\nTemplate testing completed.'); 