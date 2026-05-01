const router = require('express').Router();
const { asyncHandler } = require('../utils/errorHandler');
const { getProcessedProducts } = require('../services/productService');

router.get('/products', asyncHandler(async (req, res) => {
    const products = await getProcessedProducts();
    res.status(200).json({
        count: products.length,
        data: products,
    });
}));

module.exports = router;
