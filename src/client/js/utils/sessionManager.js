/**
 * Session manager utility for handling user sessions securely
 */
import securityLogger from './securityLogger';

class SessionManager {
  constructor() {
    this.sessionKey = 'userSession';
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.refreshInterval = 5 * 60 * 1000; // 5 minutes
    this.startRefreshTimer();
  }

  /**
   * Creates a new session
   * @param {Object} userData - User data to store in session
   * @returns {boolean} Whether session was created successfully
   */
  createSession(userData) {
    try {
      const sessionData = {
        user: userData,
        created: Date.now(),
        lastActivity: Date.now(),
        token: this.generateSessionToken()
      };

      sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
      securityLogger.logSessionEvent(userData.username, 'create');
      return true;
    } catch (error) {
      securityLogger.log('SESSION_ERROR', 'Failed to create session', 'ERROR', { error });
      return false;
    }
  }

  /**
   * Gets the current session
   * @returns {Object|null} Session data or null if no session
   */
  getSession() {
    try {
      const sessionData = sessionStorage.getItem(this.sessionKey);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);
      if (this.isSessionExpired(session)) {
        this.destroySession();
        return null;
      }

      this.updateLastActivity(session);
      return session;
    } catch (error) {
      securityLogger.log('SESSION_ERROR', 'Failed to get session', 'ERROR', { error });
      return null;
    }
  }

  /**
   * Updates the last activity timestamp
   * @param {Object} session - Session data
   */
  updateLastActivity(session) {
    session.lastActivity = Date.now();
    sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Destroys the current session
   */
  destroySession() {
    try {
      const session = this.getSession();
      if (session) {
        securityLogger.logSessionEvent(session.user.username, 'destroy');
      }
      sessionStorage.removeItem(this.sessionKey);
    } catch (error) {
      securityLogger.log('SESSION_ERROR', 'Failed to destroy session', 'ERROR', { error });
    }
  }

  /**
   * Checks if a session is expired
   * @param {Object} session - Session data
   * @returns {boolean} Whether session is expired
   */
  isSessionExpired(session) {
    const now = Date.now();
    return now - session.lastActivity > this.sessionTimeout;
  }

  /**
   * Generates a secure session token
   * @returns {string} Session token
   */
  generateSessionToken() {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  }

  /**
   * Starts the session refresh timer
   */
  startRefreshTimer() {
    setInterval(() => {
      const session = this.getSession();
      if (session) {
        this.updateLastActivity(session);
      }
    }, this.refreshInterval);
  }

  /**
   * Gets the current user data
   * @returns {Object|null} User data or null if no session
   */
  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  }

  /**
   * Checks if user is authenticated
   * @returns {boolean} Whether user is authenticated
   */
  isAuthenticated() {
    return this.getSession() !== null;
  }

  /**
   * Updates session data
   * @param {Object} updates - Data to update
   * @returns {boolean} Whether update was successful
   */
  updateSession(updates) {
    try {
      const session = this.getSession();
      if (!session) return false;

      Object.assign(session.user, updates);
      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
      return true;
    } catch (error) {
      securityLogger.log('SESSION_ERROR', 'Failed to update session', 'ERROR', { error });
      return false;
    }
  }
}

const sessionManager = new SessionManager();
export default sessionManager; 