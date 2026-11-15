// Owner: Manjot - Distribution Miss/Delay monitor (SDD 3.3). Runs every 5 minutes (scheduled from AnalyzerEngine.start).
const { query } = require('../config/db');
const EmailService = require('./EmailService');
const HamperService = require('./HamperService');

/** checkPickups(): Delayed after 30 min, Missed after 2 h. Alerts only when the status actually changes. */
async function checkPickups() {
  const rows = await query(
    `SELECT AppointmentID, Status, TIMESTAMPDIFF(MINUTE, ScheduledDateTime, NOW()) AS LateMin
     FROM PickupAppointment WHERE Status IN ('Scheduled','Delayed') AND IsArchived = FALSE`);
  let changes = 0;
  for (const r of rows) {
    let next = null;
    let from = null;
    if (r.LateMin > 120) { next = 'Missed'; from = ['Scheduled', 'Delayed']; }
    else if (r.LateMin > 30 && r.Status === 'Scheduled') { next = 'Delayed'; from = ['Scheduled']; }
    if (next && (await HamperService.autoSetPickupStatus(r.AppointmentID, next, from))) {
      changes++;
      await EmailService.sendPickupAlert(r.AppointmentID, next).catch((e) => console.error('Alert failed:', e.message));
    }
  }
  if (changes) console.log(`[Analyzer] pickup monitor changed ${changes} appointment(s)`);
  return { checked: rows.length, changed: changes };
}

module.exports = { checkPickups };
