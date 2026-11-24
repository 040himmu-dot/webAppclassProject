const ShiftService = require('../services/ShiftService');

// ---------- Shift Scheduling & Status Operations ---------
/**
 * Lift shifts within an optional date range. Volunteers only see their own
 * assigned shifts, while other roles can filter by volunteerId.
 */
exports.list = async (req, res) => {
  const mine = req.session.user.role === 'Volunteer';
  res.json(await ShiftService.listShifts({ volunteerId: mine ? req.session.user.id : req.query.volunteerId, from: req.query.from, to: req.query.to }));
};

// Assign a volunteer to a new shift on behalf of the logged-in user.
exports.assign = async (req, res) =>
  res.status(201).json({ message: 'Volunteer assigned to the shift.', shift: await ShiftService.assignShift(req.session.user.id, req.body) });

// Cancel an existing shift by ID.
exports.cancel = async (req, res) => { await ShiftService.cancelShift(req.params.id); res.json({ message: 'Shift cancelled.' }); };

// Mark an existing shift as completed by ID.
exports.complete = async (req, res) => { await ShiftService.completeShift(req.params.id); res.json({ message: 'Shift marked completed.' }); };
