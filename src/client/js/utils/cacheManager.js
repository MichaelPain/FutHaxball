/**
 * Cache management system
 */
import securityLogger from './securityLogger';
import eventManager from './eventManager';
import configManager from './configManager';

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Maximum number of items
    this.maxAge = 3600000; // 1 hour in milliseconds
    this.storage = window.localStorage;
    this.prefix = 'haxball_cache_';
    this.compressionEnabled = false;
    this.encryptionEnabled = false;

    this.loadPersistentCache();
  }

  /**
   * Sets a value in the cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   */
  async set(key, value, options = {}) {
    try {
      const cacheItem = {
        value,
        timestamp: Date.now(),
        expires: options.expires || this.maxAge,
        persistent: options.persistent || false
      };

      // Check cache size
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }

      this.cache.set(key, cacheItem);

      if (cacheItem.persistent) {
        await this.persistItem(key, cacheItem);
      }

      this.logCacheAction('set', { key, options });
      eventManager.emit('cache:set', { key, value, options });
    } catch (error) {
      this.logError('set', error);
      throw error;
    }
  }

  /**
   * Gets a value from the cache
   * @param {string} key - Cache key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Cached value
   */
  async get(key, defaultValue = null) {
    try {
      const item = this.cache.get(key);

      if (!item) {
        return defaultValue;
      }

      // Check expiration
      if (this.isExpired(item)) {
        this.delete(key);
        return defaultValue;
      }

      this.logCacheAction('get', { key });
      return item.value;
    } catch (error) {
      this.logError('get', error);
      return defaultValue;
    }
  }

  /**
   * Deletes a value from the cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    try {
      const item = this.cache.get(key);
      if (item && item.persistent) {
        await this.removePersistentItem(key);
      }

      this.cache.delete(key);
      this.logCacheAction('delete', { key });
      eventManager.emit('cache:delete', { key });
    } catch (error) {
      this.logError('delete', error);
      throw error;
    }
  }

  /**
   * Checks if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether the key exists
   */
  has(key) {
    const item = this.cache.get(key);
    return item && !this.isExpired(item);
  }

  /**
   * Clears the entire cache
   */
  async clear() {
    try {
      this.cache.clear();
      await this.clearPersistentCache();
      this.logCacheAction('clear');
      eventManager.emit('cache:clear');
    } catch (error) {
      this.logError('clear', error);
      throw error;
    }
  }

  /**
   * Gets all cache keys
   * @returns {string[]} Cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Gets the cache size
   * @returns {number} Number of items in cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Sets the maximum cache size
   * @param {number} size - Maximum number of items
   */
  setMaxSize(size) {
    if (size < 0) {
      throw new Error('Max size must be non-negative');
    }
    this.maxSize = size;
  }

  /**
   * Sets the maximum cache age
   * @param {number} age - Maximum age in milliseconds
   */
  setMaxAge(age) {
    if (age < 0) {
      throw new Error('Max age must be non-negative');
    }
    this.maxAge = age;
  }

  /**
   * Enables or disables compression
   * @param {boolean} enabled - Whether compression should be enabled
   */
  setCompressionEnabled(enabled) {
    this.compressionEnabled = enabled;
  }

  /**
   * Enables or disables encryption
   * @param {boolean} enabled - Whether encryption should be enabled
   */
  setEncryptionEnabled(enabled) {
    this.encryptionEnabled = enabled;
  }

  /**
   * Checks if an item is expired
   * @param {Object} item - Cache item
   * @returns {boolean} Whether the item is expired
   */
  isExpired(item) {
    return Date.now() - item.timestamp > item.expires;
  }

  /**
   * Evicts the oldest item from the cache
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Loads persistent cache from storage
   */
  async loadPersistentCache() {
    try {
      const keys = Object.keys(this.storage).filter(key => key.startsWith(this.prefix));
      
      for (const key of keys) {
        const rawKey = key.slice(this.prefix.length);
        const rawValue = this.storage.getItem(key);
        
        if (rawValue) {
          const item = await this.deserializeItem(rawValue);
          if (item && !this.isExpired(item)) {
            this.cache.set(rawKey, item);
          } else {
            this.storage.removeItem(key);
          }
        }
      }

      this.logCacheAction('load_persistent');
    } catch (error) {
      this.logError('load_persistent', error);
    }
  }

  /**
   * Persists an item to storage
   * @param {string} key - Cache key
   * @param {Object} item - Cache item
   */
  async persistItem(key, item) {
    try {
      const serialized = await this.serializeItem(item);
      this.storage.setItem(this.prefix + key, serialized);
    } catch (error) {
      this.logError('persist', error);
      throw error;
    }
  }

  /**
   * Removes a persistent item from storage
   * @param {string} key - Cache key
   */
  async removePersistentItem(key) {
    try {
      this.storage.removeItem(this.prefix + key);
    } catch (error) {
      this.logError('remove_persistent', error);
      throw error;
    }
  }

  /**
   * Clears persistent cache from storage
   */
  async clearPersistentCache() {
    try {
      const keys = Object.keys(this.storage).filter(key => key.startsWith(this.prefix));
      for (const key of keys) {
        this.storage.removeItem(key);
      }
    } catch (error) {
      this.logError('clear_persistent', error);
      throw error;
    }
  }

  /**
   * Serializes a cache item
   * @param {Object} item - Cache item
   * @returns {string} Serialized item
   */
  async serializeItem(item) {
    let serialized = JSON.stringify(item);

    if (this.compressionEnabled) {
      serialized = await this.compress(serialized);
    }

    if (this.encryptionEnabled) {
      serialized = await this.encrypt(serialized);
    }

    return serialized;
  }

  /**
   * Deserializes a cache item
   * @param {string} serialized - Serialized item
   * @returns {Object} Cache item
   */
  async deserializeItem(serialized) {
    try {
      let deserialized = serialized;

      if (this.encryptionEnabled) {
        deserialized = await this.decrypt(deserialized);
      }

      if (this.compressionEnabled) {
        deserialized = await this.decompress(deserialized);
      }

      return JSON.parse(deserialized);
    } catch (error) {
      this.logError('deserialize', error);
      return null;
    }
  }

  /**
   * Compresses a string
   * @param {string} data - Data to compress
   * @returns {string} Compressed data
   */
  async compress(data) {
    // Implement compression logic here
    return data;
  }

  /**
   * Decompresses a string
   * @param {string} data - Data to decompress
   * @returns {string} Decompressed data
   */
  async decompress(data) {
    // Implement decompression logic here
    return data;
  }

  /**
   * Encrypts a string
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  async encrypt(data) {
    // Implement encryption logic here
    return data;
  }

  /**
   * Decrypts a string
   * @param {string} data - Data to decrypt
   * @returns {string} Decrypted data
   */
  async decrypt(data) {
    // Implement decryption logic here
    return data;
  }

  /**
   * Logs a cache action
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  logCacheAction(action, data = {}) {
    securityLogger.log(
      'CACHE',
      `Cache ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs a cache error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'CACHE',
      `Cache error during ${action}: ${error.message}`,
      'ERROR',
      {
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const cacheManager = new CacheManager();
export default cacheManager; 