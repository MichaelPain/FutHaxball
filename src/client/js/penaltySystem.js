// penaltySystem.js - Sistema di penalità per le partite ranked

export class PenaltySystem {
    constructor(networkManager, authManager) {
        this.networkManager = networkManager;
        this.authManager = authManager;
        this.penalties = [];
        this.userPenalties = null;
        this.listeners = {
            onPenaltyReceived: [],
            onPenaltyExpired: [],
            onPenaltiesUpdated: []
        };

        // Inizializza gli eventi di rete
        this.initNetworkEvents();
    }

    // Inizializza gli eventi di rete per il sistema di penalità
    initNetworkEvents() {
        // Evento quando viene ricevuta una nuova penalità
        this.networkManager.on('penalty:received', (data) => {
            this.penalties.push(data);
            this._triggerEvent('onPenaltyReceived', data);
        });

        // Evento quando una penalità scade
        this.networkManager.on('penalty:expired', (data) => {
            const index = this.penalties.findIndex(p => p.id === data.id);
            if (index !== -1) {
                this.penalties.splice(index, 1);
            }
            this._triggerEvent('onPenaltyExpired', data);
        });

        // Evento quando le penalità vengono aggiornate
        this.networkManager.on('penalty:list_updated', (data) => {
            this.penalties = data.penalties;
            this._triggerEvent('onPenaltiesUpdated', data);
        });

        // Evento quando le penalità dell'utente vengono aggiornate
        this.networkManager.on('penalty:user_penalties', (data) => {
            this.userPenalties = data.penalties;
            this._triggerEvent('onPenaltiesUpdated', { userPenalties: data.penalties });
        });
    }

    // Richiedi le penalità dell'utente corrente
    fetchUserPenalties() {
        if (!this.authManager.isAuthenticated()) {
            console.error('Devi essere autenticato per visualizzare le tue penalità');
            return false;
        }

        this.networkManager.emit('penalty:fetch_user_penalties');
        return true;
    }

    // Richiedi le penalità di un utente specifico
    fetchPlayerPenalties(playerId) {
        this.networkManager.emit('penalty:fetch_player_penalties', { playerId });
        return true;
    }

    // Segnala un comportamento scorretto
    reportMisconduct(playerId, type, description, matchId = null) {
        if (!this.authManager.isAuthenticated()) {
            console.error('Devi essere autenticato per segnalare un comportamento scorretto');
            return false;
        }

        this.networkManager.emit('penalty:report_misconduct', {
            playerId,
            type,
            description,
            matchId
        });
        return true;
    }

    // Ottieni le penalità dell'utente corrente
    getUserPenalties() {
        return this.userPenalties || [];
    }

    // Verifica se l'utente ha penalità attive
    hasActivePenalties() {
        if (!this.userPenalties) return false;
        return this.userPenalties.some(p => !p.expired);
    }

    // Verifica se l'utente è bannato
    isBanned() {
        if (!this.userPenalties) return false;
        return this.userPenalties.some(p => p.type === 'ban' && !p.expired);
    }

    // Verifica se l'utente può giocare partite ranked
    canPlayRanked() {
        if (!this.userPenalties) return true;
        return !this.userPenalties.some(p => 
            (p.type === 'ranked_ban' || p.type === 'ban') && !p.expired
        );
    }

    // Ottieni il tempo rimanente della penalità più lunga
    getLongestPenaltyTimeRemaining() {
        if (!this.userPenalties || this.userPenalties.length === 0) return 0;
        
        const now = Date.now();
        let longestTime = 0;
        
        this.userPenalties.forEach(penalty => {
            if (!penalty.expired && penalty.expiresAt) {
                const remaining = new Date(penalty.expiresAt).getTime() - now;
                if (remaining > longestTime) {
                    longestTime = remaining;
                }
            }
        });
        
        return longestTime;
    }

    // Formatta il tempo rimanente in formato leggibile
    formatTimeRemaining(milliseconds) {
        if (milliseconds <= 0) return 'Scaduta';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} giorni, ${hours % 24} ore`;
        } else if (hours > 0) {
            return `${hours} ore, ${minutes % 60} minuti`;
        } else if (minutes > 0) {
            return `${minutes} minuti, ${seconds % 60} secondi`;
        } else {
            return `${seconds} secondi`;
        }
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

    // Crea l'interfaccia utente per le penalità
    createPenaltiesUI(container) {
        // Pulisci il container
        container.innerHTML = '';

        // Crea il contenitore principale
        const penaltiesContainer = document.createElement('div');
        penaltiesContainer.className = 'penalties-container';

        // Titolo
        const title = document.createElement('h2');
        title.textContent = 'Sistema di Penalità';
        penaltiesContainer.appendChild(title);

        // Descrizione
        const description = document.createElement('p');
        description.textContent = 'Il sistema di penalità viene utilizzato per mantenere un ambiente di gioco corretto e sportivo. Le penalità vengono assegnate per comportamenti scorretti e possono limitare l\'accesso a determinate funzionalità del gioco.';
        penaltiesContainer.appendChild(description);

        // Sezione penalità attive
        const activePenaltiesSection = document.createElement('div');
        activePenaltiesSection.className = 'active-penalties-section';
        
        const activePenaltiesTitle = document.createElement('h3');
        activePenaltiesTitle.textContent = 'Le tue penalità attive';
        activePenaltiesSection.appendChild(activePenaltiesTitle);
        
        const activePenaltiesList = document.createElement('div');
        activePenaltiesList.className = 'penalties-list';
        
        // Verifica se ci sono penalità attive
        if (!this.userPenalties || this.userPenalties.length === 0) {
            const noPenaltiesMessage = document.createElement('p');
            noPenaltiesMessage.className = 'no-penalties-message';
            noPenaltiesMessage.textContent = 'Non hai penalità attive. Continua a mantenere un comportamento sportivo!';
            activePenaltiesList.appendChild(noPenaltiesMessage);
        } else {
            // Filtra solo le penalità non scadute
            const activePenalties = this.userPenalties.filter(p => !p.expired);
            
            if (activePenalties.length === 0) {
                const noPenaltiesMessage = document.createElement('p');
                noPenaltiesMessage.className = 'no-penalties-message';
                noPenaltiesMessage.textContent = 'Non hai penalità attive. Continua a mantenere un comportamento sportivo!';
                activePenaltiesList.appendChild(noPenaltiesMessage);
            } else {
                // Crea una card per ogni penalità attiva
                activePenalties.forEach(penalty => {
                    const penaltyCard = this._createPenaltyCard(penalty);
                    activePenaltiesList.appendChild(penaltyCard);
                });
            }
        }
        
        activePenaltiesSection.appendChild(activePenaltiesList);
        penaltiesContainer.appendChild(activePenaltiesSection);

        // Sezione storico penalità
        const penaltyHistorySection = document.createElement('div');
        penaltyHistorySection.className = 'penalty-history-section';
        
        const historyTitle = document.createElement('h3');
        historyTitle.textContent = 'Storico penalità';
        penaltyHistorySection.appendChild(historyTitle);
        
        const historyList = document.createElement('div');
        historyList.className = 'penalties-list history';
        
        // Verifica se ci sono penalità nello storico
        if (!this.userPenalties || this.userPenalties.length === 0) {
            const noHistoryMessage = document.createElement('p');
            noHistoryMessage.className = 'no-penalties-message';
            noHistoryMessage.textContent = 'Non hai ricevuto penalità in passato.';
            historyList.appendChild(noHistoryMessage);
        } else {
            // Filtra solo le penalità scadute
            const expiredPenalties = this.userPenalties.filter(p => p.expired);
            
            if (expiredPenalties.length === 0) {
                const noHistoryMessage = document.createElement('p');
                noHistoryMessage.className = 'no-penalties-message';
                noHistoryMessage.textContent = 'Non hai ricevuto penalità in passato.';
                historyList.appendChild(noHistoryMessage);
            } else {
                // Crea una card per ogni penalità scaduta
                expiredPenalties.forEach(penalty => {
                    const penaltyCard = this._createPenaltyCard(penalty);
                    historyList.appendChild(penaltyCard);
                });
            }
        }
        
        penaltyHistorySection.appendChild(historyList);
        penaltiesContainer.appendChild(penaltyHistorySection);

        // Sezione segnalazione comportamenti scorretti
        const reportSection = document.createElement('div');
        reportSection.className = 'report-section';
        
        const reportTitle = document.createElement('h3');
        reportTitle.textContent = 'Segnala un comportamento scorretto';
        reportSection.appendChild(reportTitle);
        
        const reportDescription = document.createElement('p');
        reportDescription.textContent = 'Se hai assistito a un comportamento scorretto durante una partita, puoi segnalarlo qui. Le segnalazioni vengono esaminate dal nostro team di moderazione.';
        reportSection.appendChild(reportDescription);
        
        // Form di segnalazione
        const reportForm = document.createElement('div');
        reportForm.className = 'report-form';
        
        // Campo nickname
        const nicknameField = document.createElement('div');
        nicknameField.className = 'form-field';
        
        const nicknameLabel = document.createElement('label');
        nicknameLabel.textContent = 'Nickname del giocatore:';
        nicknameField.appendChild(nicknameLabel);
        
        const nicknameInput = document.createElement('input');
        nicknameInput.type = 'text';
        nicknameInput.placeholder = 'Inserisci il nickname';
        nicknameField.appendChild(nicknameInput);
        
        reportForm.appendChild(nicknameField);
        
        // Campo tipo di comportamento
        const typeField = document.createElement('div');
        typeField.className = 'form-field';
        
        const typeLabel = document.createElement('label');
        typeLabel.textContent = 'Tipo di comportamento:';
        typeField.appendChild(typeLabel);
        
        const typeSelect = document.createElement('select');
        
        const typeOptions = [
            { value: '', label: 'Seleziona un tipo' },
            { value: 'afk', label: 'Inattività (AFK)' },
            { value: 'toxic', label: 'Comportamento tossico' },
            { value: 'cheating', label: 'Cheating/Hacking' },
            { value: 'griefing', label: 'Sabotaggio intenzionale' },
            { value: 'other', label: 'Altro' }
        ];
        
        typeOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            typeSelect.appendChild(optionElement);
        });
        
        typeField.appendChild(typeSelect);
        
        reportForm.appendChild(typeField);
        
        // Campo descrizione
        const descriptionField = document.createElement('div');
        descriptionField.className = 'form-field';
        
        const descriptionLabel = document.createElement('label');
        descriptionLabel.textContent = 'Descrizione:';
        descriptionField.appendChild(descriptionLabel);
        
        const descriptionInput = document.createElement('textarea');
        descriptionInput.placeholder = 'Descrivi il comportamento scorretto...';
        descriptionInput.rows = 4;
        descriptionField.appendChild(descriptionInput);
        
        reportForm.appendChild(descriptionField);
        
        // Campo ID partita
        const matchIdField = document.createElement('div');
        matchIdField.className = 'form-field';
        
        const matchIdLabel = document.createElement('label');
        matchIdLabel.textContent = 'ID Partita (opzionale):';
        matchIdField.appendChild(matchIdLabel);
        
        const matchIdInput = document.createElement('input');
        matchIdInput.type = 'text';
        matchIdInput.placeholder = 'Inserisci l\'ID della partita se disponibile';
        matchIdField.appendChild(matchIdInput);
        
        reportForm.appendChild(matchIdField);
        
        // Pulsante di invio
        const submitButton = document.createElement('button');
        submitButton.className = 'report-submit-button';
        submitButton.textContent = 'Invia segnalazione';
        
        submitButton.addEventListener('click', () => {
            const nickname = nicknameInput.value.trim();
            const type = typeSelect.value;
            const description = descriptionInput.value.trim();
            const matchId = matchIdInput.value.trim() || null;
            
            // Validazione
            if (!nickname) {
                alert('Inserisci il nickname del giocatore');
                return;
            }
            
            if (!type) {
                alert('Seleziona un tipo di comportamento');
                return;
            }
            
            if (!description) {
                alert('Inserisci una descrizione del comportamento');
                return;
            }
            
            // Invia la segnalazione
            this.reportMisconduct(nickname, type, description, matchId);
            
            // Resetta il form
            nicknameInput.value = '';
            typeSelect.value = '';
            descriptionInput.value = '';
            matchIdInput.value = '';
            
            // Mostra un messaggio di conferma
            alert('Segnalazione inviata con successo. Grazie per aiutarci a mantenere un ambiente di gioco corretto!');
        });
        
        reportForm.appendChild(submitButton);
        
        reportSection.appendChild(reportForm);
        penaltiesContainer.appendChild(reportSection);

        // Aggiungi il contenitore principale al container fornito
        container.appendChild(penaltiesContainer);

        // Funzione per aggiornare l'UI
        const updateUI = () => {
            // Aggiorna la lista delle penalità attive
            activePenaltiesList.innerHTML = '';
            
            if (!this.userPenalties || this.userPenalties.length === 0) {
                const noPenaltiesMessage = document.createElement('p');
                noPenaltiesMessage.className = 'no-penalties-message';
                noPenaltiesMessage.textContent = 'Non hai penalità attive. Continua a mantenere un comportamento sportivo!';
                activePenaltiesList.appendChild(noPenaltiesMessage);
            } else {
                // Filtra solo le penalità non scadute
                const activePenalties = this.userPenalties.filter(p => !p.expired);
                
                if (activePenalties.length === 0) {
                    const noPenaltiesMessage = document.createElement('p');
                    noPenaltiesMessage.className = 'no-penalties-message';
                    noPenaltiesMessage.textContent = 'Non hai penalità attive. Continua a mantenere un comportamento sportivo!';
                    activePenaltiesList.appendChild(noPenaltiesMessage);
                } else {
                    // Crea una card per ogni penalità attiva
                    activePenalties.forEach(penalty => {
                        const penaltyCard = this._createPenaltyCard(penalty);
                        activePenaltiesList.appendChild(penaltyCard);
                    });
                }
            }
            
            // Aggiorna la lista dello storico
            historyList.innerHTML = '';
            
            if (!this.userPenalties || this.userPenalties.length === 0) {
                const noHistoryMessage = document.createElement('p');
                noHistoryMessage.className = 'no-penalties-message';
                noHistoryMessage.textContent = 'Non hai ricevuto penalità in passato.';
                historyList.appendChild(noHistoryMessage);
            } else {
                // Filtra solo le penalità scadute
                const expiredPenalties = this.userPenalties.filter(p => p.expired);
                
                if (expiredPenalties.length === 0) {
                    const noHistoryMessage = document.createElement('p');
                    noHistoryMessage.className = 'no-penalties-message';
                    noHistoryMessage.textContent = 'Non hai ricevuto penalità in passato.';
                    historyList.appendChild(noHistoryMessage);
                } else {
                    // Crea una card per ogni penalità scaduta
                    expiredPenalties.forEach(penalty => {
                        const penaltyCard = this._createPenaltyCard(penalty);
                        historyList.appendChild(penaltyCard);
                    });
                }
            }
        };

        // Carica le penalità dell'utente
        this.fetchUserPenalties();

        // Aggiungi listener per gli eventi
        this.on('onPenaltiesUpdated', updateUI);
        this.on('onPenaltyReceived', updateUI);
        this.on('onPenaltyExpired', updateUI);

        // Funzione di pulizia
        return () => {
            this.off('onPenaltiesUpdated', updateUI);
            this.off('onPenaltyReceived', updateUI);
            this.off('onPenaltyExpired', updateUI);
        };
    }

    // Crea una card per una penalità
    _createPenaltyCard(penalty) {
        const penaltyCard = document.createElement('div');
        penaltyCard.className = `penalty-card ${penalty.expired ? 'expired' : 'active'} ${penalty.type}`;
        
        // Titolo della penalità
        const penaltyTitle = document.createElement('div');
        penaltyTitle.className = 'penalty-title';
        
        const penaltyIcon = document.createElement('span');
        penaltyIcon.className = 'penalty-icon';
        
        // Icona in base al tipo di penalità
        switch (penalty.type) {
            case 'warning':
                penaltyIcon.textContent = '⚠️';
                break;
            case 'chat_ban':
                penaltyIcon.textContent = '🔇';
                break;
            case 'ranked_ban':
                penaltyIcon.textContent = '🚫';
                break;
            case 'ban':
                penaltyIcon.textContent = '⛔';
                break;
            default:
                penaltyIcon.textContent = '❗';
        }
        
        penaltyTitle.appendChild(penaltyIcon);
        
        const penaltyName = document.createElement('span');
        penaltyName.className = 'penalty-name';
        
        // Nome in base al tipo di penalità
        switch (penalty.type) {
            case 'warning':
                penaltyName.textContent = 'Avvertimento';
                break;
            case 'chat_ban':
                penaltyName.textContent = 'Ban dalla chat';
                break;
            case 'ranked_ban':
                penaltyName.textContent = 'Ban dalle partite ranked';
                break;
            case 'ban':
                penaltyName.textContent = 'Ban temporaneo';
                break;
            default:
                penaltyName.textContent = 'Penalità';
        }
        
        penaltyTitle.appendChild(penaltyName);
        
        penaltyCard.appendChild(penaltyTitle);
        
        // Descrizione della penalità
        if (penalty.reason) {
            const penaltyReason = document.createElement('div');
            penaltyReason.className = 'penalty-reason';
            penaltyReason.textContent = penalty.reason;
            penaltyCard.appendChild(penaltyReason);
        }
        
        // Durata della penalità
        const penaltyDuration = document.createElement('div');
        penaltyDuration.className = 'penalty-duration';
        
        if (penalty.expired) {
            penaltyDuration.textContent = 'Scaduta';
        } else if (penalty.permanent) {
            penaltyDuration.textContent = 'Permanente';
        } else if (penalty.expiresAt) {
            const now = Date.now();
            const expiresAt = new Date(penalty.expiresAt).getTime();
            const remaining = expiresAt - now;
            
            if (remaining <= 0) {
                penaltyDuration.textContent = 'Scaduta';
            } else {
                penaltyDuration.textContent = `Scade tra: ${this.formatTimeRemaining(remaining)}`;
            }
        } else {
            penaltyDuration.textContent = 'Durata sconosciuta';
        }
        
        penaltyCard.appendChild(penaltyDuration);
        
        // Data di assegnazione
        if (penalty.createdAt) {
            const penaltyDate = document.createElement('div');
            penaltyDate.className = 'penalty-date';
            penaltyDate.textContent = `Assegnata il: ${new Date(penalty.createdAt).toLocaleDateString()}`;
            penaltyCard.appendChild(penaltyDate);
        }
        
        return penaltyCard;
    }

    // Pulisci le risorse quando l'oggetto viene distrutto
    destroy() {
        // Rimuovi tutti i listener
        Object.keys(this.listeners).forEach(eventName => {
            this.listeners[eventName] = [];
        });
    }
}
