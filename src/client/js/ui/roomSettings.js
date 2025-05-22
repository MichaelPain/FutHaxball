// roomSettings.js - Gestione delle impostazioni di gioco all'interno della stanza

export class RoomSettingsManager {
    constructor(roomManager, uiManager) {
        this.roomManager = roomManager;
        this.uiManager = uiManager;
        this.currentSettings = null;
        this.availableFields = this.roomManager.getAvailableFields();
    }
    
    // Inizializza l'interfaccia delle impostazioni di gioco
    initSettingsUI(container, isHost) {
        if (!container) return;
        
        // Ottieni le impostazioni correnti
        this.currentSettings = this.roomManager.currentRoom?.gameSettings || {
            timeLimit: 5,
            scoreLimit: 3,
            field: 'standard',
            teamLock: false
        };
        
        // Crea l'interfaccia delle impostazioni
        const settingsHTML = `
            <div class="room-settings-container">
                <h3>Impostazioni di Gioco</h3>
                <div class="settings-section">
                    <div class="setting-row">
                        <label for="time-limit">Tempo limite (minuti):</label>
                        <div class="setting-input">
                            <input type="number" id="time-limit" min="0" max="60" value="${this.currentSettings.timeLimit}" ${!isHost ? 'disabled' : ''}>
                            <span class="setting-hint">0 = nessun limite</span>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label for="score-limit">Goal massimi:</label>
                        <div class="setting-input">
                            <input type="number" id="score-limit" min="0" max="100" value="${this.currentSettings.scoreLimit}" ${!isHost ? 'disabled' : ''}>
                            <span class="setting-hint">0 = nessun limite</span>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label for="team-lock">Blocco squadre:</label>
                        <div class="setting-input">
                            <input type="checkbox" id="team-lock" ${this.currentSettings.teamLock ? 'checked' : ''} ${!isHost ? 'disabled' : ''}>
                            <span class="setting-hint">Impedisce ai giocatori di cambiare squadra durante la partita</span>
                        </div>
                    </div>
                </div>
                
                <h3>Campo di Gioco</h3>
                <div class="fields-gallery">
                    ${this.renderFieldsGallery(isHost)}
                </div>
                
                ${isHost ? `
                <div class="settings-actions">
                    <button id="save-settings-btn" class="primary-btn">Salva Impostazioni</button>
                </div>
                ` : ''}
            </div>
        `;
        
        // Inserisci l'HTML nel container
        container.innerHTML = settingsHTML;
        
        // Se l'utente è l'host, aggiungi gli event listener
        if (isHost) {
            this.setupEventListeners(container);
        }
    }
    
    // Renderizza la galleria dei campi
    renderFieldsGallery(isHost) {
        return this.availableFields.map(field => `
            <div class="field-item ${this.currentSettings.field === field.id ? 'selected' : ''}" data-field-id="${field.id}" ${isHost ? 'data-selectable="true"' : ''}>
                <div class="field-preview">
                    <img src="assets/fields/${field.id}.png" alt="${field.name}">
                </div>
                <div class="field-info">
                    <h4>${field.name}</h4>
                    <p>${field.description}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Configura gli event listener per le impostazioni
    setupEventListeners(container) {
        // Salva le impostazioni
        const saveBtn = container.querySelector('#save-settings-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings(container));
        }
        
        // Selezione del campo
        const fieldItems = container.querySelectorAll('.field-item[data-selectable="true"]');
        fieldItems.forEach(item => {
            item.addEventListener('click', () => {
                // Rimuovi la selezione da tutti i campi
                fieldItems.forEach(f => f.classList.remove('selected'));
                
                // Seleziona questo campo
                item.classList.add('selected');
            });
        });
    }
    
    // Salva le impostazioni
    saveSettings(container) {
        // Raccogli i valori dai campi di input
        const timeLimit = parseInt(container.querySelector('#time-limit').value) || 0;
        const scoreLimit = parseInt(container.querySelector('#score-limit').value) || 0;
        const teamLock = container.querySelector('#team-lock').checked;
        
        // Ottieni il campo selezionato
        const selectedField = container.querySelector('.field-item.selected');
        const fieldId = selectedField ? selectedField.getAttribute('data-field-id') : 'standard';
        
        // Crea l'oggetto delle impostazioni
        const newSettings = {
            timeLimit,
            scoreLimit,
            field: fieldId,
            teamLock
        };
        
        // Aggiorna le impostazioni tramite il roomManager
        this.roomManager.updateGameSettings(newSettings);
        
        // Mostra una notifica di successo
        this.uiManager.showNotification('Impostazioni di gioco salvate', 'success');
    }
    
    // Inizializza l'interfaccia delle opzioni post-partita
    initPostGameOptionsUI(container, gameSettings, gameResults) {
        if (!container) return;
        
        // Salva le impostazioni correnti
        this.currentSettings = gameSettings || {
            timeLimit: 5,
            scoreLimit: 3,
            field: 'standard',
            teamLock: false
        };
        
        // Crea l'interfaccia delle opzioni post-partita
        const optionsHTML = `
            <div class="post-game-options">
                <h2>Partita Terminata</h2>
                
                ${gameResults ? `
                <div class="game-results">
                    <h3>Risultato Finale</h3>
                    <div class="final-score">
                        <span class="team-red">${gameResults.redScore}</span>
                        <span class="score-separator">-</span>
                        <span class="team-blue">${gameResults.blueScore}</span>
                    </div>
                    <p class="winner-message">${this.getWinnerMessage(gameResults)}</p>
                </div>
                ` : ''}
                
                <h3>Impostazioni per la prossima partita</h3>
                <div class="settings-section">
                    <div class="setting-row">
                        <label for="pg-time-limit">Tempo limite (minuti):</label>
                        <div class="setting-input">
                            <input type="number" id="pg-time-limit" min="0" max="60" value="${this.currentSettings.timeLimit}">
                            <span class="setting-hint">0 = nessun limite</span>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label for="pg-score-limit">Goal massimi:</label>
                        <div class="setting-input">
                            <input type="number" id="pg-score-limit" min="0" max="100" value="${this.currentSettings.scoreLimit}">
                            <span class="setting-hint">0 = nessun limite</span>
                        </div>
                    </div>
                    <div class="setting-row">
                        <label for="pg-team-lock">Blocco squadre:</label>
                        <div class="setting-input">
                            <input type="checkbox" id="pg-team-lock" ${this.currentSettings.teamLock ? 'checked' : ''}>
                            <span class="setting-hint">Impedisce ai giocatori di cambiare squadra durante la partita</span>
                        </div>
                    </div>
                </div>
                
                <h3>Campo di Gioco</h3>
                <div class="fields-gallery">
                    ${this.renderFieldsGallery(true)}
                </div>
                
                <div class="post-game-actions">
                    <button id="start-new-game-btn" class="primary-btn">Inizia Nuova Partita</button>
                    <button id="return-to-room-btn" class="secondary-btn">Torna alla Stanza</button>
                </div>
            </div>
        `;
        
        // Inserisci l'HTML nel container
        container.innerHTML = optionsHTML;
        
        // Configura gli event listener
        this.setupPostGameEventListeners(container);
    }
    
    // Configura gli event listener per le opzioni post-partita
    setupPostGameEventListeners(container) {
        // Selezione del campo
        const fieldItems = container.querySelectorAll('.field-item[data-selectable="true"]');
        fieldItems.forEach(item => {
            item.addEventListener('click', () => {
                // Rimuovi la selezione da tutti i campi
                fieldItems.forEach(f => f.classList.remove('selected'));
                
                // Seleziona questo campo
                item.classList.add('selected');
            });
        });
        
        // Inizia una nuova partita
        const startNewGameBtn = container.querySelector('#start-new-game-btn');
        if (startNewGameBtn) {
            startNewGameBtn.addEventListener('click', () => {
                // Raccogli i valori dai campi di input
                const timeLimit = parseInt(container.querySelector('#pg-time-limit').value) || 0;
                const scoreLimit = parseInt(container.querySelector('#pg-score-limit').value) || 0;
                const teamLock = container.querySelector('#pg-team-lock').checked;
                
                // Ottieni il campo selezionato
                const selectedField = container.querySelector('.field-item.selected');
                const fieldId = selectedField ? selectedField.getAttribute('data-field-id') : 'standard';
                
                // Crea l'oggetto delle impostazioni
                const newSettings = {
                    timeLimit,
                    scoreLimit,
                    field: fieldId,
                    teamLock
                };
                
                // Aggiorna le impostazioni tramite il roomManager
                this.roomManager.updateGameSettings(newSettings);
                
                // Avvia una nuova partita
                this.roomManager.startNewGame();
            });
        }
        
        // Torna alla stanza
        const returnToRoomBtn = container.querySelector('#return-to-room-btn');
        if (returnToRoomBtn) {
            returnToRoomBtn.addEventListener('click', () => {
                // Nascondi le opzioni post-partita
                container.innerHTML = '';
                
                // Mostra la schermata della stanza
                this.uiManager.showScreen('room-screen');
            });
        }
    }
    
    // Ottieni il messaggio del vincitore
    getWinnerMessage(gameResults) {
        if (gameResults.redScore > gameResults.blueScore) {
            return 'La squadra rossa ha vinto!';
        } else if (gameResults.blueScore > gameResults.redScore) {
            return 'La squadra blu ha vinto!';
        } else {
            return 'La partita è terminata in pareggio!';
        }
    }
}
