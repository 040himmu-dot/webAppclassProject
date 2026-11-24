const { query } = require('../config/db');
const Analyzer = require('../services/AnalyzerEngine');
const PickupMonitor = require('../services/PickupMonitor');

// ---------- Expiry Alert Operations ----------------
/**
 * Retrieve inventory items for the Coordinator's expiry dashboard.
 * Calculates the Days Until Expiration (DUE), Inventory Velocity (IV),
 * Estimated Finishing Days (EFD), and current risk status for each item.
 */
exports.expiry = async (req, res) => {
  const rows = await Analyzer.computeMetrics();
  rows.sort((a, b) => a.DUE - b.DUE);
  res.json(rows);
};

// Retrieve the latest 200 alert records, including the alert type,
// sent date, delivery status, message, and recipient information.
exports.log = async (req, res) => res.json(await query(
  `SELECT l.AlertID, l.AlertType, l.SentDateTime, l.Delivery, l.Message, u.Name AS SentTo, u.Role AS SentToRole
   FROM AlertLog l JOIN UserAccount u ON u.UserID = l.SentToUserID WHERE l.IsArchived = FALSE
   ORDER BY l.AlertID DESC LIMIT 200`));

//---------- Manual Analysis Operations -------------
/**
 * Manually trigger inventory risk analysis and scheduled pickup
 * monitoring.
 * Runs both processes and returns their results to the Coordinator.
 */
exports.runNow = async (req, res) => {
  const inventory = await Analyzer.analyzeInventoryData();
  const pickups = await PickupMonitor.checkPickups();
  res.json({ message: 'Analysis finished.', inventory, pickups });
};
