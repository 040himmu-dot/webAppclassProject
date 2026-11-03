// Mahdi: ReportController - receives the request, asks Report for data, sends the result back.
// (No SQL here: controllers never talk to the database directly.)
const Report = require('../services/Report');   // change the path if your Report.js lives in /services

class ReportController {
    constructor() {
        this.report = new Report();
    }

    // Reads ?type=donation|waste &year=2026 &month=3 (month optional = whole year)
    async generateReport(req, res) {
        const { type, year, month } = req.query;
        if (!year || isNaN(year)) {
            return res.status(400).json({ success: false, message: 'Please choose a year.' });
        }
        if (month && (isNaN(month) || month < 1 || month > 12)) {
            return res.status(400).json({ success: false, message: 'Month must be 1-12.' });
        }
        try {
            let data;
            if (type === 'donation') {
                data = await this.report.generateDonationDistributionSummary(year, month);
            } else if (type === 'waste') {
                data = await this.report.generateInventoryWasteSummary(year, month);
            } else {
                return res.status(400).json({ success: false, message: 'Unknown report type.' });
            }
            res.json({ success: true, type, data });
        } catch (err) {
            res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
    }
}

module.exports = new ReportController();