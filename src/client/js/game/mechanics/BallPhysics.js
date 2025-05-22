// BallPhysics.js - Sistema di fisica avanzato per la palla

export class BallPhysics {
    constructor(options = {}) {
        // Configurazione fisica
        this.config = {
            radius: options.radius || 10,
            mass: options.mass || 1,
            restitution: options.restitution || 0.8,
            friction: options.friction || 0.1,
            airResistance: options.airResistance || 0.02,
            spinDecay: options.spinDecay || 0.98,
            spinTransfer: options.spinTransfer || 0.3,
            curveFactor: options.curveFactor || 0.2,
            powerFactor: options.powerFactor || 1.5,
            maxSpeed: options.maxSpeed || 15,
            minSpeed: options.minSpeed || 0.1
        };
        
        // Stato della palla
        this.state = {
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            spin: 0,
            power: 0,
            curve: 0,
            lastCollision: null,
            lastUpdate: 0
        };
        
        // Effetti meteorologici
        this.weatherEffects = {
            rain: {
                friction: 0.15,
                airResistance: 0.03,
                bounce: 0.7
            },
            snow: {
                friction: 0.2,
                airResistance: 0.04,
                bounce: 0.6
            },
            wind: {
                force: 0.3,
                direction: 0,
                variation: 0.1
            }
        };
        
        // Stato meteorologico corrente
        this.currentWeather = 'none';
    }
    
    // Aggiorna la fisica della palla
    update(deltaTime) {
        // Aggiorna la posizione
        this.state.position.x += this.state.velocity.x * deltaTime;
        this.state.position.y += this.state.velocity.y * deltaTime;
        
        // Applica l'accelerazione
        this.state.velocity.x += this.state.acceleration.x * deltaTime;
        this.state.velocity.y += this.state.acceleration.y * deltaTime;
        
        // Applica la resistenza dell'aria
        const airResistance = this.getAirResistance();
        this.state.velocity.x *= (1 - airResistance);
        this.state.velocity.y *= (1 - airResistance);
        
        // Applica gli effetti dello spin
        this.applySpinEffects(deltaTime);
        
        // Applica gli effetti meteorologici
        this.applyWeatherEffects(deltaTime);
        
        // Limita la velocità
        this.limitSpeed();
        
        // Aggiorna il timestamp
        this.state.lastUpdate = Date.now();
        
        // Enhanced: Apply ground friction if nearly stopped
        if (Math.abs(this.state.velocity.x) < 0.2 && Math.abs(this.state.velocity.y) < 0.2) {
            this.state.velocity.x *= 0.9;
            this.state.velocity.y *= 0.9;
        }
        
        // Visual feedback hook (for effects)
        if (this.onUpdate) this.onUpdate({position: {...this.state.position}, velocity: {...this.state.velocity}, spin: this.state.spin});
    }
    
    // Applica gli effetti dello spin
    applySpinEffects(deltaTime) {
        // Calcola l'effetto della curva
        const curveForce = this.state.spin * this.config.curveFactor;
        const curveAngle = Math.atan2(this.state.velocity.y, this.state.velocity.x) + Math.PI / 2;
        
        this.state.velocity.x += Math.cos(curveAngle) * curveForce * deltaTime;
        this.state.velocity.y += Math.sin(curveAngle) * curveForce * deltaTime;
        
        // Decadimento dello spin
        this.state.spin *= Math.pow(this.config.spinDecay, deltaTime);
    }
    
    // Applica gli effetti meteorologici
    applyWeatherEffects(deltaTime) {
        if (this.currentWeather === 'none') return;
        
        const effects = this.weatherEffects[this.currentWeather];
        if (!effects) return;
        
        // Applica attrito e resistenza dell'aria
        this.state.velocity.x *= (1 - effects.friction * deltaTime);
        this.state.velocity.y *= (1 - effects.friction * deltaTime);
        
        // Applica vento se presente
        if (effects.wind) {
            const windForce = effects.wind.force * (1 + Math.random() * effects.wind.variation);
            const windAngle = effects.wind.direction;
            
            this.state.velocity.x += Math.cos(windAngle) * windForce * deltaTime;
            this.state.velocity.y += Math.sin(windAngle) * windForce * deltaTime;
        }
    }
    
    // Ottieni la resistenza dell'aria corrente
    getAirResistance() {
        let resistance = this.config.airResistance;
        
        if (this.currentWeather !== 'none') {
            resistance += this.weatherEffects[this.currentWeather].airResistance;
        }
        
        return resistance;
    }
    
    // Limita la velocità della palla
    limitSpeed() {
        const speed = Math.sqrt(
            this.state.velocity.x * this.state.velocity.x +
            this.state.velocity.y * this.state.velocity.y
        );
        
        if (speed > this.config.maxSpeed) {
            const factor = this.config.maxSpeed / speed;
            this.state.velocity.x *= factor;
            this.state.velocity.y *= factor;
        } else if (speed < this.config.minSpeed) {
            this.state.velocity.x = 0;
            this.state.velocity.y = 0;
        }
    }
    
    // Applica una forza alla palla
    applyForce(force, angle, power = 1, spin = 0, curve = 0) {
        // Calculate initial velocity
        const speed = force * this.config.powerFactor * power;
        this.state.velocity.x = Math.cos(angle) * speed;
        this.state.velocity.y = Math.sin(angle) * speed;
        // Set spin and curve
        this.state.spin = spin !== 0 ? spin : force * this.config.spinTransfer * power;
        this.state.curve = curve !== 0 ? curve : force * this.config.curveFactor * power;
        // Visual feedback hook (for effects)
        if (this.onKick) this.onKick({speed, spin: this.state.spin, curve: this.state.curve});
    }
    
    // Gestisci una collisione
    handleCollision(collision) {
        this.state.lastCollision = collision;
        // Calculate relative velocity
        const relativeVelocity = {
            x: collision.velocity.x - this.state.velocity.x,
            y: collision.velocity.y - this.state.velocity.y
        };
        // Calculate impulse
        const impulse = {
            x: relativeVelocity.x * collision.mass * this.config.restitution,
            y: relativeVelocity.y * collision.mass * this.config.restitution
        };
        // Apply impulse
        this.state.velocity.x += impulse.x;
        this.state.velocity.y += impulse.y;
        // Transfer spin
        if (collision.spin) {
            this.state.spin += collision.spin * this.config.spinTransfer;
        }
        // Enhanced: Friction and energy loss
        this.state.velocity.x *= (1 - this.config.friction);
        this.state.velocity.y *= (1 - this.config.friction);
        // Enhanced: Add random micro-bounce for realism
        if (collision.type === 'boundary') {
            this.state.velocity.x += (Math.random() - 0.5) * 0.2;
            this.state.velocity.y += (Math.random() - 0.5) * 0.2;
        }
        // Visual feedback hook (for effects)
        if (this.onCollision) this.onCollision({velocity: {...this.state.velocity}, spin: this.state.spin, type: collision.type});
    }
    
    // Imposta il tempo meteorologico
    setWeather(weather) {
        this.currentWeather = weather;
    }
    
    // Ottieni lo stato corrente della palla
    getState() {
        return {
            position: { ...this.state.position },
            velocity: { ...this.state.velocity },
            spin: this.state.spin,
            power: this.state.power,
            curve: this.state.curve
        };
    }
    
    // Enhanced: Add hooks for effects manager
    setVisualFeedbackHooks({onKick, onCollision, onUpdate}) {
        this.onKick = onKick;
        this.onCollision = onCollision;
        this.onUpdate = onUpdate;
    }
} 