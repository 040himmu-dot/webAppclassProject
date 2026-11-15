const UserService = require('../services/UserService');

exports.list = async (req, res) => res.json(await UserService.listUsers(req.query));
exports.createVolunteer = async (req, res) =>
  res.status(201).json({ message: 'Volunteer account created.', user: await UserService.createVolunteer(req.body, req.file) });
exports.updateVolunteer = async (req, res) =>
  res.json({ message: 'Volunteer updated.', user: await UserService.updateVolunteer(req.params.id, req.body, req.file) });
exports.setApproval = async (req, res) =>
  res.json({ message: `Recipient ${req.body.Status.toLowerCase()}.`, user: await UserService.setApproval(req.params.id, req.body.Status) });
exports.remove = async (req, res) => {
  await UserService.archiveUser(req.params.id, req.session.user.id);
  res.json({ message: 'Account deleted. Its records are kept for the 3-year retention period.' });
};
exports.volunteers = async (req, res) => res.json(await UserService.listUsers({ role: 'Volunteer' }));
exports.donors = async (req, res) =>
  res.json((await UserService.listUsers({ role: 'Donor' })).map((d) => ({ UserID: d.UserID, Name: d.Name })));
