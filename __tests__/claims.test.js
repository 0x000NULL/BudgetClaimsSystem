const request = require('supertest');
const express = require('express');
const path = require('path');
const claimsRouter = require('../routes/claims');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const Claim = require('../models/Claim');
const Status = require('../models/Status');
const DamageType = require('../models/DamageType');
const Location = require('../models/Location');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../models/Claim');
jest.mock('../models/Status');
jest.mock('../models/DamageType');
jest.mock('../models/Location');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/claims', claimsRouter);

describe('Claims Routes', () => {
    let mockUser;
    let mockClaim;
    let mockFiles;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = {
            id: 'testUserId',
            email: 'test@example.com',
            role: 'admin'
        };

        // Setup mock claim
        mockClaim = {
            _id: 'claim123',
            mva: 'MVA123',
            customerName: 'John Doe',
            status: 'Open',
            damageType: 'Light hit',
            files: {
                photos: ['photo1.jpg'],
                documents: ['doc1.pdf'],
                invoices: ['invoice1.pdf']
            },
            save: jest.fn().mockResolvedValue(true)
        };

        // Setup mock files
        mockFiles = {
            photos: {
                name: 'test.jpg',
                mimetype: 'image/jpeg',
                size: 1000000,
                mv: jest.fn().mockResolvedValue(undefined)
            }
        };

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());

        // Setup global variables for file upload limits
        global.MAX_FILE_SIZES = {
            photos: 5 * 1024 * 1024,
            documents: 10 * 1024 * 1024,
            invoices: 10 * 1024 * 1024
        };

        global.MAX_FILES_PER_CATEGORY = {
            photos: 10,
            documents: 5,
            invoices: 5
        };

        global.ALLOWED_FILE_TYPES = {
            photos: ['.jpg', '.jpeg', '.png'],
            documents: ['.pdf', '.doc', '.docx'],
            invoices: ['.pdf', '.jpg', '.jpeg', '.png']
        };
    });

    describe('GET /claims', () => {
        it('should return all claims for authorized users', async () => {
            Claim.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue([mockClaim])
            });

            const res = await request(app)
                .get('/claims')
                .expect(200);

            expect(res.body).toEqual([mockClaim]);
            expect(Claim.find).toHaveBeenCalled();
        });

        it('should handle query parameters', async () => {
            const query = {
                mva: 'MVA123',
                customerName: 'John',
                status: 'Open',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            await request(app)
                .get('/claims')
                .query(query)
                .expect(200);

            expect(Claim.find).toHaveBeenCalledWith(expect.objectContaining({
                mva: 'MVA123',
                customerName: expect.any(RegExp),
                status: 'Open',
                date: {
                    $gte: expect.any(Date),
                    $lte: expect.any(Date)
                }
            }));
        });

        it('should handle database errors', async () => {
            Claim.find.mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('Database error'))
            });

            const res = await request(app)
                .get('/claims')
                .expect(500);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('POST /claims', () => {
        const validClaimData = {
            mva: 'MVA123',
            customerName: 'John Doe',
            status: 'Open',
            damageType: 'Light hit'
        };

        it('should create new claim with valid data', async () => {
            const res = await request(app)
                .post('/claims')
                .field(validClaimData)
                .attach('photos', Buffer.from('mock image'), 'test.jpg')
                .expect(302);

            expect(res.header.location).toBe('/dashboard');
            expect(Claim.prototype.save).toHaveBeenCalled();
        });

        it('should handle file upload validation', async () => {
            const res = await request(app)
                .post('/claims')
                .field(validClaimData)
                .attach('photos', Buffer.from('mock image'), 'test.txt')
                .expect(400);

            expect(res.body.error).toBe('File validation failed');
        });

        it('should handle database errors', async () => {
            Claim.prototype.save.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .post('/claims')
                .field(validClaimData)
                .expect(500);

            expect(res.body.error).toBeDefined();
        });
    });

    describe('PUT /claims/:id', () => {
        it('should update existing claim', async () => {
            Claim.findById.mockResolvedValue(mockClaim);

            const res = await request(app)
                .put(`/claims/${mockClaim._id}`)
                .send({ status: 'Closed' })
                .expect(302);

            expect(mockClaim.save).toHaveBeenCalled();
        });

        it('should handle non-existent claim', async () => {
            Claim.findById.mockResolvedValue(null);

            const res = await request(app)
                .put('/claims/nonexistent')
                .send({ status: 'Closed' })
                .expect(404);

            expect(res.body.error).toBe('Claim not found');
        });

        it('should handle file updates', async () => {
            Claim.findById.mockResolvedValue(mockClaim);

            const res = await request(app)
                .put(`/claims/${mockClaim._id}`)
                .field({ status: 'Closed' })
                .attach('photos', Buffer.from('mock image'), 'test.jpg')
                .expect(302);

            expect(mockClaim.save).toHaveBeenCalled();
        });
    });

    describe('DELETE /claims/:id', () => {
        it('should delete existing claim', async () => {
            Claim.findByIdAndDelete.mockResolvedValue(mockClaim);

            const res = await request(app)
                .delete(`/claims/${mockClaim._id}`)
                .expect(200);

            expect(res.body.msg).toBe('Claim deleted');
        });

        it('should handle non-existent claim', async () => {
            Claim.findByIdAndDelete.mockResolvedValue(null);

            const res = await request(app)
                .delete('/claims/nonexistent')
                .expect(404);

            expect(res.body.error).toBe('Claim not found');
        });
    });

    describe('PUT /claims/bulk/update', () => {
        it('should update multiple claims', async () => {
            const updateData = {
                claimIds: ['1', '2'],
                updateData: { status: 'Closed' }
            };

            Claim.updateMany.mockResolvedValue({ nModified: 2 });

            const res = await request(app)
                .put('/claims/bulk/update')
                .send(updateData)
                .expect(200);

            expect(res.body.result.nModified).toBe(2);
        });

        it('should handle database errors', async () => {
            Claim.updateMany.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .put('/claims/bulk/update')
                .send({ claimIds: ['1'], updateData: {} })
                .expect(500);

            expect(res.body.error).toBeDefined();
        });
    });
});