const axios = require('axios');
const ProductDTO = require('../dtos/productDTO');
const AppError = require('../utils/AppError');

const TAX_RATE = parseFloat(process.env.TAX_RATE) || 0.16;
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 10;
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
const REQUEST_TIMEOUT_MS = 8000;

if (!EXTERNAL_API_URL) {
    throw new AppError(
        'EXTERNAL_API_URL is required in .env',
        500,
        'EXTERNAL_API_NOT_FOUND'
    );
}
if (isNaN(TAX_RATE) || TAX_RATE < 0) {
    throw new AppError(
        'TAX_RATE must be a valid positive number',
        500,
        'INVALID_TAX_RATE'
    );
}

const getProcessedProducts = async () => {
    try {
        const response = await axios.get(EXTERNAL_API_URL, {
            timeout: REQUEST_TIMEOUT_MS,
        });

        const products = response.data?.products;

        if (!products) {
            throw new AppError(
                'La API externa no devolvio datos de productos',
                502,
                'INVALID_API_RESPONSE',
                'Missing products field in response'
            );
        }
        if (!Array.isArray(products)) {
            throw new AppError(
                'El formato de productos es invalido',
                502,
                'INVALID_API_RESPONSE',
                'Products is not an array'
            );
        }

        return products
            .map((product) =>
                ProductDTO.fromExternal(product, {
                    taxRate: TAX_RATE,
                    lowStockThreshold: LOW_STOCK_THRESHOLD,
                })
            )
            .filter((product) => product !== null)
            .sort((a, b) => b.price - a.price);
    } catch (error) {
        console.error('[ProductService Error]:', {
            message: error.message,
            url: EXTERNAL_API_URL,
            timestamp: new Date().toISOString(),
        });

        if (error instanceof AppError) {
            throw error;
        }
        if (error.code === 'ECONNABORTED') {
            throw new AppError(
                'La API externa no respondio a tiempo',
                504,
                'EXTERNAL_API_TIMEOUT',
                `Timeout despues de ${REQUEST_TIMEOUT_MS}ms`
            );
        }
        if (error.response) {
            throw new AppError(
                `Error en API externa: ${error.response.status}`,
                502,
                'EXTERNAL_API_ERROR',
                error.response.data?.message || error.message
            );
        }
        if (error.request) {
            throw new AppError(
                'No se pudo conectar con la API externa',
                502,
                'EXTERNAL_API_UNREACHABLE',
                error.message
            );
        }
        throw new AppError(
            'Error al procesar productos',
            500,
            'PRODUCT_SERVICE_ERROR',
            error.message
        );
    }
};

module.exports = { getProcessedProducts };
