// Game State Manager for centralized state management
class GameStateManager {
  constructor() {
    this.state = {
      game: {
        status: 'idle', // idle, playing, paused, ended
        mode: 'classic', // classic, goldenGoal, timeAttack
        time: 0,
        score: { red: 0, blue: 0 },
        winner: null
      },
      players: new Map(),
      ball: {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        spin: 0
      },
      powerUps: new Set(),
      weather: {
        type: 'none',
        intensity: 0.5
      },
      replay: {
        recording: false,
        playback: false,
        buffer: []
      }
    };

    this.observers = new Map();
    this.history = [];
    this.historyLimit = 50; // Maximum number of states to keep in history
    this.pendingUpdates = new Map();
    this.lastServerState = null;
    this.syncInterval = 100; // ms
    this.recoveryAttempts = 0;
    this.maxRecoveryAttempts = 3;
    this.stateValidationRules = new Map();
    this.stateTransformers = new Map();
    this.performanceMetrics = {
      updateCount: 0,
      lastUpdateTime: Date.now(),
      averageUpdateTime: 0
    };

    // Initialize state validation rules
    this.initStateValidationRules();
    // Initialize state transformers
    this.initStateTransformers();
  }

  // Initialize state validation rules
  initStateValidationRules() {
    this.stateValidationRules.set('game.status', (value) => 
      ['idle', 'playing', 'paused', 'ended'].includes(value));
    
    this.stateValidationRules.set('game.mode', (value) => 
      ['classic', 'goldenGoal', 'timeAttack'].includes(value));
    
    this.stateValidationRules.set('game.score', (value) => 
      typeof value === 'object' && 
      typeof value.red === 'number' && 
      typeof value.blue === 'number' &&
      value.red >= 0 && value.blue >= 0);
    
    this.stateValidationRules.set('ball.position', (value) => 
      typeof value === 'object' && 
      typeof value.x === 'number' && 
      typeof value.y === 'number');
  }

  // Initialize state transformers
  initStateTransformers() {
    this.stateTransformers.set('ball.position', (value) => ({
      x: Math.round(value.x * 100) / 100,
      y: Math.round(value.y * 100) / 100
    }));

    this.stateTransformers.set('ball.velocity', (value) => ({
      x: Math.round(value.x * 100) / 100,
      y: Math.round(value.y * 100) / 100
    }));
  }

  // Subscribe to state changes with performance tracking
  subscribe(component, callback) {
    if (!this.observers.has(component)) {
      this.observers.set(component, new Set());
    }
    this.observers.get(component).add(callback);
    
    // Track subscription performance
    this.trackPerformance('subscribe');
  }

  // Unsubscribe from state changes
  unsubscribe(component, callback) {
    if (this.observers.has(component)) {
      this.observers.get(component).delete(callback);
    }
  }

  // Notify all observers of state changes
  notify(path, value) {
    this.observers.forEach((callbacks, component) => {
      callbacks.forEach(callback => callback(path, value));
    });
  }

  // Update state with enhanced validation and transformation
  setState(path, value, optimistic = true) {
    const startTime = performance.now();
    
    // Validate state update
    if (!this.validateStateUpdate(path, value)) {
      console.error(`Invalid state update for path: ${path}`);
      return false;
    }

    // Transform value if needed
    const transformedValue = this.transformValue(path, value);
    
    const pathArray = path.split('.');
    let current = this.state;
    
    // Navigate to the correct location in the state tree
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }
    
    // Save previous state to history
    this.saveToHistory();
    
    // Store pending update with metadata
    if (optimistic) {
      this.pendingUpdates.set(path, {
        value: transformedValue,
        timestamp: Date.now(),
        metadata: {
          source: 'client',
          version: this.getStateVersion()
        }
      });
    }
    
    // Update the value
    current[pathArray[pathArray.length - 1]] = transformedValue;
    
    // Notify observers with performance tracking
    this.notify(path, transformedValue);
    
    // Track performance
    this.trackPerformance('setState', performance.now() - startTime);
    
    return true;
  }

  // Validate state update
  validateStateUpdate(path, value) {
    const validator = this.stateValidationRules.get(path);
    if (validator) {
      return validator(value);
    }
    return true;
  }

  // Transform value if needed
  transformValue(path, value) {
    const transformer = this.stateTransformers.get(path);
    if (transformer) {
      return transformer(value);
    }
    return value;
  }

  // Track performance metrics
  trackPerformance(operation, duration = 0) {
    this.performanceMetrics.updateCount++;
    const now = Date.now();
    const timeSinceLastUpdate = now - this.performanceMetrics.lastUpdateTime;
    
    if (duration > 0) {
      this.performanceMetrics.averageUpdateTime = 
        (this.performanceMetrics.averageUpdateTime * (this.performanceMetrics.updateCount - 1) + duration) / 
        this.performanceMetrics.updateCount;
    }
    
    this.performanceMetrics.lastUpdateTime = now;
  }

  // Get current state version
  getStateVersion() {
    return this.performanceMetrics.updateCount;
  }

  // Get state value by path
  getState(path) {
    const pathArray = path.split('.');
    let current = this.state;
    
    for (const key of pathArray) {
      if (current === undefined) return undefined;
      current = current[key];
    }
    
    return current;
  }

  // Save current state to history
  saveToHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  // Undo last state change
  undo() {
    if (this.history.length > 0) {
      const previousState = this.history.pop();
      this.state = previousState;
      this.notify('*', this.state);
      return true;
    }
    return false;
  }

  // Reset state to initial values
  reset() {
    this.state = {
      game: {
        status: 'idle',
        mode: 'classic',
        time: 0,
        score: { red: 0, blue: 0 },
        winner: null
      },
      players: new Map(),
      ball: {
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        spin: 0
      },
      powerUps: new Set(),
      weather: {
        type: 'none',
        intensity: 0.5
      },
      replay: {
        recording: false,
        playback: false,
        buffer: []
      }
    };
    this.history = [];
    this.pendingUpdates.clear();
    this.notify('*', this.state);
  }

  // Export current state
  exportState() {
    return JSON.stringify(this.state);
  }

  // Import state with validation
  importState(stateString) {
    try {
      const newState = JSON.parse(stateString);
      if (this.validateState(newState)) {
        this.state = newState;
        this.notify('*', this.state);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  // Validate state structure
  validateState(state) {
    const requiredKeys = ['game', 'players', 'ball', 'powerUps', 'weather', 'replay'];
    return requiredKeys.every(key => state.hasOwnProperty(key));
  }

  // Enhanced sync with server state
  syncWithServer(serverState) {
    if (!this.validateState(serverState)) {
      console.error('Invalid server state received');
      return false;
    }

    const startTime = performance.now();
    
    // Store last server state with metadata
    this.lastServerState = {
      state: serverState,
      timestamp: Date.now(),
      version: serverState.version || this.getStateVersion()
    };
    
    // Handle conflicts with improved resolution
    const conflicts = this.resolveConflicts(serverState);
    
    // Apply pending updates with version checking
    this.applyPendingUpdates(serverState.version);
    
    // Track performance
    this.trackPerformance('syncWithServer', performance.now() - startTime);
    
    return conflicts.length === 0;
  }

  // Enhanced conflict resolution
  resolveConflicts(serverState) {
    const conflicts = this.findConflicts(serverState);
    const resolvedConflicts = [];
    
    conflicts.forEach(conflict => {
      const { path, localValue, serverValue } = conflict;
      
      // Use server value if it's more recent or has higher priority
      if (this.shouldUseServerValue(path, serverValue)) {
        this.setState(path, serverValue, false);
        resolvedConflicts.push({
          path,
          resolution: 'server',
          reason: 'newer_version'
        });
      } else if (this.shouldUseLocalValue(path, localValue)) {
        resolvedConflicts.push({
          path,
          resolution: 'local',
          reason: 'local_priority'
        });
      } else {
        // Merge values if possible
        const mergedValue = this.mergeValues(path, localValue, serverValue);
        if (mergedValue) {
          this.setState(path, mergedValue, false);
          resolvedConflicts.push({
            path,
            resolution: 'merged',
            reason: 'successful_merge'
          });
        }
      }
    });
    
    return resolvedConflicts;
  }

  // Determine if server value should be used
  shouldUseServerValue(path, serverValue) {
    const pendingUpdate = this.pendingUpdates.get(path);
    if (!pendingUpdate) return true;
    
    return serverValue.timestamp > pendingUpdate.timestamp ||
           serverValue.version > pendingUpdate.metadata.version;
  }

  // Determine if local value should be used
  shouldUseLocalValue(path, localValue) {
    // Add custom logic for determining local value priority
    return false;
  }

  // Merge conflicting values
  mergeValues(path, localValue, serverValue) {
    if (typeof localValue !== typeof serverValue) return null;
    
    if (typeof localValue === 'object' && localValue !== null) {
      return { ...localValue, ...serverValue };
    }
    
    return null;
  }

  // Find conflicts between local and server state
  findConflicts(serverState) {
    const conflicts = [];
    
    const compareValues = (local, server, path = '') => {
      if (typeof local !== typeof server) {
        conflicts.push({ path, localValue: local, serverValue: server });
        return;
      }
      
      if (typeof local === 'object' && local !== null) {
        Object.keys(local).forEach(key => {
          compareValues(local[key], server[key], `${path}.${key}`);
        });
      } else if (local !== server) {
        conflicts.push({ path, localValue: local, serverValue: server });
      }
    };
    
    compareValues(this.state, serverState);
    return conflicts;
  }

  // Apply pending updates
  applyPendingUpdates(serverVersion) {
    this.pendingUpdates.forEach((update, path) => {
      if (Date.now() - update.timestamp > 5000) { // 5 second timeout
        this.pendingUpdates.delete(path);
      } else if (update.metadata.version < serverVersion) {
        this.pendingUpdates.delete(path);
      }
    });
  }

  // Enhanced state recovery
  attemptRecovery() {
    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      console.error('Max recovery attempts reached');
      return false;
    }

    this.recoveryAttempts++;
    
    if (this.lastServerState) {
      // Attempt to recover from last known good state
      const recoverySuccess = this.syncWithServer(this.lastServerState.state);
      
      if (recoverySuccess) {
        this.recoveryAttempts = 0;
        return true;
      }
    }
    
    // If server state recovery fails, try to recover from history
    if (this.history.length > 0) {
      const lastGoodState = this.history[this.history.length - 1];
      this.state = JSON.parse(JSON.stringify(lastGoodState));
      this.notify('*', this.state);
      return true;
    }
    
    return false;
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      pendingUpdates: this.pendingUpdates.size,
      historySize: this.history.length,
      recoveryAttempts: this.recoveryAttempts
    };
  }
}

export default GameStateManager; 