const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

let incomes = [];
let outcomes = [];

app.post("/add-income", (req, res) => {
    const { source, amount } = req.body;
    if (!source || !amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid income data" });
    }
    incomes.push({ source, amount });
    res.json({ message: "Income added successfully", incomes });
});

app.post("/add-outcome", (req, res) => {
    const { source, amount } = req.body;
    if (!source || !amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid outcome data" });
    }
    outcomes.push({ source, amount });
    res.json({ message: "Outcome added successfully", outcomes });
});

app.get("/calculate-savings", (req, res) => {
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

    const savings = (totalIncome * savePercentage) / 100;
    const spending = (totalIncome * spendPercentage) / 100;

    res.json({
        totalIncome,
        totalOutcome,
        outcomePercentage,
        savings,
        spending,
    });
});

module.exports = app;
