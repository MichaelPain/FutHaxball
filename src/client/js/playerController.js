// playerController.js - Implementazione reale del controller del giocatore

/**
 * PlayerController gestisce l'input e lo stato del giocatore locale.
 * Si occupa di movimento, sprint, calcio, tackle e interazione con il gameManager.
 */
export class PlayerController {
    /**
     * @param {GameManager} gameManager - Istanza del game manager per interagire con il gioco
     */
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.playerId = null;
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            kick: false,
            sprint: false,
            tackle: false
        };
        this.kickCooldown = 0;
        this.kickCooldownTime = 400; // Ridotto a 400ms per un gameplay più veloce
        this.tackleCooldown = 0;
        this.tackleCooldownTime = 1000; // 1 secondo di cooldown per il tackle
        this.lastUpdateTime = 0;
        this.isSprinting = false;
        this.sprintMultiplier = 1.5;
        this.acceleration = 0.8;
        this.deceleration = 0.95;
        this.currentSpeed = 0;
        this.maxSpeed = 1;
        this.tackleDuration = 300; // Durata del tackle in ms
        this.isTackling = false;
        
        // Binding dei metodi
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.update = this.update.bind(this);
    }
    
    /**
     * Inizializza il controller per un dato playerId
     * @param {string} playerId
     * @returns {PlayerController}
     */
    init(playerId) {
        console.log("Inizializzazione PlayerController per il giocatore", playerId);
        
        this.playerId = playerId;
        
        // Avvia il loop di aggiornamento
        this.startUpdateLoop();
        
        return this;
    }
    
    /**
     * Avvia il loop di aggiornamento (circa 60 FPS)
     */
    startUpdateLoop() {
        // Imposta il tempo dell'ultimo aggiornamento
        this.lastUpdateTime = Date.now();
        
        // Avvia il loop
        this.updateLoop = setInterval(this.update, 16); // Circa 60 FPS
    }
    
    /**
     * Ferma il loop di aggiornamento
     */
    stopUpdateLoop() {
        if (this.updateLoop) {
            clearInterval(this.updateLoop);
            this.updateLoop = null;
        }
    }
    
    /**
     * Aggiorna lo stato del giocatore (chiamato ogni frame)
     */
    update() {
        if (!this.playerId || !this.gameManager) return;
        try {
            // Calcola il delta time
            const now = Date.now();
            const deltaTime = (now - this.lastUpdateTime) / 1000; // in secondi
            this.lastUpdateTime = now;
            
            // Aggiorna i cooldown
            if (this.kickCooldown > 0) {
                this.kickCooldown -= now - this.lastUpdateTime;
                if (this.kickCooldown < 0) this.kickCooldown = 0;
            }
            
            if (this.tackleCooldown > 0) {
                this.tackleCooldown -= now - this.lastUpdateTime;
                if (this.tackleCooldown < 0) this.tackleCooldown = 0;
            }
            
            // Calcola la direzione in base ai tasti premuti
            let dx = 0;
            let dy = 0;
            
            if (this.keys.up) dy -= 1;
            if (this.keys.down) dy += 1;
            if (this.keys.left) dx -= 1;
            if (this.keys.right) dx += 1;
            
            // Normalizza la direzione se necessario
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
                dx /= length;
                dy /= length;
            }
            
            // Gestisci lo sprint
            this.isSprinting = this.keys.sprint && length > 0;
            const speedMultiplier = this.isSprinting ? this.sprintMultiplier : 1;
            
            // Applica l'accelerazione e la decelerazione
            if (length > 0) {
                this.currentSpeed = Math.min(this.maxSpeed * speedMultiplier, 
                    this.currentSpeed + this.acceleration * deltaTime);
            } else {
                this.currentSpeed *= this.deceleration;
            }
            
            // Applica la velocità alla direzione
            dx *= this.currentSpeed;
            dy *= this.currentSpeed;
            
            // Aggiorna la direzione del giocatore
            this.gameManager.updatePlayerDirection(this.playerId, dx, dy);
            
            // Gestisci il calcio
            if (this.keys.kick && this.kickCooldown === 0 && !this.isTackling) {
                // Calcola la potenza del calcio in base alla velocità
                const kickPower = 15 * (1 + this.currentSpeed * 0.5);
                
                // Calcio della palla
                const kicked = this.gameManager.kickBall(this.playerId, kickPower);
                
                if (kicked) {
                    // Imposta il cooldown
                    this.kickCooldown = this.kickCooldownTime;
                    
                    // Aggiorna lo stato del giocatore
                    this.gameManager.updatePlayerState(this.playerId, { 
                        isKicking: true,
                        kickPower: kickPower
                    });
                    
                    // Resetta lo stato dopo un breve periodo
                    setTimeout(() => {
                        this.gameManager.updatePlayerState(this.playerId, { 
                            isKicking: false,
                            kickPower: 0
                        });
                    }, 200);
                }
            }
            
            // Gestisci il tackle
            if (this.keys.tackle && this.tackleCooldown === 0 && !this.isTackling) {
                this.isTackling = true;
                this.tackleCooldown = this.tackleCooldownTime;
                
                // Aggiorna lo stato del giocatore
                this.gameManager.updatePlayerState(this.playerId, { 
                    isTackling: true,
                    tacklePower: 20
                });
                
                // Resetta lo stato dopo la durata del tackle
                setTimeout(() => {
                    this.isTackling = false;
                    this.gameManager.updatePlayerState(this.playerId, { 
                        isTackling: false,
                        tacklePower: 0
                    });
                }, this.tackleDuration);
            }
        } catch (err) {
            console.error('Errore nell\'update del PlayerController:', err);
        }
    }
    
    /**
     * Gestisce l'evento keydown
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        // Ignora se l'evento è ripetuto (tasto tenuto premuto)
        if (event.repeat) return;
        
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keys.down = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.kick = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = true;
                break;
            case 'KeyX':
                this.keys.tackle = true;
                break;
        }
    }
    
    /**
     * Gestisce l'evento keyup
     * @param {KeyboardEvent} event
     */
    handleKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.keys.down = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.kick = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.sprint = false;
                break;
            case 'KeyX':
                this.keys.tackle = false;
                break;
        }
    }
    
    /**
     * Distrugge il controller e resetta lo stato
     */
    destroy() {
        // Ferma il loop di aggiornamento
        this.stopUpdateLoop();
        
        // Resetta le variabili
        this.playerId = null;
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            kick: false,
            sprint: false,
            tackle: false
        };
    }
}

// Stub di test per PlayerController (da completare in tests/PlayerController.test.js)
// import { PlayerController } from './playerController';
// describe('PlayerController', () => {
//     it('should initialize and update player state', () => {
//         // TODO: implementare test
//     });
// });
