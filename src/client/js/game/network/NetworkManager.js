// NetworkManager.js - Advanced network management and error handling system
export class NetworkManager {
    constructor(options = {}) {
        this.options = {
            updateRate: options.updateRate || 60, // Hz
            interpolationDelay: options.interpolationDelay || 100, // ms
            maxExtrapolation: options.maxExtrapolation || 200, // ms
            snapshotRate: options.snapshotRate || 20, // Hz
            compression: options.compression !== false,
            deltaCompression: options.deltaCompression !== false,
            maxReconnectAttempts: options.maxReconnectAttempts || 5,
            reconnectBackoff: options.reconnectBackoff || 2000, // ms
            pingInterval: options.pingInterval || 1000, // ms
            timeoutThreshold: options.timeoutThreshold || 5000, // ms
            packetLossThreshold: options.packetLossThreshold || 0.1, // 10%
            jitterThreshold: options.jitterThreshold || 50, // ms
            bandwidthAdaptation: options.bandwidthAdaptation !== false,
            minUpdateRate: options.minUpdateRate || 20, // Hz
            maxUpdateRate: options.maxUpdateRate || 60, // Hz
            qualityThresholds: options.qualityThresholds || {
                high: 0.8,
                medium: 0.5,
                low: 0.3
            }
        };

        // Network state
        this.state = {
            connected: false,
            latency: 0,
            jitter: 0,
            packetLoss: 0,
            lastUpdate: 0,
            lastSnapshot: 0,
            sequence: 0,
            reconnectAttempts: 0,
            lastPing: 0,
            lastPong: 0,
            quality: 1.0 // 0-1 scale
        };

        // Interpolation buffer
        this.interpolation = {
            buffer: [],
            maxSize: 10,
            currentIndex: 0
        };

        // Message queue
        this.messageQueue = [];
        this.maxQueueSize = 100;

        // Error tracking
        this.errors = [];
        this.maxErrors = 100;

        // Event handlers
        this.handlers = new Map();

        // Initialize WebSocket
        this.initWebSocket();
    }

    // Initialize WebSocket connection
    initWebSocket() {
        try {
            // Close existing connection if any
            if (this.ws) {
                this.ws.close();
            }

            // Create new WebSocket connection
            this.ws = new WebSocket(this.getWebSocketUrl());
            
            // Set binary type to arraybuffer for better performance
            this.ws.binaryType = 'arraybuffer';
            
            // Setup connection timeout
            this.connectionTimeout = setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    this.handleError('connection_timeout', new Error('WebSocket connection timeout'));
                    this.ws.close();
                }
            }, 10000);

            this.setupWebSocketHandlers();
        } catch (error) {
            this.handleError('websocket_init', error);
        }
    }

    // Get WebSocket URL with fallback
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    }

    // Setup WebSocket event handlers
    setupWebSocketHandlers() {
        this.ws.onopen = () => {
            clearTimeout(this.connectionTimeout);
            this.handleConnection();
        };

        this.ws.onclose = (event) => {
            clearTimeout(this.connectionTimeout);
            this.handleDisconnection(event);
        };

        this.ws.onerror = (error) => {
            clearTimeout(this.connectionTimeout);
            this.handleError('websocket_error', error);
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };
    }

    // Handle successful connection
    handleConnection() {
        this.state.connected = true;
        this.state.reconnectAttempts = 0;
        this.startPingInterval();
        this.emit('connected');
    }

    // Handle disconnection with enhanced recovery
    handleDisconnection(event) {
        this.state.connected = false;
        this.stopPingInterval();
        this.emit('disconnected', event);

        // Analyze disconnection reason
        const reason = this.analyzeDisconnectionReason(event);
        
        // Determine reconnection strategy
        const strategy = this.getReconnectionStrategy(reason);
        
        // Execute reconnection strategy
        this.executeReconnectionStrategy(strategy);
    }

    // Analyze disconnection reason
    analyzeDisconnectionReason(event) {
        const reasons = {
            NORMAL_CLOSURE: 'normal',
            GOING_AWAY: 'client_disconnected',
            PROTOCOL_ERROR: 'protocol_error',
            UNSUPPORTED_DATA: 'unsupported_data',
            NO_STATUS_RECEIVED: 'no_status',
            ABNORMAL_CLOSURE: 'abnormal',
            INVALID_FRAME_PAYLOAD_DATA: 'invalid_data',
            POLICY_VIOLATION: 'policy_violation',
            MESSAGE_TOO_BIG: 'message_too_big',
            INTERNAL_SERVER_ERROR: 'server_error'
        };

        return {
            code: event.code,
            reason: reasons[event.code] || 'unknown',
            wasClean: event.wasClean,
            timestamp: Date.now()
        };
    }

    // Get reconnection strategy based on disconnection reason
    getReconnectionStrategy(reason) {
        const strategies = {
            normal: {
                action: 'no_reconnect',
                delay: 0
            },
            client_disconnected: {
                action: 'immediate_reconnect',
                delay: 0
            },
            protocol_error: {
                action: 'reset_and_reconnect',
                delay: 1000
            },
            unsupported_data: {
                action: 'reset_and_reconnect',
                delay: 2000
            },
            no_status: {
                action: 'backoff_reconnect',
                delay: this.getReconnectDelay()
            },
            abnormal: {
                action: 'backoff_reconnect',
                delay: this.getReconnectDelay()
            },
            invalid_data: {
                action: 'reset_and_reconnect',
                delay: 2000
            },
            policy_violation: {
                action: 'no_reconnect',
                delay: 0
            },
            message_too_big: {
                action: 'reduce_payload_and_reconnect',
                delay: 1000
            },
            server_error: {
                action: 'backoff_reconnect',
                delay: this.getReconnectDelay()
            },
            unknown: {
                action: 'backoff_reconnect',
                delay: this.getReconnectDelay()
            }
        };

        return strategies[reason.reason] || strategies.unknown;
    }

    // Execute reconnection strategy
    executeReconnectionStrategy(strategy) {
        switch (strategy.action) {
            case 'no_reconnect':
                this.emit('connection_closed', 'Connection closed normally');
                break;
            case 'immediate_reconnect':
                this.initWebSocket();
                break;
            case 'reset_and_reconnect':
                this.resetState();
                setTimeout(() => this.initWebSocket(), strategy.delay);
                break;
            case 'backoff_reconnect':
                if (this.state.reconnectAttempts < this.options.maxReconnectAttempts) {
                    setTimeout(() => this.attemptReconnection(), strategy.delay);
                } else {
                    this.handleError('max_reconnect_attempts', new Error('Max reconnection attempts reached'));
                }
                break;
            case 'reduce_payload_and_reconnect':
                this.options.maxMessageSize = Math.floor(this.options.maxMessageSize * 0.8);
                setTimeout(() => this.initWebSocket(), strategy.delay);
                break;
        }
    }

    // Start ping interval for connection monitoring
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.state.connected) {
                const pingMessage = {
                    type: 'ping',
                    timestamp: Date.now(),
                    sequence: this.state.sequence
                };
                this.send(pingMessage);
                this.state.lastPing = Date.now();
            }
        }, this.options.pingInterval);
    }

    // Stop ping interval
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // Send ping message
    sendPing() {
        this.state.lastPing = Date.now();
        this.send({ type: 'ping', timestamp: this.state.lastPing });
    }

    // Handle incoming message
    handleMessage(event) {
        try {
            const message = this.parseMessage(event.data);
            this.updateNetworkMetrics(message);

            switch (message.type) {
                case 'pong':
                    this.handlePong(message);
                    break;
                case 'snapshot':
                    this.handleSnapshot(message);
                    break;
                case 'error':
                    this.handleError('server_error', new Error(message.error));
                    break;
                default:
                    this.emit('message', message);
            }
        } catch (error) {
            this.handleError('message_parse', error);
        }
    }

    // Parse incoming message
    parseMessage(data) {
        try {
            return JSON.parse(data);
        } catch (error) {
            throw new Error('Failed to parse message');
        }
    }

    // Update network metrics
    updateNetworkMetrics(message) {
        const now = Date.now();
        const latency = now - message.timestamp;
        
        // Update latency with exponential moving average
        this.state.latency = this.state.latency * 0.8 + latency * 0.2;
        
        // Calculate jitter
        const jitter = Math.abs(latency - this.state.latency);
        this.state.jitter = this.state.jitter * 0.8 + jitter * 0.2;
        
        // Update packet loss
        if (message.sequence) {
            const expectedSequence = (this.state.sequence + 1) % 65536;
            if (message.sequence !== expectedSequence) {
                this.state.packetLoss = this.state.packetLoss * 0.9 + 0.1;
            } else {
                this.state.packetLoss *= 0.9;
            }
            this.state.sequence = message.sequence;
        }

        // Calculate network quality score
        const latencyScore = Math.max(0, 1 - (this.state.latency / 1000));
        const jitterScore = Math.max(0, 1 - (this.state.jitter / 100));
        const packetLossScore = 1 - this.state.packetLoss;
        
        this.state.quality = (latencyScore * 0.4 + jitterScore * 0.3 + packetLossScore * 0.3);
        
        // Adjust update rate based on network quality
        if (this.options.bandwidthAdaptation) {
            const targetRate = this.options.minUpdateRate + 
                             (this.options.maxUpdateRate - this.options.minUpdateRate) * 
                             this.state.quality;
            this.options.updateRate = Math.round(targetRate);
        }
    }

    // Handle pong message
    handlePong(message) {
        const now = Date.now();
        const roundTripTime = now - message.timestamp;
        
        // Update latency with this ping
        this.state.latency = this.state.latency * 0.8 + roundTripTime * 0.2;
        
        // Check for timeout
        if (now - this.state.lastPong > this.options.timeoutThreshold) {
            this.handleError('ping_timeout', new Error('Ping timeout'));
        }
        
        this.state.lastPong = now;
    }

    // Handle snapshot message
    handleSnapshot(message) {
        if (this.options.deltaCompression) {
            this.applyDeltaSnapshot(message);
        } else {
            this.applyFullSnapshot(message);
        }
    }

    // Apply delta-compressed snapshot
    applyDeltaSnapshot(message) {
        const snapshot = {
            timestamp: message.timestamp,
            sequence: message.sequence,
            state: this.mergeDeltaState(message.delta)
        };

        this.addToInterpolationBuffer(snapshot);
    }

    // Apply full snapshot
    applyFullSnapshot(message) {
        const snapshot = {
            timestamp: message.timestamp,
            sequence: message.sequence,
            state: message.state
        };

        this.addToInterpolationBuffer(snapshot);
    }

    // Add snapshot to interpolation buffer
    addToInterpolationBuffer(snapshot) {
        this.interpolation.buffer.push(snapshot);
        if (this.interpolation.buffer.length > this.interpolation.maxSize) {
            this.interpolation.buffer.shift();
        }
    }

    // Merge delta state with current state
    mergeDeltaState(delta) {
        // Implement delta merging logic
        return { ...this.getCurrentState(), ...delta };
    }

    // Get current interpolated state
    getCurrentState() {
        if (this.interpolation.buffer.length < 2) {
            return this.interpolation.buffer[0]?.state || {};
        }

        const now = Date.now();
        const targetTime = now - this.options.interpolationDelay;

        // Find the two snapshots to interpolate between
        let before = null;
        let after = null;

        for (let i = 0; i < this.interpolation.buffer.length - 1; i++) {
            const current = this.interpolation.buffer[i];
            const next = this.interpolation.buffer[i + 1];

            if (current.timestamp <= targetTime && next.timestamp >= targetTime) {
                before = current;
                after = next;
                break;
            }
        }

        if (!before || !after) {
            return this.interpolation.buffer[this.interpolation.buffer.length - 1]?.state || {};
        }

        // Interpolate between snapshots
        const alpha = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
        return this.interpolateStates(before.state, after.state, alpha);
    }

    // Interpolate between two states
    interpolateStates(state1, state2, alpha) {
        const result = {};

        for (const key in state2) {
            if (typeof state2[key] === 'number') {
                result[key] = state1[key] + (state2[key] - state1[key]) * alpha;
            } else {
                result[key] = state2[key];
            }
        }

        return result;
    }

    // Send message to server
    send(message) {
        if (!this.state.connected) {
            this.queueMessage(message);
            return;
        }

        try {
            const data = this.options.compression ? this.compressMessage(message) : JSON.stringify(message);
            this.ws.send(data);
        } catch (error) {
            this.handleError('send_failed', error);
            this.queueMessage(message);
        }
    }

    // Queue message for later sending
    queueMessage(message) {
        if (this.messageQueue.length >= this.maxQueueSize) {
            // Remove oldest message if queue is full
            this.messageQueue.shift();
        }
        this.messageQueue.push({
            message,
            timestamp: Date.now(),
            attempts: 0
        });
    }

    // Process message queue
    processMessageQueue() {
        if (!this.state.connected || this.messageQueue.length === 0) return;

        const now = Date.now();
        const messagesToSend = this.messageQueue.filter(entry => {
            // Don't retry messages that are too old
            if (now - entry.timestamp > 30000) return false;
            // Don't retry messages that have failed too many times
            if (entry.attempts >= 3) return false;
            return true;
        });

        messagesToSend.forEach(entry => {
            try {
                this.send(entry.message);
                entry.attempts++;
            } catch (error) {
                this.handleError('queue_send_failed', error);
            }
        });

        // Remove successfully sent messages
        this.messageQueue = this.messageQueue.filter(entry => 
            entry.attempts < 3 && now - entry.timestamp <= 30000
        );
    }

    // Compress message data
    compressMessage(message) {
        try {
            const jsonString = JSON.stringify(message);
            // Use LZMA compression if available, otherwise fallback to simple compression
            if (typeof LZMA !== 'undefined') {
                return LZMA.compress(jsonString, 9);
            } else {
                // Simple compression: remove whitespace and use short property names
                return jsonString.replace(/\s+/g, '');
            }
        } catch (error) {
            this.handleError('compression_failed', error);
            return JSON.stringify(message); // Fallback to uncompressed
        }
    }

    // Decompress message data
    decompressMessage(data) {
        try {
            if (typeof LZMA !== 'undefined' && data instanceof Uint8Array) {
                return JSON.parse(LZMA.decompress(data));
            } else {
                return JSON.parse(data);
            }
        } catch (error) {
            this.handleError('decompression_failed', error);
            throw error;
        }
    }

    // Enhanced error handling with recovery strategies
    handleError(type, error) {
        // Add error to tracking with enhanced metadata
        const errorEntry = {
            type,
            error: error.message,
            timestamp: Date.now(),
            state: { ...this.state },
            size: error.size || 0,
            sequence: error.sequence,
            recoveryAttempted: false,
            stack: error.stack,
            code: error.code,
            details: error.details || {}
        };

        this.errors.push(errorEntry);

        // Trim error history if needed
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log error with enhanced context
        console.warn(`Network Error [${type}]:`, {
            message: error.message,
            code: error.code,
            state: this.state,
            recoveryStrategy: this.getRecoveryStrategy(type)
        });

        // Determine recovery strategy based on error type and context
        const recoveryStrategy = this.determineRecoveryStrategy(type, error);
        this.executeRecoveryStrategy(recoveryStrategy, error);

        // Mark error as recovery attempted
        errorEntry.recoveryAttempted = true;

        // Emit error event with enhanced context
        this.emit('error', {
            type,
            error,
            context: {
                quality: this.state.quality,
                latency: this.state.latency,
                packetLoss: this.state.packetLoss,
                recoveryStrategy: recoveryStrategy,
                errorHistory: this.getErrorHistory(type)
            }
        });
    }

    // Determine the best recovery strategy based on error type and context
    determineRecoveryStrategy(type, error) {
        const recentErrors = this.getRecentErrors(5);
        const errorFrequency = this.getErrorFrequency(type);
        
        // Check for error patterns
        const isErrorPattern = this.detectErrorPattern(recentErrors);
        
        if (isErrorPattern) {
            return {
                type: 'pattern_based',
                action: 'reset_connection',
                priority: 'high'
            };
        }

        // Base strategy on error type
        switch (type) {
            case 'websocket_init':
            case 'websocket_error':
                return {
                    type: 'connection',
                    action: error.code === 'ECONNREFUSED' ? 'immediate_reconnect' : 'backoff_reconnect',
                    priority: 'high'
                };
            case 'message_parse':
                return {
                    type: 'data',
                    action: 'clear_queue_and_resync',
                    priority: 'medium'
                };
            case 'reconnection_failed':
                return {
                    type: 'connection',
                    action: 'progressive_backoff',
                    priority: 'high'
                };
            case 'server_error':
                return {
                    type: 'server',
                    action: this.getServerErrorAction(error),
                    priority: 'medium'
                };
            case 'max_reconnect_attempts':
                return {
                    type: 'connection',
                    action: 'reset_and_notify',
                    priority: 'critical'
                };
            case 'packet_loss':
                return {
                    type: 'performance',
                    action: 'optimize_network',
                    priority: 'medium'
                };
            default:
                return {
                    type: 'generic',
                    action: 'maintain_connection',
                    priority: 'low'
                };
        }
    }

    // Execute the determined recovery strategy
    executeRecoveryStrategy(strategy, error) {
        switch (strategy.action) {
            case 'immediate_reconnect':
                this.attemptReconnection();
                break;
            case 'backoff_reconnect':
                setTimeout(() => this.attemptReconnection(), this.getReconnectDelay());
                break;
            case 'clear_queue_and_resync':
                this.messageQueue = [];
                this.send({ type: 'request_full_state' });
                break;
            case 'progressive_backoff':
                this.handleReconnectionError(error);
                break;
            case 'reset_connection':
                this.resetState();
                this.initWebSocket();
                break;
            case 'optimize_network':
                this.optimizeNetworkParameters();
                break;
            case 'reset_and_notify':
                this.handleMaxReconnectError(error);
                break;
            case 'maintain_connection':
                this.handleGenericError(error);
                break;
        }

        // Log recovery attempt
        console.info(`Executing recovery strategy: ${strategy.action}`, {
            errorType: error.type,
            priority: strategy.priority
        });
    }

    // Get recent errors for pattern detection
    getRecentErrors(count) {
        return this.errors.slice(-count);
    }

    // Get error frequency for a specific type
    getErrorFrequency(type) {
        const recentErrors = this.getRecentErrors(10);
        return recentErrors.filter(e => e.type === type).length;
    }

    // Detect error patterns in recent errors
    detectErrorPattern(recentErrors) {
        if (recentErrors.length < 3) return false;

        // Check for repeated errors
        const errorTypes = recentErrors.map(e => e.type);
        const uniqueTypes = new Set(errorTypes);
        
        if (uniqueTypes.size === 1) return true;

        // Check for increasing latency
        const latencies = recentErrors.map(e => e.state.latency);
        const isIncreasingLatency = latencies.every((lat, i) => 
            i === 0 || lat > latencies[i - 1]
        );

        return isIncreasingLatency;
    }

    // Get server-specific error action
    getServerErrorAction(error) {
        switch (error.code) {
            case 'SERVER_OVERLOAD':
                return 'reduce_update_rate';
            case 'INVALID_STATE':
                return 'request_full_state';
            case 'RATE_LIMIT':
                return 'throttle_requests';
            default:
                return 'maintain_connection';
        }
    }

    // Get error history for a specific type
    getErrorHistory(type) {
        return this.errors
            .filter(e => e.type === type)
            .map(e => ({
                timestamp: e.timestamp,
                message: e.error,
                code: e.code
            }));
    }

    // Optimize network parameters based on current conditions
    optimizeNetworkParameters() {
        const quality = this.state.quality;
        
        // Adjust update rate based on quality
        if (quality < 0.3) {
            this.options.updateRate = this.options.minUpdateRate;
        } else if (quality > 0.8) {
            this.options.updateRate = this.options.maxUpdateRate;
        } else {
            this.options.updateRate = Math.floor(
                this.options.minUpdateRate + 
                (this.options.maxUpdateRate - this.options.minUpdateRate) * quality
            );
        }

        // Adjust interpolation buffer
        this.interpolation.maxSize = Math.max(
            5,
            Math.min(20, Math.floor(10 * (1 + this.state.packetLoss)))
        );

        // Enable/disable compression based on conditions
        this.options.compression = this.state.latency > 100;
        this.options.deltaCompression = this.state.packetLoss > 0.05;

        // Emit optimization event
        this.emit('network_optimized', {
            updateRate: this.options.updateRate,
            bufferSize: this.interpolation.maxSize,
            compression: this.options.compression,
            deltaCompression: this.options.deltaCompression
        });
    }

    // Get reconnection delay with exponential backoff
    getReconnectDelay() {
        return Math.min(
            this.options.reconnectBackoff * Math.pow(2, this.state.reconnectAttempts),
            30000 // Max 30 seconds
        );
    }

    // Reset network state
    resetState() {
        this.state = {
            connected: false,
            latency: 0,
            jitter: 0,
            packetLoss: 0,
            lastUpdate: 0,
            lastSnapshot: 0,
            sequence: 0,
            reconnectAttempts: 0,
            lastPing: 0,
            lastPong: 0,
            quality: 1.0
        };
        
        this.interpolation.buffer = [];
        this.messageQueue = [];
        this.errors = [];
    }

    // Enhanced message compression using LZ4-like algorithm
    compressMessage(message) {
        const data = JSON.stringify(message);
        const compressed = this.lz4Compress(data);
        return compressed;
    }

    // LZ4-like compression implementation
    lz4Compress(data) {
        const result = [];
        let pos = 0;
        const len = data.length;

        while (pos < len) {
            let matchLen = 0;
            let matchPos = 0;

            // Find longest match
            for (let i = Math.max(0, pos - 4096); i < pos; i++) {
                let j = 0;
                while (pos + j < len && data[i + j] === data[pos + j] && j < 255) {
                    j++;
                }
                if (j > matchLen) {
                    matchLen = j;
                    matchPos = i;
                }
            }

            if (matchLen >= 4) {
                // Literal + match
                result.push(0, matchLen, (pos - matchPos) >> 8, (pos - matchPos) & 0xFF);
                pos += matchLen;
            } else {
                // Literal
                result.push(1, data.charCodeAt(pos));
                pos++;
            }
        }

        return new Uint8Array(result);
    }

    // Enhanced state interpolation
    interpolateState(currentTime) {
        if (this.interpolation.buffer.length < 2) return null;

        const targetTime = currentTime - this.options.interpolationDelay;
        let i = this.interpolation.buffer.length - 1;

        while (i > 0 && this.interpolation.buffer[i].timestamp > targetTime) {
            i--;
        }

        if (i === 0) return this.interpolation.buffer[0].state;

        const alpha = (targetTime - this.interpolation.buffer[i].timestamp) /
                     (this.interpolation.buffer[i + 1].timestamp - this.interpolation.buffer[i].timestamp);

        return this.lerpState(this.interpolation.buffer[i].state, this.interpolation.buffer[i + 1].state, alpha);
    }

    // Linear interpolation between states
    lerpState(state1, state2, alpha) {
        const result = {};
        for (const key in state1) {
            if (typeof state1[key] === 'number') {
                result[key] = state1[key] + (state2[key] - state1[key]) * alpha;
            } else {
                result[key] = state2[key];
            }
        }
        return result;
    }

    // Add event handler
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    // Remove event handler
    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }

    // Emit event
    emit(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => handler(data));
        }
    }

    // Get network statistics
    getStats() {
        return {
            connected: this.state.connected,
            latency: this.state.latency,
            jitter: this.state.jitter,
            packetLoss: this.state.packetLoss,
            quality: this.state.quality,
            reconnectAttempts: this.state.reconnectAttempts,
            queueSize: this.messageQueue.length,
            bufferSize: this.interpolation.buffer.length,
            errors: this.errors.length
        };
    }

    // Clean up resources
    destroy() {
        this.stopPingInterval();
        if (this.ws) {
            this.ws.close();
        }
        this.handlers.clear();
        this.interpolation.buffer = [];
        this.messageQueue = [];
        this.errors = [];
    }

    // Get recovery strategy description
    getRecoveryStrategy(errorType) {
        const strategies = {
            websocket_init: 'Immediate reconnection with exponential backoff',
            websocket_error: 'Connection reset with quality-based throttling',
            message_parse: 'Message queue clear and full state request',
            reconnection_failed: 'Progressive backoff with user notification',
            server_error: 'Server-specific recovery with rate limiting',
            max_reconnect_attempts: 'State reset and user notification',
            packet_loss: 'Missing packet request with buffer adjustment',
            default: 'Generic recovery with connection maintenance'
        };

        return strategies[errorType] || strategies.default;
    }

    // Monitor network quality
    monitorNetworkQuality() {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.state.lastUpdate;
        
        // Calculate packet loss rate
        const expectedPackets = timeSinceLastUpdate / (1000 / this.options.updateRate);
        const actualPackets = this.state.sequence;
        this.state.packetLoss = Math.max(0, 1 - (actualPackets / expectedPackets));

        // Calculate jitter
        const latencySamples = this.getRecentLatencySamples(10);
        if (latencySamples.length > 1) {
            const jitter = this.calculateJitter(latencySamples);
            this.state.jitter = jitter;
        }

        // Update network quality score
        this.updateNetworkQuality();

        // Adjust update rate based on network conditions
        this.adaptUpdateRate();

        // Log network metrics if quality is low
        if (this.state.quality < this.options.qualityThresholds.low) {
            console.warn('Low network quality detected:', this.getStats());
        }
    }

    // Get recent latency samples
    getRecentLatencySamples(count) {
        return this.errors
            .filter(e => e.type === 'ping_timeout' || e.type === 'websocket_error')
            .slice(-count)
            .map(e => e.state.latency);
    }

    // Calculate jitter from latency samples
    calculateJitter(samples) {
        let jitter = 0;
        for (let i = 1; i < samples.length; i++) {
            jitter += Math.abs(samples[i] - samples[i - 1]);
        }
        return jitter / (samples.length - 1);
    }

    // Update network quality score
    updateNetworkQuality() {
        const latencyScore = Math.max(0, 1 - (this.state.latency / 1000));
        const jitterScore = Math.max(0, 1 - (this.state.jitter / this.options.jitterThreshold));
        const packetLossScore = 1 - this.state.packetLoss;

        this.state.quality = (latencyScore * 0.4 + jitterScore * 0.3 + packetLossScore * 0.3);
    }

    // Adapt update rate based on network conditions
    adaptUpdateRate() {
        if (!this.options.bandwidthAdaptation) return;

        let newUpdateRate = this.options.updateRate;

        if (this.state.quality < this.options.qualityThresholds.low) {
            newUpdateRate = this.options.minUpdateRate;
        } else if (this.state.quality > this.options.qualityThresholds.high) {
            newUpdateRate = this.options.maxUpdateRate;
        } else {
            // Linear interpolation between min and max update rates
            const qualityRange = this.options.qualityThresholds.high - this.options.qualityThresholds.low;
            const qualityPosition = (this.state.quality - this.options.qualityThresholds.low) / qualityRange;
            newUpdateRate = this.options.minUpdateRate + 
                (this.options.maxUpdateRate - this.options.minUpdateRate) * qualityPosition;
        }

        // Smooth rate changes
        this.options.updateRate = this.options.updateRate * 0.7 + newUpdateRate * 0.3;
    }
} 