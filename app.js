// Online Food Bank Management System - main server file.
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const apiRoutes = require('./routes/api');
const Analyzer = require('./services/AnalyzerEngine');
const { pool } = require('./config/db');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));

// central error handler: AppError -> its status, everything else -> 500
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Image must be 2 MB or smaller.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'That record is linked to other data and cannot be changed this way.' });
  }
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.code === 'ER_CONSTRAINT_FAILED' || err.errno === 4025) {
    return res.status(400).json({ error: 'The values you entered break a database rule (for example a negative quantity).' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
});

const PORT = process.env.PORT || 3000;
pool.query('SELECT 1').then(() => {
  app.listen(PORT, () => {
    console.log(`Food Bank running at http://localhost:${PORT}`);
    if (process.env.ENABLE_SCHEDULER !== 'false') Analyzer.start();
  });
}).catch((e) => {
  console.error('Cannot connect to MySQL. Check DB_* values in your .env file and that the database exists.\n', e.message);
  process.exit(1);
});

module.exports = app;
