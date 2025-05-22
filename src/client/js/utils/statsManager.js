/**
 * Statistics management system
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import cacheManager from './cacheManager';

class StatsManager {
  constructor() {
    this.metrics = new Map();
    this.aggregations = new Map();
    this.reportingInterval = 60000; // 1 minute
    this.maxDataPoints = 1000;
    this.cacheKey = 'haxball_stats';
    this.isReporting = false;

    // Initialize metrics
    this.initializeMetrics();
    
    // Load persisted stats
    this.loadStats();
    
    // Start reporting
    this.startReporting();
  }

  /**
   * Initializes default metrics
   */
  initializeMetrics() {
    // Performance metrics
    this.addMetric('performance', {
      fps: { type: 'gauge', unit: 'fps' },
      latency: { type: 'gauge', unit: 'ms' },
      memory: { type: 'gauge', unit: 'MB' }
    });

    // Game metrics
    this.addMetric('game', {
      players: { type: 'gauge', unit: 'count' },
      matches: { type: 'counter', unit: 'count' },
      goals: { type: 'counter', unit: 'count' },
      assists: { type: 'counter', unit: 'count' }
    });

    // User metrics
    this.addMetric('user', {
      active: { type: 'gauge', unit: 'count' },
      new: { type: 'counter', unit: 'count' },
      returning: { type: 'counter', unit: 'count' }
    });

    // System metrics
    this.addMetric('system', {
      errors: { type: 'counter', unit: 'count' },
      warnings: { type: 'counter', unit: 'count' },
      apiCalls: { type: 'counter', unit: 'count' }
    });
  }

  /**
   * Adds a new metric category
   * @param {string} category - Metric category
   * @param {Object} metrics - Metric definitions
   */
  addMetric(category, metrics) {
    if (this.metrics.has(category)) {
      throw new Error(`Metric category ${category} already exists`);
    }

    this.metrics.set(category, new Map());
    
    for (const [name, config] of Object.entries(metrics)) {
      this.metrics.get(category).set(name, {
        ...config,
        values: [],
        lastValue: null,
        lastUpdate: null
      });
    }

    this.logAction('add_metric', { category, metrics });
  }

  /**
   * Records a metric value
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Object} [tags] - Additional tags
   */
  record(category, name, value, tags = {}) {
    try {
      const metric = this.getMetric(category, name);
      if (!metric) {
        throw new Error(`Metric ${category}.${name} not found`);
      }

      const timestamp = Date.now();
      const dataPoint = {
        value,
        timestamp,
        tags
      };

      metric.values.push(dataPoint);
      metric.lastValue = value;
      metric.lastUpdate = timestamp;

      // Trim old values if needed
      if (metric.values.length > this.maxDataPoints) {
        metric.values = metric.values.slice(-this.maxDataPoints);
      }

      this.logAction('record', { category, name, value, tags });
      eventManager.emit('stats:record', { category, name, value, tags });
    } catch (error) {
      this.logError('record', error);
      throw error;
    }
  }

  /**
   * Gets a metric value
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @returns {Object} Metric data
   */
  getMetric(category, name) {
    const categoryMetrics = this.metrics.get(category);
    return categoryMetrics ? categoryMetrics.get(name) : null;
  }

  /**
   * Gets all metrics for a category
   * @param {string} category - Metric category
   * @returns {Object} Category metrics
   */
  getCategoryMetrics(category) {
    const categoryMetrics = this.metrics.get(category);
    if (!categoryMetrics) {
      return null;
    }

    const result = {};
    for (const [name, metric] of categoryMetrics.entries()) {
      result[name] = {
        ...metric,
        values: [...metric.values]
      };
    }
    return result;
  }

  /**
   * Gets all metrics
   * @returns {Object} All metrics
   */
  getAllMetrics() {
    const result = {};
    for (const [category, metrics] of this.metrics.entries()) {
      result[category] = this.getCategoryMetrics(category);
    }
    return result;
  }

  /**
   * Calculates aggregations for a metric
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @param {string} period - Time period (1m, 5m, 1h, 1d)
   * @returns {Object} Aggregated values
   */
  calculateAggregation(category, name, period) {
    const metric = this.getMetric(category, name);
    if (!metric) {
      return null;
    }

    const now = Date.now();
    let startTime;

    switch (period) {
      case '1m':
        startTime = now - 60000;
        break;
      case '5m':
        startTime = now - 300000;
        break;
      case '1h':
        startTime = now - 3600000;
        break;
      case '1d':
        startTime = now - 86400000;
        break;
      default:
        throw new Error(`Invalid period: ${period}`);
    }

    const values = metric.values.filter(v => v.timestamp >= startTime);
    
    if (values.length === 0) {
      return null;
    }

    const result = {
      min: Math.min(...values.map(v => v.value)),
      max: Math.max(...values.map(v => v.value)),
      avg: values.reduce((sum, v) => sum + v.value, 0) / values.length,
      count: values.length,
      period
    };

    if (metric.type === 'counter') {
      result.rate = result.count / ((now - startTime) / 1000);
    }

    return result;
  }

  /**
   * Starts the reporting process
   */
  startReporting() {
    if (this.isReporting) {
      return;
    }

    this.isReporting = true;
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, this.reportingInterval);
  }

  /**
   * Stops the reporting process
   */
  stopReporting() {
    if (!this.isReporting) {
      return;
    }

    clearInterval(this.reportInterval);
    this.isReporting = false;
  }

  /**
   * Generates a statistics report
   */
  async generateReport() {
    try {
      const report = {
        timestamp: Date.now(),
        metrics: {}
      };

      for (const [category, metrics] of this.metrics.entries()) {
        report.metrics[category] = {};
        
        for (const [name, metric] of metrics.entries()) {
          report.metrics[category][name] = {
            current: metric.lastValue,
            aggregations: {
              '1m': this.calculateAggregation(category, name, '1m'),
              '5m': this.calculateAggregation(category, name, '5m'),
              '1h': this.calculateAggregation(category, name, '1h'),
              '1d': this.calculateAggregation(category, name, '1d')
            }
          };
        }
      }

      this.logAction('report', { timestamp: report.timestamp });
      eventManager.emit('stats:report', report);

      // Persist report
      await this.persistStats();
    } catch (error) {
      this.logError('report', error);
    }
  }

  /**
   * Loads persisted statistics
   */
  async loadStats() {
    try {
      const stats = await cacheManager.get(this.cacheKey);
      if (stats) {
        for (const [category, metrics] of Object.entries(stats)) {
          if (this.metrics.has(category)) {
            for (const [name, data] of Object.entries(metrics)) {
              const metric = this.getMetric(category, name);
              if (metric) {
                metric.values = data.values;
                metric.lastValue = data.lastValue;
                metric.lastUpdate = data.lastUpdate;
              }
            }
          }
        }
      }
    } catch (error) {
      this.logError('load', error);
    }
  }

  /**
   * Persists current statistics
   */
  async persistStats() {
    try {
      const stats = {};
      for (const [category, metrics] of this.metrics.entries()) {
        stats[category] = {};
        for (const [name, metric] of metrics.entries()) {
          stats[category][name] = {
            values: metric.values,
            lastValue: metric.lastValue,
            lastUpdate: metric.lastUpdate
          };
        }
      }

      await cacheManager.set(this.cacheKey, stats, {
        persistent: true
      });
    } catch (error) {
      this.logError('persist', error);
    }
  }

  /**
   * Logs a statistics action
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'STATS',
      `Statistics ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs a statistics error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'STATS',
      `Statistics error during ${action}: ${error.message}`,
      'ERROR',
      {
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const statsManager = new StatsManager();
export default statsManager; 