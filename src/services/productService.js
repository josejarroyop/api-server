const axios = require('axios');

const getProcessedProducts = async () => {
    try {
        const response = await axios.get(process.env.EXTERNAL_API_URL);
         const products = response.data && response.data.products;
        if (!products) throw new Error("Datos incompletos de la API Externa");
        
        if (!Array.isArray(products)) {
            throw new Error("Datos incompletos de la API Externa");
        }
        return products.map( p => {
            const finalPrice = p.price*(1+ parseFloat(process.env.TAX_RATE));
            const stock = Number.isFinite(p.stock) ? p.stock : 0;
            return{
                id : p.id,
                title : p.title,
                price : parseFloat(finalPrice.toFixed(2)),
                stock : p.stock,
                brand : p.brand || 'NA',
                category : p.category,
                isLowStock : p.stock < parseInt(process.env.LOW_STOCK_THRESHOLD)
            };
        }).
        sort((a,b) => b.price - a.price);
    } catch (error) {
        console.error("Error en Service:", error.message);
        throw error;
    }
};
module.exports = { getProcessedProducts };