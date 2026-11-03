// Manjot: HamperService
const { con } = require('../config/Database');

class HamperService {
    static isValidID(id) {
        if (id === null || id === undefined || String(id).trim() === '') {
            return false;
        }

        const numericID = Number(id);

        return Number.isSafeInteger(numericID) && numericID > 0;
    }
// Check recipient approval
    static checkApproval(recipientID, callback) {

        if(!this.isValidID(recipientID)) {
            return callback(null, {
                approved: false,
                message: 'Invalid recipient ID.'

            });
        }
        const sql = `
        SELECT userID, name, approvalStatus
        FROM UserAccount
        WHERE userID = ?
        AND role = 'Recipient'
        AND IsArchived = FALSE
        `;
        
        con.query(sql, [recipientID], (err, results) => {

            if (err) {
                return callback(err);
            }

            if (results.length === 0) {
                return callback(null, {
                    approved: false,
                    message: 'Recipient account not found.'
                });
            }

            const recipient = results[0];

            if (recipient.approvalStatus !== 'Approved') {
                return callback(null, {
                    approved: false,
                    message: 'Your account has not been approved by a coordinator.'
                });
            }
    
        callback(null, {
            approved: true,
            recipient: recipient
        });
    });
}
    // Create a hamper request
    static requestHamper(recipientID, callback) {
        this.checkApproval(recipientID, (err, result) => {
            
            if (err) {
                return callback(err);
            }

            if(!result.approved) {
                return callback(null, {
                    success: false,
                    message: result.message
                });
            }

            const sql = `
            INSERT INTO Hamper
            (recipientID, requestDate, status)
            VALUES (?, CURDATE(), 'Requested')
            `;

            con.query(sql, [recipientID], (err,result) => {

                if (err) {
                    return callback(err);
                }

                callback(null, {
                    success: true,
                    message: 'Your hamper request was submitted successfully.',
                    hamperID: result.insertId,
                    status: 'Requested'
                });
            });
        });
    }


    // Schedule a pickup for an approved recipient
    static schedulePickup(recipientID, hamperID, scheduledDateTime, callback) {

        this.checkApproval(recipientID, (err, result) => {

            if (err) {
                return callback(err);
            }

            if(!result.approved) {
                return callback(null, {
                    success: false,
                    message: result.message
                });
            }

            const sql = `
            SELECT hamperID
            FROM Hamper
            WHERE hamperID = ?
            AND recipientID = ?
            AND status = 'Requested'
            AND IsArchived = FALSE
            `;

            con.query(sql, [hamperID, recipientID], (err, results) => {

                if (err) {
                    return callback(err);
                }

                if(results.length === 0) {
                    return callback(null, {
                        success: false,
                        message: 'Hamper request not found or unavailable.'
                    });
                }

                const appointmentSQL = `
                INSERT INTO PickupAppointment
                (hamperID, recipientID, scheduledDateTime, status)
                VALUES (?, ?, ?, 'Scheduled')
                `;

                con.query(
                    appointmentSQL,
                    [hamperID, recipientID, scheduledDateTime],
                    (err, appointment) => {

                        if(err) {
                            return callback(err);   
                        }

                        callback(null, {
                            success: true,
                            message: 'Pickup scheduled successfully.',
                            appointmentID: appointment.insertId,
                            hamperID: hamperID,
                            scheduledDateTime: scheduledDateTime,
                            status: 'Scheduled'
                        });
                    }
                );
            });

        });
    }
    
}
module.exports = HamperService;
