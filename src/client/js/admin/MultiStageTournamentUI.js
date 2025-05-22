/**
 * MultiStageTournamentUI.js - Interfaccia utente per i tornei multi-stage
 * 
 * Questo componente gestisce la visualizzazione e l'interazione con i tornei multi-stage,
 * permettendo di navigare tra le diverse fasi e visualizzare i partecipanti qualificati.
 */

class MultiStageTournamentUI {
  /**
   * Costruttore
   * @param {AdminUI} adminUI - Riferimento all'interfaccia amministrativa principale
   * @param {Object} managers - Oggetto contenente i manager necessari
   */
  constructor(adminUI, managers) {
    this.adminUI = adminUI;
    this.tournamentManager = managers.tournamentManager;
    this.multiStageController = managers.multiStageController;
    this.uiManager = managers.uiManager;
    
    this.container = null;
    this.tournamentId = null;
    this.tournament = null;
    this.currentStage = null;
    this.participants = [];
    this.qualifiers = [];
  }
  
  /**
   * Renderizza l'interfaccia del torneo multi-stage
   * @param {HTMLElement} container - Contenitore in cui renderizzare l'interfaccia
   * @param {String} tournamentId - ID del torneo
   */
  async render(container, tournamentId) {
    this.container = container;
    this.tournamentId = tournamentId;
    
    // Mostra un loader mentre carica i dati
    this.container.innerHTML = '<div class="loading-spinner">Caricamento...</div>';
    
    try {
      // Carica i dati del torneo
      await this.loadTournamentData();
      
      // Renderizza l'interfaccia
      this._renderInterface();
      
      // Aggiungi gli event listener
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante il caricamento del torneo multi-stage:', error);
      this.container.innerHTML = `
        <div class="error-message">
          <h3>Errore</h3>
          <p>Si è verificato un errore durante il caricamento del torneo multi-stage.</p>
          <button class="retry-button">Riprova</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.render(this.container, this.tournamentId);
        });
      }
    }
  }
  
  /**
   * Carica i dati del torneo
   */
  async loadTournamentData() {
    // Carica i dettagli del torneo
    const response = await this.tournamentManager.getTournamentDetails(this.tournamentId);
    this.tournament = response.tournament;
    
    // Verifica che sia un torneo multi-stage
    if (this.tournament.format !== 'multi_stage') {
      throw new Error('Questo torneo non è di tipo multi-stage');
    }
    
    // Ordina le fasi per ordine
    if (this.tournament.stages) {
      this.tournament.stages.sort((a, b) => a.order - b.order);
      
      // Imposta la fase corrente (la prima fase attiva o l'ultima fase)
      const activeStage = this.tournament.stages.find(s => s.status === 'active');
      this.currentStage = activeStage || this.tournament.stages[this.tournament.stages.length - 1];
    }
    
    // Carica i partecipanti
    this.participants = response.participants || [];
    
    // Carica i qualificati per la fase corrente
    if (this.currentStage) {
      await this.loadQualifiers();
    }
  }
  
  /**
   * Carica i qualificati per la fase corrente
   */
  async loadQualifiers() {
    if (!this.currentStage) return;
    
    try {
      // Se è la prima fase, i qualificati sono tutti i partecipanti
      if (this.currentStage.order === 1) {
        this.qualifiers = this.participants;
        return;
      }
      
      // Altrimenti, carica i qualificati dalla fase precedente
      const previousStage = this.tournament.stages.find(s => s.order === this.currentStage.order - 1);
      if (previousStage && previousStage.status === 'completed') {
        const response = await this.multiStageController.getStageQualifiers(this.tournamentId, previousStage._id);
        this.qualifiers = response.qualifiers || [];
      } else {
        this.qualifiers = [];
      }
    } catch (error) {
      console.error('Errore durante il caricamento dei qualificati:', error);
      this.qualifiers = [];
    }
  }
  
  /**
   * Cambia la fase corrente
   * @param {String} stageId - ID della fase
   */
  async setCurrentStage(stageId) {
    const stage = this.tournament.stages.find(s => s._id === stageId);
    if (stage && stage !== this.currentStage) {
      this.currentStage = stage;
      
      // Carica i qualificati per la nuova fase
      await this.loadQualifiers();
      
      // Aggiorna l'interfaccia
      this._updateStageContent();
      
      // Aggiorna i pulsanti delle fasi
      const stageButtons = this.container.querySelectorAll('.stage-button');
      stageButtons.forEach(button => {
        if (button.dataset.stageId === stageId) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
    }
  }
  
  /**
   * Mostra il form per la creazione di una nuova fase
   */
  showCreateStageForm() {
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Crea Nuova Fase</h3>
          
          <form id="create-stage-form">
            <div class="form-group">
              <label for="name-input">Nome:</label>
              <input type="text" id="name-input" required>
            </div>
            
            <div class="form-group">
              <label for="format-select">Formato:</label>
              <select id="format-select" required>
                <option value="single_elimination">Eliminazione Singola</option>
                <option value="double_elimination">Eliminazione Doppia</option>
                <option value="round_robin">Round Robin</option>
                <option value="swiss">Swiss</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="order-input">Ordine:</label>
              <input type="number" id="order-input" min="1" required>
            </div>
            
            <div class="form-group">
              <label for="start-date-input">Data inizio:</label>
              <input type="datetime-local" id="start-date-input" required>
            </div>
            
            <div class="form-group">
              <label for="end-date-input">Data fine:</label>
              <input type="datetime-local" id="end-date-input" required>
            </div>
            
            <div class="form-group">
              <label for="qualification-count-input">Numero di qualificati:</label>
              <input type="number" id="qualification-count-input" min="1" value="8" required>
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button">Annulla</button>
              <button type="submit" class="submit-button">Crea</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Aggiungi il form al DOM
    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHTML;
    document.body.appendChild(formContainer.firstElementChild);
    
    // Imposta il valore predefinito per l'ordine
    const orderInput = document.getElementById('order-input');
    if (orderInput) {
      const maxOrder = Math.max(...this.tournament.stages.map(s => s.order), 0);
      orderInput.value = maxOrder + 1;
    }
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('create-stage-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name-input').value;
      const format = document.getElementById('format-select').value;
      const order = document.getElementById('order-input').value;
      const startDate = document.getElementById('start-date-input').value;
      const endDate = document.getElementById('end-date-input').value;
      const qualificationCount = document.getElementById('qualification-count-input').value;
      
      try {
        await this.multiStageController.createStage(this.tournamentId, {
          name,
          format,
          order,
          startDate,
          endDate,
          qualificationCount
        });
        
        this.uiManager.showNotification('Fase creata con successo', 'success');
        modal.remove();
        
        // Ricarica i dati del torneo
        await this.loadTournamentData();
        
        // Aggiorna l'interfaccia
        this._renderInterface();
        this._attachEventListeners();
      } catch (error) {
        console.error('Errore durante la creazione della fase:', error);
        this.uiManager.showNotification('Errore durante la creazione della fase', 'error');
      }
    });
  }
  
  /**
   * Mostra il form per la modifica di una fase
   * @param {String} stageId - ID della fase
   */
  showEditStageForm(stageId) {
    const stage = this.tournament.stages.find(s => s._id === stageId);
    if (!stage) return;
    
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Modifica Fase</h3>
          
          <form id="edit-stage-form">
            <div class="form-group">
              <label for="name-input">Nome:</label>
              <input type="text" id="name-input" value="${stage.name || ''}" required>
            </div>
            
            <div class="form-group">
              <label for="format-select">Formato:</label>
              <select id="format-select" required>
                <option value="single_elimination" ${stage.format === 'single_elimination' ? 'selected' : ''}>Eliminazione Singola</option>
                <option value="double_elimination" ${stage.format === 'double_elimination' ? 'selected' : ''}>Eliminazione Doppia</option>
                <option value="round_robin" ${stage.format === 'round_robin' ? 'selected' : ''}>Round Robin</option>
                <option value="swiss" ${stage.format === 'swiss' ? 'selected' : ''}>Swiss</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="order-input">Ordine:</label>
              <input type="number" id="order-input" min="1" value="${stage.order}" required>
            </div>
            
            <div class="form-group">
              <label for="start-date-input">Data inizio:</label>
              <input type="datetime-local" id="start-date-input" value="${this._formatDateForInput(stage.startDate)}" required>
            </div>
            
            <div class="form-group">
              <label for="end-date-input">Data fine:</label>
              <input type="datetime-local" id="end-date-input" value="${this._formatDateForInput(stage.endDate)}" required>
            </div>
            
            <div class="form-group">
              <label for="qualification-count-input">Numero di qualificati:</label>
              <input type="number" id="qualification-count-input" min="1" value="${stage.qualificationCount || 8}" required>
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button">Annulla</button>
              <button type="submit" class="submit-button">Salva</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Aggiungi il form al DOM
    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHTML;
    document.body.appendChild(formContainer.firstElementChild);
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('edit-stage-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name-input').value;
      const format = document.getElementById('format-select').value;
      const order = document.getElementById('order-input').value;
      const startDate = document.getElementById('start-date-input').value;
      const endDate = document.getElementById('end-date-input').value;
      const qualificationCount = document.getElementById('qualification-count-input').value;
      
      try {
        await this.multiStageController.updateStage(this.tournamentId, stageId, {
          name,
          format,
          order,
          startDate,
          endDate,
          qualificationCount
        });
        
        this.uiManager.showNotification('Fase aggiornata con successo', 'success');
        modal.remove();
        
        // Ricarica i dati del torneo
        await this.loadTournamentData();
        
        // Aggiorna l'interfaccia
        this._renderInterface();
        this._attachEventListeners();
      } catch (error) {
        console.error('Errore durante l\'aggiornamento della fase:', error);
        this.uiManager.showNotification('Errore durante l\'aggiornamento della fase', 'error');
      }
    });
  }
  
  /**
   * Avvia una fase
   * @param {String} stageId - ID della fase
   */
  async startStage(stageId) {
    try {
      await this.multiStageController.startStage(this.tournamentId, stageId);
      this.uiManager.showNotification('Fase avviata con successo', 'success');
      
      // Ricarica i dati del torneo
      await this.loadTournamentData();
      
      // Aggiorna l'interfaccia
      this._renderInterface();
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante l\'avvio della fase:', error);
      this.uiManager.showNotification('Errore durante l\'avvio della fase', 'error');
    }
  }
  
  /**
   * Completa una fase
   * @param {String} stageId - ID della fase
   */
  async completeStage(stageId) {
    try {
      await this.multiStageController.completeStage(this.tournamentId, stageId);
      this.uiManager.showNotification('Fase completata con successo', 'success');
      
      // Ricarica i dati del torneo
      await this.loadTournamentData();
      
      // Aggiorna l'interfaccia
      this._renderInterface();
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante il completamento della fase:', error);
      this.uiManager.showNotification('Errore durante il completamento della fase', 'error');
    }
  }
  
  /**
   * Elimina una fase
   * @param {String} stageId - ID della fase
   */
  async deleteStage(stageId) {
    if (confirm('Sei sicuro di voler eliminare questa fase?')) {
      try {
        await this.multiStageController.deleteStage(this.tournamentId, stageId);
        this.uiManager.showNotification('Fase eliminata con successo', 'success');
        
        // Ricarica i dati del torneo
        await this.loadTournamentData();
        
        // Aggiorna l'interfaccia
        this._renderInterface();
        this._attachEventListeners();
      } catch (error) {
        console.error('Errore durante l\'eliminazione della fase:', error);
        this.uiManager.showNotification('Errore durante l\'eliminazione della fase', 'error');
      }
    }
  }
  
  /**
   * Renderizza l'interfaccia
   * @private
   */
  _renderInterface() {
    if (!this.tournament) {
      this.container.innerHTML = '<p class="error-message">Torneo non trovato.</p>';
      return;
    }
    
    const tournamentHTML = `
      <div class="multi-stage-tournament">
        <div class="tournament-header">
          <h2 class="tournament-name">${this.tournament.name}</h2>
          <span class="tournament-format">Multi-Stage</span>
          <span class="tournament-status ${this.tournament.status}">${this._getStatusName(this.tournament.status)}</span>
        </div>
        
        <div class="tournament-actions">
          <button class="edit-tournament-button">Modifica Torneo</button>
          <button class="create-stage-button">Crea Nuova Fase</button>
        </div>
        
        <div class="stages-navigation">
          <h3>Fasi del Torneo</h3>
          <div class="stages-list">
            ${this._renderStagesList()}
          </div>
        </div>
        
        <div class="stage-content">
          ${this._renderStageContent()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = tournamentHTML;
  }
  
  /**
   * Renderizza la lista delle fasi
   * @returns {String} HTML della lista delle fasi
   * @private
   */
  _renderStagesList() {
    if (!this.tournament.stages || this.tournament.stages.length === 0) {
      return `
        <div class="stages-empty">
          <p>Questo torneo non ha ancora fasi.</p>
        </div>
      `;
    }
    
    let html = '';
    
    this.tournament.stages.forEach(stage => {
      html += `
        <div class="stage-item ${stage._id === this.currentStage._id ? 'active' : ''}" data-stage-id="${stage._id}">
          <div class="stage-info">
            <span class="stage-name">${stage.name || `Fase ${stage.order}`}</span>
            <span class="stage-status ${stage.status}">${this._getStageStatusName(stage.status)}</span>
          </div>
          <div class="stage-actions">
            <button class="view-stage-button" data-stage-id="${stage._id}">Visualizza</button>
          </div>
        </div>
      `;
    });
    
    return html;
  }
  
  /**
   * Renderizza il contenuto della fase corrente
   * @returns {String} HTML del contenuto della fase
   * @private
   */
  _renderStageContent() {
    if (!this.currentStage) {
      return `
        <div class="stage-empty">
          <p>Seleziona una fase per visualizzarne i dettagli.</p>
        </div>
      `;
    }
    
    const startDate = this.currentStage.startDate ? new Date(this.currentStage.startDate).toLocaleDateString() : 'N/A';
    const endDate = this.currentStage.endDate ? new Date(this.currentStage.endDate).toLocaleDateString() : 'N/A';
    
    let html = `
      <div class="stage-details">
        <div class="stage-header">
          <h3 class="stage-name">${this.currentStage.name || `Fase ${this.currentStage.order}`}</h3>
          <span class="stage-format">${this._getFormatName(this.currentStage.format)}</span>
          <span class="stage-status ${this.currentStage.status}">${this._getStageStatusName(this.currentStage.status)}</span>
        </div>
        
        <div class="stage-info">
          <p><strong>Ordine:</strong> ${this.currentStage.order}</p>
          <p><strong>Data inizio:</strong> ${startDate}</p>
          <p><strong>Data fine:</strong> ${endDate}</p>
          <p><strong>Numero di qualificati:</strong> ${this.currentStage.qualificationCount || 0}</p>
        </div>
        
        <div class="stage-actions">
          ${this._renderStageActions()}
        </div>
        
        <div class="stage-tabs">
          <button class="tab-button active" data-tab="participants">Partecipanti</button>
          <button class="tab-button" data-tab="bracket">Bracket</button>
          <button class="tab-button" data-tab="qualifiers">Qualificati</button>
        </div>
        
        <div class="tab-content active" data-tab="participants">
          ${this._renderParticipantsTab()}
        </div>
        
        <div class="tab-content" data-tab="bracket">
          ${this._renderBracketTab()}
        </div>
        
        <div class="tab-content" data-tab="qualifiers">
          ${this._renderQualifiersTab()}
        </div>
      </div>
    `;
    
    return html;
  }
  
  /**
   * Aggiorna il contenuto della fase corrente
   * @private
   */
  _updateStageContent() {
    const stageContent = this.container.querySelector('.stage-content');
    if (stageContent) {
      stageContent.innerHTML = this._renderStageContent();
      this._attachStageContentEventListeners();
    }
  }
  
  /**
   * Renderizza le azioni disponibili per la fase corrente
   * @returns {String} HTML delle azioni
   * @private
   */
  _renderStageActions() {
    let html = `
      <button class="edit-stage-button" data-stage-id="${this.currentStage._id}">Modifica</button>
    `;
    
    // Aggiungi pulsanti in base allo stato della fase
    switch (this.currentStage.status) {
      case 'pending':
        html += `
          <button class="start-stage-button" data-stage-id="${this.currentStage._id}">Avvia</button>
          <button class="delete-stage-button" data-stage-id="${this.currentStage._id}">Elimina</button>
        `;
        break;
      
      case 'active':
        html += `
          <button class="complete-stage-button" data-stage-id="${this.currentStage._id}">Completa</button>
        `;
        break;
    }
    
    return html;
  }
  
  /**
   * Renderizza il tab dei partecipanti
   * @returns {String} HTML del tab dei partecipanti
   * @private
   */
  _renderParticipantsTab() {
    // Se è la prima fase, mostra tutti i partecipanti del torneo
    if (this.currentStage.order === 1) {
      if (this.participants.length === 0) {
        return `
          <div class="participants-empty">
            <p>Nessun partecipante registrato.</p>
          </div>
        `;
      }
      
      let html = `
        <div class="participants-list">
          <div class="participants-header">
            <div class="participant-column">Utente</div>
            <div class="participant-column">Stato</div>
            <div class="participant-column">Registrato il</div>
          </div>
      `;
      
      this.participants.forEach(participant => {
        const registeredDate = new Date(participant.registeredAt).toLocaleDateString();
        
        html += `
          <div class="participant-row" data-id="${participant.userId._id}">
            <div class="participant-column">
              <div class="participant-info">
                <img src="${participant.userId.avatar || '/assets/default-avatar.png'}" alt="Avatar" class="participant-avatar">
                <span class="participant-nickname">${participant.userId.nickname}</span>
              </div>
            </div>
            <div class="participant-column">
              <span class="participant-status ${participant.status}">${this._getParticipantStatusName(participant.status)}</span>
            </div>
            <div class="participant-column">
              <span class="participant-date">${registeredDate}</span>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      
      return html;
    } else {
      // Per le fasi successive, mostra i qualificati dalla fase precedente
      return this._renderQualifiersTab();
    }
  }
  
  /**
   * Renderizza il tab del bracket
   * @returns {String} HTML del tab del bracket
   * @private
   */
  _renderBracketTab() {
    // Verifica se la fase ha un bracket
    if (!this.currentStage.matches || this.currentStage.matches.length === 0) {
      return `
        <div class="bracket-empty">
          <p>Questa fase non ha ancora un bracket generato.</p>
          ${this.currentStage.status === 'active' ? `<button class="generate-bracket-button" data-stage-id="${this.currentStage._id}">Genera Bracket</button>` : ''}
        </div>
      `;
    }
    
    // Raggruppa le partite per round
    const matchesByRound = {};
    this.currentStage.matches.forEach(match => {
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
   * Renderizza il tab dei qualificati
   * @returns {String} HTML del tab dei qualificati
   * @private
   */
  _renderQualifiersTab() {
    if (this.qualifiers.length === 0) {
      return `
        <div class="qualifiers-empty">
          <p>Nessun qualificato disponibile.</p>
        </div>
      `;
    }
    
    let html = `
      <div class="qualifiers-list">
        <h4>Qualificati per questa fase</h4>
        <div class="qualifiers-grid">
    `;
    
    this.qualifiers.forEach(qualifier => {
      html += `
        <div class="qualifier-card" data-id="${qualifier.userId._id}">
          <div class="qualifier-avatar">
            <img src="${qualifier.userId.avatar || '/assets/default-avatar.png'}" alt="Avatar">
          </div>
          <div class="qualifier-info">
            <span class="qualifier-nickname">${qualifier.userId.nickname}</span>
            <span class="qualifier-position">${qualifier.position || ''}</span>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
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
   * Aggiunge gli event listener
   * @private
   */
  _attachEventListeners() {
    // Pulsanti di azione del torneo
    const editTournamentButton = this.container.querySelector('.edit-tournament-button');
    if (editTournamentButton) {
      editTournamentButton.addEventListener('click', () => {
        this.adminUI.showEditTournamentForm(this.tournamentId);
      });
    }
    
    const createStageButton = this.container.querySelector('.create-stage-button');
    if (createStageButton) {
      createStageButton.addEventListener('click', () => {
        this.showCreateStageForm();
      });
    }
    
    // Pulsanti delle fasi
    const viewStageButtons = this.container.querySelectorAll('.view-stage-button');
    viewStageButtons.forEach(button => {
      button.addEventListener('click', () => {
        const stageId = button.dataset.stageId;
        this.setCurrentStage(stageId);
      });
    });
    
    // Aggiungi gli event listener per il contenuto della fase
    this._attachStageContentEventListeners();
  }
  
  /**
   * Aggiunge gli event listener per il contenuto della fase
   * @private
   */
  _attachStageContentEventListeners() {
    // Tab buttons
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Aggiorna il pulsante attivo
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Aggiorna il contenuto del tab
        const tabContents = this.container.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
          if (content.dataset.tab === button.dataset.tab) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });
    
    // Pulsanti di azione della fase
    const editStageButton = this.container.querySelector('.edit-stage-button');
    if (editStageButton) {
      editStageButton.addEventListener('click', () => {
        const stageId = editStageButton.dataset.stageId;
        this.showEditStageForm(stageId);
      });
    }
    
    const startStageButton = this.container.querySelector('.start-stage-button');
    if (startStageButton) {
      startStageButton.addEventListener('click', () => {
        const stageId = startStageButton.dataset.stageId;
        this.startStage(stageId);
      });
    }
    
    const completeStageButton = this.container.querySelector('.complete-stage-button');
    if (completeStageButton) {
      completeStageButton.addEventListener('click', () => {
        const stageId = completeStageButton.dataset.stageId;
        this.completeStage(stageId);
      });
    }
    
    const deleteStageButton = this.container.querySelector('.delete-stage-button');
    if (deleteStageButton) {
      deleteStageButton.addEventListener('click', () => {
        const stageId = deleteStageButton.dataset.stageId;
        this.deleteStage(stageId);
      });
    }
    
    // Pulsante per generare il bracket
    const generateBracketButton = this.container.querySelector('.generate-bracket-button');
    if (generateBracketButton) {
      generateBracketButton.addEventListener('click', async () => {
        const stageId = generateBracketButton.dataset.stageId;
        
        try {
          await this.multiStageController.generateBracket(this.tournamentId, stageId);
          this.uiManager.showNotification('Bracket generato con successo', 'success');
          
          // Ricarica i dati del torneo
          await this.loadTournamentData();
          
          // Aggiorna l'interfaccia
          this._updateStageContent();
        } catch (error) {
          console.error('Errore durante la generazione del bracket:', error);
          this.uiManager.showNotification('Errore durante la generazione del bracket', 'error');
        }
      });
    }
    
    // Pulsanti per modificare le partite
    const editMatchButtons = this.container.querySelectorAll('.edit-match-button');
    editMatchButtons.forEach(button => {
      button.addEventListener('click', () => {
        const matchId = button.dataset.matchId;
        this.adminUI.showEditMatchForm(this.tournamentId, matchId);
      });
    });
  }
  
  /**
   * Ottiene il nome di un partecipante
   * @param {String} participantId - ID del partecipante
   * @returns {String} Nome del partecipante
   * @private
   */
  _getParticipantName(participantId) {
    // Cerca il partecipante tra i partecipanti del torneo
    const participant = this.participants.find(p => p.userId._id === participantId);
    
    if (participant && participant.userId) {
      return participant.userId.nickname;
    }
    
    // Cerca il partecipante tra i qualificati
    const qualifier = this.qualifiers.find(q => q.userId._id === participantId);
    
    if (qualifier && qualifier.userId) {
      return qualifier.userId.nickname;
    }
    
    return 'Sconosciuto';
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
   * Ottiene il nome dello stato del torneo
   * @param {String} status - Stato del torneo
   * @returns {String} Nome dello stato del torneo
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
   * Ottiene il nome dello stato della fase
   * @param {String} status - Stato della fase
   * @returns {String} Nome dello stato della fase
   * @private
   */
  _getStageStatusName(status) {
    switch (status) {
      case 'pending':
        return 'In attesa';
      case 'active':
        return 'Attiva';
      case 'completed':
        return 'Completata';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome dello stato del partecipante
   * @param {String} status - Stato del partecipante
   * @returns {String} Nome dello stato del partecipante
   * @private
   */
  _getParticipantStatusName(status) {
    switch (status) {
      case 'registered':
        return 'Registrato';
      case 'checked_in':
        return 'Check-in effettuato';
      case 'active':
        return 'Attivo';
      case 'eliminated':
        return 'Eliminato';
      case 'winner':
        return 'Vincitore';
      case 'disqualified':
        return 'Squalificato';
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
   * Formatta una data per un input datetime-local
   * @param {String} dateString - Data in formato stringa
   * @returns {String} Data formattata per input datetime-local
   * @private
   */
  _formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Formatta la data nel formato YYYY-MM-DDThh:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiStageTournamentUI;
} else {
  window.MultiStageTournamentUI = MultiStageTournamentUI;
}
