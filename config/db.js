
// Connects the application to the MySQL database.
require('dotenv').config();
const mysql = require('mysql2/promise');

// Create a pool of database connections using settings from the .env file.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'foodbank_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // Return dates as strings to avoid timezone issues.
});

// Run a SQL query and return the results.
async function query(sql, params = [], conn = pool) {
  // Execute the query using the provided SQL and parameters.
  const [rows] = await conn.query(sql, params);

  // Return the retrieved rows or the result of an update/insert.
  return rows;
}

// Run multiple database operations together as one transaction.
async function transaction(work) {
  // Get a database connection from the pool.
  const conn = await pool.getConnection();

  try {
    // Start the transaction.
    await conn.beginTransaction();

    // Run the database operations.
    const result = await work(conn);

    // Save all changes if everything succeeds.
    await conn.commit();

    return result;
  } catch (err) {
    // Undo all changes if an error occurs.
    await conn.rollback();
    throw err;
  } finally {
    // Release the connection back to the pool.
    conn.release();
  }
}

// Allow other files to use these database functions.
module.exports = { pool, query, transaction };
