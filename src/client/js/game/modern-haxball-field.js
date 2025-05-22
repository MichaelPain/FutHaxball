import GameStateManager from './game-state-manager';
import { WebGLRenderer } from './WebGLRenderer';
import { TouchController } from './TouchController';
import { WeatherSystem } from '../weather/WeatherSystem.js';
import PerformanceMonitor from '../utils/PerformanceMonitor';
import PerformanceOverlay from '../ui/PerformanceOverlay';
import { AdvancedParticleSystem } from './effects/AdvancedParticleSystem';

// Implementazione migliorata del campo di gioco con bordo esterno e porte all'esterno
class ModernHaxballField {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    
    // Initialize state manager
    this.stateManager = new GameStateManager();
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize performance overlay
    this.performanceOverlay = new PerformanceOverlay(this.fieldContainer, this.performanceMonitor);
    
    // Subscribe to state changes
    this.stateManager.subscribe(this, (path, value) => {
      this.handleStateChange(path, value);
    });
    
    // Opzioni di configurazione con valori predefiniti
    this.options = {
      fieldWidth: options.fieldWidth || 800,
      fieldHeight: options.fieldHeight || 350,
      borderWidth: options.borderWidth || 20,
      goalWidth: options.goalWidth || 8,
      goalHeight: options.goalHeight || 140,
      ballRadius: options.ballRadius || 10,
      playerRadius: options.playerRadius || 15,
      fieldColor: options.fieldColor || '#1a5c1a',
      fieldPattern: options.fieldPattern || true,
      borderColor: options.borderColor || '#0e4c0e',
      lineColor: options.lineColor || 'rgba(255, 255, 255, 0.7)',
      goalColor: options.goalColor || 'white',
      mode: options.mode || '2v2',
      enablePowerUps: options.enablePowerUps ?? true,
      powerUpSpawnInterval: options.powerUpSpawnInterval || 15000,
      enableTeamStrategies: options.enableTeamStrategies ?? true,
      enableWeather: options.enableWeather ?? true,
      weatherType: options.weatherType || 'none',
      weatherIntensity: options.weatherIntensity || 0.5,
      enableReplay: options.enableReplay ?? true,
      maxReplayLength: options.maxReplayLength || 10000
    };
    
    // Inizializza il campo
    this.init();
    
    // Inizializza i sistemi
    this.initPhysics();
    this.initAudioSystem();
    this.initVisualEffects();
    this.initPowerUpSystem();
    this.initTeamStrategies();
    this.initWeatherSystem();
    this.initReplaySystem();
    
    // Avvia il game loop
    this.startGameLoop();
    
    // Inizializza il sistema di punteggio
    this.score = {
      red: 0,
      blue: 0,
      lastScorer: null,
      lastGoalTime: 0,
      goalStreak: 0
    };
    
    // Inizializza il sistema di stato del gioco
    this.gameState = {
      status: 'waiting', // waiting, playing, paused, goal, gameOver
      time: 0,
      lastUpdate: Date.now(),
      matchDuration: options.matchDuration || 300, // 5 minuti di default
      goalCooldown: 3000, // 3 secondi di cooldown dopo un gol
      maxScore: options.maxScore || 5,
      isOvertime: false,
      overtimeDuration: 120, // 2 minuti di overtime
      currentPeriod: 1,
      totalPeriods: 2
    };
    
    // Inizializza il sistema di statistiche
    this.stats = {
      // Configurazione
      config: {
        enabled: true,
        updateInterval: 1000, // 1 secondo
        maxHistory: 10
      },
      
      // Stato del sistema statistiche
      state: {
        lastUpdate: 0
      },
      
      // Dati delle statistiche
      data: {
        players: new Map(),
        teams: {
          red: {
            goals: 0,
            shots: 0,
            saves: 0,
            possession: 0,
            passes: 0,
            tackles: 0,
            interceptions: 0
          },
          blue: {
            goals: 0,
            shots: 0,
            saves: 0,
            possession: 0,
            passes: 0,
            tackles: 0,
            interceptions: 0
          }
        },
        history: []
      }
    };
    
    // Inizializza il sistema di performance
    this.performance = {
      targetFPS: 60,
      frameTime: 1000 / 60,
      lastFrameTime: 0,
      frameCount: 0,
      fps: 0,
      frameTimes: [],
      maxFrameTimes: 60,
      
      // Statistiche di rendering
      renderStats: {
        drawCalls: 0,
        particles: 0,
        animations: 0,
        textEffects: 0
      },
      
      // Ottimizzazioni
      optimizations: {
        useSpatialHash: true,
        useObjectPooling: true,
        useDoubleBuffering: true,
        useHardwareAcceleration: true,
        cullOffscreen: true,
        maxParticles: 1000,
        maxAnimations: 50,
        maxTextEffects: 10
      },
      
      // Pool di oggetti
      objectPool: {
        particles: [],
        animations: [],
        textEffects: [],
        
        // Ottieni un oggetto dal pool
        get: (type) => {
          const pool = this.performance.objectPool[type];
          return pool.length > 0 ? pool.pop() : null;
        },
        
        // Restituisci un oggetto al pool
        release: (type, obj) => {
          const pool = this.performance.objectPool[type];
          if (pool.length < 1000) { // Limite massimo del pool
            pool.push(obj);
          }
        }
      }
    };
    
    // Inizializza il doppio buffer
    if (this.performance.optimizations.useDoubleBuffering) {
      this.backBuffer = document.createElement('canvas');
      this.backBuffer.width = this.width;
      this.backBuffer.height = this.height;
      this.backCtx = this.backBuffer.getContext('2d', {
        alpha: true,
        desynchronized: true
      });
    }
    
    // Inizializza il sistema di sincronizzazione di rete
    this.network = {
      // Configurazione
      config: {
        updateRate: 60, // Hz
        interpolationDelay: 100, // ms
        maxExtrapolation: 200, // ms
        snapshotRate: 20, // Hz
        compression: true,
        deltaCompression: true
      },
      
      // Stato di rete
      state: {
        connected: false,
        latency: 0,
        jitter: 0,
        packetLoss: 0,
        lastUpdate: 0,
        lastSnapshot: 0,
        sequence: 0
      },
      
      // Buffer di interpolazione
      interpolation: {
        buffer: [],
        maxSize: 10,
        currentIndex: 0,
        
        // Aggiungi uno snapshot al buffer
        addSnapshot: (snapshot) => {
          this.network.interpolation.buffer.push(snapshot);
          if (this.network.interpolation.buffer.length > this.network.interpolation.maxSize) {
            this.network.interpolation.buffer.shift();
          }
        },
        
        // Ottieni lo stato interpolato
        getInterpolatedState: (time) => {
          if (this.network.interpolation.buffer.length < 2) {
            return null;
          }
          
          // Trova gli snapshot più vicini
          let prevSnapshot = null;
          let nextSnapshot = null;
          
          for (let i = 0; i < this.network.interpolation.buffer.length - 1; i++) {
            const current = this.network.interpolation.buffer[i];
            const next = this.network.interpolation.buffer[i + 1];
            
            if (time >= current.time && time <= next.time) {
              prevSnapshot = current;
              nextSnapshot = next;
              break;
            }
          }
          
          if (!prevSnapshot || !nextSnapshot) {
            return null;
          }
          
          // Calcola il fattore di interpolazione
          const factor = (time - prevSnapshot.time) / (nextSnapshot.time - prevSnapshot.time);
          
          // Interpola lo stato
          return this.interpolateState(prevSnapshot, nextSnapshot, factor);
        }
      },
      
      // Compressione dei dati
      compression: {
        // Comprimi uno snapshot
        compressSnapshot: (snapshot) => {
          if (!this.network.config.compression) {
            return snapshot;
          }
          
          const compressed = {
            t: snapshot.time,
            s: snapshot.sequence,
            b: {
              x: Math.round(snapshot.ball.position.x * 100) / 100,
              y: Math.round(snapshot.ball.position.y * 100) / 100,
              vx: Math.round(snapshot.ball.velocity.x * 100) / 100,
              vy: Math.round(snapshot.ball.velocity.y * 100) / 100,
              sp: Math.round(snapshot.ball.spin * 100) / 100
            },
            p: snapshot.players.map(player => ({
              id: player.id,
              x: Math.round(player.position.x * 100) / 100,
              y: Math.round(player.position.y * 100) / 100,
              vx: Math.round(player.velocity.x * 100) / 100,
              vy: Math.round(player.velocity.y * 100) / 100,
              r: Math.round(player.rotation * 100) / 100
            }))
          };
          
          return compressed;
        },
        
        // Decomprimi uno snapshot
        decompressSnapshot: (compressed) => {
          if (!this.network.config.compression) {
            return compressed;
          }
          
          const snapshot = {
            time: compressed.t,
            sequence: compressed.s,
            ball: {
              position: {
                x: compressed.b.x,
                y: compressed.b.y
              },
              velocity: {
                x: compressed.b.vx,
                y: compressed.b.vy
              },
              spin: compressed.b.sp
            },
            players: compressed.p.map(player => ({
              id: player.id,
              position: {
                x: player.x,
                y: player.y
              },
              velocity: {
                x: player.vx,
                y: player.vy
              },
              rotation: player.r
            }))
          };
          
          return snapshot;
        }
      },
      
      // Gestione degli input
      input: {
        buffer: [],
        lastProcessed: 0,
        
        // Aggiungi un input al buffer
        addInput: (input) => {
          this.network.input.buffer.push({
            ...input,
            time: Date.now()
          });
        },
        
        // Processa gli input in sospeso
        processInputs: (currentTime) => {
          const inputs = this.network.input.buffer.filter(
            input => input.time > this.network.input.lastProcessed
          );
          
          if (inputs.length > 0) {
            this.network.input.lastProcessed = currentTime;
            
            // Applica gli input
            for (const input of inputs) {
              this.applyInput(input);
            }
            
            // Rimuovi gli input processati
            this.network.input.buffer = this.network.input.buffer.filter(
              input => input.time > currentTime
            );
          }
        }
      }
    };
    
    // Inizializza il sistema di replay
    this.replay = {
      // Configurazione
      config: {
        enabled: true,
        maxDuration: 5 * 60 * 1000, // 5 minuti
        snapshotRate: 100, // 100ms
        compression: true,
        autoSave: true,
        maxReplays: 10
      },
      
      // Stato del replay
      state: {
        recording: false,
        playing: false,
        paused: false,
        currentTime: 0,
        duration: 0,
        speed: 1,
        currentFrame: 0
      },
      
      // Dati del replay
      data: {
        metadata: {
          version: '1.0',
          timestamp: 0,
          duration: 0,
          players: [],
          map: null,
          settings: null
        },
        frames: [],
        events: []
      }
    };
    
    // Inizializza il sistema di spettatori
    this.spectator = {
      // Configurazione
      config: {
        enabled: true,
        maxSpectators: 50,
        updateRate: 100, // 100ms
        interpolationDelay: 100, // 100ms
        compression: true,
        autoFollow: true
      },
      
      // Stato del sistema spettatori
      state: {
        active: false,
        lastUpdate: 0,
        lastSnapshot: null,
        sequence: 0
      },
      
      // Dati degli spettatori
      data: {
        spectators: new Map(),
        snapshots: [],
        maxSnapshots: 10
      }
    };
    
    // Inizializza il sistema di chat
    this.chat = {
      // Configurazione
      config: {
        enabled: true,
        maxMessages: 100,
        messageTimeout: 10000, // 10 secondi
        allowedTags: ['b', 'i', 'u', 'color'],
        rateLimit: {
          messages: 5,
          timeWindow: 5000 // 5 secondi
        }
      },
      
      // Stato del sistema chat
      state: {
        messages: [],
        muted: false,
        lastMessage: 0,
        messageCount: 0
      }
    };
    
    // Inizializza il sistema admin
    this.admin = {
      // Configurazione
      config: {
        enabled: true,
        maxAdmins: 5,
        permissions: {
          kick: true,
          ban: true,
          mute: true,
          changeMap: true,
          changeSettings: true,
          forceStart: true,
          forceStop: true
        },
        durations: {
          ban: 24 * 60 * 60 * 1000, // 24 ore
          mute: 30 * 60 * 1000 // 30 minuti
        }
      },
      
      // Stato del sistema admin
      state: {
        admins: new Set(),
        banned: new Map(),
        muted: new Map()
      }
    };
    
    // Inizializza il sistema di effetti meteo
    this.weather = {
      // Configurazione
      config: {
        enabled: true,
        effects: {
          rain: {
            enabled: false,
            intensity: 0.5,
            particleCount: 200,
            particleSpeed: 5,
            particleSize: 2,
            particleColor: 'rgba(200, 200, 255, 0.5)',
            physics: {
              ballFriction: 1.2,
              playerFriction: 1.1
            },
            sound: {
              file: 'sounds/rain.mp3',
              volume: 0.3,
              loop: true
            },
            impactEffect: true
          },
          snow: {
            enabled: false,
            intensity: 0.5,
            particleCount: 150,
            particleSpeed: 2,
            particleSize: 3,
            particleColor: 'rgba(255, 255, 255, 0.7)',
            physics: {
              ballFriction: 1.3,
              playerFriction: 1.2
            },
            sound: {
              file: 'sounds/wind.mp3',
              volume: 0.2,
              loop: true
            },
            accumulation: true
          },
          fog: {
            enabled: false,
            intensity: 0.5,
            particleCount: 100,
            particleSpeed: 1,
            particleSize: 50,
            particleColor: 'rgba(200, 200, 200, 0.3)',
            physics: {
              ballFriction: 1.1,
              playerFriction: 1.05
            },
            sound: {
              file: 'sounds/fog.mp3',
              volume: 0.2,
              loop: true
            },
            depthEffect: true
          },
          storm: {
            enabled: false,
            intensity: 0.7,
            particleCount: 300,
            particleSpeed: 8,
            particleSize: 3,
            particleColor: 'rgba(100, 100, 150, 0.6)',
            physics: {
              ballFriction: 1.4,
              playerFriction: 1.3
            },
            sound: {
              file: 'sounds/thunder.mp3',
              volume: 0.4,
              loop: true
            },
            lightning: true,
            thunderInterval: 5000,
            windEffect: {
              force: 0.3,
              direction: 0,
              variation: 0.1
            }
          }
        },
        transitions: {
          duration: 2000, // 2 seconds
          easing: 'easeInOutQuad'
        },
        performance: {
          particlePoolSize: 2000,
          updateInterval: 2, // Update particles every 2 frames
          cullOffscreen: true
        }
      },
      
      // Stato del sistema meteo
      state: {
        active: false,
        currentType: 'none',
        targetType: 'none',
        transitionProgress: 0,
        particles: [],
        lastUpdate: 0,
        frameCount: 0,
        lastThunder: 0,
        particlePool: []
      }
    };
    
    // Inizializza il sistema di power-up
    this.powerups = {
      // Configurazione
      config: {
        enabled: true,
        spawnInterval: 30000, // 30 secondi
        maxActive: 3,
        types: {
          speedBoost: {
            name: 'Speed Boost',
            color: '#ff0000',
            icon: '⚡',
            effectDuration: 10000, // 10 secondi
            multiplier: 1.5
          },
          sizeBoost: {
            name: 'Size Boost',
            color: '#00ff00',
            icon: '⬆️',
            effectDuration: 10000, // 10 secondi
            multiplier: 1.5
          },
          ballControl: {
            name: 'Ball Control',
            color: '#0000ff',
            icon: '🎯',
            effectDuration: 10000, // 10 secondi
            multiplier: 1.5
          },
          shield: {
            name: 'Shield',
            color: '#ffff00',
            icon: '🛡️',
            effectDuration: 10000, // 10 secondi
            multiplier: 1
          },
          timeWarp: {
            name: 'Time Warp',
            color: '#ff00ff',
            icon: '⏰',
            effectDuration: 10000, // 10 secondi
            multiplier: 0.5
          }
        }
      },
      
      // Stato del sistema power-up
      state: {
        active: new Map(),
        lastSpawn: 0
      }
    };
    
    // Inizializza il sistema di achievement
    this.achievements = {
      // Configurazione
      config: {
        enabled: true,
        notificationDuration: 5000, // 5 secondi
        types: {
          firstGoal: {
            name: 'First Goal',
            description: 'Score your first goal',
            icon: '⚽',
            condition: (stats) => stats.goals >= 1
          },
          hatTrick: {
            name: 'Hat Trick',
            description: 'Score 3 goals in one game',
            icon: '🎩',
            condition: (stats) => stats.goals >= 3
          },
          firstSave: {
            name: 'First Save',
            description: 'Make your first save',
            icon: '🧤',
            condition: (stats) => stats.saves >= 1
          },
          teamPlayer: {
            name: 'Team Player',
            description: 'Complete 5 passes in one game',
            icon: '🤝',
            condition: (stats) => stats.passes >= 5
          },
          possessionMaster: {
            name: 'Possession Master',
            description: 'Maintain possession for 30 seconds',
            icon: '⏱',
            condition: (stats) => stats.possession >= 30000
          },
          defensiveWall: {
            name: 'Defensive Wall',
            description: 'Make 3 saves in one game',
            icon: '🧱',
            condition: (stats) => stats.saves >= 3
          },
          playmaker: {
            name: 'Playmaker',
            description: 'Complete 10 passes in one game',
            icon: '🎯',
            condition: (stats) => stats.passes >= 10
          },
          ballHog: {
            name: 'Ball Hog',
            description: 'Maintain possession for 1 minute',
            icon: '⚽',
            condition: (stats) => stats.possession >= 60000
          },
          goalMachine: {
            name: 'Goal Machine',
            description: 'Score 5 goals in one game',
            icon: '🏆',
            condition: (stats) => stats.goals >= 5
          },
          perfectGame: {
            name: 'Perfect Game',
            description: 'Score a goal and make a save',
            icon: '⭐',
            condition: (stats) => stats.goals >= 1 && stats.saves >= 1
          }
        }
      },
      
      // Stato del sistema achievement
      state: {
        unlocked: new Set(),
        notifications: []
      }
    };
    
    // Inizializza il sistema di effetti sonori
    this.sound = {
      // Configurazione
      config: {
        enabled: true,
        volume: 1,
        sounds: {
          goal: {
            file: 'sounds/goal.mp3',
            volume: 1,
            rateLimit: 1000
          },
          save: {
            file: 'sounds/save.mp3',
            volume: 0.8,
            rateLimit: 500
          },
          pass: {
            file: 'sounds/pass.mp3',
            volume: 0.6,
            rateLimit: 200
          },
          tackle: {
            file: 'sounds/tackle.mp3',
            volume: 0.7,
            rateLimit: 300
          },
          whistle: {
            file: 'sounds/whistle.mp3',
            volume: 1,
            rateLimit: 2000
          },
          crowd: {
            file: 'sounds/crowd.mp3',
            volume: 0.5,
            rateLimit: 0,
            loop: true
          },
          powerup: {
            file: 'sounds/powerup.mp3',
            volume: 0.8,
            rateLimit: 500
          },
          achievement: {
            file: 'sounds/achievement.mp3',
            volume: 1,
            rateLimit: 1000
          }
        }
      },
      
      // Stato del sistema sonoro
      state: {
        loaded: new Map(),
        playing: new Map(),
        lastPlayed: new Map()
      }
    };
    
    // Carica i suoni
    this.loadSounds();

    // Tournament System
    this.tournamentSystem = {
      config: {
        enabled: true,
        maxTeams: 16,
        maxPlayersPerTeam: 5,
        minPlayersPerTeam: 3,
        matchDuration: 300000, // 5 minutes
        breakDuration: 60000, // 1 minute
        maxConcurrentMatches: 4,
        autoStart: true,
        autoSchedule: true,
        seedingMethod: 'random', // random, ranking, custom
        bracketType: 'single', // single, double, round-robin
        scoringSystem: {
          win: 3,
          draw: 1,
          loss: 0
        }
      },
      state: {
        active: false,
        currentStage: null,
        currentRound: 0,
        matches: new Map(),
        teams: new Map(),
        standings: new Map(),
        schedule: [],
        lastUpdate: 0
      },
      methods: {
        initialize() {
          this.state.active = false;
          this.state.currentStage = null;
          this.state.currentRound = 0;
          this.state.matches.clear();
          this.state.teams.clear();
          this.state.standings.clear();
          this.state.schedule = [];
          this.state.lastUpdate = Date.now();
        },
        startTournament(config = {}) {
          if (this.state.active) return false;
          
          // Merge config with defaults
          this.config = { ...this.config, ...config };
          
          // Validate configuration
          if (!this.validateConfig()) return false;
          
          this.state.active = true;
          this.state.currentStage = 'registration';
          this.state.currentRound = 0;
          
          // Initialize tournament structure
          this.initializeTournamentStructure();
          
          return true;
        },
        stopTournament() {
          if (!this.state.active) return false;
          
          this.state.active = false;
          this.state.currentStage = null;
          this.state.currentRound = 0;
          
          // Clean up tournament data
          this.cleanupTournament();
          
          return true;
        },
        addTeam(team) {
          if (!this.state.active || this.state.currentStage !== 'registration') return false;
          if (this.state.teams.size >= this.config.maxTeams) return false;
          
          // Validate team
          if (!this.validateTeam(team)) return false;
          
          this.state.teams.set(team.id, team);
          this.updateStandings();
          
          return true;
        },
        removeTeam(teamId) {
          if (!this.state.active || this.state.currentStage !== 'registration') return false;
          
          this.state.teams.delete(teamId);
          this.updateStandings();
          
          return true;
        },
        startStage(stage) {
          if (!this.state.active) return false;
          
          switch (stage) {
            case 'registration':
              this.state.currentStage = 'registration';
              break;
            case 'group':
              if (this.state.teams.size < this.config.minTeams) return false;
              this.state.currentStage = 'group';
              this.generateGroupStage();
              break;
            case 'knockout':
              if (this.state.currentStage !== 'group') return false;
              this.state.currentStage = 'knockout';
              this.generateKnockoutStage();
              break;
            case 'finals':
              if (this.state.currentStage !== 'knockout') return false;
              this.state.currentStage = 'finals';
              this.generateFinals();
              break;
            default:
              return false;
          }
          
          return true;
        },
        generateGroupStage() {
          const teams = Array.from(this.state.teams.values());
          const groups = this.createGroups(teams);
          
          // Generate matches for each group
          groups.forEach((group, index) => {
            const matches = this.generateGroupMatches(group);
            this.state.matches.set(`group_${index}`, matches);
          });
          
          // Update schedule
          this.updateSchedule();
        },
        generateKnockoutStage() {
          const qualifiedTeams = this.getQualifiedTeams();
          const matches = this.generateKnockoutMatches(qualifiedTeams);
          
          this.state.matches.set('knockout', matches);
          this.updateSchedule();
        },
        generateFinals() {
          const finalists = this.getFinalists();
          const matches = this.generateFinalMatches(finalists);
          
          this.state.matches.set('finals', matches);
          this.updateSchedule();
        },
        updateMatch(matchId, result) {
          if (!this.state.active) return false;
          
          const match = this.findMatch(matchId);
          if (!match) return false;
          
          // Update match result
          match.result = result;
          match.completed = true;
          
          // Update standings
          this.updateStandings();
          
          // Check if stage is complete
          if (this.isStageComplete()) {
            this.advanceStage();
          }
          
          return true;
        },
        updateStandings() {
          this.state.standings.clear();
          
          this.state.teams.forEach(team => {
            const stats = this.calculateTeamStats(team.id);
            this.state.standings.set(team.id, stats);
          });
          
          // Sort standings
          this.sortStandings();
        },
        updateSchedule() {
          this.state.schedule = [];
          
          this.state.matches.forEach(matches => {
            matches.forEach(match => {
              if (!match.completed) {
                this.state.schedule.push(match);
              }
            });
          });
          
          // Sort schedule by date
          this.state.schedule.sort((a, b) => a.scheduledTime - b.scheduledTime);
        },
        validateConfig() {
          // Validate tournament configuration
          if (this.config.maxTeams < 2) return false;
          if (this.config.maxPlayersPerTeam < this.config.minPlayersPerTeam) return false; // Minimum 1 minute
          
          return true;
        },
        validateTeam(team) {
          // Validate team structure
          if (!team.id || !team.name) return false;
          if (team.players.length > this.config.maxPlayersPerTeam) return false;
          if (team.players.length < this.config.minPlayersPerTeam) return false;
          
          return true;
        },
        createGroups(teams) {
          // Create balanced groups based on seeding
          const groups = [];
          const groupCount = Math.ceil(teams.length / 4); // 4 teams per group
          
          for (let i = 0; i < groupCount; i++) {
            groups.push([]);
          }
          
          // Sort teams by seed
          teams.sort((a, b) => a.seed - b.seed);
          
          // Distribute teams into groups
          teams.forEach((team, index) => {
            const groupIndex = index % groupCount;
            groups[groupIndex].push(team);
          });
          
          return groups;
        },
        generateGroupMatches(group) {
          const matches = [];
          
          // Generate round-robin matches
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              matches.push({
                id: `match_${Date.now()}_${i}_${j}`,
                team1: group[i],
                team2: group[j],
                scheduledTime: Date.now() + (matches.length * this.config.matchDuration),
                completed: false,
                result: null
              });
            }
          }
          
          return matches;
        },
        generateKnockoutMatches(teams) {
          const matches = [];
          const teamCount = teams.length;
          
          // Generate bracket matches
          for (let i = 0; i < teamCount; i += 2) {
            if (i + 1 < teamCount) {
              matches.push({
                id: `match_${Date.now()}_${i}`,
                team1: teams[i],
                team2: teams[i + 1],
                scheduledTime: Date.now() + (matches.length * this.config.matchDuration),
                completed: false,
                result: null
              });
            }
          }
          
          return matches;
        },
        generateFinalMatches(teams) {
          const matches = [];
          
          // Generate final matches
          for (let i = 0; i < teams.length; i += 2) {
            if (i + 1 < teams.length) {
              matches.push({
                id: `match_${Date.now()}_${i}`,
                team1: teams[i],
                team2: teams[i + 1],
                scheduledTime: Date.now() + (matches.length * this.config.matchDuration),
                completed: false,
                result: null
              });
            }
          }
          
          return matches;
        },
        findMatch(matchId) {
          for (const matches of this.state.matches.values()) {
            const match = matches.find(m => m.id === matchId);
            if (match) return match;
          }
          return null;
        },
        calculateTeamStats(teamId) {
          const stats = {
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            points: 0
          };
          
          // Calculate team statistics
          this.state.matches.forEach(matches => {
            matches.forEach(match => {
              if (match.completed && (match.team1.id === teamId || match.team2.id === teamId)) {
                stats.played++;
                
                if (match.team1.id === teamId) {
                  stats.goalsFor += match.result.team1Score;
                  stats.goalsAgainst += match.result.team2Score;
                  
                  if (match.result.team1Score > match.result.team2Score) {
                    stats.won++;
                    stats.points += this.config.scoringSystem.win;
                  } else if (match.result.team1Score === match.result.team2Score) {
                    stats.drawn++;
                    stats.points += this.config.scoringSystem.draw;
                  } else {
                    stats.lost++;
                    stats.points += this.config.scoringSystem.loss;
                  }
                } else {
                  stats.goalsFor += match.result.team2Score;
                  stats.goalsAgainst += match.result.team1Score;
                  
                  if (match.result.team2Score > match.result.team1Score) {
                    stats.won++;
                    stats.points += this.config.scoringSystem.win;
                  } else if (match.result.team2Score === match.result.team1Score) {
                    stats.drawn++;
                    stats.points += this.config.scoringSystem.draw;
                  } else {
                    stats.lost++;
                    stats.points += this.config.scoringSystem.loss;
                  }
                }
              }
            });
          });
          
          return stats;
        },
        sortStandings() {
          const standings = Array.from(this.state.standings.entries());
          
          standings.sort((a, b) => {
            // Sort by points
            if (b[1].points !== a[1].points) {
              return b[1].points - a[1].points;
            }
            
            // Sort by goal difference
            const aDiff = a[1].goalsFor - a[1].goalsAgainst;
            const bDiff = b[1].goalsFor - b[1].goalsAgainst;
            if (bDiff !== aDiff) {
              return bDiff - aDiff;
            }
            
            // Sort by goals scored
            if (b[1].goalsFor !== a[1].goalsFor) {
              return b[1].goalsFor - a[1].goalsFor;
            }
            
            // Sort by head-to-head
            return this.compareHeadToHead(a[0], b[0]);
          });
          
          this.state.standings = new Map(standings);
        },
        compareHeadToHead(team1Id, team2Id) {
          let team1Wins = 0;
          let team2Wins = 0;
          
          this.state.matches.forEach(matches => {
            matches.forEach(match => {
              if (match.completed && 
                  ((match.team1.id === team1Id && match.team2.id === team2Id) ||
                   (match.team1.id === team2Id && match.team2.id === team1Id))) {
                if (match.team1.id === team1Id) {
                  if (match.result.team1Score > match.result.team2Score) team1Wins++;
                  else if (match.result.team1Score < match.result.team2Score) team2Wins++;
                } else {
                  if (match.result.team2Score > match.result.team1Score) team1Wins++;
                  else if (match.result.team2Score < match.result.team1Score) team2Wins++;
                }
              }
            });
          });
          
          return team2Wins - team1Wins;
        },
        getQualifiedTeams() {
          const qualified = [];
          const groupCount = Math.ceil(this.state.teams.size / 4);
          
          for (let i = 0; i < groupCount; i++) {
            const groupStandings = this.getGroupStandings(i);
            // Take top 2 teams from each group
            qualified.push(...groupStandings.slice(0, 2));
          }
          
          return qualified;
        },
        getGroupStandings(groupIndex) {
          const groupTeams = Array.from(this.state.teams.values())
            .filter(team => {
              const matches = this.state.matches.get(`group_${groupIndex}`);
              return matches && matches.some(match => 
                match.team1.id === team.id || match.team2.id === team.id
              );
            });
          
          return groupTeams.sort((a, b) => {
            const aStats = this.state.standings.get(a.id);
            const bStats = this.state.standings.get(b.id);
            
            if (bStats.points !== aStats.points) {
              return bStats.points - aStats.points;
            }
            
            const aDiff = aStats.goalsFor - aStats.goalsAgainst;
            const bDiff = bStats.goalsFor - bStats.goalsAgainst;
            if (bDiff !== aDiff) {
              return bDiff - aDiff;
            }
            
            return bStats.goalsFor - aStats.goalsFor;
          });
        },
        getFinalists() {
          const finalists = [];
          const knockoutMatches = this.state.matches.get('knockout');
          
          if (knockoutMatches) {
            knockoutMatches.forEach(match => {
              if (match.completed) {
                const winner = match.result.team1Score > match.result.team2Score ? match.team1 : match.team2;
                finalists.push(winner);
              }
            });
          }
          
          return finalists;
        },
        isStageComplete() {
          switch (this.state.currentStage) {
            case 'group':
              return this.isGroupStageComplete();
            case 'knockout':
              return this.isKnockoutStageComplete();
            case 'finals':
              return this.isFinalsComplete();
            default:
              return false;
          }
        },
        isGroupStageComplete() {
          for (const matches of this.state.matches.values()) {
            if (matches.some(match => !match.completed)) {
              return false;
            }
          }
          return true;
        },
        isKnockoutStageComplete() {
          const matches = this.state.matches.get('knockout');
          return matches && matches.every(match => match.completed);
        },
        isFinalsComplete() {
          const matches = this.state.matches.get('finals');
          return matches && matches.every(match => match.completed);
        },
        advanceStage() {
          switch (this.state.currentStage) {
            case 'group':
              this.startStage('knockout');
              break;
            case 'knockout':
              this.startStage('finals');
              break;
            case 'finals':
              this.stopTournament();
              break;
          }
        },
        cleanupTournament() {
          this.state.matches.clear();
          this.state.teams.clear();
          this.state.standings.clear();
          this.state.schedule = [];
        }
      }
    };

    // Player Skills System
    this.playerSkillsSystem = {
      config: {
        enabled: true,
        maxSkillLevel: 10,
        skillPointsPerLevel: 1,
        baseSkillPoints: 5,
        skillCategories: {
          shooting: {
            name: 'Shooting',
            description: 'Improves shot accuracy and power',
            maxLevel: 10,
            effects: {
              accuracy: 0.05, // 5% increase per level
              power: 0.03, // 3% increase per level
              curve: 0.02 // 2% increase per level
            }
          },
          passing: {
            name: 'Passing',
            description: 'Improves pass accuracy and speed',
            maxLevel: 10,
            effects: {
              accuracy: 0.05,
              speed: 0.03,
              vision: 0.02
            }
          },
          dribbling: {
            name: 'Dribbling',
            description: 'Improves ball control and movement',
            maxLevel: 10,
            effects: {
              control: 0.05,
              speed: 0.03,
              agility: 0.02
            }
          },
          defending: {
            name: 'Defending',
            description: 'Improves tackling and positioning',
            maxLevel: 10,
            effects: {
              tackle: 0.05,
              positioning: 0.03,
              strength: 0.02
            }
          },
          goalkeeping: {
            name: 'Goalkeeping',
            description: 'Improves save ability and positioning',
            maxLevel: 10,
            effects: {
              diving: 0.05,
              positioning: 0.03,
              reflexes: 0.02
            }
          }
        },
        skillProgression: {
          xpPerLevel: 1000,
          xpMultiplier: 1.2,
          baseXp: 100
        }
      },
      state: {
        playerSkills: new Map(),
        skillEffects: new Map(),
        lastUpdate: 0
      },
      methods: {
        initialize() {
          this.state.playerSkills.clear();
          this.state.skillEffects.clear();
          this.state.lastUpdate = Date.now();
        },
        initializePlayerSkills(playerId) {
          if (this.state.playerSkills.has(playerId)) return false;
          
          const skills = {
            level: 1,
            xp: 0,
            skillPoints: this.config.baseSkillPoints,
            skills: {
              shooting: 1,
              passing: 1,
              dribbling: 1,
              defending: 1,
              goalkeeping: 1
            }
          };
          
          this.state.playerSkills.set(playerId, skills);
          this.updateSkillEffects(playerId);
          
          return true;
        },
        addXp(playerId, amount) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return false;
          
          skills.xp += amount;
          
          // Check for level up
          while (skills.xp >= this.getRequiredXp(skills.level)) {
            this.levelUp(playerId);
          }
          
          return true;
        },
        levelUp(playerId) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return false;
          
          skills.level++;
          skills.skillPoints += this.config.skillPointsPerLevel;
          skills.xp -= this.getRequiredXp(skills.level - 1);
          
          this.updateSkillEffects(playerId);
          
          return true;
        },
        upgradeSkill(playerId, skillName) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return false;
          
          // Check if skill exists
          if (!this.config.skillCategories[skillName]) return false;
          
          // Check if player has enough skill points
          if (skills.skillPoints <= 0) return false;
          
          // Check if skill is at max level
          if (skills.skills[skillName] >= this.config.skillCategories[skillName].maxLevel) return false;
          
          // Upgrade skill
          skills.skills[skillName]++;
          skills.skillPoints--;
          
          this.updateSkillEffects(playerId);
          
          return true;
        },
        getRequiredXp(level) {
          return Math.floor(this.config.skillProgression.baseXp * 
            Math.pow(this.config.skillProgression.xpMultiplier, level - 1));
        },
        updateSkillEffects(playerId) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return;
          
          const effects = {};
          
          // Calculate effects for each skill
          Object.entries(skills.skills).forEach(([skillName, level]) => {
            const category = this.config.skillCategories[skillName];
            if (!category) return;
            
            Object.entries(category.effects).forEach(([effectName, baseEffect]) => {
              if (!effects[effectName]) effects[effectName] = 0;
              effects[effectName] += baseEffect * level;
            });
          });
          
          this.state.skillEffects.set(playerId, effects);
        },
        getSkillEffects(playerId) {
          return this.state.skillEffects.get(playerId) || {};
        },
        getPlayerSkills(playerId) {
          return this.state.playerSkills.get(playerId);
        },
        applySkillEffects(playerId, baseStats) {
          const effects = this.getSkillEffects(playerId);
          if (!effects) return baseStats;
          
          const modifiedStats = { ...baseStats };
          
          // Apply each effect
          Object.entries(effects).forEach(([effectName, value]) => {
            if (modifiedStats[effectName] !== undefined) {
              modifiedStats[effectName] *= (1 + value);
            }
          });
          
          return modifiedStats;
        },
        calculateSkillBasedStats(playerId, baseStats) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return baseStats;
          
          // Calculate position-specific stats
          const position = this.getPlayerPosition(playerId);
          let positionMultiplier = 1;
          
          switch (position) {
            case 'goalkeeper':
              positionMultiplier = skills.skills.goalkeeping / 5;
              break;
            case 'defender':
              positionMultiplier = skills.skills.defending / 5;
              break;
            case 'midfielder':
              positionMultiplier = (skills.skills.passing + skills.skills.dribbling) / 10;
              break;
            case 'forward':
              positionMultiplier = (skills.skills.shooting + skills.skills.dribbling) / 10;
              break;
          }
          
          // Apply position multiplier
          const positionStats = { ...baseStats };
          Object.keys(positionStats).forEach(stat => {
            positionStats[stat] *= positionMultiplier;
          });
          
          // Apply skill effects
          return this.applySkillEffects(playerId, positionStats);
        },
        getPlayerPosition(playerId) {
          // This should be implemented based on your game's position system
          return 'midfielder';
        },
        resetSkills(playerId) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return false;
          
          // Reset all skills to level 1
          Object.keys(skills.skills).forEach(skillName => {
            skills.skills[skillName] = 1;
          });
          
          // Return skill points
          skills.skillPoints = this.config.baseSkillPoints + 
            (skills.level - 1) * this.config.skillPointsPerLevel;
          
          this.updateSkillEffects(playerId);
          
          return true;
        },
        getSkillProgress(playerId, skillName) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills || !skills.skills[skillName]) return 0;
          
          const currentLevel = skills.skills[skillName];
          const maxLevel = this.config.skillCategories[skillName].maxLevel;
          
          return (currentLevel / maxLevel) * 100;
        },
        getLevelProgress(playerId) {
          const skills = this.state.playerSkills.get(playerId);
          if (!skills) return 0;
          
          const currentXp = skills.xp;
          const requiredXp = this.getRequiredXp(skills.level);
          const previousXp = this.getRequiredXp(skills.level - 1);
          
          return ((currentXp - previousXp) / (requiredXp - previousXp)) * 100;
        }
      }
    };

    // Team Formations System
    this.teamFormationsSystem = {
      config: {
        enabled: true,
        defaultFormation: '4-4-2',
        formations: {
          '4-4-2': {
            name: '4-4-2',
            description: 'Balanced formation with two strikers',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -30, y: -20 },
                { x: -10, y: -20 },
                { x: 10, y: -20 },
                { x: 30, y: -20 }
              ],
              midfielder: [
                { x: -30, y: 0 },
                { x: -10, y: 0 },
                { x: 10, y: 0 },
                { x: 30, y: 0 }
              ],
              forward: [
                { x: -20, y: 20 },
                { x: 20, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['fullback', 'stopper', 'stopper', 'fullback'],
              midfielder: ['winger', 'central', 'central', 'winger'],
              forward: ['target-man', 'poacher']
            },
            tactics: {
              defensive: {
                pressing: 0.4,
                width: 0.5,
                depth: 0.4,
                midfieldLine: 0.3
              },
              balanced: {
                pressing: 0.6,
                width: 0.7,
                depth: 0.6,
                midfieldLine: 0.5
              },
              attacking: {
                pressing: 0.8,
                width: 0.9,
                depth: 0.8,
                midfieldLine: 0.7
              }
            }
          },
          '5-3-2': {
            name: '5-3-2',
            description: 'Defensive formation with wingbacks',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -40, y: -20 },
                { x: -20, y: -20 },
                { x: 0, y: -20 },
                { x: 20, y: -20 },
                { x: 40, y: -20 }
              ],
              midfielder: [
                { x: -20, y: 0 },
                { x: 0, y: 0 },
                { x: 20, y: 0 }
              ],
              forward: [
                { x: -20, y: 20 },
                { x: 20, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['wingback', 'stopper', 'cover', 'stopper', 'wingback'],
              midfielder: ['defensive', 'playmaker', 'box-to-box'],
              forward: ['target-man', 'poacher']
            },
            tactics: {
              defensive: {
                pressing: 0.3,
                width: 0.4,
                depth: 0.3,
                midfieldLine: 0.2
              },
              balanced: {
                pressing: 0.5,
                width: 0.6,
                depth: 0.5,
                midfieldLine: 0.4
              },
              attacking: {
                pressing: 0.7,
                width: 0.8,
                depth: 0.7,
                midfieldLine: 0.6
              }
            }
          },
          '4-3-3': {
            name: '4-3-3',
            description: 'Attacking formation with wingers',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -30, y: -20 },
                { x: -10, y: -20 },
                { x: 10, y: -20 },
                { x: 30, y: -20 }
              ],
              midfielder: [
                { x: -20, y: 0 },
                { x: 0, y: 0 },
                { x: 20, y: 0 }
              ],
              forward: [
                { x: -30, y: 20 },
                { x: 0, y: 20 },
                { x: 30, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['stopper', 'cover', 'fullback', 'wingback'],
              midfielder: ['defensive', 'box-to-box', 'playmaker'],
              forward: ['winger', 'target-man', 'winger']
            },
            tactics: {
              defensive: {
                pressing: 0.5,
                width: 0.6,
                depth: 0.5,
                midfieldLine: 0.4
              },
              balanced: {
                pressing: 0.7,
                width: 0.8,
                depth: 0.7,
                midfieldLine: 0.6
              },
              attacking: {
                pressing: 0.9,
                width: 1.0,
                depth: 0.9,
                midfieldLine: 0.8
              }
            }
          },
          '3-5-2': {
            name: '3-5-2',
            description: 'Formation with strong midfield control',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -20, y: -20 },
                { x: 0, y: -20 },
                { x: 20, y: -20 }
              ],
              midfielder: [
                { x: -40, y: 0 },
                { x: -20, y: 0 },
                { x: 0, y: 0 },
                { x: 20, y: 0 },
                { x: 40, y: 0 }
              ],
              forward: [
                { x: -20, y: 20 },
                { x: 20, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['stopper', 'cover', 'stopper'],
              midfielder: ['wingback', 'defensive', 'playmaker', 'box-to-box', 'wingback'],
              forward: ['target-man', 'poacher']
            },
            tactics: {
              defensive: {
                pressing: 0.3,
                width: 0.4,
                depth: 0.3,
                midfieldLine: 0.2
              },
              balanced: {
                pressing: 0.5,
                width: 0.6,
                depth: 0.5,
                midfieldLine: 0.4
              },
              attacking: {
                pressing: 0.7,
                width: 0.8,
                depth: 0.7,
                midfieldLine: 0.6
              }
            }
          },
          '4-2-3-1': {
            name: '4-2-3-1',
            description: 'Modern formation with attacking midfield',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -30, y: -20 },
                { x: -10, y: -20 },
                { x: 10, y: -20 },
                { x: 30, y: -20 }
              ],
              midfielder: [
                { x: -20, y: -5 },
                { x: 20, y: -5 },
                { x: -30, y: 10 },
                { x: 0, y: 10 },
                { x: 30, y: 10 }
              ],
              forward: [
                { x: 0, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['fullback', 'stopper', 'stopper', 'fullback'],
              midfielder: ['defensive', 'defensive', 'winger', 'playmaker', 'winger'],
              forward: ['complete-forward']
            },
            tactics: {
              defensive: {
                pressing: 0.4,
                width: 0.5,
                depth: 0.4,
                midfieldLine: 0.3
              },
              balanced: {
                pressing: 0.6,
                width: 0.7,
                depth: 0.6,
                midfieldLine: 0.5
              },
              attacking: {
                pressing: 0.8,
                width: 0.9,
                depth: 0.8,
                midfieldLine: 0.7
              }
            }
          },
          '4-1-4-1': {
            name: '4-1-4-1',
            description: 'Modern formation with defensive midfielder and attacking midfield',
            positions: {
              goalkeeper: [{ x: 0, y: 0 }],
              defender: [
                { x: -30, y: -20 },
                { x: -10, y: -20 },
                { x: 10, y: -20 },
                { x: 30, y: -20 }
              ],
              midfielder: [
                { x: 0, y: -10 },
                { x: -30, y: 0 },
                { x: -10, y: 0 },
                { x: 10, y: 0 },
                { x: 30, y: 0 }
              ],
              forward: [
                { x: 0, y: 20 }
              ]
            },
            roles: {
              goalkeeper: ['sweeper', 'traditional'],
              defender: ['fullback', 'stopper', 'stopper', 'fullback'],
              midfielder: ['anchor', 'winger', 'box-to-box', 'playmaker', 'winger'],
              forward: ['false-nine']
            },
            tactics: {
              defensive: {
                pressing: 0.4,
                width: 0.5,
                depth: 0.4,
                midfieldLine: 0.3
              },
              balanced: {
                pressing: 0.6,
                width: 0.7,
                depth: 0.6,
                midfieldLine: 0.5
              },
              attacking: {
                pressing: 0.8,
                width: 0.9,
                depth: 0.8,
                midfieldLine: 0.7
              }
            }
          }
        },
        positionAttributes: {
          goalkeeper: {
            speed: 0.8,
            acceleration: 0.8,
            strength: 1.2,
            jumping: 1.2,
            reflexes: 1.5
          },
          defender: {
            speed: 0.9,
            acceleration: 0.9,
            strength: 1.3,
            tackling: 1.3,
            positioning: 1.2
          },
          midfielder: {
            speed: 1.1,
            acceleration: 1.1,
            passing: 1.3,
            vision: 1.2,
            stamina: 1.3
          },
          forward: {
            speed: 1.2,
            acceleration: 1.2,
            shooting: 1.3,
            dribbling: 1.2,
            finishing: 1.3
          }
        },
        roleAttributes: {
          sweeper: {
            positioning: 1.2,
            vision: 1.1,
            passing: 1.1
          },
          traditional: {
            reflexes: 1.2,
            strength: 1.1,
            jumping: 1.1
          },
          stopper: {
            tackling: 1.2,
            strength: 1.2,
            positioning: 1.1
          },
          cover: {
            speed: 1.1,
            positioning: 1.2,
            tackling: 1.1
          },
          fullback: {
            speed: 1.1,
            stamina: 1.2,
            crossing: 1.1
          },
          wingback: {
            speed: 1.2,
            stamina: 1.3,
            crossing: 1.2
          },
          defensive: {
            tackling: 1.2,
            positioning: 1.2,
            passing: 1.1
          },
          'box-to-box': {
            stamina: 1.3,
            passing: 1.1,
            shooting: 1.1
          },
          playmaker: {
            passing: 1.3,
            vision: 1.3,
            dribbling: 1.1
          },
          winger: {
            speed: 1.2,
            dribbling: 1.2,
            crossing: 1.2
          },
          'target-man': {
            strength: 1.2,
            heading: 1.2,
            shooting: 1.1
          },
          poacher: {
            finishing: 1.3,
            positioning: 1.2,
            speed: 1.1
          },
          'complete-forward': {
            finishing: 1.3,
            dribbling: 1.2,
            passing: 1.2,
            strength: 1.1,
            speed: 1.2
          },
          anchor: {
            tackling: 1.3,
            positioning: 1.3,
            passing: 1.1,
            strength: 1.2
          },
          'false-nine': {
            finishing: 1.2,
            passing: 1.3,
            vision: 1.3,
            dribbling: 1.2,
            positioning: 1.2
          },
          'inverted-winger': {
            speed: 1.2,
            dribbling: 1.3,
            shooting: 1.2,
            passing: 1.2
          },
          'mezzala': {
            passing: 1.2,
            vision: 1.2,
            shooting: 1.2,
            stamina: 1.3
          },
          'regista': {
            passing: 1.4,
            vision: 1.4,
            positioning: 1.2,
            tackling: 1.1
          }
        }
      },
      state: {
        teamFormations: new Map(),
        playerPositions: new Map(),
        playerRoles: new Map(),
        lastUpdate: 0,
        teamTactics: new Map(),
        formationEffectiveness: new Map(),
        formationTransitions: new Map(),
        transitionProgress: new Map()
      },
      methods: {
        initialize() {
          this.state.teamFormations.clear();
          this.state.playerPositions.clear();
          this.state.playerRoles.clear();
          this.state.lastUpdate = Date.now();
          this.state.teamTactics.clear();
          this.state.formationEffectiveness.clear();
          this.state.formationTransitions.clear();
          this.state.transitionProgress.clear();
        },
        setTeamFormation(teamId, formation) {
          if (!this.config.formations[formation]) return false;
          
          const currentFormation = this.state.teamFormations.get(teamId);
          if (currentFormation === formation) return true;
          
          // Start formation transition
          this.startFormationTransition(teamId, currentFormation, formation);
          this.state.teamFormations.set(teamId, formation);
          return true;
        },
        
        startFormationTransition(teamId, fromFormation, toFormation) {
          const team = this.getTeam(teamId);
          if (!team) return;
          
          const fromConfig = this.config.formations[fromFormation];
          const toConfig = this.config.formations[toFormation];
          if (!fromConfig || !toConfig) return;
          
          // Store transition data
          const transition = {
            fromPositions: new Map(),
            toPositions: new Map(),
            startTime: Date.now(),
            duration: 2000 // 2 seconds transition
          };
          
          // Calculate start and end positions for each player
          team.players.forEach((player, index) => {
            const fromPos = this.getPlayerPosition(fromConfig, player.role, index);
            const toPos = this.getPlayerPosition(toConfig, player.role, index);
            
            if (fromPos && toPos) {
              transition.fromPositions.set(player.id, fromPos);
              transition.toPositions.set(player.id, toPos);
            }
          });
          
          this.state.formationTransitions.set(teamId, transition);
          this.state.transitionProgress.set(teamId, 0);
        },
        
        updateFormationTransitions(timestamp) {
          this.state.formationTransitions.forEach((transition, teamId) => {
            const progress = Math.min(1, (timestamp - transition.startTime) / transition.duration);
            this.state.transitionProgress.set(teamId, progress);
            
            // Update player positions during transition
            const team = this.getTeam(teamId);
            if (!team) return;
            
            team.players.forEach(player => {
              const fromPos = transition.fromPositions.get(player.id);
              const toPos = transition.toPositions.get(player.id);
              
              if (fromPos && toPos) {
                const currentPos = {
                  x: fromPos.x + (toPos.x - fromPos.x) * this.easeInOutQuad(progress),
                  y: fromPos.y + (toPos.y - fromPos.y) * this.easeInOutQuad(progress)
                };
                this.state.playerPositions.set(player.id, currentPos);
              }
            });
            
            // Complete transition if finished
            if (progress >= 1) {
              this.completeFormationTransition(teamId);
            }
          });
        },
        
        completeFormationTransition(teamId) {
          const transition = this.state.formationTransitions.get(teamId);
          if (!transition) return;
          
          // Set final positions
          const team = this.getTeam(teamId);
          if (!team) return;
          
          team.players.forEach(player => {
            const finalPos = transition.toPositions.get(player.id);
            if (finalPos) {
              this.state.playerPositions.set(player.id, finalPos);
            }
          });
          
          // Clean up transition data
          this.state.formationTransitions.delete(teamId);
          this.state.transitionProgress.delete(teamId);
          
          // Update team tactics
          this.updateTeamTactics(teamId);
        },
        
        easeInOutQuad(t) {
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        },
        
        getTeamFormation(teamId) {
          return this.state.teamFormations.get(teamId) || this.config.defaultFormation;
        },
        
        updateTeamPositions(teamId) {
          const formation = this.getTeamFormation(teamId);
          const formationConfig = this.config.formations[formation];
          if (!formationConfig) return;
          
          const team = this.getTeam(teamId);
          if (!team) return;
          
          // Update player positions based on formation
          team.players.forEach((player, index) => {
            const position = this.getPlayerPosition(formationConfig, player.role, index);
            if (position) {
              this.state.playerPositions.set(player.id, position);
            }
          });
          
          // Update team tactics
          this.updateTeamTactics(teamId);
        },
        
        updateTeamTactics(teamId) {
          const formation = this.getTeamFormation(teamId);
          const formationConfig = this.config.formations[formation];
          if (!formationConfig) return;
          
          const team = this.getTeam(teamId);
          if (!team) return;
          
          // Determine team's current strategy based on game state
          const strategy = this.determineTeamStrategy(teamId);
          const tactics = formationConfig.tactics[strategy];
          
          if (tactics) {
            this.state.teamTactics.set(teamId, {
              ...tactics,
              strategy
            });
          }
        },
        
        determineTeamStrategy(teamId) {
          const team = this.getTeam(teamId);
          if (!team) return 'balanced';
          
          const stats = this.stats.getTeamStats(teamId);
          if (!stats) return 'balanced';
          
          // Determine strategy based on game state and team performance
          const scoreDiff = stats.goalsFor - stats.goalsAgainst;
          const possession = stats.possession;
          const timeLeft = this.gameState.time - this.gameState.currentTime;
          
          if (scoreDiff < -1 && timeLeft > 300) {
            return 'attacking';
          } else if (scoreDiff > 1 && timeLeft < 300) {
            return 'defensive';
          } else if (possession < 0.4) {
            return 'defensive';
          } else if (possession > 0.6) {
            return 'attacking';
          }
          
          return 'balanced';
        },
        
        updateFormationEffectiveness(teamId) {
          const formation = this.getTeamFormation(teamId);
          if (!formation) return;
          
          const stats = this.stats.getTeamStats(teamId);
          if (!stats) return;
          
          // Calculate formation effectiveness based on team performance
          let effectiveness = 1.0;
          
          // Enhanced factors that affect formation effectiveness
          const possessionFactor = stats.possession / (this.gameState.time * 0.5);
          const passFactor = stats.passes / (this.gameState.time * 0.1);
          const tackleFactor = stats.tackles / (this.gameState.time * 0.2);
          const goalFactor = stats.goals * 0.2;
          const xGFactor = stats.expectedGoals * 0.15;
          const pressFactor = stats.pressures / (this.gameState.time * 0.15);
          const recoveryFactor = stats.recoveries / (this.gameState.time * 0.1);
          
          // Adjust effectiveness based on formation type and style
          switch (formation) {
            case '4-4-2':
              effectiveness *= (1 + possessionFactor * 0.8) * (1 + passFactor * 1.2) * (1 + pressFactor * 0.9);
              break;
            case '4-3-3':
              effectiveness *= (1 + goalFactor * 1.2) * (1 + possessionFactor * 1.1) * (1 + xGFactor * 1.1);
              break;
            case '3-5-2':
              effectiveness *= (1 + passFactor * 1.3) * (1 + tackleFactor * 0.9) * (1 + recoveryFactor * 1.1);
              break;
            case '5-3-2':
              effectiveness *= (1 + tackleFactor * 1.2) * (1 + possessionFactor * 0.7) * (1 + pressFactor * 1.2);
              break;
            case '4-2-3-1':
              effectiveness *= (1 + goalFactor * 1.1) * (1 + passFactor * 1.2) * (1 + xGFactor * 1.2);
              break;
            case '4-1-4-1':
              effectiveness *= (1 + possessionFactor * 1.2) * (1 + passFactor * 1.3) * (1 + pressFactor * 1.1);
              break;
          }
          
          // Consider team's current strategy
          const tactics = this.state.teamTactics.get(teamId);
          if (tactics) {
            switch (tactics.strategy) {
              case 'defensive':
                effectiveness *= (1 + tackleFactor * 0.2) * (1 + recoveryFactor * 0.2);
                break;
              case 'attacking':
                effectiveness *= (1 + goalFactor * 0.2) * (1 + xGFactor * 0.2);
                break;
            }
          }
          
          // Limit effectiveness range
          effectiveness = Math.max(0.5, Math.min(2.0, effectiveness));
          
          // Store effectiveness
          this.state.formationEffectiveness.set(teamId, effectiveness);
          
          // Suggest formation change if effectiveness is low
          if (effectiveness < 0.7) {
            this.suggestFormationChange(teamId);
          }
        },
        
        suggestFormationChange(teamId) {
          const currentFormation = this.getTeamFormation(teamId);
          const stats = this.stats.getTeamStats(teamId);
          if (!stats) return;
          
          // Analyze team performance
          const isDefensive = stats.goalsAgainst > stats.goalsFor;
          const isPossessionBased = stats.possession > 0.6;
          const isCounterAttacking = stats.passes < stats.tackles;
          
          // Suggest new formation based on performance
          let suggestedFormation = currentFormation;
          
          if (isDefensive) {
            suggestedFormation = '5-3-2';
          } else if (isPossessionBased) {
            suggestedFormation = '4-2-3-1';
          } else if (isCounterAttacking) {
            suggestedFormation = '4-3-3';
          } else {
            suggestedFormation = '4-4-2';
          }
          
          // Only suggest if different from current
          if (suggestedFormation !== currentFormation) {
            this.emit('formationSuggestion', {
              teamId,
              currentFormation,
              suggestedFormation,
              reason: this.getFormationSuggestionReason(stats)
            });
          }
        },
        
        getFormationSuggestionReason(stats) {
          if (stats.goalsAgainst > stats.goalsFor) {
            return 'Defensive reinforcement needed';
          } else if (stats.possession > 0.6) {
            return 'Better possession control needed';
          } else if (stats.passes < stats.tackles) {
            return 'More attacking options needed';
          }
          return 'Balance needed';
        }
      }
    };

    // Match Events System
    this.matchEventsSystem = {
      config: {
        enabled: true,
        eventTypes: {
          goal: {
            name: 'Goal',
            xpReward: 100,
            sound: 'sounds/goal.mp3',
            effect: 'goalEffect',
            animation: 'goalCelebration'
          },
          assist: {
            name: 'Assist',
            xpReward: 50,
            sound: 'sounds/assist.mp3',
            effect: 'assistEffect',
            animation: 'assistHighlight'
          },
          save: {
            name: 'Save',
            xpReward: 30,
            sound: 'sounds/save.mp3',
            effect: 'saveEffect',
            animation: 'saveHighlight'
          },
          tackle: {
            name: 'Tackle',
            xpReward: 20,
            sound: 'sounds/tackle.mp3',
            effect: 'tackleEffect',
            animation: 'tackleHighlight'
          },
          pass: {
            name: 'Pass',
            xpReward: 10,
            sound: 'sounds/pass.mp3',
            effect: 'passEffect',
            animation: 'passTrail'
          },
          interception: {
            name: 'Interception',
            xpReward: 15,
            sound: 'sounds/interception.mp3',
            effect: 'interceptionEffect',
            animation: 'interceptionHighlight'
          },
          possession: {
            name: 'Possession',
            xpReward: 5,
            effect: 'possessionEffect',
            animation: 'possessionIndicator'
          },
          shot: {
            name: 'Shot',
            xpReward: 25,
            sound: 'sounds/shot.mp3',
            effect: 'shotEffect',
            animation: 'shotTrail'
          },
          foul: {
            name: 'Foul',
            xpReward: -10,
            sound: 'sounds/foul.mp3',
            effect: 'foulEffect',
            animation: 'foulIndicator'
          },
          yellowCard: {
            name: 'Yellow Card',
            xpReward: -20,
            sound: 'sounds/card.mp3',
            effect: 'cardEffect',
            animation: 'yellowCardShow'
          },
          redCard: {
            name: 'Red Card',
            xpReward: -50,
            sound: 'sounds/card.mp3',
            effect: 'cardEffect',
            animation: 'redCardShow'
          },
          // New event types
          dribble: {
            name: 'Dribble',
            xpReward: 15,
            sound: 'sounds/dribble.mp3',
            effect: 'dribbleEffect',
            animation: 'dribbleTrail'
          },
          clearance: {
            name: 'Clearance',
            xpReward: 20,
            sound: 'sounds/clearance.mp3',
            effect: 'clearanceEffect',
            animation: 'clearanceHighlight'
          },
          offside: {
            name: 'Offside',
            xpReward: -5,
            sound: 'sounds/whistle.mp3',
            effect: 'offsideEffect',
            animation: 'offsideIndicator'
          },
          corner: {
            name: 'Corner',
            xpReward: 5,
            sound: 'sounds/whistle.mp3',
            effect: 'cornerEffect',
            animation: 'cornerIndicator'
          },
          freekick: {
            name: 'Free Kick',
            xpReward: 10,
            sound: 'sounds/whistle.mp3',
            effect: 'freekickEffect',
            animation: 'freekickIndicator'
          },
          penalty: {
            name: 'Penalty',
            xpReward: 15,
            sound: 'sounds/whistle.mp3',
            effect: 'penaltyEffect',
            animation: 'penaltySpot'
          }
        },
        eventHistory: {
          maxEvents: 100,
          autoCleanup: true,
          detailedStats: true
        },
        notifications: {
          duration: 3000,
          position: 'top-right',
          style: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif'
          }
        }
      },
      state: {
        events: [],
        lastEvent: null,
        eventQueue: [],
        eventListeners: new Map(),
        activeEffects: new Set(),
        notifications: []
      },
      methods: {
        initialize() {
          this.state.events = [];
          this.state.lastEvent = null;
          this.state.eventQueue = [];
          this.state.eventListeners.clear();
          
          // Initialize event listeners
          this.setupEventListeners();
        },
        
        setupEventListeners() {
          // Game state events
          this.on('goal', this.handleGoal.bind(this));
          this.on('assist', this.handleAssist.bind(this));
          this.on('save', this.handleSave.bind(this));
          this.on('tackle', this.handleTackle.bind(this));
          this.on('pass', this.handlePass.bind(this));
          this.on('interception', this.handleInterception.bind(this));
          this.on('possession', this.handlePossession.bind(this));
          this.on('shot', this.handleShot.bind(this));
          this.on('foul', this.handleFoul.bind(this));
          this.on('card', this.handleCard.bind(this));
          this.on('dribble', this.handleDribble.bind(this));
          this.on('clearance', this.handleClearance.bind(this));
          this.on('offside', this.handleOffside.bind(this));
          this.on('corner', this.handleCorner.bind(this));
          this.on('freekick', this.handleFreekick.bind(this));
          this.on('penalty', this.handlePenalty.bind(this));
        },
        
        on(eventType, callback) {
          if (!this.state.eventListeners.has(eventType)) {
            this.state.eventListeners.set(eventType, new Set());
          }
          this.state.eventListeners.get(eventType).add(callback);
        },
        
        emit(eventType, data) {
          const event = {
            type: eventType,
            data,
            timestamp: Date.now()
          };
          
          // Add to event history
          this.state.events.push(event);
          if (this.state.events.length > this.config.eventHistory.maxEvents) {
            this.state.events.shift();
          }
          
          // Update last event
          this.state.lastEvent = event;
          
          // Queue event for processing
          this.state.eventQueue.push(event);
          
          // Notify listeners
          const listeners = this.state.eventListeners.get(eventType);
          if (listeners) {
            listeners.forEach(callback => callback(event));
          }
          
          // Show notification
          this.showNotification(event);
        },
        
        showNotification(event) {
          const message = this.formatEventMessage(event);
          const notification = {
            id: Date.now(),
            message,
            type: event.type,
            timestamp: Date.now()
          };
          
          // Add to notifications
          this.state.notifications.push(notification);
          
          // Create notification element
          const element = document.createElement('div');
          element.className = 'game-notification';
          element.textContent = message;
          
          // Apply styles
          Object.assign(element.style, this.config.notifications.style);
          
          // Add to container
          this.container.appendChild(element);
          
          // Animate in
          element.style.opacity = '0';
          element.style.transform = 'translateY(-20px)';
          
          requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
          });
          
          // Remove after duration
          setTimeout(() => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
              this.container.removeChild(element);
              this.state.notifications = this.state.notifications.filter(n => n.id !== notification.id);
            }, 300);
          }, this.config.notifications.duration);
        },
        
        formatEventMessage(event) {
          const eventConfig = this.config.eventTypes[event.type];
          const player = event.data.player;
          const team = event.data.team;
          
          switch (event.type) {
            case 'goal':
              return `${player} scored for ${team}!`;
            case 'assist':
              return `${player} assisted the goal!`;
            case 'save':
              return `${player} made a save!`;
            case 'tackle':
              return `${player} won the ball!`;
            case 'pass':
              return `${player} completed a pass`;
            case 'interception':
              return `${player} intercepted the ball!`;
            case 'possession':
              return `${player} gained possession`;
            case 'shot':
              return `${player} took a shot!`;
            case 'foul':
              return `${player} committed a foul`;
            case 'yellowCard':
              return `${player} received a yellow card`;
            case 'redCard':
              return `${player} received a red card`;
            case 'dribble':
              return `${player} dribbled the ball!`;
            case 'clearance':
              return `${player} cleared the ball!`;
            case 'offside':
              return `${player} was offside`;
            case 'corner':
              return `${team} earned a corner!`;
            case 'freekick':
              return `${team} earned a free kick!`;
            case 'penalty':
              return `${team} was awarded a penalty!`;
            default:
              return `${eventConfig.name} by ${player}`;
          }
        },
        
        handleGoal(event) {
          const { player, team, position } = event.data;
          
          // Update score
          this.updateScore(team);
          
          // Add XP
          this.addXp(player, this.config.eventTypes.goal.xpReward);
          
          // Play sound
          this.playSound('goal');
          
          // Show effect
          this.showEffect('goalEffect', position);
          
          // Update statistics
          this.updateStats(team, 'goals');
          
          // Emit goal celebration effect
          const goalX = team === 'red' ? this.width - 20 : 20;
          const goalY = this.height / 2;
          this.particleSystem.emitEffect(goalX, goalY, 'goalCelebration');
        },
        
        handleAssist(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.assist.xpReward);
          
          // Play sound
          this.playSound('assist');
          
          // Show effect
          this.showEffect('assistEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'assists');
        },
        
        handleSave(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.save.xpReward);
          
          // Play sound
          this.playSound('save');
          
          // Show effect
          this.showEffect('saveEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'saves');
        },
        
        handleTackle(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.tackle.xpReward);
          
          // Play sound
          this.playSound('tackle');
          
          // Show effect
          this.showEffect('tackleEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'tackles');
        },
        
        handlePass(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.pass.xpReward);
          
          // Play sound
          this.playSound('pass');
          
          // Show effect
          this.showEffect('passEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'passes');
        },
        
        handleInterception(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.interception.xpReward);
          
          // Play sound
          this.playSound('interception');
          
          // Show effect
          this.showEffect('interceptionEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'interceptions');
        },
        
        handlePossession(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.possession.xpReward);
          
          // Show effect
          this.showEffect('possessionEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'possession');
        },
        
        handleShot(event) {
          const { player, position } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.shot.xpReward);
          
          // Play sound
          this.playSound('shot');
          
          // Show effect
          this.showEffect('shotEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'shots');
        },
        
        handleFoul(event) {
          const { player, position } = event.data;
          
          // Add XP (negative)
          this.addXp(player, this.config.eventTypes.foul.xpReward);
          
          // Play sound
          this.playSound('foul');
          
          // Show effect
          this.showEffect('foulEffect', position);
          
          // Update statistics
          this.updateStats(player.team, 'fouls');
        },
        
        handleCard(event) {
          const { player, type, position } = event.data;
          
          // Add XP (negative)
          this.addXp(player, this.config.eventTypes[type].xpReward);
          
          // Play sound
          this.playSound('card');
          
          // Show effect
          this.showEffect('cardEffect', position);
          
          // Update statistics
          this.updateStats(player.team, type === 'yellowCard' ? 'yellowCards' : 'redCards');
        },
        
        handleDribble(event) {
          const { player, position, distance } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.dribble.xpReward);
          
          // Play sound
          this.playSound('dribble');
          
          // Show effect
          this.showEffect('dribbleEffect', position);
          
          // Show animation
          this.playAnimation('dribbleTrail', {
            start: position,
            distance: distance,
            duration: 1000
          });
          
          // Update statistics
          this.updateStats(player.team, 'dribbles');
        },
        
        handleClearance(event) {
          const { player, position, distance } = event.data;
          
          // Add XP
          this.addXp(player, this.config.eventTypes.clearance.xpReward);
          
          // Play sound
          this.playSound('clearance');
          
          // Show effect
          this.showEffect('clearanceEffect', position);
          
          // Show animation
          this.playAnimation('clearanceHighlight', {
            position: position,
            distance: distance,
            duration: 800
          });
          
          // Update statistics
          this.updateStats(player.team, 'clearances');
        },
        
        handleOffside(event) {
          const { player, position } = event.data;
          
          // Add XP (negative)
          this.addXp(player, this.config.eventTypes.offside.xpReward);
          
          // Play sound
          this.playSound('whistle');
          
          // Show effect
          this.showEffect('offsideEffect', position);
          
          // Show animation
          this.playAnimation('offsideIndicator', {
            position: position,
            duration: 1500
          });
          
          // Update statistics
          this.updateStats(player.team, 'offsides');
        },
        
        handleCorner(event) {
          const { team, position } = event.data;
          
          // Show effect
          this.showEffect('cornerEffect', position);
          
          // Show animation
          this.playAnimation('cornerIndicator', {
            position: position,
            duration: 2000
          });
          
          // Update statistics
          this.updateStats(team, 'corners');
        },
        
        handleFreekick(event) {
          const { team, position } = event.data;
          
          // Show effect
          this.showEffect('freekickEffect', position);
          
          // Show animation
          this.playAnimation('freekickIndicator', {
            position: position,
            duration: 2000
          });
          
          // Update statistics
          this.updateStats(team, 'freekicks');
        },
        
        handlePenalty(event) {
          const { team, position } = event.data;
          
          // Show effect
          this.showEffect('penaltyEffect', position);
          
          // Show animation
          this.playAnimation('penaltySpot', {
            position: position,
            duration: 2000
          });
          
          // Update statistics
          this.updateStats(team, 'penalties');
        },
        
        updateScore(team) {
          const score = this.gameState.score;
          score[team]++;
          
          // Check for game end
          if (score[team] >= this.gameState.maxScore) {
            this.endGame(team);
          }
        },
        
        updateStats(team, stat) {
          const teamStats = this.stats.data.teams[team];
          if (teamStats && teamStats[stat] !== undefined) {
            teamStats[stat]++;
          }
        },
        
        playSound(soundType) {
          const eventConfig = this.config.eventTypes[soundType];
          if (eventConfig && eventConfig.sound) {
            const sound = new Audio(eventConfig.sound);
            sound.play();
          }
        },
        
        showEffect(effectType, position) {
          // Implementation depends on your effects system
          if (this.effects && this.effects[effectType]) {
            this.effects[effectType](position);
          }
        },
        
        addXp(playerId, amount) {
          const player = this.playerSkills.state.playerSkills.get(playerId);
          if (!player) return;
          
          player.xp += amount;
          while (player.xp >= this.getRequiredXp(player.level)) {
            this.levelUp(playerId);
          }
        },
        
        levelUp(playerId) {
          const player = this.playerSkills.state.playerSkills.get(playerId);
          if (!player) return;
          
          player.level++;
          player.xp -= this.getRequiredXp(player.level - 1);
          this.updateSkillEffects(playerId);
        },
        
        getRequiredXp(level) {
          return Math.floor(100 * Math.pow(1.2, level - 1));
        },
        
        updateSkillEffects(playerId) {
          const player = this.playerSkills.state.playerSkills.get(playerId);
          if (!player) return;
          
          // Update player's skill effects based on new level
          this.playerSkills.methods.updateSkillEffects(playerId);
        },
        
        getEventHistory(type = null) {
          if (type) {
            return this.state.events.filter(event => event.type === type);
          }
          return this.state.events;
        },
        
        getLastEvent() {
          return this.state.lastEvent;
        },
        
        clearEventHistory() {
          this.state.events = [];
          this.state.lastEvent = null;
        }
      }
    };

    // Enhanced Error Handling System
    this.errorHandler = {
      config: {
        enabled: true,
        logLevel: 'error', // 'debug', 'info', 'warn', 'error'
        maxErrors: 100,
        errorTypes: {
          validation: {
            priority: 'high',
            recovery: true
          },
          network: {
            priority: 'high',
            recovery: true
          },
          physics: {
            priority: 'medium',
            recovery: true
          },
          rendering: {
            priority: 'low',
            recovery: true
          },
          audio: {
            priority: 'low',
            recovery: true
          }
        }
      },
      state: {
        errors: [],
        recoveryAttempts: new Map(),
        lastError: null
      },
      methods: {
        initialize() {
          if (!this.config.enabled) return;
          
          this.state.errors = [];
          this.state.recoveryAttempts.clear();
          this.state.lastError = null;
          
          // Set up error event listeners
          window.addEventListener('error', this.handleGlobalError.bind(this));
          window.addEventListener('unhandledrejection', this.handlePromiseError.bind(this));
        },
        
        handleError(error, type, context = {}) {
          if (!this.config.enabled) return;
          
          const errorInfo = {
            timestamp: Date.now(),
            type,
            message: error.message || 'Unknown error',
            stack: error.stack,
            context,
            priority: this.config.errorTypes[type]?.priority || 'low'
          };
          
          // Add to error log
          this.state.errors.push(errorInfo);
          if (this.state.errors.length > this.config.maxErrors) {
            this.state.errors.shift();
          }
          
          // Update last error
          this.state.lastError = errorInfo;
          
          // Attempt recovery if configured
          if (this.config.errorTypes[type]?.recovery) {
            this.attemptRecovery(errorInfo);
          }
          
          // Log error
          this.logError(errorInfo);
          
          // Emit error event
          this.emit('error', errorInfo);
        },
        
        handleGlobalError(event) {
          this.handleError(event.error || new Error(event.message), 'system', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          });
        },
        
        handlePromiseError(event) {
          this.handleError(event.reason, 'promise', {
            promise: event.promise
          });
        },
        
        attemptRecovery(errorInfo) {
          const attempts = this.state.recoveryAttempts.get(errorInfo.type) || 0;
          if (attempts >= 3) {
            this.handleError(new Error('Recovery failed after 3 attempts'), 'recovery', {
              originalError: errorInfo
            });
            return;
          }
          
          this.state.recoveryAttempts.set(errorInfo.type, attempts + 1);
          
          switch (errorInfo.type) {
            case 'validation':
              this.recoverValidation(errorInfo);
              break;
            case 'network':
              this.recoverNetwork(errorInfo);
              break;
            case 'physics':
              this.recoverPhysics(errorInfo);
              break;
            case 'rendering':
              this.recoverRendering(errorInfo);
              break;
            case 'audio':
              this.recoverAudio(errorInfo);
              break;
            default:
              this.recoverDefault(errorInfo);
          }
        },
        
        recoverValidation(errorInfo) {
          // Reset invalid state to last known good state
          if (errorInfo.context.field) {
            this.resetFieldState();
          }
        },
        
        recoverNetwork(errorInfo) {
          // Attempt to reconnect or retry failed network operations
          if (errorInfo.context.connection) {
            this.reconnect();
          }
        },
        
        recoverPhysics(errorInfo) {
          // Reset physics state to stable configuration
          if (errorInfo.context.physics) {
            this.resetPhysics();
          }
        },
        
        recoverRendering(errorInfo) {
          // Reset renderer to default state
          if (errorInfo.context.renderer) {
            this.resetRenderer();
          }
        },
        
        recoverAudio(errorInfo) {
          // Reset audio system
          if (errorInfo.context.audio) {
            this.resetAudio();
          }
        },
        
        recoverDefault(errorInfo) {
          // Generic recovery attempt
          console.warn('Attempting generic recovery for:', errorInfo);
        },
        
        logError(errorInfo) {
          const logMessage = `[${errorInfo.type.toUpperCase()}] ${errorInfo.message}`;
          
          switch (this.config.logLevel) {
            case 'debug':
              console.debug(logMessage, errorInfo);
              break;
            case 'info':
              console.info(logMessage);
              break;
            case 'warn':
              console.warn(logMessage);
              break;
            case 'error':
              console.error(logMessage, errorInfo);
              break;
          }
        },
        
        getErrors(type = null) {
          if (type) {
            return this.state.errors.filter(error => error.type === type);
          }
          return this.state.errors;
        },
        
        getLastError() {
          return this.state.lastError;
        },
        
        clearErrors() {
          this.state.errors = [];
          this.state.lastError = null;
        }
      }
    };

    // Configurazione delle formazioni
    this.formations = {
      '4-4-2': {
        positions: [
          { x: 0, y: 0, role: 'goalkeeper' },
          { x: -30, y: -20, role: 'defender' },
          { x: -30, y: 0, role: 'defender' },
          { x: -30, y: 20, role: 'defender' },
          { x: -15, y: -20, role: 'defender' },
          { x: -15, y: -10, role: 'midfielder' },
          { x: -15, y: 10, role: 'midfielder' },
          { x: -15, y: 20, role: 'midfielder' },
          { x: 0, y: -10, role: 'forward' },
          { x: 0, y: 10, role: 'forward' }
        ],
        roles: {
          goalkeeper: { defense: 1.0, attack: 0.1 },
          defender: { defense: 0.8, attack: 0.3 },
          midfielder: { defense: 0.6, attack: 0.6 },
          forward: { defense: 0.3, attack: 0.8 }
        },
        tactics: {
          defensive: { compactness: 0.8, pressing: 0.4 },
          balanced: { compactness: 0.5, pressing: 0.6 },
          attacking: { compactness: 0.3, pressing: 0.8 }
        }
      },
      '5-3-2': {
        positions: [
          { x: 0, y: 0, role: 'goalkeeper' },
          { x: -35, y: -25, role: 'defender' },
          { x: -35, y: -10, role: 'defender' },
          { x: -35, y: 0, role: 'defender' },
          { x: -35, y: 10, role: 'defender' },
          { x: -35, y: 25, role: 'defender' },
          { x: -20, y: -15, role: 'midfielder' },
          { x: -20, y: 0, role: 'midfielder' },
          { x: -20, y: 15, role: 'midfielder' },
          { x: 0, y: -10, role: 'forward' },
          { x: 0, y: 10, role: 'forward' }
        ],
        roles: {
          goalkeeper: { defense: 1.0, attack: 0.1 },
          defender: { defense: 0.9, attack: 0.2 },
          midfielder: { defense: 0.5, attack: 0.7 },
          forward: { defense: 0.3, attack: 0.8 }
        },
        tactics: {
          defensive: { compactness: 0.9, pressing: 0.3 },
          balanced: { compactness: 0.6, pressing: 0.5 },
          attacking: { compactness: 0.4, pressing: 0.7 }
        }
      }
    };

    // Initialize particle system
    this.particleSystem = new AdvancedParticleSystem(this.canvas, {
      maxParticles: 2000
    });
  }

  initWeatherSystem() {
    // Initialize particle pool
    this.weather.state.particlePool = Array(this.weather.config.performance.particlePoolSize)
      .fill(null)
      .map(() => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: '',
        active: false
      }));

    // Load weather sounds
    this.weather.sounds = {};
    Object.entries(this.weather.config.effects).forEach(([type, effect]) => {
      if (effect.sound) {
        this.weather.sounds[type] = new Audio(effect.sound.file);
        this.weather.sounds[type].volume = effect.sound.volume;
        this.weather.sounds[type].loop = effect.sound.loop;
      }
    });
  }

  setWeather(type, intensity = 0.5) {
    if (!this.weather.config.effects[type]) return;
    
    this.weather.state.targetType = type;
    this.weather.state.transitionProgress = 0;
    this.startWeatherTransition();
  }

  startWeatherTransition() {
    const startTime = performance.now();
    const duration = this.weather.config.transitions.duration;
    
    const updateTransition = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.weather.state.transitionProgress = progress;
      
      if (progress < 1) {
        requestAnimationFrame(updateTransition);
      } else {
        this.completeWeatherTransition();
      }
    };
    
    requestAnimationFrame(updateTransition);
  }

  completeWeatherTransition() {
    // Stop old weather effect
    if (this.weather.state.currentType !== 'none') {
      const oldEffect = this.weather.config.effects[this.weather.state.currentType];
      if (oldEffect.sound && this.weather.sounds[this.weather.state.currentType]) {
        this.weather.sounds[this.weather.state.currentType].pause();
      }
    }
    
    // Start new weather effect
    this.weather.state.currentType = this.weather.state.targetType;
    this.weather.state.active = this.weather.state.currentType !== 'none';
    
    if (this.weather.state.active) {
      const effect = this.weather.config.effects[this.weather.state.currentType];
      this.initializeParticles(this.weather.state.currentType);
      
      if (effect.sound && this.weather.sounds[this.weather.state.currentType]) {
        this.weather.sounds[this.weather.state.currentType].play();
      }
    }
  }

  initializeParticles(type) {
    const effect = this.weather.config.effects[type];
    const particles = this.weather.state.particles;
    
    // Clear existing particles
    particles.length = 0;
    
    // Initialize new particles
    for (let i = 0; i < effect.particleCount; i++) {
      const particle = this.weather.state.particlePool[i] || {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: '',
        active: false
      };
      
      particle.x = Math.random() * this.width;
      particle.y = Math.random() * this.height;
      particle.vx = (Math.random() - 0.5) * effect.particleSpeed;
      particle.vy = effect.particleSpeed;
      particle.size = effect.particleSize * (0.5 + Math.random() * 0.5);
      particle.color = effect.particleColor;
      particle.active = true;
      
      particles.push(particle);
    }
  }

  updateWeather(timestamp) {
    if (!this.weather.state.active) return;
    
    const effect = this.weather.config.effects[this.weather.state.currentType];
    const particles = this.weather.state.particles;
    
    // Update particles
    for (const particle of particles) {
      if (!particle.active) continue;
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Handle particle lifecycle
      if (particle.y > this.height) {
        particle.y = 0;
        particle.x = Math.random() * this.width;
      }
      
      if (particle.x < 0) particle.x = this.width;
      if (particle.x > this.width) particle.x = 0;
    }
    
    // Update physics
    this.updateWeatherPhysics(this.weather.state.currentType);
    
    // Handle special effects
    if (effect.lightning && timestamp - this.weather.state.lastThunder > effect.thunderInterval) {
      if (Math.random() < 0.1) {
        this.createLightningEffect();
        this.weather.state.lastThunder = timestamp;
      }
    }
  }

  updateWeatherPhysics(type) {
    const effect = this.weather.config.effects[type];
    
    // Update ball physics
    this.ball.friction *= effect.physics.ballFriction;
    
    // Update player physics
    for (const player of this.players) {
      player.friction *= effect.physics.playerFriction;
    }
  }

  createLightningEffect() {
    const effect = this.weather.config.effects[this.weather.state.currentType];
    
    // Create lightning flash
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.1s';
    
    this.container.appendChild(flash);
    
    // Play thunder sound
    if (this.weather.sounds[this.weather.state.currentType]) {
      this.weather.sounds[this.weather.state.currentType].play();
    }
    
    // Remove flash after animation
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 100);
    }, 50);
  }

  drawWeather() {
    if (!this.weather.state.active) return;
    
    const effect = this.weather.config.effects[this.weather.state.currentType];
    const particles = this.weather.state.particles;
    
    // Draw particles
    for (const particle of particles) {
      if (!particle.active) continue;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
    }
  }

  gameLoop(timestamp) {
    // Update game state
    this.updateGameState(timestamp);
    
    // Update weather system
    this.updateWeather(timestamp);
    
    // Update formation transitions
    this.teamFormationsSystem.methods.updateFormationTransitions(timestamp);
    
    // Update physics
    this.updatePhysics(timestamp);
    
    // Update effects
    this.updateEffects(timestamp);
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw field
    this.drawField();
    
    // Draw weather
    this.drawWeather();
    
    // Draw players
    this.drawPlayers();
    
    // Draw ball
    this.drawBall();
    
    // Draw effects
    this.drawEffects();
    
    // Draw UI
    this.drawUI();
    
    // Request next frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  handlePowerShot(player, power) {
    // ... existing code ...
    
    // Emit power shot effect
    this.particleSystem.emitEffect(
      player.x,
      player.y,
      'powerShot',
      Math.atan2(player.velocityY, player.velocityX)
    );
    
    // ... existing code ...
  }

  handleCollision(object1, object2) {
    // ... existing code ...
    
    // Emit collision effect
    const collisionX = (object1.x + object2.x) / 2;
    const collisionY = (object1.y + object2.y) / 2;
    this.particleSystem.emitEffect(collisionX, collisionY, 'collision');
    
    // ... existing code ...
  }

  handleSpeedBoost(player) {
    // ... existing code ...
    
    // Emit speed boost effect
    this.particleSystem.emitEffect(
      player.x,
      player.y,
      'speedBoost',
      Math.atan2(player.velocityY, player.velocityX)
    );
    
    // ... existing code ...
  }

  updateEffects(timestamp) {
    // ... existing code ...
    
    // Update particle system
    this.particleSystem.update(timestamp - this.lastFrameTime);
    
    // ... existing code ...
  }

  drawEffects() {
    // ... existing code ...
    
    // Draw particle effects
    this.particleSystem.render();
    
    // ... existing code ...
  }
}