const { query } = require('../config/db');
const Analyzer = require('../services/AnalyzerEngine');
const PickupMonitor = require('../services/PickupMonitor');

/** Coordinator expiry dashboard: every stocked item with DUE, IV, EFD and risk (live calculation). */
exports.expiry = async (req, res) => {
  const rows = await Analyzer.computeMetrics();
  rows.sort((a, b) => a.DUE - b.DUE);
  res.json(rows);
};
exports.log = async (req, res) => res.json(await query(
  `SELECT l.AlertID, l.AlertType, l.SentDateTime, l.Delivery, l.Message, u.Name AS SentTo, u.Role AS SentToRole
   FROM AlertLog l JOIN UserAccount u ON u.UserID = l.SentToUserID WHERE l.IsArchived = FALSE
   ORDER BY l.AlertID DESC LIMIT 200`));
exports.runNow = async (req, res) => {
  const inventory = await Analyzer.analyzeInventoryData();
  const pickups = await PickupMonitor.checkPickups();
  res.json({ message: 'Analysis finished.', inventory, pickups });
};
