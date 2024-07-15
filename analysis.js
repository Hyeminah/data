const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('sales_analysis.db'); // Use 'sales_analysis.db' for a persistent database

db.serialize(() => {
    // Perform initial sales analysis
    db.all(`SELECT p.Nom, SUM(v.Quantite) as Total_Sales
            FROM Vente v
            JOIN Produit p ON v.ID_Reference_produit = p.ID_Reference_produit
            GROUP BY p.Nom
            ORDER BY Total_Sales DESC`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        console.log("Sales Analysis:");
        rows.forEach((row) => {
            console.log(`${row.Nom}: ${row.Total_Sales}`);
        });

        // Store analysis results in a new table
        db.run(`CREATE TABLE IF NOT EXISTS AnalysisResults (
            Nom TEXT,
            Total_Sales INTEGER
        )`, () => {
            const stmt = db.prepare(`INSERT INTO AnalysisResults (Nom, Total_Sales) VALUES (?, ?)`);
            rows.forEach((row) => {
                stmt.run(row.Nom, row.Total_Sales);
            });
            stmt.finalize(() => {
                console.log("Analysis results stored in the database.");
                db.close();
            });
        });
    });
});
