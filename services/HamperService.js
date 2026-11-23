// Hamper business rules: checkApproval(), requestHamper(), processDistribution(), pickup status changes.
const { query, transaction } = require('../config/db');
const { AppError } = require('../config/errors');
const v = require('./validators');
const EmailService = require('./EmailService');

const OPEN = ['Scheduled', 'Delayed'];

// ---------------- Recipient side ----------------
/** checkApproval(): only Coordinator-approved Recipients may request hampers. */
async function checkApproval(recipientId) {
  const rows = await query("SELECT ApprovalStatus FROM UserAccount WHERE UserID = ? AND Role='Recipient' AND IsArchived=FALSE", [recipientId]);
  if (!rows.length) throw new AppError(404, 'Recipient not found.');
  if (rows[0].ApprovalStatus !== 'Approved') {
    throw new AppError(403, `Your registration is ${rows[0].ApprovalStatus.toLowerCase()}. You can request a hamper once a Coordinator approves it.`);
  }
}

/** requestHamper() + schedulePickup() in one step: creates the hamper and its pickup appointment. */
async function requestHamper(recipientId, body) {
  await checkApproval(recipientId);
  const when = v.requireDateTime(body.ScheduledDateTime, 'Pickup date and time');
  const [{ ok }] = await query('SELECT ? > NOW() AS ok', [when]);
  if (!ok) throw new AppError(400, 'Pick a date and time in the future.');
  const open = await query(
    `SELECT 1 FROM Hamper h JOIN PickupAppointment a ON a.HamperID = h.HamperID
     WHERE h.RecipientID = ? AND h.IsArchived = FALSE AND h.Status IN ('Requested','Prepared') AND a.Status IN ('Scheduled','Delayed')`,
    [recipientId]);
  if (open.length) throw new AppError(409, 'You already have an open hamper request. Wait until it is picked up first.');
  return transaction(async (conn) => {
    const h = await query('INSERT INTO Hamper (RecipientID, RequestDate) VALUES (?, CURDATE())', [recipientId], conn);
    const a = await query('INSERT INTO PickupAppointment (HamperID, RecipientID, ScheduledDateTime) VALUES (?,?,?)', [h.insertId, recipientId, when], conn);
    return { HamperID: h.insertId, AppointmentID: a.insertId, ScheduledDateTime: when };
  });
}

/** The Recipient's hampers with pickup status and the items in them. */
async function listMyHampers(recipientId) {
  const hampers = await query(
    `SELECT h.HamperID, h.RequestDate, h.Status, a.AppointmentID, a.ScheduledDateTime, a.Status AS PickupStatus
     FROM Hamper h JOIN PickupAppointment a ON a.HamperID = h.HamperID
     WHERE h.RecipientID = ? AND h.IsArchived = FALSE ORDER BY a.ScheduledDateTime DESC`, [recipientId]);
  for (const h of hampers) {
    h.items = await query(
      `SELECT i.ItemName, i.Unit, d.QuantityGiven FROM DistributionRecord d JOIN InventoryItem i ON i.ItemID = d.ItemID
       WHERE d.HamperID = ? AND d.IsArchived = FALSE`, [h.HamperID]);
  }
  return hampers;
}

// ---------------- Volunteer / Coordinator side ----------------
async function assertVolunteerShift(volunteerId, scheduledDateTime, conn) {
  if (process.env.ENFORCE_SHIFT === 'false') return;
  const rows = await query(
    `SELECT 1 FROM Shift WHERE VolunteerID = ? AND IsArchived = FALSE AND Status = 'Scheduled' AND ? BETWEEN StartDateTime AND EndDateTime`,
    [volunteerId, scheduledDateTime], conn);
  if (!rows.length) throw new AppError(403, 'This pickup is not inside one of your assigned shifts, so you cannot change its hamper.');
}

async function listPickups({ volunteerId = 0, openOnly, status, from, to, recipient } = {}) {
  const where = ['a.IsArchived = FALSE'];
  const p = [volunteerId || 0];
  if (openOnly) where.push("a.Status IN ('Scheduled','Delayed')");
  if (status) { where.push('a.Status = ?'); p.push(status); }
  if (from) { where.push('DATE(a.ScheduledDateTime) >= ?'); p.push(v.requireDate(from, 'From date')); }
  if (to) { where.push('DATE(a.ScheduledDateTime) <= ?'); p.push(v.requireDate(to, 'To date')); }
  if (recipient) { where.push('r.Name LIKE ?'); p.push(`%${recipient}%`); }
  return query(
    `SELECT a.AppointmentID, a.HamperID, a.ScheduledDateTime, a.Status, a.WasDelayed,
            r.Name AS RecipientName, r.DietaryRestrictions, r.HouseholdSize, h.Status AS HamperStatus,
            (SELECT COUNT(*) FROM DistributionRecord d WHERE d.HamperID = a.HamperID AND d.IsArchived = FALSE) AS ItemCount,
            (SELECT COUNT(*) FROM Shift s WHERE s.VolunteerID = ? AND s.IsArchived = FALSE AND s.Status = 'Scheduled'
               AND a.ScheduledDateTime BETWEEN s.StartDateTime AND s.EndDateTime) > 0 AS InShift
     FROM PickupAppointment a JOIN UserAccount r ON r.UserID = a.RecipientID JOIN Hamper h ON h.HamperID = a.HamperID
     WHERE ${where.join(' AND ')}
     ORDER BY ${openOnly ? 'a.ScheduledDateTime ASC' : 'a.ScheduledDateTime DESC'}`, p);
}

async function getHamper(hamperId) {
  const rows = await query(
    `SELECT h.HamperID, h.Status, h.RequestDate, a.AppointmentID, a.ScheduledDateTime, a.Status AS PickupStatus,
            r.UserID AS RecipientID, r.Name AS RecipientName, r.DietaryRestrictions, r.HouseholdSize
     FROM Hamper h JOIN PickupAppointment a ON a.HamperID = h.HamperID JOIN UserAccount r ON r.UserID = h.RecipientID
     WHERE h.HamperID = ? AND h.IsArchived = FALSE`, [hamperId]);
  if (!rows.length) throw new AppError(404, 'Hamper not found.');
  const h = rows[0];
  h.records = await query(
    `SELECT d.DistributionID, d.ItemID, d.QuantityGiven, d.Status, i.ItemName, i.Unit, i.Category
     FROM DistributionRecord d JOIN InventoryItem i ON i.ItemID = d.ItemID
     WHERE d.HamperID = ? AND d.IsArchived = FALSE ORDER BY d.DistributionID`, [hamperId]);
  return h;
}

/** Lock an inventory item row and make sure it may be handed out (expired items are never used). */
async function lockUsableItem(conn, itemId) {
  const rows = await query(
    'SELECT ItemID, ItemName, QuantityOnHand, ExpirationDate, RiskStatus, IsArchived FROM InventoryItem WHERE ItemID = ? FOR UPDATE', [itemId], conn);
  const it = rows[0];
  if (!it || it.IsArchived) throw new AppError(404, `Inventory item #${itemId} was not found.`);
  const [{ expired }] = await query('SELECT ? <= CURDATE() AS expired', [it.ExpirationDate], conn);
  if (it.RiskStatus === 'Expired' || expired) throw new AppError(409, `"${it.ItemName}" is expired and cannot be given out.`);
  return it;
}

async function loadHamperForUpdate(conn, hamperId) {
  const rows = await query(
    `SELECT h.HamperID, h.RecipientID, h.Status, a.ScheduledDateTime, a.Status AS PickupStatus
     FROM Hamper h JOIN PickupAppointment a ON a.HamperID = h.HamperID
     WHERE h.HamperID = ? AND h.IsArchived = FALSE FOR UPDATE`, [hamperId], conn);
  if (!rows.length) throw new AppError(404, 'Hamper not found.');
  return rows[0];
}

/** processDistribution(): add items to a hamper and reduce stock. items = [{ItemID, Quantity}] */
async function processDistribution(volunteerId, hamperId, items) {
  if (!Array.isArray(items) || !items.length) throw new AppError(400, 'Add at least one item.');
  const wanted = new Map();
  for (const it of items) {
    const id = v.requirePositiveInt(it.ItemID, 'Item');
    wanted.set(id, (wanted.get(id) || 0) + v.requirePositiveInt(it.Quantity, 'Quantity'));
  }
  return transaction(async (conn) => {
    const h = await loadHamperForUpdate(conn, hamperId);
    if (!['Requested', 'Prepared'].includes(h.Status)) throw new AppError(409, `This hamper is already ${h.Status.toLowerCase()}.`);
    if (!OPEN.includes(h.PickupStatus)) throw new AppError(409, `The pickup is ${h.PickupStatus.toLowerCase()}, so the hamper can no longer be changed.`);
    await assertVolunteerShift(volunteerId, h.ScheduledDateTime, conn);
    for (const [itemId, qty] of wanted) {
      const item = await lockUsableItem(conn, itemId);
      if (item.QuantityOnHand < qty) throw new AppError(409, `Only ${item.QuantityOnHand} of "${item.ItemName}" left in stock.`);
      await query('UPDATE InventoryItem SET QuantityOnHand = QuantityOnHand - ? WHERE ItemID = ?', [qty, itemId], conn);
      await query(
        `INSERT INTO DistributionRecord (HamperID, RecipientID, VolunteerID, ItemID, QuantityGiven, DistributionDate, Status)
         VALUES (?,?,?,?,?,?, 'Prepared')`, [hamperId, h.RecipientID, volunteerId, itemId, qty, h.ScheduledDateTime], conn);
    }
    await query("UPDATE Hamper SET Status = 'Prepared' WHERE HamperID = ?", [hamperId], conn);
    return { HamperID: hamperId };
  });
}

async function loadRecordForUpdate(conn, distId) {
  const rows = await query(
    `SELECT d.*, a.ScheduledDateTime FROM DistributionRecord d JOIN PickupAppointment a ON a.HamperID = d.HamperID
     WHERE d.DistributionID = ? AND d.IsArchived = FALSE FOR UPDATE`, [distId], conn);
  if (!rows.length) throw new AppError(404, 'Distribution record not found.');
  if (rows[0].Status !== 'Prepared') throw new AppError(409, 'Only prepared items can be changed. Handed-out records are kept as history.');
  return rows[0];
}

/** Modify the quantity of one distribution record (stock is adjusted by the difference). */
async function modifyDistribution(volunteerId, distId, quantity) {
  const qty = v.requirePositiveInt(quantity, 'Quantity');
  return transaction(async (conn) => {
    const d = await loadRecordForUpdate(conn, distId);
    await assertVolunteerShift(volunteerId, d.ScheduledDateTime, conn);
    const delta = qty - d.QuantityGiven;
    if (delta !== 0) {
      const rows = await query('SELECT ItemName, QuantityOnHand, IsArchived FROM InventoryItem WHERE ItemID = ? FOR UPDATE', [d.ItemID], conn);
      if (delta > 0) {
        const item = await lockUsableItem(conn, d.ItemID);
        if (item.QuantityOnHand < delta) throw new AppError(409, `Only ${item.QuantityOnHand} more of "${item.ItemName}" in stock.`);
      } else if (!rows.length) throw new AppError(404, 'Inventory item not found.');
      await query('UPDATE InventoryItem SET QuantityOnHand = QuantityOnHand - ? WHERE ItemID = ?', [delta, d.ItemID], conn);
    }
    await query('UPDATE DistributionRecord SET QuantityGiven = ?, VolunteerID = ? WHERE DistributionID = ?', [qty, volunteerId, distId], conn);
    return { DistributionID: Number(distId), QuantityGiven: qty };
  });
}

/** Delete = archive the record and return the stock to inventory. */
async function deleteDistribution(volunteerId, distId) {
  await transaction(async (conn) => {
    const d = await loadRecordForUpdate(conn, distId);
    await assertVolunteerShift(volunteerId, d.ScheduledDateTime, conn);
    await query('UPDATE InventoryItem SET QuantityOnHand = QuantityOnHand + ? WHERE ItemID = ?', [d.QuantityGiven, d.ItemID], conn);
    await query('UPDATE DistributionRecord SET IsArchived = TRUE WHERE DistributionID = ?', [distId], conn);
    const [{ n }] = await query('SELECT COUNT(*) AS n FROM DistributionRecord WHERE HamperID = ? AND IsArchived = FALSE', [d.HamperID], conn);
    if (n === 0) await query("UPDATE Hamper SET Status = 'Requested' WHERE HamperID = ?", [d.HamperID], conn);
  });
}

/** markScheduleStatus(): Volunteer marks a pickup Fulfilled, Delayed or Missed. */
async function markPickupStatus(volunteerId, appointmentId, status) {
  if (!['Fulfilled', 'Delayed', 'Missed'].includes(status)) throw new AppError(400, 'Status must be Fulfilled, Delayed or Missed.');
  await transaction(async (conn) => {
    const rows = await query('SELECT * FROM PickupAppointment WHERE AppointmentID = ? AND IsArchived = FALSE FOR UPDATE', [appointmentId], conn);
    const a = rows[0];
    if (!a) throw new AppError(404, 'Pickup appointment not found.');
    if (!OPEN.includes(a.Status)) throw new AppError(409, `This pickup is already ${a.Status.toLowerCase()}.`);
    if (a.Status === status) throw new AppError(409, `This pickup is already ${status.toLowerCase()}.`);
    if (status === 'Fulfilled') {
      const [{ n }] = await query('SELECT COUNT(*) AS n FROM DistributionRecord WHERE HamperID = ? AND IsArchived = FALSE', [a.HamperID], conn);
      if (n === 0) throw new AppError(409, 'Prepare the hamper (add items) before marking the pickup as fulfilled.');
      await query(
        "UPDATE DistributionRecord SET Status = 'Distributed', DistributionDate = NOW(), VolunteerID = ? WHERE HamperID = ? AND IsArchived = FALSE",
        [volunteerId, a.HamperID], conn);
      await query("UPDATE Hamper SET Status = 'Distributed' WHERE HamperID = ?", [a.HamperID], conn);
    }
    await query('UPDATE PickupAppointment SET Status = ?, WasDelayed = (WasDelayed OR ?) WHERE AppointmentID = ?',
      [status, status === 'Delayed', appointmentId], conn);
  });
  if (status !== 'Fulfilled') await EmailService.sendPickupAlert(appointmentId, status).catch((e) => console.error('Alert failed:', e.message));
  return { AppointmentID: Number(appointmentId), Status: status };
}

/** Used by the AnalyzerEngine. Changes status only if it is still in one of the "from" states (no duplicate alerts). */
async function autoSetPickupStatus(appointmentId, newStatus, fromStatuses) {
  const r = await query(
    `UPDATE PickupAppointment SET Status = ?, WasDelayed = (WasDelayed OR ?) WHERE AppointmentID = ? AND Status IN (?)`,
    [newStatus, newStatus === 'Delayed', appointmentId, fromStatuses]);
  return r.affectedRows > 0;
}

/** searchDistributionHistory(): by recipient name and date range (Recipients are limited to their own). */
async function searchDistributions({ recipientId, recipient, from, to } = {}) {
  const where = ['d.IsArchived = FALSE'];
  const p = [];
  if (recipientId) { where.push('d.RecipientID = ?'); p.push(recipientId); }
  if (recipient) { where.push('r.Name LIKE ?'); p.push(`%${recipient}%`); }
  if (from) { where.push('DATE(d.DistributionDate) >= ?'); p.push(v.requireDate(from, 'From date')); }
  if (to) { where.push('DATE(d.DistributionDate) <= ?'); p.push(v.requireDate(to, 'To date')); }
  return query(
    `SELECT d.DistributionID, d.HamperID, d.QuantityGiven, d.DistributionDate, d.Status,
            r.Name AS RecipientName, i.ItemName, i.Unit, i.Category, vu.Name AS VolunteerName, a.Status AS PickupStatus
     FROM DistributionRecord d
       JOIN UserAccount r ON r.UserID = d.RecipientID
       JOIN InventoryItem i ON i.ItemID = d.ItemID
       LEFT JOIN UserAccount vu ON vu.UserID = d.VolunteerID
       LEFT JOIN PickupAppointment a ON a.HamperID = d.HamperID
     WHERE ${where.join(' AND ')} ORDER BY d.DistributionDate DESC, d.DistributionID`, p);
}

module.exports = {
  checkApproval, requestHamper, listMyHampers, listPickups, getHamper,
  processDistribution, modifyDistribution, deleteDistribution, markPickupStatus, autoSetPickupStatus, searchDistributions,
};
