const ProductDTO = require('../dtos/productDTO');
const AppError = require('../utils/AppError');
const { fetchCatalog } = require('../repositories/productRepository');

const TAX_RATE = parseFloat(process.env.TAX_RATE);
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD, 10);

// Validacion de configuracion al arranque (fail-fast)
if (!process.env.EXTERNAL_API_URL) {
    throw new AppError('EXTERNAL_API_URL is required in .env', 500, 'EXTERNAL_API_NOT_FOUND');
}
if (isNaN(TAX_RATE) || TAX_RATE < 0) {
    throw new AppError('TAX_RATE must be a valid positive number', 500, 'INVALID_TAX_RATE');
}
if (isNaN(LOW_STOCK_THRESHOLD) || LOW_STOCK_THRESHOLD < 0) {
    throw new AppError('LOW_STOCK_THRESHOLD must be a valid positive number', 500, 'INVALID_LOW_STOCK_THRESHOLD');
}

const getProcessedProducts = async () => {
    const rawProducts = await fetchCatalog();
    return rawProducts
        .map((product) =>
            ProductDTO.fromExternal(product, {
                taxRate: TAX_RATE,
                lowStockThreshold: LOW_STOCK_THRESHOLD,
            })
        )
        .filter((product) => product !== null)
        .sort((a, b) => b.price - a.price);
};

module.exports = { getProcessedProducts };
