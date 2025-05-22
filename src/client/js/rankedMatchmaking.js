// rankedMatchmaking.js - Gestione del matchmaking per le partite competitive

export class RankedMatchmaking {
    constructor(networkManager, uiManager, authManager, gameManager) {
        this.networkManager = networkManager;
        this.uiManager = uiManager;
        this.authManager = authManager;
        this.gameManager = gameManager;
        
        // Stato del matchmaking
        this.isInQueue = false;
        this.queueMode = null; // '1v1', '2v2', '3v3', '4v4', '5v5'
        this.queueStartTime = null;
        this.matchFound = false;
        this.matchAccepted = false;
        this.matchPlayers = [];
        this.invitedPlayers = [];
        this.partyMembers = [];
        
        // Impostazioni standard per le partite ranked
        this.standardSettings = {
            '1v1': {
                timeLimit: 5,      // 5 minuti
                scoreLimit: 3,     // 3 goal
                field: 'small',    // Campo piccolo
                teamLock: true,    // Blocco squadre attivo
                playersPerTeam: 1  // 1 giocatore per squadra
            },
            '2v2': {
                timeLimit: 5,      // 5 minuti
                scoreLimit: 3,     // 3 goal
                field: 'standard', // Campo standard
                teamLock: true,    // Blocco squadre attivo
                playersPerTeam: 2  // 2 giocatori per squadra
            },
            '3v3': {
                timeLimit: 7,      // 7 minuti
                scoreLimit: 5,     // 5 goal
                field: 'large',    // Campo grande
                teamLock: true,    // Blocco squadre attivo
                playersPerTeam: 3  // 3 giocatori per squadra
            },
            '4v4': {
                timeLimit: 7,      // 7 minuti
                scoreLimit: 5,     // 5 goal
                field: 'large',    // Campo grande
                teamLock: true,    // Blocco squadre attivo
                playersPerTeam: 4  // 4 giocatori per squadra
            },
            '5v5': {
                timeLimit: 10,     // 10 minuti
                scoreLimit: 7,     // 7 goal
                field: 'xlarge',   // Campo extra large
                teamLock: true,    // Blocco squadre attivo
                playersPerTeam: 5  // 5 giocatori per squadra
            }
        };
        
        // Binding dei metodi
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Ascolta gli eventi dal networkManager
        this.networkManager.on('matchFound', (matchData) => this.handleMatchFound(matchData));
        this.networkManager.on('matchAccepted', (playerData) => this.handleMatchAccepted(playerData));
        this.networkManager.on('matchDeclined', (playerData) => this.handleMatchDeclined(playerData));
        this.networkManager.on('matchCancelled', () => this.handleMatchCancelled());
        this.networkManager.on('matchStarting', (matchData) => this.handleMatchStarting(matchData));
        this.networkManager.on('partyInviteReceived', (inviteData) => this.handlePartyInviteReceived(inviteData));
        this.networkManager.on('partyMemberJoined', (memberData) => this.handlePartyMemberJoined(memberData));
        this.networkManager.on('partyMemberLeft', (memberData) => this.handlePartyMemberLeft(memberData));
        this.networkManager.on('error', (error) => this.handleError(error));
    }
    
    // Gestione degli eventi ricevuti dal networkManager
    handleMatchFound(matchData) {
        console.log("Match trovato:", matchData);
        
        // Aggiorna lo stato del matchmaking
        this.matchFound = true;
        this.matchPlayers = matchData.players;
        
        // Mostra la schermata di accettazione del match
        this.uiManager.showScreen('match-accept-screen', { matchData });
        
        // Avvia il timer per l'accettazione
        this.startAcceptTimer(matchData.acceptTimeout || 30);
        
        // Riproduci un suono di notifica
        this.playMatchFoundSound();
    }
    
    handleMatchAccepted(playerData) {
        console.log("Match accettato da:", playerData);
        
        // Aggiorna lo stato del giocatore nella lista dei giocatori del match
        const playerIndex = this.matchPlayers.findIndex(p => p.id === playerData.id);
        if (playerIndex !== -1) {
            this.matchPlayers[playerIndex].accepted = true;
        }
        
        // Aggiorna l'UI
        this.updateMatchAcceptUI();
        
        // Verifica se il giocatore corrente ha accettato
        const currentPlayerId = this.networkManager.getPlayerId();
        if (playerData.id === currentPlayerId) {
            this.matchAccepted = true;
        }
    }
    
    handleMatchDeclined(playerData) {
        console.log("Match rifiutato da:", playerData);
        
        // Aggiorna lo stato del giocatore nella lista dei giocatori del match
        const playerIndex = this.matchPlayers.findIndex(p => p.id === playerData.id);
        if (playerIndex !== -1) {
            this.matchPlayers[playerIndex].accepted = false;
            this.matchPlayers[playerIndex].declined = true;
        }
        
        // Aggiorna l'UI
        this.updateMatchAcceptUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification(`${playerData.nickname} ha rifiutato il match`, 'info');
        
        // Dopo un breve ritardo, annulla il match e torna alla coda
        setTimeout(() => {
            this.resetMatchState();
            this.uiManager.showScreen('ranked-matchmaking-screen');
            this.uiManager.showNotification('Match annullato, ritorno in coda...', 'info');
        }, 3000);
    }
    
    handleMatchCancelled() {
        console.log("Match annullato");
        
        // Resetta lo stato del match
        this.resetMatchState();
        
        // Torna alla schermata di matchmaking
        this.uiManager.showScreen('ranked-matchmaking-screen');
        
        // Mostra un messaggio
        this.uiManager.showNotification('Match annullato, ritorno in coda...', 'info');
    }
    
    handleMatchStarting(matchData) {
        console.log("Match in avvio:", matchData);
        
        // Verifica che ci siano abbastanza giocatori
        if (!this.verifyPlayersForGame(matchData)) {
            console.error("Numero di giocatori insufficiente per avviare la partita");
            this.uiManager.showNotification('Errore: numero di giocatori insufficiente', 'error');
            this.resetMatchState();
            return;
        }
        
        // Crea i dati della stanza per la partita ranked
        const roomData = this.createRankedRoomData(matchData);
        
        // Avvia la partita tramite il gameManager
        if (this.gameManager) {
            // Inizializza il gioco con le impostazioni standard per la modalità
            this.gameManager.initializeGame(roomData);
            
            // Avvia il gioco
            this.gameManager.startGame(roomData);
            
            // Mostra la schermata di gioco
            this.uiManager.showScreen('game-screen');
            
            // Mostra un messaggio
            this.uiManager.showNotification('Partita ranked avviata!', 'success');
        } else {
            console.error("GameManager non disponibile");
            this.uiManager.showNotification('Errore nell\'avvio della partita', 'error');
        }
        
        // Resetta lo stato del matchmaking
        this.resetMatchState();
    }
    
    handlePartyInviteReceived(inviteData) {
        console.log("Invito al party ricevuto:", inviteData);
        
        // Mostra una notifica con l'invito
        this.uiManager.showNotification(`${inviteData.senderNickname} ti ha invitato a unirsi al suo party`, 'info', {
            actions: [
                {
                    text: 'Accetta',
                    callback: () => this.acceptPartyInvite(inviteData.partyId)
                },
                {
                    text: 'Rifiuta',
                    callback: () => this.declinePartyInvite(inviteData.partyId)
                }
            ]
        });
    }
    
    handlePartyMemberJoined(memberData) {
        console.log("Membro unito al party:", memberData);
        
        // Aggiungi il membro alla lista dei membri del party
        this.partyMembers.push(memberData);
        
        // Aggiorna l'UI
        this.updatePartyUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification(`${memberData.nickname} si è unito al party`, 'info');
    }
    
    handlePartyMemberLeft(memberData) {
        console.log("Membro uscito dal party:", memberData);
        
        // Rimuovi il membro dalla lista dei membri del party
        this.partyMembers = this.partyMembers.filter(m => m.id !== memberData.id);
        
        // Aggiorna l'UI
        this.updatePartyUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification(`${memberData.nickname} è uscito dal party`, 'info');
    }
    
    handleError(error) {
        // Mostra l'errore
        this.uiManager.showError(error.message || 'Si è verificato un errore');
    }
    
    // Metodi per il matchmaking
    startQueue(mode) {
        // Verifica se l'utente è autenticato
        if (!this.authManager.isLoggedIn()) {
            this.uiManager.showNotification('Devi effettuare il login per giocare partite competitive', 'error');
            // Mostra la schermata di login
            this.uiManager.showScreen('auth-screen');
            return;
        }
        
        // Verifica se la modalità è valida
        if (!this.isValidMode(mode)) {
            this.uiManager.showNotification('Modalità non valida', 'error');
            return;
        }
        
        // Verifica se il party ha abbastanza membri per la modalità selezionata
        if (this.partyMembers.length > 0 && !this.canPartyQueueForMode(mode)) {
            this.uiManager.showNotification(`Il tuo party è troppo grande per la modalità ${mode}`, 'error');
            return;
        }
        
        console.log(`Avvio coda per modalità: ${mode}`);
        
        // Aggiorna lo stato del matchmaking
        this.isInQueue = true;
        this.queueMode = mode;
        this.queueStartTime = Date.now();
        
        // Per la versione di sviluppo, simuliamo il matchmaking
        // In produzione, questa funzione dovrebbe utilizzare il networkManager
        this.simulateMatchmaking();
        
        // Aggiorna l'UI
        this.updateQueueUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification(`Sei in coda per la modalità ${mode}`, 'info');
    }
    
    cancelQueue() {
        console.log("Annullamento coda");
        
        // Aggiorna lo stato del matchmaking
        this.isInQueue = false;
        this.queueMode = null;
        this.queueStartTime = null;
        
        // Aggiorna l'UI
        this.updateQueueUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification('Hai lasciato la coda', 'info');
    }
    
    acceptMatch() {
        console.log("Accettazione match");
        
        // Aggiorna lo stato del matchmaking
        this.matchAccepted = true;
        
        // Simula l'accettazione del match
        const currentPlayer = {
            id: this.networkManager.getPlayerId(),
            nickname: this.authManager.getUser().nickname
        };
        
        this.handleMatchAccepted(currentPlayer);
        
        // Simula l'accettazione degli altri giocatori
        this.simulateOtherPlayersAccepting();
    }
    
    declineMatch() {
        console.log("Rifiuto match");
        
        // Simula il rifiuto del match
        const currentPlayer = {
            id: this.networkManager.getPlayerId(),
            nickname: this.authManager.getUser().nickname
        };
        
        this.handleMatchDeclined(currentPlayer);
    }
    
    inviteToParty(nickname) {
        console.log(`Invito al party per: ${nickname}`);
        
        // Verifica se l'utente è autenticato
        if (!this.authManager.isLoggedIn()) {
            this.uiManager.showNotification('Devi effettuare il login per invitare giocatori', 'error');
            // Mostra la schermata di login
            this.uiManager.showScreen('auth-screen');
            return;
        }
        
        // Verifica se il giocatore è già stato invitato
        if (this.invitedPlayers.includes(nickname)) {
            this.uiManager.showNotification(`${nickname} è già stato invitato`, 'info');
            return;
        }
        
        // Aggiungi il giocatore alla lista degli invitati
        this.invitedPlayers.push(nickname);
        
        // Simula l'invio dell'invito
        this.uiManager.showNotification(`Invito inviato a ${nickname}`, 'success');
        
        // Simula l'accettazione dell'invito dopo un po'
        setTimeout(() => {
            // Simula l'aggiunta del giocatore al party
            const memberData = {
                id: 'player_' + Math.random().toString(36).substr(2, 9),
                nickname: nickname
            };
            
            this.handlePartyMemberJoined(memberData);
            
            // Rimuovi il giocatore dalla lista degli invitati
            this.invitedPlayers = this.invitedPlayers.filter(n => n !== nickname);
        }, 3000);
    }
    
    leaveParty() {
        console.log("Uscita dal party");
        
        // Resetta lo stato del party
        this.partyMembers = [];
        
        // Aggiorna l'UI
        this.updatePartyUI();
        
        // Mostra un messaggio
        this.uiManager.showNotification('Hai lasciato il party', 'info');
    }
    
    acceptPartyInvite(partyId) {
        console.log(`Accettazione invito al party: ${partyId}`);
        
        // Simula l'aggiunta del giocatore al party
        const currentPlayer = {
            id: this.networkManager.getPlayerId(),
            nickname: this.authManager.getUser().nickname
        };
        
        this.handlePartyMemberJoined(currentPlayer);
        
        // Mostra un messaggio
        this.uiManager.showNotification('Hai accettato l\'invito al party', 'success');
    }
    
    declinePartyInvite(partyId) {
        console.log(`Rifiuto invito al party: ${partyId}`);
        
        // Mostra un messaggio
        this.uiManager.showNotification('Hai rifiutato l\'invito al party', 'info');
    }
    
    // Metodi di supporto
    isValidMode(mode) {
        return ['1v1', '2v2', '3v3', '4v4', '5v5'].includes(mode);
    }
    
    canPartyQueueForMode(mode) {
        const playersPerTeam = parseInt(mode.charAt(0));
        return this.partyMembers.length < playersPerTeam;
    }
    
    resetMatchState() {
        this.matchFound = false;
        this.matchAccepted = false;
        this.matchPlayers = [];
    }
    
    updateQueueUI() {
        // Aggiorna l'UI della coda
        const queueStatusElement = document.getElementById('queue-status');
        const queueTimeElement = document.getElementById('queue-time');
        const cancelQueueButton = document.getElementById('cancel-queue-btn');
        
        if (queueStatusElement) {
            queueStatusElement.textContent = this.isInQueue ? `In coda per ${this.queueMode}` : 'Non in coda';
        }
        
        if (queueTimeElement && this.isInQueue) {
            // Aggiorna il tempo di attesa
            this.updateQueueTime();
            
            // Avvia un timer per aggiornare il tempo di attesa
            if (!this.queueTimeInterval) {
                this.queueTimeInterval = setInterval(() => {
                    this.updateQueueTime();
                }, 1000);
            }
        } else if (this.queueTimeInterval) {
            // Ferma il timer se non siamo più in coda
            clearInterval(this.queueTimeInterval);
            this.queueTimeInterval = null;
        }
        
        if (cancelQueueButton) {
            cancelQueueButton.disabled = !this.isInQueue;
        }
    }
    
    updateQueueTime() {
        const queueTimeElement = document.getElementById('queue-time');
        if (!queueTimeElement || !this.queueStartTime) return;
        
        const elapsedTime = Math.floor((Date.now() - this.queueStartTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        
        queueTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    updateMatchAcceptUI() {
        // Aggiorna l'UI di accettazione del match
        const matchPlayersContainer = document.getElementById('match-players-container');
        if (!matchPlayersContainer) return;
        
        // Pulisci il container
        matchPlayersContainer.innerHTML = '';
        
        // Aggiungi ogni giocatore alla lista
        this.matchPlayers.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'match-player-item';
            
            // Aggiungi una classe in base allo stato di accettazione
            if (player.accepted) {
                playerElement.classList.add('accepted');
            } else if (player.declined) {
                playerElement.classList.add('declined');
            }
            
            playerElement.innerHTML = `
                <div class="player-name">${player.nickname}</div>
                <div class="player-status">${player.accepted ? 'Accettato' : player.declined ? 'Rifiutato' : 'In attesa'}</div>
            `;
            
            matchPlayersContainer.appendChild(playerElement);
        });
    }
    
    updatePartyUI() {
        // Aggiorna l'UI del party
        const partyMembersContainer = document.getElementById('party-members-container');
        if (!partyMembersContainer) return;
        
        // Pulisci il container
        partyMembersContainer.innerHTML = '';
        
        // Aggiungi ogni membro alla lista
        if (this.partyMembers.length > 0) {
            this.partyMembers.forEach(member => {
                const memberElement = document.createElement('div');
                memberElement.className = 'party-member-item';
                
                memberElement.innerHTML = `
                    <div class="member-name">${member.nickname}</div>
                    <div class="member-actions">
                        <button class="kick-member-btn">Espelli</button>
                    </div>
                `;
                
                // Aggiungi l'evento di click al pulsante di espulsione
                const kickButton = memberElement.querySelector('.kick-member-btn');
                if (kickButton) {
                    kickButton.addEventListener('click', () => {
                        this.kickPartyMember(member.id);
                    });
                }
                
                partyMembersContainer.appendChild(memberElement);
            });
        } else {
            partyMembersContainer.innerHTML = '<div class="empty-party">Nessun membro nel party</div>';
        }
    }
    
    kickPartyMember(memberId) {
        console.log(`Espulsione membro dal party: ${memberId}`);
        
        // Trova il membro
        const member = this.partyMembers.find(m => m.id === memberId);
        if (!member) return;
        
        // Simula l'uscita del membro dal party
        this.handlePartyMemberLeft(member);
    }
    
    startAcceptTimer(seconds) {
        // Avvia un timer per l'accettazione del match
        const timerElement = document.getElementById('match-accept-timer');
        if (!timerElement) return;
        
        // Imposta il timer iniziale
        timerElement.textContent = seconds;
        
        // Avvia il timer
        let remainingTime = seconds;
        const timerInterval = setInterval(() => {
            remainingTime--;
            
            if (timerElement) {
                timerElement.textContent = remainingTime;
            }
            
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                
                // Se il giocatore non ha accettato, simula il rifiuto
                if (!this.matchAccepted) {
                    this.declineMatch();
                }
            }
        }, 1000);
    }
    
    playMatchFoundSound() {
        // Riproduci un suono di notifica
        try {
            const audio = new Audio('/assets/sounds/match-found.mp3');
            audio.play();
        } catch (error) {
            console.error("Errore nella riproduzione del suono:", error);
        }
    }
    
    // Metodi per la simulazione (solo per la versione di sviluppo)
    simulateMatchmaking() {
        // Simula il matchmaking dopo un po'
        setTimeout(() => {
            if (!this.isInQueue) return; // Verifica se siamo ancora in coda
            
            // Crea i dati del match
            const matchData = {
                id: 'match_' + Math.random().toString(36).substr(2, 9),
                mode: this.queueMode,
                players: [],
                acceptTimeout: 30
            };
            
            // Aggiungi il giocatore corrente
            matchData.players.push({
                id: this.networkManager.getPlayerId(),
                nickname: this.authManager.getUser().nickname,
                team: 'red',
                accepted: false,
                declined: false
            });
            
            // Aggiungi i membri del party
            this.partyMembers.forEach(member => {
                matchData.players.push({
                    id: member.id,
                    nickname: member.nickname,
                    team: 'red',
                    accepted: false,
                    declined: false
                });
            });
            
            // Aggiungi giocatori casuali per completare le squadre
            const playersPerTeam = parseInt(this.queueMode.charAt(0));
            const totalPlayers = playersPerTeam * 2;
            const remainingPlayers = totalPlayers - matchData.players.length;
            
            for (let i = 0; i < remainingPlayers; i++) {
                const team = i < playersPerTeam - matchData.players.length ? 'red' : 'blue';
                matchData.players.push({
                    id: 'player_' + Math.random().toString(36).substr(2, 9),
                    nickname: 'Giocatore' + (i + 1),
                    team: team,
                    accepted: false,
                    declined: false
                });
            }
            
            // Simula il match trovato
            this.handleMatchFound(matchData);
        }, 5000); // Simula un tempo di attesa di 5 secondi
    }
    
    simulateOtherPlayersAccepting() {
        // Simula l'accettazione degli altri giocatori dopo un po'
        setTimeout(() => {
            if (!this.matchFound) return; // Verifica se il match è ancora attivo
            
            // Fai accettare tutti gli altri giocatori
            this.matchPlayers.forEach(player => {
                if (player.id !== this.networkManager.getPlayerId() && !player.accepted && !player.declined) {
                    this.handleMatchAccepted({
                        id: player.id,
                        nickname: player.nickname
                    });
                }
            });
            
            // Verifica se tutti i giocatori hanno accettato
            const allAccepted = this.matchPlayers.every(player => player.accepted);
            if (allAccepted) {
                // Simula l'avvio del match dopo un po'
                setTimeout(() => {
                    this.handleMatchStarting({
                        id: 'match_' + Math.random().toString(36).substr(2, 9),
                        mode: this.queueMode,
                        players: this.matchPlayers
                    });
                }, 2000);
            }
        }, 2000); // Simula un tempo di attesa di 2 secondi
    }
    
    // Metodi per la creazione della partita ranked
    verifyPlayersForGame(matchData) {
        // Verifica che ci siano abbastanza giocatori per la modalità
        const playersPerTeam = parseInt(matchData.mode.charAt(0));
        const redTeamPlayers = matchData.players.filter(p => p.team === 'red');
        const blueTeamPlayers = matchData.players.filter(p => p.team === 'blue');
        
        return redTeamPlayers.length === playersPerTeam && blueTeamPlayers.length === playersPerTeam;
    }
    
    createRankedRoomData(matchData) {
        // Ottieni le impostazioni standard per la modalità
        const settings = this.standardSettings[matchData.mode];
        
        // Crea i dati della stanza
        const roomData = {
            id: 'ranked_' + matchData.id,
            name: `Partita Ranked ${matchData.mode}`,
            isPrivate: false,
            password: null,
            maxPlayers: matchData.players.length,
            type: 'ranked',
            players: matchData.players.length,
            redTeam: matchData.players.filter(p => p.team === 'red'),
            blueTeam: matchData.players.filter(p => p.team === 'blue'),
            spectators: [],
            gameSettings: {
                timeLimit: settings.timeLimit,
                scoreLimit: settings.scoreLimit,
                field: settings.field,
                teamLock: settings.teamLock
            },
            gameInProgress: true,
            isRanked: true,
            rankedMode: matchData.mode
        };
        
        return roomData;
    }
}
