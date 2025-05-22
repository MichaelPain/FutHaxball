// events.js - Gestisce gli eventi e i tornei

export class EventsManager {
    constructor(authManager, uiManager) {
        this.authManager = authManager;
        this.uiManager = uiManager;
        this.currentTab = 'current';
        this.events = {};
    }
    
    init() {
        console.log("Inizializzazione gestore eventi e tornei");
        
        // Configura gli event listener per i tab
        this.setupTabEventListeners();
        
        // Configura il pulsante "crea torneo" (visibile solo per gli admin)
        this.setupCreateTournamentButton();
        
        // Configura il pulsante indietro
        this.setupBackButton();
        
        // Carica gli eventi per il tab corrente
        this.loadEvents(this.currentTab);
    }
    
    setupTabEventListeners() {
        // Seleziona tutti i tab
        const tabs = document.querySelectorAll('.events-tab');
        
        tabs.forEach(tab => {
            // Rimuovi eventuali listener precedenti
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // Aggiungi il nuovo listener
            newTab.addEventListener('click', () => {
                const type = newTab.getAttribute('data-type');
                
                // Rimuovi la classe active da tutti i tab
                tabs.forEach(t => t.classList.remove('active'));
                
                // Aggiungi la classe active al tab corrente
                newTab.classList.add('active');
                
                // Aggiorna il tab corrente
                this.currentTab = type;
                
                // Carica gli eventi per il tab selezionato
                this.loadEvents(type);
            });
        });
    }
    
    setupCreateTournamentButton() {
        // Seleziona il pulsante "crea torneo"
        const createTournamentBtn = document.querySelector('.create-tournament-btn');
        
        if (createTournamentBtn) {
            // Verifica se l'utente è un amministratore
            const isAdmin = this.authManager && this.authManager.isAdmin();
            
            // Mostra/nascondi il pulsante in base ai permessi
            createTournamentBtn.style.display = isAdmin ? 'block' : 'none';
            
            // Rimuovi eventuali listener precedenti
            const newButton = createTournamentBtn.cloneNode(true);
            createTournamentBtn.parentNode.replaceChild(newButton, createTournamentBtn);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                if (isAdmin) {
                    this.showCreateTournamentModal();
                } else {
                    this.uiManager.showNotification('Solo gli amministratori possono creare tornei', 'error');
                }
            });
        }
    }
    
    setupBackButton() {
        // Seleziona il pulsante indietro
        const backBtn = document.querySelector('#events-screen .back-btn');
        
        if (backBtn) {
            // Rimuovi eventuali listener precedenti
            const newButton = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newButton, backBtn);
            
            // Aggiungi il nuovo listener
            newButton.addEventListener('click', () => {
                // Torna al menu principale
                this.uiManager.showScreen('main-menu-screen');
            });
        }
    }
    
    loadEvents(type) {
        console.log(`Caricamento eventi di tipo: ${type}`);
        
        // Seleziona il container degli eventi
        const eventsList = document.querySelector('.events-list');
        
        if (!eventsList) {
            console.error('Container degli eventi non trovato');
            return;
        }
        
        // Pulisci il container
        eventsList.innerHTML = '';
        
        // Genera eventi di esempio in base al tipo
        const events = this.generateExampleEvents(type);
        
        // Salva gli eventi per riferimento futuro
        this.events[type] = events;
        
        if (events.length === 0) {
            // Nessun evento disponibile
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-events-message';
            noEventsMessage.textContent = 'Nessun evento disponibile';
            eventsList.appendChild(noEventsMessage);
            return;
        }
        
        // Crea gli elementi per ogni evento
        events.forEach(event => {
            const eventElement = this.createEventElement(event);
            eventsList.appendChild(eventElement);
        });
    }
    
    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'event-item';
        eventElement.dataset.eventId = event.id;
        
        // Crea il contenuto dell'evento
        eventElement.innerHTML = `
            <div class="event-header">
                <h3 class="event-name">${event.name}</h3>
                <span class="event-status ${event.status.toLowerCase().replace(/\s+/g, '-')}">${event.status}</span>
            </div>
            <div class="event-info">
                <div class="event-detail">
                    <span class="detail-label">Data:</span>
                    <span class="detail-value">${event.date}</span>
                </div>
                <div class="event-detail">
                    <span class="detail-label">Tipo:</span>
                    <span class="detail-value">${event.type}</span>
                </div>
                <div class="event-detail">
                    <span class="detail-label">Partecipanti:</span>
                    <span class="detail-value">${event.participants}/${event.maxParticipants}</span>
                </div>
            </div>
            <div class="event-description">
                <p>${event.description}</p>
            </div>
            <div class="event-actions">
                ${this.getEventActionButton(event)}
            </div>
        `;
        
        // Aggiungi event listener per il pulsante di azione
        const actionButton = eventElement.querySelector('.event-action-btn');
        if (actionButton) {
            actionButton.addEventListener('click', () => {
                this.handleEventAction(event, actionButton.getAttribute('data-action'));
            });
        }
        
        return eventElement;
    }
    
    getEventActionButton(event) {
        // Determina il tipo di pulsante in base allo stato dell'evento
        switch (event.status.toLowerCase()) {
            case 'in corso':
                return `<button class="event-action-btn" data-action="view" data-event-id="${event.id}">Visualizza</button>`;
            case 'in arrivo':
                return `<button class="event-action-btn" data-action="join" data-event-id="${event.id}">Partecipa</button>`;
            case 'completato':
                return `<button class="event-action-btn" data-action="results" data-event-id="${event.id}">Risultati</button>`;
            default:
                return '';
        }
    }
    
    handleEventAction(event, action) {
        console.log(`Azione ${action} per l'evento ${event.id}`);
        
        switch (action) {
            case 'view':
                this.viewEvent(event);
                break;
            case 'join':
                this.joinEvent(event);
                break;
            case 'results':
                this.showEventResults(event);
                break;
            default:
                console.error(`Azione non riconosciuta: ${action}`);
        }
    }
    
    viewEvent(event) {
        // Mostra la schermata di visualizzazione torneo
        this.uiManager.showScreen('tournament-view-screen', event);
    }
    
    joinEvent(event) {
        // Implementazione per partecipare all'evento
        this.uiManager.showNotification(`Hai partecipato all'evento: ${event.name}`, 'success');
        
        // Aggiorna il numero di partecipanti
        event.participants++;
        
        // Ricarica gli eventi per aggiornare la visualizzazione
        this.loadEvents(this.currentTab);
    }
    
    showEventResults(event) {
        // Mostra la schermata di visualizzazione torneo con i risultati
        this.uiManager.showScreen('tournament-view-screen', { ...event, showResults: true });
    }
    
    showCreateTournamentModal() {
        // Crea il modal se non esiste
        let modal = document.getElementById('create-tournament-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'create-tournament-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Crea un nuovo torneo</h3>
                    <div class="form-group">
                        <label for="tournament-name-input">Nome torneo</label>
                        <input type="text" id="tournament-name-input" class="form-control" placeholder="Nome torneo">
                    </div>
                    <div class="form-group">
                        <label for="tournament-date-input">Data</label>
                        <input type="date" id="tournament-date-input" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="tournament-type-select">Tipo</label>
                        <select id="tournament-type-select" class="form-control">
                            <option value="1v1">1v1</option>
                            <option value="2v2">2v2</option>
                            <option value="3v3">3v3</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="tournament-max-participants-input">Numero massimo di partecipanti</label>
                        <input type="number" id="tournament-max-participants-input" class="form-control" value="16" min="4" max="32">
                    </div>
                    <div class="form-group">
                        <label for="tournament-description-input">Descrizione</label>
                        <textarea id="tournament-description-input" class="form-control" placeholder="Descrizione del torneo"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button id="cancel-create-tournament-btn" class="btn btn-secondary">Annulla</button>
                        <button id="create-tournament-btn" class="btn btn-primary">Crea torneo</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Mostra il modal
        modal.style.display = 'flex';
        
        // Gestisci il pulsante di annulla
        const cancelButton = document.getElementById('cancel-create-tournament-btn');
        if (cancelButton) {
            cancelButton.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // Gestisci il pulsante di creazione
        const createButton = document.getElementById('create-tournament-btn');
        if (createButton) {
            createButton.onclick = () => {
                const name = document.getElementById('tournament-name-input').value;
                const date = document.getElementById('tournament-date-input').value;
                const type = document.getElementById('tournament-type-select').value;
                const maxParticipants = document.getElementById('tournament-max-participants-input').value;
                const description = document.getElementById('tournament-description-input').value;
                
                if (!name || !date) {
                    this.uiManager.showNotification('Nome e data sono obbligatori', 'error');
                    return;
                }
                
                // Crea il torneo
                this.createTournament({
                    name,
                    date,
                    type,
                    maxParticipants,
                    description
                });
                
                // Chiudi il modal
                modal.style.display = 'none';
            };
        }
    }
    
    createTournament(tournamentData) {
        // Implementazione per creare un nuovo torneo
        this.uiManager.showNotification(`Torneo creato: ${tournamentData.name}`, 'success');
        
        // Qui si dovrebbe inviare i dati al server
        
        // Ricarica gli eventi
        this.loadEvents(this.currentTab);
    }
    
    generateExampleEvents(type) {
        // Genera eventi di esempio in base al tipo
        const events = [];
        
        // Definisci lo stato in base al tipo
        let status;
        switch (type) {
            case 'current':
                status = 'In corso';
                break;
            case 'upcoming':
                status = 'In arrivo';
                break;
            case 'past':
                status = 'Completato';
                break;
            case 'my':
                // Per "I miei tornei", generiamo un mix di stati
                status = null;
                break;
            default:
                status = 'In corso';
        }
        
        // Genera 5 eventi casuali
        for (let i = 1; i <= 5; i++) {
            // Per "I miei tornei", alterna gli stati
            const eventStatus = status || (i % 3 === 0 ? 'Completato' : (i % 2 === 0 ? 'In arrivo' : 'In corso'));
            
            events.push({
                id: `event_${type}_${i}`,
                name: `Torneo ${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
                status: eventStatus,
                date: this.generateRandomDate(eventStatus),
                type: ['1v1', '2v2', '3v3'][Math.floor(Math.random() * 3)],
                participants: Math.floor(Math.random() * 10) + 5,
                maxParticipants: 16,
                description: `Descrizione del torneo ${i}. Partecipa e dimostra le tue abilità!`,
                bracket: this.generateRandomBracket(16),
                prize: `${Math.floor(Math.random() * 1000) + 500}€`,
                organizer: 'HaxBall League',
                location: 'Online'
            });
        }
        
        return events;
    }
    
    generateRandomDate(status) {
        const now = new Date();
        let date;
        
        switch (status.toLowerCase()) {
            case 'in corso':
                // Data odierna
                date = now;
                break;
            case 'in arrivo':
                // Data futura (1-30 giorni)
                date = new Date(now);
                date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 1);
                break;
            case 'completato':
                // Data passata (1-30 giorni)
                date = new Date(now);
                date.setDate(date.getDate() - Math.floor(Math.random() * 30) - 1);
                break;
            default:
                date = now;
        }
        
        // Formatta la data
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
    
    generateRandomBracket(numParticipants) {
        // Genera un bracket casuale per il torneo
        const bracket = {
            rounds: []
        };
        
        // Calcola il numero di round necessari
        const numRounds = Math.ceil(Math.log2(numParticipants));
        
        // Genera i round
        for (let i = 0; i < numRounds; i++) {
            const round = {
                name: i === numRounds - 1 ? 'Finale' : i === numRounds - 2 ? 'Semifinali' : i === numRounds - 3 ? 'Quarti di finale' : `Round ${i + 1}`,
                matches: []
            };
            
            // Calcola il numero di match per questo round
            const numMatches = Math.pow(2, numRounds - i - 1);
            
            // Genera i match
            for (let j = 0; j < numMatches; j++) {
                const match = {
                    id: `match_${i}_${j}`,
                    player1: i === 0 ? `Giocatore ${j * 2 + 1}` : null,
                    player2: i === 0 ? `Giocatore ${j * 2 + 2}` : null,
                    score1: null,
                    score2: null,
                    winner: null
                };
                
                // Per i round completati, genera risultati casuali
                if (i < 2) {
                    match.score1 = Math.floor(Math.random() * 5);
                    match.score2 = Math.floor(Math.random() * 5);
                    
                    // Assicurati che ci sia un vincitore
                    if (match.score1 === match.score2) {
                        match.score1++;
                    }
                    
                    match.winner = match.score1 > match.score2 ? match.player1 : match.player2;
                }
                
                round.matches.push(match);
            }
            
            bracket.rounds.push(round);
        }
        
        return bracket;
    }
    
    getEventById(eventId) {
        // Cerca l'evento in tutti i tab
        for (const type in this.events) {
            const event = this.events[type].find(e => e.id === eventId);
            if (event) {
                return event;
            }
        }
        
        // Se non trovato, genera un evento di esempio
        return {
            id: eventId,
            name: `Torneo ${eventId}`,
            status: 'In corso',
            date: this.generateRandomDate('In corso'),
            type: '3v3',
            participants: 12,
            maxParticipants: 16,
            description: 'Descrizione del torneo. Partecipa e dimostra le tue abilità!',
            bracket: this.generateRandomBracket(16),
            prize: '1000€',
            organizer: 'HaxBall League',
            location: 'Online'
        };
    }
    
    isAdmin() {
        // Verifica se l'utente è un amministratore
        return this.authManager && this.authManager.isAdmin();
    }
}
