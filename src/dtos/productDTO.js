class ProductDTO {
    constructor({ id, title, price, stock, brand, category, isLowStock }) {
        this.id = id;
        this.title = title;
        this.price = price;
        this.stock = stock;
        this.brand = brand;
        this.category = category;
        this.isLowStock = isLowStock;
    }

    /**
     * Construye un ProductDTO a partir de un producto crudo de la API externa.
     * Devuelve null si el producto no contiene los campos mínimos.
     *
     * @param {object} raw - producto tal como llega de DummyJSON
     * @param {object} config
     * @param {number} config.taxRate            - ej. 0.16
     * @param {number} config.lowStockThreshold  - ej. 10
     * @returns {ProductDTO|null}
     */
    static fromExternal(raw, { taxRate, lowStockThreshold }) {
        if (!raw || typeof raw.id === 'undefined' || typeof raw.price === 'undefined') {
            return null;
        }

        const basePrice = Number(raw.price) || 0;
        const stock = Number.isFinite(raw.stock) ? raw.stock : 0;
        const finalPrice = basePrice * (1 + taxRate);

        return new ProductDTO({
            id: raw.id,
            title: raw.title || 'Sin título',
            price: parseFloat(finalPrice.toFixed(2)),
            stock,
            brand: raw.brand || 'NA',
            category: raw.category || 'NA',
            isLowStock: stock < lowStockThreshold,
        });
    }
}

module.exports = ProductDTO;
