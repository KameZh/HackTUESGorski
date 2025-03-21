const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const financeTracker = require('./financeTracker.js');

const app = express();

// Add support for different types of form data
app.use(express.json());
app.use(express.raw());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Add session support
app.use(session({
    secret: 'gorski-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Настройки за връзка с базата данни
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'kk',
    database: 'db'
};

// Middleware to check if user is authenticated
const requireAuth = ((req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).send('Not authenticated');
    }
    next();
});

const PORT = 7700;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/videos', (req, res) => {
    res.sendFile(path.join(__dirname, 'videos.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

// Стартиране на сървъра
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});