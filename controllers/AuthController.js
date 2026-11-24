const UserService = require('../services/UserService');

// Build the minimal user payload stored in the Express session.
const sessionUser = (u) => ({ id: u.UserID, name: u.Name, role: u.Role });

// ---------- Public Authentication Operations ----------
/**
 * Register a new Donor or Recipient account.
 * 
 * Recipients remain pending Coordinator approval before requesting hampers.
 */
exports.register = async (req, res) => {
  const user = await UserService.register(req.body);
  res.status(201).json({ message: user.Role === 'Recipient'
    ? 'Registered. A Coordinator must approve your account before you can request a hamper.'
    : 'Registered. You can log in now.', user });
};

/**
 * Authenticate a user with email and password, regenerate the session
 * to prevent session fixation, and store the session user payload.
 */
exports.login = async (req, res) => {
  const user = await UserService.login(req.body.Email, req.body.Password);
  await new Promise((ok, fail) => req.session.regenerate((e) => (e ? fail(e) : ok())));
  req.session.user = sessionUser(user);
  res.json({ user });
};

/**
 * Destroy the active session and log out the current user.
 * 
 */
exports.logout = (req, res) => req.session.destroy(() => res.json({ message: 'Logged out.' }));

// ----------- Current User Profile Operations ------------
/**
 * Return the currently logged-in user's full account details,
 * or null if no session exists or the account is no longer valid.
 */
exports.me = async (req, res) => {
  if (!req.session.user) return res.json({ user: null });
  const user = await UserService.getById(req.session.user.id);
  if (!user) return req.session.destroy(() => res.json({ user: null }));
  res.json({ user });
};

/**
 * Update the logged-in user's account profile (and optional profile image)
 * and refresh the stored session user data.
 */
exports.updateMe = async (req, res) => {
  const user = await UserService.modifyAccount(req.session.user.id, req.body, req.file);
  req.session.user = sessionUser(user);
  res.json({ message: 'Account updated.', user });
};
