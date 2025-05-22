/**
 * HTTP client
 */
import securityLogger from './securityLogger';
import eventManager from './eventManager';
import cacheManager from './cacheManager';
import notificationManager from './notificationManager';
import errorHandler from './errorHandler';

class HttpClient {
  constructor() {
    this.baseUrl = '';
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    this.timeout = 30000;
    this.retries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Makes an HTTP request
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  async request(method, path, options = {}) {
    try {
      const url = this.buildUrl(path);
      const headers = this.buildHeaders(options.headers);
      const cacheKey = this.buildCacheKey(method, path, options);

      if (method === 'GET' && options.cache !== false) {
        const cached = cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const response = await this.fetchWithTimeout(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: options.credentials || 'include',
        mode: options.mode || 'cors',
        cache: options.cache || 'no-cache',
        redirect: options.redirect || 'follow',
        referrer: options.referrer || 'client',
        integrity: options.integrity,
        signal: options.signal
      });

      if (!response.ok) {
        throw await this.handleError(response);
      }

      const data = await response.json();

      if (method === 'GET' && options.cache !== false) {
        cacheManager.set(cacheKey, data, {
          ttl: options.cacheTTL || 3600000,
          persistent: options.cachePersistent || false
        });
      }

      this.logAction('REQUEST', { method, path, options });
      eventManager.emit('http:request', { method, path, options, response: data });

      return data;
    } catch (error) {
      this.logError('REQUEST', error);
      throw error;
    }
  }

  /**
   * Makes a GET request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  get(path, options = {}) {
    return this.request('GET', path, options);
  }

  /**
   * Makes a POST request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  post(path, options = {}) {
    return this.request('POST', path, options);
  }

  /**
   * Makes a PUT request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  put(path, options = {}) {
    return this.request('PUT', path, options);
  }

  /**
   * Makes a DELETE request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  delete(path, options = {}) {
    return this.request('DELETE', path, options);
  }

  /**
   * Builds a request URL
   * @param {string} path - Request path
   * @returns {string} Full URL
   */
  buildUrl(path) {
    const url = new URL(path, this.baseUrl);
    return url.toString();
  }

  /**
   * Builds request headers
   * @param {Object} headers - Custom headers
   * @returns {Object} Merged headers
   */
  buildHeaders(headers = {}) {
    return {
      ...this.headers,
      ...headers
    };
  }

  /**
   * Builds a cache key
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {string} Cache key
   */
  buildCacheKey(method, path, options) {
    const key = `${method}:${path}`;
    if (options.body) {
      return `${key}:${JSON.stringify(options.body)}`;
    }
    return key;
  }

  /**
   * Makes a fetch request with timeout
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise} Response promise
   */
  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Handles HTTP errors
   * @param {Response} response - Response object
   * @returns {Error} Error object
   */
  async handleError(response) {
    try {
      const data = await response.json();
      const error = errorHandler.createHttpError(response.status, data);
      notificationManager.add({
        type: 'error',
        message: error.message,
        duration: 5000
      });
      return error;
    } catch (error) {
      return errorHandler.createHttpError(response.status);
    }
  }

  /**
   * Logs an action
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'HTTP',
      `HTTP ${action.toLowerCase()}`,
      'INFO',
      {
        action,
        ...data
      }
    );
  }

  /**
   * Logs an error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'HTTP_ERROR',
      `Error during ${action.toLowerCase()}: ${error.message}`,
      'ERROR',
      {
        action,
        error
      }
    );
  }
}

const httpClient = new HttpClient();
export default httpClient; 