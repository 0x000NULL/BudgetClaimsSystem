/**
 * @fileoverview Tests for export routes
 */

const request = require('supertest');
const express = require('express');
const { mockObjectId, setupMiddleware, mockAuthMiddleware, mockErrorHandler } = require('./__mocks__/common');

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock dependencies
jest.mock('../../logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
    ensureAuthenticated: jest.fn((req, res, next) => next()),
    ensureRoles: jest.fn(() => (req, res, next) => next())
}));

// Mock ExcelJS
jest.mock('exceljs', () => {
    const mockWorksheet = {
        getCell: jest.fn().mockReturnThis(),
        value: null,
        alignment: {},
        font: {},
        border: {},
        fill: {},
        addRow: jest.fn().mockReturnThis()
    };

    const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
        xlsx: {
            writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-data'))
        }
    };

    return {
        Workbook: jest.fn().mockReturnValue(mockWorkbook)
    };
});

// Mock pdfkit
jest.mock('pdfkit', () => {
    const mockPdf = {
        pipe: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        fontSize: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function(event, callback) {
            if(event === 'end') {
                callback();
            }
            return this;
        })
    };
    return jest.fn().mockReturnValue(mockPdf);
});

// Mock csv-express
jest.mock('csv-express', () => ({
    json: jest.fn().mockImplementation((data, fileName, options) => {
        return (req, res, next) => {
            res.send('CSV content');
        };
    })
}));

// Mock Claim model
const mockClaims = [
    {
        _id: mockObjectId,
        mva: 'CLAIM1',
        customerName: 'Customer 1',
        damagesTotal: 2000,
        status: ['pending'],
        location: 'Location 1',
        damageType: 'Damage Type 1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        toObject: () => ({
            _id: mockObjectId,
            mva: 'CLAIM1',
            customerName: 'Customer 1',
            damagesTotal: 2000,
            status: ['pending'],
            location: 'Location 1',
            damageType: 'Damage Type 1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date()
        })
    },
    {
        _id: 'anotherObjectId',
        mva: 'CLAIM2',
        customerName: 'Customer 2',
        damagesTotal: 3000,
        status: ['approved'],
        location: 'Location 2',
        damageType: 'Damage Type 2',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
        toObject: () => ({
            _id: 'anotherObjectId',
            mva: 'CLAIM2',
            customerName: 'Customer 2',
            damagesTotal: 3000,
            status: ['approved'],
            location: 'Location 2',
            damageType: 'Damage Type 2',
            createdAt: new Date('2024-02-01'),
            updatedAt: new Date()
        })
    }
];

jest.mock('../../models/Claim', () => ({
    find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockClaims)
    }),
    findById: jest.fn().mockImplementation((id) => ({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(id === mockObjectId ? mockClaims[0] : null)
    }))
}));

// Import routes
const exportRouter = require('../../routes/export');

describe('Export Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        setupMiddleware(app);
        mockErrorHandler(app);
        
        // Mock response methods
        app.use((req, res, next) => {
            const headers = {};
            res.set = (key, value) => {
                headers[key.toLowerCase()] = value;
                return res;
            };
            res.get = (key) => headers[key.toLowerCase()];
            next();
        });
        
        app.use('/export', exportRouter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /export/excel', () => {
        test('should export claims data to Excel', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/export/excel');
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });
    });

    describe('GET /export/csv', () => {
        test('should export claims data to CSV', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/export/csv');
            expect(response.status).toBe(200);
            expect(response.text).toBe('CSV content');
        });
    });

    describe('GET /export/pdf', () => {
        test('should export claims data to PDF', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/export/pdf');
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/pdf');
        });
    });

    describe('GET /export/claim/:id/pdf', () => {
        test('should export specific claim to PDF', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get(`/export/claim/${mockObjectId}/pdf`);
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/pdf');
        });
        
        test('should return 404 if claim not found', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get('/export/claim/nonexistentid/pdf');
            expect(response.status).toBe(404);
        });
    });

    describe('GET /export/claim/:id/excel', () => {
        test('should export specific claim to Excel', async () => {
            app.use(mockAuthMiddleware('admin'));
            
            const response = await request(app).get(`/export/claim/${mockObjectId}/excel`);
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });
    });
}); 