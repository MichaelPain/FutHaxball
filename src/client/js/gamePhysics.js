// gamePhysics.js - Implementazione reale della fisica del gioco

export class GamePhysics {
    constructor() {
        // Costanti fisiche
        this.friction = 0.98; // Attrito aumentato per movimento più fluido
        this.playerRadius = 15; // Raggio del giocatore
        this.ballRadius = 10; // Raggio della palla
        this.kickPower = 15; // Potenza del calcio
        this.maxSpeed = 12; // Velocità massima aumentata
        this.ballMaxSpeed = 25; // Velocità massima della palla aumentata
        this.ballFriction = 0.99; // Attrito della palla ridotto per movimento più fluido
        this.fieldWidth = 800; // Larghezza del campo
        this.fieldHeight = 400; // Altezza del campo
        this.goalWidth = 100; // Larghezza della porta
        this.goalDepth = 20; // Profondità della porta
        this.bounceCoefficient = 0.85; // Coefficiente di rimbalzo aumentato
        this.airResistance = 0.995; // Resistenza dell'aria
        this.gravity = 0.2; // Gravità leggera
        this.elasticity = 0.8; // Elasticità delle collisioni
    }
    
    // Aggiorna la fisica di un giocatore
    updatePlayerPhysics(player, deltaTime) {
        if (!player) return;
        
        // Applica l'input del giocatore
        if (player.isMoving) {
            // Normalizza la direzione
            const length = Math.sqrt(player.dx * player.dx + player.dy * player.dy);
            if (length > 0) {
                const normalizedDx = player.dx / length;
                const normalizedDy = player.dy / length;
                
                // Applica l'accelerazione
                player.dx = normalizedDx * this.maxSpeed;
                player.dy = normalizedDy * this.maxSpeed;
            }
        } else {
            // Applica l'attrito
            player.dx *= this.friction;
            player.dy *= this.friction;
            
            // Ferma il giocatore se la velocità è molto bassa
            if (Math.abs(player.dx) < 0.1) player.dx = 0;
            if (Math.abs(player.dy) < 0.1) player.dy = 0;
        }
        
        // Aggiorna la posizione
        player.x += player.dx * deltaTime;
        player.y += player.dy * deltaTime;
        
        // Limita la posizione al campo
        this.constrainToField(player, this.playerRadius);
    }
    
    // Aggiorna la fisica della palla
    updateBallPhysics(ball, deltaTime) {
        if (!ball) return;
        
        // Applica l'attrito e la resistenza dell'aria
        ball.dx *= this.ballFriction * this.airResistance;
        ball.dy *= this.ballFriction * this.airResistance;
        
        // Applica una leggera gravità
        ball.dy += this.gravity * deltaTime;
        
        // Ferma la palla se la velocità è molto bassa
        if (Math.abs(ball.dx) < 0.1) ball.dx = 0;
        if (Math.abs(ball.dy) < 0.1) ball.dy = 0;
        
        // Limita la velocità massima
        const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (speed > this.ballMaxSpeed) {
            ball.dx = (ball.dx / speed) * this.ballMaxSpeed;
            ball.dy = (ball.dy / speed) * this.ballMaxSpeed;
        }
        
        // Aggiorna la posizione
        ball.x += ball.dx * deltaTime;
        ball.y += ball.dy * deltaTime;
        
        // Gestisci i rimbalzi sui bordi del campo
        this.handleBallBounce(ball);
    }
    
    // Gestisce i rimbalzi della palla sui bordi del campo
    handleBallBounce(ball) {
        // Rimbalzo sul bordo superiore
        if (ball.y - this.ballRadius < -this.fieldHeight / 2) {
            ball.y = -this.fieldHeight / 2 + this.ballRadius;
            ball.dy = -ball.dy * this.bounceCoefficient;
        }
        
        // Rimbalzo sul bordo inferiore
        if (ball.y + this.ballRadius > this.fieldHeight / 2) {
            ball.y = this.fieldHeight / 2 - this.ballRadius;
            ball.dy = -ball.dy * this.bounceCoefficient;
        }
        
        // Rimbalzo sul bordo sinistro (esclusa l'area della porta)
        if (ball.x - this.ballRadius < -this.fieldWidth / 2) {
            // Verifica se la palla è nell'area della porta
            if (Math.abs(ball.y) > this.goalWidth / 2) {
                ball.x = -this.fieldWidth / 2 + this.ballRadius;
                ball.dx = -ball.dx * this.bounceCoefficient;
            }
        }
        
        // Rimbalzo sul bordo destro (esclusa l'area della porta)
        if (ball.x + this.ballRadius > this.fieldWidth / 2) {
            // Verifica se la palla è nell'area della porta
            if (Math.abs(ball.y) > this.goalWidth / 2) {
                ball.x = this.fieldWidth / 2 - this.ballRadius;
                ball.dx = -ball.dx * this.bounceCoefficient;
            }
        }
        
        // Rimbalzo sul bordo posteriore della porta sinistra
        if (ball.x - this.ballRadius < -this.fieldWidth / 2 - this.goalDepth && Math.abs(ball.y) <= this.goalWidth / 2) {
            ball.x = -this.fieldWidth / 2 - this.goalDepth + this.ballRadius;
            ball.dx = -ball.dx * this.bounceCoefficient;
        }
        
        // Rimbalzo sul bordo posteriore della porta destra
        if (ball.x + this.ballRadius > this.fieldWidth / 2 + this.goalDepth && Math.abs(ball.y) <= this.goalWidth / 2) {
            ball.x = this.fieldWidth / 2 + this.goalDepth - this.ballRadius;
            ball.dx = -ball.dx * this.bounceCoefficient;
        }
        
        // Rimbalzo sui bordi laterali della porta sinistra
        if (ball.x < -this.fieldWidth / 2 && ball.x > -this.fieldWidth / 2 - this.goalDepth) {
            if (Math.abs(ball.y) - this.ballRadius < this.goalWidth / 2 && Math.abs(ball.y) + this.ballRadius > this.goalWidth / 2) {
                // La palla ha colpito il bordo laterale della porta
                if (ball.y > 0) {
                    ball.y = this.goalWidth / 2 + this.ballRadius;
                } else {
                    ball.y = -this.goalWidth / 2 - this.ballRadius;
                }
                ball.dy = -ball.dy * this.bounceCoefficient;
            }
        }
        
        // Rimbalzo sui bordi laterali della porta destra
        if (ball.x > this.fieldWidth / 2 && ball.x < this.fieldWidth / 2 + this.goalDepth) {
            if (Math.abs(ball.y) - this.ballRadius < this.goalWidth / 2 && Math.abs(ball.y) + this.ballRadius > this.goalWidth / 2) {
                // La palla ha colpito il bordo laterale della porta
                if (ball.y > 0) {
                    ball.y = this.goalWidth / 2 + this.ballRadius;
                } else {
                    ball.y = -this.goalWidth / 2 - this.ballRadius;
                }
                ball.dy = -ball.dy * this.bounceCoefficient;
            }
        }
    }
    
    // Limita la posizione di un oggetto al campo
    constrainToField(object, radius) {
        // Limita la posizione orizzontale
        if (object.x - radius < -this.fieldWidth / 2) {
            object.x = -this.fieldWidth / 2 + radius;
            object.dx = 0;
        } else if (object.x + radius > this.fieldWidth / 2) {
            object.x = this.fieldWidth / 2 - radius;
            object.dx = 0;
        }
        
        // Limita la posizione verticale
        if (object.y - radius < -this.fieldHeight / 2) {
            object.y = -this.fieldHeight / 2 + radius;
            object.dy = 0;
        } else if (object.y + radius > this.fieldHeight / 2) {
            object.y = this.fieldHeight / 2 - radius;
            object.dy = 0;
        }
    }
    
    // Verifica le collisioni tra giocatori e palla
    checkCollisions(players, ball) {
        if (!ball) return;
        
        // Verifica le collisioni tra giocatori
        const playerArray = Array.from(players.values());
        for (let i = 0; i < playerArray.length; i++) {
            for (let j = i + 1; j < playerArray.length; j++) {
                this.checkPlayerCollision(playerArray[i], playerArray[j]);
            }
        }
        
        // Verifica le collisioni tra giocatori e palla
        playerArray.forEach(player => {
            this.checkBallCollision(player, ball);
        });
    }
    
    // Verifica la collisione tra due giocatori
    checkPlayerCollision(player1, player2) {
        if (!player1 || !player2) return;
        
        // Calcola la distanza tra i giocatori
        const dx = player2.x - player1.x;
        const dy = player2.y - player1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Verifica se c'è una collisione
        if (distance < this.playerRadius * 2) {
            // Calcola la sovrapposizione
            const overlap = this.playerRadius * 2 - distance;
            
            // Calcola la direzione della collisione
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Sposta i giocatori per evitare la sovrapposizione
            player1.x -= dirX * overlap / 2;
            player1.y -= dirY * overlap / 2;
            player2.x += dirX * overlap / 2;
            player2.y += dirY * overlap / 2;
            
            // Calcola la velocità relativa
            const relVelX = player2.dx - player1.dx;
            const relVelY = player2.dy - player1.dy;
            
            // Calcola la velocità relativa nella direzione della collisione
            const relVel = relVelX * dirX + relVelY * dirY;
            
            // Se i giocatori si stanno allontanando, non fare nulla
            if (relVel > 0) return;
            
            // Calcola l'impulso
            const impulse = 2 * relVel / 2; // Diviso per 2 perché entrambi i giocatori hanno la stessa massa
            
            // Applica l'impulso
            player1.dx += dirX * impulse;
            player1.dy += dirY * impulse;
            player2.dx -= dirX * impulse;
            player2.dy -= dirY * impulse;
        }
    }
    
    // Verifica la collisione tra un giocatore e la palla
    checkBallCollision(player, ball) {
        if (!player || !ball) return;
        
        // Calcola la distanza tra il giocatore e la palla
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Verifica se c'è una collisione
        if (distance < this.playerRadius + this.ballRadius) {
            // Calcola la sovrapposizione
            const overlap = this.playerRadius + this.ballRadius - distance;
            
            // Calcola la direzione della collisione
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Sposta la palla per evitare la sovrapposizione
            ball.x = player.x + dirX * (this.playerRadius + this.ballRadius);
            ball.y = player.y + dirY * (this.playerRadius + this.ballRadius);
            
            // Calcola la velocità relativa
            const relVelX = ball.dx - player.dx;
            const relVelY = ball.dy - player.dy;
            
            // Calcola la velocità relativa nella direzione della collisione
            const relVel = relVelX * dirX + relVelY * dirY;
            
            // Se la palla si sta allontanando, non fare nulla
            if (relVel > 0) return;
            
            // Calcola l'impulso con elasticità
            const impulse = -(1 + this.elasticity) * relVel;
            
            // Applica l'impulso alla palla
            ball.dx += dirX * impulse;
            ball.dy += dirY * impulse;
            
            // Aggiungi un po' di velocità al giocatore
            player.dx -= dirX * impulse * 0.1;
            player.dy -= dirY * impulse * 0.1;
            
            // Se il giocatore sta calciando, applica una forza extra
            if (player.isKicking) {
                const kickForce = this.kickPower * (1 + Math.random() * 0.2); // Aggiungi un po' di casualità
                ball.dx += dirX * kickForce;
                ball.dy += dirY * kickForce;
            }
        }
    }
    
    // Verifica se è stato segnato un goal
    checkGoal(ball) {
        if (!ball) return null;
        
        // Verifica gol nella porta sinistra
        if (ball.x < -this.fieldWidth / 2 - this.goalDepth / 2 && 
            Math.abs(ball.y) < this.goalWidth / 2) {
            return 'right'; // Gol per la squadra destra
        }
        
        // Verifica gol nella porta destra
        if (ball.x > this.fieldWidth / 2 + this.goalDepth / 2 && 
            Math.abs(ball.y) < this.goalWidth / 2) {
            return 'left'; // Gol per la squadra sinistra
        }
        
        return null; // Nessun gol
    }
    
    // Imposta le dimensioni del campo
    setFieldDimensions(width, height, goalWidth, goalDepth) {
        this.fieldWidth = width;
        this.fieldHeight = height;
        this.goalWidth = goalWidth;
        this.goalDepth = goalDepth;
    }
}
