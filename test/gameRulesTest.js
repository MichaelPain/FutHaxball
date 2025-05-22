// test/gameRulesTest.js - Test per il sistema di regole personalizzate

const chai = require('chai');
const { GameRules } = require('../src/client/js/gameRules');

// Aspettative
const expect = chai.expect;

describe('Sistema di Regole Personalizzate', function() {
  let gameRules;
  
  beforeEach(function() {
    gameRules = new GameRules();
  });
  
  // Test per le regole di base
  describe('Regole di Base', function() {
    it('Dovrebbe inizializzare con le regole di default', function() {
      const rules = gameRules.getCurrentRules();
      
      expect(rules).to.have.property('timeLimit').equal(5 * 60);
      expect(rules).to.have.property('scoreLimit').equal(3);
      expect(rules).to.have.property('ballSpeed').equal(1.0);
      expect(rules).to.have.property('playerSpeed').equal(1.0);
      expect(rules).to.have.property('kickStrength').equal(1.0);
    });
    
    it('Dovrebbe permettere di modificare le regole', function() {
      const newRules = {
        timeLimit: 10 * 60,
        scoreLimit: 5,
        ballSpeed: 1.2
      };
      
      gameRules.setCurrentRules(newRules);
      const rules = gameRules.getCurrentRules();
      
      expect(rules).to.have.property('timeLimit').equal(10 * 60);
      expect(rules).to.have.property('scoreLimit').equal(5);
      expect(rules).to.have.property('ballSpeed').equal(1.2);
      // Le altre regole dovrebbero rimanere invariate
      expect(rules).to.have.property('playerSpeed').equal(1.0);
    });
    
    it('Dovrebbe resettare le regole ai valori di default', function() {
      // Prima modifica le regole
      gameRules.setCurrentRules({
        timeLimit: 10 * 60,
        scoreLimit: 5
      });
      
      // Poi resetta
      gameRules.resetRules();
      const rules = gameRules.getCurrentRules();
      
      expect(rules).to.have.property('timeLimit').equal(5 * 60);
      expect(rules).to.have.property('scoreLimit').equal(3);
    });
  });
  
  // Test per i preset di regole
  describe('Preset di Regole', function() {
    it('Dovrebbe caricare un preset esistente', function() {
      const result = gameRules.loadPreset('fast');
      expect(result).to.be.true;
      
      const rules = gameRules.getCurrentRules();
      expect(rules).to.have.property('timeLimit').equal(3 * 60);
      expect(rules).to.have.property('scoreLimit').equal(5);
      expect(rules).to.have.property('ballSpeed').equal(1.2);
      expect(rules).to.have.property('playerSpeed').equal(1.2);
    });
    
    it('Dovrebbe gestire correttamente la richiesta di un preset inesistente', function() {
      const result = gameRules.loadPreset('nonexistent');
      expect(result).to.be.false;
      
      // Le regole non dovrebbero essere cambiate
      const rules = gameRules.getCurrentRules();
      expect(rules).to.have.property('timeLimit').equal(5 * 60);
    });
    
    it('Dovrebbe salvare un nuovo preset', function() {
      // Prima modifica le regole
      gameRules.setCurrentRules({
        timeLimit: 15 * 60,
        scoreLimit: 10,
        ballSpeed: 0.8,
        playerSpeed: 0.8
      });
      
      // Poi salva come preset
      const result = gameRules.savePreset('slowmo', 'Modalità al rallentatore');
      expect(result).to.be.true;
      
      // Verifica che il preset sia stato salvato
      const presets = gameRules.getPresets();
      const slowmoPreset = presets.find(p => p.name === 'slowmo');
      
      expect(slowmoPreset).to.exist;
      expect(slowmoPreset).to.have.property('description').equal('Modalità al rallentatore');
      expect(slowmoPreset.rules).to.have.property('timeLimit').equal(15 * 60);
      expect(slowmoPreset.rules).to.have.property('ballSpeed').equal(0.8);
    });
    
    it('Dovrebbe impedire di sovrascrivere il preset standard', function() {
      const result = gameRules.savePreset('standard', 'Tentativo di sovrascrittura');
      expect(result).to.be.false;
    });
    
    it('Dovrebbe eliminare un preset esistente', function() {
      // Prima crea un preset
      gameRules.savePreset('testPreset', 'Preset di test');
      
      // Poi eliminalo
      const result = gameRules.deletePreset('testPreset');
      expect(result).to.be.true;
      
      // Verifica che il preset sia stato eliminato
      const presets = gameRules.getPresets();
      const testPreset = presets.find(p => p.name === 'testPreset');
      
      expect(testPreset).to.not.exist;
    });
    
    it('Dovrebbe impedire di eliminare il preset standard', function() {
      const result = gameRules.deletePreset('standard');
      expect(result).to.be.false;
    });
  });
  
  // Test per la validazione delle regole
  describe('Validazione delle Regole', function() {
    it('Dovrebbe validare regole corrette', function() {
      const validRules = {
        timeLimit: 10 * 60,
        scoreLimit: 5,
        ballSpeed: 1.2,
        playerSpeed: 1.5,
        kickStrength: 1.8,
        playerRadius: 15,
        ballRadius: 10
      };
      
      const validation = gameRules.validateRules(validRules);
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });
    
    it('Dovrebbe rilevare regole non valide', function() {
      const invalidRules = {
        timeLimit: -10,
        scoreLimit: -5,
        ballSpeed: 3.0,
        playerSpeed: 0,
        kickStrength: -1,
        playerRadius: 5,
        ballRadius: 30
      };
      
      const validation = gameRules.validateRules(invalidRules);
      expect(validation.valid).to.be.false;
      expect(validation.errors).to.have.lengthOf.at.least(5);
    });
    
    it('Dovrebbe rilevare la mancanza di criteri di fine partita', function() {
      const invalidRules = {
        timeLimit: 0,
        scoreLimit: 0,
        overtimeEnabled: false,
        suddenDeathEnabled: false
      };
      
      const validation = gameRules.validateRules(invalidRules);
      expect(validation.valid).to.be.false;
      expect(validation.errors).to.include('La partita deve avere almeno un criterio di fine (tempo, punteggio, overtime o sudden death)');
    });
  });
  
  // Test per l'applicazione delle regole al gioco
  describe('Applicazione delle Regole', function() {
    it('Dovrebbe applicare le regole correnti a un oggetto di gioco', function() {
      // Crea un oggetto di gioco simulato
      const game = {
        timeLimit: 0,
        scoreLimit: 0,
        teamSizeLimit: 0,
        physics: {
          constants: {
            ballSpeed: 0,
            playerSpeed: 0,
            kickStrength: 0,
            playerRadius: 0,
            ballRadius: 0,
            kickCooldown: 0
          }
        },
        allowTeamCollisions: false,
        allowOwnGoals: false,
        automaticKickoff: false,
        kickoffDelay: 0,
        goalCelebrationTime: 0,
        overtimeEnabled: false,
        overtimeLimit: 0,
        suddenDeathEnabled: false,
        afkTimeout: 0,
        afkReturn: '',
        enablePowerups: function() {},
        disablePowerups: function() {}
      };
      
      // Modifica le regole correnti
      gameRules.setCurrentRules({
        timeLimit: 10 * 60,
        scoreLimit: 5,
        ballSpeed: 1.2,
        playerSpeed: 1.5,
        powerupsEnabled: true
      });
      
      // Applica le regole al gioco
      const updatedGame = gameRules.applyRulesToGame(game);
      
      // Verifica che le regole siano state applicate
      expect(updatedGame.timeLimit).to.equal(10 * 60);
      expect(updatedGame.scoreLimit).to.equal(5);
      expect(updatedGame.physics.constants.ballSpeed).to.equal(1.2);
      expect(updatedGame.physics.constants.playerSpeed).to.equal(1.5);
    });
  });
});
