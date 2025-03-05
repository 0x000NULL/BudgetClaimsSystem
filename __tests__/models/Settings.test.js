const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Settings = require('../../models/Settings');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.disconnect(); // Disconnect from any existing connections
    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

beforeEach(async () => {
    await Settings.deleteMany({});
});

describe('Settings Model Test Suite', () => {
    describe('Schema Validation', () => {
        it('should validate a valid settings document', async () => {
            const validSettings = {
                type: 'fileSize',
                settings: {
                    photos: 50,
                    documents: 20,
                    invoices: 20
                }
            };

            const settings = new Settings(validSettings);
            const savedSettings = await settings.save();
            
            expect(savedSettings._id).toBeDefined();
            expect(savedSettings.type).toBe(validSettings.type);
            expect(savedSettings.settings).toEqual(validSettings.settings);
            expect(savedSettings.updatedAt).toBeDefined();
        });

        it('should fail validation when type is missing', async () => {
            const invalidSettings = {
                settings: {
                    photos: 50,
                    documents: 20,
                    invoices: 20
                }
            };

            const settings = new Settings(invalidSettings);
            
            await expect(settings.save()).rejects.toThrow(mongoose.Error.ValidationError);
        });

        it('should fail validation when type is invalid', async () => {
            const invalidSettings = {
                type: 'invalidType',
                settings: {
                    photos: 50,
                    documents: 20,
                    invoices: 20
                }
            };

            const settings = new Settings(invalidSettings);
            
            await expect(settings.save()).rejects.toThrow(mongoose.Error.ValidationError);
        });

        it('should fail validation when settings values are negative', async () => {
            const invalidSettings = {
                type: 'fileSize',
                settings: {
                    photos: -1,
                    documents: 20,
                    invoices: 20
                }
            };

            const settings = new Settings(invalidSettings);
            
            await expect(settings.save()).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });

    describe('Pre-save Middleware', () => {
        it('should update updatedAt timestamp on save', async () => {
            const settings = new Settings({
                type: 'fileSize',
                settings: {
                    photos: 50,
                    documents: 20,
                    invoices: 20
                }
            });

            const savedSettings = await settings.save();
            const originalTimestamp = savedSettings.updatedAt;

            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 100));

            savedSettings.settings.photos = 60;
            const updatedSettings = await savedSettings.save();

            expect(updatedSettings.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
        });
    });

    describe('Static Methods', () => {
        describe('getSettingsByType', () => {
            it('should return settings for valid type', async () => {
                const testSettings = {
                    type: 'fileSize',
                    settings: {
                        photos: 50,
                        documents: 20,
                        invoices: 20
                    }
                };

                await new Settings(testSettings).save();

                const retrievedSettings = await Settings.getSettingsByType('fileSize');
                expect(retrievedSettings).toEqual(testSettings.settings);
            });

            it('should return null for non-existent type', async () => {
                const retrievedSettings = await Settings.getSettingsByType('nonExistentType');
                expect(retrievedSettings).toBeNull();
            });

            it('should handle errors gracefully', async () => {
                // Simulate a database error by disconnecting
                await mongoose.disconnect();
                
                const retrievedSettings = await Settings.getSettingsByType('fileSize');
                expect(retrievedSettings).toBeNull();

                // Reconnect for other tests
                const mongoUri = mongoServer.getUri();
                await mongoose.connect(mongoUri);
            });
        });

        describe('updateSettings', () => {
            it('should create new settings if not exists', async () => {
                const newSettings = {
                    photos: 60,
                    documents: 30,
                    invoices: 25
                };

                const updatedSettings = await Settings.updateSettings('fileSize', newSettings);
                expect(updatedSettings).toEqual(newSettings);

                const savedSettings = await Settings.findOne({ type: 'fileSize' });
                expect(savedSettings.settings).toEqual(newSettings);
            });

            it('should update existing settings', async () => {
                const initialSettings = {
                    type: 'fileSize',
                    settings: {
                        photos: 50,
                        documents: 20,
                        invoices: 20
                    }
                };

                await new Settings(initialSettings).save();

                const newSettings = {
                    photos: 60,
                    documents: 30,
                    invoices: 25
                };

                const updatedSettings = await Settings.updateSettings('fileSize', newSettings);
                expect(updatedSettings).toEqual(newSettings);
            });

            it('should throw error for invalid settings', async () => {
                const invalidSettings = {
                    photos: -1,
                    documents: 30,
                    invoices: 25
                };

                await expect(Settings.updateSettings('fileSize', invalidSettings))
                    .rejects.toThrow();
            });
        });
    });
}); 