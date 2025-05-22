// AdvancedParticleSystem.js - Enhanced particle effects for HaxBall

export class AdvancedParticleSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            maxParticles: options.maxParticles || 2000,
            ...options
        };
        
        this.particles = [];
        this.emitters = new Map();
        this.effects = new Map();
        
        // Initialize effect presets
        this.initEffectPresets();
    }
    
    initEffectPresets() {
        // Goal celebration effect
        this.effects.set('goalCelebration', {
            burst: 100,
            particleOptions: {
                colors: ['#FFD700', '#FFA500', '#FF4500', '#FF0000'],
                size: { min: 2, max: 5 },
                speed: { min: 2, max: 8 },
                life: { min: 1000, max: 2000 },
                gravity: 0.1,
                rotation: true,
                trail: true,
                trailLength: 5
            }
        });
        
        // Power shot effect
        this.effects.set('powerShot', {
            burst: 30,
            particleOptions: {
                colors: ['#00FFFF', '#008B8B', '#00CED1'],
                size: { min: 1, max: 3 },
                speed: { min: 5, max: 15 },
                life: { min: 500, max: 1000 },
                gravity: 0.05,
                rotation: true,
                trail: true,
                trailLength: 8
            }
        });
        
        // Collision effect
        this.effects.set('collision', {
            burst: 20,
            particleOptions: {
                colors: ['#FFFFFF', '#E0E0E0', '#D0D0D0'],
                size: { min: 1, max: 4 },
                speed: { min: 3, max: 10 },
                life: { min: 300, max: 800 },
                gravity: 0.08,
                rotation: false,
                trail: false
            }
        });
        
        // Speed boost effect
        this.effects.set('speedBoost', {
            burst: 15,
            particleOptions: {
                colors: ['#00FF00', '#32CD32', '#7CFC00'],
                size: { min: 1, max: 3 },
                speed: { min: 2, max: 6 },
                life: { min: 400, max: 800 },
                gravity: 0.02,
                rotation: true,
                trail: true,
                trailLength: 4
            }
        });
    }
    
    createParticle(x, y, options = {}) {
        if (this.particles.length >= this.options.maxParticles) {
            console.warn('Maximum number of particles reached');
            return null;
        }
        
        const particle = {
            x,
            y,
            vx: options.vx || 0,
            vy: options.vy || 0,
            ax: options.ax || 0,
            ay: options.ay || 0,
            size: this.getRandomValue(options.size),
            color: this.getRandomColor(options.colors),
            alpha: 1,
            life: this.getRandomValue(options.life),
            maxLife: this.getRandomValue(options.life),
            rotation: options.rotation ? Math.random() * Math.PI * 2 : 0,
            rotationSpeed: options.rotation ? (Math.random() - 0.5) * 0.2 : 0,
            gravity: options.gravity || 0,
            friction: options.friction || 0.98,
            trail: options.trail || false,
            trailLength: options.trailLength || 5,
            trailPositions: []
        };
        
        this.particles.push(particle);
        return particle;
    }
    
    getRandomValue(range) {
        if (!range) return 0;
        if (typeof range === 'number') return range;
        return range.min + Math.random() * (range.max - range.min);
    }
    
    getRandomColor(colors) {
        if (!colors || colors.length === 0) return '#FFFFFF';
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    emitEffect(x, y, effectName, direction = 0) {
        const effect = this.effects.get(effectName);
        if (!effect) return;
        
        const { burst, particleOptions } = effect;
        const spread = Math.PI / 4; // 45 degrees spread
        
        for (let i = 0; i < burst; i++) {
            const angle = direction + (Math.random() - 0.5) * spread;
            const speed = this.getRandomValue(particleOptions.speed);
            
            const particle = this.createParticle(x, y, {
                ...particleOptions,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            });
            
            if (particle && particleOptions.trail) {
                particle.trailPositions = Array(particleOptions.trailLength).fill({ x, y });
            }
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.vx += particle.ax * deltaTime;
            particle.vy += particle.ay * deltaTime;
            particle.vy += particle.gravity * deltaTime;
            
            particle.vx *= particle.friction;
            particle.vy *= particle.friction;
            
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Update rotation
            if (particle.rotation !== undefined) {
                particle.rotation += particle.rotationSpeed * deltaTime;
            }
            
            // Update life
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            
            // Update trail
            if (particle.trail) {
                particle.trailPositions.unshift({ x: particle.x, y: particle.y });
                if (particle.trailPositions.length > particle.trailLength) {
                    particle.trailPositions.pop();
                }
            }
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render() {
        this.ctx.save();
        
        this.particles.forEach(particle => {
            // Draw trail
            if (particle.trail && particle.trailPositions.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(particle.trailPositions[0].x, particle.trailPositions[0].y);
                
                for (let i = 1; i < particle.trailPositions.length; i++) {
                    const pos = particle.trailPositions[i];
                    const alpha = (i / particle.trailPositions.length) * particle.alpha;
                    this.ctx.strokeStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                    this.ctx.lineTo(pos.x, pos.y);
                }
                
                this.ctx.stroke();
            }
            
            // Draw particle
            this.ctx.translate(particle.x, particle.y);
            if (particle.rotation !== undefined) {
                this.ctx.rotate(particle.rotation);
            }
            
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
} 