// Game Logger for comprehensive logging and analytics
class GameLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.logLevels = {
      DEBUG: 'debug',
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    };

    this.categories = {
      GAME: 'game',
      PHYSICS: 'physics',
      RENDERING: 'rendering',
      NETWORK: 'network',
      INPUT: 'input',
      AUDIO: 'audio',
      UI: 'ui',
      PERFORMANCE: 'performance',
      SECURITY: 'security',
      SYSTEM: 'system'
    };

    this.metrics = {
      fps: [],
      memory: [],
      latency: [],
      errors: [],
      events: []
    };

    // Initialize logging
    this.initLogging();
  }

  // Initialize logging system
  initLogging() {
    // Performance monitoring
    this.startPerformanceMonitoring();
    
    // Error tracking
    this.startErrorTracking();
    
    // Event tracking
    this.startEventTracking();
  }

  // Log message with category and level
  log(message, category = this.categories.SYSTEM, level = this.logLevels.INFO, data = {}) {
    const logEntry = {
      timestamp: new Date(),
      category,
      level,
      message,
      data,
      context: this.getLogContext()
    };

    // Add to log history
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging based on level
    this.consoleLog(logEntry);

    // Track metrics if applicable
    this.trackMetrics(logEntry);

    // Send to analytics if needed
    this.sendToAnalytics(logEntry);

    return logEntry;
  }

  // Get current log context
  getLogContext() {
    return {
      gameState: window.gameState || null,
      playerCount: window.playerCount || 0,
      fps: window.currentFPS || 0,
      memory: window.performance?.memory?.usedJSHeapSize || 0,
      timestamp: Date.now()
    };
  }

  // Console logging with appropriate method
  consoleLog(logEntry) {
    const logMethod = this.getLogMethod(logEntry.level);
    console[logMethod](
      `[${logEntry.category.toUpperCase()}] ${logEntry.message}`,
      logEntry.data
    );
  }

  // Get appropriate console log method
  getLogMethod(level) {
    switch (level) {
      case this.logLevels.DEBUG:
        return 'debug';
      case this.logLevels.INFO:
        return 'info';
      case this.logLevels.WARNING:
        return 'warn';
      case this.logLevels.ERROR:
      case this.logLevels.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  // Start performance monitoring
  startPerformanceMonitoring() {
    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;

    const monitorFPS = () => {
      const currentTime = performance.now();
      frames++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.metrics.fps.push(fps);
        this.log(`Current FPS: ${fps}`, this.categories.PERFORMANCE, this.logLevels.INFO);
        
        // Keep only last 60 FPS measurements
        if (this.metrics.fps.length > 60) {
          this.metrics.fps.shift();
        }

        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(monitorFPS);
    };

    requestAnimationFrame(monitorFPS);

    // Monitor memory usage
    if (window.performance?.memory) {
      setInterval(() => {
        const memory = window.performance.memory.usedJSHeapSize;
        this.metrics.memory.push(memory);
        this.log(`Memory usage: ${Math.round(memory / 1024 / 1024)}MB`, 
          this.categories.PERFORMANCE, 
          this.logLevels.INFO
        );

        // Keep only last 60 memory measurements
        if (this.metrics.memory.length > 60) {
          this.metrics.memory.shift();
        }
      }, 1000);
    }
  }

  // Start error tracking
  startErrorTracking() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.log(
        `Error: ${message}`,
        this.categories.SYSTEM,
        this.logLevels.ERROR,
        { source, lineno, colno, stack: error?.stack }
      );
      return true;
    };

    window.onunhandledrejection = (event) => {
      this.log(
        `Unhandled Promise Rejection: ${event.reason}`,
        this.categories.SYSTEM,
        this.logLevels.ERROR,
        { stack: event.reason?.stack }
      );
    };
  }

  // Start event tracking
  startEventTracking() {
    // Track user interactions
    document.addEventListener('click', (e) => {
      this.log(
        `User click: ${e.target.id || e.target.className}`,
        this.categories.UI,
        this.logLevels.DEBUG,
        { x: e.clientX, y: e.clientY }
      );
    });

    // Track game events
    if (window.gameEvents) {
      window.gameEvents.on('goal', (data) => {
        this.log(
          `Goal scored by ${data.player}`,
          this.categories.GAME,
          this.logLevels.INFO,
          data
        );
      });

      window.gameEvents.on('matchStart', (data) => {
        this.log(
          'Match started',
          this.categories.GAME,
          this.logLevels.INFO,
          data
        );
      });

      window.gameEvents.on('matchEnd', (data) => {
        this.log(
          'Match ended',
          this.categories.GAME,
          this.logLevels.INFO,
          data
        );
      });
    }
  }

  // Track metrics for specific log entries
  trackMetrics(logEntry) {
    switch (logEntry.category) {
      case this.categories.PERFORMANCE:
        this.metrics.fps.push(logEntry.data.fps);
        break;
      case this.categories.SYSTEM:
        if (logEntry.level === this.logLevels.ERROR) {
          this.metrics.errors.push(logEntry);
        }
        break;
      case this.categories.GAME:
        this.metrics.events.push(logEntry);
        break;
    }
  }

  // Send log to analytics system
  sendToAnalytics(logEntry) {
    // TODO: Implement analytics integration
    // if (window.analytics) {
    //   window.analytics.track('game_log', logEntry);
    // }
  }

  // Get log history
  getLogHistory() {
    return this.logs;
  }

  // Clear log history
  clearLogHistory() {
    this.logs = [];
  }

  // Get metrics
  getMetrics() {
    return {
      fps: {
        current: this.metrics.fps[this.metrics.fps.length - 1],
        average: this.calculateAverage(this.metrics.fps),
        min: Math.min(...this.metrics.fps),
        max: Math.max(...this.metrics.fps)
      },
      memory: {
        current: this.metrics.memory[this.metrics.memory.length - 1],
        average: this.calculateAverage(this.metrics.memory),
        min: Math.min(...this.metrics.memory),
        max: Math.max(...this.metrics.memory)
      },
      errors: this.metrics.errors.length,
      events: this.metrics.events.length
    };
  }

  // Calculate average of array
  calculateAverage(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  // Export logs
  exportLogs() {
    return JSON.stringify({
      logs: this.logs,
      metrics: this.getMetrics()
    });
  }
}

export default GameLogger; 