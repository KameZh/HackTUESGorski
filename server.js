const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const session = require('express-session');
const financeTracker = require('./financeTracker.js');
const MySQLStore = require('express-mysql-session')(session);
const app = express();
const PORT = 7700;
const sessionStore = new MySQLStore({
    host: '127.0.0.1',
    user: 'root',
  password: 'Kirikuk123$',
    database: 'db',
    clearExpired: true,
    checkExpirationInterval: 900000, // Проверка на изтекли сесии (15 мин)
    expiration: 86400000 // 1 ден живот на сесиятa
});
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config(); // Load environment variables

app.use(express.static('public')); // Serve static files (HTML, CSS)
app.use(express.json()); // Parse JSON requests

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY); // Use environment variable to store the api key.
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

app.post('/ask', async (req, res) => {
    try {
        const question = req.body.question;
        const result = await model.generateContent(question);
        const response = await result.response;
        const text = response.text();
        res.json({ answer: text });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// Add support for different types of form data
app.use(express.json());
app.use(express.raw());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use("/finance", financeTracker);
// Add session support
app.use(session({
    secret: 'gorski-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { secure: false, maxAge: 86400000 } // 1 ден
}));

// Настройки за връзка с базата данни
const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: 'Kirikuk123$',
    database: 'db'
};

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).send('Not authenticated');
    }
    next();
};

// Update database schema
async function updateSchema() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Check if columns exist first
        const [columns] = await connection.execute('SHOW COLUMNS FROM users');
        const existingColumns = columns.map(col => col.Field);
        
        // Add columns that don't exist
        const columnsToAdd = [];
        if (!existingColumns.includes('created_at')) {
            columnsToAdd.push('ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
        if (!existingColumns.includes('achievements')) {
            columnsToAdd.push('ADD COLUMN achievements INT DEFAULT 0');
        }
        if (!existingColumns.includes('calculations')) {
            columnsToAdd.push('ADD COLUMN calculations INT DEFAULT 0');
        }
        if (!existingColumns.includes('last_active')) {
            columnsToAdd.push('ADD COLUMN last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
        
        // Execute ALTER TABLE if there are columns to add
        if (columnsToAdd.length > 0) {
            const alterQuery = `ALTER TABLE users ${columnsToAdd.join(', ')}`;
            await connection.execute(alterQuery);
            console.log('Database schema updated successfully');
        } else {
            console.log('Database schema is up to date');
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error updating schema:', error);
    }
}

// Call updateSchema when server starts
updateSchema();

// Profile API endpoint
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
        req.session.touch(); // Поддържа сесията активна
    }
    next();
});

// Change password endpoint
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

// Delete account endpoint
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

// Logout endpoint
app.post('/api/logout', requireAuth, (req, res) => {
    req.session.destroy();
    res.status(200).send('Logged ouаt successfully');
});

// Маршрут за регистрация
app.post('/signup.html', async (req, res) => {
    const { username, password } = req.body;
    
    // Validate input
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

// Маршрут за вход
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



financeTracker.initRoutes(app);

// Стартиране на сървъра
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});