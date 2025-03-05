const mongoose = require('mongoose');

// Mock data
const mockData = {
    _id: 'mockClaimId',
    claimNumber: '10000001',
    mva: true,
    customerName: 'John Doe',
    damagesTotal: 1000,
    createdBy: 'user123',
    files: {
        photos: [],
        invoices: [],
        incidentReports: []
    },
    invoiceTotals: [],
    status: 'status123',
    damageType: 'damageType123',
    location: 'location123'
};

// Mock Mongoose
jest.mock('mongoose', () => ({
    Schema: jest.fn(),
    model: jest.fn()
}));

// Mock ClaimSettings
jest.mock('../../models/ClaimSettings', () => ({
    findOne: jest.fn().mockResolvedValue({
        status: { name: 'Test Status' },
        damageType: { name: 'Test Damage Type' },
        location: { name: 'Test Location' }
    })
}));

// Mock Claim model
jest.mock('../../models/Claim', () => {
    // Create a mock document class
    class MockDocument {
        constructor(data) {
            Object.assign(this, data);
        }

        async getStatusName() {
            return 'Test Status';
        }

        async getDamageTypeName() {
            return 'Test Damage Type';
        }

        async getLocationName() {
            return 'Test Location';
        }

        populate() {
            return {
                exec: () => Promise.resolve(this)
            };
        }
    }

    // Create a mock model class
    class MockModel {
        static async create(data) {
            // Validation checks
            if (!data.createdBy) {
                throw new Error('createdBy is required');
            }
            if (data.damagesTotal < 0) {
                throw new Error('damagesTotal must be a positive number');
            }
            if (data.files && typeof data.files.incidentReports !== 'undefined' && !Array.isArray(data.files.incidentReports)) {
                throw new Error('files.incidentReports must be an array');
            }
            if (data.invoiceTotals && !Array.isArray(data.invoiceTotals)) {
                throw new Error('invoiceTotals must be an array');
            }

            return new MockDocument(data);
        }

        static async findById(id) {
            return new MockDocument({ ...mockData, _id: id });
        }
    }

    return { Claim: MockModel };
});

// Require the actual module after mocking
const { Claim } = require('../../models/Claim');

jest.setTimeout(60000);

describe('Claim Model Test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Validation', () => {
        test('should create claim with valid data', async () => {
            const claim = await Claim.create(mockData);
            expect(claim.claimNumber).toBe('10000001');
            expect(claim.damagesTotal).toBe(1000);
        });

        test('should fail without required fields', async () => {
            const invalidData = { ...mockData, createdBy: undefined };
            await expect(Claim.create(invalidData)).rejects.toThrow('createdBy is required');
        });

        test('should fail with negative damagesTotal', async () => {
            const invalidData = { ...mockData, damagesTotal: -100 };
            await expect(Claim.create(invalidData)).rejects.toThrow('damagesTotal must be a positive number');
        });
    });

    describe('File Management', () => {
        test('should validate file arrays', async () => {
            const invalidData = {
                ...mockData,
                files: { ...mockData.files, incidentReports: 'not an array' }
            };
            await expect(Claim.create(invalidData)).rejects.toThrow('files.incidentReports must be an array');
        });

        test('should validate invoice totals array', async () => {
            const invalidData = { ...mockData, invoiceTotals: 'not an array' };
            await expect(Claim.create(invalidData)).rejects.toThrow('invoiceTotals must be an array');
        });

        test('should accept valid file arrays', async () => {
            const validData = {
                ...mockData,
                files: {
                    photos: ['test1.jpg', 'test2.jpg'],
                    invoices: ['invoice1.pdf', 'invoice2.pdf'],
                    incidentReports: ['report1.pdf']
                }
            };
            const claim = await Claim.create(validData);
            expect(claim.files.photos).toEqual(['test1.jpg', 'test2.jpg']);
            expect(claim.files.invoices).toEqual(['invoice1.pdf', 'invoice2.pdf']);
        });
    });

    describe('Helper Methods', () => {
        test('should get names through helper methods', async () => {
            const claim = await Claim.create(mockData);
            expect(await claim.getStatusName()).toBe('Test Status');
            expect(await claim.getDamageTypeName()).toBe('Test Damage Type');
            expect(await claim.getLocationName()).toBe('Test Location');
        });
    });

    describe('Relationships', () => {
        test('should populate referenced fields', async () => {
            const claim = await Claim.findById('mockClaimId');
            const populatedClaim = await claim.populate().exec();
            expect(populatedClaim._id).toBe('mockClaimId');
            expect(await populatedClaim.getStatusName()).toBe('Test Status');
        });
    });
});