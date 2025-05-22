class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                samples: []
            },
            memory: {
                used: 0,
                total: 0,
                peak: 0
            },
            render: {
                frameTime: 0,
                drawCalls: 0,
                triangles: 0
            },
            network: {
                latency: 0,
                packetLoss: 0,
                bandwidth: 0
            }
        };

        this.settings = {
            sampleSize: 60, // 1 second at 60fps
            updateInterval: 1000, // Update metrics every second
            warningThresholds: {
                fps: 30,
                memory: 0.8, // 80% of available memory
                latency: 100 // ms
            }
        };

        this.warnings = new Set();
        this.lastUpdate = performance.now();
        this.frameCount = 0;
        this.isMonitoring = false;
    }

    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.lastUpdate = performance.now();
        this.frameCount = 0;
        this.updateMetrics();
    }

    stop() {
        this.isMonitoring = false;
    }

    updateMetrics() {
        if (!this.isMonitoring) return;

        const now = performance.now();
        const deltaTime = now - this.lastUpdate;
        this.frameCount++;

        // Update FPS metrics
        if (deltaTime >= this.settings.updateInterval) {
            const currentFps = (this.frameCount * 1000) / deltaTime;
            this.metrics.fps.current = currentFps;
            this.metrics.fps.samples.push(currentFps);
            
            if (this.metrics.fps.samples.length > this.settings.sampleSize) {
                this.metrics.fps.samples.shift();
            }

            this.metrics.fps.average = this.metrics.fps.samples.reduce((a, b) => a + b) / this.metrics.fps.samples.length;
            this.metrics.fps.min = Math.min(...this.metrics.fps.samples);
            this.metrics.fps.max = Math.max(...this.metrics.fps.samples);

            // Update memory metrics if available
            if (performance.memory) {
                this.metrics.memory.used = performance.memory.usedJSHeapSize;
                this.metrics.memory.total = performance.memory.totalJSHeapSize;
                this.metrics.memory.peak = Math.max(this.metrics.memory.peak, this.metrics.memory.used);
            }

            // Check for performance warnings
            this.checkWarnings();

            // Reset counters
            this.frameCount = 0;
            this.lastUpdate = now;
        }

        requestAnimationFrame(() => this.updateMetrics());
    }

    checkWarnings() {
        // Check FPS
        if (this.metrics.fps.current < this.settings.warningThresholds.fps) {
            this.warnings.add('low_fps');
        } else {
            this.warnings.delete('low_fps');
        }

        // Check memory
        if (this.metrics.memory.used / this.metrics.memory.total > this.settings.warningThresholds.memory) {
            this.warnings.add('high_memory');
        } else {
            this.warnings.delete('high_memory');
        }

        // Check latency
        if (this.metrics.network.latency > this.settings.warningThresholds.latency) {
            this.warnings.add('high_latency');
        } else {
            this.warnings.delete('high_latency');
        }
    }

    updateRenderMetrics(frameTime, drawCalls, triangles) {
        this.metrics.render.frameTime = frameTime;
        this.metrics.render.drawCalls = drawCalls;
        this.metrics.render.triangles = triangles;
    }

    updateNetworkMetrics(latency, packetLoss, bandwidth) {
        this.metrics.network.latency = latency;
        this.metrics.network.packetLoss = packetLoss;
        this.metrics.network.bandwidth = bandwidth;
    }

    getMetrics() {
        return { ...this.metrics };
    }

    getWarnings() {
        return Array.from(this.warnings);
    }

    setWarningThresholds(thresholds) {
        this.settings.warningThresholds = {
            ...this.settings.warningThresholds,
            ...thresholds
        };
    }
}

export default PerformanceMonitor; 