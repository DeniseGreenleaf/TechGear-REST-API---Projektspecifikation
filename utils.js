// funktion för paginering
function createPaginationResponse(totalCount, page, limit) {
    return {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1
    };
}

//  produktvalidering
function validateProduct(product) {
    const { name, price, stock } = product;
    
    if (!name || name.trim() === "") {
        return { valid: false, error: "Produktnamn får inte vara tomt" };
    }
    if (!price || price <= 0) {
        return { valid: false, error: "Pris måste vara större än 0" };
    }
    if (!stock || stock < 0) {
        return { valid: false, error: "Stock (lager) måste vara ett positivt tal" };
    }
    
    return { valid: true };
}

// Standardquery för produkter
const getProductsQuery = `
    SELECT DISTINCT p.product_id, p.name, p.price, p.description, p.stock,
        c.category_name as category,
        m.manufacturer_name as manufacturer
    FROM products p
    LEFT JOIN products_categories pc ON p.product_id = pc.product_id
    LEFT JOIN categories c ON pc.category_id = c.category_id
    LEFT JOIN products_manufacturers pm ON p.product_id = pm.product_id
    LEFT JOIN manufacturers m ON pm.manufacturer_id = m.manufacturer_id
`;

// COUNT query 
const getProductsCountQuery = `SELECT COUNT(*) as count FROM products`;

// Exportera funktionerna och query-strängarna
module.exports = {
    createPaginationResponse,
    validateProduct,
    getProductsQuery,
    getProductsCountQuery
};
