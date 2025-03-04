const mongoose = require('mongoose');
const { Location } = require('../../models/Location');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.disconnect();
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Location.deleteMany({});
});

describe('Location Model Test Suite', () => {
    describe('Validation Tests', () => {
        test('should validate a valid location', async () => {
            const validLocation = new Location({
                name: 'Test Location'
            });
            const savedLocation = await validLocation.save();
            
            expect(savedLocation._id).toBeDefined();
            expect(savedLocation.name).toBe('TEST LOCATION');
            expect(savedLocation.createdAt).toBeDefined();
            expect(savedLocation.updatedAt).toBeDefined();
        });

        test('should fail validation when name is empty', async () => {
            const locationWithoutName = new Location({});
            let err;
            
            try {
                await locationWithoutName.save();
            } catch (error) {
                err = error;
            }
            
            expect(err).toBeDefined();
            expect(err.errors.name).toBeDefined();
            expect(err.errors.name.kind).toBe('required');
        });

        test('should trim whitespace from name', async () => {
            const locationWithWhitespace = new Location({
                name: '  Test Location  '
            });
            const savedLocation = await locationWithWhitespace.save();
            
            expect(savedLocation.name).toBe('TEST LOCATION');
        });
    });

    describe('Uniqueness Tests', () => {
        test('should fail on duplicate names', async () => {
            await new Location({ name: 'Duplicate Test' }).save();
            
            const duplicateLocation = new Location({
                name: 'Duplicate Test'
            });
            
            let err;
            try {
                await duplicateLocation.save();
            } catch (error) {
                err = error;
            }
            
            expect(err).toBeDefined();
            expect(err.code).toBe(11000);
        });

        test('should fail on case-insensitive duplicate names', async () => {
            await new Location({ name: 'Case Test' }).save();
            
            const duplicateLocation = new Location({
                name: 'case test'
            });
            
            let err;
            try {
                await duplicateLocation.save();
            } catch (error) {
                err = error;
            }
            
            expect(err).toBeDefined();
            expect(err.code).toBe(11000);
        });
    });

    describe('Pre-save Hook Tests', () => {
        test('should convert name to uppercase before saving', async () => {
            const location = new Location({
                name: 'lowercase name'
            });
            const savedLocation = await location.save();
            
            expect(savedLocation.name).toBe('LOWERCASE NAME');
        });

        test('should handle mixed case names', async () => {
            const location = new Location({
                name: 'MiXeD cAsE nAmE'
            });
            const savedLocation = await location.save();
            
            expect(savedLocation.name).toBe('MIXED CASE NAME');
        });

        test('should not modify name when it is falsy', async () => {
            // Create a test document with validation disabled
            const schema = new mongoose.Schema({
                name: String
            });
            
            // Add the same pre-save hook
            schema.pre('save', function(next) {
                if (this.name) {
                    this.name = this.name.toUpperCase();
                }
                next();
            });
            
            const TestModel = mongoose.model('TestLocation', schema);
            
            // Test with undefined name
            const docUndefined = new TestModel({});
            await docUndefined.save({ validateBeforeSave: false });
            expect(docUndefined.name).toBeUndefined();
            
            // Test with empty string name
            const docEmptyString = new TestModel({ name: '' });
            await docEmptyString.save({ validateBeforeSave: false });
            expect(docEmptyString.name).toBe('');
            
            // Test with null name
            const docNull = new TestModel({ name: null });
            await docNull.save({ validateBeforeSave: false });
            expect(docNull.name).toBeNull();
            
            // Clean up
            await mongoose.deleteModel('TestLocation');
        });
    });

    describe('Timestamp Tests', () => {
        test('should set createdAt and updatedAt on creation', async () => {
            const location = new Location({
                name: 'Timestamp Test'
            });
            const savedLocation = await location.save();
            
            expect(savedLocation.createdAt).toBeDefined();
            expect(savedLocation.updatedAt).toBeDefined();
            expect(savedLocation.createdAt).toBeInstanceOf(Date);
            expect(savedLocation.updatedAt).toBeInstanceOf(Date);
        });

        test('should update updatedAt on modification', async () => {
            const location = await new Location({
                name: 'Update Test'
            }).save();
            
            const originalUpdatedAt = location.updatedAt;
            
            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 100));
            
            location.name = 'UPDATED NAME';
            const updatedLocation = await location.save();
            
            expect(updatedLocation.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });
    });
}); 