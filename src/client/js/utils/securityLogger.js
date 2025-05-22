/**
 * Security logger utility for tracking authentication and security events
 */
class SecurityLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.severityLevels = {
      INFO: 'INFO',
      WARNING: 'WARNING',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL'
    };
  }

  /**
   * Logs a security event
   * @param {string} event - Event type
   * @param {string} message - Event message
   * @param {string} severity - Event severity
   * @param {Object} metadata - Additional event data
   */
  log(event, message, severity = this.severityLevels.INFO, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      message,
      severity,
      metadata,
      sessionId: this.getSessionId()
    };

    this.logs.push(logEntry);
    this.trimLogs();
    this.persistLog(logEntry);
  }

  /**
   * Logs an authentication attempt
   * @param {string} username - Username attempted
   * @param {boolean} success - Whether attempt was successful
   * @param {string} reason - Reason for failure if unsuccessful
   */
  logAuthAttempt(username, success, reason = null) {
    this.log(
      'AUTH_ATTEMPT',
      `Authentication attempt for user ${username}: ${success ? 'SUCCESS' : 'FAILURE'}`,
      success ? this.severityLevels.INFO : this.severityLevels.WARNING,
      {
        username,
        success,
        reason,
        ip: this.getClientIP()
      }
    );
  }

  /**
   * Logs a rate limit event
   * @param {string} key - Rate limit key
   * @param {boolean} blocked - Whether request was blocked
   * @param {number} remainingAttempts - Remaining attempts
   */
  logRateLimit(key, blocked, remainingAttempts) {
    this.log(
      'RATE_LIMIT',
      `Rate limit event for ${key}: ${blocked ? 'BLOCKED' : 'ALLOWED'}`,
      blocked ? this.severityLevels.WARNING : this.severityLevels.INFO,
      {
        key,
        blocked,
        remainingAttempts,
        ip: this.getClientIP()
      }
    );
  }

  /**
   * Logs a password change
   * @param {string} username - Username
   * @param {boolean} success - Whether change was successful
   */
  logPasswordChange(username, success) {
    this.log(
      'PASSWORD_CHANGE',
      `Password change for user ${username}: ${success ? 'SUCCESS' : 'FAILURE'}`,
      this.severityLevels.INFO,
      {
        username,
        success,
        ip: this.getClientIP()
      }
    );
  }

  /**
   * Logs a session event
   * @param {string} username - Username
   * @param {string} action - Session action (create/destroy)
   */
  logSessionEvent(username, action) {
    this.log(
      'SESSION_EVENT',
      `Session ${action} for user ${username}`,
      this.severityLevels.INFO,
      {
        username,
        action,
        ip: this.getClientIP()
      }
    );
  }

  /**
   * Gets logs for a specific event type
   * @param {string} event - Event type to filter by
   * @returns {Array} Filtered logs
   */
  getLogsByEvent(event) {
    return this.logs.filter(log => log.event === event);
  }

  /**
   * Gets logs for a specific severity
   * @param {string} severity - Severity level to filter by
   * @returns {Array} Filtered logs
   */
  getLogsBySeverity(severity) {
    return this.logs.filter(log => log.severity === severity);
  }

  /**
   * Gets logs for a specific time range
   * @param {Date} start - Start time
   * @param {Date} end - End time
   * @returns {Array} Filtered logs
   */
  getLogsByTimeRange(start, end) {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= start && logTime <= end;
    });
  }

  /**
   * Trims logs to maximum size
   */
  trimLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Persists a log entry
   * @param {Object} logEntry - Log entry to persist
   */
  persistLog(logEntry) {
    // In a real implementation, this would send the log to a backend service
    console.log('Security Log:', logEntry);
  }

  /**
   * Gets the current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }

  /**
   * Gets the client IP address
   * @returns {string} Client IP
   */
  getClientIP() {
    // In a real implementation, this would get the actual IP
    return '127.0.0.1';
  }
}

const securityLogger = new SecurityLogger();
export default securityLogger; 