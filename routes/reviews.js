const express = require("express");
const router = express.Router();
const db = require("../database");
const { createPaginationResponse } = require("../utils"); 


// GET genomsnittligt betyg per produkt  
router.get("/rating-stats", (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10; 
        const page = parseInt(req.query.page) || 1; 
        const offset = (page - 1) * limit;


        // Räkna total antal produkter
        const totalCount = db.prepare(`SELECT COUNT(DISTINCT product_id) AS count FROM products`).get().count;


        const stats = db.prepare(`
            SELECT 
                p.product_id,
                p.name AS product_name, 
                COALESCE(COUNT(r.review_id), 0) AS total_reviews,
                COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_rating
            FROM products p
            LEFT JOIN reviews r ON p.product_id = r.product_id
            GROUP BY p.product_id, p.name
        `).all();

        if (!stats || stats.length === 0) {
            return res.status(404).json({ error: "Ingen betygsstatistik tillgänglig" });
        }
        // Använd createPaginationResponse för att lägga till pagineringsmetadata
        const response = {
            ...createPaginationResponse(totalCount, page, limit),
            data: stats
        };

        res.json(stats);
    } catch (error) {
        console.error("Fel vid hämtning av betygsstatistik:", error);
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av betygsstatistik" });
    }
});

module.exports = router;