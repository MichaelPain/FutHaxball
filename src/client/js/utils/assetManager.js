/**
 * Asset management system
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import cacheManager from './cacheManager';
import performanceManager from './performanceManager';

class AssetManager {
  constructor() {
    this.assets = new Map();
    this.loadingQueue = [];
    this.isLoading = false;
    this.maxConcurrentLoads = 4;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.cacheEnabled = true;
    this.compressionEnabled = false;
    this.assetTypes = {
      IMAGE: 'image',
      AUDIO: 'audio',
      FONT: 'font',
      JSON: 'json',
      TEXT: 'text'
    };

    // Bind methods
    this.loadAsset = this.loadAsset.bind(this);
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * Loads an asset
   * @param {string} id - Asset ID
   * @param {string} url - Asset URL
   * @param {string} type - Asset type
   * @param {Object} [options] - Loading options
   * @returns {Promise} Loading promise
   */
  async load(id, url, type, options = {}) {
    try {
      // Check if asset is already loaded
      if (this.assets.has(id)) {
        return this.assets.get(id);
      }

      // Check cache
      if (this.cacheEnabled) {
        const cached = await this.getFromCache(id);
        if (cached) {
          this.assets.set(id, cached);
          return cached;
        }
      }

      // Add to loading queue
      const loadPromise = new Promise((resolve, reject) => {
        this.loadingQueue.push({
          id,
          url,
          type,
          options,
          resolve,
          reject,
          attempts: 0
        });
      });

      // Start processing queue if not already processing
      if (!this.isLoading) {
        this.processQueue();
      }

      return loadPromise;
    } catch (error) {
      this.logError('load', error);
      throw error;
    }
  }

  /**
   * Processes the loading queue
   */
  async processQueue() {
    if (this.isLoading || this.loadingQueue.length === 0) {
      return;
    }

    this.isLoading = true;

    try {
      while (this.loadingQueue.length > 0) {
        const batch = this.loadingQueue.splice(0, this.maxConcurrentLoads);
        await Promise.all(batch.map(item => this.loadAsset(item)));
      }
    } catch (error) {
      this.logError('process_queue', error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Loads a single asset
   * @param {Object} item - Queue item
   */
  async loadAsset(item) {
    try {
      const { id, url, type, options, resolve, reject, attempts } = item;

      try {
        const asset = await this.fetchAsset(url, type, options);
        
        // Process asset based on type
        const processedAsset = await this.processAsset(asset, type, options);
        
        // Cache if enabled
        if (this.cacheEnabled) {
          await this.cacheAsset(id, processedAsset);
        }

        this.assets.set(id, processedAsset);
        resolve(processedAsset);
        
        this.logAction('load_asset', { id, type });
        eventManager.emit('asset:loaded', { id, type });
      } catch (error) {
        if (attempts < this.retryAttempts) {
          // Retry loading
          setTimeout(() => {
            this.loadingQueue.push({
              ...item,
              attempts: attempts + 1
            });
            this.processQueue();
          }, this.retryDelay);
        } else {
          reject(error);
        }
      }
    } catch (error) {
      this.logError('load_asset', error);
      throw error;
    }
  }

  /**
   * Fetches an asset from URL
   * @param {string} url - Asset URL
   * @param {string} type - Asset type
   * @param {Object} options - Loading options
   * @returns {Promise} Fetched asset
   */
  async fetchAsset(url, type, options) {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers || {},
      credentials: options.credentials || 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`Failed to load asset: ${response.statusText}`);
    }

    switch (type) {
      case this.assetTypes.IMAGE:
        return this.loadImage(url);
      case this.assetTypes.AUDIO:
        return this.loadAudio(url);
      case this.assetTypes.FONT:
        return this.loadFont(url);
      case this.assetTypes.JSON:
        return response.json();
      case this.assetTypes.TEXT:
        return response.text();
      default:
        throw new Error(`Unsupported asset type: ${type}`);
    }
  }

  /**
   * Loads an image
   * @param {string} url - Image URL
   * @returns {Promise} Image element
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Loads an audio file
   * @param {string} url - Audio URL
   * @returns {Promise} Audio element
   */
  loadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => resolve(audio);
      audio.onerror = reject;
      audio.src = url;
    });
  }

  /**
   * Loads a font
   * @param {string} url - Font URL
   * @returns {Promise} Font face
   */
  loadFont(url) {
    return new Promise((resolve, reject) => {
      const font = new FontFace('CustomFont', `url(${url})`);
      font.load()
        .then(loadedFont => {
          document.fonts.add(loadedFont);
          resolve(loadedFont);
        })
        .catch(reject);
    });
  }

  /**
   * Processes an asset based on its type
   * @param {*} asset - Raw asset
   * @param {string} type - Asset type
   * @param {Object} options - Processing options
   * @returns {Promise} Processed asset
   */
  async processAsset(asset, type, options) {
    if (this.compressionEnabled) {
      switch (type) {
        case this.assetTypes.IMAGE:
          return this.compressImage(asset, options);
        case this.assetTypes.AUDIO:
          return this.compressAudio(asset, options);
        default:
          return asset;
      }
    }
    return asset;
  }

  /**
   * Compresses an image
   * @param {HTMLImageElement} image - Image element
   * @param {Object} options - Compression options
   * @returns {Promise} Compressed image
   */
  async compressImage(image, options) {
    // Implement image compression
    return image;
  }

  /**
   * Compresses an audio file
   * @param {HTMLAudioElement} audio - Audio element
   * @param {Object} options - Compression options
   * @returns {Promise} Compressed audio
   */
  async compressAudio(audio, options) {
    // Implement audio compression
    return audio;
  }

  /**
   * Gets an asset from cache
   * @param {string} id - Asset ID
   * @returns {Promise} Cached asset
   */
  async getFromCache(id) {
    try {
      return await cacheManager.get(`asset_${id}`);
    } catch (error) {
      this.logError('get_from_cache', error);
      return null;
    }
  }

  /**
   * Caches an asset
   * @param {string} id - Asset ID
   * @param {*} asset - Asset to cache
   */
  async cacheAsset(id, asset) {
    try {
      await cacheManager.set(`asset_${id}`, asset, {
        persistent: true
      });
    } catch (error) {
      this.logError('cache_asset', error);
    }
  }

  /**
   * Gets a loaded asset
   * @param {string} id - Asset ID
   * @returns {*} Loaded asset
   */
  get(id) {
    return this.assets.get(id);
  }

  /**
   * Checks if an asset is loaded
   * @param {string} id - Asset ID
   * @returns {boolean} Whether the asset is loaded
   */
  isLoaded(id) {
    return this.assets.has(id);
  }

  /**
   * Unloads an asset
   * @param {string} id - Asset ID
   */
  async unload(id) {
    try {
      const asset = this.assets.get(id);
      if (asset) {
        // Clean up asset based on type
        if (asset instanceof HTMLImageElement) {
          asset.src = '';
        } else if (asset instanceof HTMLAudioElement) {
          asset.src = '';
          asset.load();
        }

        this.assets.delete(id);
        await cacheManager.delete(`asset_${id}`);

        this.logAction('unload', { id });
        eventManager.emit('asset:unloaded', { id });
      }
    } catch (error) {
      this.logError('unload', error);
    }
  }

  /**
   * Unloads all assets
   */
  async unloadAll() {
    try {
      const ids = Array.from(this.assets.keys());
      await Promise.all(ids.map(id => this.unload(id)));
      
      this.logAction('unload_all');
      eventManager.emit('asset:unloaded_all');
    } catch (error) {
      this.logError('unload_all', error);
    }
  }

  /**
   * Sets the maximum number of concurrent loads
   * @param {number} max - Maximum concurrent loads
   */
  setMaxConcurrentLoads(max) {
    if (max < 1) {
      throw new Error('Max concurrent loads must be at least 1');
    }
    this.maxConcurrentLoads = max;
  }

  /**
   * Enables or disables caching
   * @param {boolean} enabled - Whether caching should be enabled
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = enabled;
  }

  /**
   * Enables or disables compression
   * @param {boolean} enabled - Whether compression should be enabled
   */
  setCompressionEnabled(enabled) {
    this.compressionEnabled = enabled;
  }

  /**
   * Gets loading progress
   * @returns {Object} Loading progress
   */
  getProgress() {
    const total = this.loadingQueue.length + this.assets.size;
    const loaded = this.assets.size;
    return {
      total,
      loaded,
      progress: total > 0 ? loaded / total : 1
    };
  }

  /**
   * Logs an asset action
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'ASSET',
      `Asset ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs an asset error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'ASSET',
      `Asset error during ${action}: ${error.message}`,
      'ERROR',
      {
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const assetManager = new AssetManager();
export default assetManager; 