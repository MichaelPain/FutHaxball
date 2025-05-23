import validator from '../utils/validator';
import i18n from '../utils/i18n'; // Import to mock

// Mock the i18n module
jest.mock('../utils/i18n', () => ({
  t: jest.fn((key, params) => {
    if (params) {
      // For messages like minLength, where params are part of the message key or used in formatting
      // This mock is simplified and might need adjustment if params are complexly used in real i18n.t
      let message = key;
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        message += ` ${paramValue}`; // Simplified: appends param value
      });
      return message;
    }
    return key; // Returns the key itself for simple messages
  }),
}));

describe('Validator', () => {
  beforeEach(() => {
    // Clear mock calls before each test if needed, though for i18n.t it might not be necessary
    // unless we are checking how many times it was called etc.
    i18n.t.mockClear();
  });

  describe('required rule', () => {
    it('should validate a non-empty string', () => {
      const result = validator.validate('hello', { required: true });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should validate a number (0 is a valid required number)', () => {
      const result = validator.validate(0, { required: true });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should validate a boolean true', () => {
      const result = validator.validate(true, { required: true });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should validate a boolean false', () => {
      const result = validator.validate(false, { required: true });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should invalidate an empty string', () => {
      const result = validator.validate('', { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].rule).toBe('required');
      expect(result.errors[0].message).toBe('validation.required');
    });

    it('should invalidate null', () => {
      const result = validator.validate(null, { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].rule).toBe('required');
      expect(result.errors[0].message).toBe('validation.required');
    });

    it('should invalidate undefined', () => {
      const result = validator.validate(undefined, { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].rule).toBe('required');
      expect(result.errors[0].message).toBe('validation.required');
    });
  });

  describe('email rule', () => {
    it('should validate a valid email', () => {
      const result = validator.validate('test@example.com', { email: true });
      expect(result.valid).toBe(true);
    });
    
    it('should validate another valid email with subdomain', () => {
      const result = validator.validate('test.user@sub.example.co.uk', { email: true });
      expect(result.valid).toBe(true);
    });

    it('should invalidate an email without @', () => {
      const result = validator.validate('testexample.com', { email: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('validation.email');
    });

    it('should invalidate an email without domain', () => {
      const result = validator.validate('test@', { email: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('validation.email');
    });

    it('should invalidate an email without TLD', () => {
      const result = validator.validate('test@example', { email: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('validation.email');
    });
    
    it('should invalidate an email starting with @', () => {
      const result = validator.validate('@example.com', { email: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('validation.email');
    });

    it('should invalidate an empty string if email rule is applied (use required for empty check)', () => {
      // Note: The email rule itself doesn't make a field required.
      // It only validates the format if a value is present.
      const result = validator.validate('', { email: true });
      expect(result.valid).toBe(false); // Fails because empty string is not a valid email format
      expect(result.errors[0].message).toBe('validation.email');
    });

    it('should treat null as invalid for email format', () => {
      const result = validator.validate(null, { email: true });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('validation.email');
    });
  });

  describe('minLength rule', () => {
    const min = 5;
    it(`should validate a string of length ${min}`, () => {
      const result = validator.validate('hello', { minLength: min });
      expect(result.valid).toBe(true);
    });

    it(`should validate a string of length > ${min}`, () => {
      const result = validator.validate('hellothere', { minLength: min });
      expect(result.valid).toBe(true);
    });

    it(`should invalidate a string of length < ${min}`, () => {
      const result = validator.validate('hi', { minLength: min });
      expect(result.valid).toBe(false);
      // The mocked i18n.t will append the param, so "validation.minLength 5"
      expect(result.errors[0].message).toBe(`validation.minLength ${min}`);
    });
    
    it('should invalidate an empty string for minLength 5', () => {
      const result = validator.validate('', { minLength: min });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(`validation.minLength ${min}`);
    });
  });

  describe('pattern rule', () => {
    const pattern = '^[a-zA-Z]+$'; // Letters only
    it('should validate a string matching the pattern', () => {
      const result = validator.validate('abcXYZ', { pattern: pattern });
      expect(result.valid).toBe(true);
    });

    it('should invalidate a string with numbers not matching the pattern', () => {
      const result = validator.validate('ab1c', { pattern: pattern });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(`validation.pattern ${pattern}`);
    });

    it('should invalidate a string with symbols not matching the pattern', () => {
      const result = validator.validate('abc!', { pattern: pattern });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(`validation.pattern ${pattern}`);
    });
    
    it('should invalidate an empty string if pattern requires non-empty match', () => {
      const result = validator.validate('', { pattern: pattern });
      expect(result.valid).toBe(false); // Fails because empty string doesn't match ^[a-zA-Z]+$ (which implies at least one char)
      expect(result.errors[0].message).toBe(`validation.pattern ${pattern}`);
    });

    const numericPattern = '^[0-9]+$'; // Numbers only
     it('should validate a numeric string with a numeric pattern', () => {
      const result = validator.validate('12345', { pattern: numericPattern });
      expect(result.valid).toBe(true);
    });
    it('should invalidate an alphanumeric string with a numeric pattern', () => {
      const result = validator.validate('123a5', { pattern: numericPattern });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe(`validation.pattern ${numericPattern}`);
    });
  });
  
  // Example of how i18n mock handles params, from the validator.js implementation
  describe('formatMessage with mocked i18n', () => {
    it('should return the key for messages without params', () => {
      expect(validator.formatMessage('validation.email', undefined)).toBe('validation.email');
    });

    it('should return key and stringified params for messages with params', () => {
      // This test depends on the simplified mock implementation of i18n.t
      // The real i18n.t might use `params` to fill placeholders in a translated string.
      // My mock for `i18n.t` just appends the value of the param.
      // validator.js passes the `params` value directly (e.g. `5` for minLength)
      expect(validator.formatMessage('validation.minLength', 5)).toBe('validation.minLength 5');
    });
  });
});
