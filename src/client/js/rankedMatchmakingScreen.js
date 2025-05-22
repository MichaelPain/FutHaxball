// rankedMatchmakingScreen.js - Gestione della schermata di matchmaking ranked

export class RankedMatchmakingScreen {
    constructor(uiManager, rankedMatchmaking) {
        this.uiManager = uiManager;
        this.rankedMatchmaking = rankedMatchmaking;
        
        // Elementi DOM
        this.rankedModesContainer = null;
        this.queueStatusContainer = null;
        this.matchFoundContainer = null;
        this.modeButtons = null;
        this.cancelQueueButton = null;
        this.acceptMatchButton = null;
        this.declineMatchButton = null;
        this.queueModeDisplay = null;
        this.queueTimeDisplay = null;
        this.matchModeDisplay = null;
        
        // Timer per aggiornare il tempo in coda
        this.queueTimeInterval = null;
        this.queueStartTime = null;
    }
    
    init() {
        console.log("Inizializzazione schermata di matchmaking ranked");
        
        // Ottieni i riferimenti agli elementi DOM
        this.rankedModesContainer = document.querySelector('.ranked-modes');
        this.queueStatusContainer = document.querySelector('.ranked-queue-status');
        this.matchFoundContainer = document.querySelector('.ranked-match-found');
        this.modeButtons = document.querySelectorAll('.ranked-mode-item');
        this.cancelQueueButton = document.getElementById('cancel-queue');
        this.acceptMatchButton = document.getElementById('accept-match');
        this.declineMatchButton = document.getElementById('decline-match');
        this.queueModeDisplay = document.getElementById('queue-mode-display');
        this.queueTimeDisplay = document.getElementById('queue-time');
        this.matchModeDisplay = document.getElementById('match-mode-display');
        
        // Verifica che tutti gli elementi esistano
        if (!this.rankedModesContainer || !this.queueStatusContainer || !this.matchFoundContainer || 
            !this.modeButtons || !this.cancelQueueButton || !this.acceptMatchButton || 
            !this.declineMatchButton || !this.queueModeDisplay || !this.queueTimeDisplay || 
            !this.matchModeDisplay) {
            console.error("Elementi della schermata di matchmaking ranked non trovati");
            return;
        }
        
        // Mostra la schermata di selezione modalità
        this.showModeSelection();
        
        // Configura gli event listener
        this.setupEventListeners();
    }
    
    showModeSelection() {
        // Mostra la selezione delle modalità e nascondi le altre sezioni
        this.rankedModesContainer.style.display = 'flex';
        this.queueStatusContainer.style.display = 'none';
        this.matchFoundContainer.style.display = 'none';
        
        // Ferma il timer del tempo in coda se attivo
        if (this.queueTimeInterval) {
            clearInterval(this.queueTimeInterval);
            this.queueTimeInterval = null;
        }
    }
    
    showQueueStatus(mode) {
        // Mostra lo stato della coda e nascondi le altre sezioni
        this.rankedModesContainer.style.display = 'none';
        this.queueStatusContainer.style.display = 'block';
        this.matchFoundContainer.style.display = 'none';
        
        // Aggiorna il display della modalità
        this.queueModeDisplay.textContent = mode;
        
        // Inizia a contare il tempo in coda
        this.queueStartTime = Date.now();
        this.updateQueueTime();
        
        // Avvia un timer per aggiornare il tempo in coda
        this.queueTimeInterval = setInterval(() => {
            this.updateQueueTime();
        }, 1000);
    }
    
    showMatchFound(mode) {
        // Mostra la sezione di match trovato e nascondi le altre sezioni
        this.rankedModesContainer.style.display = 'none';
        this.queueStatusContainer.style.display = 'none';
        this.matchFoundContainer.style.display = 'block';
        
        // Aggiorna il display della modalità
        this.matchModeDisplay.textContent = mode;
        
        // Ferma il timer del tempo in coda
        if (this.queueTimeInterval) {
            clearInterval(this.queueTimeInterval);
            this.queueTimeInterval = null;
        }
    }
    
    updateQueueTime() {
        if (!this.queueStartTime) return;
        
        // Calcola il tempo trascorso
        const elapsedTime = Math.floor((Date.now() - this.queueStartTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
        const seconds = (elapsedTime % 60).toString().padStart(2, '0');
        
        // Aggiorna il display
        this.queueTimeDisplay.textContent = `${minutes}:${seconds}`;
    }
    
    setupEventListeners() {
        // Configura gli event listener per i pulsanti delle modalità
        this.modeButtons.forEach(button => {
            // Rimuovi eventuali listener precedenti
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                const mode = newButton.getAttribute('data-mode');
                console.log(`Modalità selezionata: ${mode}`);
                
                // Avvia la coda per la modalità selezionata
                this.rankedMatchmaking.startQueue(mode);
                
                // Mostra lo stato della coda
                this.showQueueStatus(mode);
            });
        });
        
        // Aggiorna i riferimenti ai pulsanti dopo la sostituzione
        this.modeButtons = document.querySelectorAll('.ranked-mode-item');
        
        // Configura l'event listener per il pulsante di annullamento coda
        // Rimuovi eventuali listener precedenti
        const newCancelButton = this.cancelQueueButton.cloneNode(true);
        this.cancelQueueButton.parentNode.replaceChild(newCancelButton, this.cancelQueueButton);
        this.cancelQueueButton = newCancelButton;
        
        // Aggiungi il nuovo listener
        this.cancelQueueButton.addEventListener('click', () => {
            console.log("Annullamento coda");
            
            // Annulla la coda
            this.rankedMatchmaking.cancelQueue();
            
            // Torna alla selezione delle modalità
            this.showModeSelection();
        });
        
        // Configura gli event listener per i pulsanti di accettazione/rifiuto match
        // Rimuovi eventuali listener precedenti
        const newAcceptButton = this.acceptMatchButton.cloneNode(true);
        this.acceptMatchButton.parentNode.replaceChild(newAcceptButton, this.acceptMatchButton);
        this.acceptMatchButton = newAcceptButton;
        
        const newDeclineButton = this.declineMatchButton.cloneNode(true);
        this.declineMatchButton.parentNode.replaceChild(newDeclineButton, this.declineMatchButton);
        this.declineMatchButton = newDeclineButton;
        
        // Aggiungi i nuovi listener
        this.acceptMatchButton.addEventListener('click', () => {
            console.log("Accettazione match");
            
            // Accetta il match
            this.rankedMatchmaking.acceptMatch();
        });
        
        this.declineMatchButton.addEventListener('click', () => {
            console.log("Rifiuto match");
            
            // Rifiuta il match
            this.rankedMatchmaking.declineMatch();
            
            // Torna alla selezione delle modalità
            this.showModeSelection();
        });
    }
    
    // Metodo chiamato quando viene trovato un match
    onMatchFound(matchData) {
        console.log("Match trovato:", matchData);
        
        // Mostra la sezione di match trovato
        this.showMatchFound(matchData.mode);
        
        // Avvia il timer per l'accettazione
        this.startAcceptTimer(matchData.acceptTimeout || 30);
    }
    
    // Avvia il timer per l'accettazione del match
    startAcceptTimer(seconds) {
        const timerElement = document.getElementById('match-timer-value');
        if (!timerElement) return;
        
        // Imposta il valore iniziale
        timerElement.textContent = seconds;
        
        // Avvia il timer
        const timerInterval = setInterval(() => {
            const currentValue = parseInt(timerElement.textContent);
            if (currentValue <= 1) {
                clearInterval(timerInterval);
                
                // Se il tempo scade, rifiuta automaticamente il match
                this.rankedMatchmaking.declineMatch();
                
                // Torna alla selezione delle modalità
                this.showModeSelection();
            } else {
                timerElement.textContent = currentValue - 1;
            }
        }, 1000);
    }
}
