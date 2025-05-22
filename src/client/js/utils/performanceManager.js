/**
 * Performance management system
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import statsManager from './statsManager';

class PerformanceManager {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = 1000; // 1 second
    this.fpsThreshold = 30;
    this.memoryThreshold = 0.8; // 80% of available memory
    this.latencyThreshold = 100; // 100ms
    this.optimizationEnabled = true;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.latencyHistory = [];

    // Bind methods
    this.monitor = this.monitor.bind(this);
    this.measureFPS = this.measureFPS.bind(this);
    this.measureMemory = this.measureMemory.bind(this);
    this.measureLatency = this.measureLatency.bind(this);
  }

  /**
   * Starts performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.latencyHistory = [];

    // Start monitoring loop
    this.monitoringInterval = setInterval(this.monitor, this.monitoringInterval);
    
    // Start FPS measurement
    requestAnimationFrame(this.measureFPS);

    this.logAction('start_monitoring');
    eventManager.emit('performance:monitoring_started');
  }

  /**
   * Stops performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;

    this.logAction('stop_monitoring');
    eventManager.emit('performance:monitoring_stopped');
  }

  /**
   * Main monitoring loop
   */
  async monitor() {
    try {
      // Measure performance metrics
      const fps = this.calculateAverageFPS();
      const memory = await this.measureMemory();
      const latency = await this.measureLatency();

      // Record metrics
      statsManager.record('performance', 'fps', fps);
      statsManager.record('performance', 'memory', memory);
      statsManager.record('performance', 'latency', latency);

      // Check for performance issues
      this.checkPerformanceIssues(fps, memory, latency);

      // Emit monitoring event
      eventManager.emit('performance:metrics', {
        fps,
        memory,
        latency,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logError('monitor', error);
    }
  }

  /**
   * Measures FPS using requestAnimationFrame
   */
  measureFPS() {
    if (!this.isMonitoring) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      this.fpsHistory.push(fps);
      
      // Keep only last 60 FPS measurements
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.frameCount++;
    requestAnimationFrame(this.measureFPS);
  }

  /**
   * Calculates average FPS from history
   * @returns {number} Average FPS
   */
  calculateAverageFPS() {
    if (this.fpsHistory.length === 0) {
      return 0;
    }

    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * Measures memory usage
   * @returns {Promise<number>} Memory usage in MB
   */
  async measureMemory() {
    try {
      if (performance.memory) {
        const used = performance.memory.usedJSHeapSize;
        const total = performance.memory.totalJSHeapSize;
        return Math.round(used / (1024 * 1024)); // Convert to MB
      }
      return 0;
    } catch (error) {
      this.logError('measure_memory', error);
      return 0;
    }
  }

  /**
   * Measures network latency
   * @returns {Promise<number>} Latency in milliseconds
   */
  async measureLatency() {
    try {
      const start = performance.now();
      await fetch('/ping', { method: 'HEAD' });
      const end = performance.now();
      return Math.round(end - start);
    } catch (error) {
      this.logError('measure_latency', error);
      return 0;
    }
  }

  /**
   * Checks for performance issues
   * @param {number} fps - Current FPS
   * @param {number} memory - Current memory usage
   * @param {number} latency - Current latency
   */
  checkPerformanceIssues(fps, memory, latency) {
    const issues = [];

    if (fps < this.fpsThreshold) {
      issues.push({
        type: 'fps',
        severity: 'warning',
        message: `Low FPS: ${fps} (threshold: ${this.fpsThreshold})`
      });
    }

    if (memory > this.memoryThreshold) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: `High memory usage: ${memory}MB`
      });
    }

    if (latency > this.latencyThreshold) {
      issues.push({
        type: 'latency',
        severity: 'warning',
        message: `High latency: ${latency}ms`
      });
    }

    if (issues.length > 0) {
      this.handlePerformanceIssues(issues);
    }
  }

  /**
   * Handles performance issues
   * @param {Array} issues - Performance issues
   */
  handlePerformanceIssues(issues) {
    if (!this.optimizationEnabled) {
      return;
    }

    for (const issue of issues) {
      switch (issue.type) {
        case 'fps':
          this.optimizeFPS();
          break;
        case 'memory':
          this.optimizeMemory();
          break;
        case 'latency':
          this.optimizeLatency();
          break;
      }

      this.logAction('performance_issue', issue);
      eventManager.emit('performance:issue', issue);
    }
  }

  /**
   * Optimizes FPS
   */
  optimizeFPS() {
    // Reduce visual effects
    eventManager.emit('performance:optimize_visuals');
    
    // Reduce update frequency
    eventManager.emit('performance:reduce_updates');
  }

  /**
   * Optimizes memory usage
   */
  optimizeMemory() {
    // Clear caches
    eventManager.emit('performance:clear_caches');
    
    // Garbage collection
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Optimizes network latency
   */
  optimizeLatency() {
    // Reduce network requests
    eventManager.emit('performance:reduce_requests');
    
    // Use local cache
    eventManager.emit('performance:use_cache');
  }

  /**
   * Sets performance thresholds
   * @param {Object} thresholds - Performance thresholds
   */
  setThresholds(thresholds) {
    if (thresholds.fps !== undefined) {
      this.fpsThreshold = thresholds.fps;
    }
    if (thresholds.memory !== undefined) {
      this.memoryThreshold = thresholds.memory;
    }
    if (thresholds.latency !== undefined) {
      this.latencyThreshold = thresholds.latency;
    }
  }

  /**
   * Enables or disables automatic optimization
   * @param {boolean} enabled - Whether optimization should be enabled
   */
  setOptimizationEnabled(enabled) {
    this.optimizationEnabled = enabled;
  }

  /**
   * Gets current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      fps: this.calculateAverageFPS(),
      memory: this.memoryHistory[this.memoryHistory.length - 1] || 0,
      latency: this.latencyHistory[this.latencyHistory.length - 1] || 0
    };
  }

  /**
   * Gets performance history
   * @returns {Object} Performance history
   */
  getHistory() {
    return {
      fps: [...this.fpsHistory],
      memory: [...this.memoryHistory],
      latency: [...this.latencyHistory]
    };
  }

  /**
   * Logs a performance action
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'PERFORMANCE',
      `Performance ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs a performance error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'PERFORMANCE',
      `Performance error during ${action}: ${error.message}`,
      'ERROR',
      {
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const performanceManager = new PerformanceManager();
export default performanceManager; 