require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT  || 3000;

app.use(cors());
app.use(express.json());
app.get( '/api/products', async (req, res) =>{
   try {
    const products = await getProcessedProducts();
    res.json(products);
  } catch (error) {
    res.status(502).json({ 
      error: 'External API Error', 
      message: 'No se pudo obtener o procesar el catálogo.' 
    });
  }
});
app.listen(PORT, () => {
    console.log("Middleware ejecutandose correctamernte")
})