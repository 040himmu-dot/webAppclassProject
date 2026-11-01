const { con } = require('../config/Database');

class EmailService {
    static sendEmail(userId, alertType) {
        const sql = 'INSERT INTO AlertLog (alertType, sentToUserID, sentDateTime, IsArchived) VALUES (?, ?, NOW(), FALSE)';
        con.query(sql, [alertType, userId], (err) => {
            if (err) {
                console.log('Error saving alert:', err.message);
            } else {
                console.log('Email alert saved for user ID:', userId);
            }
        });
    }
}

module.exports = EmailService;