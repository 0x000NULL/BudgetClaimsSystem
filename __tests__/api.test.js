const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Claim = require('../models/Claim');
const Customer = require('../models/Customer');
const authMiddleware = require('../middleware/auth');
const apiRouter = require('./api');

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

// Mock the authentication middleware
jest.mock('../middleware/auth', () => ({
    ensureAuthenticated: (req, res, next) => next(),
    ensureRole: (role) => (req, res, next) => next()
}));

// Mock the logger
jest.mock('../logger', () => ({
    info: jest.fn(),
    error: jest.fn()
}));

describe('API Routes', () => {
    beforeAll(async () => {
        const url = `mongodb://127.0.0.1/budget_claims_test`;
        await mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
    });

    afterAll(async () => {
        await mongoose.connection.db.dropDatabase();
        await mongoose.connection.close();
    });

    describe('Claims API', () => {
        let claimId;

        beforeEach(async () => {
            const claim = new Claim({ mva: '123', customerName: 'John Doe', description: 'Test claim', status: 'Pending' });
            const savedClaim = await claim.save();
            claimId = savedClaim._id;
        });

        afterEach(async () => {
            await Claim.deleteMany();
        });

        it('should fetch all claims', async () => {
            const res = await request(app).get('/api/claims');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
        });

        it('should fetch a claim by ID', async () => {
            const res = await request(app).get(`/api/claims/${claimId}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(claimId.toString());
        });

        it('should add a new claim', async () => {
            const newClaim = { mva: '456', customerName: 'Jane Doe', description: 'Another test claim', status: 'Pending' };
            const res = await request(app).post('/api/claims').send(newClaim);
            expect(res.statusCode).toEqual(200);
            expect(res.body.customerName).toEqual('Jane Doe');
        });

        it('should update a claim by ID', async () => {
            const updatedClaim = { status: 'Approved' };
            const res = await request(app).put(`/api/claims/${claimId}`).send(updatedClaim);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toEqual('Approved');
        });

        it('should delete a claim by ID', async () => {
            const res = await request(app).delete(`/api/claims/${claimId}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.msg).toEqual('Claim deleted');
        });
    });

    describe('Customers API', () => {
        let customerId;

        beforeEach(async () => {
            const customer = new Customer({ name: 'John Doe', email: 'john@example.com', password: 'password' });
            const savedCustomer = await customer.save();
            customerId = savedCustomer._id;
        });

        afterEach(async () => {
            await Customer.deleteMany();
        });

        it('should fetch all customers', async () => {
            const res = await request(app).get('/api/customers');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
        });

        it('should fetch a customer by ID', async () => {
            const res = await request(app).get(`/api/customers/${customerId}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body._id).toEqual(customerId.toString());
        });

        it('should add a new customer', async () => {
            const newCustomer = { name: 'Jane Doe', email: 'jane@example.com', password: 'password' };
            const res = await request(app).post('/api/customers').send(newCustomer);
            expect(res.statusCode).toEqual(200);
            expect(res.body.name).toEqual('Jane Doe');
        });

        it('should update a customer by ID', async () => {
            const updatedCustomer = { name: 'John Smith' };
            const res = await request(app).put(`/api/customers/${customerId}`).send(updatedCustomer);
            expect(res.statusCode).toEqual(200);
            expect(res.body.name).toEqual('John Smith');
        });

        it('should delete a customer by ID', async () => {
            const res = await request(app).delete(`/api/customers/${customerId}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.msg).toEqual('Customer deleted');
        });
    });
});