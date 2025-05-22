// gameRules.js - Implementazione reale delle regole di gioco

export class GameRules {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.scoreLimit = 3;
        this.timeLimit = 5 * 60; // 5 minuti in secondi
        this.gameTime = 0;
        this.score = { red: 0, blue: 0 };
        this.gameStartTime = 0;
        this.isGameRunning = false;
        this.goalScoredCallback = null;
        this.gameEndedCallback = null;
    }
    
    // Inizializza le regole di gioco
    init(settings, goalScoredCallback, gameEndedCallback) {
        console.log("Inizializzazione GameRules con impostazioni:", settings);
        
        // Imposta i limiti
        if (settings) {
            this.scoreLimit = settings.scoreLimit || this.scoreLimit;
            this.timeLimit = (settings.timeLimit || 5) * 60; // Converti in secondi
        }
        
        // Imposta i callback
        this.goalScoredCallback = goalScoredCallback;
        this.gameEndedCallback = gameEndedCallback;
        
        // Resetta il punteggio
        this.score = { red: 0, blue: 0 };
        
        // Resetta il tempo di gioco
        this.gameTime = 0;
        
        return this;
    }
    
    // Avvia la partita
    startGame() {
        console.log("Avvio partita con regole:", this);
        
        // Imposta lo stato di gioco
        this.isGameRunning = true;
        
        // Imposta il tempo di inizio
        this.gameStartTime = Date.now();
        
        return true;
    }
    
    // Aggiorna lo stato della partita
    update() {
        if (!this.isGameRunning) return;
        
        // Aggiorna il tempo di gioco
        this.gameTime = (Date.now() - this.gameStartTime) / 1000; // in secondi
        
        // Verifica se il tempo è scaduto
        if (this.gameTime >= this.timeLimit) {
            // La partita è finita per limite di tempo
            this.endGame();
        }
    }
    
    // Gestisce un goal
    handleGoal(team, scorerId) {
        if (!this.isGameRunning) return;
        
        console.log(`Goal segnato dalla squadra ${team} da ${scorerId}`);
        
        // Aggiorna il punteggio
        if (team === 'left') {
            this.score.blue++;
        } else if (team === 'right') {
            this.score.red++;
        }
        
        // Chiama il callback
        if (this.goalScoredCallback) {
            this.goalScoredCallback({
                team: team === 'left' ? 'blue' : 'red',
                scorerId: scorerId
            });
        }
        
        // Verifica se la partita è finita
        if (this.score.red >= this.scoreLimit || this.score.blue >= this.scoreLimit) {
            // La partita è finita per limite di punteggio
            this.endGame();
        }
    }
    
    // Termina la partita
    endGame() {
        if (!this.isGameRunning) return;
        
        console.log("Fine partita con punteggio:", this.score);
        
        // Imposta lo stato di gioco
        this.isGameRunning = false;
        
        // Prepara i risultati
        const results = {
            score: this.score,
            duration: this.gameTime,
            winner: this.score.red > this.score.blue ? 'red' : (this.score.blue > this.score.red ? 'blue' : 'draw')
        };
        
        // Chiama il callback
        if (this.gameEndedCallback) {
            this.gameEndedCallback(results);
        }
        
        return results;
    }
    
    // Ottieni il tempo rimanente formattato
    getFormattedTimeRemaining() {
        const timeRemaining = Math.max(0, this.timeLimit - this.gameTime);
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
    
    // Ottieni il punteggio formattato
    getFormattedScore() {
        return `${this.score.red} - ${this.score.blue}`;
    }
    
    // Verifica se la partita è in corso
    isRunning() {
        return this.isGameRunning;
    }
    
    // Ottieni il vincitore
    getWinner() {
        if (this.score.red > this.score.blue) {
            return 'red';
        } else if (this.score.blue > this.score.red) {
            return 'blue';
        } else {
            return 'draw';
        }
    }
}
