// leaderboard.js - Gestisce le classifiche e le statistiche dei giocatori

export class LeaderboardManager {
    constructor(uiManager, authManager) {
        this.uiManager = uiManager;
        this.authManager = authManager;
        
        // Modalità di gioco
        this.gameModes = ['1v1', '2v2', '3v3'];
        this.currentGameMode = '1v1';
        
        // Tipi di classifiche
        this.leaderboardTypes = ['mmr', 'goals', 'games'];
        this.currentType = 'mmr';
        
        // Filtri temporali
        this.timeFilters = ['global', 'season'];
        this.currentTimeFilter = 'global';
        
        // Dati delle classifiche (simulati per la versione di sviluppo)
        this.leaderboardData = {};
        
        // Elementi DOM
        this.leaderboardScreen = null;
        this.leaderboardContainer = null;
        this.gameModesTabs = null;
        this.leaderboardTypesTabs = null;
        this.timeFiltersTabs = null;
        this.leaderboardTable = null;
        this.backButton = null;
    }
    
    initUI() {
        console.log("Inizializzazione UI classifiche");
        
        // Ottieni il riferimento alla schermata delle classifiche
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        
        if (!this.leaderboardScreen) {
            console.error('Elemento leaderboard-screen non trovato');
            return;
        }
        
        // Crea il container delle classifiche se non esiste
        this.leaderboardContainer = this.leaderboardScreen.querySelector('.leaderboard-container');
        if (!this.leaderboardContainer) {
            this.leaderboardContainer = document.createElement('div');
            this.leaderboardContainer.className = 'leaderboard-container';
            this.leaderboardScreen.appendChild(this.leaderboardContainer);
        } else {
            // Rimuovi il contenuto esistente
            this.leaderboardContainer.innerHTML = '';
        }
        
        // Crea l'interfaccia utente
        this.createLeaderboardUI();
        
        // Genera dati di esempio
        this.generateSampleData();
        
        // Aggiorna la tabella con i dati correnti
        this.updateLeaderboard();
    }
    
    createLeaderboardUI() {
        // Crea l'header
        const header = document.createElement('div');
        header.className = 'leaderboard-header';
        header.innerHTML = '<h2>Classifiche</h2>';
        this.leaderboardContainer.appendChild(header);
        
        // Crea i tab per le modalità di gioco
        this.gameModesTabs = document.createElement('div');
        this.gameModesTabs.className = 'leaderboard-tabs game-modes-tabs';
        
        // Aggiungi i tab per ogni modalità di gioco
        this.gameModes.forEach(mode => {
            const tab = document.createElement('button');
            tab.className = `leaderboard-tab ${mode === this.currentGameMode ? 'active' : ''}`;
            tab.dataset.mode = mode;
            tab.textContent = this.getModeLabel(mode);
            tab.id = `mode-tab-${mode}`;
            this.gameModesTabs.appendChild(tab);
        });
        
        this.leaderboardContainer.appendChild(this.gameModesTabs);
        
        // Crea i tab per i tipi di classifiche
        this.leaderboardTypesTabs = document.createElement('div');
        this.leaderboardTypesTabs.className = 'leaderboard-tabs leaderboard-types-tabs';
        
        // Aggiungi i tab per ogni tipo di classifica
        this.leaderboardTypes.forEach(type => {
            const tab = document.createElement('button');
            tab.className = `leaderboard-tab ${type === this.currentType ? 'active' : ''}`;
            tab.dataset.type = type;
            tab.textContent = this.getTypeLabel(type);
            tab.id = `type-tab-${type}`;
            this.leaderboardTypesTabs.appendChild(tab);
        });
        
        this.leaderboardContainer.appendChild(this.leaderboardTypesTabs);
        
        // Crea i tab per i filtri temporali
        this.timeFiltersTabs = document.createElement('div');
        this.timeFiltersTabs.className = 'leaderboard-tabs time-filters-tabs';
        
        // Aggiungi i tab per ogni filtro temporale
        this.timeFilters.forEach(filter => {
            const tab = document.createElement('button');
            tab.className = `leaderboard-tab ${filter === this.currentTimeFilter ? 'active' : ''}`;
            tab.dataset.filter = filter;
            tab.textContent = this.getFilterLabel(filter);
            tab.id = `filter-tab-${filter}`;
            this.timeFiltersTabs.appendChild(tab);
        });
        
        this.leaderboardContainer.appendChild(this.timeFiltersTabs);
        
        // Crea la tabella delle classifiche
        const tableContainer = document.createElement('div');
        tableContainer.className = 'leaderboard-table-container';
        
        this.leaderboardTable = document.createElement('table');
        this.leaderboardTable.className = 'leaderboard-table';
        
        // Crea l'intestazione della tabella
        const thead = document.createElement('thead');
        thead.innerHTML = this.getTableHeader();
        
        // Crea il corpo della tabella
        const tbody = document.createElement('tbody');
        tbody.id = 'leaderboard-tbody';
        
        this.leaderboardTable.appendChild(thead);
        this.leaderboardTable.appendChild(tbody);
        tableContainer.appendChild(this.leaderboardTable);
        
        this.leaderboardContainer.appendChild(tableContainer);
        
        // Crea il footer
        const footer = document.createElement('div');
        footer.className = 'leaderboard-footer';
        
        // Crea il pulsante per tornare indietro
        this.backButton = document.createElement('button');
        this.backButton.className = 'back-btn';
        this.backButton.textContent = 'Indietro';
        this.backButton.id = 'leaderboard-back-button';
        
        footer.appendChild(this.backButton);
        this.leaderboardContainer.appendChild(footer);
        
        // Configura gli event listener
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        console.log("Configurazione event listener per le classifiche");
        
        // Tab delle modalità di gioco
        this.gameModes.forEach(mode => {
            const tab = document.getElementById(`mode-tab-${mode}`);
            if (tab) {
                tab.addEventListener('click', () => {
                    console.log(`Cambio modalità: ${mode}`);
                    
                    // Rimuovi la classe active da tutti i tab
                    this.gameModes.forEach(m => {
                        const t = document.getElementById(`mode-tab-${m}`);
                        if (t) t.classList.remove('active');
                    });
                    
                    // Aggiungi la classe active al tab corrente
                    tab.classList.add('active');
                    
                    // Aggiorna la modalità corrente e la tabella
                    this.currentGameMode = mode;
                    this.updateLeaderboard();
                });
            }
        });
        
        // Tab dei tipi di classifiche
        this.leaderboardTypes.forEach(type => {
            const tab = document.getElementById(`type-tab-${type}`);
            if (tab) {
                tab.addEventListener('click', () => {
                    console.log(`Cambio tipo: ${type}`);
                    
                    // Rimuovi la classe active da tutti i tab
                    this.leaderboardTypes.forEach(t => {
                        const tabElement = document.getElementById(`type-tab-${t}`);
                        if (tabElement) tabElement.classList.remove('active');
                    });
                    
                    // Aggiungi la classe active al tab corrente
                    tab.classList.add('active');
                    
                    // Aggiorna il tipo corrente e la tabella
                    this.currentType = type;
                    this.updateLeaderboard();
                });
            }
        });
        
        // Tab dei filtri temporali
        this.timeFilters.forEach(filter => {
            const tab = document.getElementById(`filter-tab-${filter}`);
            if (tab) {
                tab.addEventListener('click', () => {
                    console.log(`Cambio filtro: ${filter}`);
                    
                    // Rimuovi la classe active da tutti i tab
                    this.timeFilters.forEach(f => {
                        const tabElement = document.getElementById(`filter-tab-${f}`);
                        if (tabElement) tabElement.classList.remove('active');
                    });
                    
                    // Aggiungi la classe active al tab corrente
                    tab.classList.add('active');
                    
                    // Aggiorna il filtro corrente e la tabella
                    this.currentTimeFilter = filter;
                    this.updateLeaderboard();
                });
            }
        });
        
        // Pulsante per tornare indietro
        const backButton = document.getElementById('leaderboard-back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                console.log("Torno al menu principale");
                this.uiManager.showScreen('main-menu-screen');
            });
        }
    }
    
    updateLeaderboard() {
        console.log(`Aggiornamento classifica: ${this.currentGameMode} - ${this.currentType} - ${this.currentTimeFilter}`);
        
        // Ottieni i dati per la combinazione corrente di modalità, tipo e filtro
        const key = `${this.currentGameMode}_${this.currentType}_${this.currentTimeFilter}`;
        const data = this.leaderboardData[key] || [];
        
        // Ottieni il riferimento al corpo della tabella
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) {
            console.error('Elemento leaderboard-tbody non trovato');
            return;
        }
        
        // Pulisci la tabella
        tbody.innerHTML = '';
        
        // Aggiorna l'intestazione della tabella in base al tipo corrente
        const thead = this.leaderboardTable.querySelector('thead');
        if (thead) {
            thead.innerHTML = this.getTableHeader();
        }
        
        // Aggiungi le righe alla tabella
        data.forEach((player, index) => {
            const row = document.createElement('tr');
            
            // Evidenzia la riga se è l'utente corrente
            if (this.authManager && this.authManager.isLoggedIn() && 
                player.id === this.authManager.getUser().id) {
                row.classList.add('current-user');
            }
            
            // Aggiungi le celle alla riga
            row.innerHTML = this.getTableRow(player, index + 1);
            
            tbody.appendChild(row);
        });
        
        // Se non ci sono dati, mostra un messaggio
        if (data.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="5" class="empty-message">Nessun dato disponibile per questa classifica</td>
            `;
            tbody.appendChild(emptyRow);
        }
    }
    
    getTableHeader() {
        // Intestazioni di base
        let header = `<tr>
            <th>Pos.</th>
            <th>Giocatore</th>
        `;
        
        // Aggiungi colonne specifiche in base al tipo corrente
        switch (this.currentType) {
            case 'mmr':
                header += `
                    <th>MMR</th>
                    <th>V</th>
                    <th>S</th>
                    <th>%</th>
                </tr>`;
                break;
            case 'goals':
                header += `
                    <th>Gol</th>
                    <th>Partite</th>
                    <th>Media</th>
                    <th>Assist</th>
                </tr>`;
                break;
            case 'games':
                header += `
                    <th>Partite</th>
                    <th>Vittorie</th>
                    <th>Sconfitte</th>
                    <th>%</th>
                </tr>`;
                break;
            default:
                header += `
                    <th>MMR</th>
                    <th>V</th>
                    <th>S</th>
                    <th>%</th>
                </tr>`;
        }
        
        return header;
    }
    
    getTableRow(player, position) {
        // Celle di base
        let row = `
            <td>${position}</td>
            <td>${player.nickname}</td>
        `;
        
        // Aggiungi celle specifiche in base al tipo corrente
        switch (this.currentType) {
            case 'mmr':
                const winRate = ((player.wins / Math.max(1, player.games)) * 100).toFixed(1);
                row += `
                    <td>${player.mmr}</td>
                    <td>${player.wins}</td>
                    <td>${player.losses}</td>
                    <td>${winRate}%</td>
                `;
                break;
            case 'goals':
                const goalsPerGame = (player.goals / Math.max(1, player.games)).toFixed(2);
                row += `
                    <td>${player.goals}</td>
                    <td>${player.games}</td>
                    <td>${goalsPerGame}</td>
                    <td>${player.assists}</td>
                `;
                break;
            case 'games':
                const winRateGames = ((player.wins / Math.max(1, player.games)) * 100).toFixed(1);
                row += `
                    <td>${player.games}</td>
                    <td>${player.wins}</td>
                    <td>${player.losses}</td>
                    <td>${winRateGames}%</td>
                `;
                break;
            default:
                const defaultWinRate = ((player.wins / Math.max(1, player.games)) * 100).toFixed(1);
                row += `
                    <td>${player.mmr}</td>
                    <td>${player.wins}</td>
                    <td>${player.losses}</td>
                    <td>${defaultWinRate}%</td>
                `;
        }
        
        return row;
    }
    
    getModeLabel(mode) {
        switch (mode) {
            case '1v1':
                return '1v1';
            case '2v2':
                return '2v2';
            case '3v3':
                return '3v3+';
            default:
                return mode;
        }
    }
    
    getTypeLabel(type) {
        switch (type) {
            case 'mmr':
                return 'MMR';
            case 'goals':
                return 'Gol';
            case 'games':
                return 'Partite';
            default:
                return type;
        }
    }
    
    getFilterLabel(filter) {
        switch (filter) {
            case 'global':
                return 'Globale';
            case 'season':
                return 'Season';
            default:
                return filter;
        }
    }
    
    generateSampleData() {
        console.log("Generazione dati di esempio per le classifiche");
        
        // Genera dati di esempio per ogni combinazione di modalità, tipo e filtro
        this.gameModes.forEach(gameMode => {
            this.leaderboardTypes.forEach(type => {
                this.timeFilters.forEach(filter => {
                    const key = `${gameMode}_${type}_${filter}`;
                    this.leaderboardData[key] = this.generatePlayersData(gameMode, type, filter);
                });
            });
        });
    }
    
    generatePlayersData(gameMode, type, filter) {
        // Genera un array di giocatori con statistiche casuali
        const players = [];
        const count = 20; // Numero di giocatori nella classifica
        
        // Aggiungi l'utente corrente se è autenticato
        if (this.authManager && this.authManager.isLoggedIn()) {
            const user = this.authManager.getUser();
            const userPlayer = this.generatePlayerStats(user.id, user.nickname, gameMode, type, filter);
            players.push(userPlayer);
        }
        
        // Genera giocatori casuali
        for (let i = 0; i < count; i++) {
            const player = this.generatePlayerStats(
                `player_${i}`,
                `Giocatore${i + 1}`,
                gameMode,
                type,
                filter
            );
            players.push(player);
        }
        
        // Ordina i giocatori in base al tipo di classifica
        players.sort((a, b) => {
            switch (type) {
                case 'mmr':
                    return b.mmr - a.mmr;
                case 'goals':
                    return b.goals - a.goals;
                case 'games':
                    return b.games - a.games;
                default:
                    return b.mmr - a.mmr;
            }
        });
        
        return players;
    }
    
    generatePlayerStats(id, nickname, gameMode, type, filter) {
        // Genera statistiche casuali per un giocatore
        const player = {
            id: id,
            nickname: nickname,
            games: 0,
            wins: 0,
            losses: 0,
            mmr: 0,
            goals: 0,
            assists: 0
        };
        
        // Statistiche di base diverse per ogni modalità e filtro
        switch (gameMode) {
            case '1v1':
                player.games = Math.floor(Math.random() * 100) + 20;
                break;
            case '2v2':
                player.games = Math.floor(Math.random() * 80) + 15;
                break;
            case '3v3':
                player.games = Math.floor(Math.random() * 60) + 10;
                break;
        }
        
        // Meno partite per la season rispetto al globale
        if (filter === 'season') {
            player.games = Math.floor(player.games * 0.4);
        }
        
        // Calcola vittorie e sconfitte
        player.wins = Math.floor(Math.random() * player.games * 0.7);
        player.losses = player.games - player.wins;
        
        // Calcola MMR in base alle vittorie e alla modalità
        switch (gameMode) {
            case '1v1':
                player.mmr = 1000 + player.wins * 15 - player.losses * 10 + Math.floor(Math.random() * 200);
                break;
            case '2v2':
                player.mmr = 1000 + player.wins * 12 - player.losses * 8 + Math.floor(Math.random() * 300);
                break;
            case '3v3':
                player.mmr = 1000 + player.wins * 10 - player.losses * 6 + Math.floor(Math.random() * 400);
                break;
        }
        
        // Calcola gol e assist in base alla modalità
        switch (gameMode) {
            case '1v1':
                player.goals = Math.floor(player.games * 2.5 + Math.random() * 20);
                player.assists = Math.floor(player.games * 0.2 + Math.random() * 10);
                break;
            case '2v2':
                player.goals = Math.floor(player.games * 1.8 + Math.random() * 15);
                player.assists = Math.floor(player.games * 1.2 + Math.random() * 15);
                break;
            case '3v3':
                player.goals = Math.floor(player.games * 1.2 + Math.random() * 10);
                player.assists = Math.floor(player.games * 1.5 + Math.random() * 20);
                break;
        }
        
        return player;
    }
    
    // Metodo pubblico per mostrare la classifica
    showLeaderboard() {
        this.initUI();
    }
}
