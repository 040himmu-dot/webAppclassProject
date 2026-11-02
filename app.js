const express = require('express');
const crypto = require('crypto');
const { con } = require('./config/Database');
const AnalyzerEngine = require('./services/AnalyzerEngine');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Converts the typed password into a SHA-256 hash
function hashPassword(plainPassword) {
    return crypto.createHash('sha256').update(plainPassword).digest('hex');
}

// 1. Auth API: Checks email and compares against SDD passwordHash
app.post('/api/login', (req, res) => {
    const emailInput = req.body.email || req.body.username;
    const passwordInput = req.body.password;

    if (!emailInput || !passwordInput) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedInput = hashPassword(passwordInput);

    // Pulls user record by email only (does NOT check plaintext password in SQL)
    const sql = 'SELECT userID, name, email, role, passwordHash FROM UserAccount WHERE email = ? AND IsArchived = FALSE';
    
    con.query(sql, [emailInput], (err, results) => {
        if (err) {
            console.error('SQL Error:', err.message);
            return res.status(500).json({ error: 'Database query failed' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];

        // Compares the hashed input against the stored passwordHash
        if (user.passwordHash === hashedInput) {
            res.status(200).json({ 
                message: 'Login successful', 
                user: { 
                    userID: user.userID, 
                    name: user.name,
                    email: user.email,
                    role: user.role 
                } 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// 2. Analyzer Engine Trigger
app.post('/api/run-analyzer', (req, res) => {
    AnalyzerEngine.analyzeInventoryData();
    AnalyzerEngine.checkPickups();
    res.status(200).json({ message: 'Analyzer Engine executed.' });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});