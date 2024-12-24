const express = require('express');
const request = require('supertest');

describe('Basic Express Setup', () => {
    let app;

    beforeEach(() => {
        app = express();
    });

    it('should create an Express app', () => {
        expect(app).toBeDefined();
    });

    it('should handle GET requests', async () => {
        app.get('/', (req, res) => res.send('OK'));
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
    });

    it('should handle POST requests', async () => {
        app.use(express.json());
        app.post('/', (req, res) => res.json(req.body));
        
        const response = await request(app)
            .post('/')
            .send({ test: 'data' });
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ test: 'data' });
    });

    it('should handle 404 errors', async () => {
        const response = await request(app).get('/nonexistent');
        expect(response.status).toBe(404);
    });
}); 