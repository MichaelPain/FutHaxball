class PerformanceOverlay {
    constructor(container, performanceMonitor) {
        this.container = container;
        this.performanceMonitor = performanceMonitor;
        this.visible = false;
        this.createOverlay();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'performance-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            display: none;
            pointer-events: none;
        `;

        this.metricsContainer = document.createElement('div');
        this.overlay.appendChild(this.metricsContainer);
        this.container.appendChild(this.overlay);

        // Add keyboard shortcut to toggle overlay (Alt + P)
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'p') {
                this.toggle();
            }
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.overlay.style.display = this.visible ? 'block' : 'none';
        if (this.visible) {
            this.update();
        }
    }

    update() {
        if (!this.visible) return;

        const metrics = this.performanceMonitor.getMetrics();
        const warnings = this.performanceMonitor.getWarnings();

        let html = `
            <div style="margin-bottom: 5px;">
                <span style="color: ${this.getFPSColor(metrics.fps.current)}">FPS: ${Math.round(metrics.fps.current)}</span>
                (Avg: ${Math.round(metrics.fps.average)}, Min: ${Math.round(metrics.fps.min)}, Max: ${Math.round(metrics.fps.max)})
            </div>
            <div style="margin-bottom: 5px;">
                Memory: ${this.formatBytes(metrics.memory.used)} / ${this.formatBytes(metrics.memory.total)}
                (Peak: ${this.formatBytes(metrics.memory.peak)})
            </div>
            <div style="margin-bottom: 5px;">
                Render: ${metrics.render.frameTime.toFixed(2)}ms
                (Draw Calls: ${metrics.render.drawCalls}, Triangles: ${metrics.render.triangles})
            </div>
            <div style="margin-bottom: 5px;">
                Network: ${metrics.network.latency}ms
                (Loss: ${metrics.network.packetLoss}%, BW: ${this.formatBytes(metrics.network.bandwidth)}/s)
            </div>
        `;

        if (warnings.length > 0) {
            html += `
                <div style="margin-top: 5px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px;">
                    Warnings:
                    ${warnings.map(warning => `<div style="color: #ff6b6b;">${this.formatWarning(warning)}</div>`).join('')}
                </div>
            `;
        }

        this.metricsContainer.innerHTML = html;

        if (this.visible) {
            requestAnimationFrame(() => this.update());
        }
    }

    getFPSColor(fps) {
        if (fps >= 55) return '#4caf50'; // Green
        if (fps >= 30) return '#ffc107'; // Yellow
        return '#f44336'; // Red
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatWarning(warning) {
        const warnings = {
            'low_fps': 'Low FPS detected',
            'high_memory': 'High memory usage',
            'high_latency': 'High network latency'
        };
        return warnings[warning] || warning;
    }
}

export default PerformanceOverlay; 