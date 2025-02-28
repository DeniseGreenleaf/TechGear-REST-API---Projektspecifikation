const Database = require('better-sqlite3'); // Importera SQLite-modulen

const db = new Database('databas.db', { verbose: console.log });

// Lägg till för att se eventuella databasfel
db.pragma('foreign_keys = ON');

module.exports = db;  // Exportera databasen så att `app.js` kan använda den

