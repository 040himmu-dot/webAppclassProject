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

    
updateInventoryItem(req, res) {
    inventoryService.modifyItem(
        req.params.id,
        req.body,
        (error, result) => {
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Inventory item not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Inventory item updated successfully'
            });
        }
    );
}


deleteInventoryItem(req, res) {
    inventoryService.deleteItem(req.params.id, (error, result) => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Inventory item archived successfully'
        });
    });
}

    displayConfirmation(req, res) {
        res.json({
            message: 'Inventory operation completed'
        });
    }

    
displaySearchResults(req, res) {
    const donorId = req.params.donorId;

    const filters = {
        date: req.query.date,
        category: req.query.category
    };

    inventoryService.searchDonationHistory(
        donorId,
        filters,
        (error, results) => {
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(200).json({
                success: true,
                donations: results
            });
        }
    );
}

}

const controller = new InventoryController();

// Add inventory item
router.post('/', (req, res) => {
    controller.receiveInventoryRequest(req, res);
});
// Update inventory item
router.put('/:id', (req, res) => {
    controller.updateInventoryItem(req, res);
});
// Archive inventory item
router.delete('/:id', (req, res) => {
    controller.deleteInventoryItem(req, res);
});
// View and search donor donation history
router.get('/donations/:donorId', (req, res) => {
    controller.displaySearchResults(req, res);
});
module.exports = router;
