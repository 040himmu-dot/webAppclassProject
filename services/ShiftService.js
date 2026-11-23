// Coordinator assigns Volunteers to distribution shifts (checks the volunteer's availability).
const { query } = require('../config/db');
const { AppError } = require('../config/errors');
const v = require('./validators');

async function listShifts({ volunteerId, from, to, includeCancelled } = {}) {
  const where = ['s.IsArchived = FALSE'];
  const p = [];
  if (volunteerId) { where.push('s.VolunteerID = ?'); p.push(volunteerId); }
  if (from) { where.push('DATE(s.StartDateTime) >= ?'); p.push(v.requireDate(from, 'From date')); }
  if (to) { where.push('DATE(s.StartDateTime) <= ?'); p.push(v.requireDate(to, 'To date')); }
  if (!includeCancelled) where.push("s.Status <> 'Cancelled'");
  return query(
    `SELECT s.*, u.Name AS VolunteerName, c.Name AS AssignedByName
     FROM Shift s JOIN UserAccount u ON u.UserID = s.VolunteerID LEFT JOIN UserAccount c ON c.UserID = s.AssignedBy
     WHERE ${where.join(' AND ')} ORDER BY s.StartDateTime DESC`, p);
}

/** assignVolunteers() */
async function assignShift(coordinatorId, body) {
  const vol = (await query("SELECT * FROM UserAccount WHERE UserID = ? AND Role='Volunteer' AND IsArchived=FALSE", [body.VolunteerID]))[0];
  if (!vol) throw new AppError(400, 'Choose a valid volunteer.');
  const start = v.requireDateTime(body.StartDateTime, 'Start time');
  const end = v.requireDateTime(body.EndDateTime, 'End time');
  if (end <= start) throw new AppError(400, 'The shift must end after it starts.');
  if (start.slice(0, 10) !== end.slice(0, 10)) throw new AppError(400, 'A shift must start and end on the same day.');
  const task = v.requireText(body.TaskDescription, 'Task description', 255);

  if (!vol.Availability) throw new AppError(409, `${vol.Name} has not set any availability yet.`);
  if (!v.availabilityCovers(vol.Availability, start, end)) {
    throw new AppError(409, `${vol.Name} is not available at that time (availability: ${vol.Availability}).`);
  }
  const clash = await query(
    `SELECT 1 FROM Shift WHERE VolunteerID = ? AND IsArchived = FALSE AND Status = 'Scheduled' AND StartDateTime < ? AND EndDateTime > ?`,
    [vol.UserID, end, start]);
  if (clash.length) throw new AppError(409, `${vol.Name} already has a shift that overlaps this time.`);

  const r = await query(
    'INSERT INTO Shift (VolunteerID, AssignedBy, StartDateTime, EndDateTime, TaskDescription) VALUES (?,?,?,?,?)',
    [vol.UserID, coordinatorId, start, end, task]);
  return (await listShifts({ includeCancelled: true })).find((s) => s.ShiftID === r.insertId);
}

async function cancelShift(id) {
  const r = await query("UPDATE Shift SET Status = 'Cancelled' WHERE ShiftID = ? AND Status = 'Scheduled'", [id]);
  if (!r.affectedRows) throw new AppError(404, 'Scheduled shift not found.');
}

async function completeShift(id) {
  const r = await query("UPDATE Shift SET Status = 'Completed' WHERE ShiftID = ? AND Status = 'Scheduled'", [id]);
  if (!r.affectedRows) throw new AppError(404, 'Scheduled shift not found.');
}

module.exports = { listShifts, assignShift, cancelShift, completeShift };
