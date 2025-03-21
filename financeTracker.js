let incomes = {}; // Store incomes as { source: amount }
let outcomes = {}; // Store outcomes as { source: amount }
const mysql = require('mysql2/promise');
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'Kirikuk123$',
    database: 'db'
};

function initRoutes(app) {
    // ✅ Add income (update if source exists)
    app.post("/finance/add-income", async(req, res) => {
        const  {entries}  = req.body;
        console.log(entries);
        const connection = await mysql.createConnection(dbConfig);
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid income data" });
        }

        entries.forEach(async(entry)  => {
            if (entry.source && entry.amount > 0) {
                if (incomes[entry.source]) {
                    incomes[entry.source] = entry.amount;
                } else {
                    incomes[entry.source] = entry.amount;
                }
                await connection.execute('INSERT INTO income (amount,type,user_name) VALUES (?,?,?)', [entry.amount,entry.source, entry.username]);
                await connection.end();
            }
        });
        
        res.json({ message: "Income updated successfully", incomes });

    });


    app.post("/finance/add-outcome", async(req, res) => {
        const {entries}  = req.body;
        console.log(entries);
        const connection = await mysql.createConnection(dbConfig);
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid outcome data" });
        }
        entries.forEach(async(entry) => {
            if (entry.source && entry.amount > 0) {
                if (outcomes[entry.source]) {
                    outcomes[entry.source] = entry.amount;
                } else {
                    outcomes[entry.source] = entry.amount;
                }
                await connection.execute('INSERT INTO expenses (amount,type,user_name) VALUES (?,?,?)', [entry.amount,entry.source, entry.username]);
                await connection.end();
            }
        });
        res.json({ message: "Outcome updated successfully", outcomes });
    });


    app.get("/finance/calculate-savings", (req, res) => {
        const totalIncome = Object.values(incomes).reduce((sum, amount) => sum + amount, 0);
        const totalOutcome = Object.values(outcomes).reduce((sum, amount) => sum + amount, 0);

        if (totalIncome === 0) {
            return res.status(400).json({ error: "No income data available" });
        }

        const outcomePercentage = (totalOutcome / totalIncome) * 100;
        let savePercentage, spendPercentage;

        if (outcomePercentage > 60) {
            savePercentage = 66;
            spendPercentage = 33;
        } 
        else if (outcomePercentage < 60 && outcomePercentage > 40) {
            savePercentage = 40;
            spendPercentage = 60;
        }
        else {
            savePercentage = 75;
            spendPercentage = 25;
        }

        const savings = ((totalIncome - totalOutcome) * savePercentage) / 100;
        const spending = ((totalIncome - totalOutcome) * spendPercentage) / 100;

        res.json({
            totalIncome,
            totalOutcome,
            outcomePercentage,
            savings,
            spending,
            incomes,  
            outcomes  
        });
    });
    app.post("/finance/reset-values", (req, res) => {
        incomes = {};
        outcomes = {};
        res.json({ message: "All financial data has been reset." });
    });

    app.get('/finance/user-info', (req, res) => {
        const username = getUsername();
        if (!username) {
            return res.status(401).json({ error: 'User not logged in' });
        }
        res.json({ username });
    });
}

module.exports = { initRoutes };