const HamperService = require('../services/HamperService');

const isCoordinator = (req) => req.session.user.role === 'Coordinator';

// Recipient
exports.request = async (req, res) =>
  res.status(201).json({ message: 'Hamper requested and pickup scheduled.', ...(await HamperService.requestHamper(req.session.user.id, req.body)) });
exports.mine = async (req, res) => res.json(await HamperService.listMyHampers(req.session.user.id));
exports.myDistributions = async (req, res) =>
  res.json(await HamperService.searchDistributions({ recipientId: req.session.user.id, from: req.query.from, to: req.query.to }));

// Volunteer + Coordinator (read)
exports.pickups = async (req, res) => {
  const q = req.query;
  res.json(await HamperService.listPickups({
    volunteerId: isCoordinator(req) ? 0 : req.session.user.id,
    openOnly: q.open === '1', status: q.status, from: q.from, to: q.to, recipient: q.recipient,
  }));
};
exports.hamper = async (req, res) => res.json(await HamperService.getHamper(req.params.id));
exports.searchDistributions = async (req, res) =>
  res.json(await HamperService.searchDistributions({ recipient: req.query.recipient, from: req.query.from, to: req.query.to }));

// Volunteer (write)
exports.addItems = async (req, res) => {
  await HamperService.processDistribution(req.session.user.id, req.params.id, req.body.items);
  res.status(201).json({ message: 'Items added to the hamper and stock reduced.' });
};
exports.modifyRecord = async (req, res) =>
  res.json({ message: 'Quantity updated.', ...(await HamperService.modifyDistribution(req.session.user.id, req.params.id, req.body.Quantity)) });
exports.deleteRecord = async (req, res) => {
  await HamperService.deleteDistribution(req.session.user.id, req.params.id);
  res.json({ message: 'Item removed from the hamper and returned to inventory.' });
};
exports.markStatus = async (req, res) =>
  res.json({ message: `Pickup marked ${req.body.Status}.`, ...(await HamperService.markPickupStatus(req.session.user.id, req.params.id, req.body.Status)) });
