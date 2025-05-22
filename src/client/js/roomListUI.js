// Implementazione migliorata di roomListUI.js con correzioni per le funzionalità delle stanze

export class RoomListUI {
    constructor(roomManager, uiManager, authManager) {
        this.roomManager = roomManager;
        this.uiManager = uiManager;
        this.authManager = authManager;
        this.roomsContainer = document.querySelector('.rooms-container');
        this.roomsList = document.querySelector('.rooms-list');
        this.createRoomBtn = document.querySelector('.create-room-btn');
        this.roomSearch = document.getElementById('room-search');
        this.roomFilter = document.getElementById('room-filter');
        this.backBtn = document.querySelector('.rooms-footer .back-btn');
        this.onlineCount = document.getElementById('online-count');
        
        // Binding dei metodi
        this.setupEventListeners();
        
        // Inizializza la lista delle stanze
        this.initializeRoomList();
    }
    
    setupEventListeners() {
        // Pulsante per creare una stanza
        this.createRoomBtn.addEventListener('click', () => {
            // Verifica se l'utente è autenticato
            if (this.roomManager.authManager && !this.roomManager.authManager.isLoggedIn()) {
                this.uiManager.showNotification('Devi effettuare il login per creare una stanza', 'error');
                this.uiManager.showScreen('auth-screen');
                return;
            }
            
            this.showCreateRoomModal();
        });
        
        // Filtro per nome stanza
        this.roomSearch.addEventListener('input', () => {
            this.filterRooms();
        });
        
        // Filtro per tipo di stanza
        this.roomFilter.addEventListener('change', () => {
            this.filterRooms();
        });
        
        // Pulsante per tornare indietro
        this.backBtn.addEventListener('click', () => {
            this.uiManager.showScreen('main-menu-screen');
        });
    }
    
    initializeRoomList() {
        // Per la versione di sviluppo, popola alcune stanze di esempio
        this.roomManager.populateExampleRooms();
        
        // Aggiorna il contatore di giocatori online
        this.updateOnlineCount();
    }
    
    // Aggiorna la lista delle stanze
    updateRoomList(rooms) {
        // Pulisci la lista attuale
        this.roomsList.innerHTML = '';
        
        if (!rooms || rooms.length === 0) {
            const noRoomsElement = document.createElement('div');
            noRoomsElement.className = 'no-rooms-message';
            noRoomsElement.textContent = 'Nessuna stanza disponibile. Creane una nuova!';
            this.roomsList.appendChild(noRoomsElement);
            return;
        }
        
        // Filtra le stanze in base ai criteri attuali
        const filteredRooms = this.getFilteredRooms(rooms);
        
        // Crea gli elementi per ogni stanza
        filteredRooms.forEach(room => {
            const roomElement = this.createRoomElement(room);
            this.roomsList.appendChild(roomElement);
        });
        
        // Aggiorna il contatore di giocatori online
        this.updateOnlineCount();
    }
    
    // Crea un elemento HTML per una stanza
    createRoomElement(room) {
        const roomElement = document.createElement('div');
        roomElement.className = 'room-item';
        roomElement.dataset.roomId = room.id;
        
        // Aggiungi classe se la stanza ha password
        if (room.password) {
            roomElement.classList.add('password-protected');
        }
        
        // Calcola il numero totale di giocatori
        const totalPlayers = this.getTotalPlayers(room);
        
        // Crea il contenuto della stanza
        roomElement.innerHTML = `
            <div class="room-info">
                <h3 class="room-name">${room.name} ${room.password ? '<i class="fas fa-lock"></i>' : ''}</h3>
                <div class="room-details">
                    <span class="room-players">${totalPlayers}/${room.maxPlayers} giocatori</span>
                    <span class="room-type">${this.getRoomTypeLabel(room.type)}</span>
                </div>
            </div>
            <button class="join-button">Entra</button>
        `;
        
        // Aggiungi event listener per il pulsante di join
        const joinButton = roomElement.querySelector('.join-button');
        joinButton.addEventListener('click', () => {
            this.handleJoinRoom(room);
        });
        
        return roomElement;
    }
    
    // Gestisce l'entrata in una stanza
    handleJoinRoom(room) {
        // Verifica se l'utente è autenticato per le stanze ranked
        if (room.type === 'ranked' && this.authManager && !this.authManager.isLoggedIn()) {
            this.uiManager.showNotification('Devi effettuare il login per entrare in una stanza competitiva', 'error');
            this.uiManager.showScreen('auth-screen');
            return;
        }
        
        if (room.password) {
            // Se la stanza ha una password, mostra il modal per inserirla
            this.showPasswordModal(room.id);
        } else {
            // Altrimenti, entra direttamente
            this.roomManager.joinRoom(room.id);
        }
    }
    
    // Mostra il modal per inserire la password
    showPasswordModal(roomId) {
        // Crea il modal se non esiste
        let modal = document.getElementById('password-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'password-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Inserisci la password</h3>
                    <div class="form-group">
                        <input type="password" id="room-password-input" class="form-control" placeholder="Password">
                    </div>
                    <div class="modal-actions">
                        <button id="cancel-password-btn" class="btn btn-secondary">Annulla</button>
                        <button id="submit-password-btn" class="btn btn-primary">Entra</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        const passwordInput = document.getElementById('room-password-input');
        const submitButton = document.getElementById('submit-password-btn');
        const cancelButton = document.getElementById('cancel-password-btn');
        
        // Resetta l'input
        passwordInput.value = '';
        
        // Mostra il modal
        modal.style.display = 'flex';
        
        // Focus sull'input
        passwordInput.focus();
        
        // Gestisci il submit
        const handleSubmit = () => {
            const password = passwordInput.value.trim();
            if (password) {
                this.roomManager.joinRoom(roomId, password);
                modal.style.display = 'none';
            }
        };
        
        // Event listener per il pulsante di submit
        submitButton.onclick = handleSubmit;
        
        // Event listener per il tasto Enter
        passwordInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        
        // Event listener per il pulsante di annulla
        cancelButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Mostra il modal per creare una stanza
    showCreateRoomModal() {
        // Crea il modal se non esiste
        let modal = document.getElementById('create-room-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'create-room-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Crea una nuova stanza</h3>
                    <div class="form-group">
                        <label for="room-name-input">Nome stanza</label>
                        <input type="text" id="room-name-input" class="form-control" placeholder="Nome stanza">
                    </div>
                    <div class="form-group">
                        <label for="create-room-password-input">Password (opzionale)</label>
                        <input type="password" id="create-room-password-input" class="form-control" placeholder="Lascia vuoto per stanza pubblica">
                    </div>
                    <div class="form-group">
                        <label for="max-players-input">Numero massimo di giocatori</label>
                        <input type="number" id="max-players-input" class="form-control" value="10" min="2" max="20">
                    </div>
                    <div class="form-group">
                        <label for="room-type-select">Tipo di stanza</label>
                        <select id="room-type-select" class="form-control">
                            <option value="normal">Normale</option>
                            <option value="ranked">Competitiva</option>
                            <option value="custom">Personalizzata</option>
                        </select>
                    </div>
                    <div class="modal-actions">
                        <button id="cancel-create-room-btn" class="btn btn-secondary">Annulla</button>
                        <button id="create-room-btn" class="btn btn-primary">Crea stanza</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        const nameInput = document.getElementById('room-name-input');
        const passwordInput = document.getElementById('create-room-password-input');
        const maxPlayersInput = document.getElementById('max-players-input');
        const roomTypeSelect = document.getElementById('room-type-select');
        const submitButton = document.getElementById('create-room-btn');
        const cancelButton = document.getElementById('cancel-create-room-btn');
        
        // Resetta gli input
        nameInput.value = '';
        passwordInput.value = '';
        maxPlayersInput.value = '10';
        roomTypeSelect.value = 'normal';
        
        // Mostra il modal
        modal.style.display = 'flex';
        
        // Focus sul primo input
        nameInput.focus();
        
        // Gestisci il submit
        const handleSubmit = () => {
            const name = nameInput.value.trim();
            const password = passwordInput.value.trim();
            const maxPlayers = parseInt(maxPlayersInput.value, 10);
            const type = roomTypeSelect.value;
            
            if (!name) {
                this.uiManager.showNotification('Il nome della stanza è obbligatorio', 'error');
                return;
            }
            
            // Mostra un indicatore di caricamento
            submitButton.textContent = 'Creazione in corso...';
            submitButton.disabled = true;
            
            // Crea la stanza e ottieni l'ID
            const roomData = {
                name,
                password: password || null,
                maxPlayers: isNaN(maxPlayers) ? 10 : maxPlayers,
                type
            };
            
            // Emetti l'evento di creazione stanza
            const event = new CustomEvent('createRoom', { detail: roomData });
            document.dispatchEvent(event);
            
            // Chiudi il modal
            modal.style.display = 'none';
            
            // Mostra una notifica
            this.uiManager.showNotification('Stanza creata con successo!', 'success');
        };
        
        // Event listener per il pulsante di submit
        submitButton.onclick = handleSubmit;
        
        // Event listener per il tasto Enter nel campo nome
        nameInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            }
        };
        
        // Event listener per il pulsante di annulla
        cancelButton.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Filtra le stanze in base ai criteri attuali
    filterRooms() {
        const rooms = Array.from(this.roomManager.rooms.values());
        const filteredRooms = this.getFilteredRooms(rooms);
        
        // Aggiorna la lista con le stanze filtrate
        this.updateRoomList(filteredRooms);
    }
    
    // Ottieni le stanze filtrate in base ai criteri attuali
    getFilteredRooms(rooms) {
        const filterText = this.roomSearch.value.toLowerCase();
        const filterType = this.roomFilter.value;
        
        return rooms.filter(room => {
            // Filtra per nome
            const nameMatch = room.name.toLowerCase().includes(filterText);
            
            // Filtra per tipo
            let typeMatch = true;
            if (filterType === 'public') {
                typeMatch = !room.password;
            } else if (filterType === 'password') {
                typeMatch = !!room.password;
            }
            
            return nameMatch && typeMatch;
        });
    }
    
    // Ottieni l'etichetta per il tipo di stanza
    getRoomTypeLabel(type) {
        switch (type) {
            case 'normal':
                return 'Normale';
            case 'ranked':
                return 'Competitiva';
            case 'custom':
                return 'Personalizzata';
            default:
                return type;
        }
    }
    
    // Ottieni il numero totale di giocatori in una stanza
    getTotalPlayers(room) {
        let total = 0;
        
        if (room.redTeam) total += room.redTeam.length;
        if (room.blueTeam) total += room.blueTeam.length;
        if (room.spectators) total += room.spectators.length;
        
        // Se non ci sono squadre definite, usa il campo players
        if (total === 0 && room.players) {
            total = room.players;
        }
        
        return total;
    }
    
    // Aggiorna il contatore di giocatori online
    updateOnlineCount() {
        let totalPlayers = 0;
        
        // Conta tutti i giocatori in tutte le stanze
        this.roomManager.rooms.forEach(room => {
            totalPlayers += this.getTotalPlayers(room);
        });
        
        // Aggiungi alcuni giocatori casuali per la versione di sviluppo
        totalPlayers += Math.floor(Math.random() * 50) + 20;
        
        // Aggiorna il contatore
        if (this.onlineCount) {
            this.onlineCount.textContent = totalPlayers;
        }
    }
    
    // Controlla se c'è un invito nell'URL
    checkForInviteLink() {
        const params = RoomListUI.parseUrlParams();
        if (params && params.roomId) {
            // Se c'è un invito, entra nella stanza
            this.roomManager.joinRoom(params.roomId, params.password);
            
            // Pulisci l'URL per evitare di entrare di nuovo nella stanza se l'utente aggiorna la pagina
            window.history.replaceState({}, document.title, window.location.pathname);
            
            return true;
        }
        
        return false;
    }
    
    // Metodi per il parsing dei parametri URL
    static parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        const password = urlParams.get('password');
        
        if (roomId) {
            return { roomId, password };
        }
        
        return null;
    }
}
