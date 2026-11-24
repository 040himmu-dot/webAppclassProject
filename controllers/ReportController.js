const ReportService = require('../services/ReportService');

// Report Generation Operations ----------------
/**
 * Generate a report based on query parameters (such as report type and date range)
 * and return the resulting dataset as JSON
 */
exports.generate = async (req, res) => res.json(await ReportService.generate(req.query));
