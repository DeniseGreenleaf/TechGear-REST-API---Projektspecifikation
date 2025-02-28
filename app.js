const express = require('express');  // Importera Express
const db = require('./database');  // Importera databasfilen 
const bodyParser = require("body-parser"); //hantera JSON-data från req body


// Definierar routes för olika delar av API:et
const productsRoutes = require("./routes/products"); // Alla routes i products.js kommer att börja med /products
const customersRoutes = require("./routes/customers"); 
const reviewsRoutes = require("./routes/reviews"); 
const categoriesRoutes = require("./routes/categories");



const app = express();               
const PORT = 3000;                   

app.use(express.json()); 


//importera respektive route
app.use("/products", productsRoutes); 
app.use("/customers", customersRoutes);
app.use("/reviews", reviewsRoutes);
app.use("/categories", categoriesRoutes);

// Testroute för att kontrollera att servern fungerar
app.get('/', (req, res) => {
    res.send('Hello World! Express fungerar!');
});

// Starta servern och lyssna på angiven port
app.listen(PORT, () => {
    console.log(`Servern körs på http://localhost:${PORT}`);
});
