// test/webglRendererTest.js - Test suite for WebGL renderer

const { WebGLRenderer } = require('../src/client/js/game/WebGLRenderer');

describe('WebGLRenderer', () => {
    let canvas;
    let renderer;
    const width = 800;
    const height = 600;

    beforeEach(() => {
        // Create a canvas element
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Create renderer instance
        renderer = new WebGLRenderer(canvas, width, height);
    });

    afterEach(() => {
        if (renderer) {
            renderer.destroy();
        }
    });

    describe('Initialization', () => {
        it('should initialize WebGL context', () => {
            expect(renderer.gl).toBeTruthy();
            expect(renderer.program).toBeTruthy();
            expect(renderer.initialized).toBe(true);
        });

        it('should initialize shaders correctly', () => {
            expect(renderer.positionLocation).toBeDefined();
            expect(renderer.colorLocation).toBeDefined();
            expect(renderer.resolutionLocation).toBeDefined();
        });

        it('should initialize buffers', () => {
            expect(renderer.positionBuffer).toBeTruthy();
            expect(renderer.colorBuffer).toBeTruthy();
        });

        it('should initialize object pools', () => {
            expect(renderer.objectPool.get('circle')).toBeDefined();
            expect(renderer.objectPool.get('player')).toBeDefined();
            expect(renderer.objectPool.get('particle')).toBeDefined();
            expect(renderer.objectPool.get('effect')).toBeDefined();
        });
    });

    describe('Object Pooling', () => {
        it('should create new objects when pool is empty', () => {
            const circle = renderer.getObject('circle');
            expect(circle).toBeTruthy();
            expect(circle.vertices).toBeDefined();
            expect(circle.color).toBeDefined();
            expect(circle.scale).toBeDefined();
            expect(circle.position).toBeDefined();
        });

        it('should reuse objects from pool when available', () => {
            const circle1 = renderer.getObject('circle');
            renderer.releaseObject('circle', circle1);
            const circle2 = renderer.getObject('circle');
            expect(circle2).toBe(circle1);
        });

        it('should limit pool size', () => {
            const objects = [];
            for (let i = 0; i < 1100; i++) {
                const obj = renderer.getObject('circle');
                objects.push(obj);
            }
            objects.forEach(obj => renderer.releaseObject('circle', obj));
            expect(renderer.objectPool.get('circle').length).toBeLessThanOrEqual(1000);
        });
    });

    describe('Rendering', () => {
        it('should render objects correctly', () => {
            const objects = [{
                type: 'circle',
                position: { x: 400, y: 300 },
                radius: 20,
                color: [1, 0, 0, 1]
            }];

            // Mock WebGL context methods
            const mockClear = jest.fn();
            const mockUseProgram = jest.fn();
            const mockUniform2f = jest.fn();
            const mockBindBuffer = jest.fn();
            const mockBufferData = jest.fn();
            const mockEnableVertexAttribArray = jest.fn();
            const mockVertexAttribPointer = jest.fn();
            const mockDrawArrays = jest.fn();

            renderer.gl.clear = mockClear;
            renderer.gl.useProgram = mockUseProgram;
            renderer.gl.uniform2f = mockUniform2f;
            renderer.gl.bindBuffer = mockBindBuffer;
            renderer.gl.bufferData = mockBufferData;
            renderer.gl.enableVertexAttribArray = mockEnableVertexAttribArray;
            renderer.gl.vertexAttribPointer = mockVertexAttribPointer;
            renderer.gl.drawArrays = mockDrawArrays;

            renderer.render(objects);

            expect(mockClear).toHaveBeenCalled();
            expect(mockUseProgram).toHaveBeenCalled();
            expect(mockUniform2f).toHaveBeenCalledWith(renderer.resolutionLocation, width, height);
            expect(mockBindBuffer).toHaveBeenCalled();
            expect(mockBufferData).toHaveBeenCalled();
            expect(mockEnableVertexAttribArray).toHaveBeenCalled();
            expect(mockVertexAttribPointer).toHaveBeenCalled();
            expect(mockDrawArrays).toHaveBeenCalled();
        });

        it('should handle resize correctly', () => {
            const newWidth = 1024;
            const newHeight = 768;

            renderer.resize(newWidth, newHeight);

            expect(renderer.width).toBe(newWidth);
            expect(renderer.height).toBe(newHeight);
            expect(canvas.width).toBe(newWidth);
            expect(canvas.height).toBe(newHeight);
        });
    });

    describe('Error Handling', () => {
        it('should handle WebGL context creation failure gracefully', () => {
            // Mock canvas.getContext to return null
            canvas.getContext = jest.fn().mockReturnValue(null);
            
            const newRenderer = new WebGLRenderer(canvas, width, height);
            expect(newRenderer.initialized).toBe(false);
        });

        it('should handle shader compilation errors gracefully', () => {
            // Mock shader compilation to fail
            renderer.gl.compileShader = jest.fn().mockImplementation(() => {
                renderer.gl.getShaderParameter = jest.fn().mockReturnValue(false);
                renderer.gl.getShaderInfoLog = jest.fn().mockReturnValue('Shader compilation error');
            });

            const newRenderer = new WebGLRenderer(canvas, width, height);
            expect(newRenderer.initialized).toBe(false);
        });
    });
}); 