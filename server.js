const express = require('express');
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const financeTracker = require('./financeTracker.js');

const dbConfig = ({
    host: '127.0.0.1',
    user: 'root',
    password: 'Kirikuk123$',
    database: 'db'
});

const app = express();
app.use("/finance", financeTracker);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));


app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});



const PORT = 7700;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/achv', (req, res) => {
    res.sendFile(path.join(__dirname, 'achv.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/t&c', (req,res)=>{
    res.sendFile(path.join(__dirname, 't&c.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});