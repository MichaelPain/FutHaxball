// networkManager.js - Implementazione ottimizzata del gestore di rete

export class NetworkManager {
    constructor() {
        this.eventListeners = {};
        this.connected = false;
        this.playerId = null;
        this.socket = null;
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        this.pingValues = new Map();
        this.pingInterval = null;
        this.serverUrl = process.env.SERVER_URL || 'ws://localhost:3000';
        this.messageQueue = [];
        this.messageBatch = [];
        this.batchInterval = null;
        this.currentRoom = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.lastStateUpdate = null;
        this.predictionBuffer = new Map();
        this.reconciliationQueue = [];
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
    
    // Inizializza la connessione con gestione errori migliorata
    init() {
        console.log("Inizializzazione connessione al server");
        
        try {
            this.socket = io(this.serverUrl, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                timeout: 10000,
                autoConnect: true,
                forceNew: true,
                upgrade: true,
                rememberUpgrade: true,
                perMessageDeflate: true
            });
            
            this.setupSocketListeners();
            this.startPingMonitoring();
            this.initializeStateSync();
            this.startMessageBatching();
        } catch (error) {
            console.error("Errore durante l'inizializzazione della connessione:", error);
            this.handleConnectionError(error);
        }
    }

    // Gestione errori di connessione migliorata
    handleConnectionError(error) {
        console.error("Errore di connessione:", error);
        this.state.connection = 'error';
        this.emit('connection_error', { error });
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
            setTimeout(() => this.init(), delay);
        } else {
            this.emit('connection_failed', { error: 'Max reconnection attempts reached' });
        }
    }

    // Monitoraggio ping migliorato con calcolo jitter e packet loss
    startPingMonitoring() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        let lastPingTime = Date.now();
        let lastPingLatency = 0;
        let lostPackets = 0;
        let totalPackets = 0;
        
        this.pingInterval = setInterval(() => {
            const startTime = Date.now();
            totalPackets++;
            
            this.socket.emit('ping', { timestamp: startTime }, () => {
                const latency = Date.now() - startTime;
                this.state.latency = latency;
                this.pingValues.set(this.socket.id, latency);
                
                // Calcola jitter
                if (lastPingLatency > 0) {
                    const jitter = Math.abs(latency - lastPingLatency);
                    this.state.jitter = (this.state.jitter * 0.9) + (jitter * 0.1);
                }
                lastPingLatency = latency;
                
                // Calcola packet loss
                const timeSinceLastPing = startTime - lastPingTime;
                if (timeSinceLastPing > 2000) { // Se passano più di 2 secondi
                    lostPackets += Math.floor(timeSinceLastPing / 1000) - 1;
                }
                this.state.packetLoss = (lostPackets / totalPackets) * 100;
                
                lastPingTime = startTime;
                
                // Aggiorna la qualità della connessione
                this.updateConnectionQuality();
            });
        }, 1000);
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
        switch (quality) {
            case 'poor':
                this.socket.io.opts.perMessageDeflate = false;
                this.batchInterval = 100; // Batch più frequenti
                break;
            case 'fair':
                this.socket.io.opts.perMessageDeflate = true;
                this.batchInterval = 50;
                break;
            case 'good':
                this.socket.io.opts.perMessageDeflate = true;
                this.batchInterval = 16; // Batch più frequenti per latenza bassa
                break;
        }
    }

    // Sincronizzazione stato migliorata con delta updates
    initializeStateSync() {
        this.socket.on('state_sync', (state) => {
            if (this.lastStateUpdate) {
                // Applica solo le differenze
                const delta = this.calculateStateDelta(this.lastStateUpdate, state);
                this.applyStateDelta(delta);
            } else {
                this.updateState(state);
            }
            this.lastStateUpdate = state;
        });
        
        // Richiedi sincronizzazione stato ad intervalli adattivi
        let syncInterval = 5000;
        setInterval(() => {
            if (this.connected) {
                this.socket.emit('request_state_sync');
                // Adatta l'intervallo in base alla qualità della connessione
                syncInterval = this.state.connectionQuality === 'poor' ? 2000 : 5000;
            }
        }, syncInterval);
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
        if (!this.socket?.connected || this.messageBatch.length === 0) return;
        
        try {
            const batch = this.messageBatch.splice(0);
            const compressedBatch = this.compressBatch(batch);
            this.socket.emit('message_batch', compressedBatch);
        } catch (error) {
            console.error("Errore durante l'invio del batch:", error);
            this.messageBatch.unshift(...this.messageBatch.splice(0));
        }
    }

    // Compressione batch di messaggi
    compressBatch(batch) {
        return batch.map(message => this.compressMessage(message));
    }

    // Gestione messaggi ottimizzata con batching
    sendToServer(message) {
        if (!this.socket?.connected) {
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
            this.socket.emit('message', compressedMessage);
        } catch (error) {
            console.error("Errore durante l'invio del messaggio:", error);
            this.handleMessageError(error, message);
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
            if (now - item.timestamp > 30000) {
                // Scarta messaggi vecchi di più di 30 secondi
                return false;
            }
            
            if (this.connected) {
                this.sendToServer(item.message);
                item.attempts++;
                return item.attempts < 3; // Massimo 3 tentativi
            }
            
            return true;
        });
    }

    // Gestione disconnessione migliorata
    disconnect() {
        this.stopPingMonitoring();
        this.closeAllPeerConnections();
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.state = {
            connection: 'disconnected',
            room: null,
            players: new Map(),
            gameState: null,
            latency: 0
        };
        
        this.emit('disconnected', {});
    }

    // Ferma monitoraggio ping
    stopPingMonitoring() {
        if (this.pingInterval) {
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
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        this.socket.on('matchFound', (match) => {
            currentMatch = match;
            showScreen('match-accept-screen');
        });

        this.socket.on('roomCreated', (room) => {
            this.currentRoom = room;
            isRoomHost = true;
            showScreen('room-screen');
            updateRoomPlayerCount(1, room.maxPlayers);
        });

        this.socket.on('playerJoined', (data) => {
            updateRoomPlayerCount(data.playerCount, data.maxPlayers);
            updateTeamPlayers(data.team, data.players);
        });

        this.socket.on('playerLeft', (data) => {
            updateRoomPlayerCount(data.playerCount, data.maxPlayers);
            updateTeamPlayers(data.team, data.players);
        });

        this.socket.on('chatMessage', (message) => {
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                const messageElement = document.createElement('div');
                messageElement.textContent = `${message.player}: ${message.text}`;
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });

        this.socket.on('roomSettingsUpdated', (settings) => {
            updateRoomSettings(settings);
        });

        this.socket.on('teamChanged', (data) => {
            updateTeamPlayers(data.team, data.players);
        });
    }

    // Match methods
    acceptMatch(matchId) {
        if (!this.connected) {
            showError('Not connected to server');
            return;
        }
        this.socket.emit('acceptMatch', { matchId });
    }

    declineMatch(matchId) {
        if (!this.connected) {
            showError('Not connected to server');
            return;
        }
        this.socket.emit('declineMatch', { matchId });
    }

    // Room methods
    createRoom(roomData) {
        if (!this.connected) {
            showError('Not connected to server');
            return;
        }
        this.socket.emit('createRoom', roomData);
    }

    leaveRoom() {
        if (!this.connected || !this.currentRoom) {
            showError('Not in a room');
            return;
        }
        this.socket.emit('leaveRoom', { roomId: this.currentRoom.id });
        this.currentRoom = null;
        isRoomHost = false;
    }

    startGame() {
        if (!this.connected || !this.currentRoom || !isRoomHost) {
            showError('Cannot start game');
            return;
        }
        this.socket.emit('startGame', { roomId: this.currentRoom.id });
    }

    // Chat methods
    sendChatMessage(message) {
        if (!this.connected || !this.currentRoom) {
            showError('Cannot send message');
            return;
        }
        this.socket.emit('chatMessage', {
            roomId: this.currentRoom.id,
            message: message
        });
    }

    // Team methods
    joinTeam(team) {
        if (!this.connected || !this.currentRoom) {
            showError('Cannot join team');
            return;
        }
        this.socket.emit('joinTeam', {
            roomId: this.currentRoom.id,
            team: team
        });
    }

    // Settings methods
    updateRoomSettings(settings) {
        if (!this.connected || !this.currentRoom || !isRoomHost) {
            showError('Cannot update settings');
            return;
        }
        this.socket.emit('updateRoomSettings', {
            roomId: this.currentRoom.id,
            settings: settings
        });
    }

    // Quick game methods
    joinQuickGame() {
        if (!this.connected) {
            showError('Not connected to server');
            return;
        }
        this.socket.emit('joinQuickGame');
    }
}
