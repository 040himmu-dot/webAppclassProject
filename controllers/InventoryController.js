// Mahima: InventoryController


const express = require('express');
const InventoryService = require('../services/InventoryService');

const router = express.Router();
const inventoryService = new InventoryService();

class InventoryController {
    receiveInventoryRequest(req, res) {
        inventoryService.enterItem(req.body, (error, result) => {
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Inventory item added successfully',
                itemID: result.insertId
            });
        });
    }

    displayConfirmation(req, res) {
        res.json({
            message: 'Inventory operation completed'
        });
    }

    displaySearchResults(req, res) {
        res.status(501).json({
            message: 'Inventory search is not implemented yet'
        });
    }
}

const controller = new InventoryController();

// Add inventory item
router.post('/', (req, res) => {
    controller.receiveInventoryRequest(req, res);
});

module.exports = router;
