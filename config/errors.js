
// Custom error class used to send errors with specific HTTP status codes.
class AppError extends Error {
  // Create an error with a status code and message.
  constructor(status, message) { super(message); this.status = status; }
}

// Handles errors from asynchronous route functions.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Allow other files to use these error-handling functions.
module.exports = { AppError, wrap };
