// Inventory + donations: enterItem(), modifyItem(), deleteItem() -> archiveItem(), search...()
const { query, transaction } = require('../config/db');
const { AppError } = require('../config/errors');
const v = require('./validators');

// ---------------- Categories (Coordinator) ----------------
const listCategories = () => query('SELECT CategoryID, CategoryName FROM Category ORDER BY CategoryName');

async function createCategory(name) {
  const n = v.requireText(name, 'Category name', 60);
  try {
    const r = await query('INSERT INTO Category (CategoryName) VALUES (?)', [n]);
    return { CategoryID: r.insertId, CategoryName: n };
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new AppError(409, 'That category already exists.');
    throw e;
  }
}
async function renameCategory(id, name) {
  const n = v.requireText(name, 'Category name', 60);
  try {
    const r = await query('UPDATE Category SET CategoryName = ? WHERE CategoryID = ?', [n, id]);
    if (!r.affectedRows) throw new AppError(404, 'Category not found.');
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new AppError(409, 'That category already exists.');
    throw e;
  }
  return { CategoryID: Number(id), CategoryName: n };
}
async function deleteCategory(id) {
  const rows = await query('SELECT CategoryName FROM Category WHERE CategoryID = ?', [id]);
  if (!rows.length) throw new AppError(404, 'Category not found.');
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM InventoryItem WHERE Category = ?', [rows[0].CategoryName]);
  if (n > 0) throw new AppError(409, 'This category is used by inventory records and cannot be deleted.');
  await query('DELETE FROM Category WHERE CategoryID = ?', [id]);
}

// ---------------- Inventory intake ----------------
async function validateItem(raw, { allowPastExpiry = false } = {}) {
  const category = v.requireText(raw.Category, 'Category', 60);
  const cats = await query('SELECT 1 FROM Category WHERE CategoryName = ?', [category]);
  if (!cats.length) throw new AppError(400, `Category "${category}" does not exist.`);
  const qty = v.requirePositiveInt(raw.Quantity ?? raw.QuantityReceived, 'Quantity');
  const expiration = v.requireDate(raw.ExpirationDate, 'Expiration date');
  const donation = v.optionalDate(raw.DonationDate, 'Donation date');
  const [{ today }] = await query('SELECT CURDATE() AS today');
  const donationDate = donation || today;
  if (expiration < donationDate) throw new AppError(400, 'Expiration date cannot be before the donation date.');
  if (!allowPastExpiry && expiration <= today) throw new AppError(400, 'This item is already expired and cannot be added to inventory.');
  return {
    ItemName: v.requireText(raw.ItemName, 'Item name', 100),
    Category: category, Quantity: qty,
    Unit: v.requireText(raw.Unit, 'Unit', 20),
    ExpirationDate: expiration, DonationDate: donationDate,
  };
}

/** enterItem(): add one or more items from a donation. donorId may be null (walk-in/anonymous). */
async function enterItems(items, donorId) {
  if (!Array.isArray(items) || !items.length) throw new AppError(400, 'Add at least one item.');
  const clean = [];
  for (const it of items) clean.push(await validateItem(it));
  if (donorId) {
    const d = await query("SELECT 1 FROM UserAccount WHERE UserID = ? AND Role = 'Donor' AND IsArchived = FALSE", [donorId]);
    if (!d.length) throw new AppError(400, 'Selected donor does not exist.');
  }
  return transaction(async (conn) => {
    const ids = [];
    for (const it of clean) {
      const r = await query(
        `INSERT INTO InventoryItem (ItemName, Category, QuantityOnHand, QuantityReceived, Unit, DonorID, DonationDate, ExpirationDate)
         VALUES (?,?,?,?,?,?,?,?)`,
        [it.ItemName, it.Category, it.Quantity, it.Quantity, it.Unit, donorId || null, it.DonationDate, it.ExpirationDate], conn);
      ids.push(r.insertId);
    }
    return ids;
  });
}

/** modifyItem() */
async function modifyItem(id, body) {
  const rows = await query('SELECT * FROM InventoryItem WHERE ItemID = ? AND IsArchived = FALSE', [id]);
  const cur = rows[0];
  if (!cur) throw new AppError(404, 'Inventory item not found.');
  const merged = {
    ItemName: body.ItemName ?? cur.ItemName, Category: body.Category ?? cur.Category,
    Quantity: cur.QuantityReceived, Unit: body.Unit ?? cur.Unit,
    ExpirationDate: body.ExpirationDate ?? cur.ExpirationDate, DonationDate: cur.DonationDate,
  };
  const clean = await validateItem(merged, { allowPastExpiry: true });
  const onHand = body.QuantityOnHand !== undefined ? v.requireNonNegInt(body.QuantityOnHand, 'Quantity on hand') : cur.QuantityOnHand;
  const received = body.QuantityReceived !== undefined ? v.requirePositiveInt(body.QuantityReceived, 'Quantity received') : cur.QuantityReceived;
  // reset the risk status when the expiry date changes so the next AI run re-evaluates it
  const risk = clean.ExpirationDate !== cur.ExpirationDate ? 'Normal' : cur.RiskStatus;
  await query(
    `UPDATE InventoryItem SET ItemName=?, Category=?, Unit=?, ExpirationDate=?, QuantityOnHand=?, QuantityReceived=?, RiskStatus=? WHERE ItemID=?`,
    [clean.ItemName, clean.Category, clean.Unit, clean.ExpirationDate, onHand, received, risk, id]);
  return getItem(id);
}

/** deleteItem() -> archiveItem(): never physically deletes (3-year retention). */
async function deleteItem(id, { recordWaste = false } = {}) {
  await transaction(async (conn) => {
    const rows = await query('SELECT * FROM InventoryItem WHERE ItemID = ? AND IsArchived = FALSE FOR UPDATE', [id], conn);
    const it = rows[0];
    if (!it) throw new AppError(404, 'Inventory item not found.');
    if (recordWaste && it.QuantityOnHand > 0) {
      await query(
        `INSERT INTO WasteLog (ItemID, Category, Unit, QuantityWasted, WasteDate, Reason) VALUES (?,?,?,?,CURDATE(),'Wasted')`,
        [it.ItemID, it.Category, it.Unit, it.QuantityOnHand], conn);
    }
    await query('UPDATE InventoryItem SET IsArchived = TRUE WHERE ItemID = ?', [id], conn);
  });
}

async function getItem(id) {
  const rows = await query(
    `SELECT i.*, DATEDIFF(i.ExpirationDate, CURDATE()) AS DUE, u.Name AS DonorName
     FROM InventoryItem i LEFT JOIN UserAccount u ON u.UserID = i.DonorID WHERE i.ItemID = ?`, [id]);
  return rows[0];
}

/** searchInventory(): by name, category, status, expiry range and quantity range. */
async function searchInventory(f = {}) {
  const where = ['i.IsArchived = FALSE'];
  const p = [];
  if (f.q) { where.push('i.ItemName LIKE ?'); p.push(`%${f.q}%`); }
  if (f.category) { where.push('i.Category = ?'); p.push(f.category); }
  if (f.status) { where.push('i.RiskStatus = ?'); p.push(f.status); }
  if (f.expiryFrom) { where.push('i.ExpirationDate >= ?'); p.push(v.requireDate(f.expiryFrom, 'Expiry from')); }
  if (f.expiryTo) { where.push('i.ExpirationDate <= ?'); p.push(v.requireDate(f.expiryTo, 'Expiry to')); }
  if (f.minQty !== undefined && f.minQty !== '') { where.push('i.QuantityOnHand >= ?'); p.push(v.requireNonNegInt(f.minQty, 'Minimum quantity')); }
  if (f.maxQty !== undefined && f.maxQty !== '') { where.push('i.QuantityOnHand <= ?'); p.push(v.requireNonNegInt(f.maxQty, 'Maximum quantity')); }
  return query(
    `SELECT i.*, DATEDIFF(i.ExpirationDate, CURDATE()) AS DUE, u.Name AS DonorName
     FROM InventoryItem i LEFT JOIN UserAccount u ON u.UserID = i.DonorID
     WHERE ${where.join(' AND ')} ORDER BY i.ExpirationDate, i.ItemName`, p);
}

/** searchDonationHistory(): a Donor's own donations by date range and category. */
async function searchDonationHistory(donorId, f = {}) {
  const where = ['DonorID = ?'];
  const p = [donorId];
  if (f.from) { where.push('DonationDate >= ?'); p.push(v.requireDate(f.from, 'From date')); }
  if (f.to) { where.push('DonationDate <= ?'); p.push(v.requireDate(f.to, 'To date')); }
  if (f.category) { where.push('Category = ?'); p.push(f.category); }
  return query(
    `SELECT ItemID, ItemName, Category, QuantityReceived, Unit, DonationDate, ExpirationDate
     FROM InventoryItem WHERE ${where.join(' AND ')} ORDER BY DonationDate DESC, ItemID DESC`, p);
}

module.exports = {
  listCategories, createCategory, renameCategory, deleteCategory,
  enterItems, modifyItem, deleteItem, getItem, searchInventory, searchDonationHistory,
};
