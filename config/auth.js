
// Checks whether users are logged in and have permission to access certain features.
const { query } = require('./db');
const { AppError } = require('./errors');

// Checks if the user is logged in and their account is still active.
async function requireLogin(req, res, next) {
  try {
    // Stop the request if the user is not logged in.
    if (!req.session.user) throw new AppError(401, 'Please log in first.');

    // Check if the user's account still exists and is not archived.
    const rows = await query('SELECT UserID FROM UserAccount WHERE UserID = ? AND IsArchived = FALSE', [req.session.user.id]);

    // Log the user out if their account is no longer active.
    if (!rows.length) {
      req.session.destroy(() => {});
      throw new AppError(401, 'This account is no longer active.');
    }

    // Allow the request to continue if the account is valid.
    next();
  } catch (e) { next(e); }
}

// Checks whether the logged-in user has the required role.
const requireRole = (...roles) => (req, res, next) => {
  // Block users who are not logged in or do not have permission.
  if (!req.session.user || !roles.includes(req.session.user.role)) {
    return next(new AppError(403, 'Your role is not allowed to do this.'));
  }

  // Allow users with the correct role to continue.
  next();
};

// Make both functions available to other files.
module.exports = { requireLogin, requireRole };
