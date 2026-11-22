class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
/** Wraps async route handlers so thrown errors reach the error middleware. */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { AppError, wrap };
