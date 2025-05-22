// Implementazione avanzata del campo di gioco con animazioni migliorate, effetti visivi e replay
class EnhancedHaxballField extends ModernHaxballField {
  constructor(container, options = {}) {
    // Aggiungi opzioni per gli effetti visivi e audio
    options.enableSoundEffects = options.enableSoundEffects !== undefined ? options.enableSoundEffects : true;
    options.enableParticleEffects = options.enableParticleEffects !== undefined ? options.enableParticleEffects : true;
    options.enableReplay = options.enableReplay !== undefined ? options.enableReplay : true;
    options.replayDuration = options.replayDuration || 5; // Durata del replay in secondi
    
    super(container, options);
    
    // Sistema di audio
    this.audioEnabled = this.options.enableSoundEffects;
    this.audioContext = null;
    this.sounds = {};
    
    // Sistema di particelle
    this.particlesEnabled = this.options.enableParticleEffects;
    this.particles = [];
    this.maxParticles = 100;
    
    // Sistema di replay
    this.replayEnabled = this.options.enableReplay;
    this.replayBuffer = [];
    this.replayMaxFrames = this.options.replayDuration * 60; // 60 fps per la durata specificata
    this.isReplayMode = false;
    this.replayCurrentFrame = 0;
    
    // WebGL rendering
    this.useWebGL = options.useWebGL !== undefined ? options.useWebGL : true;
    this.webglContext = null;
    this.webglProgram = null;
    this.particleBuffer = null;
    this.vertexBuffer = null;
    
    // Object pooling for particles
    this.particlePool = [];
    this.maxParticlePool = 1000;
    
    // Inizializza i sistemi aggiuntivi
    if (this.audioEnabled) this.initAudio();
    
    // Aggiungi elementi UI per il replay
    if (this.replayEnabled) this.initReplayUI();
    
    // Initialize WebGL if supported
    if (this.useWebGL) {
      this.initWebGL();
    }
  }
  
  // Sovrascrive il metodo init del parent per aggiungere elementi visivi migliorati
  init() {
    super.init();
    
    // Aggiungi ombre dinamiche per la palla e i giocatori
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.className = 'shadow-layer';
    this.shadowCanvas.width = this.options.fieldWidth;
    this.shadowCanvas.height = this.options.fieldHeight;
    this.shadowCanvas.style.position = 'absolute';
    this.shadowCanvas.style.top = `${this.options.borderWidth}px`;
    this.shadowCanvas.style.left = `${this.options.borderWidth}px`;
    this.shadowCanvas.style.pointerEvents = 'none';
    this.shadowCanvas.style.zIndex = '2';
    this.shadowCtx = this.shadowCanvas.getContext('2d');
    
    // Aggiungi canvas per effetti particellari
    this.particleCanvas = document.createElement('canvas');
    this.particleCanvas.className = 'particle-layer';
    this.particleCanvas.width = this.options.fieldWidth + (this.options.borderWidth * 2);
    this.particleCanvas.height = this.options.fieldHeight + (this.options.borderWidth * 2);
    this.particleCanvas.style.position = 'absolute';
    this.particleCanvas.style.top = '0';
    this.particleCanvas.style.left = '0';
    this.particleCanvas.style.pointerEvents = 'none';
    this.particleCanvas.style.zIndex = '15';
    this.particleCtx = this.particleCanvas.getContext('2d');
    
    // Aggiungi indicatore di possesso palla
    this.possessionIndicator = document.createElement('div');
    this.possessionIndicator.className = 'possession-indicator';
    this.possessionIndicator.style.position = 'absolute';
    this.possessionIndicator.style.top = '-30px';
    this.possessionIndicator.style.left = '50%';
    this.possessionIndicator.style.transform = 'translateX(-50%)';
    this.possessionIndicator.style.padding = '5px 10px';
    this.possessionIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.possessionIndicator.style.color = 'white';
    this.possessionIndicator.style.borderRadius = '5px';
    this.possessionIndicator.style.fontSize = '12px';
    this.possessionIndicator.style.fontWeight = 'bold';
    this.possessionIndicator.style.opacity = '0';
    this.possessionIndicator.style.transition = 'opacity 0.3s ease';
    
    // Aggiungi gli elementi al DOM
    this.fieldContainer.appendChild(this.shadowCanvas);
    this.fieldContainer.appendChild(this.particleCanvas);
    this.fieldContainer.appendChild(this.possessionIndicator);
    
    // Aggiungi riflessi sul campo
    this.addFieldReflections();
  }
  
  // Aggiunge riflessi dinamici sul campo
  addFieldReflections() {
    const reflections = document.createElement('div');
    reflections.className = 'field-reflections';
    reflections.style.position = 'absolute';
    reflections.style.top = '0';
    reflections.style.left = '0';
    reflections.style.width = '100%';
    reflections.style.height = '100%';
    reflections.style.background = 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)';
    reflections.style.pointerEvents = 'none';
    reflections.style.zIndex = '3';
    
    this.field.appendChild(reflections);
    
    // Aggiungi animazione per i riflessi
    this.animateReflections(reflections);
  }
  
  // Anima i riflessi sul campo
  animateReflections(element) {
    let phase = 0;
    
    const animate = () => {
      phase += 0.005;
      const x = 50 + Math.sin(phase) * 10;
      const y = 50 + Math.cos(phase) * 10;
      element.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)`;
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  // Inizializza il sistema audio
  initAudio() {
    try {
      // Crea il contesto audio
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      
      // Carica gli effetti sonori
      this.loadSounds();
      
      console.log('Sistema audio inizializzato con successo');
    } catch (e) {
      console.error('Impossibile inizializzare il sistema audio:', e);
      this.audioEnabled = false;
    }
  }
  
  // Carica gli effetti sonori
  loadSounds() {
    const soundFiles = {
      kick: '/assets/sounds/kick.mp3',
      bounce: '/assets/sounds/bounce.mp3',
      goal: '/assets/sounds/goal.mp3',
      whistle: '/assets/sounds/whistle.mp3'
    };
    
    // Crea directory per i suoni se non esiste
    const soundsDir = '/home/ubuntu/haxball_project/haxball-clone/public/assets/sounds';
    
    // Implementazione di base per simulare i suoni
    this.sounds = {
      kick: { play: () => this.playSound('kick') },
      bounce: { play: () => this.playSound('bounce') },
      goal: { play: () => this.playSound('goal') },
      whistle: { play: () => this.playSound('whistle') }
    };
  }
  
  // Riproduce un effetto sonoro
  playSound(soundName) {
    if (!this.audioEnabled) return;
    
    // Simulazione della riproduzione del suono
    console.log(`Riproduzione suono: ${soundName}`);
    
    // In una implementazione reale, qui verrebbe riprodotto il suono
    // this.sounds[soundName].currentTime = 0;
    // this.sounds[soundName].play();
  }
  
  // Inizializza l'interfaccia per il replay
  initReplayUI() {
    this.replayContainer = document.createElement('div');
    this.replayContainer.className = 'replay-container';
    this.replayContainer.style.position = 'absolute';
    this.replayContainer.style.top = '50%';
    this.replayContainer.style.left = '50%';
    this.replayContainer.style.transform = 'translate(-50%, -50%)';
    this.replayContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.replayContainer.style.color = 'white';
    this.replayContainer.style.padding = '20px';
    this.replayContainer.style.borderRadius = '10px';
    this.replayContainer.style.zIndex = '100';
    this.replayContainer.style.display = 'none';
    this.replayContainer.style.textAlign = 'center';
    this.replayContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    
    const replayTitle = document.createElement('h3');
    replayTitle.textContent = 'REPLAY GOL';
    replayTitle.style.margin = '0 0 15px 0';
    replayTitle.style.color = '#ffcc00';
    
    const replayControls = document.createElement('div');
    replayControls.className = 'replay-controls';
    replayControls.style.display = 'flex';
    replayControls.style.justifyContent = 'center';
    replayControls.style.marginTop = '15px';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Chiudi';
    closeButton.style.backgroundColor = '#ff4040';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.padding = '8px 15px';
    closeButton.style.marginLeft = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => this.stopReplay();
    
    replayControls.appendChild(closeButton);
    
    this.replayContainer.appendChild(replayTitle);
    this.replayContainer.appendChild(replayControls);
    
    this.fieldContainer.appendChild(this.replayContainer);
  }
  
  // Sovrascrive il metodo createBall per aggiungere effetti visivi
  createBall() {
    super.createBall();
    
    // Aggiungi ombra alla palla
    const ballShadow = document.createElement('div');
    ballShadow.className = 'ball-shadow';
    ballShadow.style.position = 'absolute';
    ballShadow.style.width = `${this.options.ballRadius * 2}px`;
    ballShadow.style.height = `${this.options.ballRadius * 0.5}px`;
    ballShadow.style.borderRadius = '50%';
    ballShadow.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    ballShadow.style.transform = 'translate(-50%, -50%)';
    ballShadow.style.zIndex = '1';
    
    this.field.appendChild(ballShadow);
    
    // Salva il riferimento all'ombra
    this.ball.shadow = ballShadow;
    
    // Aggiungi scia alla palla
    this.ball.trail = [];
    this.ball.maxTrail = 5;
  }
  
  // Sovrascrive il metodo addPlayer per aggiungere effetti visivi
  addPlayer(id, team, x, y) {
    const player = super.addPlayer(id, team, x, y);
    
    // Aggiungi ombra al giocatore
    const playerShadow = document.createElement('div');
    playerShadow.className = 'player-shadow';
    playerShadow.style.position = 'absolute';
    playerShadow.style.width = `${this.options.playerRadius * 2}px`;
    playerShadow.style.height = `${this.options.playerRadius * 0.5}px`;
    playerShadow.style.borderRadius = '50%';
    playerShadow.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    playerShadow.style.transform = 'translate(-50%, -50%)';
    playerShadow.style.zIndex = '1';
    
    this.field.appendChild(playerShadow);
    
    // Salva il riferimento all'ombra
    player.shadow = playerShadow;
    
    // Aggiungi indicatore di direzione
    const directionIndicator = document.createElement('div');
    directionIndicator.className = 'direction-indicator';
    directionIndicator.style.position = 'absolute';
    directionIndicator.style.width = '10px';
    directionIndicator.style.height = '2px';
    directionIndicator.style.backgroundColor = team === 'red' ? '#ff6b6b' : '#6b6bff';
    directionIndicator.style.transformOrigin = '0 50%';
    directionIndicator.style.zIndex = '6';
    
    player.element.appendChild(directionIndicator);
    player.directionIndicator = directionIndicator;
    
    return player;
  }
  
  // Sovrascrive il metodo kickBall per aggiungere effetti visivi e sonori
  kickBall(player) {
    // Calcola la distanza tra il giocatore e la palla
    const dx = this.ball.position.x - player.position.x;
    const dy = this.ball.position.y - player.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Verifica se il giocatore è abbastanza vicino alla palla per calciarla
    const kickDistance = player.radius + this.ball.radius + 5;
    
    if (distance <= kickDistance) {
      // Calcola la direzione del calcio
      const kickPower = 15; // Aumentato per un effetto più dinamico
      const directionX = dx / distance;
      const directionY = dy / distance;
      
      // Applica la velocità alla palla
      this.ball.velocity.x = directionX * kickPower;
      this.ball.velocity.y = directionY * kickPower;
      
      // Effetto visivo del calcio
      this.createEnhancedKickEffect(this.ball.position.x, this.ball.position.y, player.team);
      
      // Effetto sonoro del calcio
      if (this.audioEnabled) {
        this.sounds.kick.play();
      }
      
      // Aggiorna l'indicatore di possesso
      this.updatePossessionIndicator(player.team);
      
      // Aggiungi vibrazione al dispositivo se supportata
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }
  
  // Crea un effetto di calcio migliorato con particelle
  createEnhancedKickEffect(x, y, team) {
    // Effetto base
    super.createKickEffect(x, y);
    
    // Aggiungi particelle se abilitate
    if (this.particlesEnabled) {
      const color = team === 'red' ? '#ff6b6b' : '#6b6bff';
      this.createParticles(x, y, 15, color);
    }
    
    // Aggiungi onda d'urto
    const shockwave = document.createElement('div');
    shockwave.className = 'shockwave';
    shockwave.style.position = 'absolute';
    shockwave.style.left = `${x}px`;
    shockwave.style.top = `${y}px`;
    shockwave.style.width = '10px';
    shockwave.style.height = '10px';
    shockwave.style.borderRadius = '50%';
    shockwave.style.border = `2px solid ${team === 'red' ? '#ff6b6b' : '#6b6bff'}`;
    shockwave.style.transform = 'translate(-50%, -50%) scale(0)';
    shockwave.style.opacity = '1';
    shockwave.style.transition = 'all 0.5s ease-out';
    shockwave.style.zIndex = '4';
    
    this.field.appendChild(shockwave);
    
    // Anima l'onda d'urto
    setTimeout(() => {
      shockwave.style.transform = 'translate(-50%, -50%) scale(5)';
      shockwave.style.opacity = '0';
    }, 10);
    
    // Rimuovi l'onda d'urto dopo l'animazione
    setTimeout(() => {
      this.field.removeChild(shockwave);
    }, 500);
  }
  
  // Initialize WebGL context and shaders
  initWebGL() {
    try {
      const canvas = this.particleCanvas;
      this.webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!this.webglContext) {
        console.warn('WebGL not supported, falling back to Canvas2D');
        this.useWebGL = false;
        return;
      }

      // Create shader program
      const vertexShader = this.createShader(this.webglContext.VERTEX_SHADER, `
        attribute vec2 a_position;
        attribute vec4 a_color;
        varying vec4 v_color;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_color = a_color;
        }
      `);

      const fragmentShader = this.createShader(this.webglContext.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec4 v_color;
        void main() {
          gl_FragColor = v_color;
        }
      `);

      this.webglProgram = this.createProgram(vertexShader, fragmentShader);
      
      // Create buffers
      this.particleBuffer = this.webglContext.createBuffer();
      this.vertexBuffer = this.webglContext.createBuffer();
      
      console.log('WebGL initialized successfully');
    } catch (e) {
      console.error('Failed to initialize WebGL:', e);
      this.useWebGL = false;
    }
  }

  // Create and compile shader
  createShader(type, source) {
    const shader = this.webglContext.createShader(type);
    this.webglContext.shaderSource(shader, source);
    this.webglContext.compileShader(shader);
    
    if (!this.webglContext.getShaderParameter(shader, this.webglContext.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.webglContext.getShaderInfoLog(shader));
      this.webglContext.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  // Create shader program
  createProgram(vertexShader, fragmentShader) {
    const program = this.webglContext.createProgram();
    this.webglContext.attachShader(program, vertexShader);
    this.webglContext.attachShader(program, fragmentShader);
    this.webglContext.linkProgram(program);
    
    if (!this.webglContext.getProgramParameter(program, this.webglContext.LINK_STATUS)) {
      console.error('Program linking error:', this.webglContext.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  // Get particle from pool or create new one
  getParticle() {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop();
    }
    
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      color: [1, 1, 1, 1],
      size: 1,
      active: false
    };
  }

  // Return particle to pool
  returnParticle(particle) {
    if (this.particlePool.length < this.maxParticlePool) {
      particle.active = false;
      this.particlePool.push(particle);
    }
  }

  // Create particles with object pooling
  createParticles(x, y, count, color) {
    if (!this.particlesEnabled) return;
    
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      
      const particle = this.getParticle();
      particle.x = x;
      particle.y = y;
      particle.vx = (Math.random() - 0.5) * 5;
      particle.vy = (Math.random() - 0.5) * 5;
      particle.life = 0;
      particle.maxLife = 1 + Math.random();
      particle.color = color || [1, 1, 1, 1];
      particle.size = 2 + Math.random() * 3;
      particle.active = true;
      
      this.particles.push(particle);
    }
  }

  // Update particles with WebGL rendering
  updateParticles(deltaTime) {
    if (!this.particlesEnabled) return;
    
    // Update particle positions and life
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life += deltaTime;
      
      if (particle.life >= particle.maxLife) {
        this.returnParticle(particle);
        this.particles.splice(i, 1);
      }
    }
    
    // Render particles
    if (this.useWebGL && this.particles.length > 0) {
      this.renderParticlesWebGL();
    } else {
      this.renderParticlesCanvas();
    }
  }

  // Render particles using WebGL
  renderParticlesWebGL() {
    const gl = this.webglContext;
    const program = this.webglProgram;
    
    gl.useProgram(program);
    
    // Prepare particle data
    const vertices = new Float32Array(this.particles.length * 6); // 2 vertices per particle
    const colors = new Float32Array(this.particles.length * 8); // 4 color components per vertex
    
    let vIndex = 0;
    let cIndex = 0;
    
    for (const particle of this.particles) {
      const size = particle.size;
      const alpha = 1 - (particle.life / particle.maxLife);
      
      // Add vertices for particle quad
      vertices[vIndex++] = particle.x - size;
      vertices[vIndex++] = particle.y - size;
      vertices[vIndex++] = particle.x + size;
      vertices[vIndex++] = particle.y - size;
      vertices[vIndex++] = particle.x - size;
      vertices[vIndex++] = particle.y + size;
      
      // Add colors with alpha
      for (let i = 0; i < 3; i++) {
        colors[cIndex++] = particle.color[0];
        colors[cIndex++] = particle.color[1];
        colors[cIndex++] = particle.color[2];
        colors[cIndex++] = alpha;
      }
    }
    
    // Update buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    
    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const colorLocation = gl.getAttribLocation(program, 'a_color');
    
    gl.enableVertexAttribArray(positionLocation);
    gl.enableVertexAttribArray(colorLocation);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
    
    // Draw particles
    gl.drawArrays(gl.TRIANGLES, 0, this.particles.length * 3);
  }

  // Render particles using Canvas2D (fallback)
  renderParticlesCanvas() {
    const ctx = this.particleCtx;
    ctx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
    
    for (const particle of this.particles) {
      const alpha = 1 - (particle.life / particle.maxLife);
      ctx.fillStyle = `rgba(${particle.color[0] * 255}, ${particle.color[1] * 255}, ${particle.color[2] * 255}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Aggiorna l'indicatore di possesso palla
  updatePossessionIndicator(team) {
    this.possessionIndicator.textContent = `Possesso: ${team === 'red' ? 'Rosso' : 'Blu'}`;
    this.possessionIndicator.style.color = team === 'red' ? '#ff6b6b' : '#6b6bff';
    this.possessionIndicator.style.opacity = '1';
    
    // Nascondi l'indicatore dopo 2 secondi
    setTimeout(() => {
      this.possessionIndicator.style.opacity = '0';
    }, 2000);
  }
  
  // Gestisce un gol
  handleGoal(team) {
    // Effetto visivo del gol
    this.createGoalEffect(team);
    
    // Effetto sonoro del gol
    if (this.audioEnabled) {
      this.sounds.goal.play();
    }
    
    // Avvia il replay se abilitato
    if (this.replayEnabled) {
      this.startReplay();
    }
  }
  
  // Crea un effetto visivo per il gol
  createGoalEffect(team) {
    // Crea un overlay per l'effetto gol
    const goalOverlay = document.createElement('div');
    goalOverlay.className = 'goal-overlay';
    goalOverlay.style.position = 'absolute';
    goalOverlay.style.top = '0';
    goalOverlay.style.left = '0';
    goalOverlay.style.width = '100%';
    goalOverlay.style.height = '100%';
    goalOverlay.style.backgroundColor = team === 'red' ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
    goalOverlay.style.zIndex = '50';
    goalOverlay.style.display = 'flex';
    goalOverlay.style.justifyContent = 'center';
    goalOverlay.style.alignItems = 'center';
    goalOverlay.style.opacity = '0';
    goalOverlay.style.transition = 'opacity 0.5s ease';
    
    const goalText = document.createElement('div');
    goalText.className = 'goal-text';
    goalText.textContent = 'GOL!';
    goalText.style.color = 'white';
    goalText.style.fontSize = '80px';
    goalText.style.fontWeight = 'bold';
    goalText.style.textShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
    goalText.style.transform = 'scale(0)';
    goalText.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    goalOverlay.appendChild(goalText);
    this.fieldContainer.appendChild(goalOverlay);
    
    // Anima l'overlay
    setTimeout(() => {
      goalOverlay.style.opacity = '1';
      goalText.style.transform = 'scale(1)';
    }, 10);
    
    // Rimuovi l'overlay dopo l'animazione
    setTimeout(() => {
      goalText.style.transform = 'scale(0)';
      goalOverlay.style.opacity = '0';
      
      setTimeout(() => {
        this.fieldContainer.removeChild(goalOverlay);
      }, 500);
    }, 2000);
  }
  
  // Avvia il replay
  startReplay() {
    if (!this.replayEnabled || this.replayBuffer.length === 0) return;
    
    this.isReplayMode = true;
    this.replayCurrentFrame = 0;
    this.replayContainer.style.display = 'block';
    
    // Nascondi gli elementi di gioco normali
    this.field.style.opacity = '0.5';
    
    // Avvia il replay
    this.playReplay();
  }
  
  // Riproduce il replay frame per frame
  playReplay() {
    if (!this.isReplayMode) return;
    
    if (this.replayCurrentFrame < this.replayBuffer.length) {
      const frame = this.replayBuffer[this.replayCurrentFrame];
      
      // Aggiorna le posizioni degli oggetti in base al frame
      this.ball.position = { ...frame.ball.position };
      this.updateBallPosition();
      
      frame.players.forEach((playerData, index) => {
        if (index < this.players.length) {
          this.players[index].position = { ...playerData.position };
          this.updatePlayerPosition(this.players[index]);
        }
      });
      
      this.replayCurrentFrame++;
      requestAnimationFrame(() => this.playReplay());
    } else {
      // Fine del replay
      setTimeout(() => this.stopReplay(), 1000);
    }
  }
  
  // Ferma il replay
  stopReplay() {
    this.isReplayMode = false;
    this.replayContainer.style.display = 'none';
    
    // Ripristina gli elementi di gioco
    this.field.style.opacity = '1';
  }
  
  // Registra un frame per il replay
  recordReplayFrame() {
    if (!this.replayEnabled || this.isReplayMode) return;
    
    // Crea un frame con le posizioni attuali
    const frame = {
      ball: {
        position: { ...this.ball.position },
        velocity: { ...this.ball.velocity }
      },
      players: this.players.map(player => ({
        position: { ...player.position },
        velocity: { ...player.velocity }
      }))
    };
    
    // Aggiungi il frame al buffer
    this.replayBuffer.push(frame);
    
    // Limita la dimensione del buffer
    if (this.replayBuffer.length > this.replayMaxFrames) {
      this.replayBuffer.shift();
    }
  }
  
  // Sovrascrive il metodo update per aggiungere effetti visivi e registrazione replay
  update(deltaTime) {
    if (this.isReplayMode) return;
    
    super.update(deltaTime);
    
    // Aggiorna le particelle
    this.updateParticles(deltaTime);
    
    // Aggiorna le ombre
    this.updateShadows();
    
    // Aggiorna la scia della palla
    this.updateBallTrail();
    
    // Registra un frame per il replay
    this.recordReplayFrame();
  }
  
  // Aggiorna le ombre degli oggetti
  updateShadows() {
    // Aggiorna l'ombra della palla
    if (this.ball && this.ball.shadow) {
      this.ball.shadow.style.left = `${this.ball.position.x}px`;
      this.ball.shadow.style.top = `${this.ball.position.y + this.ball.radius * 0.8}px`;
    }
    
    // Aggiorna le ombre dei giocatori
    this.players.forEach(player => {
      if (player.shadow) {
        player.shadow.style.left = `${player.position.x}px`;
        player.shadow.style.top = `${player.position.y + player.radius * 0.8}px`;
      }
      
      // Aggiorna l'indicatore di direzione
      if (player.directionIndicator) {
        const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
        const angle = Math.atan2(player.velocity.y, player.velocity.x);
        
        // Mostra l'indicatore solo se il giocatore si sta muovendo
        if (speed > 0.5) {
          player.directionIndicator.style.display = 'block';
          player.directionIndicator.style.width = `${Math.min(10, speed * 2)}px`;
          player.directionIndicator.style.transform = `rotate(${angle}rad)`;
        } else {
          player.directionIndicator.style.display = 'none';
        }
      }
    });
  }
  
  // Aggiorna la scia della palla
  updateBallTrail() {
    // Aggiungi la posizione corrente alla scia
    this.ball.trail.push({
      x: this.ball.position.x,
      y: this.ball.position.y,
      time: performance.now()
    });
    
    // Limita la lunghezza della scia
    if (this.ball.trail.length > this.ball.maxTrail) {
      this.ball.trail.shift();
    }
    
    // Disegna la scia
    this.drawBallTrail();
  }
  
  // Disegna la scia della palla
  drawBallTrail() {
    if (!this.ball.trail.length) return;
    
    // Pulisci il canvas delle particelle
    this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
    
    // Disegna la scia
    const currentTime = performance.now();
    const trailLength = this.ball.trail.length;
    
    if (trailLength < 2) return;
    
    this.particleCtx.beginPath();
    this.particleCtx.moveTo(
      this.ball.trail[0].x + this.options.borderWidth,
      this.ball.trail[0].y + this.options.borderWidth
    );
    
    for (let i = 1; i < trailLength; i++) {
      const point = this.ball.trail[i];
      this.particleCtx.lineTo(
        point.x + this.options.borderWidth,
        point.y + this.options.borderWidth
      );
    }
    
    // Crea un gradiente per la scia
    const gradient = this.particleCtx.createLinearGradient(
      this.ball.trail[0].x + this.options.borderWidth,
      this.ball.trail[0].y + this.options.borderWidth,
      this.ball.trail[trailLength - 1].x + this.options.borderWidth,
      this.ball.trail[trailLength - 1].y + this.options.borderWidth
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
    
    this.particleCtx.strokeStyle = gradient;
    this.particleCtx.lineWidth = this.ball.radius * 2;
    this.particleCtx.lineCap = 'round';
    this.particleCtx.lineJoin = 'round';
    this.particleCtx.stroke();
  }
  
  // Sovrascrive il metodo handleCollisions per aggiungere effetti sonori
  handleCollisions() {
    super.handleCollisions();
    
    // Aggiungi effetti sonori per le collisioni
    // Questo è un esempio semplificato, in una implementazione reale
    // si dovrebbero rilevare le collisioni effettive
    
    // Esempio: rileva collisione con le pareti
    if (this.ball.position.x <= this.boundaries.ball.left || 
        this.ball.position.x >= this.boundaries.ball.right ||
        this.ball.position.y <= this.boundaries.ball.top || 
        this.ball.position.y >= this.boundaries.ball.bottom) {
      
      if (this.audioEnabled) {
        this.sounds.bounce.play();
      }
    }
    
    // Esempio: rileva gol (semplificato)
    if (this.ball.position.x <= 0 || this.ball.position.x >= this.options.fieldWidth) {
      const team = this.ball.position.x <= 0 ? 'blue' : 'red';
      this.handleGoal(team);
    }
  }
  
  // Sovrascrive il metodo gameLoop per supportare il replay
  gameLoop() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Converti in secondi
    this.lastTime = currentTime;
    
    // Aggiorna la fisica solo se non siamo in modalità replay
    if (!this.isReplayMode) {
      this.update(deltaTime);
    }
    
    // Renderizza gli oggetti
    this.render();
    
    // Continua il loop
    requestAnimationFrame(() => this.gameLoop());
  }

  // Clean up resources
  destroy() {
    // Clean up WebGL resources
    if (this.useWebGL) {
      this.webglContext.deleteProgram(this.webglProgram);
      this.webglContext.deleteBuffer(this.particleBuffer);
      this.webglContext.deleteBuffer(this.vertexBuffer);
    }
    
    // Clear particle pool
    this.particlePool = [];
    this.particles = [];
    
    // Call parent destroy
    super.destroy();
  }
}
