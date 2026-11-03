// Manjot: HamperController

const express = require('express');
const HamperService = require('../services/HamperService');

const router = express.Router();

class HamperController {

    // Check recipient approval
    checkRecipientApproval(req, res) {

        const recipientID = req.user?.userID;

        if (!recipientID) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to continue.'
            });
        }

        HamperService.checkApproval(recipientID, (error, result) => {
            if (error) {
                console.error('Approval check error:', error);

                return res.status(500).json({
                    success: false,
                    message: 'Unable to check recipient approval.'
                });
            }

            if (!result.approved) {
                return res.status(403).json({
                    success: false,
                    message: result.message
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Recipient account is approved.',
                recipient: result.recipient
            });
        });
    }

    // Submit a new hamper request
    requestHamper(req, res) {

        const recipientID  = req.user?.userID;

        if(!recipientID) {
            return res.status(401).json({
                success: false,
                message: 'Please log in to continue.'
            });
        }

        

            //Call HamperService to check approval and create request

        HamperService.requestHamper(recipientID, (error,result) => {

            if (error) {
                console.error('Hamper request error:', error);

                return res.status(500).json({
                    success: false,
                    message: 'Unable to process hamper request.'
                });
            }

            if(!result.success) {
                return res.status(403).json({
                    success: false,
                    message: result.message
                });
            }

            return res.status(201).json({
                success: true,
                message: result.message,
                hamperID: result.hamperID,
                status: result.status
            });
        });
        
    }


    //Schedule a pickup
    schedulePickup(req, res) {
        const recipientID = req.user?.userID;

        if (!recipientID) {
            return res.status(401).json({
                success: false,
                message:'Please log in to continue.'
            });
        }

        const { hamperID, scheduledDateTime } = req.body;

        // Check required fields
        if (!hamperID || !scheduledDateTime) {
            return res.status(400).json({
                success: false,
                message:'Hamper ID and pickup date/time are required.'
            });

        } 

        //Validate hamperID
        const numericHamperID = Number(hamperID);

        if(!Number.isSafeInteger(numericHamperID) || numericHamperID <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid hamper ID.'
            });
        }

        // Call HamperService to schedule pickup
        HamperService.schedulePickup(
            recipientID,
            numericHamperID,
            scheduledDateTime,
            (error, result) => {

                if(error) {
                    console.error('Pickup scheduling error:', error);

                    return res.status(500).json({
                        success: false,
                        message: 'Unable to schedule pickup.'
                    });
                }

                if(!result.success) {
                    return res.status(400).json({
                        success: false,
                        message: result.message
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: result.message,
                    appointmentID: result.appointmentID,
                    hamperID: result.hamperID,
                    scheduledDateTime: result.scheduledDateTime,
                    status: result.status
                });
            }
        );




        
    }


}

// Create controller instance
const controller = new HamperController();

// Check recipient approval
router.get('/approval', (req, res) => {
    controller.checkRecipientApproval(req, res);
});

// Submit hamper request
router.post('/request', (req, res) => {
    controller.requestHamper(req, res);
});

// Schedule pickup
router.post('/schedule', (req, res) => {
    controller.schedulePickup(req, res);
});
module.exports = router;
