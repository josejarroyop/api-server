process.env.EXTERNAL_API_URL = 'https://fake.local/products';
process.env.TAX_RATE = '0.16';
process.env.LOW_STOCK_THRESHOLD = '10';
process.env.LOG_LEVEL = 'silent';

jest.mock('axios');
const axios = require('axios');
const request = require('supertest');
const app = require('../src/app');

describe('GET /api/products', () => {
    beforeEach(() => jest.resetAllMocks());

    test('200 devuelve productos transformados y ordenados por price desc', async () => {
        axios.get.mockResolvedValueOnce({
            data: {
                products: [
                    { id: 1, title: 'iPhone 9', price: 549, stock: 94, brand: 'Apple', category: 'smartphones' },
                    { id: 2, title: 'iPhone X', price: 899, stock: 5, brand: 'Apple', category: 'smartphones' },
                    { id: 3, title: 'Pixel 9', price: 649, stock: 0, brand: undefined, category: 'smartphones' },
                ],
            },
        });

        const res = await request(app).get('/api/products');

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(3);
        expect(res.body.data[0].id).toBe(2);
        expect(res.body.data[0].price).toBe(1042.84);
        expect(res.body.data[0].isLowStock).toBe(true);
        expect(res.body.data.find((p) => p.id === 3).brand).toBe('NA');
        const sorted = res.body.data.every((p, i, arr) => i === 0 || arr[i - 1].price >= p.price);
        expect(sorted).toBe(true);
    });

    test('502 cuando upstream no incluye products', async () => {
        axios.get.mockResolvedValueOnce({ data: { foo: 'bar' } });
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(502);
        expect(res.body.code).toBe('INVALID_API_RESPONSE');
    });

    test('504 cuando upstream timeout', async () => {
        const err = new Error('timeout');
        err.code = 'ECONNABORTED';
        axios.get.mockRejectedValueOnce(err);
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(504);
        expect(res.body.code).toBe('EXTERNAL_API_TIMEOUT');
    });

    test('502 cuando upstream responde 500', async () => {
        const err = new Error('boom');
        err.response = { status: 500, data: {} };
        axios.get.mockRejectedValueOnce(err);
        const res = await request(app).get('/api/products');
        expect(res.status).toBe(502);
        expect(res.body.code).toBe('EXTERNAL_API_ERROR');
    });
});

describe('GET /health', () => {
    test('200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });
});

describe('Ruta inexistente', () => {
    test('404 con code NOT_FOUND', async () => {
        const res = await request(app).get('/no-existe');
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
    });
});
