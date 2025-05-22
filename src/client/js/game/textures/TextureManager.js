class TextureManager {
    constructor() {
        this.textures = new Map();
        this.patterns = new Map();
        this.gradients = new Map();
    }
    
    async loadTexture(id, url) {
        try {
            const img = new Image();
            img.src = url;
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
            
            this.textures.set(id, img);
            return true;
        } catch (error) {
            console.error(`Failed to load texture ${id}:`, error);
            return false;
        }
    }
    
    createPattern(id, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = options.width || 100;
        canvas.height = options.height || 100;
        
        // Draw pattern
        ctx.fillStyle = options.backgroundColor || '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (options.type === 'grid') {
            ctx.strokeStyle = options.lineColor || '#ffffff';
            ctx.lineWidth = options.lineWidth || 1;
            
            // Draw vertical lines
            for (let x = 0; x <= canvas.width; x += options.gridSize || 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            
            // Draw horizontal lines
            for (let y = 0; y <= canvas.height; y += options.gridSize || 20) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        } else if (options.type === 'dots') {
            ctx.fillStyle = options.dotColor || '#ffffff';
            
            for (let x = 0; x < canvas.width; x += options.spacing || 20) {
                for (let y = 0; y < canvas.height; y += options.spacing || 20) {
                    ctx.beginPath();
                    ctx.arc(x, y, options.dotSize || 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (options.type === 'stripes') {
            ctx.fillStyle = options.stripeColor || '#ffffff';
            
            for (let x = 0; x < canvas.width; x += options.stripeWidth || 20) {
                ctx.fillRect(x, 0, options.stripeWidth / 2 || 10, canvas.height);
            }
        }
        
        const pattern = ctx.createPattern(canvas, 'repeat');
        this.patterns.set(id, pattern);
        return pattern;
    }
    
    createGradient(id, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = options.width || 100;
        canvas.height = options.height || 100;
        
        let gradient;
        
        if (options.type === 'linear') {
            gradient = ctx.createLinearGradient(
                options.x0 || 0,
                options.y0 || 0,
                options.x1 || canvas.width,
                options.y1 || canvas.height
            );
        } else if (options.type === 'radial') {
            gradient = ctx.createRadialGradient(
                options.x0 || canvas.width / 2,
                options.y0 || canvas.height / 2,
                options.r0 || 0,
                options.x1 || canvas.width / 2,
                options.y1 || canvas.height / 2,
                options.r1 || canvas.width / 2
            );
        }
        
        if (gradient && options.stops) {
            options.stops.forEach(stop => {
                gradient.addColorStop(stop.offset, stop.color);
            });
        }
        
        this.gradients.set(id, gradient);
        return gradient;
    }
    
    getTexture(id) {
        return this.textures.get(id);
    }
    
    getPattern(id) {
        return this.patterns.get(id);
    }
    
    getGradient(id) {
        return this.gradients.get(id);
    }
    
    applyTexture(ctx, id, x, y, width, height) {
        const texture = this.textures.get(id);
        if (texture) {
            ctx.drawImage(texture, x, y, width, height);
            return true;
        }
        return false;
    }
    
    applyPattern(ctx, id) {
        const pattern = this.patterns.get(id);
        if (pattern) {
            ctx.fillStyle = pattern;
            return true;
        }
        return false;
    }
    
    applyGradient(ctx, id) {
        const gradient = this.gradients.get(id);
        if (gradient) {
            ctx.fillStyle = gradient;
            return true;
        }
        return false;
    }
    
    clear() {
        this.textures.clear();
        this.patterns.clear();
        this.gradients.clear();
    }
}

export default TextureManager; 