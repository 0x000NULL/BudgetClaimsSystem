const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const User = require('../models/User');
const Claim = require('../models/Claim');
const exportRoutes = require('../routes/export');
const pinoLogger = require('../logger');

jest.mock('fs');
jest.mock('path');
jest.mock('archiver');
jest.mock('../models/User');
jest.mock('../models/Claim');
jest.mock('../logger');

const app = express();
app.use('/export', exportRoutes);

describe('Export Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initiate full export and return a zip file', async () => {
        const mockUsers = [{ email: 'user1@example.com' }, { email: 'user2@example.com' }];
        const mockClaims = [{ claimId: 'claim1' }, { claimId: 'claim2' }];
        const mockWriteStream = {
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback();
                }
            }),
            end: jest.fn()
        };
        const mockArchive = {
            pipe: jest.fn(),
            append: jest.fn(),
            file: jest.fn(),
            finalize: jest.fn(),
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback();
                }
            }),
            pointer: jest.fn().mockReturnValue(1024)
        };

        fs.createWriteStream.mockReturnValue(mockWriteStream);
        archiver.mockReturnValue(mockArchive);
        User.find.mockResolvedValue(mockUsers);
        Claim.find.mockResolvedValue(mockClaims);
        fs.readdirSync.mockReturnValue(['file1.txt', 'file2.txt']);
        path.join.mockImplementation((...args) => args.join('/'));

        const response = await request(app).get('/export/full');

        expect(response.status).toBe(200);
        expect(response.header['content-type']).toBe('application/zip');
        expect(fs.createWriteStream).toHaveBeenCalledWith(expect.stringContaining('full_export.zip'));
        expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
        expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
        expect(mockArchive.append).toHaveBeenCalledWith(JSON.stringify(mockUsers), { name: 'users.json' });
        expect(mockArchive.append).toHaveBeenCalledWith(JSON.stringify(mockClaims), { name: 'claims.json' });
        expect(mockArchive.file).toHaveBeenCalledWith(expect.stringContaining('uploads/file1.txt'), { name: 'uploads/file1.txt' });
        expect(mockArchive.file).toHaveBeenCalledWith(expect.stringContaining('uploads/file2.txt'), { name: 'uploads/file2.txt' });
        expect(mockArchive.finalize).toHaveBeenCalled();
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Full export initiated' }));
    });

    it('should handle errors during export', async () => {
        const mockError = new Error('Test error');
        const mockWriteStream = {
            on: jest.fn(),
            end: jest.fn()
        };
        const mockArchive = {
            pipe: jest.fn(),
            append: jest.fn(),
            file: jest.fn(),
            finalize: jest.fn(),
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'error') {
                    callback(mockError);
                }
            }),
            pointer: jest.fn().mockReturnValue(1024)
        };

        fs.createWriteStream.mockReturnValue(mockWriteStream);
        archiver.mockReturnValue(mockArchive);
        User.find.mockRejectedValue(mockError);
        Claim.find.mockRejectedValue(mockError);
        fs.readdirSync.mockReturnValue(['file1.txt', 'file2.txt']);
        path.join.mockImplementation((...args) => args.join('/'));

        const response = await request(app).get('/export/full');

        expect(response.status).toBe(500);
        expect(response.text).toBe('Error during export');
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Full export initiated' }));
        expect(pinoLogger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error during export', error: mockError.message }));
    });
});