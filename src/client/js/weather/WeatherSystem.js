import { EventEmitter } from '../utils/eventEmitter.js';

export class WeatherSystem extends EventEmitter {
    constructor(canvas, context) {
        super();
        this.canvas = canvas;
        this.context = context;
        this.activeEffects = new Map();
        this.particles = [];
        this.weatherTypes = {
            RAIN: 'rain',
            SNOW: 'snow',
            FOG: 'fog',
            CLEAR: 'clear'
        };
        this.currentWeather = this.weatherTypes.CLEAR;
        this.intensity = 0;
        this.windSpeed = 0;
        this.windDirection = 0;
        this.lastUpdate = 0;
        
        // Initialize weather effects
        this.initializeEffects();
    }

    initializeEffects() {
        // Rain effect
        this.activeEffects.set(this.weatherTypes.RAIN, {
            particleCount: 1000,
            particleSpeed: 15,
            particleSize: 2,
            particleColor: 'rgba(174, 194, 224, 0.5)',
            update: this.updateRainParticles.bind(this),
            draw: this.drawRainParticles.bind(this)
        });

        // Snow effect
        this.activeEffects.set(this.weatherTypes.SNOW, {
            particleCount: 500,
            particleSpeed: 3,
            particleSize: 3,
            particleColor: 'rgba(255, 255, 255, 0.8)',
            update: this.updateSnowParticles.bind(this),
            draw: this.drawSnowParticles.bind(this)
        });

        // Fog effect
        this.activeEffects.set(this.weatherTypes.FOG, {
            particleCount: 50,
            particleSpeed: 0.5,
            particleSize: 100,
            particleColor: 'rgba(200, 200, 200, 0.1)',
            update: this.updateFogParticles.bind(this),
            draw: this.drawFogParticles.bind(this)
        });
    }

    setWeather(type, intensity = 0.5, windSpeed = 0, windDirection = 0) {
        if (!this.weatherTypes[type]) {
            console.error(`Invalid weather type: ${type}`);
            return;
        }

        this.currentWeather = this.weatherTypes[type];
        this.intensity = Math.max(0, Math.min(1, intensity));
        this.windSpeed = windSpeed;
        this.windDirection = windDirection;
        
        // Reset particles
        this.particles = [];
        this.initializeParticles();
        
        this.emit('weatherChanged', {
            type: this.currentWeather,
            intensity: this.intensity,
            windSpeed: this.windSpeed,
            windDirection: this.windDirection
        });
    }

    initializeParticles() {
        const effect = this.activeEffects.get(this.currentWeather);
        if (!effect) return;

        for (let i = 0; i < effect.particleCount * this.intensity; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: effect.particleSize * (0.5 + Math.random() * 0.5),
                speed: effect.particleSpeed * (0.5 + Math.random() * 0.5),
                opacity: Math.random() * 0.5 + 0.5
            });
        }
    }

    updateRainParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.y += particle.speed * deltaTime;
            particle.x += this.windSpeed * Math.cos(this.windDirection) * deltaTime;

            if (particle.y > this.canvas.height) {
                particle.y = 0;
                particle.x = Math.random() * this.canvas.width;
            }
        });
    }

    updateSnowParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.y += particle.speed * deltaTime;
            particle.x += this.windSpeed * Math.cos(this.windDirection) * deltaTime;
            particle.x += Math.sin(particle.y * 0.01) * 0.5;

            if (particle.y > this.canvas.height) {
                particle.y = 0;
                particle.x = Math.random() * this.canvas.width;
            }
        });
    }

    updateFogParticles(deltaTime) {
        this.particles.forEach(particle => {
            particle.x += this.windSpeed * Math.cos(this.windDirection) * deltaTime;
            if (particle.x > this.canvas.width) {
                particle.x = -particle.size;
            }
        });
    }

    drawRainParticles() {
        const effect = this.activeEffects.get(this.weatherTypes.RAIN);
        this.context.strokeStyle = effect.particleColor;
        this.context.lineWidth = effect.particleSize;

        this.particles.forEach(particle => {
            this.context.beginPath();
            this.context.moveTo(particle.x, particle.y);
            this.context.lineTo(
                particle.x - this.windSpeed * Math.cos(this.windDirection),
                particle.y + particle.speed
            );
            this.context.stroke();
        });
    }

    drawSnowParticles() {
        const effect = this.activeEffects.get(this.weatherTypes.SNOW);
        this.context.fillStyle = effect.particleColor;

        this.particles.forEach(particle => {
            this.context.beginPath();
            this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.context.fill();
        });
    }

    drawFogParticles() {
        const effect = this.activeEffects.get(this.weatherTypes.FOG);
        this.context.fillStyle = effect.particleColor;

        this.particles.forEach(particle => {
            this.context.beginPath();
            this.context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.context.fill();
        });
    }

    update(timestamp) {
        if (!this.lastUpdate) {
            this.lastUpdate = timestamp;
            return;
        }

        const deltaTime = (timestamp - this.lastUpdate) / 1000;
        this.lastUpdate = timestamp;

        const effect = this.activeEffects.get(this.currentWeather);
        if (effect && effect.update) {
            effect.update(deltaTime);
        }
    }

    draw() {
        const effect = this.activeEffects.get(this.currentWeather);
        if (effect && effect.draw) {
            effect.draw();
        }
    }

    clear() {
        this.setWeather(this.weatherTypes.CLEAR);
    }
} 