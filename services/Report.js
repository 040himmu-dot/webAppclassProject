// Mahdi: Report (matches UML class Report)
const { con } = require('../config/Database');

// Wraps con.query so we can use async/await instead of callbacks
function query(sql, params) {
    return new Promise((resolve, reject) => {
        con.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

// Converts (year, month) or (year) into [startDate, endDate] strings 'YYYY-MM-DD'
// e.g. (2026, 3) -> ['2026-03-01', '2026-03-31'] ; (2026) -> ['2026-01-01', '2026-12-31']
function getPeriod(year, month) {
    const y = Number(year);
    if (month) {
        const m = Number(month);
        const lastDay = new Date(y, m, 0).getDate();   // day 0 of next month = last day of this month
        const mm = String(m).padStart(2, '0');
        return [`${y}-${mm}-01`, `${y}-${mm}-${lastDay}`];
    }
    return [`${y}-01-01`, `${y}-12-31`];
}

class Report {
    // Report 1: Donation & Distribution Summary
    async generateDonationDistributionSummary(year, month) {
        const [start, end] = getPeriod(year, month);

        // 1) Total quantity of donations received, by category
        const donations = await query(
            `SELECT category, CAST(SUM(quantityReceived) AS UNSIGNED) AS total
             FROM InventoryData
             WHERE donationDate BETWEEN ? AND ? AND IsArchived = FALSE
             GROUP BY category
             ORDER BY total DESC`, [start, end]);

        // 2) Total number of hampers distributed
        const hampers = await query(
            `SELECT COUNT(DISTINCT hamperID) AS total
             FROM DistributionRecord
             WHERE status = 'Distributed' AND IsArchived = FALSE
               AND DATE(distributionDate) BETWEEN ? AND ?`, [start, end]);

        // 3) Missed / delayed pickups for each recipient, most to least
        const pickups = await query(
            `SELECT u.userID, u.name,
                SUM(CASE WHEN p.status = 'Missed' THEN 1 ELSE 0 END) AS missed,
                SUM(CASE WHEN p.wasDelayed = 1 THEN 1 ELSE 0 END) AS \`delayed\`
             FROM PickupAppointment p
             JOIN UserAccount u ON u.userID = p.recipientID
             WHERE p.IsArchived = FALSE
               AND DATE(p.scheduledDateTime) BETWEEN ? AND ?
             GROUP BY u.userID, u.name
             HAVING (missed + \`delayed\`) > 0
             ORDER BY (missed + \`delayed\`) DESC, u.name`, [start, end]);

        return { period: { start, end }, donations, hampersDistributed: hampers[0].total, pickups };
    }

    // Report 2: Inventory Waste Summary
    async generateInventoryWasteSummary(year, month) {
        const [start, end] = getPeriod(year, month);
        const waste = await query(
            `SELECT category, CAST(SUM(quantityWasted) AS UNSIGNED) AS total
             FROM WasteLog
             WHERE wasteDate BETWEEN ? AND ? AND IsArchived = FALSE
             GROUP BY category
             ORDER BY total DESC`, [start, end]);
        return { period: { start, end }, waste };
    }
}

module.exports = Report;