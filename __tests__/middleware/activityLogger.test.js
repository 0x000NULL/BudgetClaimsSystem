// Mock mongoose
jest.mock('mongoose', () => ({
    Schema: {
        Types: {
            ObjectId: String
        }
    }
}));

const { logActivity } = require('../../middleware/activityLogger');
const ActivityLog = require('../../models/ActivityLog');
const pinoLogger = require('../../logger');

// Mock dependencies
jest.mock('../../models/ActivityLog');
jest.mock('../../logger');

describe('activityLogger Middleware', () => {
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
            sessionID: 'test-session-id',
            isAuthenticated: jest.fn()
        };

        // Mock response object
        mockRes = {};

        // Mock next function
        nextFunction = jest.fn();

        // Mock Pino logger methods
        pinoLogger.info = jest.fn();
        pinoLogger.warn = jest.fn();
        pinoLogger.error = jest.fn();

        // Reset ActivityLog mock for each test
        ActivityLog.mockReset();
        ActivityLog.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({}),
            user: '',
            action: ''
        }));
    });

    test('should log activity for authenticated user', async () => {
        // Setup
        mockReq.isAuthenticated.mockReturnValue(true);
        const action = 'test-action';

        // Execute
        await logActivity(action)(mockReq, mockRes, nextFunction);

        // Assert
        expect(ActivityLog).toHaveBeenCalledWith({
            user: 'testUserId',
            action: 'test-action'
        });
        // pinoLogger.info is called once for initial log and once for success log
        expect(pinoLogger.info).toHaveBeenCalledTimes(2);
        expect(pinoLogger.info).toHaveBeenNthCalledWith(1, expect.objectContaining({
            message: 'logActivity middleware called'
        }));
        expect(pinoLogger.info).toHaveBeenNthCalledWith(2, expect.objectContaining({
            message: 'Activity log saved successfully'
        }));
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle unauthenticated user', async () => {
        // Setup
        mockReq.isAuthenticated.mockReturnValue(false);
        const action = 'test-action';

        // Execute
        await logActivity(action)(mockReq, mockRes, nextFunction);

        // Assert
        expect(ActivityLog).not.toHaveBeenCalled();
        expect(pinoLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
            message: 'User not authenticated, activity not logged'
        }));
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should handle database save error', async () => {
        // Setup
        mockReq.isAuthenticated.mockReturnValue(true);
        const testError = new Error('Database error');
        
        // Mock ActivityLog implementation with rejected save
        ActivityLog.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(testError),
            user: '',
            action: ''
        }));
        
        const action = 'test-action';

        // Mock console.error to prevent actual console output during tests
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Execute
        await logActivity(action)(mockReq, mockRes, nextFunction);

        // Assert
        expect(ActivityLog).toHaveBeenCalled();
        expect(pinoLogger.error).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error logging activity',
            error: 'Database error'
        }));
        expect(consoleSpy).toHaveBeenCalledWith('Error saving activity log:', testError);
        expect(nextFunction).toHaveBeenCalled();

        // Cleanup
        consoleSpy.mockRestore();
    });

    test('should handle request without user object', async () => {
        // Setup
        delete mockReq.user;
        const action = 'test-action';

        // Execute
        await logActivity(action)(mockReq, mockRes, nextFunction);

        // Assert
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            user: 'Unauthenticated'
        }));
        expect(nextFunction).toHaveBeenCalled();
    });

    test('should include correct timestamp format', async () => {
        // Setup
        mockReq.isAuthenticated.mockReturnValue(true);
        const action = 'test-action';
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

        // Execute
        await logActivity(action)(mockReq, mockRes, nextFunction);

        // Assert
        expect(pinoLogger.info).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp: expect.stringMatching(isoDateRegex)
            })
        );
    });
}); 