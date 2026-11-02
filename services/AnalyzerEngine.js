const { con } = require('../config/Database');
const EmailService = require('./EmailService');

class AnalyzerEngine {
    static analyzeInventoryData() {
        const sql = `
            UPDATE InventoryData 
            SET wasteRiskFlag = 'High Waste Risk' 
            WHERE expiryDate <= DATE_ADD(NOW(), INTERVAL 3 DAY) 
            AND (wasteRiskFlag IS NULL OR wasteRiskFlag != 'High Waste Risk')
        `;
        
        con.query(sql, (err, result) => {
            if (err) console.log('Error analyzing inventory:', err.message);
            else console.log(`Analysis complete. ${result.affectedRows} items flagged.`);
        });
    }

    static checkPickups() {
        const sql = `
            SELECT appointmentID, userID 
            FROM PickupAppointment 
            WHERE status != 'Completed' AND appointmentDate < NOW()
        `;
        
        con.query(sql, (err, results) => {
            if (err) return console.log('Error checking pickups:', err.message);
            
            results.forEach(appointment => {
                EmailService.sendEmail(appointment.userID, 'Missed Pickup');
            });
            console.log(`Checked pickups: ${results.length} delayed appointments found.`);
        });
    }
}

module.exports = AnalyzerEngine;