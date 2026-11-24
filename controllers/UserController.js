const UserService = require('../services/UserService');

// -------- User Management & Approval Operations ----------

//List user accounts matching optional query filters.
exports.list = async (req, res) => res.json(await UserService.listUsers(req.query));

// Create a new Volunteer account, including optional profile image upload.
exports.createVolunteer = async (req, res) =>
  res.status(201).json({ message: 'Volunteer account created.', user: await UserService.createVolunteer(req.body, req.file) });

// Updates an existing Volunteer profile and optionally replaces their uploaded profile image.
exports.updateVolunteer = async (req, res) =>
  res.json({ message: 'Volunteer updated.', user: await UserService.updateVolunteer(req.params.id, req.body, req.file) });

// Updates a Recipient's approval status (e.g., approved/rejected) and returns the updated record.
exports.setApproval = async (req, res) =>
  res.json({ message: `Recipient ${req.body.Status.toLowerCase()}.`, user: await UserService.setApproval(req.params.id, req.body.Status) });

// Soft-deletes/archives a user account attributed to the acting session user rather than hard-deleting,
// preserving historical records for a mandatory 3-year retention period.
exports.remove = async (req, res) => {
  await UserService.archiveUser(req.params.id, req.session.user.id);
  res.json({ message: 'Account deleted. Its records are kept for the 3-year retention period.' });
};
// Returns all users with the Volunteer role.
exports.volunteers = async (req, res) => res.json(await UserService.listUsers({ role: 'Volunteer' }));
// Returns a lightweight list of Donors containing only ID and Name for dropdowns or references.
exports.donors = async (req, res) =>
  res.json((await UserService.listUsers({ role: 'Donor' })).map((d) => ({ UserID: d.UserID, Name: d.Name })));
