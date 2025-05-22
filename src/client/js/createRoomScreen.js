// createRoomScreen.js - Gestione della schermata di creazione stanza

export class CreateRoomScreen {
    constructor(uiManager, roomManager) {
        this.uiManager = uiManager;
        this.roomManager = roomManager;
        
        // Elementi DOM
        this.roomNameInput = null;
        this.roomPasswordInput = null;
        this.maxPlayersInput = null;
        this.roomTypeSelect = null;
        this.createRoomButton = null;
        this.cancelButton = null;
    }
    
    init() {
        console.log("Inizializzazione schermata di creazione stanza");
        
        // Ottieni i riferimenti agli elementi DOM
        this.roomNameInput = document.getElementById('room-name');
        this.roomPasswordInput = document.getElementById('room-password');
        this.maxPlayersInput = document.getElementById('max-players');
        this.roomTypeSelect = document.getElementById('room-type');
        this.createRoomButton = document.getElementById('create-room-submit');
        this.cancelButton = document.getElementById('create-room-cancel');
        
        // Verifica che tutti gli elementi esistano
        if (!this.roomNameInput || !this.roomPasswordInput || !this.maxPlayersInput || 
            !this.roomTypeSelect || !this.createRoomButton || !this.cancelButton) {
            console.error("Elementi della schermata di creazione stanza non trovati");
            return;
        }
        
        // Resetta i campi del form
        this.resetForm();
        
        // Configura gli event listener
        this.setupEventListeners();
    }
    
    resetForm() {
        // Resetta i campi del form
        this.roomNameInput.value = '';
        this.roomPasswordInput.value = '';
        this.maxPlayersInput.value = '10';
        this.roomTypeSelect.value = 'normal';
    }
    
    setupEventListeners() {
        // Rimuovi eventuali listener precedenti
        const newCreateButton = this.createRoomButton.cloneNode(true);
        this.createRoomButton.parentNode.replaceChild(newCreateButton, this.createRoomButton);
        this.createRoomButton = newCreateButton;
        
        const newCancelButton = this.cancelButton.cloneNode(true);
        this.cancelButton.parentNode.replaceChild(newCancelButton, this.cancelButton);
        this.cancelButton = newCancelButton;
        
        // Aggiungi il listener per il pulsante di creazione stanza
        this.createRoomButton.addEventListener('click', () => {
            this.handleCreateRoom();
        });
        
        // Aggiungi il listener per il pulsante di annullamento
        this.cancelButton.addEventListener('click', () => {
            this.uiManager.showScreen('main-menu-screen');
        });
    }
    
    handleCreateRoom() {
        console.log("Gestione creazione stanza");
        
        // Ottieni i dati dal form
        const roomName = this.roomNameInput.value.trim();
        const roomPassword = this.roomPasswordInput.value.trim();
        const maxPlayers = parseInt(this.maxPlayersInput.value);
        const roomType = this.roomTypeSelect.value;
        
        // Validazione dei campi
        if (!roomName) {
            this.uiManager.showNotification('Inserisci un nome per la stanza', 'error');
            return;
        }
        
        if (isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 20) {
            this.uiManager.showNotification('Il numero massimo di giocatori deve essere compreso tra 2 e 20', 'error');
            return;
        }
        
        // Crea l'oggetto con i dati della stanza
        const roomData = {
            name: roomName,
            password: roomPassword,
            maxPlayers: maxPlayers,
            type: roomType
        };
        
        console.log("Dati stanza:", roomData);
        
        // Crea l'evento createRoom
        const event = new CustomEvent('createRoom', {
            detail: roomData
        });
        
        // Dispatch dell'evento
        document.dispatchEvent(event);
    }
}
