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

   
modifyItem(itemId, itemData, callback) {
    // Check that the item ID is valid
    const id = Number(itemId);

    if (!Number.isInteger(id) || id <= 0) {
        return callback(new Error('Invalid item ID'));
    }

    // Only allow these inventory fields to be updated
    const allowedFields = [
        'itemName',
        'category',
        'quantityOnHand',
        'quantityReceived',
        'unit',
        'expirationDate'
    ];

    const updates = {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(itemData, field)) {
            updates[field] = itemData[field];
        }
    }

    // Make sure there is something to update
    if (Object.keys(updates).length === 0) {
        return callback(new Error('No valid fields provided'));
    }

    // Validate inventory quantities
    for (const field of ['quantityOnHand', 'quantityReceived']) {
        if (field in updates) {
            const quantity = Number(updates[field]);

            if (!Number.isInteger(quantity) || quantity < 0) {
                return callback(new Error(`${field} must be a non-negative whole number`));
            }

            updates[field] = quantity;
        }
    }

    // Update the existing inventory item
    Database.updateItem(id, updates, callback);
}


   
deleteItem(itemId, callback) {
    // Check that the item ID is valid
    const id = Number(itemId);

    if (!Number.isInteger(id) || id <= 0) {
        return callback(new Error('Invalid item ID'));
    }

    // Archive the item instead of permanently deleting it
    Database.archiveItem(id, (error, result) => {
        if (error) {
            return callback(error);
        }

        if (result.affectedRows === 0) {
            return callback(new Error('Inventory item not found'));
        }

        callback(null, result);
    });
}


    
searchDonationHistory(donorId, filters, callback) {
    const id = Number(donorId);

    if (!Number.isInteger(id) || id <= 0) {
        return callback(new Error('Invalid donor ID'));
    }

    filters = filters || {};

    let sql = `
        SELECT itemID, itemName, category,
               quantityReceived, unit, donationDate
        FROM InventoryData
        WHERE donorID = ? AND IsArchived = FALSE
    `;

    const params = [id];

    if (filters.date) {
        sql += ' AND donationDate = ?';
        params.push(filters.date);
    }

    if (filters.category) {
        sql += ' AND category = ?';
        params.push(filters.category);
    }

    sql += ' ORDER BY donationDate DESC';

    const { con } = require('../config/Database');
    con.query(sql, params, callback);
}

}

module.exports = InventoryService;
