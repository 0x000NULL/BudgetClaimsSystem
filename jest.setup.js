const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const path = require('path');

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
let redisClient;

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

    // Setup Redis with optimized settings
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false // Disable reconnection attempts during tests
      }
    });
    await redisClient.connect();
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

  if (redisClient?.isOpen) {
    try {
      await redisClient.flushAll();
    } catch (error) {
      console.error('Error in Redis cleanup:', error);
    }
  }
});

afterAll(async () => {
  try {
    // Cleanup in parallel
    await Promise.all([
      mongoose.connection.readyState !== 0 ? mongoose.disconnect() : Promise.resolve(),
      mongoServer ? mongoServer.stop() : Promise.resolve(),
      redisClient?.isOpen ? redisClient.quit() : Promise.resolve()
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
process.env.MONGODB_URI = 'mock-uri'; // Required for connect-mongo
process.env.REDIS_TEST_URL = 'redis://localhost:6379';

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
