/**
 * Animation management system
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import performanceManager from './performanceManager';

class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.frameId = null;
    this.maxAnimations = 100;
    this.defaultOptions = {
      duration: 1000,
      easing: 'linear',
      delay: 0,
      iterations: 1,
      direction: 'normal',
      fill: 'forwards'
    };

    // Easing functions
    this.easings = {
      linear: t => t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeInCubic: t => t * t * t,
      easeOutCubic: t => (--t) * t * t + 1,
      easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
      easeInElastic: t => (.04 - .04 / t) * Math.sin(25 * t) + 1,
      easeOutElastic: t => .04 * t / (--t) * Math.sin(25 * t),
      easeInOutElastic: t => (t -= .5) < 0 ? (.02 + .01 / t) * Math.sin(50 * t) : (.02 - .01 / t) * Math.sin(50 * t) + 1
    };

    // Bind methods
    this.animate = this.animate.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Starts the animation loop
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.frameId = requestAnimationFrame(this.animate);
      this.logAction('start');
      eventManager.emit('animation:started');
    }
  }

  /**
   * Stops the animation loop
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.logAction('stop');
      eventManager.emit('animation:stopped');
    }
  }

  /**
   * Main animation loop
   * @param {number} timestamp - Current timestamp
   */
  animate(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // Update all active animations
    for (const [id, animation] of this.animations) {
      if (animation.isActive) {
        this.updateAnimation(id, animation, deltaTime);
      }
    }

    // Schedule next frame
    this.frameId = requestAnimationFrame(this.animate);
  }

  /**
   * Updates a single animation
   * @param {string} id - Animation ID
   * @param {Object} animation - Animation object
   * @param {number} deltaTime - Time since last frame
   */
  updateAnimation(id, animation, deltaTime) {
    const { startTime, duration, easing, onUpdate, onComplete } = animation;
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Apply easing
    const easedProgress = this.easings[easing](progress);

    // Update animation
    if (onUpdate) {
      try {
        onUpdate(easedProgress, animation);
      } catch (error) {
        this.logError('update', error, { id });
      }
    }

    // Check if animation is complete
    if (progress >= 1) {
      this.completeAnimation(id, animation);
    }
  }

  /**
   * Completes an animation
   * @param {string} id - Animation ID
   * @param {Object} animation - Animation object
   */
  completeAnimation(id, animation) {
    const { onComplete, iterations, currentIteration } = animation;

    if (currentIteration < iterations) {
      // Start next iteration
      animation.currentIteration++;
      animation.startTime = performance.now();
    } else {
      // Animation complete
      animation.isActive = false;
      this.animations.delete(id);

      if (onComplete) {
        try {
          onComplete();
        } catch (error) {
          this.logError('complete', error, { id });
        }
      }

      this.logAction('complete', { id });
      eventManager.emit('animation:completed', { id });
    }
  }

  /**
   * Creates a new animation
   * @param {string} id - Animation ID
   * @param {Object} options - Animation options
   * @returns {string} Animation ID
   */
  create(id, options = {}) {
    if (this.animations.size >= this.maxAnimations) {
      throw new Error('Maximum number of animations reached');
    }

    const animation = {
      ...this.defaultOptions,
      ...options,
      id,
      isActive: true,
      startTime: performance.now(),
      currentIteration: 1
    };

    this.animations.set(id, animation);
    this.logAction('create', { id });

    // Start animation loop if not running
    if (!this.isRunning) {
      this.start();
    }

    return id;
  }

  /**
   * Pauses an animation
   * @param {string} id - Animation ID
   */
  pause(id) {
    const animation = this.animations.get(id);
    if (animation && animation.isActive) {
      animation.isActive = false;
      this.logAction('pause', { id });
      eventManager.emit('animation:paused', { id });
    }
  }

  /**
   * Resumes an animation
   * @param {string} id - Animation ID
   */
  resume(id) {
    const animation = this.animations.get(id);
    if (animation && !animation.isActive) {
      animation.isActive = true;
      animation.startTime = performance.now() - (animation.elapsed || 0);
      this.logAction('resume', { id });
      eventManager.emit('animation:resumed', { id });
    }
  }

  /**
   * Cancels an animation
   * @param {string} id - Animation ID
   */
  cancel(id) {
    if (this.animations.has(id)) {
      this.animations.delete(id);
      this.logAction('cancel', { id });
      eventManager.emit('animation:cancelled', { id });
    }
  }

  /**
   * Gets animation progress
   * @param {string} id - Animation ID
   * @returns {number} Progress (0-1)
   */
  getProgress(id) {
    const animation = this.animations.get(id);
    if (!animation) return 0;

    const elapsed = performance.now() - animation.startTime;
    return Math.min(elapsed / animation.duration, 1);
  }

  /**
   * Checks if an animation is active
   * @param {string} id - Animation ID
   * @returns {boolean} Whether the animation is active
   */
  isActive(id) {
    const animation = this.animations.get(id);
    return animation ? animation.isActive : false;
  }

  /**
   * Gets all active animations
   * @returns {Array} Active animations
   */
  getActiveAnimations() {
    return Array.from(this.animations.values())
      .filter(animation => animation.isActive);
  }

  /**
   * Sets the maximum number of concurrent animations
   * @param {number} max - Maximum animations
   */
  setMaxAnimations(max) {
    if (max < 1) {
      throw new Error('Max animations must be at least 1');
    }
    this.maxAnimations = max;
  }

  /**
   * Adds a custom easing function
   * @param {string} name - Easing name
   * @param {Function} fn - Easing function
   */
  addEasing(name, fn) {
    if (typeof fn !== 'function') {
      throw new Error('Easing must be a function');
    }
    this.easings[name] = fn;
  }

  /**
   * Logs an animation action
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'ANIMATION',
      `Animation ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs an animation error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   * @param {Object} [data] - Additional data
   */
  logError(action, error, data = {}) {
    securityLogger.log(
      'ANIMATION',
      `Animation error during ${action}: ${error.message}`,
      'ERROR',
      {
        ...data,
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const animationManager = new AnimationManager();
export default animationManager; 