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
app.use('/finance', financeTracker);

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
    
    run();
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

  
  // Update database schema
  async function updateSchema() {
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [columns] = await connection.execute('SHOW COLUMNS FROM users');
      const existingColumns = columns.map(col => col.Field);
  
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
  updateSchema();

  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'achv.html')));

  app.get('/expenses', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [results] = await connection.execute('SELECT category, amount FROM expenses');
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  });

  app.get('/savings', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [results] = await connection.execute('SELECT month, saved_amount FROM savings');
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  });
  
  app.get('/advice', async (req, res) => {
    const connection = await mysql.createConnection(dbConfig);
    try {
      const [results] = await connection.execute('SELECT tip, potential_savings FROM advice ORDER BY RAND() LIMIT 1');
      res.json(results[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await connection.end();
    }
  });


updateSchema();


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
    res.status(200).send('Logged out successfully');
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

// Стартиране на сървъра
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});