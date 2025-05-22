import { ModernHaxballField } from '../game/modern-haxball-field';
import { jest } from '@jest/globals';

describe('Game Systems Tests', () => {
  let game;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    game = new ModernHaxballField(container);
  });

  afterEach(() => {
    game.destroy();
    container.remove();
  });

  describe('Physics System', () => {
    test('ball physics calculations', () => {
      const ball = game.ballPhysicsSystem;
      ball.applyForce(10, { x: 1, y: 0 });
      expect(ball.velocity.x).toBeGreaterThan(0);
      expect(ball.velocity.y).toBe(0);
    });

    test('collision detection', () => {
      const ball = game.ballPhysicsSystem;
      const player = game.players.get(1);
      
      ball.position = { x: 100, y: 100 };
      player.position = { x: 100, y: 100 };
      
      game.ballPhysicsSystem.checkCollisions();
      expect(ball.velocity.x).not.toBe(0);
    });

    test('wall collisions', () => {
      const ball = game.ballPhysicsSystem;
      ball.position = { x: 0, y: 0 };
      ball.velocity = { x: -10, y: 0 };
      
      game.ballPhysicsSystem.checkWallCollisions();
      expect(ball.velocity.x).toBeGreaterThan(0);
    });
  });

  describe('Rendering System', () => {
    test('canvas initialization', () => {
      expect(game.canvas).toBeDefined();
      expect(game.ctx).toBeDefined();
    });

    test('layer management', () => {
      expect(game.layers).toBeDefined();
      expect(game.layers.length).toBeGreaterThan(0);
    });

    test('sprite rendering', () => {
      const sprite = game.sprites.get('ball');
      expect(sprite).toBeDefined();
      expect(sprite.draw).toBeDefined();
    });
  });

  describe('Audio System', () => {
    test('sound loading', () => {
      expect(game.sound.state.loaded.size).toBeGreaterThan(0);
    });

    test('sound playback', () => {
      const soundId = 'kick';
      game.playSound(soundId);
      expect(game.sound.state.lastPlayed.get(soundId)).toBeDefined();
    });

    test('volume control', () => {
      game.sound.config.volume = 0.5;
      expect(game.sound.config.volume).toBe(0.5);
    });
  });

  describe('Particle System', () => {
    test('particle creation', () => {
      const particle = game.particles.create({
        type: 'ballTrail',
        position: { x: 100, y: 100 }
      });
      expect(particle).toBeDefined();
      expect(particle.position).toEqual({ x: 100, y: 100 });
    });

    test('particle update', () => {
      const particle = game.particles.create({
        type: 'ballTrail',
        position: { x: 100, y: 100 },
        velocity: { x: 1, y: 1 }
      });
      
      game.particles.update(16);
      expect(particle.position.x).toBe(116);
      expect(particle.position.y).toBe(116);
    });
  });

  describe('Weather System', () => {
    test('weather effect activation', () => {
      game.setWeather('rain', 0.5);
      expect(game.weather.state.currentEffect).toBe('rain');
    });

    test('weather particle generation', () => {
      game.setWeather('rain', 0.5);
      expect(game.weather.state.particles.length).toBeGreaterThan(0);
    });
  });

  describe('Team Strategies', () => {
    test('strategy application', () => {
      const team = 1;
      game.setTeamStrategy(team, 'possession');
      expect(game.getTeamStrategy(team)).toBe('possession');
    });

    test('player positioning', () => {
      const team = 1;
      game.setTeamStrategy(team, 'possession');
      const positions = game.teamFormationsSystem.getFormationPositions('4-3-3');
      expect(positions).toBeDefined();
      expect(positions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('error recovery', () => {
      const error = new Error('Test error');
      game.errorHandler.handleError(error, 'physics');
      expect(game.errorHandler.state.recoveryAttempts).toBe(1);
    });

    test('error logging', () => {
      const error = new Error('Test error');
      game.errorHandler.handleError(error, 'physics');
      expect(game.errorHandler.state.errors.length).toBe(1);
    });
  });

  describe('Performance', () => {
    test('frame rate maintenance', () => {
      const startTime = performance.now();
      game.update(16);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(16);
    });

    test('memory management', () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      game.update(16);
      const finalMemory = performance.memory.usedJSHeapSize;
      expect(finalMemory - initialMemory).toBeLessThan(1000000);
    });
  });
}); 