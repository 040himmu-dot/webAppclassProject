const express = require('express');
const { con } = require('./config/Database');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// UML User.login() endpoint checking MySQL UserAccount table
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT userID, name, email, role, approvalStatus FROM UserAccount WHERE email = ? AND password = ? AND IsArchived = FALSE';
    con.query(sql, [email, password], (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error: ' + err.message });
        if (results.length === 0) return res.json({ success: false, message: 'Invalid email or password' });
        res.json({ success: true, user: results[0] });
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});