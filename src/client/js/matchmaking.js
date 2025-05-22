// matchmaking.js - Sistema di matchmaking per partite competitive

export class MatchmakingManager {
    constructor(uiManager, authManager, networkManager) {
        this.uiManager = uiManager;
        this.authManager = authManager;
        this.networkManager = networkManager;
        
        // Stato del matchmaking
        this.isSearching = false;
        this.searchStartTime = null;
        this.searchTimeout = null;
        this.currentMode = '1v1'; // Modalità predefinita
        
        // Elementi DOM
        this.matchmakingScreen = null;
        this.searchButton = null;
        this.cancelButton = null;
        this.modeButtons = null;
        this.searchTimeDisplay = null;
        this.estimatedTimeDisplay = null;
        this.playersSearchingDisplay = null;
        this.backButton = null;
    }
    
    initUI() {
        console.log("Inizializzazione UI matchmaking");
        
        // Ottieni il riferimento alla schermata di matchmaking
        this.matchmakingScreen = document.getElementById('ranked-screen');
        
        if (!this.matchmakingScreen) {
            console.error('Elemento ranked-screen non trovato');
            return;
        }
        
        // Crea l'interfaccia utente
        this.createMatchmakingUI();
        
        // Configura gli event listener
        this.setupEventListeners();
        
        // Aggiorna le informazioni sul matchmaking
        this.updateMatchmakingInfo();
    }
    
    createMatchmakingUI() {
        // Pulisci la schermata
        this.matchmakingScreen.innerHTML = '';
        
        // Crea il container principale
        const container = document.createElement('div');
        container.className = 'matchmaking-container';
        
        // Crea l'header
        const header = document.createElement('div');
        header.className = 'matchmaking-header';
        header.innerHTML = '<h2>Partite Competitive</h2>';
        container.appendChild(header);
        
        // Crea la sezione delle modalità
        const modesSection = document.createElement('div');
        modesSection.className = 'matchmaking-modes-section';
        
        const modesTitle = document.createElement('h3');
        modesTitle.textContent = 'Seleziona modalità';
        modesSection.appendChild(modesTitle);
        
        const modesContainer = document.createElement('div');
        modesContainer.className = 'matchmaking-modes-container';
        
        // Crea i pulsanti per le modalità
        const modes = ['1v1', '2v2', '3v3'];
        this.modeButtons = {};
        
        modes.forEach(mode => {
            const button = document.createElement('button');
            button.className = `mode-button ${mode === this.currentMode ? 'active' : ''}`;
            button.dataset.mode = mode;
            button.textContent = mode;
            button.id = `mode-button-${mode}`;
            modesContainer.appendChild(button);
            this.modeButtons[mode] = button;
        });
        
        modesSection.appendChild(modesContainer);
        container.appendChild(modesSection);
        
        // Crea la sezione delle informazioni
        const infoSection = document.createElement('div');
        infoSection.className = 'matchmaking-info-section';
        
        // Tempo di ricerca
        const searchTimeContainer = document.createElement('div');
        searchTimeContainer.className = 'info-container';
        searchTimeContainer.innerHTML = '<span class="info-label">Tempo di ricerca:</span>';
        this.searchTimeDisplay = document.createElement('span');
        this.searchTimeDisplay.className = 'info-value';
        this.searchTimeDisplay.textContent = '00:00';
        this.searchTimeDisplay.id = 'search-time-display';
        searchTimeContainer.appendChild(this.searchTimeDisplay);
        infoSection.appendChild(searchTimeContainer);
        
        // Tempo stimato
        const estimatedTimeContainer = document.createElement('div');
        estimatedTimeContainer.className = 'info-container';
        estimatedTimeContainer.innerHTML = '<span class="info-label">Tempo stimato:</span>';
        this.estimatedTimeDisplay = document.createElement('span');
        this.estimatedTimeDisplay.className = 'info-value';
        this.estimatedTimeDisplay.textContent = '~01:30';
        this.estimatedTimeDisplay.id = 'estimated-time-display';
        estimatedTimeContainer.appendChild(this.estimatedTimeDisplay);
        infoSection.appendChild(estimatedTimeContainer);
        
        // Giocatori in ricerca
        const playersSearchingContainer = document.createElement('div');
        playersSearchingContainer.className = 'info-container';
        playersSearchingContainer.innerHTML = '<span class="info-label">Giocatori in ricerca:</span>';
        this.playersSearchingDisplay = document.createElement('span');
        this.playersSearchingDisplay.className = 'info-value';
        this.playersSearchingDisplay.textContent = '0';
        this.playersSearchingDisplay.id = 'players-searching-display';
        playersSearchingContainer.appendChild(this.playersSearchingDisplay);
        infoSection.appendChild(playersSearchingContainer);
        
        container.appendChild(infoSection);
        
        // Crea la sezione dei pulsanti
        const buttonsSection = document.createElement('div');
        buttonsSection.className = 'matchmaking-buttons-section';
        
        // Pulsante di ricerca
        this.searchButton = document.createElement('button');
        this.searchButton.className = 'search-button';
        this.searchButton.textContent = 'Cerca partita';
        this.searchButton.id = 'search-button';
        buttonsSection.appendChild(this.searchButton);
        
        // Pulsante di annullamento (nascosto inizialmente)
        this.cancelButton = document.createElement('button');
        this.cancelButton.className = 'cancel-button';
        this.cancelButton.textContent = 'Annulla ricerca';
        this.cancelButton.id = 'cancel-button';
        this.cancelButton.style.display = 'none';
        buttonsSection.appendChild(this.cancelButton);
        
        container.appendChild(buttonsSection);
        
        // Crea il footer
        const footer = document.createElement('div');
        footer.className = 'matchmaking-footer';
        
        // Pulsante per tornare indietro
        this.backButton = document.createElement('button');
        this.backButton.className = 'back-btn';
        this.backButton.textContent = 'Indietro';
        this.backButton.id = 'matchmaking-back-button';
        
        footer.appendChild(this.backButton);
        container.appendChild(footer);
        
        // Aggiungi il container alla schermata
        this.matchmakingScreen.appendChild(container);
    }
    
    setupEventListeners() {
        console.log("Configurazione event listener per il matchmaking");
        
        // Pulsanti delle modalità
        Object.keys(this.modeButtons).forEach(mode => {
            const button = this.modeButtons[mode];
            button.addEventListener('click', () => {
                console.log(`Cambio modalità: ${mode}`);
                
                // Cambia modalità solo se non si sta cercando
                if (!this.isSearching) {
                    // Rimuovi la classe active da tutti i pulsanti
                    Object.values(this.modeButtons).forEach(btn => btn.classList.remove('active'));
                    
                    // Aggiungi la classe active al pulsante corrente
                    button.classList.add('active');
                    
                    // Aggiorna la modalità corrente
                    this.currentMode = mode;
                    
                    // Aggiorna le informazioni sul matchmaking
                    this.updateMatchmakingInfo();
                } else {
                    this.uiManager.showNotification('Non puoi cambiare modalità durante la ricerca', 'error');
                }
            });
        });
        
        // Pulsante di ricerca
        this.searchButton.addEventListener('click', () => {
            console.log("Avvio ricerca partita");
            
            // Verifica se l'utente è autenticato
            if (!this.authManager.isLoggedIn()) {
                this.uiManager.showNotification('Devi effettuare il login per giocare partite competitive', 'error');
                this.uiManager.showScreen('auth-screen');
                return;
            }
            
            // Avvia la ricerca
            this.startSearch();
        });
        
        // Pulsante di annullamento
        this.cancelButton.addEventListener('click', () => {
            console.log("Annullo ricerca partita");
            
            // Annulla la ricerca
            this.cancelSearch();
        });
        
        // Pulsante per tornare indietro
        this.backButton.addEventListener('click', () => {
            console.log("Torno al menu principale");
            
            // Annulla la ricerca se è in corso
            if (this.isSearching) {
                this.cancelSearch();
            }
            
            // Torna al menu principale
            this.uiManager.showScreen('main-menu-screen');
        });
    }
    
    startSearch() {
        // Verifica se è già in corso una ricerca
        if (this.isSearching) {
            return;
        }
        
        // Imposta lo stato di ricerca
        this.isSearching = true;
        this.searchStartTime = Date.now();
        
        // Aggiorna l'interfaccia
        this.searchButton.style.display = 'none';
        this.cancelButton.style.display = 'block';
        
        // Disabilita i pulsanti delle modalità
        Object.values(this.modeButtons).forEach(button => {
            button.disabled = true;
        });
        
        // Aggiorna le informazioni sul matchmaking
        this.updateMatchmakingInfo();
        
        // Avvia l'aggiornamento periodico del tempo di ricerca
        this.startSearchTimer();
        
        // Simula la ricerca di una partita (per la versione di sviluppo)
        this.simulateSearch();
        
        // Notifica l'utente
        this.uiManager.showNotification(`Ricerca partita ${this.currentMode} avviata`, 'info');
    }
    
    cancelSearch() {
        // Verifica se è in corso una ricerca
        if (!this.isSearching) {
            return;
        }
        
        // Reimposta lo stato di ricerca
        this.isSearching = false;
        this.searchStartTime = null;
        
        // Ferma il timer di ricerca
        this.stopSearchTimer();
        
        // Annulla il timeout di simulazione
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        // Aggiorna l'interfaccia
        this.searchButton.style.display = 'block';
        this.cancelButton.style.display = 'none';
        
        // Riabilita i pulsanti delle modalità
        Object.values(this.modeButtons).forEach(button => {
            button.disabled = false;
        });
        
        // Aggiorna le informazioni sul matchmaking
        this.updateMatchmakingInfo();
        
        // Notifica l'utente
        this.uiManager.showNotification('Ricerca partita annullata', 'info');
    }
    
    startSearchTimer() {
        // Aggiorna il tempo di ricerca ogni secondo
        this.searchTimerInterval = setInterval(() => {
            this.updateSearchTime();
        }, 1000);
    }
    
    stopSearchTimer() {
        // Ferma l'aggiornamento del tempo di ricerca
        if (this.searchTimerInterval) {
            clearInterval(this.searchTimerInterval);
            this.searchTimerInterval = null;
        }
    }
    
    updateSearchTime() {
        // Calcola il tempo trascorso
        const elapsedTime = Math.floor((Date.now() - this.searchStartTime) / 1000);
        
        // Formatta il tempo (MM:SS)
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Aggiorna il display
        this.searchTimeDisplay.textContent = formattedTime;
        
        // Aggiorna anche il numero di giocatori in ricerca (simulato)
        this.updatePlayersSearching();
    }
    
    updatePlayersSearching() {
        // Simula un numero casuale di giocatori in ricerca
        const baseCount = {
            '1v1': 5,
            '2v2': 8,
            '3v3': 12
        }[this.currentMode] || 5;
        
        const randomVariation = Math.floor(Math.random() * 5) - 2; // -2 a +2
        const count = Math.max(1, baseCount + randomVariation);
        
        this.playersSearchingDisplay.textContent = count.toString();
    }
    
    updateMatchmakingInfo() {
        // Aggiorna il tempo stimato in base alla modalità
        const estimatedTime = {
            '1v1': '~01:00',
            '2v2': '~01:30',
            '3v3': '~02:00'
        }[this.currentMode] || '~01:30';
        
        this.estimatedTimeDisplay.textContent = estimatedTime;
        
        // Reimposta il tempo di ricerca se non è in corso
        if (!this.isSearching) {
            this.searchTimeDisplay.textContent = '00:00';
        }
        
        // Aggiorna il numero di giocatori in ricerca
        this.updatePlayersSearching();
    }
    
    simulateSearch() {
        // Simula il tempo di attesa per trovare una partita
        const minWaitTime = 5000; // 5 secondi
        const maxWaitTime = 15000; // 15 secondi
        const waitTime = Math.floor(Math.random() * (maxWaitTime - minWaitTime + 1)) + minWaitTime;
        
        console.log(`Simulazione ricerca partita: attesa di ${waitTime / 1000} secondi`);
        
        this.searchTimeout = setTimeout(() => {
            // Verifica se la ricerca è ancora in corso
            if (this.isSearching) {
                // Partita trovata!
                this.matchFound();
            }
        }, waitTime);
    }
    
    matchFound() {
        console.log("Partita trovata!");
        
        // Ferma la ricerca
        this.cancelSearch();
        
        // Mostra una notifica
        this.uiManager.showNotification('Partita trovata!', 'success');
        
        // Crea una stanza per la partita
        this.createRankedRoom();
    }
    
    createRankedRoom() {
        // Simula la creazione di una stanza ranked
        const roomData = {
            name: `Ranked ${this.currentMode} - ${this.generateRoomId()}`,
            type: 'ranked',
            isPrivate: false,
            maxPlayers: this.getMaxPlayers()
        };
        
        // Crea la stanza (utilizzando il roomManager tramite il networkManager)
        this.networkManager.emit('createRoom', roomData);
        
        // In una versione reale, il server creerebbe la stanza e invierebbe un evento
        // per far entrare i giocatori. Qui simuliamo questo comportamento.
        setTimeout(() => {
            // Simula l'entrata nella stanza
            this.uiManager.showScreen('room-screen');
        }, 1000);
    }
    
    getMaxPlayers() {
        // Determina il numero massimo di giocatori in base alla modalità
        switch (this.currentMode) {
            case '1v1':
                return 2;
            case '2v2':
                return 4;
            case '3v3':
                return 8; // 3v3+
            default:
                return 6;
        }
    }
    
    generateRoomId() {
        // Genera un ID casuale per la stanza
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    
    // Metodo pubblico per mostrare la schermata di matchmaking
    showMatchmaking() {
        this.initUI();
    }
}
