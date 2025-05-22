class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.ax = options.ax || 0;
        this.ay = options.ay || 0;
        this.radius = options.radius || 2;
        this.color = options.color || '#ffffff';
        this.alpha = options.alpha || 1;
        this.life = options.life || 1000;
        this.maxLife = this.life;
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.scale = options.scale || 1;
        this.scaleSpeed = options.scaleSpeed || 0;
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.wind = options.wind || 0;
        this.trail = options.trail || false;
        this.trailLength = options.trailLength || 5;
        this.trailPositions = [];
    }
    
    update(deltaTime) {
        // Update position
        this.vx += this.ax * deltaTime;
        this.vy += this.ay * deltaTime;
        this.vy += this.gravity * deltaTime;
        this.vx += this.wind * deltaTime;
        
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Update rotation
        this.rotation += this.rotationSpeed * deltaTime;
        
        // Update scale
        this.scale += this.scaleSpeed * deltaTime;
        
        // Update life
        this.life -= deltaTime;
        
        // Update alpha based on life
        this.alpha = this.life / this.maxLife;
        
        // Update trail
        if (this.trail) {
            this.trailPositions.unshift({ x: this.x, y: this.y });
            if (this.trailPositions.length > this.trailLength) {
                this.trailPositions.pop();
            }
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Draw trail
        if (this.trail && this.trailPositions.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trailPositions[0].x, this.trailPositions[0].y);
            
            for (let i = 1; i < this.trailPositions.length; i++) {
                const pos = this.trailPositions[i];
                const alpha = (i / this.trailPositions.length) * this.alpha;
                ctx.strokeStyle = `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                ctx.lineTo(pos.x, pos.y);
            }
            
            ctx.stroke();
        }
        
        // Draw particle
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            maxParticles: options.maxParticles || 1000,
            ...options
        };
        
        this.particles = [];
        this.emitters = new Map();
    }
    
    addEmitter(id, options = {}) {
        this.emitters.set(id, {
            x: options.x || 0,
            y: options.y || 0,
            rate: options.rate || 10,
            burst: options.burst || 0,
            particleOptions: options.particleOptions || {},
            active: options.active || true,
            lastEmit: 0
        });
    }
    
    removeEmitter(id) {
        return this.emitters.delete(id);
    }
    
    emit(x, y, count, options = {}) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.options.maxParticles) {
                console.warn('Maximum number of particles reached');
                break;
            }
            
            const particle = new Particle(x, y, options);
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        // Update emitters
        this.emitters.forEach(emitter => {
            if (!emitter.active) return;
            
            const now = Date.now();
            const timeSinceLastEmit = now - emitter.lastEmit;
            
            if (emitter.burst > 0) {
                this.emit(emitter.x, emitter.y, emitter.burst, emitter.particleOptions);
                emitter.burst = 0;
            } else if (timeSinceLastEmit >= 1000 / emitter.rate) {
                this.emit(emitter.x, emitter.y, 1, emitter.particleOptions);
                emitter.lastEmit = now;
            }
        });
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render() {
        this.particles.forEach(particle => {
            particle.draw(this.ctx);
        });
    }
}

export default ParticleSystem; 