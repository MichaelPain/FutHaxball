// gameSetupMenu.js - Gestisce il menu di configurazione del gioco prima dell'inizio della partita

export class GameSetupMenu {
    constructor() {
        this.container = null;
        this.gameData = null;
        this.onSetupComplete = null;
        this.teams = {
            red: [],
            blue: [],
            spectators: []
        };
        this.settings = {
            timeLimit: 5, // minuti
            scoreLimit: 3,
            teamLock: false,
            allowSpectators: true
        };
    }

    // Mostra il menu di configurazione
    show(gameData, callback) {
        console.log("Mostrando menu di configurazione del gioco", gameData);
        
        this.gameData = gameData;
        this.onSetupComplete = callback;
        
        // Crea il container del menu se non esiste
        if (!this.container) {
            this.createMenuContainer();
        }
        
        // Mostra il container
        this.container.style.display = 'flex';
        
        // Inizializza i dati delle squadre
        this.initTeams();
        
        // Popola il menu con i dati
        this.populateMenu();
        
        // Configura gli event listener
        this.setupEventListeners();
    }
    
    // Crea il container del menu
    createMenuContainer() {
        this.container = document.createElement('div');
        this.container.className = 'game-setup-menu';
        this.container.style.display = 'none';
        
        // Struttura del menu
        this.container.innerHTML = `
            <div class="setup-menu-content">
                <div class="setup-header">
                    <h2>Configurazione Partita</h2>
                </div>
                <div class="setup-teams">
                    <div class="team-column red-team">
                        <h3>Squadra Rossa</h3>
                        <div class="team-players" id="red-team-players"></div>
                        <button class="join-team-btn" data-team="red">Unisciti</button>
                    </div>
                    <div class="team-column blue-team">
                        <h3>Squadra Blu</h3>
                        <div class="team-players" id="blue-team-players"></div>
                        <button class="join-team-btn" data-team="blue">Unisciti</button>
                    </div>
                    <div class="team-column spectators">
                        <h3>Spettatori</h3>
                        <div class="team-players" id="spectators-players"></div>
                        <button class="join-team-btn" data-team="spectators">Osserva</button>
                    </div>
                </div>
                <div class="setup-settings">
                    <h3>Impostazioni</h3>
                    <div class="settings-grid">
                        <div class="setting-item">
                            <label for="time-limit">Tempo limite (minuti):</label>
                            <input type="number" id="time-limit" min="1" max="15" value="5">
                        </div>
                        <div class="setting-item">
                            <label for="score-limit">Punteggio limite:</label>
                            <input type="number" id="score-limit" min="1" max="10" value="3">
                        </div>
                        <div class="setting-item">
                            <label for="team-lock">Blocca squadre:</label>
                            <input type="checkbox" id="team-lock">
                        </div>
                        <div class="setting-item">
                            <label for="allow-spectators">Permetti spettatori:</label>
                            <input type="checkbox" id="allow-spectators" checked>
                        </div>
                    </div>
                </div>
                <div class="setup-actions">
                    <button id="start-game-btn" class="btn-primary">Inizia Partita</button>
                    <button id="cancel-setup-btn" class="btn-secondary">Annulla</button>
                </div>
            </div>
        `;
        
        // Aggiungi il container al game-screen
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            gameScreen.appendChild(this.container);
        } else {
            document.body.appendChild(this.container);
        }
        
        // Aggiungi stili CSS
        this.addStyles();
    }
    
    // Aggiungi stili CSS
    addStyles() {
        const styleId = 'game-setup-menu-styles';
        
        // Verifica se gli stili sono già stati aggiunti
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .game-setup-menu {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                
                .setup-menu-content {
                    background-color: #222;
                    border-radius: 8px;
                    padding: 20px;
                    width: 90%;
                    max-width: 1000px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                    border: 2px solid #4caf50;
                }
                
                .setup-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #444;
                }
                
                .setup-header h2 {
                    color: #4caf50;
                    font-size: 24px;
                    margin: 0;
                }
                
                .setup-teams {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                }
                
                .team-column {
                    flex: 1;
                    background-color: #333;
                    border-radius: 8px;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                }
                
                .red-team {
                    border-left: 4px solid #f44336;
                }
                
                .blue-team {
                    border-left: 4px solid #2196f3;
                }
                
                .spectators {
                    border-left: 4px solid #9e9e9e;
                }
                
                .team-column h3 {
                    text-align: center;
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #fff;
                    font-size: 18px;
                }
                
                .red-team h3 {
                    color: #f44336;
                }
                
                .blue-team h3 {
                    color: #2196f3;
                }
                
                .spectators h3 {
                    color: #9e9e9e;
                }
                
                .team-players {
                    flex: 1;
                    min-height: 150px;
                    margin-bottom: 15px;
                    background-color: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                    padding: 10px;
                    overflow-y: auto;
                }
                
                .player-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    margin-bottom: 5px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                
                .player-name {
                    color: #fff;
                    font-size: 14px;
                }
                
                .player-actions {
                    display: flex;
                    gap: 5px;
                }
                
                .player-action-btn {
                    background-color: transparent;
                    border: none;
                    color: #ccc;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 2px 5px;
                    border-radius: 2px;
                }
                
                .player-action-btn:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                    color: #fff;
                }
                
                .join-team-btn {
                    background-color: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: #fff;
                    padding: 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
                
                .join-team-btn:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }
                
                .setup-settings {
                    background-color: #333;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                
                .setup-settings h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: #4caf50;
                    font-size: 18px;
                }
                
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .setting-item {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .setting-item label {
                    color: #ccc;
                    font-size: 14px;
                }
                
                .setting-item input[type="number"] {
                    background-color: #444;
                    border: 1px solid #555;
                    color: #fff;
                    padding: 8px;
                    border-radius: 4px;
                    width: 100%;
                }
                
                .setting-item input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    accent-color: #4caf50;
                }
                
                .setup-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                }
                
                .btn-primary, .btn-secondary {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
                
                .btn-primary {
                    background-color: #4caf50;
                    color: white;
                }
                
                .btn-primary:hover {
                    background-color: #388e3c;
                }
                
                .btn-secondary {
                    background-color: #555;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background-color: #777;
                }
                
                @media (max-width: 768px) {
                    .setup-teams {
                        flex-direction: column;
                    }
                    
                    .settings-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Inizializza i dati delle squadre
    initTeams() {
        // Resetta le squadre
        this.teams = {
            red: [],
            blue: [],
            spectators: []
        };
        
        // Se ci sono dati di gioco, usa quelli
        if (this.gameData && this.gameData.teams) {
            this.teams = this.gameData.teams;
        } else {
            // Altrimenti, crea dati di esempio
            // Aggiungi il giocatore locale alla squadra rossa
            this.teams.red.push({
                id: 'local-player',
                nickname: 'Tu',
                isLocal: true
            });
            
            // Aggiungi alcuni bot alla squadra blu
            this.teams.blue.push({
                id: 'bot1',
                nickname: 'Bot 1',
                isBot: true
            });
            this.teams.blue.push({
                id: 'bot2',
                nickname: 'Bot 2',
                isBot: true
            });
        }
    }
    
    // Popola il menu con i dati
    populateMenu() {
        // Popola le squadre
        this.updateTeamPlayers('red');
        this.updateTeamPlayers('blue');
        this.updateTeamPlayers('spectators');
        
        // Imposta i valori delle impostazioni
        document.getElementById('time-limit').value = this.settings.timeLimit;
        document.getElementById('score-limit').value = this.settings.scoreLimit;
        document.getElementById('team-lock').checked = this.settings.teamLock;
        document.getElementById('allow-spectators').checked = this.settings.allowSpectators;
    }
    
    // Aggiorna la visualizzazione dei giocatori di una squadra
    updateTeamPlayers(team) {
        const container = document.getElementById(`${team}-team-players`);
        if (!container) return;
        
        // Pulisci il container
        container.innerHTML = '';
        
        // Se non ci sono giocatori, mostra un messaggio
        if (this.teams[team].length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-team-message';
            emptyMessage.textContent = 'Nessun giocatore';
            container.appendChild(emptyMessage);
            return;
        }
        
        // Aggiungi i giocatori
        this.teams[team].forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            playerItem.dataset.playerId = player.id;
            
            // Nome del giocatore
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = player.nickname + (player.isLocal ? ' (Tu)' : '') + (player.isBot ? ' (Bot)' : '');
            playerItem.appendChild(playerName);
            
            // Azioni del giocatore (solo per i giocatori non locali)
            if (!player.isLocal) {
                const playerActions = document.createElement('div');
                playerActions.className = 'player-actions';
                
                // Pulsante per espellere
                const kickButton = document.createElement('button');
                kickButton.className = 'player-action-btn';
                kickButton.textContent = 'Espelli';
                kickButton.addEventListener('click', () => this.kickPlayer(player.id));
                playerActions.appendChild(kickButton);
                
                playerItem.appendChild(playerActions);
            }
            
            container.appendChild(playerItem);
        });
    }
    
    // Configura gli event listener
    setupEventListeners() {
        // Pulsanti per unirsi alle squadre
        const joinButtons = this.container.querySelectorAll('.join-team-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', () => {
                const team = button.dataset.team;
                this.joinTeam(team);
            });
        });
        
        // Pulsante per iniziare la partita
        const startButton = document.getElementById('start-game-btn');
        if (startButton) {
            startButton.addEventListener('click', () => this.startGame());
        }
        
        // Pulsante per annullare
        const cancelButton = document.getElementById('cancel-setup-btn');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.cancel());
        }
        
        // Campi delle impostazioni
        const timeLimit = document.getElementById('time-limit');
        if (timeLimit) {
            timeLimit.addEventListener('change', () => {
                this.settings.timeLimit = parseInt(timeLimit.value, 10);
            });
        }
        
        const scoreLimit = document.getElementById('score-limit');
        if (scoreLimit) {
            scoreLimit.addEventListener('change', () => {
                this.settings.scoreLimit = parseInt(scoreLimit.value, 10);
            });
        }
        
        const teamLock = document.getElementById('team-lock');
        if (teamLock) {
            teamLock.addEventListener('change', () => {
                this.settings.teamLock = teamLock.checked;
            });
        }
        
        const allowSpectators = document.getElementById('allow-spectators');
        if (allowSpectators) {
            allowSpectators.addEventListener('change', () => {
                this.settings.allowSpectators = allowSpectators.checked;
            });
        }
    }
    
    // Unisciti a una squadra
    joinTeam(team) {
        // Trova il giocatore locale
        let localPlayer = null;
        let currentTeam = null;
        
        for (const teamName in this.teams) {
            const playerIndex = this.teams[teamName].findIndex(p => p.isLocal);
            if (playerIndex !== -1) {
                localPlayer = this.teams[teamName][playerIndex];
                currentTeam = teamName;
                break;
            }
        }
        
        // Se il giocatore è già nella squadra selezionata, non fare nulla
        if (currentTeam === team) return;
        
        // Rimuovi il giocatore dalla squadra corrente
        if (currentTeam) {
            this.teams[currentTeam] = this.teams[currentTeam].filter(p => !p.isLocal);
            this.updateTeamPlayers(currentTeam);
        }
        
        // Aggiungi il giocatore alla nuova squadra
        if (!localPlayer) {
            localPlayer = {
                id: 'local-player',
                nickname: 'Tu',
                isLocal: true
            };
        }
        
        this.teams[team].push(localPlayer);
        this.updateTeamPlayers(team);
    }
    
    // Espelli un giocatore
    kickPlayer(playerId) {
        // Trova il giocatore
        for (const team in this.teams) {
            const playerIndex = this.teams[team].findIndex(p => p.id === playerId);
            if (playerIndex !== -1) {
                // Rimuovi il giocatore
                this.teams[team].splice(playerIndex, 1);
                this.updateTeamPlayers(team);
                break;
            }
        }
    }
    
    // Inizia la partita
    startGame() {
        // Verifica che ci siano giocatori in entrambe le squadre
        if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
            alert('Entrambe le squadre devono avere almeno un giocatore');
            return;
        }
        
        // Raccogli le impostazioni
        this.settings.timeLimit = parseInt(document.getElementById('time-limit').value, 10);
        this.settings.scoreLimit = parseInt(document.getElementById('score-limit').value, 10);
        this.settings.teamLock = document.getElementById('team-lock').checked;
        this.settings.allowSpectators = document.getElementById('allow-spectators').checked;
        
        // Nascondi il menu
        this.container.style.display = 'none';
        
        // Chiama il callback con i dati configurati
        if (this.onSetupComplete) {
            this.onSetupComplete({
                teams: this.teams,
                settings: this.settings
            });
        }
    }
    
    // Annulla la configurazione
    cancel() {
        // Nascondi il menu
        this.container.style.display = 'none';
        
        // Torna al menu principale
        const event = new CustomEvent('cancelGameSetup');
        document.dispatchEvent(event);
    }
}
