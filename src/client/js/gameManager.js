// gameManager.js - Implementazione reale del gestore di gioco

import { FieldRenderer } from './fieldRenderer.js';
import { GamePhysics } from './gamePhysics.js';
import { PlayerController } from './playerController.js';
import { GameRules } from './gameRules.js';

export class GameManager {
    constructor(networkManager, uiManager) {
        this.networkManager = networkManager;
        this.uiManager = uiManager;
        this.fieldRenderer = null;
        this.gamePhysics = null;
        this.playerController = null;
        this.gameRules = null;
        this.gameLoop = null;
        this.isGameRunning = false;
        this.currentRoom = null;
        this.players = new Map();
        this.ball = null;
        this.score = { red: 0, blue: 0 };
        this.gameTime = 0;
        this.gameStartTime = 0;
        this.lastUpdateTime = 0;
        this.gameSettings = {
            timeLimit: 5 * 60, // 5 minuti in secondi
            scoreLimit: 3,
            field: 'standard',
            teamLock: false
        };
        
        // Binding dei metodi
        this.update = this.update.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Inizializza gli event listeners
        this.setupEventListeners();
    }
    
    // Inizializza il gestore di gioco
    init() {
        console.log("Inizializzazione GameManager");
        
        // Inizializza il renderer del campo
        this.fieldRenderer = new FieldRenderer('game-container');
        
        // Inizializza la fisica del gioco
        this.gamePhysics = new GamePhysics();
        
        // Inizializza il controller del giocatore
        this.playerController = new PlayerController(this);
        
        // Inizializza le regole del gioco
        this.gameRules = new GameRules(this);
        
        return this;
    }
    
    // Configura gli event listeners
    setupEventListeners() {
        // Event listeners per gli input da tastiera
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Event listeners per gli eventi di rete
        if (this.networkManager) {
            this.networkManager.on('gameStarted', (data) => this.handleGameStarted(data));
            this.networkManager.on('gameEnded', (data) => this.handleGameEnded(data));
            this.networkManager.on('playerJoined', (data) => this.handlePlayerJoined(data));
            this.networkManager.on('playerLeft', (data) => this.handlePlayerLeft(data));
            this.networkManager.on('ballMoved', (data) => this.handleBallMoved(data));
            this.networkManager.on('playerMoved', (data) => this.handlePlayerMoved(data));
            this.networkManager.on('goalScored', (data) => this.handleGoalScored(data));
            this.networkManager.on('gameStateUpdate', (data) => this.handleGameStateUpdate(data));
        }
    }
    
    // Rimuovi gli event listeners
    removeEventListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
    
    // Gestisci l'evento keydown
    handleKeyDown(event) {
        if (!this.isGameRunning) return;
        
        // Passa l'evento al controller del giocatore
        this.playerController.handleKeyDown(event);
    }
    
    // Gestisci l'evento keyup
    handleKeyUp(event) {
        if (!this.isGameRunning) return;
        
        // Passa l'evento al controller del giocatore
        this.playerController.handleKeyUp(event);
    }
    
    // Gestisci l'evento di avvio del gioco
    handleGameStarted(data) {
        console.log("Gioco avviato:", data);
        
        // Imposta la stanza corrente
        this.currentRoom = data.roomId;
        
        // Avvia il gioco
        this.startGame(data);
    }
    
    // Gestisci l'evento di fine del gioco
    handleGameEnded(data) {
        console.log("Gioco terminato:", data);
        
        // Ferma il gioco
        this.stopGame();
        
        // Mostra i risultati
        this.showResults(data.results);
    }
    
    // Gestisci l'evento di ingresso di un giocatore
    handlePlayerJoined(data) {
        console.log("Giocatore entrato:", data);
        
        // Aggiungi il giocatore alla mappa dei giocatori
        this.players.set(data.id, {
            id: data.id,
            nickname: data.nickname,
            team: data.team,
            x: 0,
            y: 0,
            dx: 0,
            dy: 0,
            isMoving: false,
            isKicking: false
        });
        
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.addPlayer(data.id, data.nickname, data.team);
        }
    }
    
    // Gestisci l'evento di uscita di un giocatore
    handlePlayerLeft(data) {
        console.log("Giocatore uscito:", data);
        
        // Rimuovi il giocatore dalla mappa dei giocatori
        this.players.delete(data.id);
        
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.removePlayer(data.id);
        }
    }
    
    // Gestisci l'evento di movimento della palla
    handleBallMoved(data) {
        // Aggiorna la posizione della palla
        this.ball = {
            x: data.x,
            y: data.y,
            dx: data.dx,
            dy: data.dy
        };
        
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.updateBall(this.ball);
        }
    }
    
    // Gestisci l'evento di movimento di un giocatore
    handlePlayerMoved(data) {
        // Aggiorna la posizione del giocatore
        const player = this.players.get(data.id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.dx = data.dx;
            player.dy = data.dy;
            player.isMoving = data.isMoving;
            player.isKicking = data.isKicking;
            
            // Aggiorna il renderer
            if (this.fieldRenderer) {
                this.fieldRenderer.updatePlayer(player);
            }
        }
    }
    
    // Gestisci l'evento di goal
    handleGoalScored(data) {
        console.log("Goal segnato:", data);
        
        // Aggiorna il punteggio
        this.score[data.team]++;
        
        // Aggiorna l'UI
        this.uiManager.updateGameScore(this.score.red, this.score.blue);
        
        // Verifica se la partita è finita
        if (this.score.red >= this.gameSettings.scoreLimit || this.score.blue >= this.gameSettings.scoreLimit) {
            // La partita è finita per limite di punteggio
            this.endGame();
        } else {
            // Resetta le posizioni per il nuovo kickoff
            this.resetPositions();
        }
    }
    
    // Gestisci l'aggiornamento dello stato del gioco
    handleGameStateUpdate(data) {
        // Aggiorna il punteggio
        this.score = data.score;
        
        // Aggiorna il tempo di gioco
        this.gameTime = data.gameTime;
        
        // Aggiorna l'UI
        this.uiManager.updateGameScore(this.score.red, this.score.blue);
        this.updateGameTimer();
        
        // Aggiorna le posizioni dei giocatori e della palla
        data.players.forEach(playerData => {
            const player = this.players.get(playerData.id);
            if (player) {
                player.x = playerData.x;
                player.y = playerData.y;
                player.dx = playerData.dx;
                player.dy = playerData.dy;
                player.isMoving = playerData.isMoving;
                player.isKicking = playerData.isKicking;
                
                // Aggiorna il renderer
                if (this.fieldRenderer) {
                    this.fieldRenderer.updatePlayer(player);
                }
            }
        });
        
        // Aggiorna la palla
        if (data.ball) {
            this.ball = data.ball;
            
            // Aggiorna il renderer
            if (this.fieldRenderer) {
                this.fieldRenderer.updateBall(this.ball);
            }
        }
    }
    
    // Inizializza il gioco con i dati della stanza
    initializeGame(roomData) {
        console.log("Inizializzazione gioco con dati stanza:", roomData);
        
        // Salva i dati della stanza
        this.currentRoom = roomData;
        
        // Imposta le impostazioni di gioco
        if (roomData.gameSettings) {
            this.gameSettings = roomData.gameSettings;
        }
        
        // Inizializza il campo di gioco
        this.initField();
        
        // Inizializza i giocatori
        this.initPlayers(roomData);
        
        // Inizializza la palla
        this.initBall();
        
        // Resetta il punteggio
        this.score = { red: 0, blue: 0 };
        
        // Aggiorna l'UI
        this.uiManager.updateGameScore(this.score.red, this.score.blue);
        
        return true;
    }
    
    // Inizializza il campo di gioco
    initField() {
        // Ottieni il container del campo
        const fieldContainer = document.getElementById('game-container');
        if (!fieldContainer) {
            console.error('Container del campo non trovato');
            return false;
        }
        
        // Inizializza il renderer del campo
        if (!this.fieldRenderer) {
            this.fieldRenderer = new FieldRenderer('game-container');
        }
        
        // Imposta il tipo di campo
        this.fieldRenderer.setFieldType(this.gameSettings.field);
        
        // Inizializza il campo
        this.fieldRenderer.init();
        
        return true;
    }
    
    // Inizializza i giocatori
    initPlayers(roomData) {
        // Resetta la mappa dei giocatori
        this.players.clear();
        
        // Aggiungi i giocatori della squadra rossa
        if (roomData.redTeam) {
            roomData.redTeam.forEach(player => {
                this.players.set(player.id, {
                    id: player.id,
                    nickname: player.nickname,
                    team: 'red',
                    x: 0,
                    y: 0,
                    dx: 0,
                    dy: 0,
                    isMoving: false,
                    isKicking: false
                });
                
                // Aggiungi il giocatore al renderer
                if (this.fieldRenderer) {
                    this.fieldRenderer.addPlayer(player.id, player.nickname, 'red');
                }
            });
        }
        
        // Aggiungi i giocatori della squadra blu
        if (roomData.blueTeam) {
            roomData.blueTeam.forEach(player => {
                this.players.set(player.id, {
                    id: player.id,
                    nickname: player.nickname,
                    team: 'blue',
                    x: 0,
                    y: 0,
                    dx: 0,
                    dy: 0,
                    isMoving: false,
                    isKicking: false
                });
                
                // Aggiungi il giocatore al renderer
                if (this.fieldRenderer) {
                    this.fieldRenderer.addPlayer(player.id, player.nickname, 'blue');
                }
            });
        }
    }
    
    // Inizializza la palla
    initBall() {
        // Crea la palla
        this.ball = {
            x: 0,
            y: 0,
            dx: 0,
            dy: 0
        };
        
        // Aggiungi la palla al renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.addBall(this.ball);
        }
    }
    
    // Avvia il gioco
    startGame(gameData) {
        console.log("Avvio gioco:", gameData);
        
        // Verifica che il gioco sia stato inizializzato
        if (!this.fieldRenderer || !this.fieldRenderer.initialized) {
            console.error('Gioco non inizializzato');
            return false;
        }
        
        // Imposta lo stato di gioco
        this.isGameRunning = true;
        
        // Imposta il tempo di inizio
        this.gameStartTime = Date.now();
        this.lastUpdateTime = this.gameStartTime;
        
        // Resetta le posizioni
        this.resetPositions();
        
        // Avvia il loop di gioco
        this.startGameLoop();
        
        // Invia un evento di avvio partita
        const gameStartEvent = new CustomEvent('gameStarted', { detail: gameData });
        document.dispatchEvent(gameStartEvent);
        
        return true;
    }
    
    // Resetta le posizioni dei giocatori e della palla
    resetPositions() {
        // Posiziona i giocatori nelle posizioni iniziali
        this.players.forEach(player => {
            if (player.team === 'red') {
                // Posiziona i giocatori rossi a sinistra
                player.x = -200;
                player.y = 0;
            } else {
                // Posiziona i giocatori blu a destra
                player.x = 200;
                player.y = 0;
            }
            
            player.dx = 0;
            player.dy = 0;
            player.isMoving = false;
            player.isKicking = false;
            
            // Aggiorna il renderer
            if (this.fieldRenderer) {
                this.fieldRenderer.updatePlayer(player);
            }
        });
        
        // Posiziona la palla al centro
        this.ball.x = 0;
        this.ball.y = 0;
        this.ball.dx = 0;
        this.ball.dy = 0;
        
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.updateBall(this.ball);
        }
    }
    
    // Avvia il loop di gioco
    startGameLoop() {
        // Cancella il loop precedente se esiste
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // Avvia il loop
        this.gameLoop = requestAnimationFrame(this.update);
    }
    
    // Aggiorna il gioco
    update() {
        if (!this.isGameRunning) return;
        
        // Calcola il delta time
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000; // in secondi
        this.lastUpdateTime = now;
        
        // Aggiorna il tempo di gioco
        this.gameTime = (now - this.gameStartTime) / 1000; // in secondi
        
        // Verifica se il tempo è scaduto
        if (this.gameTime >= this.gameSettings.timeLimit) {
            // La partita è finita per limite di tempo
            this.endGame();
            return;
        }
        
        // Aggiorna il timer
        this.updateGameTimer();
        
        // Aggiorna la fisica del gioco
        this.updateGamePhysics(deltaTime);
        
        // Aggiorna l'UI
        this.updateGameUI();
        
        // Continua il loop
        this.gameLoop = requestAnimationFrame(this.update);
    }
    
    // Aggiorna la fisica del gioco
    updateGamePhysics(deltaTime) {
        if (!this.gamePhysics) return;
        
        // Aggiorna la fisica dei giocatori
        this.players.forEach(player => {
            this.gamePhysics.updatePlayerPhysics(player, deltaTime);
        });
        
        // Aggiorna la fisica della palla
        this.gamePhysics.updateBallPhysics(this.ball, deltaTime);
        
        // Verifica le collisioni
        this.gamePhysics.checkCollisions(this.players, this.ball);
        
        // Verifica i goal
        const goalTeam = this.gamePhysics.checkGoal(this.ball);
        if (goalTeam) {
            // È stato segnato un goal
            this.handleGoalScored({ team: goalTeam === 'left' ? 'blue' : 'red' });
        }
    }
    
    // Aggiorna l'UI del gioco
    updateGameUI() {
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            // Aggiorna i giocatori
            this.players.forEach(player => {
                this.fieldRenderer.updatePlayer(player);
            });
            
            // Aggiorna la palla
            this.fieldRenderer.updateBall(this.ball);
        }
    }
    
    // Aggiorna il timer di gioco
    updateGameTimer() {
        // Calcola il tempo rimanente
        const timeRemaining = Math.max(0, this.gameSettings.timeLimit - this.gameTime);
        
        // Formatta il tempo
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
        
        // Aggiorna l'UI
        this.uiManager.updateGameTimer(`${minutes}:${seconds}`);
    }
    
    // Termina il gioco
    endGame() {
        console.log("Fine gioco");
        
        // Imposta lo stato di gioco
        this.isGameRunning = false;
        
        // Cancella il loop di gioco
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Prepara i risultati
        const results = {
            score: this.score,
            duration: this.gameTime,
            winner: this.score.red > this.score.blue ? 'red' : (this.score.blue > this.score.red ? 'blue' : 'draw')
        };
        
        // Mostra i risultati
        this.showResults(results);
        
        // Invia un evento di fine partita
        const gameEndEvent = new CustomEvent('gameEnded', { detail: results });
        document.dispatchEvent(gameEndEvent);
        
        // Notifica il server
        if (this.networkManager) {
            this.networkManager.endGame(this.currentRoom.id, results);
        }
        
        return true;
    }
    
    // Mostra i risultati della partita
    showResults(results) {
        // Crea un elemento per mostrare i risultati
        const resultsElement = document.createElement('div');
        resultsElement.className = 'game-results';
        
        // Crea il contenuto
        let content = '<h2>Risultati della partita</h2>';
        content += `<div class="score-display"><span class="team-red">${results.score.red}</span><span class="score-separator">-</span><span class="team-blue">${results.score.blue}</span></div>`;
        
        // Mostra il vincitore
        if (results.winner === 'red') {
            content += '<p class="winner-message">La squadra rossa ha vinto!</p>';
        } else if (results.winner === 'blue') {
            content += '<p class="winner-message">La squadra blu ha vinto!</p>';
        } else {
            content += '<p class="winner-message">Pareggio!</p>';
        }
        
        // Mostra la durata
        const minutes = Math.floor(results.duration / 60).toString().padStart(2, '0');
        const seconds = Math.floor(results.duration % 60).toString().padStart(2, '0');
        content += `<p class="duration">Durata: ${minutes}:${seconds}</p>`;
        
        // Aggiungi i pulsanti
        content += '<div class="results-buttons">';
        content += '<button class="back-to-room-btn">Torna alla stanza</button>';
        content += '<button class="back-to-menu-btn">Torna al menu</button>';
        content += '</div>';
        
        // Imposta il contenuto
        resultsElement.innerHTML = content;
        
        // Aggiungi l'elemento al documento
        document.body.appendChild(resultsElement);
        
        // Configura i pulsanti
        const backToRoomBtn = resultsElement.querySelector('.back-to-room-btn');
        if (backToRoomBtn) {
            backToRoomBtn.addEventListener('click', () => {
                // Rimuovi l'elemento dei risultati
                resultsElement.remove();
                
                // Torna alla schermata della stanza
                this.uiManager.showScreen('room-screen', { roomId: this.currentRoom.id });
            });
        }
        
        const backToMenuBtn = resultsElement.querySelector('.back-to-menu-btn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                // Rimuovi l'elemento dei risultati
                resultsElement.remove();
                
                // Torna al menu principale
                this.uiManager.showScreen('main-menu-screen');
            });
        }
    }
    
    // Ferma il gioco
    stopGame() {
        console.log("Arresto gioco");
        
        // Imposta lo stato di gioco
        this.isGameRunning = false;
        
        // Cancella il loop di gioco
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        // Rimuovi gli event listeners
        this.removeEventListeners();
        
        return true;
    }
    
    // Verifica se il gioco è in corso
    isGameInProgress() {
        return this.isGameRunning;
    }
    
    // Ottieni l'ID del giocatore locale
    getLocalPlayerId() {
        return this.networkManager ? this.networkManager.getPlayerId() : null;
    }
    
    // Ottieni i dati del giocatore locale
    getLocalPlayer() {
        const playerId = this.getLocalPlayerId();
        return playerId ? this.players.get(playerId) : null;
    }
    
    // Ottieni i dati di un giocatore
    getPlayerData(playerId) {
        return this.players.get(playerId);
    }
    
    // Aggiorna la direzione di un giocatore
    updatePlayerDirection(playerId, dx, dy) {
        const player = this.players.get(playerId);
        if (player) {
            player.dx = dx;
            player.dy = dy;
            player.isMoving = (dx !== 0 || dy !== 0);
            
            // Aggiorna il renderer
            if (this.fieldRenderer) {
                this.fieldRenderer.updatePlayer(player);
            }
            
            // Notifica il server
            if (this.networkManager) {
                this.networkManager.updatePlayerDirection(playerId, dx, dy);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Aggiorna lo stato di un giocatore
    updatePlayerState(playerId, state) {
        const player = this.players.get(playerId);
        if (player) {
            // Aggiorna lo stato del giocatore
            Object.assign(player, state);
            
            // Aggiorna il renderer
            if (this.fieldRenderer) {
                this.fieldRenderer.updatePlayer(player);
            }
            
            // Notifica il server
            if (this.networkManager) {
                this.networkManager.updatePlayerState(playerId, state);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Muovi un giocatore
    movePlayer(playerId, dx, dy) {
        return this.updatePlayerDirection(playerId, dx, dy);
    }
    
    // Calcio della palla
    kickBall(playerId, power) {
        const player = this.players.get(playerId);
        if (!player || !this.ball) return false;
        
        // Verifica che il giocatore sia vicino alla palla
        const distance = Math.sqrt(
            Math.pow(player.x - this.ball.x, 2) + 
            Math.pow(player.y - this.ball.y, 2)
        );
        
        if (distance > 30) return false; // Il giocatore è troppo lontano dalla palla
        
        // Calcola la direzione del calcio
        const dirX = this.ball.x - player.x;
        const dirY = this.ball.y - player.y;
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        
        // Normalizza la direzione
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        
        // Applica la forza alla palla
        this.ball.dx = normalizedDirX * power;
        this.ball.dy = normalizedDirY * power;
        
        // Aggiorna il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.updateBall(this.ball);
        }
        
        // Notifica il server
        if (this.networkManager) {
            this.networkManager.kickBall(playerId, power, normalizedDirX, normalizedDirY);
        }
        
        return true;
    }
    
    // Distruggi il gestore di gioco
    destroy() {
        // Ferma il gioco
        this.stopGame();
        
        // Rimuovi gli event listeners
        this.removeEventListeners();
        
        // Distruggi il renderer
        if (this.fieldRenderer) {
            this.fieldRenderer.destroy();
            this.fieldRenderer = null;
        }
        
        // Resetta le variabili
        this.players.clear();
        this.ball = null;
        this.currentRoom = null;
        this.isGameRunning = false;
    }
}
