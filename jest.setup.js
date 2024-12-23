const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const path = require('path');

let mongoServer;
let redisClient;

beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);

    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    await redisClient.connect();
  } catch (error) {
    console.error('Error in test setup:', error);
    throw error;
  }
});

afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    const clearPromises = Object.values(collections).map(collection => 
      collection.deleteMany({})
    );
    await Promise.all(clearPromises);
    await redisClient.flushAll();
  } catch (error) {
    console.error('Error in test cleanup:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
    await redisClient.quit();
    
    // Add a small delay to ensure connections are properly closed
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Error in test teardown:', error);
    throw error;
  }
});

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.TEST_TIMEOUT = '30000';
process.env.REDIS_TEST_URL = 'redis://localhost:6379';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/test';

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
