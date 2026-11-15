const ShiftService = require('../services/ShiftService');

exports.list = async (req, res) => {
  const mine = req.session.user.role === 'Volunteer';
  res.json(await ShiftService.listShifts({ volunteerId: mine ? req.session.user.id : req.query.volunteerId, from: req.query.from, to: req.query.to }));
};
exports.assign = async (req, res) =>
  res.status(201).json({ message: 'Volunteer assigned to the shift.', shift: await ShiftService.assignShift(req.session.user.id, req.body) });
exports.cancel = async (req, res) => { await ShiftService.cancelShift(req.params.id); res.json({ message: 'Shift cancelled.' }); };
exports.complete = async (req, res) => { await ShiftService.completeShift(req.params.id); res.json({ message: 'Shift marked completed.' }); };
