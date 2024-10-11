const request = require('supertest');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');
const User = require('../models/User');
const Claim = require('../models/Claim');
const pinoLogger = require('../logger');
const importRoutes = require('../routes/import');

const app = express();
app.use(express.json());
app.use('/import', importRoutes);

jest.mock('fs');
jest.mock('path');
jest.mock('extract-zip');
jest.mock('../models/User');
jest.mock('../models/Claim');
jest.mock('../logger');

describe('POST /import/full', () => {
    const upload = multer({ dest: 'uploads/' });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle full data import successfully', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');
        const mockUsersData = JSON.stringify([{ email: 'user1@example.com' }, { email: 'user2@example.com' }]);
        const mockClaimsData = JSON.stringify([{ claimId: 'claim1' }, { claimId: 'claim2' }]);
        const mockUploadsDir = path.join(mockExtractPath, 'uploads');

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('users.json')) return mockUsersData;
            if (filePath.includes('claims.json')) return mockClaimsData;
            return '';
        });

        fs.readdirSync.mockReturnValue(['file1.txt', 'file2.txt']);
        fs.copyFileSync.mockImplementation(() => {});

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(200)
            .expect('Import completed successfully');

        expect(extract).toHaveBeenCalledWith(mockFilePath, { dir: mockExtractPath });
        expect(User.deleteMany).toHaveBeenCalled();
        expect(User.insertMany).toHaveBeenCalledWith(JSON.parse(mockUsersData));
        expect(Claim.deleteMany).toHaveBeenCalled();
        expect(Claim.insertMany).toHaveBeenCalledWith(JSON.parse(mockClaimsData));
        expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Import completed successfully'
        }));
    });

    it('should handle errors during import', async () => {
        const mockError = new Error('Mock error');
        extract.mockRejectedValue(mockError);

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(500)
            .expect('Error during import');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error during import',
            error: mockError
        }));
    });

    it('should handle missing file error', async () => {
        await request(app)
            .post('/import/full')
            .expect(400)
            .expect('No file uploaded');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'No file uploaded'
        }));
    });

    it('should handle invalid JSON in users file', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');
        const invalidJson = '{ email: "user1@example.com" '; // Invalid JSON

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('users.json')) return invalidJson;
            return '';
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(500)
            .expect('Error during import');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error during import',
            error: expect.any(SyntaxError)
        }));
    });

    it('should handle file system errors', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');
        const mockError = new Error('File system error');

        fs.readFileSync.mockImplementation(() => {
            throw mockError;
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(500)
            .expect('Error during import');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error during import',
            error: mockError
        }));
    });

    // New tests
    it('should handle empty users file', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');
        const emptyJson = '[]'; // Empty JSON array

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('users.json')) return emptyJson;
            return '';
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(200)
            .expect('Import completed successfully');

        expect(User.insertMany).toHaveBeenCalledWith([]);
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Users imported',
            usersCount: 0
        }));
    });

    it('should handle empty claims file', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');
        const emptyJson = '[]'; // Empty JSON array

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('claims.json')) return emptyJson;
            return '';
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(200)
            .expect('Import completed successfully');

        expect(Claim.insertMany).toHaveBeenCalledWith([]);
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Claims imported',
            claimsCount: 0
        }));
    });

    it('should handle missing users file', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('users.json')) throw new Error('File not found');
            return '';
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(500)
            .expect('Error during import');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error during import',
            error: expect.any(Error)
        }));
    });

    it('should handle missing claims file', async () => {
        const mockFilePath = 'uploads/mockfile.zip';
        const mockExtractPath = path.join(__dirname, '../imports');

        fs.readFileSync.mockImplementation((filePath) => {
            if (filePath.includes('claims.json')) throw new Error('File not found');
            return '';
        });

        await request(app)
            .post('/import/full')
            .attach('file', Buffer.from('mock file content'), 'mockfile.zip')
            .expect(500)
            .expect('Error during import');

        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Error during import',
            error: expect.any(Error)
        }));
    });
});