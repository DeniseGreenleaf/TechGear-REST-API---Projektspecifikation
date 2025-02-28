const express = require("express"); //importerar express för att skapa routes
const db = require('../database'); // Laddar databasen
const router = express.Router(); //skapar ny router för produkter
const { validateProduct, getProductsQuery, getProductsCountQuery, createPaginationResponse } = require("../utils");


// Hämta alla produkter
router.get("/", (req, res) => {
    try {
        // Hämta pagineringsparametrar från query, med standardvärden
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const totalCount = db.prepare(getProductsCountQuery).get();

        const products = db.prepare(`
             ${getProductsQuery}
             GROUP BY p.product_id
             LIMIT ? OFFSET ?
        `).all(limit, offset);

        if (products.length === 0) {
            return res.status(404).json({ error: "Inga produkter hittades" });
        }

        res.json({
            products: products,
            pagination: createPaginationResponse(totalCount.count, page, limit)
        });
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av produkter" });
    }
});


// GET Sök produkter 
router.get("/search", (req, res) => {
    try {
        const { name, page = 1, limit = 10 } = req.query; 
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);

        if (!name) return res.status(400).json({ error: "Sökterm saknas" });

         const offset = (page - 1) * limit; 

        // sökning
        const products = db.prepare(`
            ${getProductsQuery}
            WHERE LOWER(p.name) LIKE LOWER(?)
            GROUP BY p.product_id 
            LIMIT ? OFFSET ?
         `).all(`%${name}%`, parsedLimit, offset);
       
        // totalt antal träffar för pagination
        const totalCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM products
            WHERE LOWER(name) LIKE LOWER(?)
       `).get(`%${name}%`);


        if (products.length === 0) {
            return res.status(404).json({ error: "Produkten hittades ej" });
        }
       
    res.json({
        products: products,
        pagination: createPaginationResponse(totalCount.count, page, limit)
    });
} catch (error) {
    res.status(500).json({ error: "Ett fel uppstod vid sökning" });
}
});


// GET statistik produkter och recensioner
router.get("/stats", (req, res) => {
    try {
        const stats = db.prepare(`
          SELECT 
                c.category_name, 
                COUNT(pc.product_id) AS total_products,
                ROUND(COALESCE(AVG(p.price), 0), 2) AS avg_price
            FROM categories c
            LEFT JOIN products_categories pc ON c.category_id = pc.category_id
            LEFT JOIN products p ON pc.product_id = p.product_id
            GROUP BY c.category_name;
        `).all();

        console.log(" Produktstatistik:", stats);

        if (stats.length === 0) {
            return res.status(404).json({ error: "Ingen statistik tillgänglig" });
        }

        res.json(stats);
    } catch (error) {
        console.error(" Fel vid hämtning av produktstatistik:", error);
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av produktstatistik" });
    }
});

// GET Hämta en enskild produkt
router.get("/:id", (req, res) => {
    try {
        const product = db.prepare(`
            SELECT p.product_id, p.name, p.price, p.description, p.stock,
                   c.category_name, m.manufacturer_name
            FROM products p
            LEFT JOIN products_categories pc ON p.product_id = pc.product_id
            LEFT JOIN categories c ON pc.category_id = c.category_id
            LEFT JOIN products_manufacturers pm ON p.product_id = pm.product_id
            LEFT JOIN manufacturers m ON pm.manufacturer_id = m.manufacturer_id
            WHERE p.product_id = ?
        `).get(req.params.id);

        if (!product) return res.status(404).json({ error: "Produkten hittades ej" });

        res.json(product);
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av produkten" });
    }
});

// POST - Skapa produkt  
router.post("/", (req, res) => {
    try {
        const { name, price, description, stock, category_id, manufacturer_name } = req.body; //ändrat till category_id från category_name

        // Validering med återanvändbar funktion
        const validation = validateProduct({ name, price, stock });
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Skapa produkten
        const insertProduct = db.prepare(`
            INSERT INTO products (name, price, description, stock) 
            VALUES (?, ?, ?, ?)
        `);
        const result = insertProduct.run(name, price, description, stock);
        const productId = result.lastInsertRowid;

        // Hantera kategori via kopplingstabellen
        if (category_id) {
            let categoryId = null;

            // Kolla om kategorin finns
            const existingCategory = db.prepare("SELECT category_id FROM categories WHERE category_id = ?").get(category_id);

            if (existingCategory) {
                categoryId = existingCategory.category_id;
            } else {
                // Skapa ny kategori om den inte finns
                const insertCategory = db.prepare("INSERT INTO categories (category_id) VALUES (?)").run(category_id);
                categoryId = insertCategory.lastInsertRowid;
            }

            // Koppla produkten till kategorin
            db.prepare("INSERT INTO products_categories (product_id, category_id) VALUES (?, ?)").run(productId, categoryId);
        }

        // Hantera tillverkare (manufacturer)
        if (manufacturer_name) {
            let manufacturer = db.prepare("SELECT manufacturer_id FROM manufacturers WHERE manufacturer_name = ?").get(manufacturer_name);

            if (!manufacturer) {
                return res.status(400).json({ error: "Ogiltig tillverkare" });
            }

            const manufacturer_id = manufacturer.manufacturer_id;

            // Kolla om relationen redan finns innan insert
            const existingRelation = db.prepare(`
                SELECT * FROM products_manufacturers WHERE product_id = ? AND manufacturer_id = ?
            `).get(productId, manufacturer_id);

            if (!existingRelation) {
                db.prepare("INSERT INTO products_manufacturers (product_id, manufacturer_id) VALUES (?, ?)").run(productId, manufacturer_id);
            } else {
                console.log("🔗 Relation mellan produkt och tillverkare finns redan.");
            }
        }

        res.status(201).json({ message: " Produkt skapad", product_id: productId });
    } catch (error) {
        console.error(" Fel vid skapande av produkt:", error);
        res.status(500).json({ error: "Ett fel uppstod vid skapandet av produkten" });
    }
});


//DELETE radera produkt med :id & CASCADE DELETE
router.delete("/:id", (req, res) => {
    try {
        const { id } = req.params;

        // Validering av id
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Ogiltigt produkt-id" });
        }
        

        // Verifiera att produkten finns innan radering
        const product = db.prepare("SELECT * FROM products WHERE product_id = ?").get(id);
        if (!product) {
            return res.status(404).json({ error: "Produkten hittades inte" });
        }

        const deleteProduct = db.prepare("DELETE FROM products WHERE product_id = ?");
        const result = deleteProduct.run(id);


        if (result.changes === 0) {
            return res.status(404).json({ error: "Produkten hittades inte eller kunde inte raderas" });
        }

        res.json({ 
            message: "Produkten har raderats",
            deletedProduct: product.name
        });
    } catch (error) { 
        res.status(500).json({ error: "Ett fel uppstod vid radering av produkten" });
    }
});

// PUT uppdatera en produkt -- uppdaterar ej category_name och manufacturer_name? är NULL. lägga till? 
router.put("/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, description, stock, category_id, manufacturer_id } = req.body;
      
      // Validering med återanvändbar funktion
      const validation = validateProduct({ name, price, stock });
      if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
      }
      
      // Starta en transaktion för att säkerställa att alla operationer slutförs eller ingen av dem
      const transaction = db.transaction(() => {
        // Uppdatera produktinformation
        const updateProduct = db.prepare(`
          UPDATE products 
          SET name = ?, price = ?, description = ?, stock = ? 
          WHERE product_id = ?
        `);
        
        const productResult = updateProduct.run(name, price, description, stock, id);
        
        if (productResult.changes === 0) {
          throw new Error("Produkten hittades inte");
        }
        
        // Hantera kategori-relation
        if (category_id) {
          // Ta bort befintliga kategori-relationer för produkten
          db.prepare(`DELETE FROM products_categories WHERE product_id = ?`).run(id);
          
          // Lägg till ny kategori-relation
          db.prepare(`
            INSERT INTO products_categories (product_id, category_id) 
            VALUES (?, ?)
          `).run(id, category_id);
        }
        
        // Hantera tillverkare-relation
        if (manufacturer_id) {
          // Ta bort befintliga tillverkare-relationer för produkten
          db.prepare(`DELETE FROM products_manufacturers WHERE product_id = ?`).run(id);
          
          // Lägg till ny tillverkare-relation
          db.prepare(`
            INSERT INTO products_manufacturers (product_id, manufacturer_id) 
            VALUES (?, ?)
          `).run(id, manufacturer_id);
        }
        
        return { success: true };
      });
      
      // Kör transaktionen
      const result = transaction();
      
      if (result.success) {
        res.json({ message: "Produkten har uppdaterats" });
      }
    } catch (error) {
      console.error("Uppdateringsfel:", error);
      res.status(500).json({ 
        error: "Ett fel uppstod vid uppdatering av produkten", 
        message: error.message 
      });
    }
  });

module.exports = router;