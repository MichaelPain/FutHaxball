// inputHandler.js - Gestisce gli input del giocatore con supporto migliorato per input multipli

export class InputHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            kick: false
        };
        
        // Aggiungiamo supporto per tasti WASD come alternativa alle frecce
        this.keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            'W': 'up',
            's': 'down',
            'S': 'down',
            'a': 'left',
            'A': 'left',
            'd': 'right',
            'D': 'right',
            'x': 'kick',
            'X': 'kick',
            ' ': 'kick' // Spazio come alternativa per calciare
        };
        
        // Stato per la gestione degli input multipli
        this.activeKeys = new Set();
        this.lastUpdateTime = 0;
        this.inputUpdateInterval = 8; // Ridotto a 8ms (circa 120 FPS) per maggiore fluidità
        this.chatActive = false;
        
        // Aggiunta di buffer per input più reattivi
        this.inputBuffer = [];
        this.bufferSize = 3; // Dimensione del buffer per gli input
        this.bufferTimeout = 100; // Timeout in ms per gli input nel buffer
        
        // Aggiunta di predizione del movimento per maggiore fluidità
        this.previousDirection = { dx: 0, dy: 0 };
        this.directionSmoothingFactor = 0.7; // Fattore di smoothing per i cambi di direzione
        
        // Binding dei metodi
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleChatInput = this.handleChatInput.bind(this);
        this.updateInputState = this.updateInputState.bind(this);
        this.processInputBuffer = this.processInputBuffer.bind(this);
    }
    
    init() {
        // Registra gli event listener
        document.addEventListener('keydown', this.handleKeyDown, { passive: false });
        document.addEventListener('keyup', this.handleKeyUp, { passive: true });
        
        // Registra l'event listener per la chat
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('focus', () => {
                this.chatActive = true;
            });
            
            chatInput.addEventListener('blur', () => {
                this.chatActive = false;
            });
            
            chatInput.addEventListener('keydown', this.handleChatInput);
        }
        
        // Avvia il loop di aggiornamento degli input
        this.startInputLoop();
    }
    
    startInputLoop() {
        // Utilizziamo requestAnimationFrame per un aggiornamento più fluido
        const loop = (timestamp) => {
            // Aggiorna lo stato degli input solo se è passato abbastanza tempo
            if (timestamp - this.lastUpdateTime >= this.inputUpdateInterval) {
                this.updateInputState();
                this.processInputBuffer();
                this.lastUpdateTime = timestamp;
            }
            
            // Continua il loop
            this.animationFrameId = requestAnimationFrame(loop);
        };
        
        // Avvia il loop
        this.animationFrameId = requestAnimationFrame(loop);
    }
    
    stopInputLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    updateInputState() {
        // Aggiorna lo stato degli input in base ai tasti attivi
        for (const key in this.keys) {
            this.keys[key] = false;
        }
        
        this.activeKeys.forEach(key => {
            const action = this.keyMap[key];
            if (action) {
                this.keys[action] = true;
            }
        });
    }
    
    // Processa il buffer degli input per una risposta più reattiva
    processInputBuffer() {
        const currentTime = Date.now();
        
        // Rimuovi gli input scaduti dal buffer
        this.inputBuffer = this.inputBuffer.filter(input => 
            currentTime - input.timestamp < this.bufferTimeout
        );
        
        // Applica gli input dal buffer se non sono già attivi
        this.inputBuffer.forEach(input => {
            if (input.type === 'keydown' && !this.activeKeys.has(input.key)) {
                const action = this.keyMap[input.key];
                if (action) {
                    this.keys[action] = true;
                }
            }
        });
    }
    
    handleKeyDown(e) {
        // Ignora gli input se la chat è attiva
        if (this.chatActive) return;
        
        // Gestisci solo se la schermata di gioco è attiva
        if (this.gameManager.uiManager.getCurrentScreen() !== 'game-screen') return;
        
        // Previeni il comportamento predefinito per i tasti di gioco
        if (this.keyMap[e.key]) {
            e.preventDefault();
        }
        
        // Aggiungi il tasto alla lista dei tasti attivi
        this.activeKeys.add(e.key);
        
        // Aggiungi l'input al buffer per una risposta più reattiva
        if (this.keyMap[e.key]) {
            this.inputBuffer.push({
                type: 'keydown',
                key: e.key,
                timestamp: Date.now()
            });
            
            // Limita la dimensione del buffer
            if (this.inputBuffer.length > this.bufferSize) {
                this.inputBuffer.shift();
            }
        }
        
        // Gestisci l'attivazione della chat
        if (e.key === 'Tab') {
            e.preventDefault();
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.focus();
            }
        }
    }
    
    handleKeyUp(e) {
        // Gestisci solo se la schermata di gioco è attiva
        if (this.gameManager.uiManager.getCurrentScreen() !== 'game-screen') return;
        
        // Rimuovi il tasto dalla lista dei tasti attivi
        this.activeKeys.delete(e.key);
        
        // Aggiungi l'input al buffer
        if (this.keyMap[e.key]) {
            this.inputBuffer.push({
                type: 'keyup',
                key: e.key,
                timestamp: Date.now()
            });
            
            // Limita la dimensione del buffer
            if (this.inputBuffer.length > this.bufferSize) {
                this.inputBuffer.shift();
            }
        }
    }
    
    handleChatInput(e) {
        if (e.key === 'Enter') {
            const chatInput = document.getElementById('chat-input');
            const message = chatInput.value.trim();
            
            if (message) {
                // Invia il messaggio
                this.gameManager.networkManager.sendChatMessage(message);
                
                // Aggiungi il messaggio localmente
                const localPlayer = this.gameManager.getLocalPlayer();
                if (localPlayer) {
                    this.gameManager.uiManager.addChatMessage(localPlayer.nickname, message);
                }
            }
            
            // Pulisci l'input e rimuovi il focus
            chatInput.value = '';
            chatInput.blur();
            this.chatActive = false;
            
            // Previeni l'invio del form
            e.preventDefault();
        } else if (e.key === 'Escape') {
            // Annulla l'input della chat
            const chatInput = document.getElementById('chat-input');
            chatInput.value = '';
            chatInput.blur();
            this.chatActive = false;
            
            e.preventDefault();
        }
    }
    
    getInputState() {
        return { ...this.keys };
    }
    
    // Metodo per calcolare la direzione del movimento in base agli input
    getMovementDirection() {
        let dx = 0;
        let dy = 0;
        
        // Calcola la direzione orizzontale
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;
        
        // Calcola la direzione verticale
        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        
        // Normalizza il vettore per movimenti diagonali
        if (dx !== 0 && dy !== 0) {
            // Fattore di normalizzazione per mantenere la stessa velocità in diagonale
            const normalizer = 1 / Math.sqrt(2);
            dx *= normalizer;
            dy *= normalizer;
        }
        
        // Applica smoothing per transizioni più fluide tra direzioni
        const smoothedDx = dx * (1 - this.directionSmoothingFactor) + this.previousDirection.dx * this.directionSmoothingFactor;
        const smoothedDy = dy * (1 - this.directionSmoothingFactor) + this.previousDirection.dy * this.directionSmoothingFactor;
        
        // Se non c'è input attivo, non applicare smoothing
        const finalDx = (dx === 0) ? 0 : smoothedDx;
        const finalDy = (dy === 0) ? 0 : smoothedDy;
        
        // Aggiorna la direzione precedente
        this.previousDirection = { dx: finalDx, dy: finalDy };
        
        return { dx: finalDx, dy: finalDy };
    }
    
    // Nuovo metodo per ottenere la direzione del movimento senza smoothing
    getRawMovementDirection() {
        let dx = 0;
        let dy = 0;
        
        // Calcola la direzione orizzontale
        if (this.keys.left) dx -= 1;
        if (this.keys.right) dx += 1;
        
        // Calcola la direzione verticale
        if (this.keys.up) dy -= 1;
        if (this.keys.down) dy += 1;
        
        // Normalizza il vettore per movimenti diagonali
        if (dx !== 0 && dy !== 0) {
            // Fattore di normalizzazione per mantenere la stessa velocità in diagonale
            const normalizer = 1 / Math.sqrt(2);
            dx *= normalizer;
            dy *= normalizer;
        }
        
        return { dx, dy };
    }
    
    // Nuovo metodo per verificare se c'è un cambio di direzione
    hasDirectionChanged() {
        const rawDirection = this.getRawMovementDirection();
        return (Math.abs(rawDirection.dx - this.previousDirection.dx) > 0.1 || 
                Math.abs(rawDirection.dy - this.previousDirection.dy) > 0.1);
    }
    
    // Nuovo metodo per regolare il fattore di smoothing in base alla situazione
    adjustSmoothingFactor(isAccelerating) {
        // Se il giocatore sta accelerando, riduci lo smoothing per una risposta più immediata
        if (isAccelerating) {
            this.directionSmoothingFactor = 0.3; // Meno smoothing durante l'accelerazione
        } else {
            this.directionSmoothingFactor = 0.7; // Più smoothing durante il movimento costante
        }
    }
    
    reset() {
        // Resetta tutti gli input
        this.activeKeys.clear();
        this.inputBuffer = [];
        for (const key in this.keys) {
            this.keys[key] = false;
        }
        this.chatActive = false;
        this.previousDirection = { dx: 0, dy: 0 };
    }
    
    cleanup() {
        // Ferma il loop di aggiornamento
        this.stopInputLoop();
        
        // Rimuovi gli event listener
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.removeEventListener('keydown', this.handleChatInput);
        }
    }
}
