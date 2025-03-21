const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const session = require('express-session');

const app = express();
const PORT = 7700;

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
    
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    
    try {
        console.log('Received login request for username:', username);
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length > 0 && await bcrypt.compare(password, rows[0].password)) {
            // Update last active date
            await connection.execute(
                'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
                [rows[0].id]
            );
            
            // Set session
            req.session.userId = rows[0].id;
            req.session.username = rows[0].username;
            
            console.log('Login successful');
            res.status(200).send('Login successful');
        } else {
            console.log('Invalid credentials');
            res.status(401).send('Invalid credentials');
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Database error');
    }
});

// Маршрути за HTML страници
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