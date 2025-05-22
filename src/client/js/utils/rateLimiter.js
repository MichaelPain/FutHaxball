/**
 * Rate limiter utility for preventing brute force attacks
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.maxAttempts = 5;
    this.windowMs = 15 * 60 * 1000; // 15 minutes
    this.blockDuration = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Records a login attempt
   * @param {string} key - Identifier for the attempt (e.g., IP or username)
   * @returns {Object} Status of the attempt
   */
  recordAttempt(key) {
    const now = Date.now();
    let attemptData = this.attempts.get(key) || {
      count: 0,
      firstAttempt: now,
      blockedUntil: null
    };

    // Check if blocked
    if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
      return {
        allowed: false,
        remainingTime: Math.ceil((attemptData.blockedUntil - now) / 1000 / 60),
        message: `Account bloccato per ${Math.ceil((attemptData.blockedUntil - now) / 1000 / 60)} minuti`
      };
    }

    // Reset if window has passed
    if (now - attemptData.firstAttempt > this.windowMs) {
      attemptData = {
        count: 0,
        firstAttempt: now,
        blockedUntil: null
      };
    }

    // Increment attempt count
    attemptData.count++;

    // Check if should block
    if (attemptData.count >= this.maxAttempts) {
      attemptData.blockedUntil = now + this.blockDuration;
      this.attempts.set(key, attemptData);
      return {
        allowed: false,
        remainingTime: Math.ceil(this.blockDuration / 1000 / 60),
        message: `Troppi tentativi. Account bloccato per ${Math.ceil(this.blockDuration / 1000 / 60)} minuti`
      };
    }

    // Update attempts
    this.attempts.set(key, attemptData);

    // Return status
    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - attemptData.count,
      message: `${this.maxAttempts - attemptData.count} tentativi rimanenti`
    };
  }

  /**
   * Resets attempts for a key
   * @param {string} key - Identifier to reset
   */
  resetAttempts(key) {
    this.attempts.delete(key);
  }

  /**
   * Gets the current status for a key
   * @param {string} key - Identifier to check
   * @returns {Object} Current status
   */
  getStatus(key) {
    const attemptData = this.attempts.get(key);
    if (!attemptData) {
      return {
        blocked: false,
        remainingAttempts: this.maxAttempts,
        message: `${this.maxAttempts} tentativi disponibili`
      };
    }

    const now = Date.now();
    if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
      return {
        blocked: true,
        remainingTime: Math.ceil((attemptData.blockedUntil - now) / 1000 / 60),
        message: `Account bloccato per ${Math.ceil((attemptData.blockedUntil - now) / 1000 / 60)} minuti`
      };
    }

    return {
      blocked: false,
      remainingAttempts: this.maxAttempts - attemptData.count,
      message: `${this.maxAttempts - attemptData.count} tentativi rimanenti`
    };
  }

  /**
   * Cleans up old attempts
   */
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.attempts.entries()) {
      if (now - data.firstAttempt > this.windowMs && !data.blockedUntil) {
        this.attempts.delete(key);
      }
    }
  }
}

// Start cleanup interval
const rateLimiter = new RateLimiter();
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000); // Clean up every 5 minutes

export default rateLimiter; 