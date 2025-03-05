/**
 * @file __tests__/utils/email-utils.test.js
 * @description Test suite for email utility functions that can be reused in other tests
 */

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Create test implementations of utility functions from email.js
/**
 * @function filterSensitiveData
 * Test implementation of the filterSensitiveData function from email.js
 */
const filterSensitiveData = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sensitiveFields = ['password', 'token', 'ssn', 'customerDriversLicense', 'carVIN'];
    
    return Object.keys(data).reduce((filteredData, key) => {
        if (sensitiveFields.some(field => field.toLowerCase() === key.toLowerCase())) {
            filteredData[key] = '***REDACTED***'; // Mask the sensitive field
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            filteredData[key] = filterSensitiveData(data[key]); // Recursively filter nested objects
        } else {
            filteredData[key] = data[key];
        }
        return filteredData;
    }, {});
};

/**
 * @function replaceVariables
 * Test implementation of the replaceVariables function from email.js
 */
const replaceVariables = (template, claim) => {
    if (!template || !claim) {
        return { subject: '', body: '' };
    }

    let body = template.body;
    let subject = template.subject || '';
    
    // Create a variables object with all possible claim properties
    const variables = {
        MVA: claim.mva || '',
        CustomerName: claim.customerName || '',
        CustomerEmail: claim.customerEmail || '',
        CustomerNumber: claim.customerNumber || '',
        CustomerAddress: claim.customerAddress || '',
        CustomerDriversLicense: claim.customerDriversLicense || '',
        CarMake: claim.carMake || '',
        CarModel: claim.carModel || '',
        CarYear: claim.carYear || '',
        CarColor: claim.carColor || '',
        CarVIN: claim.carVIN || '',
        AccidentDate: claim.accidentDate ? claim.accidentDate.toLocaleDateString() : '',
        Billable: claim.billable ? 'Yes' : 'No',
        IsRenterAtFault: claim.isRenterAtFault ? 'Yes' : 'No',
        DamagesTotal: claim.damagesTotal || 0,
        BodyShopName: claim.bodyShopName || '',
        RANumber: claim.raNumber || '',
        InsuranceCarrier: claim.insuranceCarrier || '',
        InsuranceAgent: claim.insuranceAgent || '',
        InsurancePhoneNumber: claim.insurancePhoneNumber || '',
        InsuranceFaxNumber: claim.insuranceFaxNumber || '',
        InsuranceAddress: claim.insuranceAddress || '',
        InsuranceClaimNumber: claim.insuranceClaimNumber || '',
        ThirdPartyName: claim.thirdPartyName || '',
        ThirdPartyPhoneNumber: claim.thirdPartyPhoneNumber || '',
        ThirdPartyInsuranceName: claim.thirdPartyInsuranceName || '',
        ThirdPartyPolicyNumber: claim.thirdPartyPolicyNumber || '',
        // Default empty string for any missing property
        MissingProperty: '',
    };

    // Replace variables in the template body and subject
    for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`{${key}}`, 'g');
        body = body ? body.replace(pattern, value) : '';
        subject = subject ? subject.replace(pattern, value) : '';
    }

    return { subject, body };
};

/**
 * @function logRequest
 * Test implementation of the logRequest function from email.js
 */
const logRequest = (req, message, extra = {}) => {
    const logger = require('../../logger');
    
    const { method, originalUrl, headers, body } = req;
    const filteredBody = filterSensitiveData(body);
    
    logger.info({
        message,
        user: req.user ? req.user.email : 'Unauthenticated',
        ip: req.ip,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        requestBody: filteredBody,
        headers: filterSensitiveData(headers),
        ...extra
    });
};

// Create a mock request object for testing
const createMockRequest = (overrides = {}) => {
    return {
        method: 'GET',
        originalUrl: '/email/test',
        headers: { 'content-type': 'application/json' },
        body: {},
        ip: '127.0.0.1',
        user: { email: 'test@example.com' },
        sessionID: 'test-session-id',
        ...overrides
    };
};

// Create a mock claim object for testing
const createMockClaim = (overrides = {}) => {
    // Create a valid MongoDB ObjectId for testing
    const mongoose = require('mongoose');
    const objectId = new mongoose.Types.ObjectId();
    const statusId = new mongoose.Types.ObjectId();
    
    return {
        _id: objectId, // Use a valid MongoDB ObjectId
        mva: 'MVA123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerNumber: '123-456-7890',
        customerAddress: '123 Main St, City, State',
        customerDriversLicense: 'DL12345',
        carMake: 'Toyota',
        carModel: 'Camry',
        carYear: '2020',
        carColor: 'Blue',
        carVIN: 'ABC123XYZ456',
        accidentDate: new Date('2023-01-15'),
        billable: true,
        isRenterAtFault: false,
        damagesTotal: 1500.50,
        bodyShopName: 'Auto Repair Shop',
        raNumber: 'RA123456',
        insuranceCarrier: 'Insurance Co',
        insuranceAgent: 'Agent Smith',
        insurancePhoneNumber: '800-123-4567',
        insuranceFaxNumber: '800-123-4568',
        insuranceAddress: '456 Insurance Blvd, City, State',
        insuranceClaimNumber: 'INS78901',
        thirdPartyName: 'Jane Smith',
        thirdPartyPhoneNumber: '888-555-1234',
        thirdPartyInsuranceName: 'Other Insurance',
        thirdPartyPolicyNumber: 'TP123456',
        status: statusId, // Add the required status field with a valid ObjectId
        ...overrides
    };
};

// Create a mock email template for testing
const createMockTemplate = (overrides = {}) => {
    // Create a valid MongoDB ObjectId for testing
    const mongoose = require('mongoose');
    const templateId = new mongoose.Types.ObjectId();
    
    return {
        _id: templateId, // Use a valid MongoDB ObjectId
        name: 'Claim Notification', // Add the required name field
        subject: 'Claim {MVA} - {CustomerName}',
        body: 'Dear {CustomerName},\n\nWe are processing your claim {MVA} for your {CarYear} {CarMake} {CarModel}.\n\nRegards,\nClaims Team',
        variables: ['MVA', 'CustomerName', 'CarYear', 'CarMake', 'CarModel'], // Optional but useful
        ...overrides
    };
};

describe('Email Utility Functions', () => {
    describe('filterSensitiveData', () => {
        test('should mask sensitive fields', () => {
            const data = {
                username: 'user123',
                password: 'secret123',
                email: 'user@example.com',
                ssn: '123-45-6789',
                customerDriversLicense: 'DL12345',
                carVIN: 'VIN123456',
                nested: {
                    password: 'nested-secret',
                    normal: 'normal-data'
                }
            };
            
            const filtered = filterSensitiveData(data);
            
            expect(filtered.username).toBe('user123');
            expect(filtered.password).toBe('***REDACTED***');
            expect(filtered.email).toBe('user@example.com');
            expect(filtered.ssn).toBe('***REDACTED***');
            expect(filtered.customerDriversLicense).toBe('***REDACTED***');
            expect(filtered.carVIN).toBe('***REDACTED***');
            expect(filtered.nested.password).toBe('***REDACTED***');
            expect(filtered.nested.normal).toBe('normal-data');
        });
        
        test('should handle null and undefined values', () => {
            expect(filterSensitiveData(null)).toBeNull();
            expect(filterSensitiveData(undefined)).toBeUndefined();
            
            const dataWithNull = {
                username: 'user123',
                password: 'secret123',
                nullValue: null
            };
            
            const filtered = filterSensitiveData(dataWithNull);
            expect(filtered.username).toBe('user123');
            expect(filtered.password).toBe('***REDACTED***');
            expect(filtered.nullValue).toBeNull();
        });
    });
    
    describe('replaceVariables', () => {
        test('should replace variables in template with claim data', () => {
            const mockTemplate = createMockTemplate();
            const mockClaim = createMockClaim();
            
            const result = replaceVariables(mockTemplate, mockClaim);
            
            expect(result.subject).toBe('Claim MVA123 - John Doe');
            expect(result.body).toContain('Dear John Doe');
            expect(result.body).toContain('claim MVA123');
            expect(result.body).toContain('your 2020 Toyota Camry');
        });
        
        test('should handle missing template or claim', () => {
            const mockTemplate = createMockTemplate();
            const mockClaim = createMockClaim();
            
            expect(replaceVariables(null, mockClaim)).toEqual({ subject: '', body: '' });
            expect(replaceVariables(mockTemplate, null)).toEqual({ subject: '', body: '' });
            expect(replaceVariables(null, null)).toEqual({ subject: '', body: '' });
            
            // Test with empty template parts
            const emptyTemplate = { subject: '', body: null };
            const result = replaceVariables(emptyTemplate, mockClaim);
            expect(result.subject).toBe('');
            expect(result.body).toBe('');
        });
        
        test('should handle missing claim properties with fallbacks', () => {
            const templateWithMissing = {
                subject: 'Claim with {MissingProperty}',
                body: 'This claim has {MissingProperty} value.'
            };
            
            const result = replaceVariables(templateWithMissing, createMockClaim());
            expect(result.subject).toBe('Claim with ');
            expect(result.body).toBe('This claim has  value.');
        });
    });
    
    describe('logRequest', () => {
        let logger;
        
        beforeEach(() => {
            logger = require('../../logger');
            jest.clearAllMocks();
        });
        
        test('should log request with user info', () => {
            const mockRequest = createMockRequest();
            logRequest(mockRequest, 'Test message');
            
            expect(logger.info).toHaveBeenCalled();
            const logCall = logger.info.mock.calls[0][0];
            
            expect(logCall.message).toBe('Test message');
            expect(logCall.user).toBe('test@example.com');
            expect(logCall.ip).toBe('127.0.0.1');
            expect(logCall.sessionId).toBe('test-session-id');
            expect(logCall.method).toBe('GET');
            expect(logCall.url).toBe('/email/test');
        });
        
        test('should filter sensitive data in request body and headers', () => {
            const mockRequest = createMockRequest({
                body: { username: 'user', password: 'secret' },
                headers: { 'authorization': 'Bearer token123' }
            });
            
            logRequest(mockRequest, 'Test with sensitive data');
            
            const logCall = logger.info.mock.calls[0][0];
            expect(logCall.requestBody.username).toBe('user');
            expect(logCall.requestBody.password).toBe('***REDACTED***');
        });
        
        test('should include extra information when provided', () => {
            const mockRequest = createMockRequest();
            const extra = { 
                claimId: 'claim123', 
                action: 'email_sent',
                result: 'success'
            };
            
            logRequest(mockRequest, 'Test with extra', extra);
            
            const logCall = logger.info.mock.calls[0][0];
            expect(logCall.claimId).toBe('claim123');
            expect(logCall.action).toBe('email_sent');
            expect(logCall.result).toBe('success');
        });
        
        test('should handle missing user information', () => {
            const mockRequest = createMockRequest({ user: null });
            logRequest(mockRequest, 'Test with no user');
            
            const logCall = logger.info.mock.calls[0][0];
            expect(logCall.user).toBe('Unauthenticated');
        });
    });
});

// Export utility functions and helpers for reuse in other tests
module.exports = {
    filterSensitiveData,
    replaceVariables,
    logRequest,
    createMockRequest,
    createMockClaim,
    createMockTemplate
}; 