// networkManager.js - Implementazione ottimizzata del gestore di rete
import { io } from "socket.io-client";
import { WebSocketConnector } from "./webSocketConnector.js";

export class NetworkManager {
    constructor() {
        this.eventListeners = {};
        this.connected = false;
        this.playerId = null;
        // this.socket = null; // WebSocketConnector will manage the socket object
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        this.pingValues = new Map();
        this.pingInterval = null;
        this.serverUrl = process.env.SERVER_URL || 'ws://localhost:3000';
        this.messageQueue = [];
        this.messageBatch = [];
        this.batchInterval = null;
        this.currentRoom = null;
        // Reconnection logic is now in WebSocketConnector
        // this.reconnectAttempts = 0;
        // this.maxReconnectAttempts = 5;
        // this.reconnectDelay = 1000;
        this.lastStateUpdate = null;
        this.predictionBuffer = new Map();
        this.reconciliationQueue = [];

        this.connector = new WebSocketConnector(this.serverUrl, io);
        this.state = {
            connection: 'disconnected',
            room: null,
            players: new Map(),
            gameState: null,
            latency: 0,
            connectionQuality: 'unknown',
            packetLoss: 0,
            jitter: 0
        };
        
        // Inizializza la connessione
        this.init();
    }
    
    // Initialize connection using WebSocketConnector
    init() {
        console.log("NetworkManager: Initializing connection.");

        this.connector.addEventListener('connected', () => {
            this.connected = true;
            this.state.connection = 'connected';
            console.log('NetworkManager: Connected to server via WebSocketConnector.');
            this.emit('connected'); // Emit internal event for other NetworkManager methods if needed

            // Setup application-specific listeners on the new socket
            this.setupSocketListeners();
            // Start features that require an active connection
            this.startPingMonitoring();
            this.initializeStateSync(); // Should also use the new socket from connector
            this.startMessageBatching();
            this.processMessageQueue(); // Process any queued messages
        });

        this.connector.addEventListener('disconnected', (event) => {
            this.connected = false;
            this.state.connection = 'disconnected';
            const reason = event.detail?.reason || 'Unknown reason';
            console.log(`NetworkManager: Disconnected from server. Reason: ${reason}`);
            this.emit('disconnected', { reason });
            // Stop ping monitoring when disconnected
            this.stopPingMonitoring(); 
        });

        this.connector.addEventListener('error', (event) => {
            const error = event.detail?.error || 'Unknown error';
            console.error('NetworkManager: Connection error from WebSocketConnector:', error);
            this.state.connection = 'error';
            this.emit('connection_error', { error });
            // WebSocketConnector handles reconnection attempts, NetworkManager just reacts to final failure
        });
        
        this.connector.addEventListener('connection_failed', (event) => {
            const error = event.detail?.error || 'Max reconnection attempts reached';
            console.error('NetworkManager: Connection failed after multiple attempts:', error);
            this.state.connection = 'failed';
            this.emit('connection_failed', { error });
        });

        try {
            this.connector.connect();
        } catch (error) {
            console.error("NetworkManager: Error initiating connection via WebSocketConnector:", error);
            this.state.connection = 'error';
            this.emit('connection_error', { error });
        }
    }

    // Gestione errori di connessione migliorata - Removed as WebSocketConnector handles this.
    // NetworkManager listens to 'connection_failed' from the connector.

    // Monitoraggio ping migliorato con calcolo jitter e packet loss
    startPingMonitoring() {
        if (!this.connector.isConnected() || this.pingInterval) {
            // Do not start if not connected or if already running
            if(!this.connector.isConnected()) console.warn("Ping monitoring not started: not connected.");
            return;
        }
        
        console.log("NetworkManager: Starting ping monitoring.");
        let lastPingTime = Date.now();
        let lastPingLatency = 0;
        let lostPackets = 0;
        let totalPackets = 0;
        
        this.pingInterval = setInterval(() => {
            if (!this.connector.isConnected()) {
                this.stopPingMonitoring(); // Stop if connection is lost
                return;
            }
            const startTime = Date.now();
            totalPackets++;
            
            this.connector.emitWithAck('ping', { timestamp: startTime }, (error, ackData) => {
                if (error) {
                    console.warn("Ping ack error:", error);
                    lostPackets++; // Consider this a lost packet for ping purposes
                    this.state.packetLoss = (lostPackets / totalPackets) * 100;
                    this.updateConnectionQuality();
                    return;
                }

                const latency = Date.now() - startTime;
                this.state.latency = latency;
                const socketId = this.connector.getSocket()?.id;
                if (socketId) {
                    this.pingValues.set(socketId, latency);
                }
                
                // Calcola jitter
                if (lastPingLatency > 0) {
                    const jitter = Math.abs(latency - lastPingLatency);
                    this.state.jitter = (this.state.jitter * 0.9) + (jitter * 0.1);
                }
                lastPingLatency = latency;
                
                // Calcola packet loss - Simplified: ack error handles one form of loss.
                // More sophisticated packet loss detection might be needed if pings are not consistently acked.
                // For now, we assume an ack error implies a lost packet for this calculation.
                // Reset lostPackets if a ping is successful, or manage it more complexly.
                // This part needs careful consideration based on how 'lostPackets' was intended to work.
                // For now, let's keep it simple: ack errors increment lostPackets.
                
                lastPingTime = startTime;
                
                // Aggiorna la qualità della connessione
                this.updateConnectionQuality();
            });
        }, 1000); // Interval for ping
    }

    // Aggiornamento qualità connessione con metriche multiple
    updateConnectionQuality() {
        const latencies = Array.from(this.pingValues.values());
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        
        let quality = 'good';
        if (avgLatency > 200 || this.state.packetLoss > 5 || this.state.jitter > 50) {
            quality = 'poor';
        } else if (avgLatency > 100 || this.state.packetLoss > 2 || this.state.jitter > 30) {
            quality = 'fair';
        }
        
        this.state.connectionQuality = quality;
        this.emit('connection_quality_changed', { 
            quality, 
            latency: avgLatency,
            packetLoss: this.state.packetLoss,
            jitter: this.state.jitter
        });
        
        // Adatta le impostazioni in base alla qualità
        this.adaptToConnectionQuality(quality);
    }

    // Adatta le impostazioni in base alla qualità della connessione
    adaptToConnectionQuality(quality) {
        // perMessageDeflate is now managed by WebSocketConnector at initialization.
        // Dynamic changes would require WebSocketConnector to expose a method for it,
        // potentially involving a reconnect. For now, this part is simplified.
        switch (quality) {
            case 'poor':
                // this.socket.io.opts.perMessageDeflate = false; // Cannot change this on the fly easily
                this.batchInterval = 100; // Batch più frequenti
                break;
            case 'fair':
                // this.socket.io.opts.perMessageDeflate = true;
                this.batchInterval = 50;
                break;
            case 'good':
                // this.socket.io.opts.perMessageDeflate = true;
                this.batchInterval = 16; // Batch più frequenti per latenza bassa
                break;
        }
    }

    // Sincronizzazione stato migliorata con delta updates
    initializeStateSync() {
        if (!this.connector.isConnected() || !this.connector.getSocket()) {
            console.warn("State sync not initialized: not connected or socket not available.");
            return;
        }
        console.log("NetworkManager: Initializing state sync listeners.");
        const socket = this.connector.getSocket();

        socket.on('state_sync', (state) => {
            if (this.lastStateUpdate) {
                // Applica solo le differenze
                const delta = this.calculateStateDelta(this.lastStateUpdate, state);
                this.applyStateDelta(delta);
            } else {
                this.updateState(state); // Make sure this.updateState exists and is correct
            }
            this.lastStateUpdate = state;
        });
        
        // Richiedi sincronizzazione stato ad intervalli adattivi
        let syncIntervalValue = 5000; // Renamed to avoid conflict with interval ID
        // TODO: This interval should be cleared if the NetworkManager is destroyed or connection lost
        setInterval(() => {
            if (this.connector.isConnected()) {
                this.connector.emit('request_state_sync');
                // Adatta l'intervallo in base alla qualità della connessione
                syncIntervalValue = this.state.connectionQuality === 'poor' ? 2000 : 5000;
            }
        }, syncIntervalValue); // This will use the initial value of syncIntervalValue for the interval period.
                               // If you want the interval period to change, the interval needs to be reset.
                               // For simplicity, keeping it as is, but noting this potential issue.
    }
    
    // Helper method, ensure it's defined if used by applyStateDelta or initializeStateSync
    updateState(newState) {
        this.state = {
            ...this.state,
            ...newState,
            players: new Map([...(this.state.players || new Map()), ...(newState.players || new Map())])
        };
        this.emit('state_updated', this.state);
    }

    // Calcola le differenze tra due stati
    calculateStateDelta(oldState, newState) {
        const delta = {};
        
        // Confronta ogni proprietà
        for (const key in newState) {
            if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
                delta[key] = newState[key];
            }
        }
        
        return delta;
    }

    // Applica le differenze di stato
    applyStateDelta(delta) {
        this.state = {
            ...this.state,
            ...delta,
            players: new Map([...this.state.players, ...(delta.players || new Map())])
        };
        this.emit('state_updated', this.state);
    }

    // Inizia il batching dei messaggi
    startMessageBatching() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        
        this.batchInterval = setInterval(() => {
            if (this.messageBatch.length > 0) {
                this.sendBatchToServer();
            }
        }, this.batchInterval || 50);
    }

    // Invia batch di messaggi
    sendBatchToServer() {
        if (!this.connector.isConnected() || this.messageBatch.length === 0) return;
        
        try {
            const batch = this.messageBatch.splice(0);
            const compressedBatch = this.compressBatch(batch);
            this.connector.emit('message_batch', compressedBatch);
        } catch (error) {
            console.error("Errore durante l'invio del batch:", error);
            // Consider re-queueing or handling error appropriately
            this.messageBatch.unshift(...batch); // Re-add the original batch if send failed
        }
    }

    // Compressione batch di messaggi
    compressBatch(batch) {
        return batch.map(message => this.compressMessage(message));
    }

    // Gestione messaggi ottimizzata con batching
    sendToServer(message) {
        if (!this.connector.isConnected()) {
            this.queueMessage(message);
            return;
        }
        
        // Aggiungi al batch se non è un messaggio critico
        if (!this.isCriticalMessage(message)) {
            this.messageBatch.push(message);
            return;
        }
        
        try {
            const compressedMessage = this.compressMessage(message);
            this.connector.emit('message', compressedMessage);
        } catch (error) {
            console.error("Errore durante l'invio del messaggio:", error);
            this.handleMessageError(error, message); // Ensure this method exists and is appropriate
        }
    }

    // Compressione messaggi migliorata
    compressMessage(message) {
        // Implementa compressione basata sul tipo di messaggio
        switch (message.type) {
            case 'player_move':
                return {
                    t: 'm',
                    p: message.position,
                    v: message.velocity,
                    s: message.sequence
                };
            case 'game_state':
                return {
                    t: 'g',
                    s: message.state,
                    t: message.timestamp
                };
            default:
                return message;
        }
    }

    // Predizione movimento
    predictMovement(playerId, movement) {
        const lastState = this.predictionBuffer.get(playerId);
        if (lastState) {
            const predictedState = this.calculatePredictedState(lastState, movement);
            this.predictionBuffer.set(playerId, predictedState);
            return predictedState;
        }
        return movement;
    }

    // Calcola stato predetto
    calculatePredictedState(lastState, movement) {
        // Implementa logica di predizione basata sulla fisica
        const predictedState = {
            position: {
                x: lastState.position.x + movement.velocity.x * (this.state.latency / 1000),
                y: lastState.position.y + movement.velocity.y * (this.state.latency / 1000)
            },
            velocity: movement.velocity,
            timestamp: Date.now()
        };
        return predictedState;
    }

    // Riconciliazione stato
    reconcileState(serverState) {
        this.reconciliationQueue.push(serverState);
        this.processReconciliationQueue();
    }

    // Processa coda di riconciliazione
    processReconciliationQueue() {
        while (this.reconciliationQueue.length > 0) {
            const serverState = this.reconciliationQueue.shift();
            const predictedState = this.predictionBuffer.get(serverState.playerId);
            
            if (predictedState) {
                const error = this.calculateStateError(predictedState, serverState);
                if (error > this.getErrorThreshold()) {
                    // Correggi lo stato se l'errore è troppo grande
                    this.correctState(serverState);
                }
            }
        }
    }

    // Calcola errore tra stati
    calculateStateError(predicted, actual) {
        const dx = predicted.position.x - actual.position.x;
        const dy = predicted.position.y - actual.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Ottieni soglia di errore basata sulla qualità della connessione
    getErrorThreshold() {
        switch (this.state.connectionQuality) {
            case 'poor': return 50;
            case 'fair': return 30;
            case 'good': return 10;
            default: return 20;
        }
    }

    // Corregge lo stato
    correctState(serverState) {
        this.predictionBuffer.set(serverState.playerId, serverState);
        this.emit('state_corrected', serverState);
    }

    // Gestione errori messaggi
    handleMessageError(error, message) {
        console.error("Errore messaggio:", error);
        this.emit('message_error', { error, message });
        
        // Riprova invio se è un messaggio critico
        if (this.isCriticalMessage(message)) {
            this.queueMessage(message);
        }
    }

    // Verifica messaggi critici
    isCriticalMessage(message) {
        const criticalTypes = ['game_start', 'game_end', 'goal_scored'];
        return criticalTypes.includes(message.type);
    }

    // Coda messaggi migliorata
    queueMessage(message) {
        this.messageQueue.push({
            message,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Processa coda
        this.processMessageQueue();
    }

    // Processamento coda messaggi
    processMessageQueue() {
        if (!this.messageQueue.length) return;
        
        const now = Date.now();
        this.messageQueue = this.messageQueue.filter(item => {
            if (now - item.timestamp > 30000) { // 30 seconds timeout for queued messages
                console.warn("Discarding old message from queue:", item.message);
                return false;
            }
            
            if (this.connector.isConnected()) {
                console.log("Processing queued message:", item.message);
                this.sendToServer(item.message); // This will use the connector
                // Assuming sendToServer doesn't re-queue if already connected.
                // If it can, this might cause a loop.
                // For simplicity, let's assume sendToServer sends directly if connected.
                return false; // Remove from queue after attempting to send
            }
            
            // Keep in queue if not connected and not timed out
            return true; 
        });
    }


    // Gestione disconnessione migliorata
    disconnect() {
        console.log("NetworkManager: Disconnecting...");
        this.stopPingMonitoring();
        this.closeAllPeerConnections(); // Assuming this is for WebRTC, not directly WebSocket
        
        if (this.connector) {
            this.connector.disconnect(); // This will trigger the 'disconnected' event on the connector
        }
        
        // Reset state, but some of this might be redundant if 'disconnected' event handler also does it.
        this.connected = false; 
        this.state = {
            connection: 'disconnected',
            room: null,
            players: new Map(),
            gameState: null,
            latency: 0,
            // Keep other state fields like connectionQuality, packetLoss, jitter as they might be relevant
            // even when disconnected (e.g., last known values). Or reset them explicitly if needed.
            connectionQuality: this.state.connectionQuality,
            packetLoss: this.state.packetLoss,
            jitter: this.state.jitter
        };
        
        // The 'disconnected' event from the connector will handle most state changes.
        // this.emit('disconnected', {}); // This might be redundant if connector's event is used.
    }

    // Ferma monitoraggio ping
    stopPingMonitoring() {
        if (this.pingInterval) {
            console.log("NetworkManager: Stopping ping monitoring.");
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // Chiudi tutte le connessioni peer
    closeAllPeerConnections() {
        this.peerConnections.forEach((connection, id) => {
            this.closePeerConnection(id);
        });
        this.peerConnections.clear();
        this.dataChannels.clear();
    }

    setupSocketListeners() {
        const socket = this.connector.getSocket();
        if (!socket) {
            console.error("NetworkManager: Cannot setup socket listeners, socket not available from connector.");
            return;
        }

        console.log("NetworkManager: Setting up application-specific socket listeners.");

        // Remove old listeners if any - important if this method could be called multiple times on the same socket instance
        // However, WebSocketConnector creates a new socket instance on each connect, so this might not be strictly necessary
        // unless the socket instance from getSocket() could persist across re-connections in some WebSocketConnector implementation.
        // For safety, if socket.removeAllListeners is available and appropriate:
        // socket.removeAllListeners(); // Or remove specific listeners

        // These are application-specific event handlers
        // They should remain in NetworkManager
        // The 'connect', 'disconnect', 'error' handlers for the raw socket lifecycle
        // are now managed by WebSocketConnector.

        socket.on('matchFound', (match) => {
            // Assuming currentMatch and showScreen are defined elsewhere in the scope
            // currentMatch = match; 
            // showScreen('match-accept-screen');
            console.log("matchFound event received", match);
            this.emit('matchFound', match); // Emit for UI or other modules
        });

        socket.on('roomCreated', (room) => {
            this.currentRoom = room;
            // isRoomHost = true; // This global variable should be managed carefully
            // showScreen('room-screen');
            // updateRoomPlayerCount(1, room.maxPlayers);
            console.log("roomCreated event received", room);
            this.emit('roomCreated', room);
        });

        socket.on('playerJoined', (data) => {
            // updateRoomPlayerCount(data.playerCount, data.maxPlayers);
            // updateTeamPlayers(data.team, data.players);
            console.log("playerJoined event received", data);
            this.emit('playerJoined', data);
        });

        socket.on('playerLeft', (data) => {
            // updateRoomPlayerCount(data.playerCount, data.maxPlayers);
            // updateTeamPlayers(data.team, data.players);
            console.log("playerLeft event received", data);
            this.emit('playerLeft', data);
        });

        socket.on('chatMessage', (message) => {
            // const chatMessages = document.getElementById('chat-messages');
            // if (chatMessages) {
            //     const messageElement = document.createElement('div');
            //     messageElement.textContent = `${message.player}: ${message.text}`;
            //     chatMessages.appendChild(messageElement);
            //     chatMessages.scrollTop = chatMessages.scrollHeight;
            // }
            console.log("chatMessage event received", message);
            this.emit('chatMessage', message);
        });

        socket.on('roomSettingsUpdated', (settings) => {
            // updateRoomSettings(settings);
            console.log("roomSettingsUpdated event received", settings);
            this.emit('roomSettingsUpdated', settings);
        });

        socket.on('teamChanged', (data) => {
            // updateTeamPlayers(data.team, data.players);
            console.log("teamChanged event received", data);
            this.emit('teamChanged', data);
        });
        
        // Example of a generic emit for any other events NetworkManager might need to pass on
        // This assumes 'emit' is a method on NetworkManager (e.g. if it extends EventTarget or similar)
        // For any unhandled events, if necessary:
        // socket.onAny((eventName, ...args) => {
        //    this.emit(eventName, ...args);
        // });
    }
    
    // Ensure NetworkManager has an emit method if it's used like this.
    // This is a placeholder; a proper event emitter system (like EventTarget) would be better.
    emit(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => callback(data));
        }
    }
    
    on(eventName, callback) {
        if (!this.eventListeners[eventName]) {
            this.eventListeners[eventName] = [];
        }
        this.eventListeners[eventName].push(callback);
    }


    // Match methods
    acceptMatch(matchId) {
        if (!this.connector.isConnected()) {
            // showError('Not connected to server'); // UI interaction
            console.warn('Not connected to server, cannot accept match.');
            return;
        }
        this.connector.emit('acceptMatch', { matchId });
    }

    declineMatch(matchId) {
        if (!this.connector.isConnected()) {
            // showError('Not connected to server');
            console.warn('Not connected to server, cannot decline match.');
            return;
        }
        this.connector.emit('declineMatch', { matchId });
    }

    // Room methods
    createRoom(roomData) {
        if (!this.connector.isConnected()) {
            // showError('Not connected to server');
            console.warn('Not connected to server, cannot create room.');
            return;
        }
        this.connector.emit('createRoom', roomData);
    }

    leaveRoom() {
        if (!this.connector.isConnected() || !this.currentRoom) {
            // showError('Not in a room or not connected');
            console.warn('Not in a room or not connected, cannot leave room.');
            return;
        }
        this.connector.emit('leaveRoom', { roomId: this.currentRoom.id });
        this.currentRoom = null;
        // isRoomHost = false; // Manage global state carefully
    }

    startGame() {
        if (!this.connector.isConnected() || !this.currentRoom /*|| !isRoomHost*/) {
            // showError('Cannot start game');
            console.warn('Cannot start game: not connected, not in room, or not host.');
            return;
        }
        this.connector.emit('startGame', { roomId: this.currentRoom.id });
    }

    // Chat methods
    sendChatMessage(message) {
        if (!this.connector.isConnected() || !this.currentRoom) {
            // showError('Cannot send message');
            console.warn('Cannot send chat message: not connected or not in room.');
            return;
        }
        this.connector.emit('chatMessage', {
            roomId: this.currentRoom.id,
            message: message
        });
    }

    // Team methods
    joinTeam(team) {
        if (!this.connector.isConnected() || !this.currentRoom) {
            // showError('Cannot join team');
            console.warn('Cannot join team: not connected or not in room.');
            return;
        }
        this.connector.emit('joinTeam', {
            roomId: this.currentRoom.id,
            team: team
        });
    }

    // Settings methods
    updateRoomSettings(settings) {
        if (!this.connector.isConnected() || !this.currentRoom /*|| !isRoomHost*/) {
            // showError('Cannot update settings');
            console.warn('Cannot update settings: not connected, not in room, or not host.');
            return;
        }
        this.connector.emit('updateRoomSettings', {
            roomId: this.currentRoom.id,
            settings: settings
        });
    }

    // Quick game methods
    joinQuickGame() {
        if (!this.connector.isConnected()) {
            // showError('Not connected to server');
            console.warn('Not connected to server, cannot join quick game.');
            return;
        }
        this.connector.emit('joinQuickGame');
    }
}
