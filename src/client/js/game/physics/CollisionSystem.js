// CollisionSystem.js - Advanced collision detection and response system
export class CollisionSystem {
    constructor(options = {}) {
        this.options = {
            gridSize: options.gridSize || 30,
            maxCollisionChecks: options.maxCollisionChecks || 1000,
            collisionIterations: options.collisionIterations || 4,
            restitution: options.restitution || 0.8,
            friction: options.friction || 0.1,
            penetrationThreshold: options.penetrationThreshold || 0.1,
            velocityThreshold: options.velocityThreshold || 0.1
        };

        // Spatial partitioning grid
        this.grid = new Map();
        this.gridBounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0
        };

        // Collision cache
        this.collisionCache = new Map();
        this.lastCollisionTime = 0;
        this.collisionCooldown = 100; // ms

        // Debug visualization
        this.debug = {
            enabled: false,
            drawGrid: false,
            drawCollisions: false,
            drawVelocities: false
        };
    }

    // Initialize the collision system with field dimensions
    init(width, height) {
        this.gridBounds = {
            minX: 0,
            maxX: width,
            minY: 0,
            maxY: height
        };
        this.clearGrid();
    }

    // Clear the spatial partitioning grid
    clearGrid() {
        this.grid.clear();
    }

    // Get grid cell coordinates for a position
    getGridCell(x, y) {
        const cellX = Math.floor(x / this.options.gridSize);
        const cellY = Math.floor(y / this.options.gridSize);
        return `${cellX},${cellY}`;
    }

    // Add an object to the spatial grid
    addToGrid(object) {
        const cell = this.getGridCell(object.position.x, object.position.y);
        if (!this.grid.has(cell)) {
            this.grid.set(cell, new Set());
        }
        this.grid.get(cell).add(object);
    }

    // Remove an object from the spatial grid
    removeFromGrid(object) {
        const cell = this.getGridCell(object.position.x, object.position.y);
        if (this.grid.has(cell)) {
            this.grid.get(cell).delete(object);
        }
    }

    // Get nearby objects for collision checking
    getNearbyObjects(object) {
        const nearby = new Set();
        const cellX = Math.floor(object.position.x / this.options.gridSize);
        const cellY = Math.floor(object.position.y / this.options.gridSize);

        // Check surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                if (this.grid.has(key)) {
                    this.grid.get(key).forEach(obj => {
                        if (obj !== object) {
                            nearby.add(obj);
                        }
                    });
                }
            }
        }

        return nearby;
    }

    // Check for collisions between objects
    checkCollisions(objects) {
        const collisions = [];
        let checks = 0;

        // Clear and rebuild spatial grid
        this.clearGrid();
        objects.forEach(obj => this.addToGrid(obj));

        // Check each object against nearby objects
        for (const object of objects) {
            const nearby = this.getNearbyObjects(object);
            
            for (const other of nearby) {
                if (checks >= this.options.maxCollisionChecks) break;
                checks++;

                const collision = this.checkCollision(object, other);
                if (collision) {
                    collisions.push(collision);
                }
            }
        }

        return collisions;
    }

    // Check collision between two objects
    checkCollision(obj1, obj2) {
        // Skip if objects are the same or if collision is on cooldown
        if (obj1 === obj2) return null;
        
        const key = this.getCollisionKey(obj1, obj2);
        const now = Date.now();
        if (this.collisionCache.has(key) && now - this.collisionCache.get(key) < this.collisionCooldown) {
            return null;
        }

        // Calculate distance between objects
        const dx = obj2.position.x - obj1.position.x;
        const dy = obj2.position.y - obj1.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = obj1.radius + obj2.radius;

        // Check if objects are colliding
        if (distance < minDistance) {
            // Calculate collision normal
            const nx = dx / distance;
            const ny = dy / distance;

            // Calculate relative velocity
            const vx = obj2.velocity.x - obj1.velocity.x;
            const vy = obj2.velocity.y - obj1.velocity.y;
            const relativeVelocity = Math.sqrt(vx * vx + vy * vy);

            // Skip if objects are moving apart
            if (vx * nx + vy * ny > 0) return null;

            // Calculate penetration depth
            const penetration = minDistance - distance;

            // Cache collision
            this.collisionCache.set(key, now);

            return {
                obj1,
                obj2,
                normal: { x: nx, y: ny },
                penetration,
                relativeVelocity,
                point: {
                    x: obj1.position.x + nx * obj1.radius,
                    y: obj1.position.y + ny * obj1.radius
                }
            };
        }

        return null;
    }

    // Resolve a collision between two objects
    resolveCollision(collision) {
        const { obj1, obj2, normal, penetration, relativeVelocity } = collision;

        // Skip if relative velocity is too small
        if (relativeVelocity < this.options.velocityThreshold) return;

        // Calculate impulse
        const impulse = -(1 + this.options.restitution) * relativeVelocity;
        const totalMass = obj1.mass + obj2.mass;

        // Apply impulse to objects
        const impulseX = normal.x * impulse / totalMass;
        const impulseY = normal.y * impulse / totalMass;

        obj1.velocity.x -= impulseX * obj2.mass;
        obj1.velocity.y -= impulseY * obj2.mass;
        obj2.velocity.x += impulseX * obj1.mass;
        obj2.velocity.y += impulseY * obj1.mass;

        // Apply friction
        const friction = this.options.friction * relativeVelocity;
        obj1.velocity.x *= (1 - friction);
        obj1.velocity.y *= (1 - friction);
        obj2.velocity.x *= (1 - friction);
        obj2.velocity.y *= (1 - friction);

        // Separate objects to prevent sticking
        if (penetration > this.options.penetrationThreshold) {
            const separationX = normal.x * penetration * 0.5;
            const separationY = normal.y * penetration * 0.5;
            
            obj1.position.x -= separationX;
            obj1.position.y -= separationY;
            obj2.position.x += separationX;
            obj2.position.y += separationY;
        }

        // Update object properties
        if (obj1.onCollision) obj1.onCollision(collision);
        if (obj2.onCollision) obj2.onCollision(collision);
    }

    // Get a unique key for a collision pair
    getCollisionKey(obj1, obj2) {
        const id1 = obj1.id || obj1;
        const id2 = obj2.id || obj2;
        return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
    }

    // Update the collision system
    update(objects, deltaTime) {
        // Clear collision cache periodically
        if (Date.now() - this.lastCollisionTime > 1000) {
            this.collisionCache.clear();
            this.lastCollisionTime = Date.now();
        }

        // Check and resolve collisions
        for (let i = 0; i < this.options.collisionIterations; i++) {
            const collisions = this.checkCollisions(objects);
            if (collisions.length === 0) break;

            collisions.forEach(collision => this.resolveCollision(collision));
        }
    }

    // Debug visualization
    drawDebug(ctx) {
        if (!this.debug.enabled) return;

        if (this.debug.drawGrid) {
            this.drawGrid(ctx);
        }

        if (this.debug.drawCollisions) {
            this.drawCollisions(ctx);
        }

        if (this.debug.drawVelocities) {
            this.drawVelocities(ctx);
        }
    }

    drawGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridBounds.maxX; x += this.options.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gridBounds.maxY);
            ctx.stroke();
        }

        for (let y = 0; y <= this.gridBounds.maxY; y += this.options.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gridBounds.maxX, y);
            ctx.stroke();
        }
    }

    drawCollisions(ctx) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;

        this.collisionCache.forEach((time, key) => {
            const [id1, id2] = key.split('-');
            const obj1 = this.findObjectById(id1);
            const obj2 = this.findObjectById(id2);

            if (obj1 && obj2) {
                ctx.beginPath();
                ctx.moveTo(obj1.position.x, obj1.position.y);
                ctx.lineTo(obj2.position.x, obj2.position.y);
                ctx.stroke();
            }
        });
    }

    drawVelocities(ctx) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 1;

        this.grid.forEach(objects => {
            objects.forEach(obj => {
                if (obj.velocity) {
                    const speed = Math.sqrt(
                        obj.velocity.x * obj.velocity.x +
                        obj.velocity.y * obj.velocity.y
                    );

                    if (speed > 0) {
                        ctx.beginPath();
                        ctx.moveTo(obj.position.x, obj.position.y);
                        ctx.lineTo(
                            obj.position.x + obj.velocity.x * 10,
                            obj.position.y + obj.velocity.y * 10
                        );
                        ctx.stroke();
                    }
                }
            });
        });
    }

    findObjectById(id) {
        for (const objects of this.grid.values()) {
            for (const obj of objects) {
                if (obj.id === id) return obj;
            }
        }
        return null;
    }
} 