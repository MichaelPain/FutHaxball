// roomUI.js - Interfaccia utente migliorata per le stanze di gioco

export class RoomUI {
    constructor(roomManager, authManager, uiManager) {
        this.roomManager = roomManager;
        this.authManager = authManager;
        this.uiManager = uiManager;
        this.container = null;
        this.chatContainer = null;
        this.teamsContainer = null;
        this.settingsContainer = null;
        this.fieldContainer = null;
        this.isHost = false;
        this.gameInProgress = false;
        
        // Riferimenti agli elementi UI
        this.elements = {
            roomName: null,
            redTeam: null,
            blueTeam: null,
            spectators: null,
            chatMessages: null,
            chatInput: null,
            fieldPreview: null,
            startGameBtn: null,
            gameSettings: null
        };
    }
    
    // Inizializza l'interfaccia della stanza
    init(container) {
        if (!container) return;
        
        this.container = container;
        
        // Ottieni lo stato corrente
        const room = this.roomManager.currentRoom;
        if (!room) return;
        
        this.isHost = this.roomManager.isHost;
        this.gameInProgress = room.gameInProgress || false;
        
        // Crea la struttura base della stanza
        this.createRoomStructure();
        
        // Aggiorna le informazioni della stanza
        this.updateRoomInfo(room);
        
        // Configura gli event listener
        this.setupEventListeners();
        
        // Aggiorna la visualizzazione in base allo stato della partita
        this.updateGameStateUI();
    }
    
    // Crea la struttura base della stanza
    createRoomStructure() {
        // Layout principale con due team ai lati e spettatori al centro
        this.container.innerHTML = `
            <div class="room-header">
                <h2 id="room-name">Nome Stanza</h2>
                <div class="room-actions">
                    ${this.isHost ? `
                        <button id="start-game-btn" class="primary-btn">${this.gameInProgress ? 'Ferma Partita' : 'Avvia Partita'}</button>
                        <button id="room-settings-btn" class="secondary-btn">Impostazioni</button>
                    ` : ''}
                    <button id="leave-room-btn" class="danger-btn">Esci</button>
                </div>
            </div>
            
            <div class="room-content">
                <div class="teams-container">
                    <div class="team-column red-team">
                        <h3>Squadra Rossa</h3>
                        <div id="red-team-list" class="team-list"></div>
                        <button id="join-red-btn" class="team-btn red-btn">Unisciti</button>
                    </div>
                    
                    <div class="spectators-column">
                        <h3>Spettatori</h3>
                        <div id="spectators-list" class="spectators-list"></div>
                        <button id="join-spectators-btn" class="team-btn spectator-btn">Osserva</button>
                    </div>
                    
                    <div class="team-column blue-team">
                        <h3>Squadra Blu</h3>
                        <div id="blue-team-list" class="team-list"></div>
                        <button id="join-blue-btn" class="team-btn blue-btn">Unisciti</button>
                    </div>
                </div>
                
                <div class="field-preview-container" style="display: none;">
                    <h3>Campo di Gioco</h3>
                    <div id="field-preview" class="field-preview"></div>
                </div>
                
                <div class="room-settings-container">
                    <h3>Impostazioni di Gioco</h3>
                    <div id="game-settings" class="game-settings">
                        <div class="settings-group">
                            <label for="field-type">Campo:</label>
                            <select id="field-type" class="setting-input" ${!this.isHost || this.gameInProgress ? 'disabled' : ''}>
                                <option value="standard">Standard</option>
                                <option value="large">Grande</option>
                                <option value="small">Piccolo</option>
                            </select>
                        </div>
                        <div class="settings-group">
                            <label for="time-limit">Tempo limite (minuti):</label>
                            <input type="number" id="time-limit" class="setting-input" min="1" max="30" value="5" ${!this.isHost || this.gameInProgress ? 'disabled' : ''}>
                        </div>
                        <div class="settings-group">
                            <label for="score-limit">Goal limite:</label>
                            <input type="number" id="score-limit" class="setting-input" min="1" max="20" value="3" ${!this.isHost || this.gameInProgress ? 'disabled' : ''}>
                        </div>
                        <div class="settings-group">
                            <label for="team-lock">Blocco squadre:</label>
                            <input type="checkbox" id="team-lock" class="setting-input" ${!this.isHost || this.gameInProgress ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>
                
                <div class="chat-container">
                    <div id="chat-messages" class="chat-messages"></div>
                    <div class="chat-input-container">
                        <input type="text" id="chat-input" class="chat-input" placeholder="Scrivi un messaggio...">
                        <button id="chat-send-btn" class="chat-send-btn">Invia</button>
                    </div>
                </div>
            </div>
        `;
        
        // Salva i riferimenti agli elementi UI
        this.elements.roomName = document.getElementById('room-name');
        this.elements.redTeam = document.getElementById('red-team-list');
        this.elements.blueTeam = document.getElementById('blue-team-list');
        this.elements.spectators = document.getElementById('spectators-list');
        this.elements.chatMessages = document.getElementById('chat-messages');
        this.elements.chatInput = document.getElementById('chat-input');
        this.elements.fieldPreview = document.getElementById('field-preview');
        this.elements.startGameBtn = document.getElementById('start-game-btn');
        this.elements.gameSettings = document.getElementById('game-settings');
        
        this.teamsContainer = document.querySelector('.teams-container');
        this.settingsContainer = document.querySelector('.room-settings-container');
        this.fieldContainer = document.querySelector('.field-preview-container');
        this.chatContainer = document.querySelector('.chat-container');
    }
    
    // Configura gli event listener
    setupEventListeners() {
        // Pulsante per avviare/fermare la partita (solo per l'host)
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn && this.isHost) {
            startGameBtn.addEventListener('click', () => {
                if (this.gameInProgress) {
                    this.stopGame();
                } else {
                    this.startGame();
                }
            });
        }
        
        // Pulsante per le impostazioni della stanza
        const roomSettingsBtn = document.getElementById('room-settings-btn');
        if (roomSettingsBtn) {
            roomSettingsBtn.addEventListener('click', () => {
                if (this.gameInProgress) {
                    // Durante la partita, mostra le impostazioni e nascondi il campo
                    this.toggleSettingsView();
                } else {
                    // Quando la partita non è in corso, le impostazioni sono già visibili
                    this.uiManager.showNotification('Le impostazioni sono già visibili', 'info');
                }
            });
        }
        
        // Pulsante per uscire dalla stanza
        const leaveRoomBtn = document.getElementById('leave-room-btn');
        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                // Chiedi conferma prima di uscire
                if (confirm('Sei sicuro di voler uscire dalla stanza?')) {
                    this.roomManager.leaveRoom();
                }
            });
        }
        
        // Pulsanti per unirsi alle squadre
        this.setupTeamButtons();
        
        // Chat
        const chatSendBtn = document.getElementById('chat-send-btn');
        const chatInput = document.getElementById('chat-input');
        
        if (chatSendBtn && chatInput) {
            // Invia messaggio al click del pulsante
            chatSendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
            
            // Invia messaggio alla pressione di Invio
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
        
        // Impostazioni di gioco (solo per l'host quando la partita non è in corso)
        if (this.isHost && !this.gameInProgress) {
            const fieldTypeSelect = document.getElementById('field-type');
            const timeLimitInput = document.getElementById('time-limit');
            const scoreLimitInput = document.getElementById('score-limit');
            const teamLockCheckbox = document.getElementById('team-lock');
            
            if (fieldTypeSelect) {
                fieldTypeSelect.addEventListener('change', () => {
                    this.updateGameSetting('field', fieldTypeSelect.value);
                });
            }
            
            if (timeLimitInput) {
                timeLimitInput.addEventListener('change', () => {
                    this.updateGameSetting('timeLimit', parseInt(timeLimitInput.value, 10));
                });
            }
            
            if (scoreLimitInput) {
                scoreLimitInput.addEventListener('change', () => {
                    this.updateGameSetting('scoreLimit', parseInt(scoreLimitInput.value, 10));
                });
            }
            
            if (teamLockCheckbox) {
                teamLockCheckbox.addEventListener('change', () => {
                    this.updateGameSetting('teamLock', teamLockCheckbox.checked);
                });
            }
        }
    }
    
    // Configura i pulsanti per unirsi alle squadre
    setupTeamButtons() {
        const joinRedBtn = document.getElementById('join-red-btn');
        const joinBlueBtn = document.getElementById('join-blue-btn');
        const joinSpectatorsBtn = document.getElementById('join-spectators-btn');
        
        // Disabilita i pulsanti se la partita è in corso e non sei l'host
        const disableButtons = this.gameInProgress && !this.isHost;
        
        if (joinRedBtn) {
            joinRedBtn.disabled = disableButtons;
            joinRedBtn.style.opacity = disableButtons ? '0.5' : '1';
            
            joinRedBtn.addEventListener('click', () => {
                if (!this.gameInProgress || this.isHost) {
                    this.roomManager.changeTeam('red');
                } else {
                    this.uiManager.showNotification('Non puoi cambiare squadra durante la partita', 'error');
                }
            });
        }
        
        if (joinBlueBtn) {
            joinBlueBtn.disabled = disableButtons;
            joinBlueBtn.style.opacity = disableButtons ? '0.5' : '1';
            
            joinBlueBtn.addEventListener('click', () => {
                if (!this.gameInProgress || this.isHost) {
                    this.roomManager.changeTeam('blue');
                } else {
                    this.uiManager.showNotification('Non puoi cambiare squadra durante la partita', 'error');
                }
            });
        }
        
        if (joinSpectatorsBtn) {
            joinSpectatorsBtn.disabled = disableButtons;
            joinSpectatorsBtn.style.opacity = disableButtons ? '0.5' : '1';
            
            joinSpectatorsBtn.addEventListener('click', () => {
                if (!this.gameInProgress || this.isHost) {
                    this.roomManager.changeTeam('spectator');
                } else {
                    this.uiManager.showNotification('Non puoi diventare spettatore durante la partita', 'error');
                }
            });
        }
    }
    
    // Invia un messaggio in chat
    sendChatMessage() {
        const chatInput = this.elements.chatInput;
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Invia il messaggio
        const event = new CustomEvent('sendChatMessage', {
            detail: { message }
        });
        document.dispatchEvent(event);
        
        // Pulisci l'input
        chatInput.value = '';
    }
    
    // Aggiorna un'impostazione di gioco
    updateGameSetting(setting, value) {
        if (!this.isHost || this.gameInProgress) {
            this.uiManager.showNotification('Solo l\'host può modificare le impostazioni quando la partita non è in corso', 'error');
            return;
        }
        
        // Aggiorna l'impostazione
        const settings = {};
        settings[setting] = value;
        this.roomManager.updateGameSettings(settings);
    }
    
    // Avvia la partita
    startGame() {
        if (!this.isHost) {
            this.uiManager.showNotification('Solo l\'host può avviare la partita', 'error');
            return;
        }
        
        // Verifica che ci siano abbastanza giocatori
        const room = this.roomManager.currentRoom;
        if (!room) return;
        
        const redTeamCount = room.redTeam?.length || 0;
        const blueTeamCount = room.blueTeam?.length || 0;
        
        if (redTeamCount === 0 || blueTeamCount === 0) {
            this.uiManager.showNotification('Entrambe le squadre devono avere almeno un giocatore', 'error');
            return;
        }
        
        // Aggiorna lo stato della partita
        this.gameInProgress = true;
        if (room) {
            room.gameInProgress = true;
        }
        
        // Aggiorna l'UI
        this.updateGameStateUI();
        
        // Notifica gli altri giocatori
        this.uiManager.showNotification('La partita è iniziata!', 'success');
        
        // In una versione reale, qui si dovrebbe notificare il server dell'inizio della partita
        const event = new CustomEvent('startGame');
        document.dispatchEvent(event);
    }
    
    // Ferma la partita
    stopGame() {
        if (!this.isHost) {
            this.uiManager.showNotification('Solo l\'host può fermare la partita', 'error');
            return;
        }
        
        // Aggiorna lo stato della partita
        this.gameInProgress = false;
        const room = this.roomManager.currentRoom;
        if (room) {
            room.gameInProgress = false;
        }
        
        // Aggiorna l'UI
        this.updateGameStateUI();
        
        // Notifica gli altri giocatori
        this.uiManager.showNotification('La partita è stata fermata', 'info');
        
        // In una versione reale, qui si dovrebbe notificare il server della fine della partita
        const event = new CustomEvent('stopGame');
        document.dispatchEvent(event);
    }
    
    // Aggiorna l'UI in base allo stato della partita
    updateGameStateUI() {
        // Aggiorna il testo del pulsante avvia/ferma partita
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.textContent = this.gameInProgress ? 'Ferma Partita' : 'Avvia Partita';
        }
        
        // Mostra/nascondi il campo di gioco
        if (this.fieldContainer) {
            this.fieldContainer.style.display = this.gameInProgress ? 'block' : 'none';
        }
        
        // Mostra/nascondi le impostazioni
        if (this.settingsContainer) {
            this.settingsContainer.style.display = this.gameInProgress ? 'none' : 'block';
        }
        
        // Aggiorna i pulsanti per unirsi alle squadre
        this.setupTeamButtons();
        
        // Disabilita/abilita i campi delle impostazioni
        this.updateSettingsFields();
        
        // Se la partita è in corso, inizializza il campo di gioco
        if (this.gameInProgress) {
            this.initGameField();
        }
    }
    
    // Aggiorna i campi delle impostazioni
    updateSettingsFields() {
        const fieldTypeSelect = document.getElementById('field-type');
        const timeLimitInput = document.getElementById('time-limit');
        const scoreLimitInput = document.getElementById('score-limit');
        const teamLockCheckbox = document.getElementById('team-lock');
        
        const disableFields = !this.isHost || this.gameInProgress;
        
        if (fieldTypeSelect) fieldTypeSelect.disabled = disableFields;
        if (timeLimitInput) timeLimitInput.disabled = disableFields;
        if (scoreLimitInput) scoreLimitInput.disabled = disableFields;
        if (teamLockCheckbox) teamLockCheckbox.disabled = disableFields;
    }
    
    // Mostra/nascondi le impostazioni durante la partita
    toggleSettingsView() {
        if (!this.gameInProgress) return;
        
        // Se il campo è visibile, mostra le impostazioni e nascondi il campo
        if (this.fieldContainer.style.display === 'block') {
            this.fieldContainer.style.display = 'none';
            this.settingsContainer.style.display = 'block';
        } else {
            // Altrimenti, mostra il campo e nascondi le impostazioni
            this.fieldContainer.style.display = 'block';
            this.settingsContainer.style.display = 'none';
        }
    }
    
    // Inizializza il campo di gioco
    initGameField() {
        if (!this.elements.fieldPreview) return;
        
        const room = this.roomManager.currentRoom;
        if (!room || !room.gameSettings) return;
        
        const fieldType = room.gameSettings.field || 'standard';
        
        // Crea il campo di gioco
        this.elements.fieldPreview.innerHTML = `
            <div class="game-field ${fieldType}-field">
                <div class="field-lines">
                    <div class="center-circle"></div>
                    <div class="center-line"></div>
                    <div class="red-goal"></div>
                    <div class="blue-goal"></div>
                    <div class="penalty-area red-penalty"></div>
                    <div class="penalty-area blue-penalty"></div>
                </div>
                <div class="game-ball"></div>
                <div class="red-players"></div>
                <div class="blue-players"></div>
                <div class="game-score">
                    <span class="red-score">0</span>
                    <span class="score-separator">-</span>
                    <span class="blue-score">0</span>
                </div>
                <div class="game-timer">${room.gameSettings.timeLimit || 5}:00</div>
            </div>
        `;
    }
    
    // Aggiorna le informazioni della stanza
    updateRoomInfo(room) {
        if (!room || !this.elements.roomName) return;
        
        // Aggiorna il nome della stanza
        this.elements.roomName.textContent = room.name;
        
        // Aggiorna lo stato di host e partita in corso
        this.isHost = this.roomManager.isHost;
        this.gameInProgress = room.gameInProgress || false;
        
        // Aggiorna le liste dei giocatori
        this.updateTeamsList(room);
        
        // Aggiorna le impostazioni di gioco
        this.updateGameSettings(room.gameSettings);
        
        // Aggiorna l'UI in base allo stato della partita
        this.updateGameStateUI();
    }
    
    // Aggiorna le liste dei giocatori
    updateTeamsList(room) {
        if (!room) return;
        
        // Pulisci le liste
        if (this.elements.redTeam) this.elements.redTeam.innerHTML = '';
        if (this.elements.blueTeam) this.elements.blueTeam.innerHTML = '';
        if (this.elements.spectators) this.elements.spectators.innerHTML = '';
        
        // Funzione per creare un elemento giocatore
        const createPlayerElement = (player, team) => {
            const playerElement = document.createElement('div');
            playerElement.className = `player-item ${player.isHost ? 'host' : ''}`;
            playerElement.setAttribute('data-player-id', player.id);
            
            // Ottieni l'ID del giocatore corrente
            const currentPlayerId = this.authManager.isLoggedIn() ? this.authManager.getUser().id : null;
            const isCurrentPlayer = player.id === currentPlayerId;
            
            playerElement.innerHTML = `
                <span class="player-name ${isCurrentPlayer ? 'current-player' : ''}">${player.nickname} ${player.isHost ? '(Host)' : ''}</span>
                ${this.isHost && !isCurrentPlayer && (!this.gameInProgress || this.isHost) ? `
                    <div class="player-actions">
                        <button class="move-player-btn" data-action="move" data-target="${team === 'red' ? 'blue' : (team === 'blue' ? 'spectator' : 'red')}" title="Sposta">↔</button>
                        <button class="kick-player-btn" data-action="kick" title="Espelli">✕</button>
                    </div>
                ` : ''}
            `;
            
            // Aggiungi event listener per le azioni sui giocatori (solo per l'host)
            if (this.isHost && !isCurrentPlayer) {
                const moveBtn = playerElement.querySelector('.move-player-btn');
                const kickBtn = playerElement.querySelector('.kick-player-btn');
                
                if (moveBtn) {
                    moveBtn.addEventListener('click', () => {
                        if (!this.gameInProgress || this.isHost) {
                            const targetTeam = moveBtn.getAttribute('data-target');
                            this.roomManager.movePlayer(player.id, targetTeam);
                        } else {
                            this.uiManager.showNotification('Non puoi spostare i giocatori durante la partita', 'error');
                        }
                    });
                }
                
                if (kickBtn) {
                    kickBtn.addEventListener('click', () => {
                        if (confirm(`Sei sicuro di voler espellere ${player.nickname}?`)) {
                            this.roomManager.kickPlayer(player.id);
                        }
                    });
                }
            }
            
            return playerElement;
        };
        
        // Aggiungi i giocatori alle liste
        if (room.redTeam && this.elements.redTeam) {
            room.redTeam.forEach(player => {
                this.elements.redTeam.appendChild(createPlayerElement(player, 'red'));
            });
        }
        
        if (room.blueTeam && this.elements.blueTeam) {
            room.blueTeam.forEach(player => {
                this.elements.blueTeam.appendChild(createPlayerElement(player, 'blue'));
            });
        }
        
        if (room.spectators && this.elements.spectators) {
            room.spectators.forEach(player => {
                this.elements.spectators.appendChild(createPlayerElement(player, 'spectator'));
            });
        }
    }
    
    // Aggiorna le impostazioni di gioco
    updateGameSettings(settings) {
        if (!settings) return;
        
        const fieldTypeSelect = document.getElementById('field-type');
        const timeLimitInput = document.getElementById('time-limit');
        const scoreLimitInput = document.getElementById('score-limit');
        const teamLockCheckbox = document.getElementById('team-lock');
        
        if (fieldTypeSelect) fieldTypeSelect.value = settings.field || 'standard';
        if (timeLimitInput) timeLimitInput.value = settings.timeLimit || 5;
        if (scoreLimitInput) scoreLimitInput.value = settings.scoreLimit || 3;
        if (teamLockCheckbox) teamLockCheckbox.checked = settings.teamLock || false;
    }
    
    // Ottieni informazioni sul campo
    getFieldInfo(fieldType) {
        const fieldInfo = {
            standard: {
                width: 800,
                height: 400,
                centerCircleRadius: 50,
                goalWidth: 10,
                goalHeight: 100
            },
            large: {
                width: 1000,
                height: 500,
                centerCircleRadius: 60,
                goalWidth: 12,
                goalHeight: 120
            },
            small: {
                width: 600,
                height: 300,
                centerCircleRadius: 40,
                goalWidth: 8,
                goalHeight: 80
            }
        };
        
        return fieldInfo[fieldType] || fieldInfo.standard;
    }
}
