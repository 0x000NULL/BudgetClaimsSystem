// Set test environment
process.env.NODE_ENV = 'test';

// Mock dependencies
jest.mock('../../models/AuditLog', () => {
    return jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
    }));
});
jest.mock('../../logger');

const logActivity = require('../../middleware/auditLogger');
const AuditLog = require('../../models/AuditLog');
const pinoLogger = require('../../logger');

describe('auditLogger Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock request object
        mockReq = {
            user: {
                _id: 'testUserId',
                email: 'test@example.com'
            },
            ip: '127.0.0.1',
            sessionID: 'testSessionId',
            body: { testData: 'test' }
        };

        // Mock response object
        mockRes = {};

        // Mock next function
        nextFunction = jest.fn();

        // Setup AuditLog mock
        AuditLog.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue(true)
        }));

        // Setup Pino logger mock
        pinoLogger.info = jest.fn();
        pinoLogger.error = jest.fn();
    });

    test('should successfully log activity for authenticated user', async () => {
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        // Verify Pino logger was called with correct info
        expect(pinoLogger.info).toHaveBeenCalledTimes(2);
        expect(pinoLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Logging user activity',
                action: 'TEST_ACTION',
                user: 'test@example.com',
                ip: '127.0.0.1',
                sessionId: 'testSessionId'
            })
        );

        // Verify AuditLog was created with correct data
        expect(AuditLog).toHaveBeenCalledWith({
            user: 'testUserId',
            action: 'TEST_ACTION',
            details: JSON.stringify({ testData: 'test' })
        });

        // Verify next function was called
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle unauthenticated user', async () => {
        mockReq.user = null;
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        expect(pinoLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                user: 'Unauthenticated'
            })
        );

        // Verify next function was still called
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle errors during audit log creation', async () => {
        // Mock AuditLog to throw an error
        AuditLog.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(new Error('Database error'))
        }));

        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        // Verify error was logged
        expect(pinoLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Error logging activity',
                error: 'Database error'
            })
        );

        // Verify next function was still called despite error
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle empty request body', async () => {
        mockReq.body = {};
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        expect(AuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                details: '{}'
            })
        );

        expect(nextFunction).toHaveBeenCalled();
    });

    test('should include timestamp in logs', async () => {
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        expect(pinoLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp: expect.any(String)
            })
        );
    });

    test('should handle error when creating audit log for unauthenticated user', async () => {
        // Set user to null to simulate unauthenticated user
        mockReq.user = null;
        
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        // Verify error was logged due to trying to access _id of null user
        expect(pinoLogger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Error logging activity',
                error: expect.any(String),
                action: 'TEST_ACTION',
                user: 'Unauthenticated'
            })
        );

        // Verify next function was still called despite error
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle user without email property', async () => {
        // Set user without email to test the email ternary operator
        mockReq.user = {
            _id: 'testUserId'
            // email property intentionally omitted
        };
        
        const middleware = logActivity('TEST_ACTION');
        await middleware(mockReq, mockRes, nextFunction);

        // Verify the log shows undefined when email property is missing
        expect(pinoLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Logging user activity',
                action: 'TEST_ACTION',
                user: undefined,
                ip: '127.0.0.1',
                sessionId: 'testSessionId'
            })
        );

        // Verify AuditLog was still created with the user ID
        expect(AuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                user: 'testUserId'
            })
        );

        expect(nextFunction).toHaveBeenCalled();
    });
}); 