// Report Generation Algorithm (SDD 3.3 #2): period -> start/end dates -> SUM()/COUNT() ... GROUP BY.
const { query } = require('../config/db');
const { AppError } = require('../config/errors');

function resolvePeriod({ period, year, month }) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) throw new AppError(400, 'Choose a valid year.');
  const pad = (n) => String(n).padStart(2, '0');
  if (period === 'year') {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Year ${y}` };
  }
  if (period === 'month') {
    const m = Number(month);
    if (!Number.isInteger(m) || m < 1 || m > 12) throw new AppError(400, 'Choose a valid month.');
    const last = new Date(y, m, 0).getDate();
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(last)}`, label: `${names[m - 1]} ${y}` };
  }
  throw new AppError(400, 'Choose Monthly or Annual.');
}

/** generateDonationDistributionSummary() */
async function donationDistributionSummary(range) {
  const donations = await query(
    `SELECT Category, Unit, CAST(SUM(QuantityReceived) AS UNSIGNED) AS Total
     FROM InventoryItem WHERE IsArchived = FALSE AND DonationDate BETWEEN ? AND ?
     GROUP BY Category, Unit ORDER BY Total DESC, Category`, [range.start, range.end]);
  const [{ Hampers }] = await query(
    `SELECT COUNT(DISTINCT HamperID) AS Hampers FROM DistributionRecord
     WHERE IsArchived = FALSE AND Status = 'Distributed' AND DATE(DistributionDate) BETWEEN ? AND ?`, [range.start, range.end]);
  const attendance = await query(
    `SELECT * FROM (
       SELECT r.UserID, r.Name AS RecipientName,
              CAST(SUM(a.Status = 'Missed') AS UNSIGNED) AS MissedCount, CAST(SUM(a.WasDelayed) AS UNSIGNED) AS DelayedCount
       FROM PickupAppointment a JOIN UserAccount r ON r.UserID = a.RecipientID
       WHERE DATE(a.ScheduledDateTime) BETWEEN ? AND ?
       GROUP BY r.UserID, r.Name) t
     WHERE MissedCount > 0 OR DelayedCount > 0
     ORDER BY (MissedCount + DelayedCount) DESC, MissedCount DESC, RecipientName`, [range.start, range.end]);
  return { type: 'donation', period: range.label, donations, hampersDistributed: Number(Hampers), attendance };
}

/** generateInventoryWasteSummary() */
async function inventoryWasteSummary(range) {
  const waste = await query(
    `SELECT Category, Unit, CAST(SUM(QuantityWasted) AS UNSIGNED) AS Total
     FROM WasteLog WHERE IsArchived = FALSE AND WasteDate BETWEEN ? AND ?
     GROUP BY Category, Unit ORDER BY Total DESC, Category`, [range.start, range.end]);
  return { type: 'waste', period: range.label, waste };
}

async function generate({ type, period, year, month }) {
  const range = resolvePeriod({ period, year, month });
  if (type === 'donation') return donationDistributionSummary(range);
  if (type === 'waste') return inventoryWasteSummary(range);
  throw new AppError(400, 'Choose a report type.');
}

module.exports = { generate };
