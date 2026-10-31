const mysql = require('mysql');
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'foodbank_db'
});
class Database {
    static insertDistribution(data, cb) { con.query('INSERT INTO DistributionRecord SET ?', data, cb); }
    static updateInventory(id, qty, cb) { con.query('UPDATE InventoryData SET quantityOnHand = ? WHERE itemID = ?', [qty, id], cb); }
    static insertItem(data, cb) { con.query('INSERT INTO InventoryData SET ?', data, cb); }
    static updateItem(id, data, cb) { con.query('UPDATE InventoryData SET ? WHERE itemID = ?', [data, id], cb); }
    static archiveItem(id, cb) { con.query('UPDATE InventoryData SET IsArchived = TRUE WHERE itemID = ?', [id], cb); }
}
module.exports = { con, Database };
