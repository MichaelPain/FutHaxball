// rankingSystem.js - Gestisce il sistema di classifiche e MMR

export class RankingSystem {
    constructor(networkManager, authManager) {
        this.networkManager = networkManager;
        this.authManager = authManager;
        this.rankings = {
            '1v1': [],
            '2v2': [],
            '3v3': []
        };
        this.userStats = null;
        this.listeners = {
            onRankingsUpdated: [],
            onUserStatsUpdated: []
        };

        // Inizializza gli eventi di rete
        this.initNetworkEvents();
    }

    // Inizializza gli eventi di rete per il sistema di classifiche
    initNetworkEvents() {
        // Evento quando le classifiche vengono aggiornate
        this.networkManager.on('ranking:rankings_updated', (data) => {
            if (data.mode && data.rankings) {
                this.rankings[data.mode] = data.rankings;
                this._triggerEvent('onRankingsUpdated', { mode: data.mode, rankings: data.rankings });
            }
        });

        // Evento quando le statistiche dell'utente vengono aggiornate
        this.networkManager.on('ranking:user_stats_updated', (data) => {
            this.userStats = data;
            this._triggerEvent('onUserStatsUpdated', data);
        });
    }

    // Richiedi le classifiche per una modalità specifica
    fetchRankings(mode) {
        if (!this.isValidMode(mode)) {
            console.error(`Modalità non valida: ${mode}`);
            return false;
        }

        this.networkManager.emit('ranking:fetch_rankings', { mode });
        return true;
    }

    // Richiedi le statistiche dell'utente corrente
    fetchUserStats() {
        if (!this.authManager.isAuthenticated()) {
            console.error('Devi essere autenticato per visualizzare le tue statistiche');
            return false;
        }

        this.networkManager.emit('ranking:fetch_user_stats');
        return true;
    }

    // Richiedi le statistiche di un utente specifico
    fetchPlayerStats(playerId) {
        this.networkManager.emit('ranking:fetch_player_stats', { playerId });
        return true;
    }

    // Ottieni le classifiche per una modalità specifica
    getRankings(mode) {
        if (!this.isValidMode(mode)) {
            console.error(`Modalità non valida: ${mode}`);
            return [];
        }

        return this.rankings[mode] || [];
    }

    // Ottieni le statistiche dell'utente corrente
    getUserStats() {
        return this.userStats;
    }

    // Verifica se una modalità è valida
    isValidMode(mode) {
        return ['1v1', '2v2', '3v3'].includes(mode);
    }

    // Calcola il rango in base all'MMR
    calculateRank(mmr) {
        if (mmr < 1000) return { name: 'Bronzo', tier: 1, color: '#cd7f32' };
        if (mmr < 1200) return { name: 'Bronzo', tier: 2, color: '#cd7f32' };
        if (mmr < 1400) return { name: 'Bronzo', tier: 3, color: '#cd7f32' };
        if (mmr < 1600) return { name: 'Argento', tier: 1, color: '#c0c0c0' };
        if (mmr < 1800) return { name: 'Argento', tier: 2, color: '#c0c0c0' };
        if (mmr < 2000) return { name: 'Argento', tier: 3, color: '#c0c0c0' };
        if (mmr < 2200) return { name: 'Oro', tier: 1, color: '#ffd700' };
        if (mmr < 2400) return { name: 'Oro', tier: 2, color: '#ffd700' };
        if (mmr < 2600) return { name: 'Oro', tier: 3, color: '#ffd700' };
        if (mmr < 2800) return { name: 'Platino', tier: 1, color: '#e5e4e2' };
        if (mmr < 3000) return { name: 'Platino', tier: 2, color: '#e5e4e2' };
        if (mmr < 3200) return { name: 'Platino', tier: 3, color: '#e5e4e2' };
        if (mmr < 3400) return { name: 'Diamante', tier: 1, color: '#b9f2ff' };
        if (mmr < 3600) return { name: 'Diamante', tier: 2, color: '#b9f2ff' };
        if (mmr < 3800) return { name: 'Diamante', tier: 3, color: '#b9f2ff' };
        return { name: 'Campione', tier: 1, color: '#ff4500' };
    }

    // Formatta il rango per la visualizzazione
    formatRank(rank) {
        if (!rank) return 'Non classificato';
        return `${rank.name} ${rank.tier}`;
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

    // Crea l'interfaccia utente per le classifiche
    createRankingsUI(container) {
        // Pulisci il container
        container.innerHTML = '';

        // Crea il contenitore principale
        const rankingsContainer = document.createElement('div');
        rankingsContainer.className = 'rankings-container';

        // Crea la selezione della modalità
        const modeSelector = document.createElement('div');
        modeSelector.className = 'mode-selector';

        const modeTitle = document.createElement('h2');
        modeTitle.textContent = 'Classifiche';
        modeSelector.appendChild(modeTitle);

        const modeButtons = document.createElement('div');
        modeButtons.className = 'mode-buttons';

        const modes = [
            { id: '1v1', name: 'Solo (1v1)' },
            { id: '2v2', name: 'Doubles (2v2)' },
            { id: '3v3', name: 'Team (3v3)' }
        ];

        let activeMode = '1v1';

        modes.forEach(mode => {
            const button = document.createElement('button');
            button.className = 'mode-button';
            button.dataset.mode = mode.id;
            button.textContent = mode.name;
            
            if (mode.id === activeMode) {
                button.classList.add('active');
            }

            button.addEventListener('click', () => {
                // Rimuovi la classe active da tutti i pulsanti
                modeButtons.querySelectorAll('.mode-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Aggiungi la classe active al pulsante cliccato
                button.classList.add('active');
                
                // Aggiorna la modalità attiva e ricarica le classifiche
                activeMode = mode.id;
                this.fetchRankings(activeMode);
                updateRankingsTable(activeMode);
            });

            modeButtons.appendChild(button);
        });

        modeSelector.appendChild(modeButtons);
        rankingsContainer.appendChild(modeSelector);

        // Crea la tabella delle classifiche
        const rankingsTable = document.createElement('div');
        rankingsTable.className = 'rankings-table';
        rankingsContainer.appendChild(rankingsTable);

        // Crea la sezione delle statistiche personali
        const personalStats = document.createElement('div');
        personalStats.className = 'personal-stats';
        
        const statsTitle = document.createElement('h3');
        statsTitle.textContent = 'Le tue statistiche';
        personalStats.appendChild(statsTitle);

        const statsContent = document.createElement('div');
        statsContent.className = 'stats-content';
        personalStats.appendChild(statsContent);

        rankingsContainer.appendChild(personalStats);

        // Aggiungi il contenitore principale al container fornito
        container.appendChild(rankingsContainer);

        // Funzione per aggiornare la tabella delle classifiche
        const updateRankingsTable = (mode) => {
            const rankings = this.getRankings(mode);
            rankingsTable.innerHTML = '';

            if (rankings.length === 0) {
                const loadingMessage = document.createElement('p');
                loadingMessage.className = 'loading-message';
                loadingMessage.textContent = 'Caricamento classifiche...';
                rankingsTable.appendChild(loadingMessage);
                return;
            }

            // Crea l'intestazione della tabella
            const tableHeader = document.createElement('div');
            tableHeader.className = 'table-header';
            
            const rankHeader = document.createElement('div');
            rankHeader.className = 'rank-header';
            rankHeader.textContent = 'Posizione';
            tableHeader.appendChild(rankHeader);
            
            const playerHeader = document.createElement('div');
            playerHeader.className = 'player-header';
            playerHeader.textContent = 'Giocatore';
            tableHeader.appendChild(playerHeader);
            
            const mmrHeader = document.createElement('div');
            mmrHeader.className = 'mmr-header';
            mmrHeader.textContent = 'MMR';
            tableHeader.appendChild(mmrHeader);
            
            const winrateHeader = document.createElement('div');
            winrateHeader.className = 'winrate-header';
            winrateHeader.textContent = 'Winrate';
            tableHeader.appendChild(winrateHeader);

            rankingsTable.appendChild(tableHeader);

            // Crea le righe per ogni giocatore
            rankings.forEach((player, index) => {
                const playerRow = document.createElement('div');
                playerRow.className = 'player-row';
                
                // Evidenzia la riga se è l'utente corrente
                if (this.authManager.isAuthenticated() && 
                    this.authManager.user && 
                    player.id === this.authManager.user.id) {
                    playerRow.classList.add('current-user');
                }
                
                const rankCell = document.createElement('div');
                rankCell.className = 'rank-cell';
                rankCell.textContent = `#${index + 1}`;
                playerRow.appendChild(rankCell);
                
                const playerCell = document.createElement('div');
                playerCell.className = 'player-cell';
                
                const playerRank = this.calculateRank(player.mmr);
                
                const rankBadge = document.createElement('span');
                rankBadge.className = 'rank-badge';
                rankBadge.textContent = `${playerRank.name} ${playerRank.tier}`;
                rankBadge.style.backgroundColor = playerRank.color;
                playerCell.appendChild(rankBadge);
                
                const playerName = document.createElement('span');
                playerName.className = 'player-name';
                playerName.textContent = player.nickname;
                playerCell.appendChild(playerName);
                
                playerRow.appendChild(playerCell);
                
                const mmrCell = document.createElement('div');
                mmrCell.className = 'mmr-cell';
                mmrCell.textContent = player.mmr;
                playerRow.appendChild(mmrCell);
                
                const winrateCell = document.createElement('div');
                winrateCell.className = 'winrate-cell';
                const winrate = player.games > 0 ? Math.round((player.wins / player.games) * 100) : 0;
                winrateCell.textContent = `${winrate}% (${player.wins}/${player.games})`;
                playerRow.appendChild(winrateCell);
                
                rankingsTable.appendChild(playerRow);
            });
        };

        // Funzione per aggiornare le statistiche personali
        const updatePersonalStats = () => {
            statsContent.innerHTML = '';
            
            if (!this.authManager.isAuthenticated()) {
                const loginMessage = document.createElement('p');
                loginMessage.className = 'login-message';
                loginMessage.textContent = 'Accedi per visualizzare le tue statistiche';
                statsContent.appendChild(loginMessage);
                return;
            }
            
            const stats = this.getUserStats();
            
            if (!stats) {
                const loadingMessage = document.createElement('p');
                loadingMessage.className = 'loading-message';
                loadingMessage.textContent = 'Caricamento statistiche...';
                statsContent.appendChild(loadingMessage);
                this.fetchUserStats();
                return;
            }
            
            // Crea la griglia delle statistiche
            const statsGrid = document.createElement('div');
            statsGrid.className = 'stats-grid';
            
            // Aggiungi le statistiche per ogni modalità
            modes.forEach(mode => {
                const modeStats = stats[mode.id] || { mmr: 0, rank: null, games: 0, wins: 0, losses: 0, goals: 0 };
                const rank = this.calculateRank(modeStats.mmr);
                
                const modeStatsCard = document.createElement('div');
                modeStatsCard.className = 'mode-stats-card';
                
                const modeTitle = document.createElement('h4');
                modeTitle.textContent = mode.name;
                modeStatsCard.appendChild(modeTitle);
                
                const rankBadge = document.createElement('div');
                rankBadge.className = 'rank-badge large';
                rankBadge.textContent = this.formatRank(rank);
                rankBadge.style.backgroundColor = rank ? rank.color : '#888';
                modeStatsCard.appendChild(rankBadge);
                
                const mmrValue = document.createElement('div');
                mmrValue.className = 'mmr-value';
                mmrValue.textContent = `MMR: ${modeStats.mmr}`;
                modeStatsCard.appendChild(mmrValue);
                
                const statsDetails = document.createElement('div');
                statsDetails.className = 'stats-details';
                
                const gamesPlayed = document.createElement('p');
                gamesPlayed.textContent = `Partite: ${modeStats.games}`;
                statsDetails.appendChild(gamesPlayed);
                
                const winsLosses = document.createElement('p');
                winsLosses.textContent = `Vittorie/Sconfitte: ${modeStats.wins}/${modeStats.losses}`;
                statsDetails.appendChild(winsLosses);
                
                const winrate = document.createElement('p');
                const winrateValue = modeStats.games > 0 ? Math.round((modeStats.wins / modeStats.games) * 100) : 0;
                winrate.textContent = `Winrate: ${winrateValue}%`;
                statsDetails.appendChild(winrate);
                
                const goals = document.createElement('p');
                goals.textContent = `Gol: ${modeStats.goals}`;
                statsDetails.appendChild(goals);
                
                modeStatsCard.appendChild(statsDetails);
                statsGrid.appendChild(modeStatsCard);
            });
            
            statsContent.appendChild(statsGrid);
            
            // Aggiungi il pulsante per aggiornare le statistiche
            const refreshButton = document.createElement('button');
            refreshButton.className = 'refresh-stats-button';
            refreshButton.textContent = 'Aggiorna Statistiche';
            refreshButton.addEventListener('click', () => {
                this.fetchUserStats();
                const loadingMessage = document.createElement('p');
                loadingMessage.className = 'loading-message';
                loadingMessage.textContent = 'Aggiornamento statistiche...';
                statsContent.innerHTML = '';
                statsContent.appendChild(loadingMessage);
            });
            
            statsContent.appendChild(refreshButton);
        };

        // Carica le classifiche iniziali
        this.fetchRankings(activeMode);
        updateRankingsTable(activeMode);
        updatePersonalStats();

        // Aggiungi listener per gli aggiornamenti
        this.on('onRankingsUpdated', (data) => {
            if (data.mode === activeMode) {
                updateRankingsTable(activeMode);
            }
        });

        this.on('onUserStatsUpdated', () => {
            updatePersonalStats();
        });

        // Funzione di pulizia
        return () => {
            // Rimuovi i listener quando l'UI viene distrutta
            this.off('onRankingsUpdated', updateRankingsTable);
            this.off('onUserStatsUpdated', updatePersonalStats);
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
