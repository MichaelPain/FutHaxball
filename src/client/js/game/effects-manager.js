// Effects manager for HaxBall game
// Handles weather effects and particle systems

class EffectsManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.effects = new Set();
    this.particles = new Set();
    
    // Weather settings
    this.weather = {
      type: 'none', // none, rain, snow
      intensity: 0.5,
      wind: { x: 0, y: 0 }
    };
    
    // Particle settings
    this.maxParticles = 1000;
    this.particlePool = [];
    
    // Initialize particle pool
    this.initParticlePool();
  }
  
  initParticlePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePool.push({
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        size: 0,
        color: '',
        alpha: 1,
        life: 0,
        maxLife: 0,
        type: 'none',
        active: false
      });
    }
  }
  
  getParticle() {
    // Get inactive particle from pool
    for (let particle of this.particlePool) {
      if (!particle.active) {
        particle.active = true;
        return particle;
      }
    }
    return null; // Pool exhausted
  }
  
  setWeather(type, intensity = 0.5) {
    this.weather.type = type;
    this.weather.intensity = Math.max(0, Math.min(1, intensity));
    
    // Set wind based on weather type
    switch (type) {
      case 'rain':
        this.weather.wind = { x: -2, y: 7 };
        break;
      case 'snow':
        this.weather.wind = { x: -1, y: 1 };
        break;
      default:
        this.weather.wind = { x: 0, y: 0 };
    }
  }
  
  addKickEffect(x, y, direction, power) {
    const particleCount = Math.floor(power * 5);
    const spread = Math.PI / 4;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticle();
      if (!particle) continue;
      
      const angle = direction + (Math.random() - 0.5) * spread;
      const speed = power * (0.5 + Math.random() * 0.5);
      
      particle.x = x;
      particle.y = y;
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.size = 2 + Math.random() * 2;
      particle.color = '#ffffff';
      particle.alpha = 1;
      particle.life = 0;
      particle.maxLife = 20 + Math.random() * 10;
      particle.type = 'kick';
    }
  }
  
  addCollisionEffect(x, y, intensity) {
    const particleCount = Math.floor(intensity * 8);
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticle();
      if (!particle) continue;
      
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 2;
      
      particle.x = x;
      particle.y = y;
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.size = 1 + Math.random() * 2;
      particle.color = '#ffffff';
      particle.alpha = 1;
      particle.life = 0;
      particle.maxLife = 15 + Math.random() * 10;
      particle.type = 'collision';
    }
  }
  
  addGoalEffect(x, y) {
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = this.getParticle();
      if (!particle) continue;
      
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 3 + Math.random() * 3;
      
      particle.x = x;
      particle.y = y;
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.size = 2 + Math.random() * 3;
      particle.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
      particle.alpha = 1;
      particle.life = 0;
      particle.maxLife = 30 + Math.random() * 20;
      particle.type = 'goal';
    }
  }
  
  update(deltaTime) {
    // Update weather particles
    this.updateWeather(deltaTime);
    
    // Update effect particles
    this.updateParticles(deltaTime);
  }
  
  updateWeather(deltaTime) {
    if (this.weather.type === 'none') return;
    
    const particlesPerFrame = this.weather.type === 'rain' ? 2 : 1;
    const particlesToAdd = Math.floor(particlesPerFrame * this.weather.intensity * deltaTime);
    
    for (let i = 0; i < particlesToAdd; i++) {
      const particle = this.getParticle();
      if (!particle) continue;
      
      // Initialize weather particle
      particle.x = Math.random() * this.canvas.width;
      particle.y = -10;
      particle.type = this.weather.type;
      
      if (this.weather.type === 'rain') {
        particle.velocityX = this.weather.wind.x;
        particle.velocityY = this.weather.wind.y;
        particle.size = 2;
        particle.color = 'rgba(180, 200, 255, 0.5)';
        particle.maxLife = 100;
      } else if (this.weather.type === 'snow') {
        particle.velocityX = this.weather.wind.x * (0.5 + Math.random());
        particle.velocityY = this.weather.wind.y;
        particle.size = 2 + Math.random() * 2;
        particle.color = 'rgba(255, 255, 255, 0.8)';
        particle.maxLife = 200;
      }
      
      particle.life = 0;
      particle.alpha = 1;
    }
  }
  
  updateParticles(deltaTime) {
    for (let particle of this.particlePool) {
      if (!particle.active) continue;
      
      // Update particle position
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
      
      // Update particle life
      particle.life += deltaTime;
      if (particle.life >= particle.maxLife) {
        particle.active = false;
        continue;
      }
      
      // Update particle properties based on type
      switch (particle.type) {
        case 'rain':
          // Apply wind force
          particle.velocityX += this.weather.wind.x * 0.1 * deltaTime;
          particle.alpha = 0.5;
          break;
          
        case 'snow':
          // Add some wobble
          particle.x += Math.sin(particle.life * 0.1) * 0.5 * deltaTime;
          particle.alpha = 0.8;
          break;
          
        case 'kick':
        case 'collision':
        case 'goal':
          // Fade out
          particle.alpha = 1 - (particle.life / particle.maxLife);
          // Add gravity
          particle.velocityY += 0.1 * deltaTime;
          break;
      }
      
      // Check bounds
      if (particle.y > this.canvas.height + 10 ||
          particle.x < -10 || particle.x > this.canvas.width + 10) {
        particle.active = false;
      }
    }
  }
  
  draw() {
    this.ctx.save();
    
    // Draw active particles
    for (let particle of this.particlePool) {
      if (!particle.active) continue;
      
      this.ctx.globalAlpha = particle.alpha;
      
      switch (particle.type) {
        case 'rain':
          // Draw rain drop
          this.ctx.strokeStyle = particle.color;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(
            particle.x + particle.velocityX,
            particle.y + particle.velocityY
          );
          this.ctx.stroke();
          break;
          
        case 'snow':
          // Draw snowflake
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
          
        case 'kick':
        case 'collision':
          // Draw particle
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
          
        case 'goal':
          // Draw colorful particle
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }
    }
    
    this.ctx.restore();
  }
}

export default EffectsManager; 