// WeatherSystem.js - Sistema di effetti meteorologici per HaxBall

export class WeatherSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Configurazione effetti
        this.effects = {
            rain: {
                enabled: false,
                particles: [],
                color: 'rgba(174, 194, 224, 0.5)',
                speed: 15,
                density: 0.3,
                length: 20,
                wind: { x: -2, y: 7 },
                sound: new Audio('/assets/sounds/rain.mp3'),
                impactEffect: true
            },
            snow: {
                enabled: false,
                particles: [],
                color: 'rgba(255, 255, 255, 0.8)',
                speed: 2,
                density: 0.2,
                size: 2,
                wind: { x: -1, y: 1 },
                sound: new Audio('/assets/sounds/wind.mp3'),
                accumulation: true
            },
            fog: {
                enabled: false,
                opacity: 0.3,
                color: 'rgba(200, 200, 200, 0.3)',
                density: 0.5,
                movement: { x: 0.2, y: 0.1 },
                sound: new Audio('/assets/sounds/fog.mp3'),
                depthEffect: true
            },
            storm: {
                enabled: false,
                particles: [],
                color: 'rgba(100, 100, 150, 0.6)',
                speed: 25,
                density: 0.4,
                length: 30,
                wind: { x: -5, y: 10 },
                sound: new Audio('/assets/sounds/thunder.mp3'),
                lightning: true,
                thunderInterval: 5000
            }
        };
        
        // Performance optimization
        this.particlePool = [];
        this.maxParticles = 2000;
        this.lastUpdate = 0;
        this.frameCount = 0;
        this.particleUpdateInterval = 2; // Update particles every 2 frames
        
        // Initialize particle pool
        this.initParticlePool();
        
        // Initialize effects
        this.initEffects();
    }
    
    initParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push({
                x: 0,
                y: 0,
                speed: 0,
                size: 0,
                opacity: 0,
                life: 0,
                maxLife: 0,
                velocityX: 0,
                velocityY: 0,
                active: false
            });
        }
    }
    
    getParticle() {
        return this.particlePool.find(p => !p.active);
    }
    
    initEffects() {
        // Initialize particle arrays for each effect
        Object.keys(this.effects).forEach(effect => {
            if (this.effects[effect].particles) {
                this.effects[effect].particles = [];
            }
        });
        
        // Set up audio
        Object.values(this.effects).forEach(effect => {
            if (effect.sound) {
                effect.sound.loop = true;
                effect.sound.volume = 0.3;
            }
        });
    }
    
    setWeather(type, enabled, intensity = 1.0) {
        // Stop all weather effects first
        this.stopAllWeather();
        
        if (!enabled) return;
        
        const effect = this.effects[type];
        if (!effect) return;
        
        effect.enabled = true;
        effect.intensity = Math.max(0, Math.min(1, intensity));
        
        // Start weather-specific audio
        if (effect.sound) {
            effect.sound.currentTime = 0;
            effect.sound.play().catch(() => {});
        }
        
        // Initialize particles based on type
        this.initializeParticles(type);
        
        // Special handling for storm effect
        if (type === 'storm' && effect.lightning) {
            this.startLightningEffect();
        }
    }
    
    stopAllWeather() {
        Object.values(this.effects).forEach(effect => {
            effect.enabled = false;
            if (effect.sound) {
                effect.sound.pause();
                effect.sound.currentTime = 0;
            }
        });
        
        // Clear all particles
        this.particlePool.forEach(p => p.active = false);
    }
    
    initializeParticles(type) {
        const effect = this.effects[type];
        if (!effect || !effect.particles) return;
        
        const particleCount = Math.floor(effect.density * this.maxParticles * effect.intensity);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;
            
            particle.active = true;
            particle.x = Math.random() * this.width;
            particle.y = Math.random() * this.height;
            particle.speed = effect.speed * (0.5 + Math.random() * 0.5);
            particle.size = effect.size || 2;
            particle.opacity = Math.random() * 0.5 + 0.5;
            particle.velocityX = effect.wind?.x || 0;
            particle.velocityY = effect.wind?.y || 0;
            particle.life = 0;
            particle.maxLife = type === 'snow' ? 200 : 100;
        }
    }
    
    startLightningEffect() {
        const effect = this.effects.storm;
        if (!effect.lightning) return;
        
        const flash = () => {
            if (!effect.enabled) return;
            
            // Create lightning flash
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Play thunder sound
            if (effect.sound) {
                effect.sound.currentTime = 0;
                effect.sound.play().catch(() => {});
            }
            
            // Schedule next flash
            setTimeout(flash, effect.thunderInterval * (0.5 + Math.random()));
        };
        
        flash();
    }
    
    update(deltaTime) {
        this.frameCount++;
        if (this.frameCount % this.particleUpdateInterval !== 0) return;
        
        Object.entries(this.effects).forEach(([type, effect]) => {
            if (!effect.enabled) return;
            
            this.particlePool.forEach(particle => {
                if (!particle.active) return;
                
                // Update particle position
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
                particle.life++;
                
                // Handle particle lifecycle
                if (particle.life >= particle.maxLife) {
                    particle.active = false;
                    return;
                }
                
                // Type-specific updates
                switch (type) {
                    case 'rain':
                        if (particle.y > this.height) {
                            particle.y = 0;
                            particle.x = Math.random() * this.width;
                        }
                        break;
                        
                    case 'snow':
                        particle.x += Math.sin(particle.y * 0.01) * 0.5;
                        if (particle.y > this.height) {
                            particle.y = 0;
                            particle.x = Math.random() * this.width;
                        }
                        break;
                        
                    case 'fog':
                        particle.x += Math.sin(Date.now() * 0.001 + particle.y) * effect.movement.x;
                        particle.y += Math.cos(Date.now() * 0.001 + particle.x) * effect.movement.y;
                        if (particle.x < 0) particle.x = this.width;
                        if (particle.x > this.width) particle.x = 0;
                        if (particle.y < 0) particle.y = this.height;
                        if (particle.y > this.height) particle.y = 0;
                        break;
                        
                    case 'storm':
                        if (particle.y > this.height) {
                            particle.y = 0;
                            particle.x = Math.random() * this.width;
                        }
                        break;
                }
            });
        });
    }
    
    render() {
        Object.entries(this.effects).forEach(([type, effect]) => {
            if (!effect.enabled) return;
            
            this.ctx.save();
            
            switch (type) {
                case 'rain':
                    this.renderRain();
                    break;
                    
                case 'snow':
                    this.renderSnow();
                    break;
                    
                case 'fog':
                    this.renderFog();
                    break;
                    
                case 'storm':
                    this.renderStorm();
                    break;
            }
            
            this.ctx.restore();
        });
    }
    
    renderRain() {
        const effect = this.effects.rain;
        this.ctx.strokeStyle = effect.color;
        this.ctx.lineWidth = 1;
        
        this.particlePool.forEach(particle => {
            if (!particle.active) return;
            
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(
                particle.x - effect.length * 0.5,
                particle.y - effect.length
            );
            this.ctx.stroke();
            
            // Render impact effect
            if (effect.impactEffect && particle.y > this.height - 10) {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, this.height, 1, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fill();
            }
        });
    }
    
    renderSnow() {
        const effect = this.effects.snow;
        this.ctx.fillStyle = effect.color;
        
        this.particlePool.forEach(particle => {
            if (!particle.active) return;
            
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Render snow accumulation
            if (effect.accumulation && particle.y > this.height - 5) {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, this.height, particle.size * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.fill();
            }
        });
    }
    
    renderFog() {
        const effect = this.effects.fog;
        
        // Create gradient for fog
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, effect.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Add depth effect
        if (effect.depthEffect) {
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    renderStorm() {
        const effect = this.effects.storm;
        
        // Render rain
        this.ctx.strokeStyle = effect.color;
        this.ctx.lineWidth = 2;
        
        this.particlePool.forEach(particle => {
            if (!particle.active) return;
            
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(
                particle.x - effect.length * 0.5,
                particle.y - effect.length
            );
            this.ctx.stroke();
        });
        
        // Add dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
} 