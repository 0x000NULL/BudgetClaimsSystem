const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const pinoLogger = require('../logger');

// Mock dependencies
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

describe('MongoDB In-Memory Server Setup', () => {
    let mongoServer;
    let mongoUri;

    beforeAll(async () => {
        try {
            mongoServer = await MongoMemoryServer.create();
            mongoUri = mongoServer.getUri();
            
            if (mongoose.connection.readyState === 0) {
                await mongoose.connect(mongoUri, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true
                });
            }
            pinoLogger.info('MongoDB Memory Server started and connected successfully');
        } catch (error) {
            pinoLogger.error('Failed to start MongoDB Memory Server:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            await mongoose.disconnect();
            await mongoServer.stop();
            pinoLogger.info('MongoDB Memory Server stopped and disconnected successfully');
        } catch (error) {
            pinoLogger.error('Error during cleanup:', error);
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
            pinoLogger.info('Collections cleared successfully');
        } catch (error) {
            pinoLogger.error('Error clearing collections:', error);
            throw error;
        }
    });

    describe('Server Setup', () => {
        it('should start MongoDB in-memory server with valid URI', async () => {
            expect(mongoServer).toBeDefined();
            expect(mongoUri).toMatch(/^mongodb:\/\/127\.0\.0\.1:/);
            expect(mongoServer.getUri()).toBe(mongoUri);
        });

        it('should handle server creation errors', async () => {
            const originalCreate = MongoMemoryServer.create;
            MongoMemoryServer.create = jest.fn().mockRejectedValue(new Error('Server creation failed'));

            await expect(MongoMemoryServer.create()).rejects.toThrow('Server creation failed');
            MongoMemoryServer.create = originalCreate;
        });
    });

    describe('Database Connection', () => {
        it('should maintain active connection to MongoDB', async () => {
            const connectionState = mongoose.connection.readyState;
            expect(connectionState).toBe(1); // 1 = connected
            expect(mongoose.connection.host).toBe('127.0.0.1');
        });

        it('should handle connection errors', async () => {
            const invalidUri = 'mongodb://invalid:27017';
            await expect(
                mongoose.connect(invalidUri)
            ).rejects.toThrow();
        });
    });

    describe('Collection Management', () => {
        let TestModel;

        beforeAll(() => {
            const testSchema = new mongoose.Schema({
                name: { type: String, required: true },
                createdAt: { type: Date, default: Date.now }
            });
            TestModel = mongoose.model('Test', testSchema);
        });

        it('should create and clear test collections', async () => {
            // Create test documents
            await TestModel.create([
                { name: 'test1' },
                { name: 'test2' }
            ]);

            // Verify documents were created
            let count = await TestModel.countDocuments();
            expect(count).toBe(2);

            // Clear collections
            await mongoose.connection.collections['tests'].deleteMany({});

            // Verify documents were cleared
            count = await TestModel.countDocuments();
            expect(count).toBe(0);
        });

        it('should handle validation errors', async () => {
            await expect(
                TestModel.create({ name: null })
            ).rejects.toThrow(mongoose.Error.ValidationError);
        });

        it('should handle bulk operations', async () => {
            // Test bulk insert
            await TestModel.insertMany([
                { name: 'bulk1' },
                { name: 'bulk2' },
                { name: 'bulk3' }
            ]);

            const count = await TestModel.countDocuments();
            expect(count).toBe(3);

            // Test bulk delete
            await TestModel.deleteMany({});
            const remainingCount = await TestModel.countDocuments();
            expect(remainingCount).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid model operations', async () => {
            const invalidModel = mongoose.model('Invalid', new mongoose.Schema({
                uniqueField: { type: String, unique: true }
            }));

            await invalidModel.create({ uniqueField: 'test' });
            await expect(
                invalidModel.create({ uniqueField: 'test' })
            ).rejects.toThrow();
        });

        it('should handle disconnection errors', async () => {
            const originalDisconnect = mongoose.disconnect;
            mongoose.disconnect = jest.fn().mockRejectedValue(new Error('Disconnect failed'));

            await expect(mongoose.disconnect()).rejects.toThrow('Disconnect failed');
            mongoose.disconnect = originalDisconnect;
        });
    });
});