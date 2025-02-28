const express = require("express");
const db = require("../database"); 
const router = express.Router();

// Hämta alla kunder
router.get("/", (req, res) => {
    try {
        const customers = db.prepare("SELECT * FROM customers").all();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av kunder" });
    }
});

// GET Hämta kund med orderhistorik
router.get("/:id", (req, res) => {
    try {
        const customer = db.prepare("SELECT * FROM customers WHERE customer_id = ?").get(req.params.id);
        if (!customer) return res.status(404).json({ error: "Kunden hittades inte" });

        const orders = db.prepare(`
            SELECT o.order_id, o.status, o.order_date, o.delivery_address, s.shipping_method
            FROM orders o
            LEFT JOIN shipping_methods s ON o.shipping_method_id = s.shipping_method_id
            WHERE o.customer_id = ?
        `).all(req.params.id);

        res.json({ customer, orders });
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av kundinfo" });
    }
});

// PUT uppdatera kundens kontaktuppgifter
router.put("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const { email, phone, address } = req.body;

        // Validering av indata
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({ error: "Ogiltigt e-postformat" });
        }
        if (!phone || phone.trim() === "") {
            return res.status(400).json({ error: "Telefonnummer är obligatoriskt" });
        }
        if (!address || address.trim() === "") {
            return res.status(400).json({ error: "Adress är obligatorisk" });
        }

        const updateCustomer = db.prepare(`
            UPDATE customers SET email = ?, phone = ?, address = ? WHERE customer_id = ?
        `);
        const result = updateCustomer.run(email, phone, address, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Kunden hittades inte eller kunde inte uppdateras" });
        }

        res.json({ message: "Kunduppgifter har uppdaterats" });
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid uppdatering av kunduppgifter" });
    }
});

// GET Lista ordrar för specifik kund
router.get("/:id/orders", (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT o.order_id, o.status, o.order_date, o.delivery_address, s.shipping_method
            FROM orders o
            LEFT JOIN shipping_methods s ON o.shipping_method_id = s.shipping_method_id
            WHERE o.customer_id = ?
        `).all(req.params.id);

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "Ett fel uppstod vid hämtning av kundens ordrar" });
    }
});


module.exports = router;