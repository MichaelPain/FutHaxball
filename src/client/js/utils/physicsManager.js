/**
 * Physics management system
 */
import eventManager from './eventManager';
import securityLogger from './securityLogger';
import performanceManager from './performanceManager';
import animationManager from './animationManager';

class PhysicsManager {
  constructor() {
    this.objects = new Map();
    this.colliders = new Map();
    this.gravity = { x: 0, y: 0 };
    this.friction = 0.98;
    this.restitution = 0.8;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.frameId = null;
    this.timeStep = 1000 / 60; // 60 FPS
    this.maxSteps = 3;
    this.debug = false;

    // Collision types
    this.collisionTypes = {
      CIRCLE: 'circle',
      RECTANGLE: 'rectangle',
      POLYGON: 'polygon'
    };

    // Bind methods
    this.update = this.update.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  /**
   * Starts the physics simulation
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.frameId = requestAnimationFrame(this.update);
      this.logAction('start');
      eventManager.emit('physics:started');
    }
  }

  /**
   * Stops the physics simulation
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      if (this.frameId) {
        cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      this.logAction('stop');
      eventManager.emit('physics:stopped');
    }
  }

  /**
   * Main physics update loop
   * @param {number} timestamp - Current timestamp
   */
  update(timestamp) {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // Calculate number of steps
    const steps = Math.min(Math.floor(deltaTime / this.timeStep), this.maxSteps);
    const stepTime = deltaTime / steps;

    // Update physics for each step
    for (let i = 0; i < steps; i++) {
      this.step(stepTime);
    }

    // Schedule next frame
    this.frameId = requestAnimationFrame(this.update);
  }

  /**
   * Performs a single physics step
   * @param {number} deltaTime - Time step
   */
  step(deltaTime) {
    try {
      // Update object positions
      for (const [id, object] of this.objects) {
        if (object.isActive) {
          this.updateObject(id, object, deltaTime);
        }
      }

      // Check collisions
      this.checkCollisions();

      // Emit update event
      eventManager.emit('physics:updated', { deltaTime });
    } catch (error) {
      this.logError('step', error);
    }
  }

  /**
   * Updates a physics object
   * @param {string} id - Object ID
   * @param {Object} object - Physics object
   * @param {number} deltaTime - Time step
   */
  updateObject(id, object, deltaTime) {
    const { position, velocity, acceleration, mass } = object;

    // Apply gravity
    if (object.useGravity) {
      velocity.x += this.gravity.x * deltaTime;
      velocity.y += this.gravity.y * deltaTime;
    }

    // Apply acceleration
    velocity.x += acceleration.x * deltaTime;
    velocity.y += acceleration.y * deltaTime;

    // Apply friction
    velocity.x *= this.friction;
    velocity.y *= this.friction;

    // Update position
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;

    // Apply constraints
    if (object.constraints) {
      this.applyConstraints(object);
    }

    // Emit object update event
    eventManager.emit('physics:object_updated', { id, object });
  }

  /**
   * Applies constraints to an object
   * @param {Object} object - Physics object
   */
  applyConstraints(object) {
    const { position, velocity, constraints } = object;

    // Apply position constraints
    if (constraints.minX !== undefined) {
      position.x = Math.max(position.x, constraints.minX);
      if (position.x === constraints.minX) velocity.x = Math.max(0, velocity.x);
    }
    if (constraints.maxX !== undefined) {
      position.x = Math.min(position.x, constraints.maxX);
      if (position.x === constraints.maxX) velocity.x = Math.min(0, velocity.x);
    }
    if (constraints.minY !== undefined) {
      position.y = Math.max(position.y, constraints.minY);
      if (position.y === constraints.minY) velocity.y = Math.max(0, velocity.y);
    }
    if (constraints.maxY !== undefined) {
      position.y = Math.min(position.y, constraints.maxY);
      if (position.y === constraints.maxY) velocity.y = Math.min(0, velocity.y);
    }
  }

  /**
   * Checks for collisions between objects
   */
  checkCollisions() {
    const objects = Array.from(this.objects.values());
    
    for (let i = 0; i < objects.length; i++) {
      const obj1 = objects[i];
      if (!obj1.isActive) continue;

      for (let j = i + 1; j < objects.length; j++) {
        const obj2 = objects[j];
        if (!obj2.isActive) continue;

        // Skip if objects are in the same group and group collisions are disabled
        if (obj1.group === obj2.group && !obj1.groupCollisions) continue;

        // Check collision based on collider types
        const collision = this.checkCollision(obj1, obj2);
        if (collision) {
          this.resolveCollision(obj1, obj2, collision);
        }
      }
    }
  }

  /**
   * Checks for collision between two objects
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {Object|null} Collision data or null
   */
  checkCollision(obj1, obj2) {
    const collider1 = this.colliders.get(obj1.id);
    const collider2 = this.colliders.get(obj2.id);

    if (!collider1 || !collider2) return null;

    switch (collider1.type) {
      case this.collisionTypes.CIRCLE:
        switch (collider2.type) {
          case this.collisionTypes.CIRCLE:
            return this.checkCircleCircle(obj1, obj2, collider1, collider2);
          case this.collisionTypes.RECTANGLE:
            return this.checkCircleRect(obj1, obj2, collider1, collider2);
          case this.collisionTypes.POLYGON:
            return this.checkCirclePolygon(obj1, obj2, collider1, collider2);
        }
        break;
      case this.collisionTypes.RECTANGLE:
        switch (collider2.type) {
          case this.collisionTypes.CIRCLE:
            return this.checkCircleRect(obj2, obj1, collider2, collider1);
          case this.collisionTypes.RECTANGLE:
            return this.checkRectRect(obj1, obj2, collider1, collider2);
          case this.collisionTypes.POLYGON:
            return this.checkRectPolygon(obj1, obj2, collider1, collider2);
        }
        break;
      case this.collisionTypes.POLYGON:
        switch (collider2.type) {
          case this.collisionTypes.CIRCLE:
            return this.checkCirclePolygon(obj2, obj1, collider2, collider1);
          case this.collisionTypes.RECTANGLE:
            return this.checkRectPolygon(obj2, obj1, collider2, collider1);
          case this.collisionTypes.POLYGON:
            return this.checkPolygonPolygon(obj1, obj2, collider1, collider2);
        }
        break;
    }

    return null;
  }

  /**
   * Resolves a collision between two objects
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @param {Object} collision - Collision data
   */
  resolveCollision(obj1, obj2, collision) {
    const { normal, depth } = collision;
    const { position: pos1, velocity: vel1, mass: mass1 } = obj1;
    const { position: pos2, velocity: vel2, mass: mass2 } = obj2;

    // Calculate relative velocity
    const relativeVelocity = {
      x: vel1.x - vel2.x,
      y: vel1.y - vel2.y
    };

    // Calculate relative velocity along normal
    const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

    // Do not resolve if objects are moving apart
    if (velocityAlongNormal > 0) return;

    // Calculate restitution
    const restitution = Math.min(obj1.restitution || this.restitution, obj2.restitution || this.restitution);

    // Calculate impulse scalar
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    const totalMass = mass1 + mass2;
    const impulse = {
      x: normal.x * impulseScalar / totalMass,
      y: normal.y * impulseScalar / totalMass
    };

    // Apply impulse
    if (!obj1.isStatic) {
      vel1.x -= impulse.x * mass2;
      vel1.y -= impulse.y * mass2;
    }
    if (!obj2.isStatic) {
      vel2.x += impulse.x * mass1;
      vel2.y += impulse.y * mass1;
    }

    // Positional correction
    const percent = 0.2;
    const correction = {
      x: normal.x * depth * percent / totalMass,
      y: normal.y * depth * percent / totalMass
    };

    if (!obj1.isStatic) {
      pos1.x -= correction.x * mass2;
      pos1.y -= correction.y * mass2;
    }
    if (!obj2.isStatic) {
      pos2.x += correction.x * mass1;
      pos2.y += correction.y * mass1;
    }

    // Emit collision event
    eventManager.emit('physics:collision', {
      obj1: { id: obj1.id, position: pos1, velocity: vel1 },
      obj2: { id: obj2.id, position: pos2, velocity: vel2 },
      collision
    });
  }

  /**
   * Creates a new physics object
   * @param {string} id - Object ID
   * @param {Object} options - Object options
   * @returns {string} Object ID
   */
  create(id, options = {}) {
    const object = {
      id,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
      isStatic: false,
      useGravity: true,
      isActive: true,
      group: 'default',
      groupCollisions: true,
      constraints: null,
      ...options
    };

    this.objects.set(id, object);
    this.logAction('create', { id });

    // Start physics if not running
    if (!this.isRunning) {
      this.start();
    }

    return id;
  }

  /**
   * Adds a collider to an object
   * @param {string} id - Object ID
   * @param {string} type - Collider type
   * @param {Object} options - Collider options
   */
  addCollider(id, type, options = {}) {
    const collider = {
      type,
      ...options
    };

    this.colliders.set(id, collider);
    this.logAction('add_collider', { id, type });
  }

  /**
   * Removes a physics object
   * @param {string} id - Object ID
   */
  remove(id) {
    if (this.objects.has(id)) {
      this.objects.delete(id);
      this.colliders.delete(id);
      this.logAction('remove', { id });
      eventManager.emit('physics:removed', { id });
    }
  }

  /**
   * Sets the gravity
   * @param {number} x - X component
   * @param {number} y - Y component
   */
  setGravity(x, y) {
    this.gravity = { x, y };
    this.logAction('set_gravity', { x, y });
  }

  /**
   * Sets the friction coefficient
   * @param {number} friction - Friction coefficient
   */
  setFriction(friction) {
    this.friction = friction;
    this.logAction('set_friction', { friction });
  }

  /**
   * Sets the restitution coefficient
   * @param {number} restitution - Restitution coefficient
   */
  setRestitution(restitution) {
    this.restitution = restitution;
    this.logAction('set_restitution', { restitution });
  }

  /**
   * Sets the time step
   * @param {number} timeStep - Time step in milliseconds
   */
  setTimeStep(timeStep) {
    this.timeStep = timeStep;
    this.logAction('set_time_step', { timeStep });
  }

  /**
   * Sets the maximum number of physics steps
   * @param {number} maxSteps - Maximum steps
   */
  setMaxSteps(maxSteps) {
    this.maxSteps = maxSteps;
    this.logAction('set_max_steps', { maxSteps });
  }

  /**
   * Enables or disables debug mode
   * @param {boolean} debug - Whether debug mode should be enabled
   */
  setDebug(debug) {
    this.debug = debug;
    this.logAction('set_debug', { debug });
  }

  /**
   * Gets a physics object
   * @param {string} id - Object ID
   * @returns {Object} Physics object
   */
  get(id) {
    return this.objects.get(id);
  }

  /**
   * Gets all physics objects
   * @returns {Array} Physics objects
   */
  getAll() {
    return Array.from(this.objects.values());
  }

  /**
   * Gets all active physics objects
   * @returns {Array} Active physics objects
   */
  getActive() {
    return Array.from(this.objects.values())
      .filter(object => object.isActive);
  }

  /**
   * Logs a physics action
   * @param {string} action - Action type
   * @param {Object} [data] - Action data
   */
  logAction(action, data = {}) {
    securityLogger.log(
      'PHYSICS',
      `Physics ${action}`,
      'INFO',
      data
    );
  }

  /**
   * Logs a physics error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   * @param {Object} [data] - Additional data
   */
  logError(action, error, data = {}) {
    securityLogger.log(
      'PHYSICS',
      `Physics error during ${action}: ${error.message}`,
      'ERROR',
      {
        ...data,
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const physicsManager = new PhysicsManager();
export default physicsManager; 