class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Indicates that this is an operational error, not a bug

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) { // errors can be an array of { field, message }
    super(message || 'Validation Error', 400); // Bad Request
    this.errors = errors;
  }

  addError(field, message) {
    this.errors.push({ field, message });
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication Failed') {
    super(message, 401); // Unauthorized
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Authorization Denied') {
    super(message, 403); // Forbidden
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404); // Not Found
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later.') {
    super(message, 429); // Too Many Requests
  }
}

// Adding ConflictError as it was used in tournamentController.js
class ConflictError extends AppError {
  constructor(message = 'Conflict with current state of the resource.') {
    super(message, 409); // Conflict
  }
}


module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError,
}; 