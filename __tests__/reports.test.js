const request = require('supertest');
const express = require('express');
const reportsRouter = require('../routes/reports');
const { ensureAuthenticated, ensureRoles } = require('../middleware/auth');
const logActivity = require('../middleware/activityLogger');
const Claim = require('../models/Claim');
const ExcelJS = require('exceljs');
const pdfkit = require('pdfkit');
const csv = require('csv-express');

jest.mock('../middleware/auth');
jest.mock('../middleware/activityLogger');
jest.mock('../models/Claim');
jest.mock('exceljs');
jest.mock('pdfkit');
jest.mock('csv-express');

const app = express();
app.use(express.json());
app.use('/reports', reportsRouter);

describe('Reports Routes', () => {
    beforeEach(() => {
        ensureAuthenticated.mockImplementation((req, res, next) => next());
        ensureRoles.mockImplementation((roles) => (req, res, next) => next());
        logActivity.mockImplementation((req, res, next) => next());
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /reports', () => {
        it('should render the reports page for authenticated users with admin or manager roles', async () => {
            const res = await request(app).get('/reports');
            expect(res.status).toBe(200);
            expect(res.text).toContain('Reports - Budget Claims System');
        });
    });

    describe('POST /reports/generate', () => {
        it('should generate and download a CSV report', async () => {
            Claim.find.mockResolvedValue([{ mva: '123', customerName: 'John Doe', description: 'Test', status: 'Pending', date: new Date() }]);
            const res = await request(app)
                .post('/reports/generate')
                .send({ format: 'csv', startDate: '2023-01-01', endDate: '2023-12-31' });
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('text/csv');
        });

        it('should generate and download an Excel report', async () => {
            Claim.find.mockResolvedValue([{ mva: '123', customerName: 'John Doe', description: 'Test', status: 'Pending', date: new Date() }]);
            const workbookMock = {
                addWorksheet: jest.fn().mockReturnValue({
                    columns: [],
                    addRow: jest.fn()
                }),
                xlsx: {
                    write: jest.fn().mockResolvedValue()
                }
            };
            ExcelJS.Workbook.mockImplementation(() => workbookMock);

            const res = await request(app)
                .post('/reports/generate')
                .send({ format: 'excel', startDate: '2023-01-01', endDate: '2023-12-31' });
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });

        it('should generate and download a PDF report', async () => {
            Claim.find.mockResolvedValue([{ mva: '123', customerName: 'John Doe', description: 'Test', status: 'Pending', date: new Date() }]);
            const docMock = {
                pipe: jest.fn(),
                text: jest.fn(),
                moveDown: jest.fn(),
                end: jest.fn()
            };
            pdfkit.mockImplementation(() => docMock);

            const res = await request(app)
                .post('/reports/generate')
                .send({ format: 'pdf', startDate: '2023-01-01', endDate: '2023-12-31' });
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('application/pdf');
        });

        it('should return 400 for invalid report format', async () => {
            const res = await request(app)
                .post('/reports/generate')
                .send({ format: 'invalid', startDate: '2023-01-01', endDate: '2023-12-31' });
            expect(res.status).toBe(400);
            expect(res.body.msg).toBe('Invalid format');
        });

        it('should return 500 for server errors', async () => {
            Claim.find.mockRejectedValue(new Error('Database error'));
            const res = await request(app)
                .post('/reports/generate')
                .send({ format: 'csv', startDate: '2023-01-01', endDate: '2023-12-31' });
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Database error');
        });
    });
});