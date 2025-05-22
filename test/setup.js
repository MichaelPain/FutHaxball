// Mock WebGL context
const mockWebGLContext = {
    createShader: jest.fn(),
    shaderSource: jest.fn(),
    compileShader: jest.fn(),
    createProgram: jest.fn(),
    attachShader: jest.fn(),
    linkProgram: jest.fn(),
    getProgramParameter: jest.fn(),
    getProgramInfoLog: jest.fn(),
    getAttribLocation: jest.fn(),
    getUniformLocation: jest.fn(),
    createBuffer: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    vertexAttribPointer: jest.fn(),
    drawArrays: jest.fn(),
    clear: jest.fn(),
    clearColor: jest.fn(),
    viewport: jest.fn(),
    enable: jest.fn(),
    blendFunc: jest.fn(),
    deleteProgram: jest.fn(),
    deleteBuffer: jest.fn(),
    useProgram: jest.fn(),
    uniform2f: jest.fn(),
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_FAN: 6,
    COLOR_BUFFER_BIT: 16384,
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    LINK_STATUS: 35714,
    BLEND: 3042,
    SRC_ALPHA: 770,
    ONE_MINUS_SRC_ALPHA: 771
};

// Mock canvas
const mockCanvas = {
    getContext: jest.fn().mockReturnValue(mockWebGLContext),
    width: 800,
    height: 600
};

// Mock document
global.document = {
    createElement: jest.fn().mockReturnValue(mockCanvas)
};

// Mock window
global.window = {
    WebGLRenderingContext: true,
    requestAnimationFrame: jest.fn(),
    cancelAnimationFrame: jest.fn()
};

// Mock performance
global.performance = {
    now: jest.fn().mockReturnValue(0)
};

// Mock console
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}; 