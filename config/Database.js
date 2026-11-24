
// Import MySQL to connect the application to the database.
const mysql = require('mysql');

// Set up the connection to the Food Bank database.
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'foodbank_db'
});

// Contains functions for managing database records.
class Database {

    // Save a new food distribution record.
    static insertDistribution(data, cb) { con.query('INSERT INTO DistributionRecord SET ?', data, cb); }

    // Update the available quantity of an inventory item.
    static updateInventory(id, qty, cb) { con.query('UPDATE InventoryData SET quantityOnHand = ? WHERE itemID = ?', [qty, id], cb); }

    // Add a new food item to the inventory.
    static insertItem(data, cb) { con.query('INSERT INTO InventoryData SET ?', data, cb); }

    // Update the information of an existing inventory item.
    static updateItem(id, data, cb) { con.query('UPDATE InventoryData SET ? WHERE itemID = ?', [data, id], cb); }

    // Archive an inventory item instead of permanently deleting it.
    static archiveItem(id, cb) { con.query('UPDATE InventoryData SET IsArchived = TRUE WHERE itemID = ?', [id], cb); }
}

// Allow other files to use the database connection and functions.
module.exports = { con, Database };
