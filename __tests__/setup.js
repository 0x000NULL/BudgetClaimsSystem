/**
 * @fileoverview Jest setup file for global test configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test_db';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.SESSION_SECRET = 'test_session_secret';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test_password';

// Import the mongoose mockup to ensure it's loaded before any tests
require('./mongoose-mockup');

// Mock console methods
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Set Jest timeout
jest.setTimeout(10000);

// Suppress console output during tests
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
});

// Clean up mocks and resources after all tests
afterAll(async () => {
    // Restore console mocks
    jest.restoreAllMocks();
    
    // Close any remaining connections
    await new Promise(resolve => setImmediate(resolve));
});

// Handle specific cleanup for each test
afterEach(async () => {
    // Clear any pending timers
    jest.clearAllTimers();
    
    // Allow any pending promises to resolve
    await new Promise(resolve => setImmediate(resolve));
}); 