// rankedMatchManager.js - Gestione delle partite ranked

export class RankedMatchManager {
    constructor(networkManager, authManager, gameManager) {
        this.networkManager = networkManager;
        this.authManager = authManager;
        this.gameManager = gameManager;
        this.currentMatch = null;
        this.matchStats = {
            goals: [],
            possession: {
                0: 0, // Team rosso
                1: 0  // Team blu
            },
            kicks: {},
            touches: {},
            lastTouch: null
        };
        this.listeners = {
            onMatchStart: [],
            onMatchEnd: [],
            onGoalScored: [],
            onStatsUpdate: []
        };

        // Inizializza gli eventi di rete
        this.initNetworkEvents();
    }

    // Inizializza gli eventi di rete per la gestione delle partite ranked
    initNetworkEvents() {
        // Evento quando inizia una partita ranked
        this.networkManager.on('ranked:match_start', (data) => {
            this.currentMatch = data;
            this.resetMatchStats();
            this._triggerEvent('onMatchStart', this.currentMatch);
            
            // Inizializza il gioco con le impostazioni della partita ranked
            this.gameManager.initRankedMatch(data);
        });

        // Evento quando finisce una partita ranked
        this.networkManager.on('ranked:match_end', (data) => {
            this.currentMatch = null;
            this._triggerEvent('onMatchEnd', data);
        });

        // Evento quando viene segnato un gol
        this.networkManager.on('ranked:goal_scored', (data) => {
            this.matchStats.goals.push(data);
            this._triggerEvent('onGoalScored', data);
        });

        // Evento per aggiornamenti statistiche
        this.networkManager.on('ranked:stats_update', (data) => {
            this.updateMatchStats(data);
            this._triggerEvent('onStatsUpdate', this.matchStats);
        });
    }

    // Resetta le statistiche della partita
    resetMatchStats() {
        this.matchStats = {
            goals: [],
            possession: {
                0: 0, // Team rosso
                1: 0  // Team blu
            },
            kicks: {},
            touches: {},
            lastTouch: null
        };
        
        // Inizializza le statistiche per ogni giocatore
        if (this.currentMatch && this.currentMatch.players) {
            this.currentMatch.players.forEach(player => {
                this.matchStats.kicks[player.userId] = 0;
                this.matchStats.touches[player.userId] = 0;
            });
        }
    }

    // Aggiorna le statistiche della partita
    updateMatchStats(data) {
        if (data.possession) {
            this.matchStats.possession = data.possession;
        }
        
        if (data.kicks) {
            this.matchStats.kicks = {...this.matchStats.kicks, ...data.kicks};
        }
        
        if (data.touches) {
            this.matchStats.touches = {...this.matchStats.touches, ...data.touches};
        }
        
        if (data.lastTouch) {
            this.matchStats.lastTouch = data.lastTouch;
        }
    }

    // Registra un tocco della palla
    recordBallTouch(playerId) {
        if (!this.currentMatch || !playerId) return;
        
        // Aggiorna il contatore dei tocchi
        if (!this.matchStats.touches[playerId]) {
            this.matchStats.touches[playerId] = 0;
        }
        this.matchStats.touches[playerId]++;
        
        // Aggiorna l'ultimo tocco
        this.matchStats.lastTouch = {
            playerId,
            timestamp: Date.now()
        };
        
        // Invia l'aggiornamento al server
        this.networkManager.emit('ranked:ball_touch', {
            matchId: this.currentMatch.id,
            playerId
        });
    }

    // Registra un calcio della palla
    recordBallKick(playerId) {
        if (!this.currentMatch || !playerId) return;
        
        // Aggiorna il contatore dei calci
        if (!this.matchStats.kicks[playerId]) {
            this.matchStats.kicks[playerId] = 0;
        }
        this.matchStats.kicks[playerId]++;
        
        // Invia l'aggiornamento al server
        this.networkManager.emit('ranked:ball_kick', {
            matchId: this.currentMatch.id,
            playerId
        });
    }

    // Registra un gol
    recordGoal(teamId, scorerId, assisterId = null) {
        if (!this.currentMatch) return;
        
        const goalData = {
            matchId: this.currentMatch.id,
            teamId,
            scorerId,
            assisterId,
            timestamp: Date.now()
        };
        
        // Aggiorna le statistiche locali
        this.matchStats.goals.push(goalData);
        
        // Invia l'aggiornamento al server
        this.networkManager.emit('ranked:goal', goalData);
    }

    // Registra un'autorete
    recordOwnGoal(playerId, teamId) {
        if (!this.currentMatch || !playerId) return;
        
        const goalData = {
            matchId: this.currentMatch.id,
            teamId: teamId === 0 ? 1 : 0, // L'autorete è un punto per la squadra avversaria
            scorerId: null,
            assisterId: null,
            ownGoal: true,
            ownGoalPlayerId: playerId,
            timestamp: Date.now()
        };
        
        // Aggiorna le statistiche locali
        this.matchStats.goals.push(goalData);
        
        // Invia l'aggiornamento al server
        this.networkManager.emit('ranked:own_goal', goalData);
    }

    // Aggiorna le statistiche di possesso palla
    updatePossession(teamPossession) {
        if (!this.currentMatch) return;
        
        this.matchStats.possession = teamPossession;
        
        // Invia l'aggiornamento al server ogni 5 secondi per ridurre il traffico
        if (!this._lastPossessionUpdate || Date.now() - this._lastPossessionUpdate > 5000) {
            this.networkManager.emit('ranked:possession', {
                matchId: this.currentMatch.id,
                possession: teamPossession
            });
            this._lastPossessionUpdate = Date.now();
        }
    }

    // Segnala la disconnessione di un giocatore
    reportPlayerDisconnect(playerId) {
        if (!this.currentMatch || !playerId) return;
        
        this.networkManager.emit('ranked:player_disconnect', {
            matchId: this.currentMatch.id,
            playerId
        });
    }

    // Segnala la riconnessione di un giocatore
    reportPlayerReconnect(playerId) {
        if (!this.currentMatch || !playerId) return;
        
        this.networkManager.emit('ranked:player_reconnect', {
            matchId: this.currentMatch.id,
            playerId
        });
    }

    // Segnala un problema tecnico
    reportTechnicalIssue(issueType, description) {
        if (!this.currentMatch) return;
        
        this.networkManager.emit('ranked:technical_issue', {
            matchId: this.currentMatch.id,
            issueType,
            description,
            timestamp: Date.now()
        });
    }

    // Richiedi il timeout di un giocatore (pausa)
    requestTimeout(reason) {
        if (!this.currentMatch) return false;
        
        this.networkManager.emit('ranked:timeout_request', {
            matchId: this.currentMatch.id,
            reason,
            timestamp: Date.now()
        });
        
        return true;
    }

    // Ottieni le statistiche correnti della partita
    getMatchStats() {
        return {...this.matchStats};
    }

    // Ottieni i dettagli della partita corrente
    getCurrentMatch() {
        return this.currentMatch ? {...this.currentMatch} : null;
    }

    // Verifica se è in corso una partita ranked
    isInRankedMatch() {
        return this.currentMatch !== null;
    }

    // Aggiungi un listener per un evento
    on(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].push(callback);
            return true;
        }
        return false;
    }

    // Rimuovi un listener per un evento
    off(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
            return true;
        }
        return false;
    }

    // Trigger interno per gli eventi
    _triggerEvent(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Errore nell'esecuzione del callback per ${eventName}:`, error);
                }
            });
        }
    }

    // Crea l'interfaccia utente per le statistiche della partita ranked
    createMatchStatsUI(container) {
        // Pulisci il container
        container.innerHTML = '';

        if (!this.currentMatch) {
            container.innerHTML = '<div class="no-match">Nessuna partita ranked in corso</div>';
            return () => {};
        }

        // Crea il contenitore principale
        const statsContainer = document.createElement('div');
        statsContainer.className = 'ranked-stats-container';

        // Intestazione con info partita
        const header = document.createElement('div');
        header.className = 'ranked-stats-header';
        
        const matchTitle = document.createElement('h2');
        matchTitle.textContent = `Partita Ranked ${this.currentMatch.mode}`;
        header.appendChild(matchTitle);
        
        const matchId = document.createElement('div');
        matchId.className = 'match-id';
        matchId.textContent = `ID: ${this.currentMatch.id}`;
        header.appendChild(matchId);
        
        statsContainer.appendChild(header);

        // Punteggio
        const scoreContainer = document.createElement('div');
        scoreContainer.className = 'ranked-score-container';
        
        const teamRedName = document.createElement('div');
        teamRedName.className = 'team-name red';
        teamRedName.textContent = 'Squadra Rossa';
        scoreContainer.appendChild(teamRedName);
        
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'score-display';
        
        const redScore = document.createElement('span');
        redScore.className = 'red-score';
        redScore.textContent = this.currentMatch.score ? this.currentMatch.score[0] : '0';
        scoreDisplay.appendChild(redScore);
        
        const scoreSeparator = document.createElement('span');
        scoreSeparator.textContent = ' - ';
        scoreDisplay.appendChild(scoreSeparator);
        
        const blueScore = document.createElement('span');
        blueScore.className = 'blue-score';
        blueScore.textContent = this.currentMatch.score ? this.currentMatch.score[1] : '0';
        scoreDisplay.appendChild(blueScore);
        
        scoreContainer.appendChild(scoreDisplay);
        
        const teamBlueName = document.createElement('div');
        teamBlueName.className = 'team-name blue';
        teamBlueName.textContent = 'Squadra Blu';
        scoreContainer.appendChild(teamBlueName);
        
        statsContainer.appendChild(scoreContainer);

        // Timer
        const timerContainer = document.createElement('div');
        timerContainer.className = 'ranked-timer-container';
        
        const timerLabel = document.createElement('span');
        timerLabel.className = 'timer-label';
        timerLabel.textContent = 'Tempo: ';
        timerContainer.appendChild(timerLabel);
        
        const timerValue = document.createElement('span');
        timerValue.className = 'timer-value';
        timerValue.textContent = '00:00';
        timerContainer.appendChild(timerValue);
        
        statsContainer.appendChild(timerContainer);

        // Statistiche di gioco
        const gameStatsContainer = document.createElement('div');
        gameStatsContainer.className = 'ranked-game-stats-container';
        
        // Possesso palla
        const possessionContainer = document.createElement('div');
        possessionContainer.className = 'possession-container';
        
        const possessionTitle = document.createElement('h3');
        possessionTitle.textContent = 'Possesso Palla';
        possessionContainer.appendChild(possessionTitle);
        
        const possessionBar = document.createElement('div');
        possessionBar.className = 'possession-bar';
        
        const redPossession = document.createElement('div');
        redPossession.className = 'red-possession';
        redPossession.style.width = `${this.matchStats.possession[0]}%`;
        possessionBar.appendChild(redPossession);
        
        const bluePossession = document.createElement('div');
        bluePossession.className = 'blue-possession';
        bluePossession.style.width = `${this.matchStats.possession[1]}%`;
        possessionBar.appendChild(bluePossession);
        
        possessionContainer.appendChild(possessionBar);
        
        const possessionValues = document.createElement('div');
        possessionValues.className = 'possession-values';
        
        const redPossessionValue = document.createElement('span');
        redPossessionValue.className = 'red-possession-value';
        redPossessionValue.textContent = `${this.matchStats.possession[0]}%`;
        possessionValues.appendChild(redPossessionValue);
        
        const bluePossessionValue = document.createElement('span');
        bluePossessionValue.className = 'blue-possession-value';
        bluePossessionValue.textContent = `${this.matchStats.possession[1]}%`;
        possessionValues.appendChild(bluePossessionValue);
        
        possessionContainer.appendChild(possessionValues);
        
        gameStatsContainer.appendChild(possessionContainer);
        
        // Statistiche giocatori
        const playersStatsContainer = document.createElement('div');
        playersStatsContainer.className = 'players-stats-container';
        
        const playersStatsTitle = document.createElement('h3');
        playersStatsTitle.textContent = 'Statistiche Giocatori';
        playersStatsContainer.appendChild(playersStatsTitle);
        
        // Tabella statistiche
        const statsTable = document.createElement('table');
        statsTable.className = 'stats-table';
        
        // Intestazione tabella
        const tableHeader = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const headerCells = ['Giocatore', 'Gol', 'Assist', 'Tocchi', 'Calci'];
        headerCells.forEach(cellText => {
            const th = document.createElement('th');
            th.textContent = cellText;
            headerRow.appendChild(th);
        });
        
        tableHeader.appendChild(headerRow);
        statsTable.appendChild(tableHeader);
        
        // Corpo tabella
        const tableBody = document.createElement('tbody');
        
        // Aggiungi righe per ogni giocatore
        if (this.currentMatch.players) {
            // Ordina i giocatori per team
            const sortedPlayers = [...this.currentMatch.players].sort((a, b) => {
                if (a.team !== b.team) return a.team - b.team;
                return a.nickname.localeCompare(b.nickname);
            });
            
            let currentTeam = null;
            
            sortedPlayers.forEach(player => {
                // Aggiungi separatore tra i team
                if (currentTeam !== player.team) {
                    currentTeam = player.team;
                    
                    const teamRow = document.createElement('tr');
                    teamRow.className = `team-separator team-${player.team}`;
                    
                    const teamCell = document.createElement('td');
                    teamCell.colSpan = 5;
                    teamCell.textContent = player.team === 0 ? 'Squadra Rossa' : 'Squadra Blu';
                    teamRow.appendChild(teamCell);
                    
                    tableBody.appendChild(teamRow);
                }
                
                const playerRow = document.createElement('tr');
                playerRow.className = `player-row team-${player.team}`;
                
                // Cella nome giocatore
                const nameCell = document.createElement('td');
                nameCell.className = 'player-name';
                nameCell.textContent = player.nickname;
                playerRow.appendChild(nameCell);
                
                // Cella gol
                const goalsCell = document.createElement('td');
                goalsCell.className = 'player-goals';
                const goals = this.matchStats.goals.filter(g => g.scorerId === player.userId).length;
                goalsCell.textContent = goals;
                playerRow.appendChild(goalsCell);
                
                // Cella assist
                const assistsCell = document.createElement('td');
                assistsCell.className = 'player-assists';
                const assists = this.matchStats.goals.filter(g => g.assisterId === player.userId).length;
                assistsCell.textContent = assists;
                playerRow.appendChild(assistsCell);
                
                // Cella tocchi
                const touchesCell = document.createElement('td');
                touchesCell.className = 'player-touches';
                touchesCell.textContent = this.matchStats.touches[player.userId] || 0;
                playerRow.appendChild(touchesCell);
                
                // Cella calci
                const kicksCell = document.createElement('td');
                kicksCell.className = 'player-kicks';
                kicksCell.textContent = this.matchStats.kicks[player.userId] || 0;
                playerRow.appendChild(kicksCell);
                
                tableBody.appendChild(playerRow);
            });
        }
        
        statsTable.appendChild(tableBody);
        playersStatsContainer.appendChild(statsTable);
        
        gameStatsContainer.appendChild(playersStatsContainer);
        
        statsContainer.appendChild(gameStatsContainer);

        // Aggiungi il contenitore principale al container fornito
        container.appendChild(statsContainer);

        // Funzione per aggiornare il timer
        let startTime = this.currentMatch.startTime || Date.now();
        let timerInterval = null;
        
        const updateTimer = () => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        // Avvia il timer
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();

        // Funzione per aggiornare le statistiche
        const updateStats = () => {
            // Aggiorna il punteggio
            redScore.textContent = this.currentMatch.score ? this.currentMatch.score[0] : '0';
            blueScore.textContent = this.currentMatch.score ? this.currentMatch.score[1] : '0';
            
            // Aggiorna il possesso palla
            redPossession.style.width = `${this.matchStats.possession[0]}%`;
            bluePossession.style.width = `${this.matchStats.possession[1]}%`;
            redPossessionValue.textContent = `${this.matchStats.possession[0]}%`;
            bluePossessionValue.textContent = `${this.matchStats.possession[1]}%`;
            
            // Aggiorna le statistiche dei giocatori
            if (this.currentMatch.players) {
                this.currentMatch.players.forEach(player => {
                    const playerRow = tableBody.querySelector(`.player-row .player-name:contains("${player.nickname}")`).parentNode;
                    
                    if (playerRow) {
                        const goalsCell = playerRow.querySelector('.player-goals');
                        const goals = this.matchStats.goals.filter(g => g.scorerId === player.userId).length;
                        goalsCell.textContent = goals;
                        
                        const assistsCell = playerRow.querySelector('.player-assists');
                        const assists = this.matchStats.goals.filter(g => g.assisterId === player.userId).length;
                        assistsCell.textContent = assists;
                        
                        const touchesCell = playerRow.querySelector('.player-touches');
                        touchesCell.textContent = this.matchStats.touches[player.userId] || 0;
                        
                        const kicksCell = playerRow.querySelector('.player-kicks');
                        kicksCell.textContent = this.matchStats.kicks[player.userId] || 0;
                    }
                });
            }
        };

        // Aggiungi listener per gli eventi
        this.on('onStatsUpdate', updateStats);
        this.on('onGoalScored', updateStats);
        this.on('onMatchEnd', () => {
            clearInterval(timerInterval);
        });

        // Funzione di pulizia
        return () => {
            clearInterval(timerInterval);
            this.off('onStatsUpdate', updateStats);
            this.off('onGoalScored', updateStats);
            this.off('onMatchEnd', () => {});
        };
    }

    // Pulisci le risorse quando l'oggetto viene distrutto
    destroy() {
        // Rimuovi tutti i listener
        Object.keys(this.listeners).forEach(eventName => {
            this.listeners[eventName] = [];
        });
    }
}
