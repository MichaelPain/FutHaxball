/**
 * Validation system
 */
import securityLogger from './securityLogger';
import i18n from './i18n';
import notificationManager from './notificationManager';

class Validator {
  constructor() {
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Sets up default validation rules
   */
  setupDefaultRules() {
    this.addRule('required', {
      validate: value => value !== undefined && value !== null && value !== '',
      message: 'validation.required'
    });

    this.addRule('email', {
      validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'validation.email'
    });

    this.addRule('minLength', {
      validate: (value, min) => value.length >= min,
      message: 'validation.minLength'
    });

    this.addRule('maxLength', {
      validate: (value, max) => value.length <= max,
      message: 'validation.maxLength'
    });

    this.addRule('pattern', {
      validate: (value, pattern) => new RegExp(pattern).test(value),
      message: 'validation.pattern'
    });

    this.addRule('number', {
      validate: value => !isNaN(parseFloat(value)) && isFinite(value),
      message: 'validation.number'
    });

    this.addRule('integer', {
      validate: value => Number.isInteger(Number(value)),
      message: 'validation.integer'
    });

    this.addRule('min', {
      validate: (value, min) => Number(value) >= min,
      message: 'validation.min'
    });

    this.addRule('max', {
      validate: (value, max) => Number(value) <= max,
      message: 'validation.max'
    });

    this.addRule('match', {
      validate: (value, field) => value === field,
      message: 'validation.match'
    });

    this.addRule('url', {
      validate: value => {
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'validation.url'
    });

    this.addRule('date', {
      validate: value => !isNaN(Date.parse(value)),
      message: 'validation.date'
    });

    this.addRule('boolean', {
      validate: value => typeof value === 'boolean',
      message: 'validation.boolean'
    });

    this.addRule('array', {
      validate: value => Array.isArray(value),
      message: 'validation.array'
    });

    this.addRule('object', {
      validate: value => typeof value === 'object' && value !== null,
      message: 'validation.object'
    });
  }

  /**
   * Validates a value against rules
   * @param {*} value - Value to validate
   * @param {Object} rules - Validation rules
   * @returns {Object} Validation result
   */
  validate(value, rules) {
    try {
      const errors = [];

      for (const [rule, params] of Object.entries(rules)) {
        const ruleData = this.rules.get(rule);
        if (!ruleData) {
          throw new Error(`Validation rule ${rule} not found`);
        }

        const isValid = ruleData.validate(value, params);
        if (!isValid) {
          errors.push({
            rule,
            message: this.formatMessage(ruleData.message, params)
          });
        }
      }

      const result = {
        valid: errors.length === 0,
        errors
      };

      this.logAction('VALIDATE', { value, rules, result });
      return result;
    } catch (error) {
      this.logError('VALIDATE', error);
      throw error;
    }
  }

  /**
   * Validates an object against a schema
   * @param {Object} object - Object to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateSchema(object, schema) {
    try {
      const errors = {};

      for (const [field, rules] of Object.entries(schema)) {
        const value = object[field];
        const result = this.validate(value, rules);

        if (!result.valid) {
          errors[field] = result.errors;
        }
      }

      const result = {
        valid: Object.keys(errors).length === 0,
        errors
      };

      this.logAction('VALIDATE_SCHEMA', { object, schema, result });
      return result;
    } catch (error) {
      this.logError('VALIDATE_SCHEMA', error);
      throw error;
    }
  }

  /**
   * Adds a custom validation rule
   * @param {string} name - Rule name
   * @param {Object} rule - Rule object
   */
  addRule(name, rule) {
    try {
      if (this.rules.has(name)) {
        throw new Error(`Validation rule ${name} already exists`);
      }

      this.rules.set(name, rule);
      this.logAction('ADD_RULE', { name, rule });
    } catch (error) {
      this.logError('ADD_RULE', error);
      throw error;
    }
  }

  /**
   * Removes a validation rule
   * @param {string} name - Rule name
   */
  removeRule(name) {
    try {
      if (!this.rules.has(name)) {
        throw new Error(`Validation rule ${name} not found`);
      }

      this.rules.delete(name);
      this.logAction('REMOVE_RULE', { name });
    } catch (error) {
      this.logError('REMOVE_RULE', error);
      throw error;
    }
  }

  /**
   * Shows validation errors as notifications
   * @param {Object} errors - Validation errors
   */
  showErrors(errors) {
    try {
      if (typeof errors === 'object') {
        Object.entries(errors).forEach(([field, fieldErrors]) => {
          fieldErrors.forEach(error => {
            notificationManager.add({
              type: 'error',
              message: error.message,
              duration: 5000
            });
          });
        });
      }
    } catch (error) {
      this.logError('SHOW_ERRORS', error);
    }
  }

  /**
   * Formats a validation message
   * @param {string} message - Message key
   * @param {Object} params - Message parameters
   * @returns {string} Formatted message
   */
  formatMessage(message, params) {
    try {
      return i18n.t(message, params);
    } catch (error) {
      this.logError('FORMAT_MESSAGE', error);
      return message;
    }
  }

  /**
   * Logs an action
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'VALIDATION',
      `Validation ${action.toLowerCase()}`,
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
      'VALIDATION_ERROR',
      `Error during ${action.toLowerCase()}: ${error.message}`,
      'ERROR',
      {
        action,
        error
      }
    );
  }
}

const validator = new Validator();
export default validator; 