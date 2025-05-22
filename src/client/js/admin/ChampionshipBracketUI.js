/**
 * ChampionshipBracketUI.js - Interfaccia utente per la visualizzazione dei bracket dei campionati
 * 
 * Questo componente gestisce la visualizzazione grafica dei bracket dei campionati,
 * inclusi i percorsi di qualificazione tra campionati nazionali, continentali e internazionali.
 */

class ChampionshipBracketUI {
  /**
   * Costruttore
   * @param {AdminUI} adminUI - Riferimento all'interfaccia amministrativa principale
   * @param {Object} managers - Oggetto contenente i manager necessari
   */
  constructor(adminUI, managers) {
    this.adminUI = adminUI;
    this.geoChampionshipManager = managers.geoChampionshipManager;
    this.tournamentManager = managers.tournamentManager;
    this.uiManager = managers.uiManager;
    
    this.container = null;
    this.championship = null;
    this.tournament = null;
    this.qualificationTournaments = [];
    this.nextStageChampionship = null;
    
    this.viewMode = 'bracket'; // 'bracket', 'qualification', 'hierarchy'
  }
  
  /**
   * Renderizza il bracket del campionato
   * @param {HTMLElement} container - Contenitore in cui renderizzare il bracket
   * @param {String} championshipId - ID del campionato
   */
  async render(container, championshipId) {
    this.container = container;
    
    // Mostra un loader mentre carica i dati
    this.container.innerHTML = '<div class="loading-spinner">Caricamento...</div>';
    
    try {
      // Carica i dati del campionato
      await this.loadChampionshipData(championshipId);
      
      // Renderizza l'interfaccia
      this._renderInterface();
      
      // Aggiungi gli event listener
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante il caricamento del bracket del campionato:', error);
      this.container.innerHTML = `
        <div class="error-message">
          <h3>Errore</h3>
          <p>Si è verificato un errore durante il caricamento del bracket del campionato.</p>
          <button class="retry-button">Riprova</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.render(this.container, championshipId);
        });
      }
    }
  }
  
  /**
   * Carica i dati del campionato
   * @param {String} championshipId - ID del campionato
   */
  async loadChampionshipData(championshipId) {
    // Carica i dettagli del campionato
    const response = await this.geoChampionshipManager.getChampionshipDetails(championshipId);
    this.championship = response.championship;
    this.tournament = response.tournament;
    
    // Carica i tornei di qualificazione
    if (this.championship.qualificationTournaments && this.championship.qualificationTournaments.length > 0) {
      const promises = this.championship.qualificationTournaments.map(qt => 
        this.tournamentManager.getTournamentDetails(qt.tournamentId)
      );
      
      this.qualificationTournaments = await Promise.all(promises);
    }
    
    // Carica il campionato di fase successiva
    if (this.championship.nextStageChampionship) {
      const nextStageResponse = await this.geoChampionshipManager.getChampionshipDetails(this.championship.nextStageChampionship);
      this.nextStageChampionship = nextStageResponse.championship;
    }
  }
  
  /**
   * Cambia la modalità di visualizzazione
   * @param {String} mode - Modalità di visualizzazione ('bracket', 'qualification', 'hierarchy')
   */
  setViewMode(mode) {
    if (this.viewMode !== mode) {
      this.viewMode = mode;
      
      // Aggiorna i pulsanti di modalità
      const modeButtons = this.container.querySelectorAll('.view-mode-button');
      modeButtons.forEach(button => {
        if (button.dataset.mode === mode) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
      
      // Aggiorna il contenuto
      const contentContainer = this.container.querySelector('.bracket-content');
      if (contentContainer) {
        switch (mode) {
          case 'bracket':
            contentContainer.innerHTML = this._renderBracketView();
            break;
          case 'qualification':
            contentContainer.innerHTML = this._renderQualificationView();
            break;
          case 'hierarchy':
            contentContainer.innerHTML = this._renderHierarchyView();
            break;
        }
      }
      
      // Aggiungi gli event listener specifici per la modalità
      this._attachModeSpecificEventListeners();
    }
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
   * Renderizza l'interfaccia
   * @private
   */
  _renderInterface() {
    if (!this.championship || !this.tournament) {
      this.container.innerHTML = '<p class="error-message">Campionato non trovato.</p>';
      return;
    }
    
    const bracketHTML = `
      <div class="championship-bracket">
        <div class="bracket-header">
          <h2 class="championship-name">${this.championship.name}</h2>
          <span class="championship-type ${this.championship.type}">${this._getChampionshipTypeName(this.championship.type)}</span>
          <span class="championship-season">${this.championship.season || ''} ${this.championship.year || ''}</span>
        </div>
        
        <div class="bracket-actions">
          <div class="view-mode-buttons">
            <button class="view-mode-button ${this.viewMode === 'bracket' ? 'active' : ''}" data-mode="bracket">Bracket</button>
            <button class="view-mode-button ${this.viewMode === 'qualification' ? 'active' : ''}" data-mode="qualification">Qualificazioni</button>
            <button class="view-mode-button ${this.viewMode === 'hierarchy' ? 'active' : ''}" data-mode="hierarchy">Gerarchia</button>
          </div>
          
          <div class="bracket-controls">
            <button class="edit-championship-button">Modifica Campionato</button>
            <button class="add-qualification-button">Aggiungi Qualificazione</button>
            ${this.championship.type !== 'international' ? `<button class="set-next-stage-button">Imposta Fase Successiva</button>` : ''}
          </div>
        </div>
        
        <div class="bracket-content">
          ${this._renderBracketView()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = bracketHTML;
  }
  
  /**
   * Renderizza la vista del bracket
   * @returns {String} HTML della vista del bracket
   * @private
   */
  _renderBracketView() {
    // Verifica se il torneo ha un bracket
    if (!this.tournament.stages || this.tournament.stages.length === 0) {
      return `
        <div class="bracket-empty">
          <p>Questo campionato non ha ancora un bracket generato.</p>
          <button class="generate-bracket-button">Genera Bracket</button>
        </div>
      `;
    }
    
    // Ottieni le fasi del torneo
    const stages = this.tournament.stages.sort((a, b) => a.order - b.order);
    
    let html = `
      <div class="tournament-bracket">
        <div class="bracket-stages-nav">
          ${stages.map((stage, index) => `
            <button class="stage-button ${index === 0 ? 'active' : ''}" data-stage-id="${stage._id}">
              ${stage.name || `Fase ${stage.order}`}
            </button>
          `).join('')}
        </div>
        
        <div class="bracket-stages-content">
          ${this._renderStageContent(stages[0])}
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Renderizza il contenuto di una fase
   * @param {Object} stage - Fase del torneo
   * @returns {String} HTML del contenuto della fase
   * @private
   */
  _renderStageContent(stage) {
    if (!stage.matches || stage.matches.length === 0) {
      return `
        <div class="stage-empty">
          <p>Questa fase non ha ancora partite generate.</p>
          <button class="generate-matches-button" data-stage-id="${stage._id}">Genera Partite</button>
        </div>
      `;
    }
    
    // Raggruppa le partite per round
    const matchesByRound = {};
    stage.matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
    
    // Ordina i round
    const rounds = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b));
    
    let html = '<div class="bracket-rounds">';
    
    rounds.forEach(round => {
      const matches = matchesByRound[round].sort((a, b) => a.matchNumber - b.matchNumber);
      
      html += `
        <div class="bracket-round">
          <div class="round-header">Round ${round}</div>
          <div class="round-matches">
            ${matches.map(match => this._renderMatch(match)).join('')}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza una partita
   * @param {Object} match - Partita
   * @returns {String} HTML della partita
   * @private
   */
  _renderMatch(match) {
    const participant1 = match.participants && match.participants[0] ? this._getParticipantName(match.participants[0]) : 'TBD';
    const participant2 = match.participants && match.participants[1] ? this._getParticipantName(match.participants[1]) : 'TBD';
    
    const score1 = match.scores && match.scores[0] !== undefined ? match.scores[0] : '-';
    const score2 = match.scores && match.scores[1] !== undefined ? match.scores[1] : '-';
    
    const matchStatus = this._getMatchStatusName(match.status);
    const matchTime = match.scheduledTime ? new Date(match.scheduledTime).toLocaleString() : 'Non programmata';
    
    return `
      <div class="bracket-match" data-match-id="${match._id}">
        <div class="match-header">
          <span class="match-number">Partita ${match.matchNumber}</span>
          <span class="match-status ${match.status}">${matchStatus}</span>
        </div>
        
        <div class="match-participants">
          <div class="match-participant ${match.winner === match.participants[0] ? 'winner' : ''}">
            <span class="participant-name">${participant1}</span>
            <span class="participant-score">${score1}</span>
          </div>
          <div class="match-participant ${match.winner === match.participants[1] ? 'winner' : ''}">
            <span class="participant-name">${participant2}</span>
            <span class="participant-score">${score2}</span>
          </div>
        </div>
        
        <div class="match-footer">
          <span class="match-time">${matchTime}</span>
          <div class="match-actions">
            <button class="edit-match-button" data-match-id="${match._id}">Modifica</button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Renderizza la vista delle qualificazioni
   * @returns {String} HTML della vista delle qualificazioni
   * @private
   */
  _renderQualificationView() {
    if (!this.qualificationTournaments || this.qualificationTournaments.length === 0) {
      return `
        <div class="qualification-empty">
          <p>Questo campionato non ha tornei di qualificazione.</p>
          <button class="add-qualification-button">Aggiungi Torneo di Qualificazione</button>
        </div>
      `;
    }
    
    let html = `
      <div class="qualification-tournaments">
        <h3>Tornei di Qualificazione</h3>
        <div class="qualification-list">
    `;
    
    this.qualificationTournaments.forEach(tournament => {
      const qualificationInfo = this.championship.qualificationTournaments.find(qt => qt.tournamentId === tournament._id);
      const spots = qualificationInfo ? qualificationInfo.qualificationSpots : 0;
      
      html += `
        <div class="qualification-tournament" data-id="${tournament._id}">
          <div class="tournament-header">
            <h4 class="tournament-name">${tournament.name}</h4>
            <span class="tournament-format">${this._getFormatName(tournament.format)}</span>
          </div>
          <div class="tournament-info">
            <p><strong>Stato:</strong> ${this._getStatusName(tournament.status)}</p>
            <p><strong>Modalità:</strong> ${tournament.mode}</p>
            <p><strong>Posti qualificazione:</strong> ${spots}</p>
          </div>
          <div class="tournament-actions">
            <button class="view-tournament" data-id="${tournament._id}">Visualizza</button>
            <button class="remove-qualification" data-id="${tournament._id}">Rimuovi</button>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
        <div class="qualification-actions">
          <button class="add-qualification-button">Aggiungi Torneo di Qualificazione</button>
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Renderizza la vista della gerarchia
   * @returns {String} HTML della vista della gerarchia
   * @private
   */
  _renderHierarchyView() {
    let html = `
      <div class="championship-hierarchy">
        <h3>Gerarchia dei Campionati</h3>
    `;
    
    // Visualizza la gerarchia in base al tipo di campionato
    switch (this.championship.type) {
      case 'country':
        html += this._renderCountryHierarchy();
        break;
      case 'continent':
        html += this._renderContinentHierarchy();
        break;
      case 'international':
        html += this._renderInternationalHierarchy();
        break;
    }
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza la gerarchia di un campionato nazionale
   * @returns {String} HTML della gerarchia
   * @private
   */
  _renderCountryHierarchy() {
    const countryName = this.championship.countries && this.championship.countries.length > 0 
      ? this._getCountryName(this.championship.countries[0]) 
      : 'Sconosciuto';
    
    let html = `
      <div class="hierarchy-diagram">
        <div class="hierarchy-level">
          <div class="hierarchy-node current">
            <div class="node-content">
              <h4>${this.championship.name}</h4>
              <p>Campionato Nazionale</p>
              <p>${countryName}</p>
            </div>
          </div>
        </div>
    `;
    
    // Aggiungi il livello successivo se presente
    if (this.nextStageChampionship) {
      html += `
        <div class="hierarchy-arrow">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Qualificazione</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node next-stage" data-id="${this.nextStageChampionship._id}">
            <div class="node-content">
              <h4>${this.nextStageChampionship.name}</h4>
              <p>${this._getChampionshipTypeName(this.nextStageChampionship.type)}</p>
              ${this.nextStageChampionship.continent ? `<p>${this._getContinentName(this.nextStageChampionship.continent)}</p>` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="hierarchy-arrow dashed">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Nessuna qualificazione impostata</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node empty">
            <div class="node-content">
              <p>Imposta un campionato di fase successiva</p>
              <button class="set-next-stage-button">Imposta</button>
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza la gerarchia di un campionato continentale
   * @returns {String} HTML della gerarchia
   * @private
   */
  _renderContinentHierarchy() {
    const continentName = this.championship.continent 
      ? this._getContinentName(this.championship.continent) 
      : 'Sconosciuto';
    
    let html = `
      <div class="hierarchy-diagram">
        <div class="hierarchy-level">
          <div class="hierarchy-node previous-stage multiple">
            <div class="node-content">
              <h4>Campionati Nazionali</h4>
              <p>Qualificazioni da campionati nazionali</p>
              <button class="view-qualifications-button">Visualizza</button>
            </div>
          </div>
        </div>
        
        <div class="hierarchy-arrow">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Qualificazione</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node current">
            <div class="node-content">
              <h4>${this.championship.name}</h4>
              <p>Campionato Continentale</p>
              <p>${continentName}</p>
            </div>
          </div>
        </div>
    `;
    
    // Aggiungi il livello successivo se presente
    if (this.nextStageChampionship) {
      html += `
        <div class="hierarchy-arrow">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Qualificazione</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node next-stage" data-id="${this.nextStageChampionship._id}">
            <div class="node-content">
              <h4>${this.nextStageChampionship.name}</h4>
              <p>${this._getChampionshipTypeName(this.nextStageChampionship.type)}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="hierarchy-arrow dashed">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Nessuna qualificazione impostata</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node empty">
            <div class="node-content">
              <p>Imposta un campionato di fase successiva</p>
              <button class="set-next-stage-button">Imposta</button>
            </div>
          </div>
        </div>
      `;
    }
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza la gerarchia di un campionato internazionale
   * @returns {String} HTML della gerarchia
   * @private
   */
  _renderInternationalHierarchy() {
    let html = `
      <div class="hierarchy-diagram">
        <div class="hierarchy-level">
          <div class="hierarchy-node previous-stage multiple">
            <div class="node-content">
              <h4>Campionati Continentali</h4>
              <p>Qualificazioni da campionati continentali</p>
              <button class="view-qualifications-button">Visualizza</button>
            </div>
          </div>
        </div>
        
        <div class="hierarchy-arrow">
          <i class="arrow-icon">→</i>
          <span class="arrow-label">Qualificazione</span>
        </div>
        
        <div class="hierarchy-level">
          <div class="hierarchy-node current">
            <div class="node-content">
              <h4>${this.championship.name}</h4>
              <p>Campionato Internazionale</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Mostra il form per l'aggiunta di un torneo di qualificazione
   */
  showAddQualificationForm() {
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Aggiungi Torneo di Qualificazione</h3>
          
          <form id="add-qualification-form">
            <div class="form-group">
              <label for="tournament-select">Torneo:</label>
              <select id="tournament-select" required>
                <option value="">Seleziona un torneo</option>
                <!-- I tornei verranno caricati dinamicamente -->
              </select>
            </div>
            
            <div class="form-group">
              <label for="spots-input">Posti di qualificazione:</label>
              <input type="number" id="spots-input" min="1" value="1" required>
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button">Annulla</button>
              <button type="submit" class="submit-button">Aggiungi</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Aggiungi il form al DOM
    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHTML;
    document.body.appendChild(formContainer.firstElementChild);
    
    // Carica i tornei disponibili
    this._loadAvailableTournaments();
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('add-qualification-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const tournamentId = document.getElementById('tournament-select').value;
      const spots = document.getElementById('spots-input').value;
      
      if (!tournamentId) {
        this.uiManager.showNotification('Seleziona un torneo', 'error');
        return;
      }
      
      try {
        await this.geoChampionshipManager.addQualificationTournament(this.championship._id, tournamentId, spots);
        this.uiManager.showNotification('Torneo di qualificazione aggiunto con successo', 'success');
        modal.remove();
        
        // Ricarica i dati del campionato
        await this.loadChampionshipData(this.championship._id);
        
        // Aggiorna la vista
        if (this.viewMode === 'qualification') {
          const contentContainer = this.container.querySelector('.bracket-content');
          if (contentContainer) {
            contentContainer.innerHTML = this._renderQualificationView();
            this._attachModeSpecificEventListeners();
          }
        }
      } catch (error) {
        console.error('Errore durante l\'aggiunta del torneo di qualificazione:', error);
        this.uiManager.showNotification('Errore durante l\'aggiunta del torneo di qualificazione', 'error');
      }
    });
  }
  
  /**
   * Mostra il form per l'impostazione del campionato di fase successiva
   */
  showSetNextStageForm() {
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Imposta Campionato di Fase Successiva</h3>
          
          <form id="set-next-stage-form">
            <div class="form-group">
              <label for="championship-select">Campionato:</label>
              <select id="championship-select" required>
                <option value="">Seleziona un campionato</option>
                <!-- I campionati verranno caricati dinamicamente -->
              </select>
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button">Annulla</button>
              <button type="submit" class="submit-button">Imposta</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Aggiungi il form al DOM
    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHTML;
    document.body.appendChild(formContainer.firstElementChild);
    
    // Carica i campionati disponibili
    this._loadAvailableChampionships();
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('set-next-stage-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const championshipId = document.getElementById('championship-select').value;
      
      if (!championshipId) {
        this.uiManager.showNotification('Seleziona un campionato', 'error');
        return;
      }
      
      try {
        await this.geoChampionshipManager.setNextStageChampionship(this.championship._id, championshipId);
        this.uiManager.showNotification('Campionato di fase successiva impostato con successo', 'success');
        modal.remove();
        
        // Ricarica i dati del campionato
        await this.loadChampionshipData(this.championship._id);
        
        // Aggiorna la vista
        if (this.viewMode === 'hierarchy') {
          const contentContainer = this.container.querySelector('.bracket-content');
          if (contentContainer) {
            contentContainer.innerHTML = this._renderHierarchyView();
            this._attachModeSpecificEventListeners();
          }
        }
      } catch (error) {
        console.error('Errore durante l\'impostazione del campionato di fase successiva:', error);
        this.uiManager.showNotification('Errore durante l\'impostazione del campionato di fase successiva', 'error');
      }
    });
  }
  
  /**
   * Carica i tornei disponibili per la qualificazione
   * @private
   */
  async _loadAvailableTournaments() {
    try {
      const tournaments = await this.tournamentManager.getTournaments({ 
        status: 'active,upcoming,registration',
        type: 'tournament'
      });
      
      const select = document.getElementById('tournament-select');
      if (select) {
        // Filtra i tornei già utilizzati come qualificazione
        const usedTournamentIds = this.championship.qualificationTournaments.map(qt => qt.tournamentId);
        const availableTournaments = tournaments.filter(t => !usedTournamentIds.includes(t._id));
        
        // Aggiungi le opzioni
        availableTournaments.forEach(tournament => {
          const option = document.createElement('option');
          option.value = tournament._id;
          option.textContent = tournament.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei tornei disponibili:', error);
      this.uiManager.showNotification('Errore durante il caricamento dei tornei disponibili', 'error');
    }
  }
  
  /**
   * Carica i campionati disponibili per la fase successiva
   * @private
   */
  async _loadAvailableChampionships() {
    try {
      let type;
      
      // Determina il tipo di campionato da cercare in base al tipo corrente
      switch (this.championship.type) {
        case 'country':
          type = 'continent,international';
          break;
        case 'continent':
          type = 'international';
          break;
        default:
          this.uiManager.showNotification('Questo tipo di campionato non può avere una fase successiva', 'error');
          return;
      }
      
      const championships = await this.geoChampionshipManager.getChampionships({ type });
      
      const select = document.getElementById('championship-select');
      if (select) {
        // Filtra il campionato corrente
        const availableChampionships = championships.filter(c => c._id !== this.championship._id);
        
        // Aggiungi le opzioni
        availableChampionships.forEach(championship => {
          const option = document.createElement('option');
          option.value = championship._id;
          option.textContent = championship.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei campionati disponibili:', error);
      this.uiManager.showNotification('Errore durante il caricamento dei campionati disponibili', 'error');
    }
  }
  
  /**
   * Aggiunge gli event listener
   * @private
   */
  _attachEventListeners() {
    // Pulsanti di modalità
    const modeButtons = this.container.querySelectorAll('.view-mode-button');
    modeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.setViewMode(button.dataset.mode);
      });
    });
    
    // Pulsanti di azione
    const editButton = this.container.querySelector('.edit-championship-button');
    if (editButton) {
      editButton.addEventListener('click', () => {
        this.adminUI.showEditChampionshipForm(this.championship._id);
      });
    }
    
    const addQualificationButton = this.container.querySelector('.add-qualification-button');
    if (addQualificationButton) {
      addQualificationButton.addEventListener('click', () => {
        this.showAddQualificationForm();
      });
    }
    
    const setNextStageButton = this.container.querySelector('.set-next-stage-button');
    if (setNextStageButton) {
      setNextStageButton.addEventListener('click', () => {
        this.showSetNextStageForm();
      });
    }
    
    // Aggiungi gli event listener specifici per la modalità
    this._attachModeSpecificEventListeners();
  }
  
  /**
   * Aggiunge gli event listener specifici per la modalità
   * @private
   */
  _attachModeSpecificEventListeners() {
    switch (this.viewMode) {
      case 'bracket':
        // Pulsanti delle fasi
        const stageButtons = this.container.querySelectorAll('.stage-button');
        stageButtons.forEach(button => {
          button.addEventListener('click', () => {
            // Aggiorna il pulsante attivo
            stageButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Trova la fase corrispondente
            const stageId = button.dataset.stageId;
            const stage = this.tournament.stages.find(s => s._id === stageId);
            
            // Aggiorna il contenuto
            const contentContainer = this.container.querySelector('.bracket-stages-content');
            if (contentContainer && stage) {
              contentContainer.innerHTML = this._renderStageContent(stage);
            }
          });
        });
        
        // Pulsante per generare il bracket
        const generateBracketButton = this.container.querySelector('.generate-bracket-button');
        if (generateBracketButton) {
          generateBracketButton.addEventListener('click', async () => {
            try {
              await this.tournamentManager.generateBracket(this.tournament._id);
              this.uiManager.showNotification('Bracket generato con successo', 'success');
              
              // Ricarica i dati del campionato
              await this.loadChampionshipData(this.championship._id);
              
              // Aggiorna la vista
              const contentContainer = this.container.querySelector('.bracket-content');
              if (contentContainer) {
                contentContainer.innerHTML = this._renderBracketView();
                this._attachModeSpecificEventListeners();
              }
            } catch (error) {
              console.error('Errore durante la generazione del bracket:', error);
              this.uiManager.showNotification('Errore durante la generazione del bracket', 'error');
            }
          });
        }
        
        // Pulsanti per generare le partite
        const generateMatchesButtons = this.container.querySelectorAll('.generate-matches-button');
        generateMatchesButtons.forEach(button => {
          button.addEventListener('click', async () => {
            const stageId = button.dataset.stageId;
            
            try {
              await this.tournamentManager.generateMatches(this.tournament._id, stageId);
              this.uiManager.showNotification('Partite generate con successo', 'success');
              
              // Ricarica i dati del campionato
              await this.loadChampionshipData(this.championship._id);
              
              // Aggiorna la vista
              const contentContainer = this.container.querySelector('.bracket-content');
              if (contentContainer) {
                contentContainer.innerHTML = this._renderBracketView();
                this._attachModeSpecificEventListeners();
              }
            } catch (error) {
              console.error('Errore durante la generazione delle partite:', error);
              this.uiManager.showNotification('Errore durante la generazione delle partite', 'error');
            }
          });
        });
        
        // Pulsanti per modificare le partite
        const editMatchButtons = this.container.querySelectorAll('.edit-match-button');
        editMatchButtons.forEach(button => {
          button.addEventListener('click', () => {
            const matchId = button.dataset.matchId;
            this.adminUI.showEditMatchForm(this.tournament._id, matchId);
          });
        });
        break;
        
      case 'qualification':
        // Pulsanti per visualizzare i tornei
        const viewTournamentButtons = this.container.querySelectorAll('.view-tournament');
        viewTournamentButtons.forEach(button => {
          button.addEventListener('click', () => {
            const tournamentId = button.dataset.id;
            this.showTournamentDetails(tournamentId);
          });
        });
        
        // Pulsanti per rimuovere i tornei di qualificazione
        const removeQualificationButtons = this.container.querySelectorAll('.remove-qualification');
        removeQualificationButtons.forEach(button => {
          button.addEventListener('click', async () => {
            const tournamentId = button.dataset.id;
            
            if (confirm('Sei sicuro di voler rimuovere questo torneo di qualificazione?')) {
              try {
                await this.geoChampionshipManager.removeQualificationTournament(this.championship._id, tournamentId);
                this.uiManager.showNotification('Torneo di qualificazione rimosso con successo', 'success');
                
                // Ricarica i dati del campionato
                await this.loadChampionshipData(this.championship._id);
                
                // Aggiorna la vista
                const contentContainer = this.container.querySelector('.bracket-content');
                if (contentContainer) {
                  contentContainer.innerHTML = this._renderQualificationView();
                  this._attachModeSpecificEventListeners();
                }
              } catch (error) {
                console.error('Errore durante la rimozione del torneo di qualificazione:', error);
                this.uiManager.showNotification('Errore durante la rimozione del torneo di qualificazione', 'error');
              }
            }
          });
        });
        break;
        
      case 'hierarchy':
        // Pulsante per visualizzare il campionato di fase successiva
        const nextStageNodes = this.container.querySelectorAll('.hierarchy-node.next-stage');
        nextStageNodes.forEach(node => {
          node.addEventListener('click', () => {
            const championshipId = node.dataset.id;
            this.showChampionshipDetails(championshipId);
          });
        });
        
        // Pulsante per visualizzare le qualificazioni
        const viewQualificationsButtons = this.container.querySelectorAll('.view-qualifications-button');
        viewQualificationsButtons.forEach(button => {
          button.addEventListener('click', () => {
            this.setViewMode('qualification');
          });
        });
        break;
    }
  }
  
  /**
   * Ottiene il nome di un partecipante
   * @param {String} participantId - ID del partecipante
   * @returns {String} Nome del partecipante
   * @private
   */
  _getParticipantName(participantId) {
    // Cerca il partecipante tra i partecipanti del torneo
    const participant = this.tournament.participants.find(p => p.userId._id === participantId);
    
    if (participant && participant.userId) {
      return participant.userId.nickname;
    }
    
    return 'Sconosciuto';
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
        return 'Campionato Nazionale';
      case 'continent':
        return 'Campionato Continentale';
      case 'international':
        return 'Campionato Internazionale';
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
  
  /**
   * Ottiene il nome dello stato di una partita
   * @param {String} status - Stato della partita
   * @returns {String} Nome dello stato della partita
   * @private
   */
  _getMatchStatusName(status) {
    switch (status) {
      case 'pending':
        return 'In attesa';
      case 'scheduled':
        return 'Programmata';
      case 'in_progress':
        return 'In corso';
      case 'completed':
        return 'Completata';
      case 'cancelled':
        return 'Annullata';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome di un paese
   * @param {String} countryCode - Codice del paese
   * @returns {String} Nome del paese
   * @private
   */
  _getCountryName(countryCode) {
    // Implementazione semplificata, in un'applicazione reale si utilizzerebbe una libreria di localizzazione
    const countries = {
      'IT': 'Italia',
      'FR': 'Francia',
      'DE': 'Germania',
      'ES': 'Spagna',
      'UK': 'Regno Unito',
      'US': 'Stati Uniti',
      // Aggiungi altri paesi secondo necessità
    };
    
    return countries[countryCode] || countryCode;
  }
  
  /**
   * Ottiene il nome di un continente
   * @param {String} continent - Codice del continente
   * @returns {String} Nome del continente
   * @private
   */
  _getContinentName(continent) {
    switch (continent) {
      case 'europe':
        return 'Europa';
      case 'north_america':
        return 'Nord America';
      case 'south_america':
        return 'Sud America';
      case 'asia':
        return 'Asia';
      case 'africa':
        return 'Africa';
      case 'oceania':
        return 'Oceania';
      case 'antarctica':
        return 'Antartide';
      default:
        return 'Sconosciuto';
    }
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChampionshipBracketUI;
} else {
  window.ChampionshipBracketUI = ChampionshipBracketUI;
}
