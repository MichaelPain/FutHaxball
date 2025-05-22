/**
 * State manager utility for handling application state
 */
import securityLogger from './securityLogger';

class StateManager {
  constructor() {
    this.state = {
      user: null,
      auth: {
        isAuthenticated: false,
        isLoading: false,
        error: null
      },
      game: {
        currentMatch: null,
        isPlaying: false,
        score: {
          home: 0,
          away: 0
        }
      },
      tournament: {
        current: null,
        matches: [],
        standings: []
      },
      ui: {
        theme: 'light',
        language: 'it',
        notifications: [],
        modals: []
      },
      settings: {
        sound: true,
        music: true,
        notifications: true,
        graphics: 'medium'
      }
    };

    this.subscribers = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  /**
   * Gets the current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Gets a specific state slice
   * @param {string} path - State path (e.g., 'user.profile')
   * @returns {*} State slice
   */
  getStateSlice(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Sets the state
   * @param {Object} newState - New state
   * @param {string} action - Action that caused the state change
   */
  setState(newState, action) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.addToHistory(oldState, action);
    this.notifySubscribers(action);
    this.logStateChange(action, oldState, newState);
  }

  /**
   * Updates a specific state slice
   * @param {string} path - State path
   * @param {*} value - New value
   * @param {string} action - Action that caused the state change
   */
  updateStateSlice(path, value, action) {
    const oldState = { ...this.state };
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key] = { ...obj[key] }, this.state);
    target[lastKey] = value;
    this.addToHistory(oldState, action);
    this.notifySubscribers(action);
    this.logStateChange(action, oldState, this.state);
  }

  /**
   * Subscribes to state changes
   * @param {Function} callback - Callback function
   * @param {string} path - State path to subscribe to
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback, path = null) {
    const id = this.generateId();
    this.subscribers.set(id, { callback, path });
    return () => this.subscribers.delete(id);
  }

  /**
   * Notifies subscribers of state changes
   * @param {string} action - Action that caused the state change
   */
  notifySubscribers(action) {
    this.subscribers.forEach(({ callback, path }, id) => {
      try {
        if (path) {
          const oldValue = this.getStateSlice(path);
          const newValue = this.getStateSlice(path);
          if (oldValue !== newValue) {
            callback(newValue, action);
          }
        } else {
          callback(this.getState(), action);
        }
      } catch (error) {
        securityLogger.log('STATE_ERROR', `Subscriber error: ${error.message}`, 'ERROR', {
          subscriberId: id,
          action,
          error
        });
      }
    });
  }

  /**
   * Adds a state change to history
   * @param {Object} oldState - Previous state
   * @param {string} action - Action that caused the state change
   */
  addToHistory(oldState, action) {
    this.history.push({
      timestamp: Date.now(),
      action,
      oldState,
      newState: { ...this.state }
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Gets state history
   * @returns {Array} State history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Logs a state change
   * @param {string} action - Action that caused the state change
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   */
  logStateChange(action, oldState, newState) {
    securityLogger.log(
      'STATE_CHANGE',
      `State changed: ${action}`,
      'INFO',
      {
        action,
        oldState,
        newState
      }
    );
  }

  /**
   * Generates a unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Resets the state to initial values
   */
  reset() {
    const oldState = { ...this.state };
    this.state = {
      user: null,
      auth: {
        isAuthenticated: false,
        isLoading: false,
        error: null
      },
      game: {
        currentMatch: null,
        isPlaying: false,
        score: {
          home: 0,
          away: 0
        }
      },
      tournament: {
        current: null,
        matches: [],
        standings: []
      },
      ui: {
        theme: 'light',
        language: 'it',
        notifications: [],
        modals: []
      },
      settings: {
        sound: true,
        music: true,
        notifications: true,
        graphics: 'medium'
      }
    };
    this.addToHistory(oldState, 'RESET');
    this.notifySubscribers('RESET');
    this.logStateChange('RESET', oldState, this.state);
  }

  /**
   * Persists state to storage
   */
  persist() {
    try {
      localStorage.setItem('appState', JSON.stringify(this.state));
    } catch (error) {
      securityLogger.log('STATE_ERROR', 'Failed to persist state', 'ERROR', { error });
    }
  }

  /**
   * Loads state from storage
   */
  load() {
    try {
      const savedState = localStorage.getItem('appState');
      if (savedState) {
        const oldState = { ...this.state };
        this.state = JSON.parse(savedState);
        this.addToHistory(oldState, 'LOAD');
        this.notifySubscribers('LOAD');
        this.logStateChange('LOAD', oldState, this.state);
      }
    } catch (error) {
      securityLogger.log('STATE_ERROR', 'Failed to load state', 'ERROR', { error });
    }
  }
}

const stateManager = new StateManager();
export default stateManager; 