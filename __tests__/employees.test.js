const request = require('supertest');
const express = require('express');
const router = require('../routes/employees');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const pinoLogger = require('../logger');

jest.mock('../models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('../logger');

const app = express();
app.use(express.json());
app.use('/employees', router);

describe('Employee Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /employees/login', () => {
        it('should log in an employee and return a token', async () => {
            const user = { _id: '123', email: 'test@example.com', password: 'hashedpassword', twoFactorEnabled: false };
            User.findOne.mockResolvedValue(user);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            const res = await request(app)
                .post('/employees/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return an error if login fails', async () => {
            User.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/employees/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('msg', 'No employee exists');
        });
    });

    describe('GET /employees/settings', () => {
        it('should return employee settings', async () => {
            const user = { _id: '123', email: 'test@example.com' };
            const ensureAuthenticated = jest.fn((req, res, next) => next());
            app.use(ensureAuthenticated);

            const res = await request(app)
                .get('/employees/settings')
                .set('user', user);

            expect(res.status).toBe(200);
        });
    });

    describe('POST /employees/settings/reset-password', () => {
        it('should reset the password', async () => {
            const user = { _id: '123', password: 'hashedpassword' };
            User.findById.mockResolvedValue(user);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('newhashedpassword');
            user.save = jest.fn().mockResolvedValue(user);

            const res = await request(app)
                .post('/employees/settings/reset-password')
                .send({ currentPassword: 'password', newPassword: 'newpassword' });

            expect(res.status).toBe(200);
        });

        it('should return an error if current password is incorrect', async () => {
            const user = { _id: '123', password: 'hashedpassword' };
            User.findById.mockResolvedValue(user);
            bcrypt.compare.mockResolvedValue(false);

            const res = await request(app)
                .post('/employees/settings/reset-password')
                .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('msg', 'Current password is incorrect');
        });
    });

    describe('POST /employees/settings/setup-2fa', () => {
        it('should setup 2FA and return a QR code', async () => {
            const user = { _id: '123', email: 'test@example.com' };
            const secret = { base32: 'secret', otpauth_url: 'otpauth://totp/secret' };
            speakeasy.generateSecret.mockReturnValue(secret);
            User.findByIdAndUpdate.mockResolvedValue(user);
            qrcode.toDataURL.mockImplementation((url, callback) => callback(null, 'data_url'));

            const res = await request(app)
                .post('/employees/settings/setup-2fa')
                .set('user', user);

            expect(res.status).toBe(200);
        });
    });

    describe('POST /employees/settings/verify-2fa', () => {
        it('should verify 2FA token', async () => {
            const user = { _id: '123', twoFactorSecret: 'secret' };
            speakeasy.totp.verify.mockReturnValue(true);
            User.findByIdAndUpdate.mockResolvedValue(user);

            const res = await request(app)
                .post('/employees/settings/verify-2fa')
                .send({ token: '123456' });

            expect(res.status).toBe(200);
        });

        it('should return an error if 2FA token is invalid', async () => {
            speakeasy.totp.verify.mockReturnValue(false);

            const res = await request(app)
                .post('/employees/settings/verify-2fa')
                .send({ token: 'wrongtoken' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('msg', 'Invalid 2FA token');
        });
    });

    describe('POST /employees/settings/disable-2fa', () => {
        it('should disable 2FA', async () => {
            const user = { _id: '123', email: 'test@example.com' };
            User.findByIdAndUpdate.mockResolvedValue(user);

            const res = await request(app)
                .post('/employees/settings/disable-2fa')
                .set('user', user);

            expect(res.status).toBe(200);
        });
    });
});