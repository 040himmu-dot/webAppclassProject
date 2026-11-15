// Email Service: sendEmail() + alert helpers. Every email is written to the Alert Log (SDD 3.3).
// Without SMTP settings in .env the emails are "simulated": printed in the server console and logged.
const nodemailer = require('nodemailer');
const { query } = require('../config/db');

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

/** Returns 'sent', 'simulated' or 'failed'. */
async function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log(`\n[EMAIL simulated] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return 'simulated';
  }
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM || 'alerts@foodbank.ca', to, subject, text });
    return 'sent';
  } catch (err) {
    console.error('[EMAIL failed]', to, err.message);
    return 'failed';
  }
}

const coordinators = () => query("SELECT UserID, Name, Email FROM UserAccount WHERE Role='Coordinator' AND IsArchived=FALSE");

const shiftVolunteers = () => query(
  `SELECT DISTINCT u.UserID, u.Name, u.Email FROM Shift s JOIN UserAccount u ON u.UserID = s.VolunteerID
   WHERE s.Status='Scheduled' AND s.IsArchived=FALSE AND s.EndDateTime >= NOW() AND u.IsArchived=FALSE`);

/** Item alert: to all active Coordinators + Volunteers on upcoming shifts. */
async function sendInventoryAlert(items) {
  if (!items.length) return 0;
  const people = new Map();
  [...(await coordinators()), ...(await shiftVolunteers())].forEach((p) => people.set(p.UserID, p));
  const lines = items.map((i) =>
    `- ${i.ItemName} (${i.Category}): ${i.QuantityOnHand} ${i.Unit}, expires ${i.ExpirationDate}, status ${i.RiskStatus}`);
  const subject = `Food Bank alert: ${items.length} item(s) need priority distribution`;
  for (const p of people.values()) {
    const text = `Hello ${p.Name},\n\nThe following inventory items are at risk of going to waste:\n\n${lines.join('\n')}\n\nPlease prioritize them when preparing hampers.`;
    const delivery = await sendEmail(p.Email, subject, text);
    for (const i of items) {
      await query(
        `INSERT INTO AlertLog (AlertType, ItemID, SentToUserID, SentDateTime, Delivery, Message) VALUES (?,?,?,NOW(),?,?)`,
        [i.RiskStatus, i.ItemID, p.UserID, delivery, `${i.ItemName} - ${i.RiskStatus}`]);
    }
  }
  return people.size;
}

/** Pickup alert (Delayed / Missed): to all active Coordinators. Called only when the status changes. */
async function sendPickupAlert(appointmentId, newStatus) {
  const rows = await query(
    `SELECT a.AppointmentID, a.HamperID, a.ScheduledDateTime, r.Name AS RecipientName
     FROM PickupAppointment a JOIN UserAccount r ON r.UserID = a.RecipientID WHERE a.AppointmentID = ?`, [appointmentId]);
  const a = rows[0];
  if (!a) return 0;
  const people = await coordinators();
  const subject = `Pickup ${newStatus.toLowerCase()}: ${a.RecipientName} (hamper #${a.HamperID})`;
  for (const p of people) {
    const text = `Hello ${p.Name},\n\nRecipient: ${a.RecipientName}\nHamper ID: ${a.HamperID}\nScheduled time: ${a.ScheduledDateTime}\nNew status: ${newStatus}`;
    const delivery = await sendEmail(p.Email, subject, text);
    await query(
      `INSERT INTO AlertLog (AlertType, AppointmentID, SentToUserID, SentDateTime, Delivery, Message) VALUES (?,?,?,NOW(),?,?)`,
      [newStatus, a.AppointmentID, p.UserID, delivery, `${a.RecipientName} - hamper #${a.HamperID} - ${newStatus}`]);
  }
  return people.length;
}

module.exports = { sendEmail, sendInventoryAlert, sendPickupAlert };
