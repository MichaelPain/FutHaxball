// Game Error Handler for centralized error management
class GameErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.errorTypes = {
      RENDERING: 'rendering',
      PHYSICS: 'physics',
      NETWORK: 'network',
      INPUT: 'input',
      STATE: 'state',
      AUDIO: 'audio',
      ASSET: 'asset',
      SYSTEM: 'system',
      VALIDATION: 'validation',
      SYNCHRONIZATION: 'synchronization',
      PERFORMANCE: 'performance'
    };

    this.errorLevels = {
      DEBUG: 'debug',
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    };

    this.recoveryStrategies = new Map();
    this.errorPatterns = new Map();
    this.performanceThresholds = {
      fps: 30,
      memory: 500 * 1024 * 1024, // 500MB
      latency: 100, // ms
      jitter: 20 // ms
    };

    // Initialize error handlers
    this.initErrorHandlers();
    // Initialize recovery strategies
    this.initRecoveryStrategies();
    // Initialize error patterns
    this.initErrorPatterns();
  }

  // Initialize error handlers
  initErrorHandlers() {
    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError(error || new Error(message), this.errorTypes.SYSTEM, this.errorLevels.ERROR);
      return true;
    };

    // Promise rejection handler
    window.onunhandledrejection = (event) => {
      this.handleError(event.reason, this.errorTypes.SYSTEM, this.errorLevels.ERROR);
    };

    // Performance monitoring
    this.initPerformanceMonitoring();
  }

  // Initialize performance monitoring
  initPerformanceMonitoring() {
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const checkPerformance = () => {
      const now = performance.now();
      frameCount++;

      // Update FPS every second
      if (now - lastFpsUpdate >= 1000) {
        const fps = frameCount * 1000 / (now - lastFpsUpdate);
        frameCount = 0;
        lastFpsUpdate = now;

        // Check FPS threshold
        if (fps < this.performanceThresholds.fps) {
          this.handleError(
            new Error(`Low FPS: ${fps.toFixed(1)}`),
            this.errorTypes.PERFORMANCE,
            this.errorLevels.WARNING
          );
        }

        // Check memory usage
        if (window.performance?.memory) {
          const memoryUsage = window.performance.memory.usedJSHeapSize;
          if (memoryUsage > this.performanceThresholds.memory) {
            this.handleError(
              new Error(`High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`),
              this.errorTypes.PERFORMANCE,
              this.errorLevels.WARNING
            );
          }
        }
      }

      requestAnimationFrame(checkPerformance);
    };

    requestAnimationFrame(checkPerformance);
  }

  // Initialize recovery strategies
  initRecoveryStrategies() {
    // State recovery strategy
    this.recoveryStrategies.set(this.errorTypes.STATE, {
      attempts: 0,
      maxAttempts: 3,
      backoff: 1000,
      handler: async (error) => {
        if (window.gameState) {
          // Try to recover from last known good state
          const recoverySuccess = await window.gameState.attemptRecovery();
          if (recoverySuccess) {
            // Verify state consistency after recovery
            return this.verifyStateConsistency();
          }
          return false;
        }
        return false;
      }
    });

    // Network recovery strategy
    this.recoveryStrategies.set(this.errorTypes.NETWORK, {
      attempts: 0,
      maxAttempts: 5,
      backoff: 2000,
      handler: async (error) => {
        // Implement network recovery logic with connection quality check
        const connectionQuality = await this.checkConnectionQuality();
        if (connectionQuality > 0.7) {
          // Attempt to reconnect with exponential backoff
          return await this.reconnectWithBackoff();
        }
        return false;
      }
    });

    // Rendering recovery strategy
    this.recoveryStrategies.set(this.errorTypes.RENDERING, {
      attempts: 0,
      maxAttempts: 2,
      backoff: 500,
      handler: async (error) => {
        // Implement rendering recovery logic with fallback options
        if (this.canUseWebGL()) {
          return await this.recoverWebGLRenderer();
        } else {
          return await this.fallbackToCanvas2D();
        }
      }
    });

    // Physics recovery strategy
    this.recoveryStrategies.set(this.errorTypes.PHYSICS, {
      attempts: 0,
      maxAttempts: 3,
      backoff: 1000,
      handler: async (error) => {
        // Reset physics state and validate
        return await this.resetAndValidatePhysics();
      }
    });

    // Audio recovery strategy
    this.recoveryStrategies.set(this.errorTypes.AUDIO, {
      attempts: 0,
      maxAttempts: 2,
      backoff: 1000,
      handler: async (error) => {
        // Attempt to recover audio context
        return await this.recoverAudioContext();
      }
    });
  }

  // Verify state consistency after recovery
  async verifyStateConsistency() {
    if (!window.gameState) return false;
    
    const currentState = window.gameState.getState();
    const lastGoodState = window.gameState.getLastGoodState();
    
    // Check critical state properties
    const criticalProps = ['game.status', 'game.score', 'players'];
    for (const prop of criticalProps) {
      if (!this.compareStateProps(currentState, lastGoodState, prop)) {
        return false;
      }
    }
    
    return true;
  }

  // Check connection quality
  async checkConnectionQuality() {
    const metrics = {
      latency: window.networkLatency || 0,
      jitter: window.networkJitter || 0,
      packetLoss: window.packetLoss || 0
    };
    
    // Calculate quality score (0-1)
    const latencyScore = Math.max(0, 1 - (metrics.latency / 1000));
    const jitterScore = Math.max(0, 1 - (metrics.jitter / 100));
    const packetLossScore = Math.max(0, 1 - metrics.packetLoss);
    
    return (latencyScore + jitterScore + packetLossScore) / 3;
  }

  // Reconnect with exponential backoff
  async reconnectWithBackoff(attempt = 0, maxAttempts = 5) {
    if (attempt >= maxAttempts) return false;
    
    try {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      const success = await this.attemptReconnection();
      if (success) return true;
      return await this.reconnectWithBackoff(attempt + 1, maxAttempts);
    } catch (error) {
      return false;
    }
  }

  // Reset and validate physics
  async resetAndValidatePhysics() {
    try {
      // Reset physics state
      await this.resetPhysicsState();
      
      // Validate physics parameters
      const validation = await this.validatePhysicsParameters();
      if (!validation.valid) {
        // Apply corrections if needed
        await this.correctPhysicsParameters(validation.corrections);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Recover audio context
  async recoverAudioContext() {
    try {
      // Create new audio context
      const newContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Test audio context
      const oscillator = newContext.createOscillator();
      oscillator.connect(newContext.destination);
      oscillator.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      oscillator.stop();
      
      // Replace old context
      window.audioContext = newContext;
      return true;
    } catch (error) {
      return false;
    }
  }

  // Initialize error patterns
  initErrorPatterns() {
    // State synchronization errors
    this.errorPatterns.set('state_sync', {
      pattern: /state synchronization failed/i,
      type: this.errorTypes.SYNCHRONIZATION,
      level: this.errorLevels.ERROR,
      recovery: this.errorTypes.STATE
    });

    // Network timeout errors
    this.errorPatterns.set('network_timeout', {
      pattern: /network timeout/i,
      type: this.errorTypes.NETWORK,
      level: this.errorLevels.ERROR,
      recovery: this.errorTypes.NETWORK
    });

    // Rendering errors
    this.errorPatterns.set('rendering_error', {
      pattern: /rendering error/i,
      type: this.errorTypes.RENDERING,
      level: this.errorLevels.ERROR,
      recovery: this.errorTypes.RENDERING
    });
  }

  // Handle errors with enhanced pattern matching and recovery
  async handleError(error, type = this.errorTypes.SYSTEM, level = this.errorLevels.ERROR) {
    // Match error against known patterns
    const matchedPattern = this.matchErrorPattern(error);
    if (matchedPattern) {
      type = matchedPattern.type;
      level = matchedPattern.level;
    }

    const errorInfo = {
      timestamp: new Date(),
      type,
      level,
      message: error.message,
      stack: error.stack,
      context: this.getErrorContext(),
      pattern: matchedPattern?.name
    };

    // Add to error log
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log error
    this.logError(errorInfo);

    // Handle error based on level
    switch (level) {
      case this.errorLevels.CRITICAL:
        await this.handleCriticalError(errorInfo);
        break;
      case this.errorLevels.ERROR:
        await this.handleError(errorInfo);
        break;
      case this.errorLevels.WARNING:
        this.handleWarning(errorInfo);
        break;
      default:
        this.handleInfo(errorInfo);
    }

    return errorInfo;
  }

  // Match error against known patterns
  matchErrorPattern(error) {
    for (const [name, pattern] of this.errorPatterns) {
      if (pattern.pattern.test(error.message)) {
        return { ...pattern, name };
      }
    }
    return null;
  }

  // Get current error context with enhanced metrics
  getErrorContext() {
    return {
      gameState: window.gameState ? window.gameState.getPerformanceMetrics() : null,
      playerCount: window.playerCount || 0,
      fps: window.currentFPS || 0,
      memory: window.performance?.memory?.usedJSHeapSize || 0,
      timestamp: Date.now(),
      network: {
        latency: window.networkLatency || 0,
        jitter: window.networkJitter || 0,
        packetLoss: window.packetLoss || 0
      }
    };
  }

  // Log error to console and analytics
  logError(errorInfo) {
    // Console logging based on level
    const logMethod = this.getLogMethod(errorInfo.level);
    console[logMethod](`[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`, errorInfo);

    // TODO: Add analytics logging
    // this.logToAnalytics(errorInfo);
  }

  // Get appropriate console log method
  getLogMethod(level) {
    switch (level) {
      case this.errorLevels.DEBUG:
        return 'debug';
      case this.errorLevels.INFO:
        return 'info';
      case this.errorLevels.WARNING:
        return 'warn';
      case this.errorLevels.ERROR:
      case this.errorLevels.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  // Enhanced critical error handling
  async handleCriticalError(errorInfo) {
    // Show critical error UI
    this.showErrorUI(errorInfo);
    
    // Attempt recovery with backoff
    const recoverySuccess = await this.attemptRecoveryWithBackoff(errorInfo);
    
    if (!recoverySuccess) {
      // Notify server of unrecoverable error
      this.notifyServer(errorInfo);
      
      // Show final error message
      this.showFinalError(errorInfo);
    }
  }

  // Attempt recovery with exponential backoff
  async attemptRecoveryWithBackoff(errorInfo) {
    const strategy = this.recoveryStrategies.get(errorInfo.type);
    if (!strategy) return false;

    let attempt = 0;
    while (attempt < strategy.maxAttempts) {
      const success = await strategy.handler(errorInfo);
      if (success) return true;

      attempt++;
      if (attempt < strategy.maxAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, strategy.backoff * Math.pow(2, attempt - 1))
        );
      }
    }

    return false;
  }

  // Show final error message
  showFinalError(errorInfo) {
    const overlay = document.createElement('div');
    overlay.className = 'error-overlay final';
    overlay.innerHTML = `
      <div class="error-container">
        <h2>Unrecoverable Error</h2>
        <p>${errorInfo.message}</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
        <button onclick="window.location.reload()">Reload Game</button>
        <button onclick="this.showErrorDetails()">Show Details</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Show error UI for critical errors
  showErrorUI(errorInfo) {
    // Create error overlay
    const overlay = document.createElement('div');
    overlay.className = 'error-overlay';
    overlay.innerHTML = `
      <div class="error-container">
        <h2>Critical Error</h2>
        <p>${errorInfo.message}</p>
        <button onclick="window.location.reload()">Reload Game</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Handle warnings
  handleWarning(errorInfo) {
    // Show warning notification
    this.showWarningNotification(errorInfo);
  }

  // Handle info messages
  handleInfo(errorInfo) {
    // Log info message
    console.info(`[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`);
  }

  // Show warning notification
  showWarningNotification(errorInfo) {
    // TODO: Implement notification system
    console.warn(`Warning: ${errorInfo.message}`);
  }

  // Notify server of critical errors
  notifyServer(errorInfo) {
    // TODO: Implement server notification
    // fetch('/api/error-report', {
    //   method: 'POST',
    //   body: JSON.stringify(errorInfo)
    // });
  }

  // Get error history
  getErrorHistory() {
    return this.errors;
  }

  // Clear error history
  clearErrorHistory() {
    this.errors = [];
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byType: {},
      byLevel: {},
      recent: this.errors.slice(-10),
      recoverySuccess: 0,
      recoveryAttempts: 0
    };

    this.errors.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      // Count by level
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
    });

    return stats;
  }
}

export default GameErrorHandler; 