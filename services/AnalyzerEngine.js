// Owner: Mahima - AnalyzerEngine (SDD 3.3): AI Pattern Detection (every 4 h). Starts Manjot's PickupMonitor too.
// "AI" here = simple rules (DUE / IV / EFD), not machine learning - exactly as the SDD describes.
const cron = require('node-cron');
const { query } = require('../config/db');
const EmailService = require('./EmailService');
const PickupMonitor = require('./PickupMonitor');

/** Calculates DUE, IV, EFD and the risk the item *should* have. Writes nothing. */
async function computeMetrics() {
  const items = await query(
    `SELECT ItemID, ItemName, Category, Unit, QuantityOnHand, ExpirationDate, RiskStatus,
            DATEDIFF(ExpirationDate, CURDATE()) AS DUE
     FROM InventoryItem WHERE IsArchived = FALSE AND QuantityOnHand > 0`);
  const given = await query(
    `SELECT i.Category, SUM(d.QuantityGiven) AS Given
     FROM DistributionRecord d JOIN InventoryItem i ON i.ItemID = d.ItemID
     WHERE d.IsArchived = FALSE AND d.Status = 'Distributed' AND d.DistributionDate >= NOW() - INTERVAL 30 DAY
     GROUP BY i.Category`);
  const givenBy = new Map(given.map((g) => [g.Category, Number(g.Given)]));
  return items.map((it) => {
    const total = givenBy.get(it.Category) || 0;
    const IV = total === 0 ? 0.1 : total / 30;                 // fallback 0.1 avoids division by zero
    const EFD = it.QuantityOnHand / IV;
    let NewStatus = 'Normal';
    if (it.DUE <= 0) NewStatus = 'Expired';
    else if (it.DUE <= 7 || EFD > it.DUE) NewStatus = 'High Waste Risk';
    return { ...it, IV: Math.round(IV * 100) / 100, EFD: Math.round(EFD * 10) / 10, NewStatus };
  });
}

/** analyzeInventoryData() + identifyStockTrend(): update RiskStatus, log waste, e-mail newly flagged items. */
async function analyzeInventoryData() {
  const metrics = await computeMetrics();
  const newlyFlagged = [];
  for (const m of metrics) {
    if (m.NewStatus === m.RiskStatus) continue;
    await query('UPDATE InventoryItem SET RiskStatus = ? WHERE ItemID = ?', [m.NewStatus, m.ItemID]);
    if (m.NewStatus === 'Expired') {
      await query(
        `INSERT INTO WasteLog (ItemID, Category, Unit, QuantityWasted, WasteDate, Reason) VALUES (?,?,?,?,CURDATE(),'Expired')`,
        [m.ItemID, m.Category, m.Unit, m.QuantityOnHand]);
    }
    if (m.NewStatus !== 'Normal') newlyFlagged.push({ ...m, RiskStatus: m.NewStatus });
  }
  let emailed = 0;
  if (newlyFlagged.length) emailed = await EmailService.sendInventoryAlert(newlyFlagged);
  const summary = { checked: metrics.length, newlyFlagged: newlyFlagged.length, emailedPeople: emailed, at: new Date().toISOString() };
  console.log('[Analyzer] inventory run:', summary);
  return summary;
}

function start() {
  const safe = (fn, name) => () => fn().catch((e) => console.error(`[Analyzer] ${name} failed:`, e.message));
  cron.schedule('0 */4 * * *', safe(analyzeInventoryData, 'inventory run'));   // 00:00, 04:00, 08:00 ...
 cron.schedule('*/5 * * * *', safe(PickupMonitor.checkPickups, 'pickup monitor'));          // every 5 minutes
  setTimeout(safe(analyzeInventoryData, 'inventory run'), 3000);
  setTimeout(safe(PickupMonitor.checkPickups, 'pickup monitor'), 4000);
  console.log('[Analyzer] scheduler started (inventory every 4 h, pickups every 5 min)');
}

module.exports = { computeMetrics, analyzeInventoryData, start };
