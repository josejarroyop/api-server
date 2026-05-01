require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getProcessedProducts } = require('./services/productService');
const app = express();
const PORT = process.env.PORT  || 3000;

app.use(cors());
app.use(express.json());
app.get( '/api/products', async (req, res) =>{
   try {
        const products = await getProcessedProducts();
         return res.status(200).json({
            count: products.length,
            data: products,
        });
    } catch (error) {
        res.status(502).json({ 
        error: 'External API Error', 
        message: 'No se pudo obtener o procesar el catálogo.'  + error
        });
    }
});
app.listen(PORT, () => {
    console.log("Middleware ejecutandose correctamernte")
})