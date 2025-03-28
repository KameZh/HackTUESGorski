const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const financeTracker = require('./financeTracker');
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
require('dotenv').config();



const sessionStore = new MySQLStore({
    host: '127.0.0.1',
    user: 'root',
    password: 'Kirikuk123$',
    database: 'db',
    clearExpired: true,
    checkExpirationInterval: 900000, 
    expiration: 86400000 ,
});

const app = express();
const PORT = 7700;

app.use(express.static(__dirname)); 
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.raw());
app.use(session({
    secret: 'gorski-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: false, maxAge: 86400000 } 
}));
financeTracker.initRoutes(app);

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-pro-exp-02-05",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

async function run() {
    const chatSession = model.startChat({
      generationConfig,
      history: [
      ],
    });
    const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    console.log(result.response.text());
}
  

app.post('/ask', async (req, res) => {
    const question = req.body.question;
    if (!question) {
        return res.status(400).json({ error: 'Question is required' });
    }

    try {
        const chatSession = model.startChat({
            generationConfig,
            history: [],
        });
        const result = await chatSession.sendMessage(question);
        const answer = result.response.text();
        res.json({ answer: answer });
    } catch (error) {
        console.error('Error processing question:', error);
        res.status(500).json({ error: 'Failed to get response from Gemini' });
    }
});

const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'Kirikuk123$',
    database: 'db'
};

const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).send('Not authenticated');
    }
    next();
};

app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            'SELECT username, created_at, achievements, calculations, last_active FROM users WHERE id = ?',
            [req.session.userId]
        );
        await connection.end();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        const today = new Date();
        const lastActive = new Date(user.last_active);
        const daysActive = Math.ceil((today - lastActive) / (1000 * 60 * 60 * 24));

        res.json({
            username: user.username,
            created_at: user.created_at,
            statistics: {
                achievements: user.achievements,
                calculations: user.calculations,
                daysActive: daysActive
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Database error' });
    }
});


app.use((req, res, next) => {
    if (req.session) {
        req.session.touch();
    }
    next();
});

app.post('/api/change-password', requireAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
        return res.status(400).send('New password is required');
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.session.userId]
        );
        await connection.end();
        res.status(200).send('Password updated successfully');
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).send('Database error');
    }
});


app.post('/api/delete-account', requireAuth, async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute('DELETE FROM users WHERE id = ?', [req.session.userId]);
        await connection.end();
        req.session.destroy();
        res.status(200).send('Account deleted successfully');
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send('Database error');
    }
});

app.get('/api/session', (req, res) => {
    console.log("Session data:", req.session);
    res.json(req.session);
});


app.post('/api/logout', requireAuth, (req, res) => {
    req.session.destroy();
    res.status(200).send('Logged out successfully');
});


app.post('/signup.html', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    
    try {
        console.log('Received signup request for username:', username);
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');
        const connection = await mysql.createConnection(dbConfig);
        console.log('Database connection established');
        await connection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        await connection.end();
        console.log('User registered successfully');
        res.status(200).send('Registration successful');
    } catch (error) {
        console.error('Error during signup:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).send('User already exists');
        } else {
            res.status(500).send('Database error');
        }
    }
});


app.post('/login.html', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length > 0 && await bcrypt.compare(password, rows[0].password)) {
            req.session.userId = rows[0].id;
            req.session.username = rows[0].username;
            
            req.session.save(err => { 
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Session error' });
                }
                res.json({ success: true, redirect: '/profile.html' });
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }

        await connection.end();
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/finance-data', async (req, res) => {
    try {
        if (!req.session || !req.session.username) {
            return res.status(401).json({ error: 'User not logged in' });
        }

        const connection = await mysql.createConnection(dbConfig);
        
        const [incomeRows] = await connection.execute(
            'SELECT amount, type FROM income WHERE user_name = ?',
            [req.session.username]
        );

        const [expenseRows] = await connection.execute(
            'SELECT amount, type FROM expenses WHERE user_name = ?',
            [req.session.username]
        );

        await connection.end();

        res.json({
            income: incomeRows,
            expenses: expenseRows
        });
    } catch (error) {
        console.error('Error fetching finance data:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});