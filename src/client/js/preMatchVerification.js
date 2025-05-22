// preMatchVerification.js - Sistema di verifiche pre-partita per le partite ranked

export class PreMatchVerification {
    constructor(networkManager, authManager) {
        this.networkManager = networkManager;
        this.authManager = authManager;
        this.verificationStatus = {
            isVerifying: false,
            matchId: null,
            players: [],
            verificationTimeout: 30, // secondi
            remainingTime: 30,
            verificationItems: [
                { id: 'connection', name: 'Connessione', status: 'pending' },
                { id: 'hardware', name: 'Hardware', status: 'pending' },
                { id: 'readiness', name: 'Prontezza', status: 'pending' }
            ]
        };
        this.listeners = {
            onVerificationStart: [],
            onVerificationUpdate: [],
            onVerificationComplete: [],
            onVerificationFailed: [],
            onPlayerReady: []
        };

        // Inizializza gli eventi di rete
        this.initNetworkEvents();
    }

    // Inizializza gli eventi di rete per le verifiche pre-partita
    initNetworkEvents() {
        // Evento quando inizia la verifica pre-partita
        this.networkManager.on('verification:start', (data) => {
            this.verificationStatus.isVerifying = true;
            this.verificationStatus.matchId = data.matchId;
            this.verificationStatus.players = data.players;
            this.verificationStatus.verificationTimeout = data.timeout || 30;
            this.verificationStatus.remainingTime = data.timeout || 30;
            
            // Resetta lo stato delle verifiche
            this.verificationStatus.verificationItems.forEach(item => {
                item.status = 'pending';
            });
            
            this._triggerEvent('onVerificationStart', this.verificationStatus);
            
            // Avvia il timer per il countdown
            this._startVerificationTimer();
            
            // Avvia automaticamente le verifiche
            this.startVerifications();
        });

        // Evento quando lo stato di verifica di un giocatore cambia
        this.networkManager.on('verification:player_update', (data) => {
            const playerIndex = this.verificationStatus.players.findIndex(p => p.userId === data.userId);
            if (playerIndex !== -1) {
                this.verificationStatus.players[playerIndex].verificationStatus = data.verificationStatus;
                this._triggerEvent('onVerificationUpdate', this.verificationStatus);
            }
        });

        // Evento quando la verifica è completata con successo
        this.networkManager.on('verification:complete', () => {
            this.verificationStatus.isVerifying = false;
            this._triggerEvent('onVerificationComplete', this.verificationStatus);
            this._clearVerificationTimer();
        });

        // Evento quando la verifica fallisce
        this.networkManager.on('verification:failed', (reason) => {
            this.verificationStatus.isVerifying = false;
            this._triggerEvent('onVerificationFailed', { 
                status: this.verificationStatus,
                reason
            });
            this._clearVerificationTimer();
        });

        // Evento quando un giocatore è pronto
        this.networkManager.on('verification:player_ready', (data) => {
            const playerIndex = this.verificationStatus.players.findIndex(p => p.userId === data.userId);
            if (playerIndex !== -1) {
                this.verificationStatus.players[playerIndex].ready = true;
                this._triggerEvent('onPlayerReady', {
                    player: this.verificationStatus.players[playerIndex],
                    allReady: this.verificationStatus.players.every(p => p.ready)
                });
            }
        });
    }

    // Avvia il processo di verifica
    startVerifications() {
        if (!this.verificationStatus.isVerifying) {
            console.warn('Nessuna verifica pre-partita in corso');
            return false;
        }

        // Verifica la connessione
        this._verifyConnection()
            .then(() => {
                // Aggiorna lo stato
                const connectionItem = this.verificationStatus.verificationItems.find(item => item.id === 'connection');
                if (connectionItem) {
                    connectionItem.status = 'success';
                    this._triggerEvent('onVerificationUpdate', this.verificationStatus);
                }
                
                // Procedi con la verifica hardware
                return this._verifyHardware();
            })
            .then(() => {
                // Aggiorna lo stato
                const hardwareItem = this.verificationStatus.verificationItems.find(item => item.id === 'hardware');
                if (hardwareItem) {
                    hardwareItem.status = 'success';
                    this._triggerEvent('onVerificationUpdate', this.verificationStatus);
                }
                
                // Procedi con la verifica della prontezza
                return this._verifyReadiness();
            })
            .then(() => {
                // Aggiorna lo stato
                const readinessItem = this.verificationStatus.verificationItems.find(item => item.id === 'readiness');
                if (readinessItem) {
                    readinessItem.status = 'success';
                    this._triggerEvent('onVerificationUpdate', this.verificationStatus);
                }
                
                // Invia la conferma al server
                this.networkManager.emit('verification:complete', {
                    matchId: this.verificationStatus.matchId
                });
            })
            .catch((error) => {
                console.error('Errore durante le verifiche pre-partita:', error);
                
                // Aggiorna lo stato dell'item fallito
                const failedItem = this.verificationStatus.verificationItems.find(item => item.id === error.itemId);
                if (failedItem) {
                    failedItem.status = 'error';
                    failedItem.errorMessage = error.message;
                    this._triggerEvent('onVerificationUpdate', this.verificationStatus);
                }
                
                // Invia il fallimento al server
                this.networkManager.emit('verification:failed', {
                    matchId: this.verificationStatus.matchId,
                    reason: error.message
                });
            });

        return true;
    }

    // Segnala che il giocatore è pronto a iniziare
    setPlayerReady() {
        if (!this.verificationStatus.isVerifying) {
            console.warn('Nessuna verifica pre-partita in corso');
            return false;
        }

        // Invia la conferma al server
        this.networkManager.emit('verification:ready', {
            matchId: this.verificationStatus.matchId
        });

        return true;
    }

    // Verifica la connessione
    _verifyConnection() {
        return new Promise((resolve, reject) => {
            // Simula un test di connessione
            const startTime = Date.now();
            
            // Invia un ping al server
            this.networkManager.emit('verification:ping', {
                timestamp: startTime
            });
            
            // Attendi la risposta
            const pingTimeout = setTimeout(() => {
                reject({
                    itemId: 'connection',
                    message: 'Timeout durante il test di connessione'
                });
            }, 5000);
            
            // Evento per la risposta del ping
            const pingHandler = (data) => {
                clearTimeout(pingTimeout);
                
                // Calcola il ping
                const ping = Date.now() - data.timestamp;
                
                // Verifica che il ping sia accettabile (< 200ms)
                if (ping < 200) {
                    resolve();
                } else {
                    reject({
                        itemId: 'connection',
                        message: `Ping troppo alto: ${ping}ms`
                    });
                }
                
                // Rimuovi l'handler
                this.networkManager.off('verification:pong', pingHandler);
            };
            
            this.networkManager.on('verification:pong', pingHandler);
        });
    }

    // Verifica l'hardware
    _verifyHardware() {
        return new Promise((resolve, reject) => {
            // Verifica le prestazioni del browser
            const startTime = Date.now();
            let counter = 0;
            
            // Esegui un test di performance semplice
            while (Date.now() - startTime < 100) {
                counter++;
            }
            
            // Verifica che le prestazioni siano accettabili
            if (counter > 100000) {
                resolve();
            } else {
                reject({
                    itemId: 'hardware',
                    message: 'Prestazioni hardware insufficienti'
                });
            }
        });
    }

    // Verifica la prontezza del giocatore
    _verifyReadiness() {
        return new Promise((resolve) => {
            // La prontezza è sempre verificata automaticamente
            resolve();
        });
    }

    // Avvia il timer per il countdown
    _startVerificationTimer() {
        this._clearVerificationTimer();
        
        this._verificationTimer = setInterval(() => {
            this.verificationStatus.remainingTime--;
            
            if (this.verificationStatus.remainingTime <= 0) {
                // Timeout scaduto
                this._clearVerificationTimer();
                
                // Invia il fallimento al server
                this.networkManager.emit('verification:failed', {
                    matchId: this.verificationStatus.matchId,
                    reason: 'Timeout scaduto'
                });
                
                // Notifica gli ascoltatori
                this._triggerEvent('onVerificationFailed', {
                    status: this.verificationStatus,
                    reason: 'Timeout scaduto'
                });
            } else {
                // Aggiorna lo stato
                this._triggerEvent('onVerificationUpdate', this.verificationStatus);
            }
        }, 1000);
    }

    // Pulisce il timer per il countdown
    _clearVerificationTimer() {
        if (this._verificationTimer) {
            clearInterval(this._verificationTimer);
            this._verificationTimer = null;
        }
    }

    // Ottieni lo stato corrente della verifica
    getVerificationStatus() {
        return { ...this.verificationStatus };
    }

    // Aggiungi un listener per un evento
    on(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].push(callback);
            return true;
        }
        return false;
    }

    // Rimuovi un listener per un evento
    off(eventName, callback) {
        if (this.listeners[eventName]) {
            this.listeners[eventName] = this.listeners[eventName].filter(cb => cb !== callback);
            return true;
        }
        return false;
    }

    // Trigger interno per gli eventi
    _triggerEvent(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Errore nell'esecuzione del callback per ${eventName}:`, error);
                }
            });
        }
    }

    // Crea l'interfaccia utente per le verifiche pre-partita
    createVerificationUI(container) {
        // Pulisci il container
        container.innerHTML = '';

        // Crea il contenitore principale
        const verificationContainer = document.createElement('div');
        verificationContainer.className = 'verification-container';

        // Titolo
        const title = document.createElement('h2');
        title.textContent = 'Verifiche Pre-Partita';
        verificationContainer.appendChild(title);

        // Descrizione
        const description = document.createElement('p');
        description.textContent = 'Completamento delle verifiche necessarie prima di iniziare la partita ranked.';
        verificationContainer.appendChild(description);

        // Timer
        const timer = document.createElement('div');
        timer.className = 'verification-timer';
        timer.textContent = `Tempo rimanente: ${this.verificationStatus.remainingTime}s`;
        verificationContainer.appendChild(timer);

        // Lista delle verifiche
        const verificationList = document.createElement('ul');
        verificationList.className = 'verification-list';

        this.verificationStatus.verificationItems.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = `verification-item ${item.status}`;
            
            const itemName = document.createElement('span');
            itemName.className = 'verification-item-name';
            itemName.textContent = item.name;
            listItem.appendChild(itemName);
            
            const itemStatus = document.createElement('span');
            itemStatus.className = 'verification-item-status';
            
            switch (item.status) {
                case 'pending':
                    itemStatus.textContent = 'In attesa...';
                    break;
                case 'success':
                    itemStatus.textContent = '✓ Completato';
                    break;
                case 'error':
                    itemStatus.textContent = '✗ Fallito';
                    break;
            }
            
            listItem.appendChild(itemStatus);
            
            if (item.status === 'error' && item.errorMessage) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'verification-error-message';
                errorMessage.textContent = item.errorMessage;
                listItem.appendChild(errorMessage);
            }
            
            verificationList.appendChild(listItem);
        });

        verificationContainer.appendChild(verificationList);

        // Lista dei giocatori
        const playersContainer = document.createElement('div');
        playersContainer.className = 'verification-players-container';
        
        const playersTitle = document.createElement('h3');
        playersTitle.textContent = 'Giocatori';
        playersContainer.appendChild(playersTitle);
        
        const playersList = document.createElement('ul');
        playersList.className = 'verification-players-list';
        
        this.verificationStatus.players.forEach(player => {
            const playerItem = document.createElement('li');
            playerItem.className = `verification-player ${player.ready ? 'ready' : 'not-ready'}`;
            
            const playerName = document.createElement('span');
            playerName.className = 'verification-player-name';
            playerName.textContent = player.nickname;
            playerItem.appendChild(playerName);
            
            const playerStatus = document.createElement('span');
            playerStatus.className = 'verification-player-status';
            playerStatus.textContent = player.ready ? 'Pronto' : 'Non pronto';
            playerItem.appendChild(playerStatus);
            
            playersList.appendChild(playerItem);
        });
        
        playersContainer.appendChild(playersList);
        verificationContainer.appendChild(playersContainer);

        // Pulsante "Pronto"
        const readyButton = document.createElement('button');
        readyButton.className = 'verification-ready-button';
        readyButton.textContent = 'Sono Pronto';
        readyButton.disabled = !this.verificationStatus.verificationItems.every(item => item.status === 'success');
        
        readyButton.addEventListener('click', () => {
            this.setPlayerReady();
            readyButton.disabled = true;
            readyButton.textContent = 'Pronto!';
        });
        
        verificationContainer.appendChild(readyButton);

        // Aggiungi il contenitore principale al container fornito
        container.appendChild(verificationContainer);

        // Funzione per aggiornare l'UI
        const updateUI = () => {
            // Aggiorna il timer
            timer.textContent = `Tempo rimanente: ${this.verificationStatus.remainingTime}s`;
            
            // Aggiorna lo stato delle verifiche
            this.verificationStatus.verificationItems.forEach((item, index) => {
                const listItem = verificationList.children[index];
                listItem.className = `verification-item ${item.status}`;
                
                const itemStatus = listItem.querySelector('.verification-item-status');
                
                switch (item.status) {
                    case 'pending':
                        itemStatus.textContent = 'In attesa...';
                        break;
                    case 'success':
                        itemStatus.textContent = '✓ Completato';
                        break;
                    case 'error':
                        itemStatus.textContent = '✗ Fallito';
                        break;
                }
                
                // Aggiorna il messaggio di errore
                const existingErrorMessage = listItem.querySelector('.verification-error-message');
                if (item.status === 'error' && item.errorMessage) {
                    if (existingErrorMessage) {
                        existingErrorMessage.textContent = item.errorMessage;
                    } else {
                        const errorMessage = document.createElement('div');
                        errorMessage.className = 'verification-error-message';
                        errorMessage.textContent = item.errorMessage;
                        listItem.appendChild(errorMessage);
                    }
                } else if (existingErrorMessage) {
                    listItem.removeChild(existingErrorMessage);
                }
            });
            
            // Aggiorna lo stato dei giocatori
            this.verificationStatus.players.forEach((player, index) => {
                const playerItem = playersList.children[index];
                playerItem.className = `verification-player ${player.ready ? 'ready' : 'not-ready'}`;
                
                const playerStatus = playerItem.querySelector('.verification-player-status');
                playerStatus.textContent = player.ready ? 'Pronto' : 'Non pronto';
            });
            
            // Aggiorna il pulsante "Pronto"
            readyButton.disabled = !this.verificationStatus.verificationItems.every(item => item.status === 'success');
        };

        // Aggiungi listener per gli eventi
        this.on('onVerificationUpdate', updateUI);
        this.on('onVerificationComplete', () => {
            container.innerHTML = '<div class="verification-complete">Verifiche completate! La partita inizierà a breve...</div>';
        });
        this.on('onVerificationFailed', (data) => {
            container.innerHTML = `<div class="verification-failed">Verifiche fallite: ${data.reason}</div>`;
        });

        // Funzione di pulizia
        return () => {
            this.off('onVerificationUpdate', updateUI);
            this.off('onVerificationComplete', () => {});
            this.off('onVerificationFailed', () => {});
        };
    }

    // Pulisci le risorse quando l'oggetto viene distrutto
    destroy() {
        this._clearVerificationTimer();
        
        // Rimuovi tutti i listener
        Object.keys(this.listeners).forEach(eventName => {
            this.listeners[eventName] = [];
        });
    }
}
