const express = require('express');
const router = express.Router();

let incomes = [];
let outcomes = [];

// Add income route
router.post("/add-income", (req, res) => {
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

// Add outcome route
router.post("/add-outcome", (req, res) => {
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

// Calculate savings
router.get("/calculate-savings", (req, res) => {
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalOutcome = outcomes.reduce((sum, outcome) => sum + outcome.amount, 0);

    if (totalIncome === 0) {
        return res.status(400).json({ error: "No income data available" });
    }

    const outcomePercentage = (totalOutcome / totalIncome) * 100;
    let savePercentage, spendPercentage;

    if (outcomePercentage > 60) {
        savePercentage = 66;
        spendPercentage = 33;
    } 
    if (outcomePercentage < 60 && outcomePercentage > 40) {
        savePercentage = 40;
        spendPercentage = 60;
    }
    if (outcomePercentage < 40) {
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
    });
});

// Reset values permanently
router.post("/reset-values", (req, res) => {
    incomes = [];
    outcomes = [];
    res.json({ message: "All financial data has been reset." });
});

module.exports = router;