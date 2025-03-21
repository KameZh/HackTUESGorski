let incomes = {}; // Store incomes as { source: amount }
let outcomes = {}; // Store outcomes as { source: amount }

function initRoutes(app) {
    // ✅ Add income (update if source exists)
    app.post("/finance/add-income", (req, res) => {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid income data" });
        }

        entries.forEach(entry => {
            if (entry.source && entry.amount > 0) {
                // ✅ If the source exists, update its amount
                if (incomes[entry.source]) {
                    incomes[entry.source] = entry.amount;
                } else {
                    incomes[entry.source] = entry.amount;
                }
            }
        });

        res.json({ message: "Income updated successfully", incomes });
    });

    // ✅ Add outcome (update if source exists)
    app.post("/finance/add-outcome", (req, res) => {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid outcome data" });
        }

        entries.forEach(entry => {
            if (entry.source && entry.amount > 0) {
                // ✅ If the source exists, update its amount
                if (outcomes[entry.source]) {
                    outcomes[entry.source] = entry.amount;
                } else {
                    outcomes[entry.source] = entry.amount;
                }
            }
        });

        res.json({ message: "Outcome updated successfully", outcomes });
    });

    // ✅ Calculate savings
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
            incomes,  // ✅ Send incomes in response for reference
            outcomes  // ✅ Send outcomes in response for reference
        });
    });

    // ✅ Reset all stored values
    app.post("/finance/reset-values", (req, res) => {
        incomes = {};
        outcomes = {};
        res.json({ message: "All financial data has been reset." });
    });
}

module.exports = { initRoutes };
