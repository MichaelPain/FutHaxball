/**
 * Event management system
 */
import securityLogger from './securityLogger';

class EventManager {
  constructor() {
    this.events = new Map();
    this.maxListeners = 10;
    this.loggingEnabled = true;
  }

  /**
   * Registers an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function
   */
  on(event, listener, options = {}) {
    try {
      if (!this.events.has(event)) {
        this.events.set(event, new Set());
      }

      const listeners = this.events.get(event);
      if (listeners.size >= this.maxListeners) {
        this.logWarning('max_listeners', { event, count: listeners.size });
      }

      const wrappedListener = this.wrapListener(listener, options);
      listeners.add(wrappedListener);

      this.logEvent('subscribe', { event, listener: listener.name || 'anonymous' });

      return () => this.off(event, wrappedListener);
    } catch (error) {
      this.logError('subscribe', error);
      throw error;
    }
  }

  /**
   * Registers a one-time event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   * @param {Object} options - Listener options
   * @returns {Function} Unsubscribe function
   */
  once(event, listener, options = {}) {
    const onceListener = (...args) => {
      this.off(event, onceListener);
      return listener(...args);
    };

    return this.on(event, onceListener, options);
  }

  /**
   * Removes an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  off(event, listener) {
    try {
      if (!this.events.has(event)) {
        return;
      }

      const listeners = this.events.get(event);
      listeners.delete(listener);

      if (listeners.size === 0) {
        this.events.delete(event);
      }

      this.logEvent('unsubscribe', { event, listener: listener.name || 'anonymous' });
    } catch (error) {
      this.logError('unsubscribe', error);
      throw error;
    }
  }

  /**
   * Emits an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {Promise<void>}
   */
  async emit(event, data) {
    try {
      if (!this.events.has(event)) {
        return;
      }

      const listeners = this.events.get(event);
      const promises = [];

      for (const listener of listeners) {
        try {
          const result = listener(data);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          this.logError('emit', error, { event, listener: listener.name || 'anonymous' });
        }
      }

      await Promise.all(promises);
      this.logEvent('emit', { event, data });
    } catch (error) {
      this.logError('emit', error);
      throw error;
    }
  }

  /**
   * Removes all listeners for an event
   * @param {string} event - Event name
   */
  removeAllListeners(event) {
    try {
      if (!this.events.has(event)) {
        return;
      }

      this.events.delete(event);
      this.logEvent('remove_all', { event });
    } catch (error) {
      this.logError('remove_all', error);
      throw error;
    }
  }

  /**
   * Gets the number of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).size : 0;
  }

  /**
   * Gets all registered event names
   * @returns {string[]} Event names
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Sets the maximum number of listeners per event
   * @param {number} count - Maximum number of listeners
   */
  setMaxListeners(count) {
    if (count < 0) {
      throw new Error('Max listeners count must be non-negative');
    }
    this.maxListeners = count;
  }

  /**
   * Enables or disables event logging
   * @param {boolean} enabled - Whether logging should be enabled
   */
  setLoggingEnabled(enabled) {
    this.loggingEnabled = enabled;
  }

  /**
   * Wraps a listener function with error handling and logging
   * @param {Function} listener - Original listener function
   * @param {Object} options - Listener options
   * @returns {Function} Wrapped listener function
   */
  wrapListener(listener, options = {}) {
    const wrapped = async (data) => {
      try {
        const startTime = performance.now();
        const result = await listener(data);
        const duration = performance.now() - startTime;

        if (duration > 1000) { // Log slow listeners (>1s)
          this.logWarning('slow_listener', {
            event: options.event,
            listener: listener.name || 'anonymous',
            duration
          });
        }

        return result;
      } catch (error) {
        this.logError('listener', error, {
          event: options.event,
          listener: listener.name || 'anonymous'
        });
        throw error;
      }
    };

    wrapped.original = listener;
    return wrapped;
  }

  /**
   * Logs an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  logEvent(type, data) {
    if (!this.loggingEnabled) {
      return;
    }

    securityLogger.log(
      'EVENT',
      `Event ${type}`,
      'INFO',
      data
    );
  }

  /**
   * Logs a warning
   * @param {string} type - Warning type
   * @param {Object} data - Warning data
   */
  logWarning(type, data) {
    if (!this.loggingEnabled) {
      return;
    }

    securityLogger.log(
      'EVENT',
      `Event warning: ${type}`,
      'WARN',
      data
    );
  }

  /**
   * Logs an error
   * @param {string} type - Error type
   * @param {Error} error - Error object
   * @param {Object} data - Additional error data
   */
  logError(type, error, data = {}) {
    if (!this.loggingEnabled) {
      return;
    }

    securityLogger.log(
      'EVENT',
      `Event error: ${type}`,
      'ERROR',
      {
        ...data,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const eventManager = new EventManager();
export default eventManager; 