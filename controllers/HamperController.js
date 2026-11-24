const HamperService = require('../services/HamperService');

// Check whether the logged-in user is a Coordinator.
const isCoordinator = (req) => req.session.user.role === 'Coordinator';

//------- Recipient operations ---------

// Submit a hamper request and schedule a pickup appointment.
exports.request = async (req, res) =>
  res.status(201).json({ message: 'Hamper requested and pickup scheduled.', ...(await HamperService.requestHamper(req.session.user.id, req.body)) });

// Retrieve all hampers belonging to the logged-in Recipient.
exports.mine = async (req, res) => res.json(await HamperService.listMyHampers(req.session.user.id));

// Retrieve the logged-in Recipient's distribution history.
exports.myDistributions = async (req, res) =>
  res.json(await HamperService.searchDistributions({ recipientId: req.session.user.id, from: req.query.from, to: req.query.to }));

//------- Volunteer and Coordinator operations -----------

// Retrieve scheduled pickups and allow filtering by status, date, and recipient.
exports.pickups = async (req, res) => {
  const q = req.query;
  res.json(await HamperService.listPickups({
    volunteerId: isCoordinator(req) ? 0 : req.session.user.id,
    openOnly: q.open === '1', status: q.status, from: q.from, to: q.to, recipient: q.recipient,
  }));
};

// Retrieve the details of a specific hamper using its ID.
exports.hamper = async (req, res) => res.json(await HamperService.getHamper(req.params.id));

// Search distribution records by recipient name or date range.
exports.searchDistributions = async (req, res) =>
  res.json(await HamperService.searchDistributions({ recipient: req.query.recipient, from: req.query.from, to: req.query.to }));

// --------- Volunteer Operations (write) --------
// Add food items to a hamper
exports.addItems = async (req, res) => {
  await HamperService.processDistribution(req.session.user.id, req.params.id, req.body.items);
  res.status(201).json({ message: 'Items added to the hamper and stock reduced.' });
};

// Update the quantity of an item already added to a hamper.
exports.modifyRecord = async (req, res) =>
  res.json({ message: 'Quantity updated.', ...(await HamperService.modifyDistribution(req.session.user.id, req.params.id, req.body.Quantity)) });

// Remove an item from a hamper.
exports.deleteRecord = async (req, res) => {
  await HamperService.deleteDistribution(req.session.user.id, req.params.id);
  res.json({ message: 'Item removed from the hamper and returned to inventory.' });
};

// Update the pickup status to Fulfilled, Delayed, or Missed.
// The service checks whether the requested status change is allowed.
exports.markStatus = async (req, res) =>
  res.json({ message: `Pickup marked ${req.body.Status}.`, ...(await HamperService.markPickupStatus(req.session.user.id, req.params.id, req.body.Status)) });
