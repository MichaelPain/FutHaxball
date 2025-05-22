/**
 * Token manager utility for handling JWT authentication
 */
import securityLogger from './securityLogger';

class TokenManager {
  constructor() {
    this.tokenKey = 'authToken';
    this.refreshTokenKey = 'refreshToken';
    this.tokenExpiryKey = 'tokenExpiry';
  }

  /**
   * Stores authentication tokens
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token
   * @param {number} expiresIn - Token expiry time in seconds
   */
  storeTokens(token, refreshToken, expiresIn) {
    try {
      const expiryTime = Date.now() + (expiresIn * 1000);
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.refreshTokenKey, refreshToken);
      localStorage.setItem(this.tokenExpiryKey, expiryTime.toString());
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to store tokens', 'ERROR', { error });
    }
  }

  /**
   * Gets the current JWT token
   * @returns {string|null} JWT token or null if not found/expired
   */
  getToken() {
    try {
      const token = localStorage.getItem(this.tokenKey);
      const expiryTime = parseInt(localStorage.getItem(this.tokenExpiryKey));
      
      if (!token || !expiryTime) return null;
      
      if (Date.now() >= expiryTime) {
        this.clearTokens();
        return null;
      }
      
      return token;
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to get token', 'ERROR', { error });
      return null;
    }
  }

  /**
   * Gets the refresh token
   * @returns {string|null} Refresh token or null if not found
   */
  getRefreshToken() {
    try {
      return localStorage.getItem(this.refreshTokenKey);
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to get refresh token', 'ERROR', { error });
      return null;
    }
  }

  /**
   * Clears all stored tokens
   */
  clearTokens() {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.refreshTokenKey);
      localStorage.removeItem(this.tokenExpiryKey);
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to clear tokens', 'ERROR', { error });
    }
  }

  /**
   * Checks if token is expired
   * @returns {boolean} Whether token is expired
   */
  isTokenExpired() {
    try {
      const expiryTime = parseInt(localStorage.getItem(this.tokenExpiryKey));
      return !expiryTime || Date.now() >= expiryTime;
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to check token expiry', 'ERROR', { error });
      return true;
    }
  }

  /**
   * Decodes a JWT token
   * @param {string} token - JWT token to decode
   * @returns {Object|null} Decoded token payload or null if invalid
   */
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      return JSON.parse(jsonPayload);
    } catch (error) {
      securityLogger.log('TOKEN_ERROR', 'Failed to decode token', 'ERROR', { error });
      return null;
    }
  }

  /**
   * Gets token claims
   * @returns {Object|null} Token claims or null if no valid token
   */
  getTokenClaims() {
    const token = this.getToken();
    return token ? this.decodeToken(token) : null;
  }

  /**
   * Checks if token has required claims
   * @param {Array} requiredClaims - Array of required claim names
   * @returns {boolean} Whether token has all required claims
   */
  hasRequiredClaims(requiredClaims) {
    const claims = this.getTokenClaims();
    if (!claims) return false;

    return requiredClaims.every(claim => claims.hasOwnProperty(claim));
  }

  /**
   * Gets a specific claim from the token
   * @param {string} claim - Claim name to get
   * @returns {*} Claim value or null if not found
   */
  getClaim(claim) {
    const claims = this.getTokenClaims();
    return claims ? claims[claim] : null;
  }
}

const tokenManager = new TokenManager();
export default tokenManager; 