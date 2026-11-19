const { con } = require('../config/Database');

class AnalyzerEngine {
    static analyzeInventoryData() {
        const itemsSql = `
            SELECT itemID, itemName, category, quantityOnHand, expirationDate, riskStatus,
                   DATEDIFF(expirationDate, CURDATE()) AS DUE
            FROM InventoryData
            WHERE IsArchived = FALSE AND quantityOnHand > 0
        `;

        con.query(itemsSql, (err, items) => {
            if (err) return console.error('Inventory Query Error:', err.message);

            items.forEach(item => {
                const ivSql = `
                    SELECT COALESCE(SUM(dr.quantityGiven), 0) AS totalGiven
                    FROM DistributionRecord dr
                    JOIN InventoryData id ON dr.itemID = id.itemID
                    WHERE id.category = ? 
                      AND dr.distributionDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                      AND dr.IsArchived = FALSE
                `;

                con.query(ivSql, [item.category], (ivErr, ivRes) => {
                    if (ivErr) return console.error('IV Query Error:', ivErr.message);

                    const totalGiven = ivRes[0].totalGiven || 0;
                    const IV = (totalGiven / 30) === 0 ? 0.1 : (totalGiven / 30);
                    const EFD = item.quantityOnHand / IV;
                    const DUE = item.DUE;

                    let newStatus = 'Normal';
                    if (DUE <= 0) {
                        newStatus = 'Expired';
                    } else if (DUE <= 7 || EFD > DUE) {
                        newStatus = 'High Waste Risk';
                    }

                    if (newStatus !== item.riskStatus) {
                        con.query(
                            'UPDATE InventoryData SET riskStatus = ? WHERE itemID = ?',
                            [newStatus, item.itemID]
                        );

                        if (newStatus === 'Expired') {
                            con.query(
                                'INSERT INTO WasteLog (itemID, category, quantityWasted, wasteDate) VALUES (?, ?, ?, CURDATE())',
                                [item.itemID, item.category, item.quantityOnHand]
                            );
                        }

                        if (newStatus === 'Expired' || newStatus === 'High Waste Risk') {
                            con.query(
                                'INSERT INTO AlertLog (alertType, itemID, sentToUserID, sentDateTime) VALUES (?, ?, 1, NOW())',
                                [newStatus, item.itemID]
                            );
                        }
                    }
                });
            });
            console.log('AI Pattern Detection (DUE, IV, EFD) completed.');
        });
    }

    static identifyStockTrend() {
        this.analyzeInventoryData();
    }

    static checkPickups() {
        const missedSql = `
            UPDATE PickupAppointment 
            SET status = 'Missed' 
            WHERE status IN ('Scheduled', 'Delayed') 
              AND TIMESTAMPDIFF(MINUTE, scheduledDateTime, NOW()) > 120 
              AND IsArchived = FALSE
        `;

        const delayedSql = `
            UPDATE PickupAppointment 
            SET status = 'Delayed', wasDelayed = TRUE 
            WHERE status = 'Scheduled' 
              AND TIMESTAMPDIFF(MINUTE, scheduledDateTime, NOW()) > 30 
              AND TIMESTAMPDIFF(MINUTE, scheduledDateTime, NOW()) <= 120 
              AND IsArchived = FALSE
        `;

        con.query(missedSql, (err, missedRes) => {
            if (err) return console.error('Missed Pickup Check Error:', err.message);
            con.query(delayedSql, (err2, delayedRes) => {
                if (err2) return console.error('Delayed Pickup Check Error:', err2.message);
                console.log(`Pickup Check Done -> Missed: ${missedRes.affectedRows}, Delayed: ${delayedRes.affectedRows}`);
            });
        });
    }
}

module.exports = AnalyzerEngine;