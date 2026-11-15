// Database access (the "Database" class of the SDD). Only services talk to this file.
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'foodbank_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true, // DATE/DATETIME come back as plain strings: no timezone surprises
});

/** Run one query, return the rows (or the result header for INSERT/UPDATE). */
async function query(sql, params = [], conn = pool) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

/** Run several queries as one ACID transaction (SRS 3.2.2). */
async function transaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction };
