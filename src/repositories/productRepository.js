const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 8000;
const fetchCatalog = async () => {
    try {
        const response = await axios.get(EXTERNAL_API_URL, { timeout: REQUEST_TIMEOUT_MS });
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
        return products;
    } catch (error) {
        if (error instanceof AppError) throw error;

        logger.error({ err: error.message, url: EXTERNAL_API_URL }, '[ProductRepository] external API error');

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
            'Error al obtener catalogo',
            500,
            'PRODUCT_REPOSITORY_ERROR',
            error.message
        );
    }
};

module.exports = { fetchCatalog };
