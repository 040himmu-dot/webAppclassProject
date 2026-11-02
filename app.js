const express = require('express');
const { con } = require('./config/Database');
const AnalyzerEngine = require('./services/AnalyzerEngine');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serves your index.html login page

// 1. Auth API: Login Endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT userID, roleType FROM UserAccount WHERE username = ? AND password = ?';
    
    con.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (results.length > 0) {
            res.status(200).json({ message: 'Login successful', user: results[0] });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// 2. Analyzer API: Trigger waste and pickup checks
app.post('/api/run-analyzer', (req, res) => {
    AnalyzerEngine.analyzeInventoryData();
    AnalyzerEngine.checkPickups();
    res.status(200).json({ message: 'Analyzer Engine executed.' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000. Access at http://localhost:3000');
});