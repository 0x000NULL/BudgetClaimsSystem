const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');

// Mock Redis client
jest.mock('redis', () => {
    return {
        createClient: jest.fn().mockReturnValue({
            on: jest.fn(),
            connect: jest.fn().mockResolvedValue(),
            disconnect: jest.fn().mockResolvedValue(),
            quit: jest.fn().mockResolvedValue(),
            flushAll: jest.fn().mockResolvedValue(),
            isOpen: true
        })
    };
});

// Mock connect-mongo
jest.mock('connect-mongo', () => {
    return {
        create: jest.fn().mockReturnValue({
            on: jest.fn(),
            close: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            destroy: jest.fn()
        })
    };
});

let mongoServer;

beforeAll(async () => {
    try {
        // Create MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to MongoDB with optimized settings
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
    } catch (error) {
        console.error('Error in test setup:', error);
        throw error;
    }
});

afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
        try {
            // More efficient way to clear collections
            const collections = mongoose.connection.collections;
            await Promise.all(
                Object.values(collections).map(collection => 
                    collection.deleteMany({}, { timeout: false })
                )
            );
        } catch (error) {
            console.error('Error in collection cleanup:', error);
        }
    }
});

afterAll(async () => {
    try {
        // Cleanup in parallel
        await Promise.all([
            mongoose.connection.readyState !== 0 ? mongoose.disconnect() : Promise.resolve(),
            mongoServer ? mongoServer.stop() : Promise.resolve()
        ]);
    } catch (error) {
        console.error('Error in test teardown:', error);
    }
});

// Increased timeout for slower operations
jest.setTimeout(120000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.MONGODB_URI = 'mock-uri';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Suppress console logs during tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Global error handler for unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

// Add after the existing error handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Add global error boundary for tests
global.testErrorBoundary = async (fn) => {
    try {
        await fn();
        throw new Error('Expected function to throw');
    } catch (error) {
        return error;
    }
};

// Add after the console mocks
global.mockUtils = {
    mockRequest: () => {
        return {
            body: {},
            params: {},
            query: {},
            session: {},
            headers: {},
            get: jest.fn()
        };
    },
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.render = jest.fn().mockReturnValue(res);
        return res;
    }
};

global.loadFixture = (fixtureName) => {
    return require(path.join(__dirname, '__fixtures__', fixtureName));
};
