// fieldRenderer.js - Implementazione reale del renderer del campo di gioco

export class FieldRenderer {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.canvas = null;
        this.ctx = null;
        this.width = 800;
        this.height = 400;
        this.fieldType = 'standard';
        this.players = new Map();
        this.ball = null;
        this.initialized = false;
        this.animationFrame = null;
        
        // Colori
        this.colors = {
            field: '#3a8f3a',
            lines: '#ffffff',
            redTeam: '#ff4040',
            blueTeam: '#4040ff',
            ball: '#ffffff',
            goal: '#c0c0c0',
            shadow: 'rgba(0, 0, 0, 0.3)',
            text: '#ffffff'
        };
    }
    
    // Inizializza il renderer
    init() {
        console.log("Inizializzazione FieldRenderer");
        
        // Ottieni il container
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`Container con ID ${this.containerId} non trovato`);
            return false;
        }
        
        // Crea il canvas se non esiste
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.canvas.className = 'game-canvas';
            this.container.appendChild(this.canvas);
        }
        
        // Ottieni il contesto
        this.ctx = this.canvas.getContext('2d');
        
        // Imposta lo stato di inizializzazione
        this.initialized = true;
        
        // Avvia il loop di rendering
        this.startRenderLoop();
        
        return true;
    }
    
    // Imposta il tipo di campo
    setFieldType(type) {
        this.fieldType = type || 'standard';
        
        // Aggiorna le dimensioni in base al tipo di campo
        switch (this.fieldType) {
            case 'small':
                this.width = 600;
                this.height = 300;
                break;
            case 'large':
                this.width = 1000;
                this.height = 500;
                break;
            case 'standard':
            default:
                this.width = 800;
                this.height = 400;
                break;
        }
        
        // Aggiorna le dimensioni del canvas
        if (this.canvas) {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
    }
    
    // Avvia il loop di rendering
    startRenderLoop() {
        // Cancella il loop precedente se esiste
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Funzione di rendering
        const render = () => {
            this.render();
            this.animationFrame = requestAnimationFrame(render);
        };
        
        // Avvia il loop
        this.animationFrame = requestAnimationFrame(render);
    }
    
    // Ferma il loop di rendering
    stopRenderLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
    
    // Renderizza il campo e gli oggetti
    render() {
        if (!this.initialized || !this.ctx) return;
        
        // Pulisci il canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Renderizza il campo
        this.renderField();
        
        // Renderizza i giocatori
        this.players.forEach(player => {
            this.renderPlayer(player);
        });
        
        // Renderizza la palla
        if (this.ball) {
            this.renderBall(this.ball);
        }
    }
    
    // Renderizza il campo
    renderField() {
        // Imposta il sistema di coordinate al centro del canvas
        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 2);
        
        // Disegna il campo
        this.ctx.fillStyle = this.colors.field;
        this.ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Disegna le linee
        this.ctx.strokeStyle = this.colors.lines;
        this.ctx.lineWidth = 2;
        
        // Linea di centrocampo
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.height / 2);
        this.ctx.lineTo(0, this.height / 2);
        this.ctx.stroke();
        
        // Cerchio di centrocampo
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 50, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Porte
        const goalWidth = 100;
        const goalDepth = 20;
        
        // Porta sinistra
        this.ctx.fillStyle = this.colors.goal;
        this.ctx.fillRect(-this.width / 2 - goalDepth, -goalWidth / 2, goalDepth, goalWidth);
        
        // Porta destra
        this.ctx.fillRect(this.width / 2, -goalWidth / 2, goalDepth, goalWidth);
        
        // Linee delle porte
        this.ctx.strokeStyle = this.colors.lines;
        this.ctx.beginPath();
        
        // Porta sinistra
        this.ctx.moveTo(-this.width / 2, -goalWidth / 2);
        this.ctx.lineTo(-this.width / 2 - goalDepth, -goalWidth / 2);
        this.ctx.lineTo(-this.width / 2 - goalDepth, goalWidth / 2);
        this.ctx.lineTo(-this.width / 2, goalWidth / 2);
        
        // Porta destra
        this.ctx.moveTo(this.width / 2, -goalWidth / 2);
        this.ctx.lineTo(this.width / 2 + goalDepth, -goalWidth / 2);
        this.ctx.lineTo(this.width / 2 + goalDepth, goalWidth / 2);
        this.ctx.lineTo(this.width / 2, goalWidth / 2);
        
        this.ctx.stroke();
        
        // Aree di rigore
        const penaltyAreaWidth = 150;
        const penaltyAreaDepth = 50;
        
        // Area sinistra
        this.ctx.strokeRect(-this.width / 2, -penaltyAreaWidth / 2, penaltyAreaDepth, penaltyAreaWidth);
        
        // Area destra
        this.ctx.strokeRect(this.width / 2 - penaltyAreaDepth, -penaltyAreaWidth / 2, penaltyAreaDepth, penaltyAreaWidth);
        
        // Ripristina il sistema di coordinate
        this.ctx.restore();
    }
    
    // Renderizza un giocatore
    renderPlayer(player) {
        if (!player) return;
        
        // Imposta il sistema di coordinate al centro del canvas
        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 2);
        
        // Disegna l'ombra
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(player.x, player.y + 15, 15, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Disegna il giocatore
        this.ctx.fillStyle = player.team === 'red' ? this.colors.redTeam : this.colors.blueTeam;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Disegna una freccia che indica la direzione
        if (player.isMoving) {
            const dirLength = Math.sqrt(player.dx * player.dx + player.dy * player.dy);
            if (dirLength > 0) {
                const normalizedDx = player.dx / dirLength;
                const normalizedDy = player.dy / dirLength;
                
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(player.x, player.y);
                this.ctx.lineTo(player.x + normalizedDx * 20, player.y + normalizedDy * 20);
                this.ctx.stroke();
            }
        }
        
        // Disegna il nickname
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.nickname, player.x, player.y - 25);
        
        // Ripristina il sistema di coordinate
        this.ctx.restore();
    }
    
    // Renderizza la palla
    renderBall(ball) {
        if (!ball) return;
        
        // Imposta il sistema di coordinate al centro del canvas
        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 2);
        
        // Disegna l'ombra
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(ball.x, ball.y + 10, 10, 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Disegna la palla
        this.ctx.fillStyle = this.colors.ball;
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Disegna i dettagli della palla
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        
        // Disegna un pentagono
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) + Math.PI / 5;
            const x = ball.x + 5 * Math.cos(angle);
            const y = ball.y + 5 * Math.sin(angle);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Ripristina il sistema di coordinate
        this.ctx.restore();
    }
    
    // Aggiungi un giocatore
    addPlayer(id, nickname, team) {
        this.players.set(id, {
            id,
            nickname,
            team,
            x: team === 'red' ? -100 : 100,
            y: 0,
            dx: 0,
            dy: 0,
            isMoving: false,
            isKicking: false
        });
    }
    
    // Rimuovi un giocatore
    removePlayer(id) {
        this.players.delete(id);
    }
    
    // Aggiorna un giocatore
    updatePlayer(player) {
        if (!player || !player.id) return;
        
        const existingPlayer = this.players.get(player.id);
        if (existingPlayer) {
            // Aggiorna solo le proprietà fornite
            Object.assign(existingPlayer, player);
        } else {
            // Aggiungi il giocatore se non esiste
            this.players.set(player.id, player);
        }
    }
    
    // Aggiungi la palla
    addBall(ball) {
        this.ball = ball || { x: 0, y: 0, dx: 0, dy: 0 };
    }
    
    // Aggiorna la palla
    updateBall(ball) {
        if (!ball) return;
        
        if (this.ball) {
            // Aggiorna solo le proprietà fornite
            Object.assign(this.ball, ball);
        } else {
            // Aggiungi la palla se non esiste
            this.addBall(ball);
        }
    }
    
    // Distruggi il renderer
    destroy() {
        // Ferma il loop di rendering
        this.stopRenderLoop();
        
        // Rimuovi il canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Resetta le variabili
        this.canvas = null;
        this.ctx = null;
        this.players.clear();
        this.ball = null;
        this.initialized = false;
    }
}
