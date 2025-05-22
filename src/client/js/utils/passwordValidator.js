/**
 * Password validator utility with advanced security requirements
 */
class PasswordValidator {
  constructor() {
    this.minLength = 12;
    this.requireUppercase = true;
    this.requireLowercase = true;
    this.requireNumbers = true;
    this.requireSpecialChars = true;
    this.maxConsecutiveChars = 3;
    this.commonPasswords = new Set([
      'password123', 'qwerty123', 'admin123', 'welcome123',
      '12345678', 'password1', 'qwerty1', 'admin1'
    ]);
  }

  /**
   * Validates a password against security requirements
   * @param {string} password - The password to validate
   * @returns {Object} Validation result with status and messages
   */
  validate(password) {
    const errors = [];

    // Check minimum length
    if (password.length < this.minLength) {
      errors.push(`La password deve essere di almeno ${this.minLength} caratteri`);
    }

    // Check for uppercase letters
    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('La password deve contenere almeno una lettera maiuscola');
    }

    // Check for lowercase letters
    if (this.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('La password deve contenere almeno una lettera minuscola');
    }

    // Check for numbers
    if (this.requireNumbers && !/\d/.test(password)) {
      errors.push('La password deve contenere almeno un numero');
    }

    // Check for special characters
    if (this.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La password deve contenere almeno un carattere speciale');
    }

    // Check for consecutive characters
    if (this.hasConsecutiveChars(password)) {
      errors.push(`La password non può contenere più di ${this.maxConsecutiveChars} caratteri consecutivi`);
    }

    // Check against common passwords
    if (this.commonPasswords.has(password.toLowerCase())) {
      errors.push('La password è troppo comune');
    }

    // Calculate password strength
    const strength = this.calculateStrength(password);

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Checks for consecutive characters in password
   * @param {string} password - The password to check
   * @returns {boolean} True if password has too many consecutive chars
   */
  hasConsecutiveChars(password) {
    let consecutiveCount = 1;
    let lastChar = password[0];

    for (let i = 1; i < password.length; i++) {
      if (password[i] === lastChar) {
        consecutiveCount++;
        if (consecutiveCount > this.maxConsecutiveChars) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
      lastChar = password[i];
    }

    return false;
  }

  /**
   * Calculates password strength (0-100)
   * @param {string} password - The password to evaluate
   * @returns {number} Password strength score
   */
  calculateStrength(password) {
    let score = 0;

    // Length contribution (up to 25 points)
    score += Math.min(password.length * 2, 25);

    // Character type contribution (up to 25 points each)
    if (/[A-Z]/.test(password)) score += 25;
    if (/[a-z]/.test(password)) score += 25;
    if (/\d/.test(password)) score += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 25;

    // Penalty for common patterns
    if (this.commonPasswords.has(password.toLowerCase())) {
      score = Math.max(0, score - 50);
    }

    return Math.min(100, score);
  }

  /**
   * Generates a secure random password
   * @param {number} length - Desired password length
   * @returns {string} Generated password
   */
  generateSecurePassword(length = this.minLength) {
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: '!@#$%^&*(),.?":{}|<>'
    };

    let password = '';
    const allChars = Object.values(charset).join('');

    // Ensure at least one character from each type
    password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
    password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
    password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
    password += charset.special[Math.floor(Math.random() * charset.special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

export default new PasswordValidator(); 