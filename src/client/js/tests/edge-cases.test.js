import { ModernHaxballField } from '../game/modern-haxball-field';
import { jest } from '@jest/globals';

describe('Game Edge Case Tests', () => {
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

  describe('Physics Edge Cases', () => {
    test('handles extremely high velocity', () => {
      const ball = game.ballPhysicsSystem;
      ball.applyForce(1000, { x: 1, y: 0 });
      game.update(16);
      
      expect(ball.velocity.x).toBeLessThan(100); // Should be capped
      expect(ball.position.x).toBeLessThan(game.width);
    });

    test('handles multiple simultaneous collisions', () => {
      const ball = game.ballPhysicsSystem;
      const players = game.players;
      
      // Position ball between multiple players
      ball.position = { x: 400, y: 300 };
      players.forEach(player => {
        player.position = { x: 400, y: 300 };
      });
      
      game.update(16);
      expect(ball.velocity.x).not.toBe(0);
      expect(ball.velocity.y).not.toBe(0);
    });

    test('handles ball stuck in corner', () => {
      const ball = game.ballPhysicsSystem;
      ball.position = { x: 0, y: 0 };
      ball.velocity = { x: 0, y: 0 };
      
      game.update(16);
      expect(ball.position.x).toBeGreaterThan(0);
      expect(ball.position.y).toBeGreaterThan(0);
    });
  });

  describe('Rendering Edge Cases', () => {
    test('handles off-screen sprites', () => {
      const ball = game.ballPhysicsSystem;
      ball.position = { x: -1000, y: -1000 };
      
      game.render();
      // Should not throw error
      expect(() => game.render()).not.toThrow();
    });

    test('handles invalid sprite properties', () => {
      const ball = game.ballPhysicsSystem;
      ball.sprite = { ...ball.sprite, width: -1, height: -1 };
      
      game.render();
      // Should handle invalid dimensions gracefully
      expect(() => game.render()).not.toThrow();
    });

    test('handles rapid canvas resizing', () => {
      const sizes = [100, 200, 300, 400, 500];
      sizes.forEach(size => {
        container.style.width = `${size}px`;
        container.style.height = `${size}px`;
        game.resize();
      });
      
      expect(() => game.render()).not.toThrow();
    });
  });

  describe('Audio Edge Cases', () => {
    test('handles rapid sound playback', () => {
      const playPromises = [];
      for (let i = 0; i < 100; i++) {
        playPromises.push(game.playSound('kick'));
      }
      
      return Promise.all(playPromises).then(() => {
        expect(game.sound.state.activeSounds.size).toBeLessThan(10);
      });
    });

    test('handles invalid sound IDs', () => {
      expect(() => game.playSound('nonexistent')).not.toThrow();
    });

    test('handles audio context suspension', () => {
      const audioContext = game.sound.audioContext;
      audioContext.suspend();
      
      game.playSound('kick');
      expect(game.sound.state.activeSounds.size).toBe(0);
      
      audioContext.resume();
    });
  });

  describe('Network Edge Cases', () => {
    test('handles network latency spikes', () => {
      const originalUpdate = game.update;
      let updateCount = 0;
      
      game.update = (delta) => {
        updateCount++;
        if (updateCount === 5) {
          // Simulate network spike
          return new Promise(resolve => setTimeout(() => {
            originalUpdate.call(game, delta);
            resolve();
          }, 1000));
        }
        return originalUpdate.call(game, delta);
      };
      
      return game.update(16).then(() => {
        expect(game.state.isSynchronized).toBe(true);
      });
    });

    test('handles packet loss', () => {
      const originalSend = game.network.send;
      let sendCount = 0;
      
      game.network.send = (data) => {
        sendCount++;
        if (sendCount % 3 === 0) {
          // Simulate packet loss
          return;
        }
        return originalSend.call(game.network, data);
      };
      
      game.update(16);
      expect(game.state.isSynchronized).toBe(true);
    });
  });

  describe('State Management Edge Cases', () => {
    test('handles rapid state changes', () => {
      const states = ['playing', 'paused', 'ended', 'playing'];
      states.forEach(state => {
        game.setState(state);
      });
      
      expect(game.state.current).toBe('playing');
    });

    test('handles invalid state transitions', () => {
      game.setState('ended');
      game.setState('playing');
      
      expect(game.state.current).toBe('playing');
    });

    test('handles state recovery after error', () => {
      game.setState('playing');
      game.handleError(new Error('Test error'));
      
      expect(game.state.current).toBe('playing');
    });
  });

  describe('Input Edge Cases', () => {
    test('handles rapid input changes', () => {
      const inputs = [
        { up: true, down: false },
        { up: false, down: true },
        { up: true, down: true },
        { up: false, down: false }
      ];
      
      inputs.forEach(input => {
        game.handleInput(input);
      });
      
      expect(game.state.lastInput).toEqual(inputs[inputs.length - 1]);
    });

    test('handles invalid input combinations', () => {
      game.handleInput({ up: true, down: true, left: true, right: true });
      
      expect(game.state.lastInput.up).toBe(true);
      expect(game.state.lastInput.down).toBe(false);
    });

    test('handles input during state transitions', () => {
      game.setState('paused');
      game.handleInput({ up: true });
      
      expect(game.state.lastInput).toBeNull();
    });
  });
}); 