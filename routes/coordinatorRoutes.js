// Mahdi: routes for the Coordinator features (reports now; accounts and shifts later).
// Kept in its own file so app.js (Aakrosh's) only needs ONE extra line:
//     app.use('/api', require('./routes/coordinatorRoutes'));
const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const reportController = ReportController; 

// TODO: add the Coordinator-only permission check here once Aakrosh
// confirms how logged-in users are identified.
router.get('/reports', (req, res) => reportController.generateReport(req, res));

module.exports = router;