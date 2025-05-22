/**
 * Audio management system with advanced features and optimizations
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import performanceManager from './performanceManager';
import assetManager from './assetManager';

class AudioManager {
  constructor() {
    this.sounds = new Map();
    this.music = new Map();
    this.context = null;
    this.masterVolume = 1;
    this.musicVolume = 0.7;
    this.soundVolume = 1;
    this.isMuted = false;
    this.isInitialized = false;
    this.maxConcurrent = 8;
    this.fadeTime = 1000;
    this.crossfadeTime = 2000;
    this.audioPool = new Map(); // Pool per il riuso delle istanze audio
    this.poolSize = 32; // Dimensione massima del pool
    this.isReducedLatency = false; // Flag per modalità a bassa latenza
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Formati audio supportati
    this.supportedFormats = {
      mp3: 'audio/mpeg',
      ogg: 'audio/ogg',
      wav: 'audio/wav',
      m4a: 'audio/mp4'
    };

    // Audio categories
    this.categories = {
      MUSIC: 'music',
      EFFECT: 'effect',
      UI: 'ui',
      AMBIENT: 'ambient'
    };

    // Audio priorities
    this.priorities = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    // Bind methods
    this.init = this.init.bind(this);
    this.load = this.load.bind(this);
    this.play = this.play.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Checks audio format support
   * @returns {Object} Supported formats
   */
  checkFormatSupport() {
    const audio = document.createElement('audio');
    const formats = {};
    
    Object.entries(this.supportedFormats).forEach(([format, mime]) => {
      formats[format] = audio.canPlayType(mime) !== '';
    });

    return formats;
  }

  /**
   * Gets the best supported format for the current browser
   * @param {Array} availableFormats - Available audio formats
   * @returns {string} Best format
   */
  getBestFormat(availableFormats) {
    const formats = this.checkFormatSupport();
    const preferred = this.isMobile ? ['m4a', 'mp3', 'ogg'] : ['ogg', 'mp3', 'm4a'];
    
    for (const format of preferred) {
      if (formats[format] && availableFormats.includes(format)) {
        return format;
      }
    }
    
    return availableFormats[0]; // Fallback to first available format
  }

  /**
   * Initializes the audio context with optimizations
   */
  async init() {
    try {
      // Create audio context with optimizations
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const contextOptions = {
        latencyHint: this.isMobile ? 'playback' : 'interactive',
        sampleRate: this.isMobile ? 44100 : 48000
      };
      
      this.context = new AudioContext(contextOptions);

      // Enable low latency mode if available
      if (this.context.audioWorklet) {
        this.isReducedLatency = true;
        await this.context.audioWorklet.addModule('audio-worklet-processor.js');
      }

      // Create master gain node with limiter
      this.masterGain = this.context.createGain();
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -1;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.001;
      this.limiter.release.value = 0.1;

      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.context.destination);

      // Create category gain nodes with individual processing
      this.categoryGains = {};
      Object.values(this.categories).forEach(category => {
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 20000;
        
        gain.connect(filter);
        filter.connect(this.masterGain);
        
        this.categoryGains[category] = { gain, filter };
      });

      // Initialize audio pool
      this.initAudioPool();

      this.isInitialized = true;
      this.logAction('init', { mobile: this.isMobile, reducedLatency: this.isReducedLatency });
      eventManager.emit('audio:initialized');
    } catch (error) {
      this.logError('init', error);
      throw new Error(`Failed to initialize audio system: ${error.message}`);
    }
  }

  /**
   * Initializes the audio instance pool
   */
  initAudioPool() {
    for (let i = 0; i < this.poolSize; i++) {
      const source = this.context.createBufferSource();
      const gainNode = this.context.createGain();
      const panner = this.context.createStereoPanner();
      
      source.connect(gainNode);
      gainNode.connect(panner);
      
      this.audioPool.set(i, {
        source,
        gainNode,
        panner,
        inUse: false
      });
    }
  }

  /**
   * Gets an available audio instance from the pool
   * @returns {Object} Audio instance
   */
  getPoolInstance() {
    for (const [id, instance] of this.audioPool) {
      if (!instance.inUse) {
        instance.inUse = true;
        return instance;
      }
    }
    return null; // Pool exhausted
  }

  /**
   * Loads an audio file with format fallbacks
   * @param {string} id - Audio ID
   * @param {Object} urls - Audio URLs per format
   * @param {string} category - Audio category
   * @param {Object} [options] - Loading options
   * @returns {Promise} Loading promise
   */
  async load(id, urls, category, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      const format = this.getBestFormat(Object.keys(urls));
      const url = urls[format];

      if (!url) {
        throw new Error(`No supported audio format found for: ${id}`);
      }

      // Load audio data with retry logic
      let audioData;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          audioData = await assetManager.load(id, url, assetManager.assetTypes.AUDIO, {
            ...options,
            format
          });
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }

      // Create and cache audio buffer
      const buffer = await this.context.decodeAudioData(await audioData.arrayBuffer());

      // Store audio data with enhanced metadata
      const audio = {
        id,
        url,
        category,
        buffer,
        format,
        options: {
          ...options,
          duration: buffer.duration,
          channels: buffer.numberOfChannels,
          sampleRate: buffer.sampleRate
        },
        instances: new Set(),
        isLoaded: true,
        loadTime: Date.now()
      };

      if (category === this.categories.MUSIC) {
        this.music.set(id, audio);
      } else {
        this.sounds.set(id, audio);
      }

      this.logAction('load', { id, category, format });
      eventManager.emit('audio:loaded', { id, category, format });

      return audio;
    } catch (error) {
      this.logError('load', error, { id, category });
      throw new Error(`Failed to load audio ${id}: ${error.message}`);
    }
  }

  /**
   * Plays an audio file
   * @param {string} id - Audio ID
   * @param {Object} [options] - Playback options
   * @returns {Object} Audio instance
   */
  play(id, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Audio system not initialized');
      }

      const audio = this.sounds.get(id) || this.music.get(id);
      if (!audio) {
        throw new Error(`Audio not found: ${id}`);
      }

      // Check concurrent limit for effects
      if (audio.category !== this.categories.MUSIC) {
        const activeInstances = Array.from(audio.instances)
          .filter(instance => instance.isPlaying);
        if (activeInstances.length >= this.maxConcurrent) {
          // Stop oldest instance
          const oldest = activeInstances[0];
          this.stopInstance(oldest);
        }
      }

      // Create audio instance
      const instance = this.createInstance(audio, options);
      audio.instances.add(instance);

      // Start playback
      instance.source.start(0);
      instance.isPlaying = true;

      this.logAction('play', { id, category: audio.category });
      eventManager.emit('audio:played', { id, category: audio.category });

      return instance;
    } catch (error) {
      this.logError('play', error, { id });
      throw error;
    }
  }

  /**
   * Creates an audio instance
   * @param {Object} audio - Audio data
   * @param {Object} options - Playback options
   * @returns {Object} Audio instance
   */
  createInstance(audio, options = {}) {
    const {
      volume = 1,
      loop = false,
      playbackRate = 1,
      fadeIn = 0,
      fadeOut = 0,
      pan = 0
    } = options;

    // Create source
    const source = this.context.createBufferSource();
    source.buffer = audio.buffer;
    source.loop = loop;
    source.playbackRate.value = playbackRate;

    // Create gain node
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;

    // Create stereo panner
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;

    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.categoryGains[audio.category].gain);

    // Fade in if specified
    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume * this.getCategoryVolume(audio.category),
        this.context.currentTime + fadeIn / 1000
      );
    } else {
      gainNode.gain.value = volume * this.getCategoryVolume(audio.category);
    }

    // Handle end of playback
    source.onended = () => {
      this.stopInstance({ source, gainNode, panner });
    };

    return {
      source,
      gainNode,
      panner,
      isPlaying: false,
      startTime: this.context.currentTime,
      options
    };
  }

  /**
   * Stops an audio instance
   * @param {Object} instance - Audio instance
   * @param {number} [fadeOut] - Fade out duration
   */
  stopInstance(instance, fadeOut = 0) {
    if (!instance.isPlaying) return;

    const { source, gainNode } = instance;

    if (fadeOut > 0) {
      // Fade out
      gainNode.gain.setValueAtTime(gainNode.gain.value, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOut / 1000);
      setTimeout(() => {
        source.stop();
      }, fadeOut);
    } else {
      // Stop immediately
      source.stop();
    }

    instance.isPlaying = false;
  }

  /**
   * Stops all audio
   * @param {string} [category] - Audio category
   */
  stop(category) {
    try {
      const stopAudio = (audio) => {
        audio.instances.forEach(instance => {
          this.stopInstance(instance, this.fadeTime);
        });
      };

      if (category) {
        // Stop specific category
        if (category === this.categories.MUSIC) {
          this.music.forEach(stopAudio);
        } else {
          this.sounds.forEach(stopAudio);
        }
      } else {
        // Stop all audio
        this.music.forEach(stopAudio);
        this.sounds.forEach(stopAudio);
      }

      this.logAction('stop', { category });
      eventManager.emit('audio:stopped', { category });
    } catch (error) {
      this.logError('stop', error, { category });
    }
  }

  /**
   * Plays music with crossfade
   * @param {string} id - Music ID
   * @param {Object} [options] - Playback options
   */
  playMusic(id, options = {}) {
    try {
      // Stop current music with fade out
      this.music.forEach(audio => {
        audio.instances.forEach(instance => {
          this.stopInstance(instance, this.crossfadeTime);
        });
      });

      // Play new music with fade in
      this.play(id, {
        ...options,
        fadeIn: this.crossfadeTime,
        category: this.categories.MUSIC
      });

      this.logAction('play_music', { id });
      eventManager.emit('audio:music_changed', { id });
    } catch (error) {
      this.logError('play_music', error, { id });
    }
  }

  /**
   * Sets the master volume
   * @param {number} volume - Volume (0-1)
   */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = this.masterVolume;
    this.logAction('set_master_volume', { volume });
    eventManager.emit('audio:volume_changed', { type: 'master', volume });
  }

  /**
   * Sets the music volume
   * @param {number} volume - Volume (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.categoryGains[this.categories.MUSIC].gain.value = this.musicVolume;
    this.logAction('set_music_volume', { volume });
    eventManager.emit('audio:volume_changed', { type: 'music', volume });
  }

  /**
   * Sets the sound volume
   * @param {number} volume - Volume (0-1)
   */
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    Object.values(this.categoryGains).forEach(gain => {
      if (gain !== this.categoryGains[this.categories.MUSIC]) {
        gain.gain.value = this.soundVolume;
      }
    });
    this.logAction('set_sound_volume', { volume });
    eventManager.emit('audio:volume_changed', { type: 'sound', volume });
  }

  /**
   * Gets the volume for a category
   * @param {string} category - Audio category
   * @returns {number} Category volume
   */
  getCategoryVolume(category) {
    switch (category) {
      case this.categories.MUSIC:
        return this.musicVolume;
      default:
        return this.soundVolume;
    }
  }

  /**
   * Mutes or unmutes all audio
   * @param {boolean} muted - Whether audio should be muted
   */
  setMuted(muted) {
    this.isMuted = muted;
    this.masterGain.gain.value = muted ? 0 : this.masterVolume;
    this.logAction('set_muted', { muted });
    eventManager.emit('audio:muted', { muted });
  }

  /**
   * Sets the maximum number of concurrent sounds
   * @param {number} max - Maximum concurrent sounds
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = max;
    this.logAction('set_max_concurrent', { max });
  }

  /**
   * Sets the fade time
   * @param {number} time - Fade time in milliseconds
   */
  setFadeTime(time) {
    this.fadeTime = time;
    this.logAction('set_fade_time', { time });
  }

  /**
   * Sets the crossfade time
   * @param {number} time - Crossfade time in milliseconds
   */
  setCrossfadeTime(time) {
    this.crossfadeTime = time;
    this.logAction('set_crossfade_time', { time });
  }

  /**
   * Gets an audio file
   * @param {string} id - Audio ID
   * @returns {Object} Audio data
   */
  get(id) {
    return this.sounds.get(id) || this.music.get(id);
  }

  /**
   * Gets all audio files
   * @returns {Array} Audio files
   */
  getAll() {
    return [
      ...Array.from(this.sounds.values()),
      ...Array.from(this.music.values())
    ];
  }

  /**
   * Gets all loaded audio files
   * @returns {Array} Loaded audio files
   */
  getLoaded() {
    return this.getAll().filter(audio => audio.isLoaded);
  }

  /**
   * Logs an audio action
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'AUDIO',
      `Audio ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs an audio error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   * @param {Object} [data] - Additional data
   */
  logError(action, error, data = {}) {
    securityLogger.log(
      'AUDIO',
      `Audio error during ${action}: ${error.message}`,
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

const audioManager = new AudioManager();
export default audioManager; 