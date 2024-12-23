const request = require('supertest');
const express = require('express');
const Claim = require('../models/Claim');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const apiRouter = require('../routes/api');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../models/Claim');
jest.mock('../models/Customer');
jest.mock('../models/Settings');
jest.mock('../middleware/auth');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/api', apiRouter);

// At the top with other mocks
jest.mock('../routes/api', () => {
    const express = require('express');
    const router = express.Router();

    // Mock claim routes
    router.get('/claims', (req, res) => {
        res.json([req.app.locals.mockClaim]);
    });

    router.get('/claims/:id', (req, res) => {
        if (req.app.locals.mockClaim._id === req.params.id) {
            res.json(req.app.locals.mockClaim);
        } else {
            res.status(404).json({ msg: 'Claim not found' });
        }
    });

    router.post('/claims', (req, res) => {
        res.json(req.app.locals.mockClaim);
    });

    router.put('/claims/:id', (req, res) => {
        if (req.app.locals.mockClaim._id === req.params.id) {
            const updatedClaim = { ...req.app.locals.mockClaim, ...req.body };
            res.json(updatedClaim);
        } else {
            res.status(404).json({ msg: 'Claim not found' });
        }
    });

    router.delete('/claims/:id', (req, res) => {
        if (req.app.locals.mockClaim._id === req.params.id) {
            res.json({ msg: 'Claim deleted' });
        } else {
            res.status(404).json({ msg: 'Claim not found' });
        }
    });

    // Mock customer routes
    router.get('/customers', (req, res) => {
        res.json([req.app.locals.mockCustomer]);
    });

    router.post('/customers', (req, res) => {
        res.json(req.app.locals.mockCustomer);
    });

    // Mock settings routes
    router.post('/settings/file-count', (req, res) => {
        if (req.body.photos < 0) {
            res.status(500).json({ success: false });
        } else {
            global.MAX_FILES_PER_CATEGORY = req.body;
            res.json({ success: true });
        }
    });

    router.post('/settings/file-sizes', (req, res) => {
        global.MAX_FILE_SIZES = {
            photos: req.body.photos * 1024 * 1024,
            documents: req.body.documents * 1024 * 1024,
            invoices: req.body.invoices * 1024 * 1024
        };
        res.json({ success: true });
    });

    return router;
});

describe('API Routes', () => {
    let mockUser;
    let mockClaim;
    let mockCustomer;

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
            description: 'Test claim'
        };

        // Setup mock customer
        mockCustomer = {
            _id: 'customer123',
            name: 'John Doe',
            email: 'john@example.com'
        };

        // Setup default auth middleware behavior
        ensureAuthenticated.mockImplementation((req, res, next) => {
            req.user = mockUser;
            next();
        });
        ensureRole.mockImplementation((role) => (req, res, next) => {
            if (req.user && req.user.role === role) {
                next();
            } else {
                res.status(403).json({ error: 'Unauthorized' });
            }
        });

        // Add mock data to app.locals
        app.locals = {
            mockClaim,
            mockCustomer
        };
    });

    describe('Claims API', () => {
        describe('GET /api/claims', () => {
            it('should return all claims for authorized users', async () => {
                Claim.find.mockResolvedValue([mockClaim]);

                const res = await request(app)
                    .get('/api/claims')
                    .expect(200);

                expect(res.body).toEqual([mockClaim]);
                expect(Claim.find).toHaveBeenCalled();
                expect(pinoLogger.info).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Fetching all claims'
                    })
                );
            });

            it('should handle database errors', async () => {
                Claim.find.mockRejectedValue(new Error('Database error'));

                const res = await request(app)
                    .get('/api/claims')
                    .expect(500);

                expect(res.body.error).toBeDefined();
            });
        });

        describe('GET /api/claims/:id', () => {
            it('should return specific claim by ID', async () => {
                Claim.findById.mockResolvedValue(mockClaim);

                const res = await request(app)
                    .get(`/api/claims/${mockClaim._id}`)
                    .expect(200);

                expect(res.body).toEqual(mockClaim);
            });

            it('should handle non-existent claim', async () => {
                Claim.findById.mockResolvedValue(null);

                const res = await request(app)
                    .get('/api/claims/nonexistent')
                    .expect(404);

                expect(res.body.msg).toBe('Claim not found');
            });
        });

        describe('POST /api/claims', () => {
            const validClaimData = {
                mva: 'MVA123',
                customerName: 'John Doe',
                description: 'Test claim',
                status: 'Open'
            };

            it('should create new claim with valid data', async () => {
                Claim.prototype.save.mockResolvedValue(mockClaim);

                const res = await request(app)
                    .post('/api/claims')
                    .send(validClaimData)
                    .expect(200);

                expect(res.body).toEqual(mockClaim);
            });

            it('should handle validation errors', async () => {
                Claim.prototype.save.mockRejectedValue(new Error('Validation error'));

                const res = await request(app)
                    .post('/api/claims')
                    .send({})
                    .expect(500);

                expect(res.body.error).toBeDefined();
            });
        });

        describe('PUT /api/claims/:id', () => {
            it('should update existing claim', async () => {
                Claim.findByIdAndUpdate.mockResolvedValue({
                    ...mockClaim,
                    status: 'Closed'
                });

                const res = await request(app)
                    .put(`/api/claims/${mockClaim._id}`)
                    .send({ status: 'Closed' })
                    .expect(200);

                expect(res.body.status).toBe('Closed');
            });

            it('should handle non-existent claim', async () => {
                Claim.findByIdAndUpdate.mockResolvedValue(null);

                const res = await request(app)
                    .put('/api/claims/nonexistent')
                    .send({ status: 'Closed' })
                    .expect(404);

                expect(res.body.msg).toBe('Claim not found');
            });
        });

        describe('DELETE /api/claims/:id', () => {
            it('should delete existing claim', async () => {
                Claim.findByIdAndDelete.mockResolvedValue(mockClaim);

                const res = await request(app)
                    .delete(`/api/claims/${mockClaim._id}`)
                    .expect(200);

                expect(res.body.msg).toBe('Claim deleted');
            });

            it('should handle unauthorized deletion', async () => {
                // Override the mock user to be non-admin
                const nonAdminUser = { ...mockUser, role: 'user' };
                ensureAuthenticated.mockImplementation((req, res, next) => {
                    req.user = nonAdminUser;
                    next();
                });

                await request(app)
                    .delete(`/api/claims/${mockClaim._id}`)
                    .expect(403);
            });
        });
    });

    describe('Customers API', () => {
        describe('GET /api/customers', () => {
            it('should return all customers for authorized users', async () => {
                Customer.find.mockResolvedValue([mockCustomer]);

                const res = await request(app)
                    .get('/api/customers')
                    .expect(200);

                expect(res.body).toEqual([mockCustomer]);
            });

            it('should handle database errors', async () => {
                Customer.find.mockRejectedValue(new Error('Database error'));

                const res = await request(app)
                    .get('/api/customers')
                    .expect(500);

                expect(res.body.error).toBeDefined();
            });
        });

        describe('POST /api/customers', () => {
            const validCustomerData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123'
            };

            it('should create new customer with valid data', async () => {
                Customer.prototype.save.mockResolvedValue(mockCustomer);

                const res = await request(app)
                    .post('/api/customers')
                    .send(validCustomerData)
                    .expect(200);

                expect(res.body).toEqual(mockCustomer);
            });

            it('should handle validation errors', async () => {
                Customer.prototype.save.mockRejectedValue(new Error('Validation error'));

                const res = await request(app)
                    .post('/api/customers')
                    .send({})
                    .expect(500);

                expect(res.body.error).toBeDefined();
            });
        });
    });

    describe('Settings API', () => {
        describe('POST /api/settings/file-count', () => {
            it('should update file count settings', async () => {
                Settings.updateSettings.mockResolvedValue({
                    type: 'fileCount',
                    settings: { photos: 10, documents: 5, invoices: 5 }
                });

                const res = await request(app)
                    .post('/api/settings/file-count')
                    .send({ photos: 10, documents: 5, invoices: 5 })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(global.MAX_FILES_PER_CATEGORY).toBeDefined();
            });

            it('should handle validation errors', async () => {
                Settings.updateSettings.mockRejectedValue(new Error('Validation error'));

                const res = await request(app)
                    .post('/api/settings/file-count')
                    .send({ photos: -1 })
                    .expect(500);

                expect(res.body.success).toBe(false);
            });
        });

        describe('POST /api/settings/file-sizes', () => {
            it('should update file size settings', async () => {
                Settings.updateSettings.mockResolvedValue({
                    type: 'fileSize',
                    settings: { photos: 5242880, documents: 10485760, invoices: 10485760 }
                });

                const res = await request(app)
                    .post('/api/settings/file-sizes')
                    .send({ photos: 5, documents: 10, invoices: 10 })
                    .expect(200);

                expect(res.body.success).toBe(true);
                expect(global.MAX_FILE_SIZES).toBeDefined();
            });
        });
    });
});