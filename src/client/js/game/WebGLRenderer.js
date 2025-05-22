// WebGLRenderer.js - Advanced WebGL rendering system for HaxBall
export class WebGLRenderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.gl = null;
        this.program = null;
        this.objectPool = new Map();
        this.initialized = false;
        this.textureAtlas = null;
        this.frustum = {
            left: 0,
            right: width,
            top: 0,
            bottom: height
        };
        this.instanceBuffer = null;
        this.instanceData = new Float32Array(1000 * 8); // 1000 instances, 8 floats per instance
        this.instanceCount = 0;

        // Initialize WebGL context
        this.initWebGL();
    }

    initWebGL() {
        try {
            // Get WebGL context with performance optimizations
            this.gl = this.canvas.getContext('webgl', {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                desynchronized: true,
                powerPreference: 'high-performance'
            });

            if (!this.gl) {
                console.warn('WebGL not supported, falling back to Canvas2D');
                return false;
            }

            // Initialize shaders
            this.initShaders();
            
            // Initialize buffers
            this.initBuffers();
            
            // Initialize texture atlas
            this.initTextureAtlas();
            
            // Set up object pooling
            this.initObjectPool();
            
            // Set initial viewport
            this.gl.viewport(0, 0, this.width, this.height);
            
            // Enable blending for transparency
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            return false;
        }
    }

    initShaders() {
        // Vertex shader for instanced rendering
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader, `
            attribute vec2 a_position;
            attribute vec4 a_color;
            attribute vec2 a_texCoord;
            attribute vec2 a_instancePosition;
            attribute vec2 a_instanceScale;
            attribute vec4 a_instanceColor;
            
            varying vec4 v_color;
            varying vec2 v_texCoord;
            uniform vec2 u_resolution;
            uniform sampler2D u_texture;
            
            void main() {
                vec2 scaledPosition = a_position * a_instanceScale;
                vec2 position = scaledPosition + a_instancePosition;
                vec2 clipSpace = (position / u_resolution) * 2.0 - 1.0;
                gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
                v_color = a_color * a_instanceColor;
                v_texCoord = a_texCoord;
            }
        `);
        this.gl.compileShader(vertexShader);

        // Fragment shader with texture support
        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShader, `
            precision mediump float;
            varying vec4 v_color;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            
            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = v_color * texColor;
            }
        `);
        this.gl.compileShader(fragmentShader);

        // Create and link program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        // Check for errors
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Failed to link shader program:', this.gl.getProgramInfoLog(this.program));
            return false;
        }

        // Get attribute and uniform locations
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.colorLocation = this.gl.getAttribLocation(this.program, 'a_color');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        this.instancePositionLocation = this.gl.getAttribLocation(this.program, 'a_instancePosition');
        this.instanceScaleLocation = this.gl.getAttribLocation(this.program, 'a_instanceScale');
        this.instanceColorLocation = this.gl.getAttribLocation(this.program, 'a_instanceColor');
        this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
        this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
    }

    initBuffers() {
        // Create position buffer
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        
        // Create color buffer
        this.colorBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
    }

    initObjectPool() {
        // Initialize object pools for different types
        this.objectPool.set('circle', []);
        this.objectPool.set('player', []);
        this.objectPool.set('particle', []);
        this.objectPool.set('effect', []);
    }

    initTextureAtlas() {
        // Create texture atlas
        this.textureAtlas = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureAtlas);
        
        // Set texture parameters for better performance
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        
        // Create a canvas to build the atlas
        const atlasCanvas = document.createElement('canvas');
        atlasCanvas.width = 1024;
        atlasCanvas.height = 1024;
        const atlasCtx = atlasCanvas.getContext('2d');
        
        // Add textures to atlas
        this.textureCoords = new Map();
        let x = 0;
        let y = 0;
        let maxHeight = 0;
        
        // Add circle texture
        this.addTextureToAtlas(atlasCtx, 'circle', this.generateCircleTexture(32), x, y);
        this.textureCoords.set('circle', { x: x / 1024, y: y / 1024, width: 32 / 1024, height: 32 / 1024 });
        x += 32;
        maxHeight = Math.max(maxHeight, 32);
        
        // Add player texture
        this.addTextureToAtlas(atlasCtx, 'player', this.generateCircleTexture(32, 'red'), x, y);
        this.textureCoords.set('player', { x: x / 1024, y: y / 1024, width: 32 / 1024, height: 32 / 1024 });
        x += 32;
        maxHeight = Math.max(maxHeight, 32);
        
        // Add particle texture
        this.addTextureToAtlas(atlasCtx, 'particle', this.generateCircleTexture(16, 'white', 0.5), x, y);
        this.textureCoords.set('particle', { x: x / 1024, y: y / 1024, width: 16 / 1024, height: 16 / 1024 });
        
        // Upload atlas to GPU
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, atlasCanvas);
    }

    addTextureToAtlas(ctx, name, texture, x, y) {
        ctx.drawImage(texture, x, y);
    }

    generateCircleTexture(size, color = 'white', alpha = 1) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        return canvas;
    }

    getObject(type) {
        const pool = this.objectPool.get(type);
        if (pool && pool.length > 0) {
            return pool.pop();
        }
        return this.createObject(type);
    }

    releaseObject(type, object) {
        const pool = this.objectPool.get(type);
        if (pool && pool.length < 1000) { // Limit pool size
            pool.push(object);
        }
    }

    createObject(type) {
        switch (type) {
            case 'circle':
                return {
                    vertices: this.generateCircleVertices(1, 32),
                    color: [1, 1, 1, 1],
                    scale: 1,
                    position: [0, 0]
                };
            case 'player':
                return {
                    vertices: this.generateCircleVertices(1, 32),
                    color: [1, 0, 0, 1],
                    scale: 1,
                    position: [0, 0]
                };
            case 'particle':
                return {
                    vertices: this.generateCircleVertices(0.5, 16),
                    color: [1, 1, 1, 0.5],
                    scale: 1,
                    position: [0, 0]
                };
            default:
                return null;
        }
    }

    generateCircleVertices(radius, segments) {
        const vertices = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }
        return vertices;
    }

    isInFrustum(x, y, radius) {
        return x + radius >= this.frustum.left &&
               x - radius <= this.frustum.right &&
               y + radius >= this.frustum.top &&
               y - radius <= this.frustum.bottom;
    }

    render(objects) {
        if (!this.initialized) return;

        // Clear canvas
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Use shader program
        this.gl.useProgram(this.program);

        // Set resolution uniform
        this.gl.uniform2f(this.resolutionLocation, this.width, this.height);

        // Bind texture atlas
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureAtlas);
        this.gl.uniform1i(this.textureLocation, 0);

        // Reset instance data
        this.instanceCount = 0;

        // Collect visible objects
        objects.forEach(object => {
            if (this.isInFrustum(object.position.x, object.position.y, object.radius || 1)) {
                this.addInstance(object);
            }
        });

        // Render all instances in one batch
        if (this.instanceCount > 0) {
            this.renderInstances();
        }
    }

    addInstance(object) {
        if (this.instanceCount >= 1000) return; // Max instances reached

        const baseIndex = this.instanceCount * 8;
        const texCoords = this.textureCoords.get(object.type) || this.textureCoords.get('circle');

        // Position
        this.instanceData[baseIndex] = object.position.x;
        this.instanceData[baseIndex + 1] = object.position.y;

        // Scale
        this.instanceData[baseIndex + 2] = object.radius || 1;
        this.instanceData[baseIndex + 3] = object.radius || 1;

        // Color
        this.instanceData[baseIndex + 4] = object.color ? object.color[0] : 1;
        this.instanceData[baseIndex + 5] = object.color ? object.color[1] : 1;
        this.instanceData[baseIndex + 6] = object.color ? object.color[2] : 1;
        this.instanceData[baseIndex + 7] = object.color ? object.color[3] : 1;

        this.instanceCount++;
    }

    renderInstances() {
        // Update instance buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.instanceData.subarray(0, this.instanceCount * 8));

        // Draw all instances
        this.gl.drawArraysInstanced(this.gl.TRIANGLE_FAN, 0, 32, this.instanceCount);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
        
        // Update frustum
        this.frustum = {
            left: 0,
            right: width,
            top: 0,
            bottom: height
        };
    }

    destroy() {
        if (this.gl) {
            this.gl.deleteProgram(this.program);
            this.gl.deleteBuffer(this.positionBuffer);
            this.gl.deleteBuffer(this.colorBuffer);
            this.gl.deleteBuffer(this.instanceBuffer);
            this.gl.deleteTexture(this.textureAtlas);
        }
        this.initialized = false;
    }
} 