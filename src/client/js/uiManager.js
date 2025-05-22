// uiManager.js - Gestisce l'interfaccia utente e le transizioni tra schermate

export class UIManager {
    constructor() {
        this.screens = {};
        this.currentScreen = null;
        this.screenHistory = []; // Aggiunto per tenere traccia della storia di navigazione
        this.notificationTimeout = null;
    }

    init() {
        // Inizializza riferimenti a tutte le schermate
        document.querySelectorAll('.screen').forEach(screen => {
            this.screens[screen.id] = screen;
        });
        
        // Non impostare una schermata iniziale qui, sarà impostata da main.js
        this.currentScreen = null;
        this.screenHistory = [];
        
        // Crea un elemento per le notifiche
        this.createNotificationElement();
        
        // Configura i pulsanti di navigazione globali
        this.setupGlobalNavigation();
    }
    
    createNotificationElement() {
        // Crea un elemento per mostrare notifiche e messaggi di errore
        const notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.display = 'none';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.zIndex = '1000';
        
        document.body.appendChild(notification);
        this.notification = notification;
    }
    
    setupGlobalNavigation() {
        // Configura tutti i pulsanti "indietro" per tornare alla schermata precedente
        document.querySelectorAll('.back-btn').forEach(button => {
            // Rimuovi eventuali listener precedenti
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                // Vai direttamente al menu principale invece di usare goBack()
                this.showScreen('main-menu-screen');
            });
        });
        
        // Configura tutti i pulsanti "menu principale" per tornare al menu principale
        document.querySelectorAll('.main-menu-btn').forEach(button => {
            // Rimuovi eventuali listener precedenti
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                this.showScreen('main-menu-screen');
            });
        });
    }
    
    showScreen(screenId, data = {}) {
        if (!this.screens[screenId]) {
            console.error(`Schermata ${screenId} non trovata`);
            return;
        }
        
        console.log(`Cambio schermata da ${this.currentScreen} a ${screenId}`);
        
        // Nascondi tutte le schermate
        Object.values(this.screens).forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Mostra la nuova schermata
        this.screens[screenId].style.display = 'block';
        
        // Aggiorna la storia di navigazione
        if (this.currentScreen && screenId !== this.currentScreen) {
            if (screenId === 'main-menu-screen') {
                // Se stiamo andando al menu principale, resetta la storia
                this.screenHistory = ['main-menu-screen'];
            } else {
                // Aggiungi la schermata corrente alla storia
                this.screenHistory.push(this.currentScreen);
            }
        }
        
        this.currentScreen = screenId;
        
        // Gestione speciale per la schermata di gioco
        if (screenId === 'game-screen') {
            document.body.style.overflow = 'hidden'; // Disabilita lo scroll
        } else {
            document.body.style.overflow = ''; // Ripristina lo scroll
        }
        
        // Aggiorna tutti i pulsanti di navigazione
        this.updateAllNavigationButtons();
        
        // Esegui eventuali inizializzazioni specifiche per la schermata
        this.initializeScreen(screenId, data);
    }
    
    // Inizializza la schermata in base al tipo
    initializeScreen(screenId, data = {}) {
        switch(screenId) {
            case 'rooms-screen':
                // Inizializza la schermata delle stanze
                if (typeof window.initRoomsScreen === 'function') {
                    window.initRoomsScreen();
                }
                break;
                
            case 'game-screen':
                // Inizializza la schermata di gioco
                if (typeof initGame === 'function') {
                    initGame(data);
                }
                break;
                
            case 'leaderboard-screen':
                // Inizializza la schermata delle classifiche
                if (typeof window.initLeaderboard === 'function') {
                    window.initLeaderboard();
                }
                break;
                
            case 'settings-screen':
                // Inizializza la schermata delle impostazioni
                if (typeof window.initSettings === 'function') {
                    window.initSettings();
                }
                break;
                
            case 'room-screen':
                // Inizializza la schermata della stanza
                if (typeof initRoomScreen === 'function') {
                    initRoomScreen(data);
                }
                break;
                
            case 'events-screen':
                // Inizializza la schermata degli eventi
                if (typeof window.initEventsScreen === 'function') {
                    window.initEventsScreen();
                }
                break;
                
            case 'profile-screen':
                // Inizializza la schermata del profilo
                if (typeof window.initProfileScreen === 'function') {
                    window.initProfileScreen();
                }
                break;
                
            case 'create-room-screen':
                // Inizializza la schermata di creazione stanza
                if (typeof window.initCreateRoomScreen === 'function') {
                    window.initCreateRoomScreen();
                }
                break;
                
            case 'ranked-matchmaking-screen':
                // Inizializza la schermata di matchmaking ranked
                if (typeof window.initRankedMatchmaking === 'function') {
                    window.initRankedMatchmaking();
                }
                break;
                
            case 'tournament-view-screen':
                // Inizializza la schermata di visualizzazione torneo
                if (typeof initTournamentViewScreen === 'function') {
                    initTournamentViewScreen(data);
                }
                break;
        }
    }
    
    updateNavigationButtons(screenId) {
        // Aggiorna i pulsanti di navigazione nella schermata corrente
        const backButtons = this.screens[screenId].querySelectorAll('.back-btn');
        
        backButtons.forEach(button => {
            // Rimuovi eventuali listener precedenti
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                // Vai direttamente al menu principale invece di usare goBack()
                this.showScreen('main-menu-screen');
            });
        });
    }
    
    // Metodo per aggiornare tutti i pulsanti di navigazione in tutte le schermate
    updateAllNavigationButtons() {
        Object.keys(this.screens).forEach(screenId => {
            this.updateNavigationButtons(screenId);
        });
    }
    
    goBack() {
        console.log("Torno indietro");
        console.log("Storia di navigazione:", this.screenHistory);
        
        // Vai sempre al menu principale quando si preme indietro
        this.showScreen('main-menu-screen');
    }
    
    getCurrentScreen() {
        return this.currentScreen;
    }
    
    showNotification(message, type = 'info', options = {}) {
        // Cancella eventuali notifiche precedenti
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Imposta lo stile in base al tipo di notifica
        switch (type) {
            case 'error':
                this.notification.style.backgroundColor = '#f44336';
                break;
            case 'success':
                this.notification.style.backgroundColor = '#4caf50';
                break;
            case 'warning':
                this.notification.style.backgroundColor = '#ff9800';
                break;
            default:
                this.notification.style.backgroundColor = '#2196f3';
        }
        
        // Mostra la notifica
        this.notification.textContent = message;
        this.notification.style.display = 'block';
        
        // Aggiungi pulsanti di azione se presenti
        if (options.actions && options.actions.length > 0) {
            // Rimuovi eventuali pulsanti precedenti
            const existingButtons = this.notification.querySelectorAll('button');
            existingButtons.forEach(button => button.remove());
            
            // Crea un contenitore per i pulsanti
            const actionsContainer = document.createElement('div');
            actionsContainer.style.marginTop = '10px';
            actionsContainer.style.display = 'flex';
            actionsContainer.style.justifyContent = 'flex-end';
            
            // Aggiungi i pulsanti
            options.actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.text;
                button.style.marginLeft = '5px';
                button.style.padding = '5px 10px';
                button.style.border = 'none';
                button.style.borderRadius = '3px';
                button.style.cursor = 'pointer';
                button.addEventListener('click', () => {
                    action.callback();
                    this.notification.style.display = 'none';
                });
                actionsContainer.appendChild(button);
            });
            
            this.notification.appendChild(actionsContainer);
        }
        
        // Nascondi la notifica dopo 3 secondi se non ci sono azioni
        if (!options.actions || options.actions.length === 0) {
            this.notificationTimeout = setTimeout(() => {
                this.notification.style.display = 'none';
            }, 3000);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    updateRoomList(rooms) {
        const roomListElement = document.querySelector('.rooms-list');
        if (!roomListElement) {
            console.error('Elemento rooms-list non trovato');
            return;
        }
        
        roomListElement.innerHTML = '';
        
        if (rooms.length === 0) {
            const noRoomsMessage = document.createElement('div');
            noRoomsMessage.className = 'no-rooms-message';
            noRoomsMessage.textContent = 'Nessuna stanza disponibile';
            roomListElement.appendChild(noRoomsMessage);
            return;
        }
        
        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.dataset.roomId = room.id;
            
            const roomName = document.createElement('div');
            roomName.className = 'room-name';
            roomName.textContent = room.name;
            if (room.isPrivate) {
                roomName.innerHTML += ' <i class="lock-icon">🔒</i>';
            }
            
            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';
            roomInfo.innerHTML = `
                <span>${room.players}/${room.maxPlayers} giocatori</span>
                <span>${room.type === 'ranked' ? 'Ranked' : 'Normal'}</span>
                <span>${room.gameInProgress ? 'In corso' : 'In attesa'}</span>
            `;
            
            roomElement.appendChild(roomName);
            roomElement.appendChild(roomInfo);
            
            roomElement.addEventListener('click', () => {
                this.handleRoomClick(room);
            });
            
            roomListElement.appendChild(roomElement);
        });
    }
    
    handleRoomClick(room) {
        if (room.isPrivate) {
            // Chiedi la password se la stanza è protetta
            const password = prompt('Inserisci la password per entrare nella stanza:');
            if (password === null) return; // L'utente ha annullato
            
            // Emetti evento per entrare nella stanza con password
            const event = new CustomEvent('joinRoom', {
                detail: { roomId: room.id, password }
            });
            document.dispatchEvent(event);
        } else {
            // Emetti evento per entrare nella stanza senza password
            const event = new CustomEvent('joinRoom', {
                detail: { roomId: room.id }
            });
            document.dispatchEvent(event);
        }
    }
    
    updateRoomInfo(roomData) {
        // Aggiorna il titolo della stanza
        const roomTitle = document.getElementById('room-title');
        if (roomTitle) {
            roomTitle.textContent = roomData.name;
        }
        
        // Aggiorna le liste dei giocatori
        this.updateTeamList('red-team-players', roomData.redTeam || []);
        this.updateTeamList('blue-team-players', roomData.blueTeam || []);
        this.updateTeamList('spectator-players', roomData.spectators || []);
        
        // Aggiorna i controlli in base ai permessi
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.disabled = !roomData.isHost;
            startGameBtn.style.opacity = roomData.isHost ? '1' : '0.5';
        }
    }
    
    updateTeamList(elementId, players) {
        const teamElement = document.getElementById(elementId);
        if (!teamElement) {
            console.error(`Elemento ${elementId} non trovato`);
            return;
        }
        
        teamElement.innerHTML = '';
        
        if (players.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.className = 'empty-team';
            emptyMessage.textContent = 'Nessun giocatore';
            teamElement.appendChild(emptyMessage);
            return;
        }
        
        players.forEach(player => {
            const playerElement = document.createElement('li');
            playerElement.textContent = player.nickname;
            if (player.isHost) {
                playerElement.innerHTML += ' <span class="host-badge">(Host)</span>';
            }
            teamElement.appendChild(playerElement);
        });
    }
    
    updateGameScore(redScore, blueScore) {
        const redScoreElement = document.querySelector('.team-red');
        const blueScoreElement = document.querySelector('.team-blue');
        
        if (redScoreElement) {
            redScoreElement.textContent = redScore;
        }
        
        if (blueScoreElement) {
            blueScoreElement.textContent = blueScore;
        }
    }
    
    updateGameTimer(timeString) {
        const gameTimer = document.querySelector('.game-timer');
        if (gameTimer) {
            gameTimer.textContent = timeString;
        }
    }
    
    addChatMessage(messageData) {
        const chatMessages = document.querySelector('.chat-messages');
        if (!chatMessages) {
            console.error('Elemento chat-messages non trovato');
            return;
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        if (typeof messageData === 'string') {
            // Se è una stringa semplice, mostrala come messaggio di sistema
            messageElement.innerHTML = `<span class="system-message">${messageData}</span>`;
        } else {
            // Altrimenti, mostra il messaggio con il nickname
            messageElement.innerHTML = `<strong>${messageData.nickname || 'Sistema'}:</strong> ${messageData.message || messageData}`;
        }
        
        chatMessages.appendChild(messageElement);
        
        // Auto-scroll al messaggio più recente
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
