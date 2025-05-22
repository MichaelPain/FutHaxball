/**
 * EventDetailsUI.js - Interfaccia utente per i dettagli degli eventi
 * 
 * Questo componente gestisce la visualizzazione dei dettagli di un evento
 * nel pannello di amministrazione, incluse le informazioni, i partecipanti e le ricompense.
 */

class EventDetailsUI {
  /**
   * Costruttore
   * @param {AdminUI} adminUI - Riferimento all'interfaccia amministrativa principale
   * @param {Object} managers - Oggetto contenente i manager necessari
   */
  constructor(adminUI, managers) {
    this.adminUI = adminUI;
    this.eventManager = managers.eventManager;
    this.uiManager = managers.uiManager;
    
    this.container = null;
    this.eventId = null;
    this.event = null;
    this.rewards = [];
    this.participants = [];
    this.activeTab = 'info';
  }
  
  /**
   * Renderizza i dettagli dell'evento
   * @param {HTMLElement} container - Contenitore in cui renderizzare i dettagli
   * @param {String} eventId - ID dell'evento
   */
  async render(container, eventId) {
    this.container = container;
    this.eventId = eventId;
    
    // Mostra un loader mentre carica i dati
    this.container.innerHTML = '<div class="loading-spinner">Caricamento...</div>';
    
    try {
      // Carica i dati dell'evento
      await this.loadEventData();
      
      // Renderizza l'interfaccia
      this._renderInterface();
      
      // Aggiungi gli event listener
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante il caricamento dei dettagli dell\'evento:', error);
      this.container.innerHTML = `
        <div class="error-message">
          <h3>Errore</h3>
          <p>Si è verificato un errore durante il caricamento dei dettagli dell'evento.</p>
          <button class="retry-button">Riprova</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.render(this.container, this.eventId);
        });
      }
    }
  }
  
  /**
   * Carica i dati dell'evento
   */
  async loadEventData() {
    // Carica i dettagli dell'evento
    this.event = await this.eventManager.getEventDetails(this.eventId);
    
    // Carica le ricompense dell'evento
    this.rewards = await this.eventManager.getEventRewards(this.eventId);
    
    // Carica i partecipanti dell'evento
    this.participants = await this.eventManager.getEventParticipants(this.eventId);
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
      
      // Aggiorna il contenuto del tab
      const tabContents = this.container.querySelectorAll('.tab-content');
      tabContents.forEach(content => {
        if (content.dataset.tab === tab) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    }
  }
  
  /**
   * Mostra il form per l'assegnazione di una ricompensa
   * @param {String} rewardId - ID della ricompensa
   */
  showAssignRewardForm(rewardId) {
    const reward = this.rewards.find(r => r._id === rewardId);
    if (!reward) return;
    
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Assegna Ricompensa</h3>
          <p>Stai per assegnare la ricompensa "${reward.name}" a un partecipante.</p>
          
          <form id="assign-reward-form">
            <div class="form-group">
              <label for="participant-select">Partecipante:</label>
              <select id="participant-select" required>
                <option value="">Seleziona un partecipante</option>
                ${this.participants.map(p => `<option value="${p.userId._id}">${p.userId.nickname}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="position-input">Posizione:</label>
              <input type="number" id="position-input" min="1" value="1">
            </div>
            
            <div class="form-group">
              <label for="achievement-input">Risultato:</label>
              <input type="text" id="achievement-input" placeholder="Es. Primo posto, MVP, ecc.">
            </div>
            
            <div class="form-actions">
              <button type="button" class="cancel-button">Annulla</button>
              <button type="submit" class="submit-button">Assegna</button>
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
    const form = document.getElementById('assign-reward-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const participantId = document.getElementById('participant-select').value;
      const position = document.getElementById('position-input').value;
      const achievement = document.getElementById('achievement-input').value;
      
      if (!participantId) {
        this.uiManager.showNotification('Seleziona un partecipante', 'error');
        return;
      }
      
      try {
        await this.eventManager.assignReward(rewardId, participantId, position, achievement);
        this.uiManager.showNotification('Ricompensa assegnata con successo', 'success');
        modal.remove();
        
        // Ricarica i dati dell'evento
        await this.loadEventData();
        this._renderRewardsTab();
      } catch (error) {
        console.error('Errore durante l\'assegnazione della ricompensa:', error);
        this.uiManager.showNotification('Errore durante l\'assegnazione della ricompensa', 'error');
      }
    });
  }
  
  /**
   * Mostra il form per l'aggiunta di una ricompensa
   */
  showAddRewardForm() {
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Aggiungi Ricompensa</h3>
          
          <form id="add-reward-form">
            <div class="form-group">
              <label for="name-input">Nome:</label>
              <input type="text" id="name-input" required>
            </div>
            
            <div class="form-group">
              <label for="description-input">Descrizione:</label>
              <textarea id="description-input" required></textarea>
            </div>
            
            <div class="form-group">
              <label for="type-select">Tipo:</label>
              <select id="type-select" required>
                <option value="badge">Badge</option>
                <option value="title">Titolo</option>
                <option value="cosmetic">Oggetto Cosmetico</option>
                <option value="points">Punti</option>
                <option value="currency">Valuta</option>
                <option value="custom">Personalizzato</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="value-input">Valore:</label>
              <input type="text" id="value-input" required>
            </div>
            
            <div class="form-group">
              <label for="image-url-input">URL Immagine:</label>
              <input type="url" id="image-url-input">
            </div>
            
            <div class="form-group">
              <label for="rarity-select">Rarità:</label>
              <select id="rarity-select">
                <option value="common">Comune</option>
                <option value="uncommon">Non Comune</option>
                <option value="rare">Raro</option>
                <option value="epic">Epico</option>
                <option value="legendary">Leggendario</option>
              </select>
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
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('add-reward-form');
    const cancelButton = modal.querySelector('.cancel-button');
    
    cancelButton.addEventListener('click', () => {
      modal.remove();
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name-input').value;
      const description = document.getElementById('description-input').value;
      const type = document.getElementById('type-select').value;
      const value = document.getElementById('value-input').value;
      const imageUrl = document.getElementById('image-url-input').value;
      const rarity = document.getElementById('rarity-select').value;
      
      try {
        await this.eventManager.addReward(this.eventId, {
          name,
          description,
          type,
          value,
          imageUrl,
          rarity
        });
        
        this.uiManager.showNotification('Ricompensa aggiunta con successo', 'success');
        modal.remove();
        
        // Ricarica i dati dell'evento
        await this.loadEventData();
        this._renderRewardsTab();
      } catch (error) {
        console.error('Errore durante l\'aggiunta della ricompensa:', error);
        this.uiManager.showNotification('Errore durante l\'aggiunta della ricompensa', 'error');
      }
    });
  }
  
  /**
   * Renderizza l'interfaccia
   * @private
   */
  _renderInterface() {
    if (!this.event) {
      this.container.innerHTML = '<p class="error-message">Evento non trovato.</p>';
      return;
    }
    
    const startDate = new Date(this.event.startDate).toLocaleDateString();
    const endDate = this.event.endDate ? new Date(this.event.endDate).toLocaleDateString() : 'N/A';
    
    const detailsHTML = `
      <div class="event-details">
        <div class="event-header">
          <h2 class="event-name">${this.event.name}</h2>
          <span class="event-type ${this.event.eventType}">${this._getEventTypeName(this.event.eventType)}</span>
          <span class="event-status ${this.event.status}">${this._getStatusName(this.event.status)}</span>
        </div>
        
        <div class="event-tabs">
          <button class="tab-button ${this.activeTab === 'info' ? 'active' : ''}" data-tab="info">Informazioni</button>
          <button class="tab-button ${this.activeTab === 'participants' ? 'active' : ''}" data-tab="participants">Partecipanti</button>
          <button class="tab-button ${this.activeTab === 'rewards' ? 'active' : ''}" data-tab="rewards">Ricompense</button>
          <button class="tab-button ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">Impostazioni</button>
        </div>
        
        <div class="tab-content ${this.activeTab === 'info' ? 'active' : ''}" data-tab="info">
          <div class="event-info">
            <div class="info-group">
              <h3>Dettagli Evento</h3>
              <p><strong>Descrizione:</strong> ${this.event.description || 'Nessuna descrizione'}</p>
              <p><strong>Data inizio:</strong> ${startDate}</p>
              <p><strong>Data fine:</strong> ${endDate}</p>
              <p><strong>Formato:</strong> ${this._getFormatName(this.event.format)}</p>
              <p><strong>Modalità:</strong> ${this.event.mode}</p>
              <p><strong>Visibilità:</strong> ${this._getVisibilityName(this.event.visibility)}</p>
            </div>
            
            <div class="info-group">
              <h3>Dettagli Specifici</h3>
              <p><strong>Tema:</strong> ${this.event.eventDetails?.theme || 'Nessun tema'}</p>
              <p><strong>Ricorrenza:</strong> ${this.event.eventDetails?.recurrence || 'Nessuna ricorrenza'}</p>
              <p><strong>Regole speciali:</strong> ${this._formatSpecialRules(this.event.eventDetails?.specialRules)}</p>
            </div>
          </div>
        </div>
        
        <div class="tab-content ${this.activeTab === 'participants' ? 'active' : ''}" data-tab="participants">
          ${this._renderParticipantsTab()}
        </div>
        
        <div class="tab-content ${this.activeTab === 'rewards' ? 'active' : ''}" data-tab="rewards">
          ${this._renderRewardsTab()}
        </div>
        
        <div class="tab-content ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
          <div class="event-settings">
            <div class="settings-group">
              <h3>Azioni</h3>
              <button class="edit-event-button">Modifica Evento</button>
              <button class="delete-event-button">Elimina Evento</button>
            </div>
            
            <div class="settings-group">
              <h3>Stato Evento</h3>
              <div class="status-buttons">
                <button class="status-button ${this.event.status === 'draft' ? 'active' : ''}" data-status="draft">Bozza</button>
                <button class="status-button ${this.event.status === 'registration' ? 'active' : ''}" data-status="registration">Registrazione</button>
                <button class="status-button ${this.event.status === 'upcoming' ? 'active' : ''}" data-status="upcoming">Imminente</button>
                <button class="status-button ${this.event.status === 'active' ? 'active' : ''}" data-status="active">Attivo</button>
                <button class="status-button ${this.event.status === 'completed' ? 'active' : ''}" data-status="completed">Completato</button>
                <button class="status-button ${this.event.status === 'cancelled' ? 'active' : ''}" data-status="cancelled">Annullato</button>
              </div>
            </div>
            
            <div class="settings-group">
              <h3>Impostazioni Avanzate</h3>
              <p><strong>Codice invito:</strong> ${this.event.inviteCode || 'Nessun codice'}</p>
              <button class="generate-invite-button">Genera Nuovo Codice</button>
              
              <p><strong>Password:</strong> ${this.event.password ? '********' : 'Nessuna password'}</p>
              <button class="set-password-button">Imposta Password</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.innerHTML = detailsHTML;
  }
  
  /**
   * Renderizza il tab dei partecipanti
   * @returns {String} HTML del tab dei partecipanti
   * @private
   */
  _renderParticipantsTab() {
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
          <div class="participant-column">Azioni</div>
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
          <div class="participant-column">
            <div class="participant-actions">
              <button class="view-participant" data-id="${participant.userId._id}">Visualizza</button>
              <button class="remove-participant" data-id="${participant.userId._id}">Rimuovi</button>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }
  
  /**
   * Renderizza il tab delle ricompense
   * @returns {String} HTML del tab delle ricompense
   * @private
   */
  _renderRewardsTab() {
    let html = `
      <div class="rewards-container">
        <div class="rewards-header">
          <h3>Ricompense Disponibili</h3>
          <button class="add-reward-button">Aggiungi Ricompensa</button>
        </div>
    `;
    
    if (this.rewards.length === 0) {
      html += `
        <div class="rewards-empty">
          <p>Nessuna ricompensa disponibile.</p>
        </div>
      `;
    } else {
      html += '<div class="rewards-list">';
      
      this.rewards.forEach(reward => {
        html += `
          <div class="reward-card" data-id="${reward._id}">
            <div class="reward-header">
              <h4 class="reward-name">${reward.name}</h4>
              <span class="reward-rarity ${reward.rarity}">${this._getRarityName(reward.rarity)}</span>
            </div>
            <div class="reward-image">
              <img src="${reward.imageUrl || '/assets/default-reward.png'}" alt="${reward.name}">
            </div>
            <div class="reward-info">
              <p class="reward-description">${reward.description}</p>
              <p class="reward-type"><strong>Tipo:</strong> ${this._getRewardTypeName(reward.type)}</p>
              <p class="reward-value"><strong>Valore:</strong> ${this._formatRewardValue(reward.type, reward.value)}</p>
            </div>
            <div class="reward-actions">
              <button class="assign-reward" data-id="${reward._id}">Assegna</button>
              <button class="edit-reward" data-id="${reward._id}">Modifica</button>
              <button class="delete-reward" data-id="${reward._id}">Elimina</button>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }
    
    // Aggiungi la sezione delle ricompense assegnate
    html += `
      <div class="assigned-rewards-section">
        <h3>Ricompense Assegnate</h3>
        ${this._renderAssignedRewards()}
      </div>
    `;
    
    html += '</div>';
    
    // Aggiorna solo il contenuto del tab se è già stato renderizzato
    const rewardsTab = this.container.querySelector('.tab-content[data-tab="rewards"]');
    if (rewardsTab) {
      rewardsTab.innerHTML = html;
      this._attachRewardsEventListeners();
    }
    
    return html;
  }
  
  /**
   * Renderizza le ricompense assegnate
   * @returns {String} HTML delle ricompense assegnate
   * @private
   */
  _renderAssignedRewards() {
    // Implementazione della visualizzazione delle ricompense assegnate
    // Questa funzione dovrebbe recuperare e visualizzare le ricompense già assegnate ai partecipanti
    return '<p>Funzionalità in arrivo...</p>';
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
    
    // Pulsanti di modifica e eliminazione
    const editButton = this.container.querySelector('.edit-event-button');
    if (editButton) {
      editButton.addEventListener('click', () => {
        this.adminUI.showEditEventForm(this.eventId);
      });
    }
    
    const deleteButton = this.container.querySelector('.delete-event-button');
    if (deleteButton) {
      deleteButton.addEventListener('click', () => {
        this.adminUI.showDeleteEventConfirmation(this.eventId);
      });
    }
    
    // Pulsanti di stato
    const statusButtons = this.container.querySelectorAll('.status-button');
    statusButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const newStatus = button.dataset.status;
        
        try {
          await this.eventManager.updateEventStatus(this.eventId, newStatus);
          this.uiManager.showNotification(`Stato dell'evento aggiornato a "${this._getStatusName(newStatus)}"`, 'success');
          
          // Aggiorna lo stato nell'interfaccia
          this.event.status = newStatus;
          
          // Aggiorna i pulsanti di stato
          statusButtons.forEach(btn => {
            if (btn.dataset.status === newStatus) {
              btn.classList.add('active');
            } else {
              btn.classList.remove('active');
            }
          });
          
          // Aggiorna l'indicatore di stato nell'header
          const statusIndicator = this.container.querySelector('.event-status');
          if (statusIndicator) {
            statusIndicator.className = `event-status ${newStatus}`;
            statusIndicator.textContent = this._getStatusName(newStatus);
          }
        } catch (error) {
          console.error('Errore durante l\'aggiornamento dello stato dell\'evento:', error);
          this.uiManager.showNotification('Errore durante l\'aggiornamento dello stato dell\'evento', 'error');
        }
      });
    });
    
    // Pulsanti per le impostazioni avanzate
    const generateInviteButton = this.container.querySelector('.generate-invite-button');
    if (generateInviteButton) {
      generateInviteButton.addEventListener('click', async () => {
        try {
          const result = await this.eventManager.generateInviteCode(this.eventId);
          this.event.inviteCode = result.inviteCode;
          
          // Aggiorna il codice di invito nell'interfaccia
          const inviteCodeElement = this.container.querySelector('.settings-group p:nth-child(1)');
          if (inviteCodeElement) {
            inviteCodeElement.innerHTML = `<strong>Codice invito:</strong> ${this.event.inviteCode}`;
          }
          
          this.uiManager.showNotification('Nuovo codice di invito generato con successo', 'success');
        } catch (error) {
          console.error('Errore durante la generazione del codice di invito:', error);
          this.uiManager.showNotification('Errore durante la generazione del codice di invito', 'error');
        }
      });
    }
    
    const setPasswordButton = this.container.querySelector('.set-password-button');
    if (setPasswordButton) {
      setPasswordButton.addEventListener('click', () => {
        // Implementazione del form per impostare la password
        // ...
      });
    }
    
    // Aggiungi gli event listener specifici per ogni tab
    this._attachParticipantsEventListeners();
    this._attachRewardsEventListeners();
  }
  
  /**
   * Aggiunge gli event listener per il tab dei partecipanti
   * @private
   */
  _attachParticipantsEventListeners() {
    const viewButtons = this.container.querySelectorAll('.view-participant');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        const participantId = button.dataset.id;
        this.adminUI.showUserDetails(participantId);
      });
    });
    
    const removeButtons = this.container.querySelectorAll('.remove-participant');
    removeButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const participantId = button.dataset.id;
        
        if (confirm('Sei sicuro di voler rimuovere questo partecipante dall\'evento?')) {
          try {
            await this.eventManager.removeParticipant(this.eventId, participantId);
            this.uiManager.showNotification('Partecipante rimosso con successo', 'success');
            
            // Ricarica i dati dell'evento
            await this.loadEventData();
            
            // Aggiorna il tab dei partecipanti
            const participantsTab = this.container.querySelector('.tab-content[data-tab="participants"]');
            if (participantsTab) {
              participantsTab.innerHTML = this._renderParticipantsTab();
              this._attachParticipantsEventListeners();
            }
          } catch (error) {
            console.error('Errore durante la rimozione del partecipante:', error);
            this.uiManager.showNotification('Errore durante la rimozione del partecipante', 'error');
          }
        }
      });
    });
  }
  
  /**
   * Aggiunge gli event listener per il tab delle ricompense
   * @private
   */
  _attachRewardsEventListeners() {
    const addRewardButton = this.container.querySelector('.add-reward-button');
    if (addRewardButton) {
      addRewardButton.addEventListener('click', () => {
        this.showAddRewardForm();
      });
    }
    
    const assignButtons = this.container.querySelectorAll('.assign-reward');
    assignButtons.forEach(button => {
      button.addEventListener('click', () => {
        const rewardId = button.dataset.id;
        this.showAssignRewardForm(rewardId);
      });
    });
    
    const editButtons = this.container.querySelectorAll('.edit-reward');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const rewardId = button.dataset.id;
        // Implementazione del form per modificare la ricompensa
        // ...
      });
    });
    
    const deleteButtons = this.container.querySelectorAll('.delete-reward');
    deleteButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const rewardId = button.dataset.id;
        
        if (confirm('Sei sicuro di voler eliminare questa ricompensa?')) {
          try {
            await this.eventManager.deleteReward(rewardId);
            this.uiManager.showNotification('Ricompensa eliminata con successo', 'success');
            
            // Ricarica i dati dell'evento
            await this.loadEventData();
            this._renderRewardsTab();
          } catch (error) {
            console.error('Errore durante l\'eliminazione della ricompensa:', error);
            this.uiManager.showNotification('Errore durante l\'eliminazione della ricompensa', 'error');
          }
        }
      });
    });
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
   * Ottiene il nome della visibilità
   * @param {String} visibility - Visibilità
   * @returns {String} Nome della visibilità
   * @private
   */
  _getVisibilityName(visibility) {
    switch (visibility) {
      case 'public':
        return 'Pubblico';
      case 'private':
        return 'Privato';
      case 'unlisted':
        return 'Non in elenco';
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
   * Ottiene il nome del tipo di ricompensa
   * @param {String} type - Tipo di ricompensa
   * @returns {String} Nome del tipo di ricompensa
   * @private
   */
  _getRewardTypeName(type) {
    switch (type) {
      case 'badge':
        return 'Badge';
      case 'title':
        return 'Titolo';
      case 'cosmetic':
        return 'Oggetto Cosmetico';
      case 'points':
        return 'Punti';
      case 'currency':
        return 'Valuta';
      case 'custom':
        return 'Personalizzato';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Ottiene il nome della rarità
   * @param {String} rarity - Rarità
   * @returns {String} Nome della rarità
   * @private
   */
  _getRarityName(rarity) {
    switch (rarity) {
      case 'common':
        return 'Comune';
      case 'uncommon':
        return 'Non Comune';
      case 'rare':
        return 'Raro';
      case 'epic':
        return 'Epico';
      case 'legendary':
        return 'Leggendario';
      default:
        return 'Sconosciuto';
    }
  }
  
  /**
   * Formatta il valore della ricompensa in base al tipo
   * @param {String} type - Tipo di ricompensa
   * @param {*} value - Valore della ricompensa
   * @returns {String} Valore formattato
   * @private
   */
  _formatRewardValue(type, value) {
    switch (type) {
      case 'points':
        return `${value} punti`;
      case 'currency':
        return `${value} monete`;
      case 'title':
        return value;
      case 'badge':
      case 'cosmetic':
      case 'custom':
      default:
        return typeof value === 'object' ? JSON.stringify(value) : value.toString();
    }
  }
  
  /**
   * Formatta le regole speciali
   * @param {Object} specialRules - Regole speciali
   * @returns {String} Regole speciali formattate
   * @private
   */
  _formatSpecialRules(specialRules) {
    if (!specialRules) return 'Nessuna regola speciale';
    
    if (typeof specialRules === 'string') return specialRules;
    
    if (typeof specialRules === 'object') {
      let rulesHtml = '<ul>';
      
      for (const [key, value] of Object.entries(specialRules)) {
        rulesHtml += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      
      rulesHtml += '</ul>';
      return rulesHtml;
    }
    
    return 'Regole speciali non valide';
  }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventDetailsUI;
} else {
  window.EventDetailsUI = EventDetailsUI;
}
