import { ModernHaxballField } from '../game/modern-haxball-field';
import { jest } from '@jest/globals';

describe('Game Performance Tests', () => {
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

  describe('Frame Rate Tests', () => {
    test('maintains 60 FPS under normal load', () => {
      const frameTimes = [];
      const testDuration = 1000; // 1 second
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const frameStart = performance.now();
        game.update(16);
        frameTimes.push(performance.now() - frameStart);
      }
      
      const averageFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      expect(averageFrameTime).toBeLessThan(16.67); // 60 FPS = 16.67ms per frame
    });

    test('maintains 30 FPS under heavy load', () => {
      // Create heavy load
      for (let i = 0; i < 1000; i++) {
        game.particles.create({
          type: 'ballTrail',
          position: { x: Math.random() * 800, y: Math.random() * 600 }
        });
      }
      
      const frameTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const frameStart = performance.now();
        game.update(16);
        frameTimes.push(performance.now() - frameStart);
      }
      
      const averageFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      expect(averageFrameTime).toBeLessThan(33.33); // 30 FPS = 33.33ms per frame
    });
  });

  describe('Memory Usage Tests', () => {
    test('memory usage under normal operation', () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        game.update(16);
      }
      
      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(1000000); // Less than 1MB increase
    });

    test('memory cleanup after heavy load', () => {
      // Create heavy load
      for (let i = 0; i < 1000; i++) {
        game.particles.create({
          type: 'ballTrail',
          position: { x: Math.random() * 800, y: Math.random() * 600 }
        });
      }
      
      const peakMemory = performance.memory.usedJSHeapSize;
      game.update(16); // Trigger cleanup
      const finalMemory = performance.memory.usedJSHeapSize;
      
      expect(finalMemory).toBeLessThan(peakMemory);
    });
  });

  describe('Rendering Performance Tests', () => {
    test('sprite rendering performance', () => {
      const renderTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const renderStart = performance.now();
        game.render();
        renderTimes.push(performance.now() - renderStart);
      }
      
      const averageRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(8); // Should take less than 8ms
    });

    test('particle system rendering performance', () => {
      // Create particle load
      for (let i = 0; i < 500; i++) {
        game.particles.create({
          type: 'ballTrail',
          position: { x: Math.random() * 800, y: Math.random() * 600 }
        });
      }
      
      const renderTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const renderStart = performance.now();
        game.render();
        renderTimes.push(performance.now() - renderStart);
      }
      
      const averageRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(16); // Should take less than 16ms
    });
  });

  describe('Physics Performance Tests', () => {
    test('collision detection performance', () => {
      const collisionTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const collisionStart = performance.now();
        game.ballPhysicsSystem.checkCollisions();
        collisionTimes.push(performance.now() - collisionStart);
      }
      
      const averageCollisionTime = collisionTimes.reduce((a, b) => a + b) / collisionTimes.length;
      expect(averageCollisionTime).toBeLessThan(1); // Should take less than 1ms
    });

    test('physics update performance under load', () => {
      // Create physics load
      for (let i = 0; i < 10; i++) {
        const ball = game.ballPhysicsSystem;
        ball.applyForce(10, { x: Math.random() - 0.5, y: Math.random() - 0.5 });
      }
      
      const physicsTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const physicsStart = performance.now();
        game.update(16);
        physicsTimes.push(performance.now() - physicsStart);
      }
      
      const averagePhysicsTime = physicsTimes.reduce((a, b) => a + b) / physicsTimes.length;
      expect(averagePhysicsTime).toBeLessThan(8); // Should take less than 8ms
    });
  });

  describe('Audio Performance Tests', () => {
    test('sound playback performance', () => {
      const playbackTimes = [];
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        const playbackStart = performance.now();
        game.playSound('kick');
        playbackTimes.push(performance.now() - playbackStart);
      }
      
      const averagePlaybackTime = playbackTimes.reduce((a, b) => a + b) / playbackTimes.length;
      expect(averagePlaybackTime).toBeLessThan(1); // Should take less than 1ms
    });

    test('audio system memory usage', () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      const testDuration = 1000;
      const startTime = performance.now();
      
      while (performance.now() - startTime < testDuration) {
        game.playSound('kick');
      }
      
      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(100000); // Less than 100KB increase
    });
  });
}); 