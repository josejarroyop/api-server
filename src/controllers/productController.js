const { getProcessedProducts } = require('../services/productService');
const list = async (req, res) => {
    const products = await getProcessedProducts();
    return res.status(200).json({
        count: products.length,
        data: products,
    });
};
module.exports = { list };