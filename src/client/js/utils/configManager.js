/**
 * Configuration management system
 */
import securityLogger from './securityLogger';
import eventManager from './eventManager';
import i18n from './i18n';

class ConfigManager {
  constructor() {
    this.config = {
      ui: {
        language: 'en',
        theme: 'light',
        fontSize: 'medium',
        animations: true,
        sound: true,
        music: true,
        notifications: true,
        chat: {
          enabled: true,
          maxMessages: 100,
          maxLength: 200,
          filter: true,
          emojis: true
        }
      },
      game: {
        quality: 'high',
        fps: 60,
        vsync: true,
        fullscreen: false,
        controls: {
          keyboard: true,
          mouse: true,
          gamepad: false
        },
        physics: {
          ballFriction: 0.99,
          ballAcceleration: 0.1,
          playerFriction: 0.96,
          playerAcceleration: 0.1
        }
      },
      network: {
        maxLatency: 100,
        interpolation: true,
        prediction: true,
        compression: true,
        encryption: true
      },
      security: {
        twoFactor: false,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        passwordExpiry: 90,
        ipWhitelist: []
      },
      privacy: {
        showOnline: true,
        showStatus: true,
        showStats: true,
        allowFriendRequests: true,
        allowTeamInvites: true,
        allowTournamentInvites: true
      }
    };

    this.loadConfig();
  }

  /**
   * Loads configuration from localStorage
   */
  loadConfig() {
    try {
      const savedConfig = localStorage.getItem('haxball_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = this.mergeConfigs(this.config, parsedConfig);
        this.logConfigLoad();
      }
    } catch (error) {
      this.logConfigError('load', error);
    }
  }

  /**
   * Saves configuration to localStorage
   */
  saveConfig() {
    try {
      localStorage.setItem('haxball_config', JSON.stringify(this.config));
      this.logConfigSave();
      eventManager.emit('config:save', this.config);
    } catch (error) {
      this.logConfigError('save', error);
    }
  }

  /**
   * Gets a configuration value
   * @param {string} key - Configuration key (dot notation)
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    try {
      const keys = key.split('.');
      let value = this.config;

      for (const k of keys) {
        if (!value || typeof value !== 'object') {
          return defaultValue;
        }
        value = value[k];
      }

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      this.logConfigError('get', error);
      return defaultValue;
    }
  }

  /**
   * Sets a configuration value
   * @param {string} key - Configuration key (dot notation)
   * @param {*} value - Value to set
   */
  set(key, value) {
    try {
      const keys = key.split('.');
      let current = this.config;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }

      const lastKey = keys[keys.length - 1];
      const oldValue = current[lastKey];
      current[lastKey] = value;

      this.logConfigChange(key, oldValue, value);
      eventManager.emit('config:change', { key, oldValue, newValue: value });
      this.saveConfig();
    } catch (error) {
      this.logConfigError('set', error);
    }
  }

  /**
   * Resets configuration to default values
   */
  reset() {
    try {
      const oldConfig = { ...this.config };
      this.config = {
        ui: {
          language: 'en',
          theme: 'light',
          fontSize: 'medium',
          animations: true,
          sound: true,
          music: true,
          notifications: true,
          chat: {
            enabled: true,
            maxMessages: 100,
            maxLength: 200,
            filter: true,
            emojis: true
          }
        },
        game: {
          quality: 'high',
          fps: 60,
          vsync: true,
          fullscreen: false,
          controls: {
            keyboard: true,
            mouse: true,
            gamepad: false
          },
          physics: {
            ballFriction: 0.99,
            ballAcceleration: 0.1,
            playerFriction: 0.96,
            playerAcceleration: 0.1
          }
        },
        network: {
          maxLatency: 100,
          interpolation: true,
          prediction: true,
          compression: true,
          encryption: true
        },
        security: {
          twoFactor: false,
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          passwordExpiry: 90,
          ipWhitelist: []
        },
        privacy: {
          showOnline: true,
          showStatus: true,
          showStats: true,
          allowFriendRequests: true,
          allowTeamInvites: true,
          allowTournamentInvites: true
        }
      };

      this.logConfigReset(oldConfig);
      eventManager.emit('config:reset', { oldConfig, newConfig: this.config });
      this.saveConfig();
    } catch (error) {
      this.logConfigError('reset', error);
    }
  }

  /**
   * Merges two configurations
   * @param {Object} target - Target configuration
   * @param {Object} source - Source configuration
   * @returns {Object} Merged configuration
   */
  mergeConfigs(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.mergeConfigs(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Logs configuration load
   */
  logConfigLoad() {
    securityLogger.log(
      'CONFIG',
      'Configuration loaded',
      'INFO',
      {
        config: this.config
      }
    );
  }

  /**
   * Logs configuration save
   */
  logConfigSave() {
    securityLogger.log(
      'CONFIG',
      'Configuration saved',
      'INFO',
      {
        config: this.config
      }
    );
  }

  /**
   * Logs configuration change
   * @param {string} key - Changed key
   * @param {*} oldValue - Old value
   * @param {*} newValue - New value
   */
  logConfigChange(key, oldValue, newValue) {
    securityLogger.log(
      'CONFIG',
      `Configuration changed: ${key}`,
      'INFO',
      {
        key,
        oldValue,
        newValue
      }
    );
  }

  /**
   * Logs configuration reset
   * @param {Object} oldConfig - Old configuration
   */
  logConfigReset(oldConfig) {
    securityLogger.log(
      'CONFIG',
      'Configuration reset',
      'INFO',
      {
        oldConfig,
        newConfig: this.config
      }
    );
  }

  /**
   * Logs configuration error
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   */
  logConfigError(operation, error) {
    securityLogger.log(
      'CONFIG',
      `Configuration error during ${operation}: ${error.message}`,
      'ERROR',
      {
        operation,
        error
      }
    );
  }
}

const configManager = new ConfigManager();
export default configManager; 