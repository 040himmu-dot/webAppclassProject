// Role-Based Access Control: every request is re-checked on the server (SDD 3.1).
const { query } = require('./db');
const { AppError } = require('./errors');

async function requireLogin(req, res, next) {
  try {
    if (!req.session.user) throw new AppError(401, 'Please log in first.');
    const rows = await query('SELECT UserID FROM UserAccount WHERE UserID = ? AND IsArchived = FALSE', [req.session.user.id]);
    if (!rows.length) {
      req.session.destroy(() => {});
      throw new AppError(401, 'This account is no longer active.');
    }
    next();
  } catch (e) { next(e); }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.session.user || !roles.includes(req.session.user.role)) {
    return next(new AppError(403, 'Your role is not allowed to do this.'));
  }
  next();
};

module.exports = { requireLogin, requireRole };
