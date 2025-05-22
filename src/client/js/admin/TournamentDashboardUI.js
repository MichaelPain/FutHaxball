/**
 * TournamentDashboardUI.js - Interfaccia utente per la dashboard dei tornei
 * 
 * Questo componente gestisce la visualizzazione della dashboard dei tornei
 * nel pannello di amministrazione, mostrando eventi, tornei e campionati.
 */

class TournamentDashboardUI {
  /**
   * Costruttore
   * @param {AdminUI} adminUI - Riferimento all'interfaccia amministrativa principale
   * @param {Object} managers - Oggetto contenente i manager necessari
   */
  constructor(adminUI, managers) {
    this.adminUI = adminUI;
    this.tournamentManager = managers.tournamentManager;
    this.eventManager = managers.eventManager;
    this.geoChampionshipManager = managers.geoChampionshipManager;
    this.uiManager = managers.uiManager;
    
    this.container = null;
    this.activeTab = 'events';
    this.filters = {
      events: {
        type: 'all',
        status: 'active'
      },
      tournaments: {
        format: 'all',
        mode: 'all',
        status: 'active'
      },
      championships: {
        type: 'all',
        region: 'all',
        season: 'current'
      }
    };
    
    this.events = [];
    this.tournaments = [];
    this.championships = [];
    
    this.initialize();
  }
  
  /**
   * Inizializza il componente
   */
  initialize() {
    // Crea i listener per gli eventi
    this.tournamentManager.on('tournament-created', this.refreshData.bind(this));
    this.tournamentManager.on('tournament-updated', this.refreshData.bind(this));
    this.tournamentManager.on('tournament-deleted', this.refreshData.bind(this));
    
    this.eventManager.on('event-created', this.refreshData.bind(this));
    this.eventManager.on('event-updated', this.refreshData.bind(this));
    
    this.geoChampionshipManager.on('championship-created', this.refreshData.bind(this));
    this.geoChampionshipManager.on('championship-updated', this.refreshData.bind(this));
  }
  
  /**
   * Renderizza la dashboard
   * @param {HTMLElement} container - Contenitore in cui renderizzare la dashboard
   */
  render(container) {
    this.container = container;
    this.container.innerHTML = '';
    
    // Crea la struttura della dashboard
    const dashboardHTML = `
      <div class="tournament-dashboard">
        <h2 class="dashboard-title">Dashboard Tornei</h2>
        
        <div class="dashboard-tabs">
          <button class="tab-button ${this.activeTab === 'events' ? 'active' : ''}" data-tab="events">Eventi</button>
          <button class="tab-button ${this.activeTab === 'tournaments' ? 'active' : ''}" data-tab="tournaments">Tornei</button>
          <button class="tab-button ${this.activeTab === 'championships' ? 'active' : ''}" data-tab="championships">Campionati</button>
        </div>
        
        <div class="dashboard-actions">
          <button class="action-button create-event">Crea Evento</button>
          <button class="action-button create-tournament">Crea Torneo</button>
          <button class="action-button create-championship">Crea Campionato</button>
        </div>
        
        <div class="dashboard-filters">
          ${this._renderFilters()}
        </div>
        
        <div class="dashboard-content">
          ${this._renderContent()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = dashboardHTML;
    
    // Aggiungi gli event listener
    this._attachEventListeners();
    
    // Carica i dati
    this.refreshData();
  }
  
  /**
   * Aggiorna i dati visualizzati
   */
  async refreshData() {
    try {
      // Carica i dati in base al tab attivo
      switch (this.activeTab) {
        case 'events':
          this.events = await this.eventManager.getEvents(this.filters.events);
          break;
        case 'tournaments':
          this.tournaments = await this.tournamentManager.getTournaments(this.filters.tournaments);
          break;
        case 'championships':
          this.championships = await this.geoChampionshipManager.getChampionships(this.filters.championships);
          break;
      }
      
      // Aggiorna solo il contenuto, non l'intera dashboard
      const contentContainer = this.container.querySelector('.dashboard-content');
      if (contentContainer) {
        contentContainer.innerHTML = this._renderContent();
        this._attachContentEventListeners();
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei dati:', error);
      this.uiManager.showNotification('Errore durante il caricamento dei dati', 'error');
    }
  }
  
  /**
   * Cambia il tab attivo
   * @param {String} tab - Tab da attivare
   */
  setActiveTab(tab) {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      
      // Aggiorna i tab button
      const tabButtons = this.container.querySelectorAll('.tab-button');
      tabButtons.forEach(button => {
        if (button.dataset.tab === tab) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
      
      // Aggiorna i filtri
      const filtersContainer = this.container.querySelector('.dashboard-filters');
      if (filtersContainer) {
        filtersContainer.innerHTML = this._renderFilters();
        this._attachFilterEventListeners();
      }
      
      // Carica i nuovi dati
      this.refreshData();
    }
  }
  
  /**
   * Aggiorna i filtri
   * @param {String} filterType - Tipo di filtro
   * @param {String} value - Valore del filtro
   */
  updateFilter(filterType, value) {
    this.filters[this.activeTab][filterType] = value;
    this.refreshData();
  }
  
  /**
   * Mostra il form per la creazione di un evento
   */
  showCreateEventForm() {
    this.adminUI.showCreateEventForm();
  }
  
  /**
   * Mostra il form per la creazione di un torneo
   */
  showCreateTournamentForm() {
    this.adminUI.showCreateTournamentForm();
  }
  
  /**
   * Mostra il form per la creazione di un campionato
   */
  showCreateChampionshipForm() {
    this.adminUI.showCreateChampionshipForm();
  }
  
  /**
   * Mostra i dettagli di un evento
   * @param {String} eventId - ID dell'evento
   */
  showEventDetails(eventId) {
    this.adminUI.showEventDetails(eventId);
  }
  
  /**
   * Mostra i dettagli di un torneo
   * @param {String} tournamentId - ID del torneo
   */
  showTournamentDetails(tournamentId) {
    this.adminUI.showTournamentDetails(tournamentId);
  }
  
  /**
   * Mostra i dettagli di un campionato
   * @param {String} championshipId - ID del campionato
   */
  showChampionshipDetails(championshipId) {
    this.adminUI.showChampionshipDetails(championshipId);
  }
  
  /**
   * Renderizza i filtri in base al tab attivo
   * @returns {String} HTML dei filtri
   * @private
   */
  _renderFilters() {
    switch (this.activeTab) {
      case 'events':
        return `
          <div class="filter-group">
            <label for="event-type-filter">Tipo:</label>
            <select id="event-type-filter">
              <option value="all" ${this.filters.events.type === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="weekly" ${this.filters.events.type === 'weekly' ? 'selected' : ''}>Settimanale</option>
              <option value="seasonal" ${this.filters.events.type === 'seasonal' ? 'selected' : ''}>Stagionale</option>
              <option value="special" ${this.filters.events.type === 'special' ? 'selected' : ''}>Speciale</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="event-status-filter">Stato:</label>
            <select id="event-status-filter">
              <option value="all" ${this.filters.events.status === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="active" ${this.filters.events.status === 'active' ? 'selected' : ''}>Attivi</option>
              <option value="upcoming" ${this.filters.events.status === 'upcoming' ? 'selected' : ''}>Imminenti</option>
              <option value="completed" ${this.filters.events.status === 'completed' ? 'selected' : ''}>Completati</option>
            </select>
          </div>
        `;
      
      case 'tournaments':
        return `
          <div class="filter-group">
            <label for="tournament-format-filter">Formato:</label>
            <select id="tournament-format-filter">
              <option value="all" ${this.filters.tournaments.format === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="single_elimination" ${this.filters.tournaments.format === 'single_elimination' ? 'selected' : ''}>Eliminazione Singola</option>
              <option value="double_elimination" ${this.filters.tournaments.format === 'double_elimination' ? 'selected' : ''}>Eliminazione Doppia</option>
              <option value="round_robin" ${this.filters.tournaments.format === 'round_robin' ? 'selected' : ''}>Round Robin</option>
              <option value="swiss" ${this.filters.tournaments.format === 'swiss' ? 'selected' : ''}>Swiss</option>
              <option value="multi_stage" ${this.filters.tournaments.format === 'multi_stage' ? 'selected' : ''}>Multi-Stage</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="tournament-mode-filter">Modalità:</label>
            <select id="tournament-mode-filter">
              <option value="all" ${this.filters.tournaments.mode === 'all' ? 'selected' : ''}>Tutte</option>
              <option value="1v1" ${this.filters.tournaments.mode === '1v1' ? 'selected' : ''}>1v1</option>
              <option value="2v2" ${this.filters.tournaments.mode === '2v2' ? 'selected' : ''}>2v2</option>
              <option value="3v3" ${this.filters.tournaments.mode === '3v3' ? 'selected' : ''}>3v3</option>
              <option value="custom" ${this.filters.tournaments.mode === 'custom' ? 'selected' : ''}>Personalizzata</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="tournament-status-filter">Stato:</label>
            <select id="tournament-status-filter">
              <option value="all" ${this.filters.tournaments.status === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="active" ${this.filters.tournaments.status === 'active' ? 'selected' : ''}>Attivi</option>
              <option value="upcoming" ${this.filters.tournaments.status === 'upcoming' ? 'selected' : ''}>Imminenti</option>
              <option value="completed" ${this.filters.tournaments.status === 'completed' ? 'selected' : ''}>Completati</option>
            </select>
          </div>
        `;
      
      case 'championships':
        return `
          <div class="filter-group">
            <label for="championship-type-filter">Tipo:</label>
            <select id="championship-type-filter">
              <option value="all" ${this.filters.championships.type === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="country" ${this.filters.championships.type === 'country' ? 'selected' : ''}>Nazionale</option>
              <option value="continent" ${this.filters.championships.type === 'continent' ? 'selected' : ''}>Continentale</option>
              <option value="international" ${this.filters.championships.type === 'international' ? 'selected' : ''}>Internazionale</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="championship-region-filter">Regione:</label>
            <select id="championship-region-filter">
              <option value="all" ${this.filters.championships.region === 'all' ? 'selected' : ''}>Tutte</option>
              <option value="europe" ${this.filters.championships.region === 'europe' ? 'selected' : ''}>Europa</option>
              <option value="north_america" ${this.filters.championships.region === 'north_america' ? 'selected' : ''}>Nord America</option>
              <option value="south_america" ${this.filters.championships.region === 'south_america' ? 'selected' : ''}>Sud America</option>
              <option value="asia" ${this.filters.championships.region === 'asia' ? 'selected' : ''}>Asia</option>
              <option value="africa" ${this.filters.championships.region === 'africa' ? 'selected' : ''}>Africa</option>
              <option value="oceania" ${this.filters.championships.region === 'oceania' ? 'selected' : ''}>Oceania</option>
            </select>
          </div>
          <div class="filter-group">
            <label for="championship-season-filter">Stagione:</label>
            <select id="championship-season-filter">
              <option value="all" ${this.filters.championships.season === 'all' ? 'selected' : ''}>Tutte</option>
              <option value="current" ${this.filters.championships.season === 'current' ? 'selected' : ''}>Corrente</option>
              <option value="previous" ${this.filters.championships.season === 'previous' ? 'selected' : ''}>Precedente</option>
            </select>
          </div>
        `;
      
      default:
        return '';
    }
  }
  
  /**
   * Renderizza il contenuto in base al tab attivo
   * @returns {String} HTML del contenuto
   * @private
   */
  _renderContent() {
    switch (this.activeTab) {
      case 'events':
        return this._renderEventsContent();
      
      case 'tournaments':
        return this._renderTournamentsContent();
      
      case 'championships':
        return this._renderChampionshipsContent();
      
      default:
        return '<p>Seleziona un tab per visualizzare i contenuti.</p>';
    }
  }
  
  /**
   * Renderizza il contenuto degli eventi
   * @returns {String} HTML del contenuto degli eventi
   * @private
   */
  _renderEventsContent() {
    if (this.events.length === 0) {
      return '<p class="no-data">Nessun evento trovato.</p>';
    }
    
    let html = '<div class="events-list">';
    
    this.events.forEach(event => {
      const startDate = new Date(event.startDate).toLocaleDateString();
      const endDate = event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A';
      
      html += `
        <div class="event-card" data-id="${event._id}">
          <div class="event-header">
            <h3 class="event-name">${event.name}</h3>
            <span class="event-type ${event.eventType}">${this._getEventTypeName(event.eventType)}</span>
          </div>
          <div class="event-info">
            <p><strong>Stato:</strong> ${this._getStatusName(event.status)}</p>
            <p><strong>Data inizio:</strong> ${startDate}</p>
            <p><strong>Data fine:</strong> ${endDate}</p>
            <p><strong>Partecipanti:</strong> ${event.participants ? event.participants.length : 0}</p>
          </div>
          <div class="event-actions">
            <button class="view-event" data-id="${event._id}">Visualizza</button>
            <button class="edit-event" data-id="${event._id}">Modifica</button>
            <button class="delete-event" data-id="${event._id}">Elimina</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza il contenuto dei tornei
   * @returns {String} HTML del contenuto dei tornei
   * @private
   */
  _renderTournamentsContent() {
    if (this.tournaments.length === 0) {
      return '<p class="no-data">Nessun torneo trovato.</p>';
    }
    
    let html = '<div class="tournaments-list">';
    
    this.tournaments.forEach(tournament => {
      const startDate = new Date(tournament.startDate).toLocaleDateString();
      const endDate = tournament.endDate ? new Date(tournament.endDate).toLocaleDateString() : 'N/A';
      
      html += `
        <div class="tournament-card" data-id="${tournament._id}">
          <div class="tournament-header">
            <h3 class="tournament-name">${tournament.name}</h3>
            <span class="tournament-format">${this._getFormatName(tournament.format)}</span>
          </div>
          <div class="tournament-info">
            <p><strong>Stato:</strong> ${this._getStatusName(tournament.status)}</p>
            <p><strong>Modalità:</strong> ${tournament.mode}</p>
            <p><strong>Data inizio:</strong> ${startDate}</p>
            <p><strong>Data fine:</strong> ${endDate}</p>
            <p><strong>Partecipanti:</strong> ${tournament.participants ? tournament.participants.length : 0}</p>
          </div>
          <div class="tournament-actions">
            <button class="view-tournament" data-id="${tournament._id}">Visualizza</button>
            <button class="edit-tournament" data-id="${tournament._id}">Modifica</button>
            <button class="delete-tournament" data-id="${tournament._id}">Elimina</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza il contenuto dei campionati
   * @returns {String} HTML del contenuto dei campionati
   * @private
   */
  _renderChampionshipsContent() {
    if (this.championships.length === 0) {
      return '<p class="no-data">Nessun campionato trovato.</p>';
    }
    
    let html = '<div class="championships-list">';
    
    this.championships.forEach(championship => {
      const startDate = new Date(championship.startDate).toLocaleDateString();
      const endDate = championship.endDate ? new Date(championship.endDate).toLocaleDateString() : 'N/A';
      
      html += `
        <div class="championship-card" data-id="${championship._id}">
          <div class="championship-header">
            <h3 class="championship-name">${championship.name}</h3>
            <span class="championship-type ${championship.type}">${this._getChampionshipTypeName(championship.type)}</span>
          </div>
          <div class="championship-info">
            <p><strong>Stagione:</strong> ${championship.season || 'N/A'} ${championship.year || ''}</p>
            <p><strong>Data inizio:</strong> ${startDate}</p>
            <p><strong>Data fine:</strong> ${endDate}</p>
            <p><strong>Tornei di qualificazione:</strong> ${championship.qualificationTournaments ? championship.qualificationTournaments.length : 0}</p>
          </div>
          <div class="championship-actions">
            <button class="view-championship" data-id="${championship._id}">Visualizza</button>
            <button class="edit-championship" data-id="${championship._id}">Modifica</button>
            <button class="delete-championship" data-id="${championship._id}">Elimina</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Aggiunge gli event listener
   * @private
   */
  _attachEventListeners() {
    // Tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.setActiveTab(button.dataset.tab);
      });
    });
    
    // Action buttons
    const createEventButton = this.container.querySelector('.create-event');
    if (createEventButton) {
      createEventButton.addEventListener('click', () => {
        this.showCreateEventForm();
      });
    }
    
    const createTournamentButton = this.container.querySelector('.create-tournament');
    if (createTournamentButton) {
      createTournamentButton.addEventListener('click', () => {
        this.showCreateTournamentForm();
      });
    }
    
    const createChampionshipButton = this.container.querySelector('.create-championship');
    if (createChampionshipButton) {
      createChampionshipButton.addEventListener('click', () => {
        this.showCreateChampionshipForm();
      });
    }
    
    // Filtri
    this._attachFilterEventListeners();
    
    // Contenuto
    this._attachContentEventListeners();
  }
  
  /**
   * Aggiunge gli event listener ai filtri
   * @private
   */
  _attachFilterEventListeners() {
    switch (this.activeTab) {
      case 'events':
        const eventTypeFilter = this.container.querySelector('#event-type-filter');
        if (eventTypeFilter) {
          eventTypeFilter.addEventListener('change', () => {
            this.updateFilter('type', eventTypeFilter.value);
          });
        }
        
        const eventStatusFilter = this.container.querySelector('#event-status-filter');
        if (eventStatusFilter) {
          eventStatusFilter.addEventListener('change', () => {
            this.updateFilter('status', eventStatusFilter.value);
          });
        }
        break;
      
      case 'tournaments':
        const tournamentFormatFilter = this.container.querySelector('#tournament-format-filter');
        if (tournamentFormatFilter) {
          tournamentFormatFilter.addEventListener('change', () => {
            this.updateFilter('format', tournamentFormatFilter.value);
          });
        }
        
        const tournamentModeFilter = this.container.querySelector('#tournament-mode-filter');
        if (tournamentModeFilter) {
          tournamentModeFilter.addEventListener('change', () => {
            this.updateFilter('mode', tournamentModeFilter.value);
          });
        }
        
        const tournamentStatusFilter = this.container.querySelector('#tournament-status-filter');
        if (tournamentStatusFilter) {
          tournamentStatusFilter.addEventListener('change', () => {
            this.updateFilter('status', tournamentStatusFilter.value);
          });
        }
        break;
      
      case 'championships':
        const championshipTypeFilter = this.container.querySelector('#championship-type-filter');
        if (championshipTypeFilter) {
          championshipTypeFilter.addEventListener('change', () => {
            this.updateFilter('type', championshipTypeFilter.value);
          });
        }
        
        const championshipRegionFilter = this.container.querySelector('#championship-region-filter');
        if (championshipRegionFilter) {
          championshipRegionFilter.addEventListener('change', () => {
            this.updateFilter('region', championshipRegionFilter.value);
          });
        }
        
        const championshipSeasonFilter = this.container.querySelector('#championship-season-filter');
        if (championshipSeasonFilter) {
          championshipSeasonFilter.addEventListener('change', () => {
            this.updateFilter('season', championshipSeasonFilter.value);
          });
        }
        break;
    }
  }
  
  /**
   * Aggiunge gli event listener al contenuto
   * @private
   */
  _attachContentEventListeners() {
    switch (this.activeTab) {
      case 'events':
        const viewEventButtons = this.container.querySelectorAll('.view-event');
        viewEventButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.showEventDetails(button.dataset.id);
          });
        });
        
        const editEventButtons = this.container.querySelectorAll('.edit-event');
        editEventButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showEditEventForm(button.dataset.id);
          });
        });
        
        const deleteEventButtons = this.container.querySelectorAll('.delete-event');
        deleteEventButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showDeleteEventConfirmation(button.dataset.id);
          });
        });
        break;
      
      case 'tournaments':
        const viewTournamentButtons = this.container.querySelectorAll('.view-tournament');
        viewTournamentButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.showTournamentDetails(button.dataset.id);
          });
        });
        
        const editTournamentButtons = this.container.querySelectorAll('.edit-tournament');
        editTournamentButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showEditTournamentForm(button.dataset.id);
          });
        });
        
        const deleteTournamentButtons = this.container.querySelectorAll('.delete-tournament');
        deleteTournamentButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showDeleteTournamentConfirmation(button.dataset.id);
          });
        });
        break;
      
      case 'championships':
        const viewChampionshipButtons = this.container.querySelectorAll('.view-championship');
        viewChampionshipButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.showChampionshipDetails(button.dataset.id);
          });
        });
        
        const editChampionshipButtons = this.container.querySelectorAll('.edit-championship');
        editChampionshipButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showEditChampionshipForm(button.dataset.id);
          });
        });
        
        const deleteChampionshipButtons = this.container.querySelectorAll('.delete-championship');
        deleteChampionshipButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.adminUI.showDeleteChampionshipConfirmation(button.dataset.id);
          });
        });
        break;
    }
  }
  
  /**
   * Ottiene il nome del tipo di evento
   * @param {String} type - Tipo di evento
   * @returns {String} Nome del tipo di evento
   * @private
   */
  _getEventTypeName(type) {
    switch (type) {
      case 'weekly':
        return 'Settimanale';
      case 'seasonal':
        return 'Stagionale';
      case 'special':
        return 'Speciale';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome del formato di torneo
   * @param {String} format - Formato di torneo
   * @returns {String} Nome del formato di torneo
   * @private
   */
  _getFormatName(format) {
    switch (format) {
      case 'single_elimination':
        return 'Eliminazione Singola';
      case 'double_elimination':
        return 'Eliminazione Doppia';
      case 'round_robin':
        return 'Round Robin';
      case 'swiss':
        return 'Swiss';
      case 'multi_stage':
        return 'Multi-Stage';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome del tipo di campionato
   * @param {String} type - Tipo di campionato
   * @returns {String} Nome del tipo di campionato
   * @private
   */
  _getChampionshipTypeName(type) {
    switch (type) {
      case 'country':
        return 'Nazionale';
      case 'continent':
        return 'Continentale';
      case 'international':
        return 'Internazionale';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome dello stato
   * @param {String} status - Stato
   * @returns {String} Nome dello stato
   * @private
   */
  _getStatusName(status) {
    switch (status) {
      case 'draft':
        return 'Bozza';
      case 'registration':
        return 'Registrazione';
      case 'upcoming':
        return 'Imminente';
      case 'active':
        return 'Attivo';
      case 'completed':
        return 'Completato';
      case 'cancelled':
        return 'Annullato';
      default:
        return 'Sconosciuto';
    }
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TournamentDashboardUI;
} else {
  window.TournamentDashboardUI = TournamentDashboardUI;
}
