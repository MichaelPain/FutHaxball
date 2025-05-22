import { ModernHaxballField } from '../game/modern-haxball-field';
import { jest } from '@jest/globals';

describe('Game Integration Tests', () => {
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

  describe('Physics and Rendering Integration', () => {
    test('ball movement affects rendering', () => {
      const ball = game.ballPhysicsSystem;
      ball.applyForce(10, { x: 1, y: 0 });
      game.update(16);
      
      const ballSprite = game.sprites.get('ball');
      expect(ballSprite.position.x).toBe(ball.position.x);
      expect(ballSprite.position.y).toBe(ball.position.y);
    });

    test('collision triggers effects', () => {
      const ball = game.ballPhysicsSystem;
      const player = game.players.get(1);
      
      ball.position = { x: 100, y: 100 };
      player.position = { x: 100, y: 100 };
      
      game.update(16);
      expect(game.particles.state.particles.length).toBeGreaterThan(0);
    });
  });

  describe('Audio and Event Integration', () => {
    test('goal triggers sound and effects', () => {
      const ball = game.ballPhysicsSystem;
      ball.position = { x: 0, y: 0 };
      
      game.update(16);
      expect(game.sound.state.lastPlayed.get('goal')).toBeDefined();
      expect(game.particles.state.particles.length).toBeGreaterThan(0);
    });

    test('kick triggers sound and particles', () => {
      const player = game.players.get(1);
      player.kick();
      
      expect(game.sound.state.lastPlayed.get('kick')).toBeDefined();
      expect(game.particles.state.particles.length).toBeGreaterThan(0);
    });
  });

  describe('Weather and Physics Integration', () => {
    test('weather affects ball physics', () => {
      game.setWeather('rain', 0.5);
      const ball = game.ballPhysicsSystem;
      const initialVelocity = { ...ball.velocity };
      
      game.update(16);
      expect(ball.velocity.x).not.toBe(initialVelocity.x);
      expect(ball.velocity.y).not.toBe(initialVelocity.y);
    });

    test('weather affects player movement', () => {
      game.setWeather('rain', 0.5);
      const player = game.players.get(1);
      const initialPosition = { ...player.position };
      
      player.move({ x: 1, y: 0 });
      game.update(16);
      
      expect(player.position.x).toBeLessThan(initialPosition.x + 1);
    });
  });

  describe('Team Strategy and Player Integration', () => {
    test('strategy affects player behavior', () => {
      const team = 1;
      game.setTeamStrategy(team, 'possession');
      const player = game.players.get(1);
      
      game.update(16);
      expect(player.targetPosition).toBeDefined();
    });

    test('formation affects player positions', () => {
      const team = 1;
      game.setTeamStrategy(team, 'possession');
      const initialPositions = game.players.getAll().map(p => ({ ...p.position }));
      
      game.update(16);
      const newPositions = game.players.getAll().map(p => ({ ...p.position }));
      
      expect(newPositions).not.toEqual(initialPositions);
    });
  });

  describe('Error Recovery Integration', () => {
    test('physics error triggers recovery', () => {
      const error = new Error('Physics error');
      game.errorHandler.handleError(error, 'physics');
      
      expect(game.ballPhysicsSystem.isValid()).toBe(true);
      expect(game.players.getAll().every(p => p.isValid())).toBe(true);
    });

    test('rendering error triggers fallback', () => {
      const error = new Error('Rendering error');
      game.errorHandler.handleError(error, 'rendering');
      
      expect(game.canvas).toBeDefined();
      expect(game.ctx).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    test('high load affects quality settings', () => {
      // Simulate high load
      for (let i = 0; i < 1000; i++) {
        game.particles.create({
          type: 'ballTrail',
          position: { x: Math.random() * 800, y: Math.random() * 600 }
        });
      }
      
      game.update(16);
      expect(game.config.quality).toBe('low');
    });

    test('memory pressure triggers cleanup', () => {
      // Simulate memory pressure
      const initialMemory = performance.memory.usedJSHeapSize;
      while (performance.memory.usedJSHeapSize - initialMemory < 1000000) {
        game.particles.create({
          type: 'ballTrail',
          position: { x: Math.random() * 800, y: Math.random() * 600 }
        });
      }
      
      game.update(16);
      expect(game.particles.state.particles.length).toBeLessThan(1000);
    });
  });
}); 