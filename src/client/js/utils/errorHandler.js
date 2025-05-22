/**
 * Error handling system
 */
import securityLogger from './securityLogger';
import notificationManager from './notificationManager';
import eventManager from './eventManager';

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      validation: 'VALIDATION_ERROR',
      network: 'NETWORK_ERROR',
      auth: 'AUTH_ERROR',
      permission: 'PERMISSION_ERROR',
      notFound: 'NOT_FOUND_ERROR',
      server: 'SERVER_ERROR',
      unknown: 'UNKNOWN_ERROR'
    };

    this.defaultHandlers = {
      validation: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      network: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      auth: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      permission: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      notFound: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      server: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      },
      unknown: error => {
        notificationManager.add({
          type: 'error',
          message: error.message,
          details: error.details
        });
      }
    };
  }

  /**
   * Handles an error
   * @param {Error} error - Error to handle
   * @param {string} type - Error type
   * @param {Object} options - Handler options
   */
  handle(error, type = 'unknown', options = {}) {
    try {
      const errorType = this.errorTypes[type] || this.errorTypes.unknown;
      const handler = options.handler || this.defaultHandlers[type];

      if (!handler) {
        throw new Error(`No handler found for error type: ${type}`);
      }

      handler(error);
      this.logError(errorType, error);
      eventManager.emit('error', { type, error });
    } catch (handlerError) {
      this.logError('HANDLER_ERROR', handlerError);
      throw handlerError;
    }
  }

  /**
   * Creates a validation error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Validation error
   */
  createValidationError(message, details = {}) {
    const error = new Error(message);
    error.type = 'validation';
    error.details = details;
    return error;
  }

  /**
   * Creates a network error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Network error
   */
  createNetworkError(message, details = {}) {
    const error = new Error(message);
    error.type = 'network';
    error.details = details;
    return error;
  }

  /**
   * Creates an authentication error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Authentication error
   */
  createAuthError(message, details = {}) {
    const error = new Error(message);
    error.type = 'auth';
    error.details = details;
    return error;
  }

  /**
   * Creates a permission error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Permission error
   */
  createPermissionError(message, details = {}) {
    const error = new Error(message);
    error.type = 'permission';
    error.details = details;
    return error;
  }

  /**
   * Creates a not found error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Not found error
   */
  createNotFoundError(message, details = {}) {
    const error = new Error(message);
    error.type = 'notFound';
    error.details = details;
    return error;
  }

  /**
   * Creates a server error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Server error
   */
  createServerError(message, details = {}) {
    const error = new Error(message);
    error.type = 'server';
    error.details = details;
    return error;
  }

  /**
   * Creates an unknown error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   * @returns {Error} Unknown error
   */
  createUnknownError(message, details = {}) {
    const error = new Error(message);
    error.type = 'unknown';
    error.details = details;
    return error;
  }

  /**
   * Logs an error
   * @param {string} type - Error type
   * @param {Error} error - Error object
   */
  logError(type, error) {
    securityLogger.log(
      type,
      error.message,
      'ERROR',
      {
        type,
        error,
        stack: error.stack
      }
    );
  }
}

const errorHandler = new ErrorHandler();
export default errorHandler; 