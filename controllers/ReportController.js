const ReportService = require('../services/ReportService');
exports.generate = async (req, res) => res.json(await ReportService.generate(req.query));
