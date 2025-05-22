// roomManager.js - Gestione delle stanze di gioco con funzionalità migliorate

export class RoomManager {
    constructor(networkManager, uiManager, authManager, gameManager) {
        this.networkManager = networkManager;
        this.uiManager = uiManager;
        this.authManager = authManager;
        this.gameManager = gameManager; // Aggiunto riferimento al gameManager
        this.rooms = new Map();
        this.currentRoom = null;
        this.isHost = false;
        this.roomTemplates = new Map(); // Store room templates
        this.roomFilters = {
            type: 'all',
            status: 'all',
            players: 'all',
            search: ''
        };
        
        // Binding dei metodi
        this.setupEventListeners();
        this.loadRoomTemplates();
    }
    
    setupEventListeners() {
        // Ascolta gli eventi dal networkManager
        this.networkManager.on('roomListUpdated', (rooms) => this.handleRoomListUpdate(rooms));
        this.networkManager.on('joinedRoom', (roomData) => this.handleRoomJoined(roomData));
        this.networkManager.on('roomUpdated', (roomData) => this.handleRoomUpdate(roomData));
        this.networkManager.on('playerJoined', (playerData) => this.handlePlayerJoined(playerData));
        this.networkManager.on('playerLeft', (playerData) => this.handlePlayerLeft(playerData));
        this.networkManager.on('hostChanged', (hostData) => this.handleHostChanged(hostData));
        this.networkManager.on('chatMessageReceived', (messageData) => this.handleChatMessage(messageData));
        this.networkManager.on('error', (error) => this.handleError(error));
        
        // Ascolta gli eventi dal gameManager
        document.addEventListener('gameStarted', () => this.handleGameStarted());
        document.addEventListener('gameEnded', () => this.handleGameEnded());
    }
    
    // Gestione degli eventi ricevuti dal networkManager
    handleRoomListUpdate(rooms) {
        // Aggiorna la lista delle stanze
        this.rooms.clear();
        rooms.forEach(room => {
            this.rooms.set(room.id, room);
        });
        
        // Aggiorna l'UI
        this.updateRoomList();
    }
    
    handleRoomJoined(roomData) {
        console.log("Entrato nella stanza:", roomData);
        
        // Imposta la stanza corrente
        this.currentRoom = roomData;
        
        // Verifica se sei l'host
        const playerId = this.networkManager.getPlayerId() || 'player_' + Math.random().toString(36).substr(2, 9);
        this.isHost = this.isPlayerHost(playerId);
        
        // Aggiorna l'UI
        this.uiManager.showScreen('room-screen', { roomId: roomData.id });
        this.updateRoomInfo();
        
        // Inizializza il campo di gioco
        this.initializeGameField();
    }
    
    handleRoomUpdate(roomData) {
        // Aggiorna la stanza corrente
        if (this.currentRoom && this.currentRoom.id === roomData.id) {
            this.currentRoom = roomData;
            
            // Aggiorna l'UI
            this.updateRoomInfo();
        }
    }
    
    handlePlayerJoined(playerData) {
        if (!this.currentRoom) return;
        
        // Aggiungi il giocatore alla squadra appropriata
        if (playerData.team === 'red') {
            if (!this.currentRoom.redTeam) this.currentRoom.redTeam = [];
            this.currentRoom.redTeam.push(playerData);
        } else if (playerData.team === 'blue') {
            if (!this.currentRoom.blueTeam) this.currentRoom.blueTeam = [];
            this.currentRoom.blueTeam.push(playerData);
        } else {
            if (!this.currentRoom.spectators) this.currentRoom.spectators = [];
            this.currentRoom.spectators.push(playerData);
        }
        
        // Aggiorna l'UI
        this.updateRoomInfo();
        this.uiManager.showNotification(`${playerData.nickname} è entrato nella stanza`, 'info');
    }
    
    handlePlayerLeft(playerData) {
        if (!this.currentRoom) return;
        
        // Rimuovi il giocatore da tutte le squadre
        if (this.currentRoom.redTeam) {
            this.currentRoom.redTeam = this.currentRoom.redTeam.filter(p => p.id !== playerData.id);
        }
        
        if (this.currentRoom.blueTeam) {
            this.currentRoom.blueTeam = this.currentRoom.blueTeam.filter(p => p.id !== playerData.id);
        }
        
        if (this.currentRoom.spectators) {
            this.currentRoom.spectators = this.currentRoom.spectators.filter(p => p.id !== playerData.id);
        }
        
        // Aggiorna l'UI
        this.updateRoomInfo();
        this.uiManager.showNotification(`${playerData.nickname} ha lasciato la stanza`, 'info');
    }
    
    handleHostChanged(hostData) {
        if (!this.currentRoom) return;
        
        // Aggiorna lo stato di host per tutti i giocatori
        const updatePlayerHost = (player) => {
            player.isHost = player.id === hostData.newHostId;
            return player;
        };
        
        if (this.currentRoom.redTeam) {
            this.currentRoom.redTeam = this.currentRoom.redTeam.map(updatePlayerHost);
        }
        
        if (this.currentRoom.blueTeam) {
            this.currentRoom.blueTeam = this.currentRoom.blueTeam.map(updatePlayerHost);
        }
        
        if (this.currentRoom.spectators) {
            this.currentRoom.spectators = this.currentRoom.spectators.map(updatePlayerHost);
        }
        
        // Verifica se sei il nuovo host
        const playerId = this.networkManager.getPlayerId() || 'player_' + Math.random().toString(36).substr(2, 9);
        this.isHost = playerId === hostData.newHostId;
        
        // Aggiorna l'UI
        this.updateRoomInfo();
        this.uiManager.showNotification(`${hostData.newHostNickname} è il nuovo host della stanza`, 'info');
    }
    
    handleChatMessage(messageData) {
        if (!this.currentRoom) return;
        
        // Aggiungi il messaggio alla chat
        this.uiManager.addChatMessage(messageData);
    }
    
    handleError(error) {
        console.error('RoomManager Error:', error);
        
        // Categorize errors
        const errorType = error.type || 'unknown';
        const errorMessage = error.message || 'Si è verificato un errore';
        
        // Handle specific error types
        switch (errorType) {
            case 'network':
                this.handleNetworkError(error);
                break;
            case 'permission':
                this.handlePermissionError(error);
                break;
            case 'validation':
                this.handleValidationError(error);
                break;
            default:
                this.uiManager.showError(errorMessage);
        }
        
        // Log error for analytics
        this.logError(error);
    }
    
    handleNetworkError(error) {
        this.uiManager.showError('Errore di connessione. Riprova più tardi.');
        // Attempt reconnection
        this.networkManager.reconnect();
    }
    
    handlePermissionError(error) {
        this.uiManager.showError('Non hai i permessi necessari per questa azione.');
    }
    
    handleValidationError(error) {
        this.uiManager.showError(`Errore di validazione: ${error.message}`);
    }
    
    logError(error) {
        // Log error to analytics service
        const errorLog = {
            timestamp: new Date().toISOString(),
            type: error.type || 'unknown',
            message: error.message,
            stack: error.stack,
            roomId: this.currentRoom?.id,
            playerId: this.networkManager.getPlayerId()
        };
        
        // Send to analytics
        this.networkManager.sendAnalytics('error', errorLog);
    }
    
    handleGameStarted() {
        if (!this.currentRoom) return;
        
        // Aggiorna lo stato del gioco
        this.currentRoom.gameInProgress = true;
        
        // Aggiorna l'UI
        this.updateRoomInfo();
        this.uiManager.showNotification('La partita è iniziata!', 'success');
    }
    
    handleGameEnded() {
        if (!this.currentRoom) return;
        
        // Aggiorna lo stato del gioco
        this.currentRoom.gameInProgress = false;
        
        // Aggiorna l'UI
        this.updateRoomInfo();
        this.uiManager.showNotification('La partita è terminata', 'info');
    }
    
    // Metodi per la gestione delle stanze
    fetchRooms() {
        // Per la versione di sviluppo, simuliamo il recupero delle stanze
        // In produzione, questa funzione dovrebbe utilizzare il networkManager
        const demoRooms = [
            {
                id: 'room_1',
                name: 'Stanza 1',
                isPrivate: false,
                password: null,
                maxPlayers: 10,
                type: 'normal',
                players: 3,
                redTeam: [
                    { id: 'player_1', nickname: 'Giocatore1', isHost: true, team: 'red' }
                ],
                blueTeam: [
                    { id: 'player_2', nickname: 'Giocatore2', isHost: false, team: 'blue' }
                ],
                spectators: [
                    { id: 'player_3', nickname: 'Giocatore3', isHost: false, team: 'spectator' }
                ],
                gameSettings: {
                    timeLimit: 5,
                    scoreLimit: 3,
                    field: 'standard',
                    teamLock: false
                },
                gameInProgress: false
            },
            {
                id: 'room_2',
                name: 'Stanza 2',
                isPrivate: true,
                password: '1234',
                maxPlayers: 8,
                type: 'normal',
                players: 2,
                redTeam: [
                    { id: 'player_4', nickname: 'Giocatore4', isHost: true, team: 'red' }
                ],
                blueTeam: [
                    { id: 'player_5', nickname: 'Giocatore5', isHost: false, team: 'blue' }
                ],
                spectators: [],
                gameSettings: {
                    timeLimit: 10,
                    scoreLimit: 5,
                    field: 'large',
                    teamLock: true
                },
                gameInProgress: true
            },
            {
                id: 'room_3',
                name: 'Stanza Ranked',
                isPrivate: false,
                password: null,
                maxPlayers: 4,
                type: 'ranked',
                players: 2,
                redTeam: [
                    { id: 'player_6', nickname: 'Giocatore6', isHost: true, team: 'red' }
                ],
                blueTeam: [
                    { id: 'player_7', nickname: 'Giocatore7', isHost: false, team: 'blue' }
                ],
                spectators: [],
                gameSettings: {
                    timeLimit: 5,
                    scoreLimit: 3,
                    field: 'standard',
                    teamLock: true
                },
                gameInProgress: false
            }
        ];
        
        // Simula l'aggiornamento della lista delle stanze
        this.handleRoomListUpdate(demoRooms);
        
        this.uiManager.showNotification('Lista stanze aggiornata', 'success');
    }
    
    // Creazione stanza con impostazioni base (nome, visibilità, password)
    async createRoom(roomData) {
        try {
            // Validate room data
            this.validateRoomData(roomData);
            
            // Check if room name is unique
            if (this.isRoomNameTaken(roomData.name)) {
                throw new Error('Nome stanza già in uso');
            }
            
            // Create room with default settings if not provided
            const roomSettings = roomData.settings || this.getDefaultRoomSettings();
            
            // Validate room settings
            this.validateRoomSettings(roomSettings);
            
            // Create room object
            const room = {
                id: 'room_' + Math.random().toString(36).substr(2, 9),
                name: roomData.name,
                isPrivate: roomData.isPrivate || false,
                password: roomData.password || null,
                maxPlayers: roomData.maxPlayers || 10,
                type: roomData.type || 'normal',
                players: 0,
                redTeam: [],
                blueTeam: [],
                spectators: [],
                gameSettings: roomSettings,
                gameInProgress: false,
                createdAt: new Date().toISOString(),
                createdBy: this.networkManager.getPlayerId(),
                lastActivity: new Date().toISOString()
            };
            
            // Save room to server
            await this.networkManager.createRoom(room);
            
            // Join the room
            await this.joinRoom(room.id, roomData.password);
            
            this.uiManager.showNotification('Stanza creata con successo', 'success');
            return room;
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
            throw error;
        }
    }
    
    validateRoomData(roomData) {
        if (!roomData.name || typeof roomData.name !== 'string') {
            throw new Error('Nome stanza non valido');
        }
        
        if (roomData.name.length < 3 || roomData.name.length > 30) {
            throw new Error('Nome stanza deve essere tra 3 e 30 caratteri');
        }
        
        if (roomData.isPrivate && (!roomData.password || roomData.password.length < 4)) {
            throw new Error('Password stanza privata non valida (min 4 caratteri)');
        }
        
        if (roomData.maxPlayers && (roomData.maxPlayers < 2 || roomData.maxPlayers > 20)) {
            throw new Error('Numero massimo giocatori non valido (2-20)');
        }
        
        if (roomData.type && !['normal', 'ranked', 'tournament'].includes(roomData.type)) {
            throw new Error('Tipo stanza non valido');
        }
    }

    isRoomNameTaken(name) {
        return Array.from(this.rooms.values()).some(room => 
            room.name.toLowerCase() === name.toLowerCase()
        );
    }

    getDefaultRoomSettings() {
        return {
            timeLimit: 5,
            scoreLimit: 3,
            field: 'standard',
            teamLock: false,
            autoBalance: true,
            friendlyFire: false,
            powerups: false,
            weather: 'none',
            ballSize: 'normal',
            ballSpeed: 'normal',
            playerSpeed: 'normal',
            kickStrength: 'normal'
        };
    }

    async updateGameSettings(settings) {
        if (!this.currentRoom || !this.isHost) {
            throw new Error('Solo l\'host può modificare le impostazioni');
        }
        
        try {
            // Validate settings
            this.validateRoomSettings(settings);
            
            // Update settings
            this.currentRoom.gameSettings = {
                ...this.currentRoom.gameSettings,
                ...settings
            };
            
            // Save to server
            await this.networkManager.updateRoomSettings(this.currentRoom.id, settings);
            
            // Update UI
            this.updateRoomInfo();
            this.uiManager.showNotification('Impostazioni aggiornate', 'success');
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }

    async changeField(fieldName) {
        if (!this.currentRoom || !this.isHost) {
            throw new Error('Solo l\'host può cambiare il campo');
        }
        
        try {
            // Validate field name
            if (!['standard', 'large', 'small'].includes(fieldName)) {
                throw new Error('Tipo campo non valido');
            }
            
            // Update field
            await this.updateGameSettings({
                ...this.currentRoom.gameSettings,
                field: fieldName
            });
            
            // Reinitialize game field
            this.initializeGameField();
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }
    
    // Inizializza il campo di gioco
    initializeGameField() {
        if (!this.currentRoom) return;
        
        console.log("Inizializzazione campo di gioco per la stanza:", this.currentRoom.id);
        
        // Ottieni il container del campo di gioco
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            console.error("Container del gioco non trovato");
            return;
        }
        
        // Assicurati che il container sia visibile
        gameContainer.style.display = 'block';
        
        // Inizializza il campo di gioco tramite il gameManager
        if (this.gameManager) {
            this.gameManager.initializeGame(this.currentRoom);
        } else {
            console.error("GameManager non disponibile");
        }
    }
    
    joinRoom(roomId, password = null) {
        const room = this.rooms.get(roomId);
        
        if (!room) {
            this.uiManager.showNotification('Stanza non trovata', 'error');
            return;
        }
        
        // Verifica se l'utente è autenticato per le stanze che richiedono login
        if (room.type === 'ranked' && !this.authManager.isLoggedIn()) {
            this.uiManager.showNotification('Devi effettuare il login per entrare in una stanza competitiva', 'error');
            // Mostra la schermata di login
            this.uiManager.showScreen('auth-screen');
            return;
        }
        
        // Verifica la password se necessario
        if (room.isPrivate && room.password && room.password !== password) {
            this.uiManager.showNotification('Password errata', 'error');
            return;
        }
        
        // Verifica se la stanza è piena
        const totalPlayers = (room.redTeam?.length || 0) + (room.blueTeam?.length || 0) + (room.spectators?.length || 0);
        if (totalPlayers >= room.maxPlayers) {
            this.uiManager.showNotification('La stanza è piena', 'error');
            return;
        }
        
        // Per la versione di sviluppo, simuliamo l'entrata nella stanza
        // In produzione, questa funzione dovrebbe utilizzare il networkManager
        const roomCopy = { ...room };
        
        // Aggiungi il giocatore corrente come spettatore
        const currentPlayer = {
            id: this.networkManager.getPlayerId() || 'player_' + Math.random().toString(36).substr(2, 9),
            nickname: this.authManager.isLoggedIn() ? this.authManager.getUser().nickname : 'Ospite' + Math.floor(Math.random() * 1000),
            isHost: false,
            team: 'spectator'
        };
        
        if (!roomCopy.spectators) roomCopy.spectators = [];
        roomCopy.spectators.push(currentPlayer);
        
        // Simula l'entrata nella stanza
        this.handleRoomJoined(roomCopy);
        
        this.uiManager.showNotification('Sei entrato nella stanza', 'success');
    }
    
    leaveRoom() {
        if (this.currentRoom) {
            // Per la versione di sviluppo, simuliamo l'uscita dalla stanza
            // In produzione, questa funzione dovrebbe utilizzare il networkManager
            
            // Notifica gli altri giocatori che stai uscendo
            const playerId = this.networkManager.getPlayerId() || 'player_' + Math.random().toString(36).substr(2, 9);
            const playerNickname = this.authManager.isLoggedIn() ? this.authManager.getUser().nickname : 'Ospite' + Math.floor(Math.random() * 1000);
            
            // Se sei l'host, trasferisci i privilegi di host a un altro giocatore
            if (this.isHost) {
                // Trova un altro giocatore a cui trasferire i privilegi di host
                let newHost = null;
                
                // Cerca prima nelle squadre, poi tra gli spettatori
                if (this.currentRoom.redTeam && this.currentRoom.redTeam.length > 0) {
                    newHost = this.currentRoom.redTeam.find(p => p.id !== playerId);
                }
                
                if (!newHost && this.currentRoom.blueTeam && this.currentRoom.blueTeam.length > 0) {
                    newHost = this.currentRoom.blueTeam.find(p => p.id !== playerId);
                }
                
                if (!newHost && this.currentRoom.spectators && this.currentRoom.spectators.length > 0) {
                    newHost = this.currentRoom.spectators.find(p => p.id !== playerId);
                }
                
                // Se c'è un nuovo host, trasferisci i privilegi
                if (newHost) {
                    this.handleHostChanged({
                        newHostId: newHost.id,
                        newHostNickname: newHost.nickname
                    });
                }
            }
            
            // Rimuovi il giocatore dalla stanza
            this.handlePlayerLeft({
                id: playerId,
                nickname: playerNickname
            });
            
            // Resetta lo stato della stanza corrente
            this.currentRoom = null;
            this.isHost = false;
            
            // Torna alla schermata principale
            this.uiManager.showScreen('main-menu');
            
            this.uiManager.showNotification('Hai lasciato la stanza', 'info');
        }
    }
    
    async changeTeam(playerId, newTeam) {
        if (!this.currentRoom) return;
        
        try {
            // Validate team change
            this.validateTeamChange(playerId, newTeam);
            
            // Get current player
            const currentPlayer = this.getPlayerById(playerId);
            if (!currentPlayer) {
                throw new Error('Giocatore non trovato');
            }
            
            // Check if player is already in the target team
            if (currentPlayer.team === newTeam) {
                throw new Error('Giocatore già nella squadra selezionata');
            }
            
            // Remove player from current team
            this.removePlayerFromTeam(currentPlayer);
            
            // Add player to new team
            this.addPlayerToTeam(currentPlayer, newTeam);
            
            // Update server
            await this.networkManager.updatePlayerTeam(this.currentRoom.id, playerId, newTeam);
            
            // Update UI
            this.updateRoomInfo();
            this.uiManager.showNotification(`${currentPlayer.nickname} è passato alla squadra ${this.getTeamName(newTeam)}`, 'info');
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }

    validateTeamChange(playerId, newTeam) {
        // Validate team name
        if (!['red', 'blue', 'spectator'].includes(newTeam)) {
            throw new Error('Squadra non valida');
        }
        
        // Check if player is host
        const isHost = this.isPlayerHost(playerId);
        
        // Check if team is locked
        if (this.currentRoom.gameSettings.teamLock && !isHost) {
            throw new Error('Le squadre sono bloccate');
        }
        
        // Check if game is in progress
        if (this.currentRoom.gameInProgress && !isHost) {
            throw new Error('Non puoi cambiare squadra durante la partita');
        }
        
        // Check team size limits
        const teamSize = this.getTeamSize(newTeam);
        const maxTeamSize = Math.floor(this.currentRoom.maxPlayers / 2);
        
        if (newTeam !== 'spectator' && teamSize >= maxTeamSize) {
            throw new Error('Squadra piena');
        }
    }

    getPlayerById(playerId) {
        return [
            ...(this.currentRoom.redTeam || []),
            ...(this.currentRoom.blueTeam || []),
            ...(this.currentRoom.spectators || [])
        ].find(player => player.id === playerId);
    }

    removePlayerFromTeam(player) {
        const team = player.team;
        if (team === 'red') {
            this.currentRoom.redTeam = this.currentRoom.redTeam.filter(p => p.id !== player.id);
        } else if (team === 'blue') {
            this.currentRoom.blueTeam = this.currentRoom.blueTeam.filter(p => p.id !== player.id);
        } else if (team === 'spectator') {
            this.currentRoom.spectators = this.currentRoom.spectators.filter(p => p.id !== player.id);
        }
    }

    addPlayerToTeam(player, team) {
        player.team = team;
        if (team === 'red') {
            if (!this.currentRoom.redTeam) this.currentRoom.redTeam = [];
            this.currentRoom.redTeam.push(player);
        } else if (team === 'blue') {
            if (!this.currentRoom.blueTeam) this.currentRoom.blueTeam = [];
            this.currentRoom.blueTeam.push(player);
        } else if (team === 'spectator') {
            if (!this.currentRoom.spectators) this.currentRoom.spectators = [];
            this.currentRoom.spectators.push(player);
        }
    }

    getTeamSize(team) {
        if (team === 'red') return this.currentRoom.redTeam?.length || 0;
        if (team === 'blue') return this.currentRoom.blueTeam?.length || 0;
        if (team === 'spectator') return this.currentRoom.spectators?.length || 0;
        return 0;
    }

    async startGame() {
        if (!this.currentRoom || !this.isHost) {
            throw new Error('Solo l\'host può avviare la partita');
        }
        
        try {
            // Validate game start conditions
            this.validateGameStart();
            
            // Update game state
            this.currentRoom.gameInProgress = true;
            
            // Notify server
            await this.networkManager.startGame(this.currentRoom.id);
            
            // Initialize game
            this.initializeGameField();
            
            // Update UI
            this.updateRoomInfo();
            this.uiManager.showNotification('Partita avviata!', 'success');
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }

    validateGameStart() {
        // Check minimum players
        const redTeamSize = this.currentRoom.redTeam?.length || 0;
        const blueTeamSize = this.currentRoom.blueTeam?.length || 0;
        
        if (redTeamSize < 1 || blueTeamSize < 1) {
            throw new Error('Sono necessari almeno 2 giocatori per iniziare');
        }
        
        // Check team balance
        if (this.currentRoom.gameSettings.autoBalance) {
            const teamDiff = Math.abs(redTeamSize - blueTeamSize);
            if (teamDiff > 1) {
                throw new Error('Le squadre non sono bilanciate');
            }
        }
        
        // Check if game is already in progress
        if (this.currentRoom.gameInProgress) {
            throw new Error('La partita è già in corso');
        }
    }

    async stopGame() {
        if (!this.currentRoom || !this.isHost) {
            throw new Error('Solo l\'host può fermare la partita');
        }
        
        try {
            // Update game state
            this.currentRoom.gameInProgress = false;
            
            // Notify server
            await this.networkManager.stopGame(this.currentRoom.id);
            
            // Update UI
            this.updateRoomInfo();
            this.uiManager.showNotification('Partita terminata', 'info');
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }
    
    // Ottieni il nome della squadra
    getTeamName(team) {
        switch (team) {
            case 'red':
                return 'Rossa';
            case 'blue':
                return 'Blu';
            case 'spectator':
                return 'Spettatori';
            default:
                return 'Sconosciuta';
        }
    }
    
    // Verifica se un giocatore è l'host
    isPlayerHost(playerId) {
        if (!this.currentRoom) return false;
        
        // Cerca il giocatore in tutte le squadre
        let isHost = false;
        
        if (this.currentRoom.redTeam) {
            const player = this.currentRoom.redTeam.find(p => p.id === playerId);
            if (player && player.isHost) isHost = true;
        }
        
        if (!isHost && this.currentRoom.blueTeam) {
            const player = this.currentRoom.blueTeam.find(p => p.id === playerId);
            if (player && player.isHost) isHost = true;
        }
        
        if (!isHost && this.currentRoom.spectators) {
            const player = this.currentRoom.spectators.find(p => p.id === playerId);
            if (player && player.isHost) isHost = true;
        }
        
        return isHost;
    }
    
    // Aggiorna la lista delle stanze nell'UI
    updateRoomList() {
        const filteredRooms = this.filterRooms(this.rooms);
        this.uiManager.updateRoomList(filteredRooms);
    }
    
    // Aggiorna le informazioni della stanza nell'UI
    updateRoomInfo() {
        if (!this.currentRoom) return;
        
        // Ottieni i container delle informazioni della stanza
        const roomNameElement = document.getElementById('room-name');
        const roomTypeElement = document.getElementById('room-type');
        const roomSettingsElement = document.getElementById('room-settings');
        const redTeamContainer = document.getElementById('red-team-container');
        const blueTeamContainer = document.getElementById('blue-team-container');
        const spectatorsContainer = document.getElementById('spectators-container');
        const startGameButton = document.getElementById('start-game-btn');
        const stopGameButton = document.getElementById('stop-game-btn');
        
        // Aggiorna il nome della stanza
        if (roomNameElement) {
            roomNameElement.textContent = this.currentRoom.name;
        }
        
        // Aggiorna il tipo di stanza
        if (roomTypeElement) {
            roomTypeElement.textContent = this.currentRoom.type === 'ranked' ? 'Competitiva' : 'Normale';
        }
        
        // Aggiorna le impostazioni della stanza
        if (roomSettingsElement) {
            roomSettingsElement.innerHTML = `
                <div>Tempo: ${this.currentRoom.gameSettings.timeLimit} minuti</div>
                <div>Goal: ${this.currentRoom.gameSettings.scoreLimit}</div>
                <div>Campo: ${this.currentRoom.gameSettings.field}</div>
                <div>Blocco squadre: ${this.currentRoom.gameSettings.teamLock ? 'Sì' : 'No'}</div>
            `;
        }
        
        // Aggiorna la squadra rossa
        if (redTeamContainer) {
            redTeamContainer.innerHTML = '';
            
            if (this.currentRoom.redTeam && this.currentRoom.redTeam.length > 0) {
                this.currentRoom.redTeam.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'player-item';
                    
                    // Aggiungi un'icona per l'host
                    const hostIcon = player.isHost ? '<i class="fas fa-crown"></i> ' : '';
                    
                    playerElement.innerHTML = `
                        <div class="player-name">${hostIcon}${player.nickname}</div>
                        <div class="player-actions">
                            ${this.getPlayerActions(player)}
                        </div>
                    `;
                    
                    // Aggiungi gli eventi ai pulsanti delle azioni
                    this.setupPlayerActionEvents(playerElement, player);
                    
                    redTeamContainer.appendChild(playerElement);
                });
            } else {
                redTeamContainer.innerHTML = '<div class="empty-team">Nessun giocatore</div>';
            }
        }
        
        // Aggiorna la squadra blu
        if (blueTeamContainer) {
            blueTeamContainer.innerHTML = '';
            
            if (this.currentRoom.blueTeam && this.currentRoom.blueTeam.length > 0) {
                this.currentRoom.blueTeam.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'player-item';
                    
                    // Aggiungi un'icona per l'host
                    const hostIcon = player.isHost ? '<i class="fas fa-crown"></i> ' : '';
                    
                    playerElement.innerHTML = `
                        <div class="player-name">${hostIcon}${player.nickname}</div>
                        <div class="player-actions">
                            ${this.getPlayerActions(player)}
                        </div>
                    `;
                    
                    // Aggiungi gli eventi ai pulsanti delle azioni
                    this.setupPlayerActionEvents(playerElement, player);
                    
                    blueTeamContainer.appendChild(playerElement);
                });
            } else {
                blueTeamContainer.innerHTML = '<div class="empty-team">Nessun giocatore</div>';
            }
        }
        
        // Aggiorna gli spettatori
        if (spectatorsContainer) {
            spectatorsContainer.innerHTML = '';
            
            if (this.currentRoom.spectators && this.currentRoom.spectators.length > 0) {
                this.currentRoom.spectators.forEach(player => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'player-item';
                    
                    // Aggiungi un'icona per l'host
                    const hostIcon = player.isHost ? '<i class="fas fa-crown"></i> ' : '';
                    
                    playerElement.innerHTML = `
                        <div class="player-name">${hostIcon}${player.nickname}</div>
                        <div class="player-actions">
                            ${this.getPlayerActions(player)}
                        </div>
                    `;
                    
                    // Aggiungi gli eventi ai pulsanti delle azioni
                    this.setupPlayerActionEvents(playerElement, player);
                    
                    spectatorsContainer.appendChild(playerElement);
                });
            } else {
                spectatorsContainer.innerHTML = '<div class="empty-team">Nessun spettatore</div>';
            }
        }
        
        // Aggiorna i pulsanti di controllo del gioco
        if (startGameButton) {
            startGameButton.disabled = !this.isHost || this.currentRoom.gameInProgress;
        }
        
        if (stopGameButton) {
            stopGameButton.disabled = !this.isHost || !this.currentRoom.gameInProgress;
        }
    }
    
    // Ottieni le azioni disponibili per un giocatore
    getPlayerActions(player) {
        const playerId = this.networkManager.getPlayerId() || 'player_' + Math.random().toString(36).substr(2, 9);
        const isCurrentPlayer = player.id === playerId;
        const isHost = this.isHost;
        
        let actions = '';
        
        // Azioni per il giocatore corrente
        if (isCurrentPlayer) {
            if (player.team !== 'red') {
                actions += '<button class="player-action join-red-btn">Rosso</button>';
            }
            
            if (player.team !== 'blue') {
                actions += '<button class="player-action join-blue-btn">Blu</button>';
            }
            
            if (player.team !== 'spectator') {
                actions += '<button class="player-action join-spectator-btn">Spettatore</button>';
            }
        }
        
        // Azioni per l'host
        if (isHost && !isCurrentPlayer) {
            if (player.team !== 'red') {
                actions += '<button class="player-action move-to-red-btn">Rosso</button>';
            }
            
            if (player.team !== 'blue') {
                actions += '<button class="player-action move-to-blue-btn">Blu</button>';
            }
            
            if (player.team !== 'spectator') {
                actions += '<button class="player-action move-to-spectator-btn">Spettatore</button>';
            }
            
            actions += '<button class="player-action kick-btn">Espelli</button>';
            
            if (!player.isHost) {
                actions += '<button class="player-action make-host-btn">Host</button>';
            }
        }
        
        return actions;
    }
    
    // Configura gli eventi per le azioni dei giocatori
    setupPlayerActionEvents(playerElement, player) {
        // Azioni per il giocatore corrente
        const joinRedBtn = playerElement.querySelector('.join-red-btn');
        const joinBlueBtn = playerElement.querySelector('.join-blue-btn');
        const joinSpectatorBtn = playerElement.querySelector('.join-spectator-btn');
        
        if (joinRedBtn) {
            joinRedBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'red');
            });
        }
        
        if (joinBlueBtn) {
            joinBlueBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'blue');
            });
        }
        
        if (joinSpectatorBtn) {
            joinSpectatorBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'spectator');
            });
        }
        
        // Azioni per l'host
        const moveToRedBtn = playerElement.querySelector('.move-to-red-btn');
        const moveToBlueBtn = playerElement.querySelector('.move-to-blue-btn');
        const moveToSpectatorBtn = playerElement.querySelector('.move-to-spectator-btn');
        const kickBtn = playerElement.querySelector('.kick-btn');
        const makeHostBtn = playerElement.querySelector('.make-host-btn');
        
        if (moveToRedBtn) {
            moveToRedBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'red');
            });
        }
        
        if (moveToBlueBtn) {
            moveToBlueBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'blue');
            });
        }
        
        if (moveToSpectatorBtn) {
            moveToSpectatorBtn.addEventListener('click', () => {
                this.changeTeam(player.id, 'spectator');
            });
        }
        
        if (kickBtn) {
            kickBtn.addEventListener('click', () => {
                // Simula l'espulsione del giocatore
                this.handlePlayerLeft(player);
                this.uiManager.showNotification(`${player.nickname} è stato espulso dalla stanza`, 'info');
            });
        }
        
        if (makeHostBtn) {
            makeHostBtn.addEventListener('click', () => {
                // Simula il cambio di host
                this.handleHostChanged({
                    newHostId: player.id,
                    newHostNickname: player.nickname
                });
            });
        }
    }

    // Enhanced room filtering and search
    setRoomFilter(filterType, value) {
        if (this.roomFilters.hasOwnProperty(filterType)) {
            this.roomFilters[filterType] = value;
            this.updateRoomList();
        }
    }

    filterRooms(rooms) {
        return Array.from(rooms.values()).filter(room => {
            // Type filter
            if (this.roomFilters.type !== 'all' && room.type !== this.roomFilters.type) {
                return false;
            }
            
            // Status filter
            if (this.roomFilters.status !== 'all') {
                if (this.roomFilters.status === 'inProgress' && !room.gameInProgress) return false;
                if (this.roomFilters.status === 'waiting' && room.gameInProgress) return false;
            }
            
            // Players filter
            if (this.roomFilters.players !== 'all') {
                const playerCount = (room.redTeam?.length || 0) + (room.blueTeam?.length || 0);
                if (this.roomFilters.players === 'empty' && playerCount > 0) return false;
                if (this.roomFilters.players === 'full' && playerCount < room.maxPlayers) return false;
            }
            
            // Search filter
            if (this.roomFilters.search) {
                const searchTerm = this.roomFilters.search.toLowerCase();
                return room.name.toLowerCase().includes(searchTerm) ||
                       room.id.toLowerCase().includes(searchTerm);
            }
            
            return true;
        });
    }

    // Enhanced room settings management
    async saveRoomTemplate(templateName, settings) {
        try {
            // Validate template name
            if (!templateName || typeof templateName !== 'string') {
                throw new Error('Nome template non valido');
            }
            
            // Validate settings
            this.validateRoomSettings(settings);
            
            // Save template
            this.roomTemplates.set(templateName, settings);
            
            // Persist to storage
            await this.persistRoomTemplates();
            
            this.uiManager.showNotification('Template salvato con successo', 'success');
        } catch (error) {
            this.handleError({
                type: 'validation',
                message: error.message
            });
        }
    }

    async loadRoomTemplates() {
        try {
            const templates = await this.networkManager.getRoomTemplates();
            this.roomTemplates = new Map(Object.entries(templates));
        } catch (error) {
            this.handleError({
                type: 'network',
                message: 'Errore nel caricamento dei template'
            });
        }
    }

    async persistRoomTemplates() {
        try {
            const templates = Object.fromEntries(this.roomTemplates);
            await this.networkManager.saveRoomTemplates(templates);
        } catch (error) {
            this.handleError({
                type: 'network',
                message: 'Errore nel salvataggio dei template'
            });
        }
    }

    validateRoomSettings(settings) {
        const requiredFields = ['timeLimit', 'scoreLimit', 'field', 'teamLock'];
        const missingFields = requiredFields.filter(field => !settings.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
            throw new Error(`Campi mancanti: ${missingFields.join(', ')}`);
        }
        
        // Validate field values
        if (settings.timeLimit < 1 || settings.timeLimit > 30) {
            throw new Error('Limite tempo non valido (1-30 minuti)');
        }
        
        if (settings.scoreLimit < 1 || settings.scoreLimit > 10) {
            throw new Error('Limite punteggio non valido (1-10)');
        }
        
        if (!['standard', 'large', 'small'].includes(settings.field)) {
            throw new Error('Tipo campo non valido');
        }
    }
}

