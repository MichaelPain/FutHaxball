// PlayerSkills.js - Sistema avanzato di abilità dei giocatori

export class PlayerSkills {
    constructor(player) {
        this.player = player;
        
        // Configurazione delle abilità
        this.config = {
            maxSkillLevel: 10,
            skillPointsPerLevel: 1,
            baseSkillPoints: 5,
            skillCategories: {
                shooting: {
                    name: 'Shooting',
                    description: 'Improves shot accuracy and power',
                    maxLevel: 10,
                    effects: {
                        accuracy: 0.05,
                        power: 0.03,
                        curve: 0.02
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
            specialAbilities: {
                speedBoost: {
                    name: 'Speed Boost',
                    cooldown: 5000,
                    duration: 2000,
                    effect: (player) => {
                        const originalSpeed = player.speed;
                        player.speed *= 1.5;
                        return () => player.speed = originalSpeed;
                    },
                    visualEffect: 'speedTrail'
                },
                powerShot: {
                    name: 'Power Shot',
                    cooldown: 3000,
                    effect: (player, ball) => {
                        const angle = Math.atan2(
                            ball.position.y - player.position.y,
                            ball.position.x - player.position.x
                        );
                        ball.applyForce(2.0, angle, 1.5);
                    },
                    visualEffect: 'powerShot'
                },
                wallJump: {
                    name: 'Wall Jump',
                    cooldown: 2000,
                    effect: (player) => {
                        const jumpForce = 10;
                        player.velocity.y = -jumpForce;
                        player.velocity.x *= 1.2;
                    },
                    visualEffect: 'wallJump'
                },
                timeSlow: {
                    name: 'Time Slow',
                    cooldown: 8000,
                    duration: 3000,
                    effect: (player, game) => {
                        game.timeScale = 0.5;
                        return () => game.timeScale = 1.0;
                    },
                    visualEffect: 'timeWarp'
                },
                shield: {
                    name: 'Shield',
                    cooldown: 6000,
                    duration: 2000,
                    effect: (player) => {
                        player.isInvulnerable = true;
                        return () => player.isInvulnerable = false;
                    },
                    visualEffect: 'shield'
                }
            }
        };
        
        // Stato delle abilità
        this.state = {
            level: 1,
            xp: 0,
            skillPoints: this.config.baseSkillPoints,
            skills: {
                shooting: 1,
                passing: 1,
                dribbling: 1,
                defending: 1,
                goalkeeping: 1
            },
            activeEffects: new Map(),
            cooldowns: new Map(),
            lastUsed: new Map(),
            skillEffects: new Map()
        };
        
        // Inizializza i cooldown
        Object.keys(this.config.specialAbilities).forEach(abilityName => {
            this.state.cooldowns.set(abilityName, 0);
            this.state.lastUsed.set(abilityName, 0);
        });
        
        // Aggiorna gli effetti iniziali
        this.updateSkillEffects();
    }
    
    // Usa un'abilità speciale
    useSpecialAbility(abilityName, target = null) {
        const ability = this.config.specialAbilities[abilityName];
        if (!ability) return false;
        
        const now = Date.now();
        const lastUsed = this.state.lastUsed.get(abilityName);
        const cooldown = this.state.cooldowns.get(abilityName);
        
        // Verifica il cooldown
        if (now - lastUsed < cooldown) {
            return false;
        }
        
        // Applica l'effetto
        const cleanup = ability.effect(this.player, target);
        
        // Gestisci gli effetti duraturi
        if (ability.duration) {
            this.state.activeEffects.set(abilityName, {
                startTime: now,
                duration: ability.duration,
                cleanup
            });
        }
        
        // Aggiorna i cooldown
        this.state.lastUsed.set(abilityName, now);
        this.state.cooldowns.set(abilityName, ability.cooldown);
        
        // Attiva l'effetto visivo
        if (ability.visualEffect && this.onVisualEffect) {
            this.onVisualEffect(ability.visualEffect, {
                player: this.player,
                target,
                duration: ability.duration
            });
        }
        
        return true;
    }
    
    // Aggiorna lo stato delle abilità
    update(deltaTime) {
        const now = Date.now();
        
        // Aggiorna i cooldown
        this.state.cooldowns.forEach((cooldown, abilityName) => {
            const lastUsed = this.state.lastUsed.get(abilityName);
            const remaining = Math.max(0, cooldown - (now - lastUsed));
            this.state.cooldowns.set(abilityName, remaining);
        });
        
        // Gestisci gli effetti duraturi
        this.state.activeEffects.forEach((effect, abilityName) => {
            if (now - effect.startTime >= effect.duration) {
                effect.cleanup();
                this.state.activeEffects.delete(abilityName);
            }
        });
    }
    
    // Aggiorna gli effetti delle abilità
    updateSkillEffects() {
        const effects = {};
        
        // Calcola gli effetti per ogni abilità
        Object.entries(this.state.skills).forEach(([skillName, level]) => {
            const category = this.config.skillCategories[skillName];
            if (!category) return;
            
            Object.entries(category.effects).forEach(([effectName, baseEffect]) => {
                if (!effects[effectName]) effects[effectName] = 0;
                effects[effectName] += baseEffect * level;
            });
        });
        
        this.state.skillEffects = effects;
        
        // Applica gli effetti al giocatore
        this.applyEffectsToPlayer();
    }
    
    // Applica gli effetti al giocatore
    applyEffectsToPlayer() {
        const effects = this.state.skillEffects;
        
        // Aggiorna le statistiche del giocatore
        this.player.speed *= (1 + (effects.speed || 0));
        this.player.control *= (1 + (effects.control || 0));
        this.player.accuracy *= (1 + (effects.accuracy || 0));
        this.player.power *= (1 + (effects.power || 0));
        this.player.vision *= (1 + (effects.vision || 0));
    }
    
    // Aggiungi esperienza
    addXp(amount) {
        this.state.xp += amount;
        while (this.state.xp >= this.getRequiredXp(this.state.level)) {
            this.levelUp();
        }
    }
    
    // Salita di livello
    levelUp() {
        this.state.level++;
        this.state.skillPoints += this.config.skillPointsPerLevel;
        this.state.xp -= this.getRequiredXp(this.state.level - 1);
        this.updateSkillEffects();
        
        // Notifica la salita di livello
        if (this.onLevelUp) {
            this.onLevelUp(this.state.level);
        }
    }
    
    // Aggiorna un'abilità
    upgradeSkill(skillName) {
        // Verifica se l'abilità esiste
        if (!this.config.skillCategories[skillName]) return false;
        
        // Verifica se il giocatore ha abbastanza punti abilità
        if (this.state.skillPoints <= 0) return false;
        
        // Verifica se l'abilità è al livello massimo
        if (this.state.skills[skillName] >= this.config.skillCategories[skillName].maxLevel) return false;
        
        // Aggiorna l'abilità
        this.state.skills[skillName]++;
        this.state.skillPoints--;
        
        this.updateSkillEffects();
        
        return true;
    }
    
    // Calcola l'XP richiesta per un livello
    getRequiredXp(level) {
        return Math.floor(100 * Math.pow(1.2, level - 1));
    }
    
    // Verifica se un'abilità speciale è pronta
    isAbilityReady(abilityName) {
        return this.state.cooldowns.get(abilityName) === 0;
    }
    
    // Ottieni il tempo rimanente del cooldown
    getCooldownRemaining(abilityName) {
        return this.state.cooldowns.get(abilityName);
    }
    
    // Ottieni lo stato corrente delle abilità
    getState() {
        return {
            level: this.state.level,
            xp: this.state.xp,
            skillPoints: this.state.skillPoints,
            skills: { ...this.state.skills },
            cooldowns: Object.fromEntries(this.state.cooldowns),
            activeEffects: Array.from(this.state.activeEffects.entries()).map(([name, effect]) => ({
                name,
                remainingTime: effect.duration - (Date.now() - effect.startTime)
            }))
        };
    }
    
    // Imposta i callback per gli effetti visivi
    setVisualEffectCallback(callback) {
        this.onVisualEffect = callback;
    }
    
    // Imposta il callback per la salita di livello
    setLevelUpCallback(callback) {
        this.onLevelUp = callback;
    }
} 