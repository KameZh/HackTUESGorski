let incomes = [];
let outcomes = [];

function initRoutes(app) {
    //  Add income route
    app.post("/finance/add-income", (req, res) => {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid income data" });
        }

        entries.forEach(entry => {
            if (entry.source && entry.amount > 0) {
                incomes.push({ source: entry.source, amount: entry.amount });
            }
        });

        res.json({ message: "Income added successfully", incomes });
    });

    //  Add outcome route
    app.post("/finance/add-outcome", (req, res) => {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: "Invalid outcome data" });
        }

        entries.forEach(entry => {
            if (entry.source && entry.amount > 0) {
                outcomes.push({ source: entry.source, amount: entry.amount });
            }
        });

        res.json({ message: "Outcome added successfully", outcomes });
    });

    //  Calculate savings
    app.get("/finance/calculate-savings", (req, res) => {
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
        const totalOutcome = outcomes.reduce((sum, outcome) => sum + outcome.amount, 0);

        if (totalIncome === 0) {
            return res.status(400).json({ error: "No income data available" });
        }

        const outcomePercentage = (totalOutcome / totalIncome) * 100;
        let savePercentage, spendPercentage;

        if (outcomePercentage > 50) {
            savePercentage = 60;
            spendPercentage = 40;
        } else {
            savePercentage = 50;
            spendPercentage = 50;
        }

        const savings = ((totalIncome - totalOutcome) * savePercentage) / 100;
        const spending = ((totalIncome - totalOutcome) * spendPercentage) / 100;

        res.json({
            totalIncome,
            totalOutcome,
            outcomePercentage,
            savings,
            spending,
        });
    });

    //  Reset values permanently
    app.post("/finance/reset-values", (req, res) => {
        incomes = [];
        outcomes = [];
        res.json({ message: "All financial data has been reset." });
    });
}

module.exports = { initRoutes }