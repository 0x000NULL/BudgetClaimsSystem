const request = require('supertest');
const express = require('express');
const reportsRouter = require('../routes/reports');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const Claim = require('../models/Claim');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const csv = require('csv-express');
const pinoLogger = require('../logger');

// Create Express app for testing
const app = express();

// Mock dependencies
jest.mock('../middleware/auth');
jest.mock('../middleware/activityLogger');
jest.mock('../models/Claim');
jest.mock('exceljs');
jest.mock('pdfkit');
jest.mock('csv-express');
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

// Setup Express middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.use('/reports', reportsRouter);

describe('Reports Routes', () => {
    let mockClaims;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock authentication middleware
        ensureAuthenticated.mockImplementation((req, res, next) => next());
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
        logActivity.mockImplementation((req, res, next) => next());

        // Setup mock claims data
        mockClaims = [
            {
                mva: '123',
                customerName: 'John Doe',
                description: 'Test Claim 1',
                status: 'Pending',
                date: new Date('2023-01-01')
            },
            {
                mva: '456',
                customerName: 'Jane Smith',
                description: 'Test Claim 2',
                status: 'Approved',
                date: new Date('2023-02-01')
            }
        ];

        // Setup mock Claim.find
        Claim.find.mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockClaims)
        });
    });

    describe('GET /reports', () => {
        it('should render the reports page for authenticated users', async () => {
            const res = await request(app)
                .get('/reports')
                .expect(200);

            expect(res.text).toContain('Reports - Budget Claims System');
            expect(ensureAuthenticated).toHaveBeenCalled();
            expect(ensureRoles).toHaveBeenCalledWith(['admin', 'manager']);
        });

        it('should handle unauthorized access', async () => {
            ensureRoles.mockImplementation(() => (req, res, next) => {
                res.status(403).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/reports')
                .expect(403);
        });
    });

    describe('POST /reports/generate', () => {
        const validRequestBody = {
            format: 'csv',
            startDate: '2023-01-01',
            endDate: '2023-12-31'
        };

        describe('CSV Generation', () => {
            it('should generate and download a CSV report', async () => {
                csv.mockImplementation((data, headers) => {
                    return JSON.stringify(data);
                });

                const res = await request(app)
                    .post('/reports/generate')
                    .send({ ...validRequestBody, format: 'csv' })
                    .expect(200);

                expect(res.headers['content-type']).toMatch(/text\/csv/);
                expect(Claim.find).toHaveBeenCalled();
                expect(csv).toHaveBeenCalledWith(mockClaims, true);
            });
        });

        describe('Excel Generation', () => {
            it('should generate and download an Excel report', async () => {
                const mockWorkbook = {
                    addWorksheet: jest.fn().mockReturnValue({
                        columns: [],
                        addRow: jest.fn()
                    }),
                    xlsx: {
                        write: jest.fn().mockImplementation((res) => {
                            res.end();
                            return Promise.resolve();
                        })
                    }
                };
                ExcelJS.Workbook.mockImplementation(() => mockWorkbook);

                const res = await request(app)
                    .post('/reports/generate')
                    .send({ ...validRequestBody, format: 'excel' })
                    .expect(200);

                expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Claims');
            });
        });

        describe('PDF Generation', () => {
            it('should generate and download a PDF report', async () => {
                const mockDoc = {
                    pipe: jest.fn(),
                    text: jest.fn(),
                    moveDown: jest.fn(),
                    end: jest.fn()
                };
                PDFDocument.mockImplementation(() => mockDoc);

                const res = await request(app)
                    .post('/reports/generate')
                    .send({ ...validRequestBody, format: 'pdf' })
                    .expect(200);

                expect(res.headers['content-type']).toBe('application/pdf');
                expect(mockDoc.text).toHaveBeenCalled();
                expect(mockDoc.end).toHaveBeenCalled();
            });
        });

        describe('Error Handling', () => {
            it('should return 400 for invalid format', async () => {
                const res = await request(app)
                    .post('/reports/generate')
                    .send({ ...validRequestBody, format: 'invalid' })
                    .expect(400);

                expect(res.body.msg).toBe('Invalid format');
            });

            it('should return 400 for invalid date range', async () => {
                const res = await request(app)
                    .post('/reports/generate')
                    .send({
                        format: 'csv',
                        startDate: 'invalid-date',
                        endDate: '2023-12-31'
                    })
                    .expect(400);

                expect(res.body.msg).toBe('Invalid date range');
            });

            it('should return 500 for database errors', async () => {
                Claim.find.mockReturnValue({
                    exec: jest.fn().mockRejectedValue(new Error('Database error'))
                });

                const res = await request(app)
                    .post('/reports/generate')
                    .send(validRequestBody)
                    .expect(500);

                expect(res.body.error).toBe('Database error');
                expect(pinoLogger.error).toHaveBeenCalled();
            });
        });

        describe('Logging', () => {
            it('should log requests with sensitive data filtered', async () => {
                await request(app)
                    .post('/reports/generate')
                    .send({
                        ...validRequestBody,
                        password: 'secret',
                        ssn: '123-45-6789'
                    });

                expect(pinoLogger.info).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: expect.any(String),
                        requestBody: expect.objectContaining({
                            format: 'csv',
                            startDate: '2023-01-01',
                            endDate: '2023-12-31',
                            password: '***REDACTED***',
                            ssn: '***REDACTED***'
                        })
                    })
                );
            });
        });
    });
});