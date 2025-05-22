// physics.js - Sistema di fisica avanzato per replicare le meccaniche originali di HaxBall

export class Physics {
    constructor() {
        // Costanti fisiche
        this.constants = {
            playerRadius: 15,
            ballRadius: 10,
            playerMass: 1,
            ballMass: 0.5,
            playerMaxSpeed: 200,
            ballMaxSpeed: 600,
            friction: 0.98,
            kickStrength: 5,
            bounceStrength: 0.8,
            playerBounceStrength: 0.7,  // Aumentato per rendere le collisioni tra giocatori più evidenti
            ballBounceStrength: 0.9,
            kickCooldown: 200, // millisecondi
            gravity: 0,
            fieldWidth: 800,
            fieldHeight: 600,
            goalWidth: 10,
            goalHeight: 100,
            collisionResponseStrength: 0.8,  // Forza di risposta alle collisioni tra giocatori
            positionCorrectionStrength: 0.6,  // Forza di correzione della posizione per evitare sovrapposizioni
            centerCircleRadius: 100,  // Raggio del cerchio di centrocampo
            kickoffRestrictionTime: 3000  // Tempo in ms durante il quale le restrizioni di kickoff sono attive
        };
        
        // Stato del gioco
        this.gameState = {
            kickoff: false,
            kickoffTeam: 'red',  // La squadra che ha diritto al calcio d'inizio
            kickoffTime: 0,      // Timestamp dell'ultimo calcio d'inizio
            lastGoalTeam: null   // L'ultima squadra che ha segnato
        };
    }

    // Aggiorna la posizione di un oggetto in base alla sua velocità
    updatePosition(object, deltaTime) {
        object.x += object.vx * deltaTime;
        object.y += object.vy * deltaTime;
        
        // Applica l'attrito
        object.vx *= this.constants.friction;
        object.vy *= this.constants.friction;
        
        // Limita la velocità massima
        const speed = Math.sqrt(object.vx * object.vx + object.vy * object.vy);
        const maxSpeed = object.type === 'ball' ? this.constants.ballMaxSpeed : this.constants.playerMaxSpeed;
        
        if (speed > maxSpeed) {
            const ratio = maxSpeed / speed;
            object.vx *= ratio;
            object.vy *= ratio;
        }
    }
    
    // Controlla e gestisce le collisioni tra oggetti
    checkCollisions(objects, field) {
        // Collisioni tra oggetti
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                this.resolveCollision(objects[i], objects[j]);
            }
        }
        
        // Collisioni con i bordi del campo
        let goalScored = false;
        let scoringTeam = null;
        
        objects.forEach(object => {
            const result = this.resolveFieldCollision(object, field);
            if (result.goal) {
                goalScored = true;
                scoringTeam = result.team;
                this.gameState.lastGoalTeam = result.team;
            }
        });
        
        return { goalScored, scoringTeam };
    }
    
    // Risolve la collisione tra due oggetti
    resolveCollision(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calcola la somma dei raggi
        const radius1 = obj1.type === 'ball' ? this.constants.ballRadius : this.constants.playerRadius;
        const radius2 = obj2.type === 'ball' ? this.constants.ballRadius : this.constants.playerRadius;
        const sumRadii = radius1 + radius2;
        
        // Verifica se c'è collisione
        if (distance < sumRadii) {
            // Calcola la profondità di penetrazione
            const penetration = sumRadii - distance;
            
            // Calcola il vettore di normalizzazione
            let nx = 0;
            let ny = 0;
            
            // Evita divisione per zero
            if (distance > 0.0001) {
                nx = dx / distance;
                ny = dy / distance;
            } else {
                // Se gli oggetti sono esattamente sovrapposti, usa una direzione casuale
                const angle = Math.random() * Math.PI * 2;
                nx = Math.cos(angle);
                ny = Math.sin(angle);
            }
            
            // Calcola la velocità relativa
            const vx = obj2.vx - obj1.vx;
            const vy = obj2.vy - obj1.vy;
            
            // Calcola la velocità relativa lungo la normale
            const velocityAlongNormal = vx * nx + vy * ny;
            
            // Determina il tipo di collisione
            const isPlayerVsPlayer = obj1.type === 'player' && obj2.type === 'player';
            const isPlayerVsBall = (obj1.type === 'player' && obj2.type === 'ball') || 
                                  (obj1.type === 'ball' && obj2.type === 'player');
            const isBallVsBall = obj1.type === 'ball' && obj2.type === 'ball';
            
            // Calcola le masse
            const mass1 = obj1.type === 'ball' ? this.constants.ballMass : this.constants.playerMass;
            const mass2 = obj2.type === 'ball' ? this.constants.ballMass : this.constants.playerMass;
            
            // Calcola il coefficiente di restituzione in base al tipo di collisione
            let restitution = this.constants.bounceStrength;
            if (isPlayerVsPlayer) {
                restitution = this.constants.playerBounceStrength;
            } else if (isBallVsBall) {
                restitution = this.constants.ballBounceStrength;
            }
            
            // Per le collisioni tra giocatori, implementiamo un bodyblocking più forte
            if (isPlayerVsPlayer) {
                // Correggi la posizione per evitare sovrapposizioni con una forza maggiore
                const correctionPercent = this.constants.positionCorrectionStrength;
                const correction = (penetration / (1 / mass1 + 1 / mass2)) * correctionPercent;
                
                obj1.x -= nx * correction / mass1;
                obj1.y -= ny * correction / mass1;
                obj2.x += nx * correction / mass2;
                obj2.y += ny * correction / mass2;
                
                // Se gli oggetti si stanno avvicinando, applica una risposta di collisione più forte
                if (velocityAlongNormal < 0) {
                    // Calcola l'impulso con una forza maggiore
                    const j = -(1 + restitution) * velocityAlongNormal / (1 / mass1 + 1 / mass2) * this.constants.collisionResponseStrength;
                    
                    // Applica l'impulso
                    const impulseX = j * nx;
                    const impulseY = j * ny;
                    
                    obj1.vx -= impulseX / mass1;
                    obj1.vy -= impulseY / mass1;
                    obj2.vx += impulseX / mass2;
                    obj2.vy += impulseY / mass2;
                }
            } else if (isPlayerVsBall) {
                // Gestione speciale per le collisioni giocatore-palla durante il calcio d'inizio
                if (this.gameState.kickoff) {
                    const ball = obj1.type === 'ball' ? obj1 : obj2;
                    const player = obj1.type === 'player' ? obj1 : obj2;
                    
                    // Verifica se il giocatore può toccare la palla durante il calcio d'inizio
                    if (!this.canPlayerTouchBallDuringKickoff(player)) {
                        // Se il giocatore non può toccare la palla, applica una collisione "fantasma"
                        // che sposta solo il giocatore, non la palla
                        if (player === obj1) {
                            obj1.x -= nx * penetration;
                            obj1.y -= ny * penetration;
                            obj1.vx *= 0.5; // Rallenta il giocatore
                            obj1.vy *= 0.5;
                        } else {
                            obj2.x += nx * penetration;
                            obj2.y += ny * penetration;
                            obj2.vx *= 0.5; // Rallenta il giocatore
                            obj2.vy *= 0.5;
                        }
                        return;
                    }
                }
                
                // Per le collisioni giocatore-palla, usa la logica standard
                // Se gli oggetti si stanno allontanando, non fare nulla
                if (velocityAlongNormal > 0) return;
                
                // Calcola l'impulso
                const j = -(1 + restitution) * velocityAlongNormal / (1 / mass1 + 1 / mass2);
                
                // Applica l'impulso
                const impulseX = j * nx;
                const impulseY = j * ny;
                
                obj1.vx -= impulseX / mass1;
                obj1.vy -= impulseY / mass1;
                obj2.vx += impulseX / mass2;
                obj2.vy += impulseY / mass2;
                
                // Correggi la posizione per evitare sovrapposizioni
                const correctionPercent = 0.2; // Percentuale di correzione standard
                const correction = (penetration / (1 / mass1 + 1 / mass2)) * correctionPercent;
                
                obj1.x -= nx * correction / mass1;
                obj1.y -= ny * correction / mass1;
                obj2.x += nx * correction / mass2;
                obj2.y += ny * correction / mass2;
            } else {
                // Per le altre collisioni, usa la logica standard
                // Se gli oggetti si stanno allontanando, non fare nulla
                if (velocityAlongNormal > 0) return;
                
                // Calcola l'impulso
                const j = -(1 + restitution) * velocityAlongNormal / (1 / mass1 + 1 / mass2);
                
                // Applica l'impulso
                const impulseX = j * nx;
                const impulseY = j * ny;
                
                obj1.vx -= impulseX / mass1;
                obj1.vy -= impulseY / mass1;
                obj2.vx += impulseX / mass2;
                obj2.vy += impulseY / mass2;
                
                // Correggi la posizione per evitare sovrapposizioni
                const correctionPercent = 0.2; // Percentuale di correzione standard
                const correction = (penetration / (1 / mass1 + 1 / mass2)) * correctionPercent;
                
                obj1.x -= nx * correction / mass1;
                obj1.y -= ny * correction / mass1;
                obj2.x += nx * correction / mass2;
                obj2.y += ny * correction / mass2;
            }
        }
    }
    
    // Risolve la collisione con i bordi del campo
    resolveFieldCollision(object, field) {
        const radius = object.type === 'ball' ? this.constants.ballRadius : this.constants.playerRadius;
        const restitution = object.type === 'ball' ? this.constants.ballBounceStrength : this.constants.playerBounceStrength;
        
        // Collisione con il bordo sinistro
        if (object.x - radius < 0) {
            // Verifica se è un gol (solo per la palla)
            if (object.type === 'ball' && 
                object.y > (field.height - this.constants.goalHeight) / 2 && 
                object.y < (field.height + this.constants.goalHeight) / 2) {
                // È un gol per la squadra blu
                return { goal: true, team: 'blue' };
            }
            
            object.x = radius;
            object.vx = -object.vx * restitution;
        }
        
        // Collisione con il bordo destro
        if (object.x + radius > field.width) {
            // Verifica se è un gol (solo per la palla)
            if (object.type === 'ball' && 
                object.y > (field.height - this.constants.goalHeight) / 2 && 
                object.y < (field.height + this.constants.goalHeight) / 2) {
                // È un gol per la squadra rossa
                return { goal: true, team: 'red' };
            }
            
            object.x = field.width - radius;
            object.vx = -object.vx * restitution;
        }
        
        // Collisione con il bordo superiore
        if (object.y - radius < 0) {
            object.y = radius;
            object.vy = -object.vy * restitution;
        }
        
        // Collisione con il bordo inferiore
        if (object.y + radius > field.height) {
            object.y = field.height - radius;
            object.vy = -object.vy * restitution;
        }
        
        return { goal: false };
    }
    
    // Applica una forza di calcio alla palla
    kickBall(player, ball) {
        // Verifica se il giocatore è in cooldown
        if (player.lastKickTime && Date.now() - player.lastKickTime < this.constants.kickCooldown) {
            return false;
        }
        
        // Durante il calcio d'inizio, verifica se il giocatore può toccare la palla
        if (this.gameState.kickoff && !this.canPlayerTouchBallDuringKickoff(player)) {
            return false;
        }
        
        // Calcola la distanza tra il giocatore e la palla
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Verifica se il giocatore è abbastanza vicino alla palla
        if (distance < this.constants.playerRadius + this.constants.ballRadius + 5) {
            // Calcola la direzione del calcio
            const direction = {
                x: dx / distance,
                y: dy / distance
            };
            
            // Applica la forza del calcio
            ball.vx = direction.x * this.constants.kickStrength * this.constants.ballMaxSpeed;
            ball.vy = direction.y * this.constants.kickStrength * this.constants.ballMaxSpeed;
            
            // Imposta il timestamp dell'ultimo calcio
            player.lastKickTime = Date.now();
            
            // Se siamo in fase di calcio d'inizio, termina il calcio d'inizio
            if (this.gameState.kickoff && player.team === this.gameState.kickoffTeam) {
                this.gameState.kickoff = false;
            }
            
            return true;
        }
        
        return false;
    }
    
    // Verifica se un giocatore può toccare la palla durante il calcio d'inizio
    canPlayerTouchBallDuringKickoff(player) {
        // Se non siamo in fase di calcio d'inizio, tutti possono toccare la palla
        if (!this.gameState.kickoff) {
            return true;
        }
        
        // Se il calcio d'inizio è attivo da più del tempo di restrizione, tutti possono toccare la palla
        if (Date.now() - this.gameState.kickoffTime > this.constants.kickoffRestrictionTime) {
            this.gameState.kickoff = false;
            return true;
        }
        
        // Solo i giocatori della squadra che ha diritto al calcio d'inizio possono toccare la palla
        return player.team === this.gameState.kickoffTeam;
    }
    
    // Verifica se un giocatore è nel cerchio di centrocampo
    isPlayerInCenterCircle(player, field) {
        const centerX = field.width / 2;
        const centerY = field.height / 2;
        
        const dx = player.x - centerX;
        const dy = player.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.constants.centerCircleRadius;
    }
    
    // Applica le restrizioni del calcio d'inizio ai giocatori
    applyKickoffRestrictions(players, ball, field) {
        if (!this.gameState.kickoff) {
            return;
        }
        
        players.forEach(player => {
            // Se il giocatore non è della squadra che ha diritto al calcio d'inizio
            if (player.team !== this.gameState.kickoffTeam) {
                // Verifica se il giocatore è nel cerchio di centrocampo
                if (this.isPlayerInCenterCircle(player, field)) {
                    // Calcola la direzione dal centro del campo al giocatore
                    const centerX = field.width / 2;
                    const centerY = field.height / 2;
                    
                    const dx = player.x - centerX;
                    const dy = player.y - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Normalizza la direzione
                    const nx = dx / distance;
                    const ny = dy / distance;
                    
                    // Calcola la distanza minima dal cerchio
                    const minDistance = this.constants.centerCircleRadius + this.constants.playerRadius;
                    
                    // Sposta il giocatore fuori dal cerchio
                    player.x = centerX + nx * minDistance;
                    player.y = centerY + ny * minDistance;
                    
                    // Ferma il giocatore
                    player.vx = 0;
                    player.vy = 0;
                }
            }
        });
    }
    
    // Resetta la palla al centro del campo e imposta il calcio d'inizio
    resetBallForKickoff(ball, field, scoringTeam) {
        // Posiziona la palla al centro del campo
        ball.x = field.width / 2;
        ball.y = field.height / 2;
        ball.vx = 0;
        ball.vy = 0;
        
        // Imposta lo stato del calcio d'inizio
        this.gameState.kickoff = true;
        this.gameState.kickoffTime = Date.now();
        
        // Se è l'inizio della partita, la squadra rossa (a sinistra) ha il primo possesso
        if (!scoringTeam) {
            this.gameState.kickoffTeam = 'red';
        } else {
            // Altrimenti, la squadra che ha subito il gol ha diritto al calcio d'inizio
            this.gameState.kickoffTeam = scoringTeam === 'red' ? 'blue' : 'red';
        }
    }
    
    // Resetta le posizioni dei giocatori per il calcio d'inizio
    resetPlayersForKickoff(players, field) {
        players.forEach(player => {
            if (player.team === 'red') {
                // Posiziona i giocatori rossi nella loro metà campo
                player.x = field.width / 4;
                player.y = field.height / 2 + (Math.random() * 100 - 50);
            } else {
                // Posiziona i giocatori blu nella loro metà campo
                player.x = field.width * 3 / 4;
                player.y = field.height / 2 + (Math.random() * 100 - 50);
            }
            
            player.vx = 0;
            player.vy = 0;
        });
    }
    
    // Gestisce il calcio d'inizio all'inizio della partita o dopo un gol
    handleKickoff(players, ball, field, scoringTeam = null) {
        // Resetta la palla per il calcio d'inizio
        this.resetBallForKickoff(ball, field, scoringTeam);
        
        // Resetta le posizioni dei giocatori
        this.resetPlayersForKickoff(players, field);
    }
    
    // Verifica se due giocatori si stanno sovrapponendo
    checkPlayerOverlap(player1, player2) {
        const dx = player2.x - player1.x;
        const dy = player2.y - player1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Se la distanza è minore della somma dei raggi, c'è sovrapposizione
        return distance < (this.constants.playerRadius * 2);
    }
    
    // Applica una forza di separazione tra due giocatori che si sovrappongono
    separatePlayers(player1, player2) {
        const dx = player2.x - player1.x;
        const dy = player2.y - player1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Se non c'è sovrapposizione, non fare nulla
        if (distance >= this.constants.playerRadius * 2) return;
        
        // Calcola la profondità di penetrazione
        const penetration = this.constants.playerRadius * 2 - distance;
        
        // Calcola il vettore di normalizzazione
        let nx = 0;
        let ny = 0;
        
        // Evita divisione per zero
        if (distance > 0.0001) {
            nx = dx / distance;
            ny = dy / distance;
        } else {
            // Se i giocatori sono esattamente sovrapposti, usa una direzione casuale
            const angle = Math.random() * Math.PI * 2;
            nx = Math.cos(angle);
            ny = Math.sin(angle);
        }
        
        // Calcola la correzione di posizione
        const correctionPercent = this.constants.positionCorrectionStrength;
        const correction = penetration * correctionPercent;
        
        // Applica la correzione
        player1.x -= nx * correction / 2;
        player1.y -= ny * correction / 2;
        player2.x += nx * correction / 2;
        player2.y += ny * correction / 2;
        
        // Applica anche una forza di respinta
        const restitution = this.constants.playerBounceStrength;
        const impulse = penetration * restitution;
        
        player1.vx -= nx * impulse / 2;
        player1.vy -= ny * impulse / 2;
        player2.vx += nx * impulse / 2;
        player2.vy += ny * impulse / 2;
    }
}
