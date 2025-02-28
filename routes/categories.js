const express = require("express");
const router = express.Router();
const db = require("../database");
const { createPaginationResponse } = require("../utils"); // Importera pagineringsfunktionen

//GET  Lista alla produkter i en specifik kategori 
router.get("/:categoryId", (req, res) => {
    try {
        const { categoryId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; 

        console.log(`Söker produkter i kategori ID: ${categoryId}`);
        
        // Validera kategori-ID
        if (!categoryId || isNaN(categoryId)) {
            return res.status(400).json({ error: "Ogiltigt kategori-ID" });
        }

        // Kontrollera att kategorin finns
        const categoryCheck = db.prepare(`
            SELECT category_id, category_name 
            FROM categories 
            WHERE category_id = ?
        `).get(categoryId);
        
        if (!categoryCheck) {
            return res.status(404).json({ error: "Kategorin hittades inte" });
        }


        const offset = (page - 1) * limit;

        // Hämta totalt antal produkter i kategorin via kopplingstabellen
        const totalCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM products_categories pc
            JOIN products p ON pc.product_id = p.product_id
            WHERE pc.category_id = ?
        `).get(categoryId);

        console.log(`Antal produkter i kategori ${categoryId}: ${totalCount.count}`);

        // Hämta produkter med paginering via kopplingstabellen
        const products = db.prepare(`
            SELECT p.product_id, p.name, p.price, p.description, p.stock,
                   c.category_name, m.manufacturer_name
            FROM products_categories pc
            JOIN products p ON pc.product_id = p.product_id
            JOIN categories c ON pc.category_id = c.category_id
            LEFT JOIN products_manufacturers pm ON p.product_id = pm.product_id
            LEFT JOIN manufacturers m ON pm.manufacturer_id = m.manufacturer_id
            WHERE pc.category_id = ?
            GROUP BY p.product_id
            LIMIT ? OFFSET ?
        `).all(categoryId, limit, offset);

        console.log(`Hittade ${products.length} produkter med detaljer`);

        // Kontrollera resultatet
        if (products.length === 0 && page === 1) {
            return res.status(404).json({ error: "Inga produkter hittades i denna kategori" });
        }

        // Skicka ett enda svar med både produkter och pagineringsinformation
        res.json({
            products,
            pagination: createPaginationResponse(totalCount.count, page, limit)
        });
    } catch (error) {
        console.error("Fel vid hämtning av produkter:", error);
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av produkter i kategori" });
    }
});


module.exports = router;