const config = require('../config');
const AuditLogService = require('../services/AuditLogService');
const {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ConflictError
} = require('../utils/customErrors');

// Custom Error Classes (These will be removed as they are now imported)
// class AppError extends Error { ... } // REMOVE
// class ValidationError extends AppError { ... } // REMOVE
// class AuthenticationError extends AppError { ... } // REMOVE
// class AuthorizationError extends AppError { ... } // REMOVE
// class NotFoundError extends AppError { ... } // REMOVE
// class RateLimitError extends AppError { ... } // REMOVE

/**
 * Wraps async route handlers to catch errors and pass them to next().
 * @param {Function} fn - The async route handler function.
 * @returns {Function} A new function that handles errors.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Centralized error handling middleware for Express.
 * Differentiates between operational errors and programming errors.
 * Sends user-friendly responses for operational errors.
 * Logs all errors and sends generic responses for programming errors in production.
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let errorResponse = {
    success: false,
    status: err.status,
    message: err.message,
  };

  // Log the error regardless of environment or type
  console.error('ERROR 💥:', err);
  // Detailed logging for audit trail, excluding some overly verbose errors if necessary
  if (!(err instanceof RateLimitError)) { // Example: Don't flood logs with rate limit errors
      AuditLogService.logError(req.user?.id || 'unknown_user', err, req).catch(console.error);
  }

  if (config.NODE_ENV === 'development') {
    errorResponse.error = err;
    errorResponse.stack = err.stack;
    if (err instanceof ValidationError) {
        errorResponse.errors = err.validationErrors; // Include specific validation errors in dev
    }
  } else {
    // For production, only send operational error messages to the client.
    // Programming errors or unknown errors should return a generic message.
    if (!err.isOperational) {
      errorResponse.message = 'Something went very wrong!';
      // For critical non-operational errors, consider more robust alerting here
    }
    // If it IS operational, err.message is already set correctly.
    // For ValidationError in production, don't send the detailed err.errors array
    // unless specific fields are non-sensitive and user-facing.
    // The generic err.message (e.g., "Validation Error") is usually sufficient.
  }
  
  // Special handling for ValidationError to include the errors array in the response
  // if it exists, even in production if deemed safe and useful.
  // For now, let's only send detailed validation errors in development.
  if (err instanceof ValidationError && config.NODE_ENV === 'development') {
    // Already handled above for development
  } else if (err instanceof ValidationError && config.NODE_ENV !== 'development') {
    // In production, ensure the main message is user-friendly, 
    // but avoid sending the detailed `errors` array unless explicitly desired.
    // errorResponse.message is already set from err.message.
  }

  res.status(err.statusCode).json(errorResponse);
};

/**
 * Handles errors for Socket.IO events.
 * @param {Error} err - The error object.
 * @param {Object} socket - The socket instance.
 * @param {Function} ack - The acknowledgement callback for the socket event.
 */
const socketErrorHandler = (err, socket, ack) => {
  console.error('Socket Error:', err);
  const errorResponse = {
    success: false,
    message: err.message || 'An unexpected error occurred in a socket event.',
    // Optionally include statusCode or error type if client needs to act on it
  };

  // Log the socket error using AuditLogService
  const userId = socket.user?.id || socket.handshake?.auth?.userId || 'unknown_socket_user';
  AuditLogService.logSocketError(userId, err, socket.id, socket.handshake?.address).catch(console.error);

  if (typeof ack === 'function') {
    ack(errorResponse);
  } else {
    socket.emit('error', errorResponse);
  }
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
  errorHandler,
  catchAsync,
  socketErrorHandler
}; 