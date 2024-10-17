const request = require('supertest');
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const session = require('express-session');
const customersRouter = require('../routes/customers');
const Customer = require('../models/Customer');
const Claim = require('../models/Claim');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
app.use(bodyParser.json());
app.use(session({ secret: 'testsecret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use('/customers', customersRouter);

jest.mock('../models/Customer');
jest.mock('../models/Claim');
jest.mock('bcryptjs');
jest.mock('speakeasy');
jest.mock('qrcode');

describe('Customer Routes', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        req = {};
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            render: jest.fn()
        };
        next = jest.fn();
    });

    afterAll(async () => {
        // Close any open connections or servers here
        await new Promise(resolve => setTimeout(() => resolve(), 500)); // wait for 500ms to ensure all connections are closed
    });

    describe('POST /customers/register', () => {
        it('should register a new customer', async () => {
            const customerData = { name: 'John Doe', email: 'john@example.com', password: 'password123' };
            Customer.findOne.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            Customer.prototype.save.mockResolvedValue(customerData);

            await request(app)
                .post('/customers/register')
                .send(customerData)
                .expect(200);

            expect(Customer.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
        });

        it('should not register a customer with an existing email', async () => {
            const customerData = { name: 'John Doe', email: 'john@example.com', password: 'password123' };
            Customer.findOne.mockResolvedValue(customerData);

            await request(app)
                .post('/customers/register')
                .send(customerData)
                .expect(400);

            expect(Customer.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
        });
    });

    describe('POST /customers/login', () => {
        it('should log in an existing customer', async () => {
            const customerData = { email: 'john@example.com', password: 'password123' };
            passport.authenticate = jest.fn((strategy, callback) => (req, res, next) => {
                callback(null, customerData, null);
            });

            await request(app)
                .post('/customers/login')
                .send(customerData)
                .expect(200);

            expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
        });

        it('should not log in a customer with incorrect credentials', async () => {
            const customerData = { email: 'john@example.com', password: 'wrongpassword' };
            passport.authenticate = jest.fn((strategy, callback) => (req, res, next) => {
                callback(null, false, { message: 'Incorrect credentials' });
            });

            await request(app)
                .post('/customers/login')
                .send(customerData)
                .expect(401);

            expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
        });
    });

    describe('POST /customers/claims', () => {
        it('should submit a new claim', async () => {
            const claimData = { mva: '12345', description: 'Test claim' };
            const customer = { _id: 'customerId', name: 'John Doe' };
            req.user = customer;
            Claim.prototype.save.mockResolvedValue(claimData);
            Customer.findByIdAndUpdate.mockResolvedValue(customer);

            await request(app)
                .post('/customers/claims')
                .send(claimData)
                .expect(200);

            expect(Claim.prototype.save).toHaveBeenCalled();
            expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('customerId', { $push: { claims: expect.any(String) } });
        });

        it('should not submit a claim without required fields', async () => {
            const claimData = { description: 'Test claim' };
            const customer = { _id: 'customerId', name: 'John Doe' };
            req.user = customer;

            await request(app)
                .post('/customers/claims')
                .send(claimData)
                .expect(400);
        });
    });

    describe('GET /customers/claims', () => {
        it('should fetch customer claims', async () => {
            const claims = [{ mva: '12345', description: 'Test claim' }];
            const customer = { name: 'John Doe' };
            req.user = customer;
            Claim.find.mockResolvedValue(claims);

            await request(app)
                .get('/customers/claims')
                .expect(200);

            expect(Claim.find).toHaveBeenCalledWith({ customerName: 'John Doe' });
        });

        it('should return 404 if no claims found', async () => {
            const customer = { name: 'John Doe' };
            req.user = customer;
            Claim.find.mockResolvedValue([]);

            await request(app)
                .get('/customers/claims')
                .expect(404);
        });
    });

    describe('POST /customers/settings/reset-password', () => {
        it('should reset customer password', async () => {
            const customer = { _id: 'customerId', password: 'hashedPassword' };
            const passwords = { currentPassword: 'password123', newPassword: 'newPassword123' };
            req.user = customer;
            Customer.findById.mockResolvedValue(customer);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('newHashedPassword');
            Customer.findByIdAndUpdate.mockResolvedValue(customer);

            await request(app)
                .post('/customers/settings/reset-password')
                .send(passwords)
                .expect(200);

            expect(Customer.findById).toHaveBeenCalledWith('customerId');
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 'salt');
            expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('customerId', { password: 'newHashedPassword' });
        });

        it('should not reset password if current password is incorrect', async () => {
            const customer = { _id: 'customerId', password: 'hashedPassword' };
            const passwords = { currentPassword: 'wrongpassword', newPassword: 'newPassword123' };
            req.user = customer;
            Customer.findById.mockResolvedValue(customer);
            bcrypt.compare.mockResolvedValue(false);

            await request(app)
                .post('/customers/settings/reset-password')
                .send(passwords)
                .expect(400);

            expect(Customer.findById).toHaveBeenCalledWith('customerId');
            expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
        });
    });

    describe('POST /customers/settings/setup-2fa', () => {
        it('should setup 2FA for customer', async () => {
            const customer = { _id: 'customerId' };
            const secret = { base32: 'secretBase32', otpauth_url: 'otpauth://totp/secret' };
            req.user = customer;
            speakeasy.generateSecret.mockReturnValue(secret);
            Customer.findByIdAndUpdate.mockResolvedValue(customer);
            qrcode.toDataURL.mockImplementation((url, callback) => callback(null, 'data_url'));

            await request(app)
                .post('/customers/settings/setup-2fa')
                .expect(200);

            expect(speakeasy.generateSecret).toHaveBeenCalledWith({ length: 20 });
            expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('customerId', { twoFactorSecret: 'secretBase32' }, { new: true });
            expect(qrcode.toDataURL).toHaveBeenCalledWith('otpauth://totp/secret', expect.any(Function));
        });
    });

    describe('POST /customers/settings/verify-2fa', () => {
        it('should verify 2FA token', async () => {
            const customer = { _id: 'customerId', twoFactorSecret: 'secretBase32' };
            const token = '123456';
            req.user = customer;
            speakeasy.totp.verify.mockReturnValue(true);
            Customer.findByIdAndUpdate.mockResolvedValue(customer);

            await request(app)
                .post('/customers/settings/verify-2fa')
                .send({ token })
                .expect(200);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: 'secretBase32',
                encoding: 'base32',
                token
            });
            expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('customerId', { twoFactorEnabled: true }, { new: true });
        });

        it('should not verify invalid 2FA token', async () => {
            const customer = { _id: 'customerId', twoFactorSecret: 'secretBase32' };
            const token = '123456';
            req.user = customer;
            speakeasy.totp.verify.mockReturnValue(false);

            await request(app)
                .post('/customers/settings/verify-2fa')
                .send({ token })
                .expect(400);

            expect(speakeasy.totp.verify).toHaveBeenCalledWith({
                secret: 'secretBase32',
                encoding: 'base32',
                token
            });
        });
    });

    describe('POST /customers/settings/disable-2fa', () => {
        it('should disable 2FA for customer', async () => {
            const customer = { _id: 'customerId' };
            req.user = customer;
            Customer.findByIdAndUpdate.mockResolvedValue(customer);

            await request(app)
                .post('/customers/settings/disable-2fa')
                .expect(200);

            expect(Customer.findByIdAndUpdate).toHaveBeenCalledWith('customerId', { twoFactorEnabled: false, twoFactorSecret: null }, { new: true });
        });
    });

    describe('GET /customers/help', () => {
        it('should render help page', async () => {
            await request(app)
                .get('/customers/help')
                .expect(200);

            expect(res.render).toHaveBeenCalledWith('customer/help');
        });
    });

    describe('GET /customers/settings', () => {
        it('should render settings page', async () => {
            const customer = { _id: 'customerId', email: 'john@example.com' };
            req.user = customer;

            await request(app)
                .get('/customers/settings')
                .expect(200);

            expect(res.render).toHaveBeenCalledWith('customer/settings', { user: customer });
        });
    });
});