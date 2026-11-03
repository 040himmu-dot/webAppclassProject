const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const { con } = require('./config/Database');
const AnalyzerEngine = require('./services/AnalyzerEngine');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

function hashPassword(plainPassword) {
    return crypto.createHash('sha256').update(plainPassword).digest('hex');
}

// 1. Login Endpoint (Checks SHA-256 passwordHash, also works if a teammate hasn't hashed their DB yet)
app.post('/api/login', (req, res) => {
    const emailInput = req.body.email || req.body.username;
    const passwordInput = req.body.password;

    if (!emailInput || !passwordInput) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const hashedInput = hashPassword(passwordInput);
    const sql = 'SELECT * FROM UserAccount WHERE email = ? AND IsArchived = FALSE';
    
    con.query(sql, [emailInput], (err, results) => {
        if (err) {
            console.error('SQL Error:', err.message);
            return res.status(500).json({ error: 'Database query failed' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];
        const storedHash = user.passwordHash || user.PasswordHash || user.password;

        if (storedHash === hashedInput || storedHash === passwordInput) {
            res.status(200).json({ 
                message: 'Login successful', 
                user: { 
                    userID: user.userID || user.UserID, 
                    name: user.name || user.Name,
                    email: user.email || user.Email,
                    role: user.role || user.Role 
                } 
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// 2. Analyzer Engine Endpoint
app.post('/api/run-analyzer', (req, res) => {
    AnalyzerEngine.analyzeInventoryData();
    AnalyzerEngine.checkPickups();
    res.status(200).json({ message: 'Analyzer Engine executed.' });
});

// 3. Auto-connects teammates' files when they create them
if (fs.existsSync('./controllers/InventoryController.js')) {
    app.use('/api/inventory', require('./controllers/InventoryController'));
}
if (fs.existsSync('./controllers/HamperController.js')) {
    app.use('/api/hamper', require('./controllers/HamperController'));
}

app.use('/api', require('./routes/coordinatorRoutes'));
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});