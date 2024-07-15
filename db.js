const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csvParser = require('csv-parser');

function initializeDatabase() {
    const db = new sqlite3.Database('sales_analysis.db');
    return db;
}

function createTables(db) {
    db.run(`CREATE TABLE IF NOT EXISTS Magasin (
        ID_Magasin INTEGER PRIMARY KEY,
        Ville TEXT NOT NULL,
        Nombre_de_salaries INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Produit (
        ID_Reference_produit TEXT PRIMARY KEY,
        Nom TEXT NOT NULL,
        Prix REAL NOT NULL,
        Stock INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Vente (
        Date TEXT NOT NULL,
        ID_Reference_produit TEXT NOT NULL,
        Quantite INTEGER NOT NULL,
        ID_Magasin INTEGER NOT NULL,
        FOREIGN KEY (ID_Reference_produit) REFERENCES Produit(ID_Reference_produit),
        FOREIGN KEY (ID_Magasin) REFERENCES Magasin(ID_Magasin)
    )`);
}

function insertData(db, table, data) {
    const placeholders = data.map(() => '(?)').join(',');
    const sql = `INSERT OR IGNORE INTO ${table} VALUES ${placeholders}`;
    db.run(sql, data, (err) => {
        if (err) {
            console.error(`Error inserting into ${table}:`, err.message);
        }
    });
}

function readCSVAndInsert(db, table, columns) {
    const filePath = `./data/${table}.csv`;

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
            const data = columns.map(col => row[col]);
            insertData(db, table, data);
        })
        .on('end', () => {
            console.log(`Data inserted into ${table}`);
        })
        .on('error', (err) => {
            console.error(`Error reading CSV file ${filePath}:`, err.message);
        });
}

function main() {
    const db = initializeDatabase();

    createTables(db);

    const tables = ['magasins', 'produits', 'ventes'];
    const columns = {
        magasins: ['ID_Magasin', 'Ville', 'Nombre_de_salaries'],
        produits: ['ID_Reference_produit', 'Nom', 'Prix', 'Stock'],
        ventes: ['Date', 'ID_Reference_produit', 'Quantite', 'ID_Magasin']
    };

    tables.forEach(table => {
        readCSVAndInsert(db, table, columns[table]);
    });

    db.get(`
        SELECT SUM(Quantite * Prix) AS TotalTurnover 
        FROM ventes 
        INNER JOIN produits ON ventes.ID_Reference_produit = produits.ID_Reference_produit
    `, (err, row) => {
        if (err) {
            console.error('Error getting total turnover:', err.message);
        } else {
            console.log('Total Turnover:', row.TotalTurnover);
        }
    });

    db.all(`
        SELECT Nom, SUM(Quantite) AS TotalSales 
        FROM produits 
        INNER JOIN ventes ON produits.ID_Reference_produit = ventes.ID_Reference_produit 
        GROUP BY Nom
    `, (err, rows) => {
        if (err) {
            console.error('Error getting sales by product:', err.message);
        } else {
            console.log('Sales by Product:');
            rows.forEach(row => {
                console.log(`${row.Nom}: ${row.TotalSales}`);
            });
        }
    });

    db.all(`
        SELECT Ville, SUM(Quantite * Prix) AS TotalSales 
        FROM magasins 
        INNER JOIN ventes ON magasins.ID_Magasin = ventes.ID_Magasin 
        INNER JOIN produits ON ventes.ID_Reference_produit = produits.ID_Reference_produit 
        GROUP BY Ville
    `, (err, rows) => {
        if (err) {
            console.error('Error getting sales by region:', err.message);
        } else {
            console.log('Sales by Region:');
            rows.forEach(row => {
                console.log(`${row.Ville}: ${row.TotalSales}`);
            });
        }
    });

    db.close();
}

main();
