// Mahima: InventoryService

const { Database } = require('../config/Database');

class InventoryService {

    enterItem(itemData, callback) {
        // Make sure required information is provided
        const required = [
            'itemName',
            'category',
            'quantityReceived',
            'unit',
            'donationDate',
            'expirationDate'
        ];

        for (const field of required) {
            if (itemData[field] === undefined ||
                itemData[field] === null ||
                itemData[field] === '') {
                return callback(new Error(`${field} is required`));
            }
        }

        // Check that the quantity is valid
        const quantity = Number(itemData.quantityReceived);

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return callback(new Error('Quantity must be a positive whole number'));
        }

        // Prepare inventory information for MySQL
        const inventoryItem = {
            itemName: itemData.itemName,
            category: itemData.category,
            quantityReceived: quantity,
            quantityOnHand: quantity,
            unit: itemData.unit,
            donorID: itemData.donorID || null,
            donationDate: itemData.donationDate,
            expirationDate: itemData.expirationDate,
            riskStatus: 'Normal'
        };

        // Save the item using the existing database method
        Database.insertItem(inventoryItem, callback);
    }

    modifyItem() {}

    deleteItem() {}

    searchDonationHistory() {}
}

module.exports = InventoryService;
