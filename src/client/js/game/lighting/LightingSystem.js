export class LightingSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Create lighting canvas with WebGL context if available
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = this.width;
        this.lightCanvas.height = this.height;
        this.lightCtx = this.lightCanvas.getContext('2d', { alpha: true });
        
        // Create shadow canvas with WebGL context if available
        this.shadowCanvas = document.createElement('canvas');
        this.shadowCanvas.width = this.width;
        this.shadowCanvas.height = this.height;
        this.shadowCtx = this.shadowCanvas.getContext('2d', { alpha: true });
        
        // Create volumetric lighting canvas
        this.volumetricCanvas = document.createElement('canvas');
        this.volumetricCanvas.width = this.width;
        this.volumetricCanvas.height = this.height;
        this.volumetricCtx = this.volumetricCanvas.getContext('2d', { alpha: true });
        
        // Lighting configuration
        this.lights = new Map();
        this.ambientLight = {
            color: 'rgba(50, 50, 50, 0.5)',
            intensity: 0.5,
            colorTemperature: 6500, // Kelvin
            volumetricIntensity: 0.3
        };
        
        // Enhanced lighting effects
        this.effects = {
            flicker: {
                enabled: false,
                intensity: 0.1,
                speed: 0.05,
                randomness: 0.2,
                pattern: 'smooth' // smooth, random, or pulse
            },
            pulse: {
                enabled: false,
                intensity: 0.2,
                speed: 0.02,
                phase: 0,
                pattern: 'sine' // sine, square, or triangle
            },
            strobe: {
                enabled: false,
                frequency: 10,
                intensity: 0.5,
                duration: 100,
                pattern: 'random' // random or sequential
            },
            colorShift: {
                enabled: false,
                speed: 0.001,
                range: 1000,
                baseTemperature: 6500,
                pattern: 'smooth' // smooth or step
            },
            volumetric: {
                enabled: true,
                density: 0.5,
                samples: 8,
                noiseScale: 0.1,
                noiseIntensity: 0.2
            }
        };
        
        // Performance optimization
        this.lastUpdate = 0;
        this.frameCount = 0;
        this.updateInterval = 2; // Update every 2 frames
        this.lightCache = new Map();
        this.shadowCache = new Map();
        this.volumetricCache = new Map();
        
        // Initialize the system
        this.init();
    }
    
    init() {
        // Set up default lighting
        this.setAmbientLight(this.ambientLight);
        
        // Initialize caches
        this.initCaches();
        
        // Initialize volumetric lighting
        this.initVolumetricLighting();
    }
    
    initCaches() {
        // Pre-render common light patterns
        this.cacheLightPattern('default', this.createDefaultLightPattern());
        this.cacheLightPattern('spot', this.createSpotLightPattern());
        this.cacheLightPattern('area', this.createAreaLightPattern());
    }
    
    initVolumetricLighting() {
        // Create volumetric light patterns
        this.createVolumetricPattern('default', {
            density: 0.5,
            samples: 8,
            noiseScale: 0.1,
            noiseIntensity: 0.2
        });
        
        this.createVolumetricPattern('dense', {
            density: 0.8,
            samples: 12,
            noiseScale: 0.05,
            noiseIntensity: 0.3
        });
        
        this.createVolumetricPattern('sparse', {
            density: 0.3,
            samples: 4,
            noiseScale: 0.2,
            noiseIntensity: 0.1
        });
    }
    
    createVolumetricPattern(name, settings) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        // Generate noise pattern
        const noise = this.generateNoise(settings.noiseScale, settings.noiseIntensity);
        
        // Create volumetric light effect
        for (let i = 0; i < settings.samples; i++) {
            const alpha = (1 - i / settings.samples) * settings.density;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            for (let x = 0; x < this.width; x += 10) {
                for (let y = 0; y < this.height; y += 10) {
                    if (noise[x][y] > Math.random()) {
                        ctx.fillRect(x, y, 10, 10);
                    }
                }
            }
        }
        
        this.volumetricCache.set(name, canvas);
    }
    
    generateNoise(scale, intensity) {
        const noise = [];
        for (let x = 0; x < this.width; x += 10) {
            noise[x] = [];
            for (let y = 0; y < this.height; y += 10) {
                noise[x][y] = Math.random() * intensity * scale;
            }
        }
        return noise;
    }
    
    cacheLightPattern(name, pattern) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(pattern, 0, 0);
        this.lightCache.set(name, canvas);
    }
    
    createDefaultLightPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        return canvas;
    }
    
    createSpotLightPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(
            this.width / 2, this.height / 2, 0,
            this.width / 2, this.height / 2, this.width / 4
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        return canvas;
    }
    
    createAreaLightPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        return canvas;
    }
    
    setAmbientLight(settings) {
        this.ambientLight = {
            ...this.ambientLight,
            ...settings
        };
        
        // Update ambient light color based on temperature
        if (settings.colorTemperature) {
            this.ambientLight.color = this.temperatureToColor(settings.colorTemperature);
        }
    }
    
    addLight(id, settings) {
        const light = {
            x: settings.x || this.width / 2,
            y: settings.y || this.height / 2,
            radius: settings.radius || 100,
            color: settings.color || 'rgba(255, 255, 255, 1)',
            intensity: settings.intensity || 1,
            type: settings.type || 'point',
            flicker: settings.flicker || false,
            pulse: settings.pulse || false,
            strobe: settings.strobe || false,
            colorShift: settings.colorShift || false,
            shadow: settings.shadow || false,
            shadowBlur: settings.shadowBlur || 10,
            shadowColor: settings.shadowColor || 'rgba(0, 0, 0, 0.5)',
            pattern: settings.pattern || 'default'
        };
        
        this.lights.set(id, light);
        return light;
    }
    
    removeLight(id) {
        this.lights.delete(id);
    }
    
    update(deltaTime) {
        this.frameCount++;
        if (this.frameCount % this.updateInterval !== 0) return;
        
        // Clear lighting canvas
        this.lightCtx.fillStyle = this.ambientLight.color;
        this.lightCtx.fillRect(0, 0, this.width, this.height);
        
        // Update and render each light
        this.lights.forEach((light, id) => {
            // Apply effects
            if (light.flicker) {
                light.intensity = light.intensity * (1 + Math.sin(Date.now() * this.effects.flicker.speed) * 
                    this.effects.flicker.intensity * (1 + Math.random() * this.effects.flicker.randomness));
            }
            
            if (light.pulse) {
                this.effects.pulse.phase += this.effects.pulse.speed;
                light.intensity = light.intensity * (1 + Math.sin(this.effects.pulse.phase) * 
                    this.effects.pulse.intensity);
            }
            
            if (light.strobe) {
                if (Math.random() < this.effects.strobe.frequency / 1000) {
                    light.intensity = this.effects.strobe.intensity;
                    setTimeout(() => {
                        light.intensity = 1;
                    }, this.effects.strobe.duration);
                }
            }
            
            if (light.colorShift) {
                const temperature = this.effects.colorShift.baseTemperature + 
                    Math.sin(Date.now() * this.effects.colorShift.speed) * this.effects.colorShift.range;
                light.color = this.temperatureToColor(temperature);
            }
            
            // Render light
            this.renderLight(light);
            
            // Render shadow if enabled
            if (light.shadow) {
                this.renderShadow(light);
            }
        });
    }
    
    renderLight(light) {
        this.lightCtx.save();
        
        // Get cached light pattern or create new one
        let pattern = this.lightCache.get(light.pattern);
        if (!pattern) {
            pattern = this.createDefaultLightPattern();
            this.cacheLightPattern(light.pattern, pattern);
        }
        
        // Apply light transformations
        this.lightCtx.translate(light.x, light.y);
        this.lightCtx.scale(light.radius / (this.width / 2), light.radius / (this.height / 2));
        this.lightCtx.translate(-this.width / 2, -this.height / 2);
        
        // Apply light color and intensity
        this.lightCtx.globalCompositeOperation = 'lighter';
        this.lightCtx.globalAlpha = light.intensity;
        this.lightCtx.fillStyle = light.color;
        
        // Draw light pattern
        this.lightCtx.drawImage(pattern, 0, 0);
        
        // Apply volumetric lighting if enabled
        if (this.effects.volumetric.enabled) {
            this.renderVolumetricLight(light);
        }
        
        this.lightCtx.restore();
    }
    
    renderShadow(light) {
        this.shadowCtx.save();
        
        // Create shadow gradient
        const gradient = this.shadowCtx.createRadialGradient(
            light.x, light.y, 0,
            light.x, light.y, light.radius * 1.5
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, light.shadowColor);
        
        // Draw shadow
        this.shadowCtx.fillStyle = gradient;
        this.shadowCtx.globalCompositeOperation = 'destination-over';
        this.shadowCtx.filter = `blur(${light.shadowBlur}px)`;
        this.shadowCtx.fillRect(0, 0, this.width, this.height);
        
        this.shadowCtx.restore();
    }
    
    renderVolumetricLight(light) {
        const volumetricPattern = this.volumetricCache.get('default');
        if (!volumetricPattern) return;
        
        this.volumetricCtx.save();
        
        // Apply volumetric transformations
        this.volumetricCtx.translate(light.x, light.y);
        this.volumetricCtx.scale(light.radius / (this.width / 2), light.radius / (this.height / 2));
        this.volumetricCtx.translate(-this.width / 2, -this.height / 2);
        
        // Apply volumetric effects
        this.volumetricCtx.globalCompositeOperation = 'lighter';
        this.volumetricCtx.globalAlpha = this.ambientLight.volumetricIntensity;
        
        // Draw volumetric pattern
        this.volumetricCtx.drawImage(volumetricPattern, 0, 0);
        
        this.volumetricCtx.restore();
    }
    
    temperatureToColor(temperature) {
        // Convert temperature to RGB
        let temp = temperature / 100;
        let red, green, blue;
        
        if (temp <= 66) {
            red = 255;
            green = temp;
            green = 99.4708025861 * Math.log(green) - 161.1195681661;
            
            if (temp <= 19) {
                blue = 0;
            } else {
                blue = temp - 10;
                blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
            }
        } else {
            red = temp - 60;
            red = 329.698727446 * Math.pow(red, -0.1332047592);
            
            green = temp - 60;
            green = 288.1221695283 * Math.pow(green, -0.0755148492);
            
            blue = 255;
        }
        
        // Clamp values
        red = Math.min(255, Math.max(0, red));
        green = Math.min(255, Math.max(0, green));
        blue = Math.min(255, Math.max(0, blue));
        
        return `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, 1)`;
    }
    
    render() {
        // Combine lighting, shadow, and volumetric layers
        this.ctx.save();
        
        // Draw shadow layer
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.drawImage(this.shadowCanvas, 0, 0);
        
        // Draw volumetric lighting layer
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.drawImage(this.volumetricCanvas, 0, 0);
        
        // Draw lighting layer
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.drawImage(this.lightCanvas, 0, 0);
        
        this.ctx.restore();
    }
} 