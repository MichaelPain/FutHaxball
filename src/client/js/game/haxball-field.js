// Implementazione avanzata del campo di gioco HaxBall con fisica realistica
// e ottimizzazioni delle performance

import EffectsManager from './effects-manager';

class HaxballField {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error('Container not found: ' + containerId);
    }
    
    // Costanti fisiche
    this.PHYSICS = {
      BALL_MASS: 1,
      PLAYER_MASS: 5,
      FRICTION: 0.98,
      BOUNCE_DAMPENING: 0.8,
      KICK_POWER: 15,
      MAX_BALL_SPEED: 20,
      MAX_PLAYER_SPEED: 8,
      ACCELERATION: 0.5,
      DECELERATION: 0.8
    };
    
    // Dimensioni del campo
    this.width = 800;
    this.height = 350;
    
    // Setup del canvas con hardware acceleration
    this.setupCanvas();
    
    // Elementi di gioco con proprietà fisiche avanzate
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 10,
      velocityX: 0,
      velocityY: 0,
      mass: this.PHYSICS.BALL_MASS,
      rotation: 0,
      angularVelocity: 0,
      color: '#ffffff'
    };
    
    this.players = [];
    this.score = { red: 0, blue: 0 };
    this.lastFrameTime = 0;
    this.deltaTime = 0;
    
    // Dimensioni delle porte
    this.goalWidth = 8;
    this.goalHeight = 130;
    this.goalY = (this.height - this.goalHeight) / 2;
    
    // Cache per le collisioni
    this.collisionGrid = new Map();
    this.gridCellSize = 30;
    
    // Input state
    this.keys = new Set();
    
    // Initialize effects manager
    this.effectsManager = new EffectsManager(this.canvas, this.ctx);
    
    // Add weather type to game state
    this.weather = 'none';
    
    // Inizializzazione
    this.setupEventListeners();
    this.preRenderStaticElements();
    this.startGameLoop();
  }
  
  setupEventListeners() {
    // Gestione del ridimensionamento con throttling
    let resizeTimeout;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 100);
    });
    this.handleResize();
    
    // Gestione degli input con stato
    document.addEventListener('keydown', (e) => this.keys.add(e.key));
    document.addEventListener('keyup', (e) => this.keys.delete(e.key));
  }
  
  setupCanvas() {
    // Canvas principale con hardware acceleration
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.className = 'haxball-field';
    
    // Abilita hardware acceleration
    this.canvas.style.transform = 'translateZ(0)';
    this.canvas.style.backfaceVisibility = 'hidden';
    
    this.container.appendChild(this.canvas);
    
    // Ottieni il contesto con flag per performance
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    // Abilita image smoothing per migliore qualità
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Double buffering con hardware acceleration
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false
    });
    
    // Abilita image smoothing anche per l'offscreen canvas
    this.offscreenCtx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingQuality = 'high';
  }
  
  preRenderStaticElements() {
    // Pre-render del campo statico con ottimizzazioni
    this.fieldCanvas = document.createElement('canvas');
    this.fieldCanvas.width = this.width;
    this.fieldCanvas.height = this.height;
    const fieldCtx = this.fieldCanvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false
    });
    
    // Usa pattern per il campo
    const fieldPattern = this.createGrassPattern();
    fieldCtx.drawImage(fieldPattern, 0, 0);
    
    // Bordo del campo con gradiente
    const borderGradient = fieldCtx.createLinearGradient(0, 0, 0, this.height);
    borderGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    borderGradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');
    fieldCtx.strokeStyle = borderGradient;
    fieldCtx.lineWidth = 2;
    fieldCtx.strokeRect(0, 0, this.width, this.height);
    
    // Linea centrale con effetto ombra
    fieldCtx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    fieldCtx.shadowBlur = 5;
    fieldCtx.beginPath();
    fieldCtx.moveTo(this.width / 2, 0);
    fieldCtx.lineTo(this.width / 2, this.height);
    fieldCtx.stroke();
    
    // Cerchio centrale con gradiente
    const circleGradient = fieldCtx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, 50
    );
    circleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    circleGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    fieldCtx.fillStyle = circleGradient;
    fieldCtx.beginPath();
    fieldCtx.arc(this.width / 2, this.height / 2, 50, 0, Math.PI * 2);
    fieldCtx.fill();
    fieldCtx.stroke();
    
    // Aree di porta con effetto ombra
    fieldCtx.strokeRect(0, this.goalY, this.goalWidth, this.goalHeight);
    fieldCtx.strokeRect(this.width - this.goalWidth, this.goalY, this.goalWidth, this.goalHeight);
  }
  
  createGrassPattern() {
    // Crea un pattern per il campo
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 20;
    patternCanvas.height = 20;
    const patternCtx = patternCanvas.getContext('2d');
    
    // Colore base del campo
    patternCtx.fillStyle = '#1a5c1a';
    patternCtx.fillRect(0, 0, 20, 20);
    
    // Aggiungi texture dell'erba
    patternCtx.strokeStyle = '#1d661d';
    patternCtx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 20;
      const y = Math.random() * 20;
      const length = 3 + Math.random() * 5;
      const angle = Math.random() * Math.PI;
      
      patternCtx.save();
      patternCtx.translate(x, y);
      patternCtx.rotate(angle);
      patternCtx.beginPath();
      patternCtx.moveTo(0, 0);
      patternCtx.lineTo(0, length);
      patternCtx.stroke();
      patternCtx.restore();
    }
    
    return patternCanvas;
  }
  
  updatePhysics() {
    // Aggiorna la fisica con deltaTime
    const dt = this.deltaTime / 16.667; // Normalizza per 60 FPS
    
    // Aggiorna i giocatori
    for (const player of this.players) {
      // Calcola accelerazione basata sugli input
      let ax = 0, ay = 0;
      if (player.controls) {
        if (this.keys.has(player.controls.up)) ay -= this.PHYSICS.ACCELERATION;
        if (this.keys.has(player.controls.down)) ay += this.PHYSICS.ACCELERATION;
        if (this.keys.has(player.controls.left)) ax -= this.PHYSICS.ACCELERATION;
        if (this.keys.has(player.controls.right)) ax += this.PHYSICS.ACCELERATION;
      }
      
      // Applica accelerazione
      player.velocityX += ax * dt;
      player.velocityY += ay * dt;
      
      // Limita la velocità
      const speed = Math.sqrt(player.velocityX * player.velocityX + player.velocityY * player.velocityY);
      if (speed > this.PHYSICS.MAX_PLAYER_SPEED) {
        const factor = this.PHYSICS.MAX_PLAYER_SPEED / speed;
        player.velocityX *= factor;
        player.velocityY *= factor;
      }
      
      // Applica decelerazione
      if (ax === 0) player.velocityX *= Math.pow(this.PHYSICS.DECELERATION, dt);
      if (ay === 0) player.velocityY *= Math.pow(this.PHYSICS.DECELERATION, dt);
      
      // Aggiorna posizione
      player.x += player.velocityX * dt;
      player.y += player.velocityY * dt;
      
      // Collisione con i bordi
      this.handlePlayerBoundaryCollision(player);
    }
    
    // Aggiorna la palla
    this.ball.x += this.ball.velocityX * dt;
    this.ball.y += this.ball.velocityY * dt;
    
    // Aggiorna rotazione della palla
    this.ball.rotation += this.ball.angularVelocity * dt;
    this.ball.angularVelocity *= this.PHYSICS.FRICTION;
    
    // Attrito
    this.ball.velocityX *= Math.pow(this.PHYSICS.FRICTION, dt);
    this.ball.velocityY *= Math.pow(this.PHYSICS.FRICTION, dt);
    
    // Collisioni
    this.handleBallCollisions();
  }
  
  handleBallCollisions() {
    // Collisione con i bordi
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.velocityY = -this.ball.velocityY * this.PHYSICS.BOUNCE_DAMPENING;
      this.ball.angularVelocity = this.ball.velocityX * 0.2;
    } else if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.velocityY = -this.ball.velocityY * this.PHYSICS.BOUNCE_DAMPENING;
      this.ball.angularVelocity = -this.ball.velocityX * 0.2;
    }
    
    // Collisione con le porte e gol
    if (this.ball.x - this.ball.radius < 0) {
      if (this.ball.y > this.goalY && this.ball.y < this.goalY + this.goalHeight) {
        this.score.blue++;
        this.effectsManager.addGoalEffect(this.ball.x, this.ball.y);
        this.resetBall();
        this.onGoal && this.onGoal('blue');
      } else {
        this.ball.x = this.ball.radius;
        this.ball.velocityX = -this.ball.velocityX * this.PHYSICS.BOUNCE_DAMPENING;
      }
    } else if (this.ball.x + this.ball.radius > this.width) {
      if (this.ball.y > this.goalY && this.ball.y < this.goalY + this.goalHeight) {
        this.score.red++;
        this.effectsManager.addGoalEffect(this.ball.x, this.ball.y);
        this.resetBall();
        this.onGoal && this.onGoal('red');
      } else {
        this.ball.x = this.width - this.ball.radius;
        this.ball.velocityX = -this.ball.velocityX * this.PHYSICS.BOUNCE_DAMPENING;
      }
    }
    
    // Collisione con i giocatori usando spatial partitioning
    this.updateCollisionGrid();
    this.checkPlayerBallCollisions();
  }
  
  updateCollisionGrid() {
    this.collisionGrid.clear();
    
    // Aggiungi i giocatori alla griglia
    for (const player of this.players) {
      const cellX = Math.floor(player.x / this.gridCellSize);
      const cellY = Math.floor(player.y / this.gridCellSize);
      const key = `${cellX},${cellY}`;
      
      if (!this.collisionGrid.has(key)) {
        this.collisionGrid.set(key, []);
      }
      this.collisionGrid.get(key).push(player);
    }
  }
  
  checkPlayerBallCollisions() {
    const ballCellX = Math.floor(this.ball.x / this.gridCellSize);
    const ballCellY = Math.floor(this.ball.y / this.gridCellSize);
    
    // Controlla le celle adiacenti
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${ballCellX + dx},${ballCellY + dy}`;
        const players = this.collisionGrid.get(key);
        
        if (players) {
          for (const player of players) {
            this.handlePlayerBallCollision(player);
          }
        }
      }
    }
  }
  
  handlePlayerBallCollision(player) {
    const dx = this.ball.x - player.x;
    const dy = this.ball.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.ball.radius + player.radius) {
      // Calcola la normale di collisione
      const nx = dx / distance;
      const ny = dy / distance;
      
      // Calcola la velocità relativa
      const vx = this.ball.velocityX - player.velocityX;
      const vy = this.ball.velocityY - player.velocityY;
      
      // Calcola l'impulso
      const impulse = (-(1 + this.PHYSICS.BOUNCE_DAMPENING) * (vx * nx + vy * ny)) /
                     (1 / this.PHYSICS.BALL_MASS + 1 / this.PHYSICS.PLAYER_MASS);
      
      // Applica l'impulso
      this.ball.velocityX += impulse * nx / this.PHYSICS.BALL_MASS;
      this.ball.velocityY += impulse * ny / this.PHYSICS.BALL_MASS;
      player.velocityX -= impulse * nx / this.PHYSICS.PLAYER_MASS;
      player.velocityY -= impulse * ny / this.PHYSICS.PLAYER_MASS;
      
      // Aggiorna la rotazione della palla
      this.ball.angularVelocity = (this.ball.velocityX * ny - this.ball.velocityY * nx) * 0.2;
      
      // Sposta la palla fuori dal giocatore
      this.ball.x = player.x + nx * (this.ball.radius + player.radius);
      this.ball.y = player.y + ny * (this.ball.radius + player.radius);
      
      // Add collision effect
      const collisionIntensity = Math.sqrt(vx * vx + vy * vy) / 10;
      this.effectsManager.addCollisionEffect(
        this.ball.x,
        this.ball.y,
        collisionIntensity
      );
    }
  }
  
  draw() {
    // Usa il double buffering per il rendering
    this.offscreenCtx.drawImage(this.fieldCanvas, 0, 0);
    
    // Disegna la palla con effetti
    this.drawBall();
    
    // Disegna i giocatori con effetti
    this.drawPlayers();
    
    // Disegna il punteggio
    this.drawScore();
    
    // Update and draw effects
    this.effectsManager.update(this.deltaTime);
    this.effectsManager.draw();
    
    // Copia il buffer sullo schermo con compositing ottimizzato
    this.ctx.globalCompositeOperation = 'copy';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    this.ctx.globalCompositeOperation = 'source-over';
  }
  
  drawBall() {
    const ctx = this.offscreenCtx;
    ctx.save();
    ctx.translate(this.ball.x, this.ball.y);
    ctx.rotate(this.ball.rotation);
    
    // Ombra della palla
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Gradiente per effetto 3D
    const ballGradient = ctx.createRadialGradient(
      -2, -2, 0,
      0, 0, this.ball.radius
    );
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(1, '#e0e0e0');
    
    ctx.beginPath();
    ctx.arc(0, 0, this.ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ballGradient;
    ctx.fill();
    
    // Linea per visualizzare la rotazione
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(this.ball.radius, 0);
    ctx.stroke();
    
    ctx.restore();
  }
  
  drawPlayers() {
    const ctx = this.offscreenCtx;
    
    for (const player of this.players) {
      ctx.save();
      ctx.translate(player.x, player.y);
      
      // Ombra del giocatore
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Gradiente per effetto 3D
      const playerGradient = ctx.createRadialGradient(
        -3, -3, 0,
        0, 0, player.radius
      );
      playerGradient.addColorStop(0, player.color);
      playerGradient.addColorStop(1, this.darkenColor(player.color, 20));
      
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = playerGradient;
      ctx.fill();
      
      // Direzione del giocatore
      const angle = Math.atan2(player.velocityY, player.velocityX);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * player.radius,
        Math.sin(angle) * player.radius
      );
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  drawScore() {
    const ctx = this.offscreenCtx;
    ctx.save();
    
    // Ombra del testo
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.score.red} - ${this.score.blue}`, this.width / 2, 30);
    
    ctx.restore();
  }
  
  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }
  
  startGameLoop() {
    const gameLoop = (timestamp) => {
      // Calcola deltaTime
      if (!this.lastFrameTime) this.lastFrameTime = timestamp;
      this.deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      
      // Aggiorna e disegna
      this.updatePhysics();
      this.draw();
      
      // Richiedi il prossimo frame
      requestAnimationFrame(gameLoop);
    };
    
    requestAnimationFrame(gameLoop);
  }
  
  handleResize() {
    // Adatta il canvas al container mantenendo le proporzioni
    const containerWidth = this.container.clientWidth;
    const scale = Math.min(1, containerWidth / this.width);
    
    this.canvas.style.width = `${this.width * scale}px`;
    this.canvas.style.height = `${this.height * scale}px`;
  }
  
  addPlayer(id, team, x, y) {
    const player = {
      id,
      team,
      x,
      y,
      radius: 15,
      velocityX: 0,
      velocityY: 0,
      color: team === 'red' ? '#ff4040' : '#4040ff'
    };
    
    this.players.push(player);
    return player;
  }
  
  kickBall() {
    // Trova il giocatore più vicino alla palla
    let closestPlayer = null;
    let minDistance = Infinity;
    
    for (const player of this.players) {
      const distance = Math.sqrt(
        Math.pow(player.x - this.ball.x, 2) + 
        Math.pow(player.y - this.ball.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPlayer = player;
      }
    }
    
    // Se un giocatore è abbastanza vicino, calcio la palla
    if (closestPlayer && minDistance < closestPlayer.radius + this.ball.radius + 10) {
      // Calcola la direzione del calcio
      const dx = this.ball.x - closestPlayer.x;
      const dy = this.ball.y - closestPlayer.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Normalizza e applica la velocità
      const kickPower = 15;
      this.ball.velocityX = (dx / length) * kickPower;
      this.ball.velocityY = (dy / length) * kickPower;
      
      // Add kick effect
      const kickAngle = Math.atan2(dy, dx);
      this.effectsManager.addKickEffect(
        this.ball.x,
        this.ball.y,
        kickAngle,
        kickPower
      );
    }
  }
  
  update() {
    // Aggiorna la posizione della palla
    this.ball.x += this.ball.velocityX;
    this.ball.y += this.ball.velocityY;
    
    // Attrito
    this.ball.velocityX *= 0.98;
    this.ball.velocityY *= 0.98;
    
    // Collisione con i bordi orizzontali
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.y = this.ball.radius;
      this.ball.velocityY = -this.ball.velocityY * 0.8;
    } else if (this.ball.y + this.ball.radius > this.height) {
      this.ball.y = this.height - this.ball.radius;
      this.ball.velocityY = -this.ball.velocityY * 0.8;
    }
    
    // Collisione con i bordi verticali (escluse le porte)
    if (this.ball.x - this.ball.radius < 0) {
      // Verifica se è un gol o un rimbalzo
      if (this.ball.y > this.goalY && this.ball.y < this.goalY + this.goalHeight) {
        // Gol per la squadra blu
        this.score.blue++;
        this.effectsManager.addGoalEffect(this.ball.x, this.ball.y);
        this.resetBall();
        console.log('Gol per la squadra blu!');
      } else {
        this.ball.x = this.ball.radius;
        this.ball.velocityX = -this.ball.velocityX * 0.8;
      }
    } else if (this.ball.x + this.ball.radius > this.width) {
      // Verifica se è un gol o un rimbalzo
      if (this.ball.y > this.goalY && this.ball.y < this.goalY + this.goalHeight) {
        // Gol per la squadra rossa
        this.score.red++;
        this.effectsManager.addGoalEffect(this.ball.x, this.ball.y);
        this.resetBall();
        console.log('Gol per la squadra rossa!');
      } else {
        this.ball.x = this.width - this.ball.radius;
        this.ball.velocityX = -this.ball.velocityX * 0.8;
      }
    }
    
    // Collisione tra giocatori e palla
    for (const player of this.players) {
      const dx = this.ball.x - player.x;
      const dy = this.ball.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.ball.radius + player.radius) {
        // Calcola la nuova direzione della palla
        const angle = Math.atan2(dy, dx);
        const targetX = player.x + Math.cos(angle) * (this.ball.radius + player.radius);
        const targetY = player.y + Math.sin(angle) * (this.ball.radius + player.radius);
        
        // Sposta la palla fuori dal giocatore
        this.ball.x = targetX;
        this.ball.y = targetY;
        
        // Trasferisci parte della velocità del giocatore alla palla
        this.ball.velocityX += player.velocityX * 0.5;
        this.ball.velocityY += player.velocityY * 0.5;
      }
    }
  }
  
  resetBall() {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.velocityX = 0;
    this.ball.velocityY = 0;
  }
  
  // Add method to set weather
  setWeather(type, intensity) {
    this.weather = type;
    this.effectsManager.setWeather(type, intensity);
  }
}

// Funzione di inizializzazione
function initHaxballGame() {
  // Crea il container se non esiste
  let container = document.getElementById('haxball-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'haxball-container';
    container.style.width = '100%';
    container.style.maxWidth = '800px';
    container.style.margin = '0 auto';
    container.style.display = 'none'; // Nascosto inizialmente
    document.body.appendChild(container);
  }
  
  // Inizializza il campo
  const field = new HaxballField('haxball-container');
  
  // Esponi l'API per il controllo del gioco
  window.haxballGame = {
    field,
    showGame: () => {
      container.style.display = 'block';
      field.handleResize();
    },
    hideGame: () => {
      container.style.display = 'none';
    },
    addPlayer: (id, team, x, y) => field.addPlayer(id, team, x, y),
    resetBall: () => field.resetBall(),
    setWeather: (type, intensity) => field.setWeather(type, intensity)
  };
  
  return window.haxballGame;
}

// Inizializza il gioco quando il documento è pronto
document.addEventListener('DOMContentLoaded', initHaxballGame);
