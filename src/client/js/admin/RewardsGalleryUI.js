/**
 * RewardsGalleryUI.js - Interfaccia utente per la galleria delle ricompense
 * 
 * Questo componente gestisce la visualizzazione e l'interazione con le ricompense
 * ottenute dagli utenti durante gli eventi e i tornei.
 */

class RewardsGalleryUI {
  /**
   * Costruttore
   * @param {AdminUI} adminUI - Riferimento all'interfaccia amministrativa principale
   * @param {Object} managers - Oggetto contenente i manager necessari
   */
  constructor(adminUI, managers) {
    this.adminUI = adminUI;
    this.eventManager = managers.eventManager;
    this.tournamentManager = managers.tournamentManager;
    this.userManager = managers.userManager;
    this.uiManager = managers.uiManager;
    
    this.container = null;
    this.userId = null;
    this.user = null;
    this.rewards = [];
    this.filterType = 'all';
    this.filterRarity = 'all';
    this.sortBy = 'date_desc';
  }
  
  /**
   * Renderizza la galleria delle ricompense
   * @param {HTMLElement} container - Contenitore in cui renderizzare la galleria
   * @param {String} userId - ID dell'utente (opzionale, se non specificato mostra tutte le ricompense)
   */
  async render(container, userId = null) {
    this.container = container;
    this.userId = userId;
    
    // Mostra un loader mentre carica i dati
    this.container.innerHTML = '<div class="loading-spinner">Caricamento...</div>';
    
    try {
      // Carica i dati delle ricompense
      await this.loadRewardsData();
      
      // Renderizza l'interfaccia
      this._renderInterface();
      
      // Aggiungi gli event listener
      this._attachEventListeners();
    } catch (error) {
      console.error('Errore durante il caricamento della galleria delle ricompense:', error);
      this.container.innerHTML = `
        <div class="error-message">
          <h3>Errore</h3>
          <p>Si è verificato un errore durante il caricamento della galleria delle ricompense.</p>
          <button class="retry-button">Riprova</button>
        </div>
      `;
      
      const retryButton = this.container.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.render(this.container, this.userId);
        });
      }
    }
  }
  
  /**
   * Carica i dati delle ricompense
   */
  async loadRewardsData() {
    // Se è specificato un utente, carica le ricompense dell'utente
    if (this.userId) {
      // Carica i dettagli dell'utente
      const userResponse = await this.userManager.getUserDetails(this.userId);
      this.user = userResponse.user;
      
      // Carica le ricompense dell'utente
      const rewardsResponse = await this.eventManager.getUserRewards(this.userId);
      this.rewards = rewardsResponse.rewards || [];
    } else {
      // Carica tutte le ricompense disponibili
      const rewardsResponse = await this.eventManager.getAllRewards();
      this.rewards = rewardsResponse.rewards || [];
    }
  }
  
  /**
   * Filtra le ricompense
   * @param {String} type - Tipo di filtro ('all', 'badge', 'title', 'cosmetic', 'points', 'currency', 'custom')
   */
  filterByType(type) {
    this.filterType = type;
    this._updateRewardsList();
  }
  
  /**
   * Filtra le ricompense per rarità
   * @param {String} rarity - Rarità ('all', 'common', 'uncommon', 'rare', 'epic', 'legendary')
   */
  filterByRarity(rarity) {
    this.filterRarity = rarity;
    this._updateRewardsList();
  }
  
  /**
   * Ordina le ricompense
   * @param {String} sortBy - Criterio di ordinamento ('date_asc', 'date_desc', 'rarity_asc', 'rarity_desc', 'name_asc', 'name_desc')
   */
  sortRewards(sortBy) {
    this.sortBy = sortBy;
    this._updateRewardsList();
  }
  
  /**
   * Mostra i dettagli di una ricompensa
   * @param {String} rewardId - ID della ricompensa
   */
  showRewardDetails(rewardId) {
    const reward = this.rewards.find(r => r._id === rewardId);
    if (!reward) return;
    
    const detailsHTML = `
      <div class="modal-overlay">
        <div class="modal-content reward-details-modal">
          <div class="reward-details-header">
            <h3 class="reward-name">${reward.name}</h3>
            <span class="reward-rarity ${reward.rarity}">${this._getRarityName(reward.rarity)}</span>
          </div>
          
          <div class="reward-details-image">
            <img src="${reward.imageUrl || '/assets/default-reward.png'}" alt="${reward.name}">
          </div>
          
          <div class="reward-details-info">
            <p class="reward-description">${reward.description}</p>
            <p><strong>Tipo:</strong> ${this._getRewardTypeName(reward.type)}</p>
            <p><strong>Valore:</strong> ${this._formatRewardValue(reward.type, reward.value)}</p>
            ${reward.event ? `<p><strong>Evento:</strong> ${reward.event.name}</p>` : ''}
            ${reward.obtainedAt ? `<p><strong>Ottenuta il:</strong> ${new Date(reward.obtainedAt).toLocaleDateString()}</p>` : ''}
            ${reward.achievement ? `<p><strong>Risultato:</strong> ${reward.achievement}</p>` : ''}
          </div>
          
          <div class="reward-details-actions">
            ${this.userId ? `
              ${reward.isEquipped ? `
                <button class="unequip-reward-button" data-id="${reward._id}">Rimuovi</button>
              ` : `
                <button class="equip-reward-button" data-id="${reward._id}">Equipaggia</button>
              `}
            ` : `
              <button class="edit-reward-button" data-id="${reward._id}">Modifica</button>
              <button class="delete-reward-button" data-id="${reward._id}">Elimina</button>
            `}
            <button class="close-modal-button">Chiudi</button>
          </div>
        </div>
      </div>
    `;
    
    // Aggiungi il modal al DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = detailsHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const closeButton = modal.querySelector('.close-modal-button');
    
    closeButton.addEventListener('click', () => {
      modal.remove();
    });
    
    // Event listener per equipaggiare la ricompensa
    const equipButton = modal.querySelector('.equip-reward-button');
    if (equipButton) {
      equipButton.addEventListener('click', async () => {
        try {
          await this.eventManager.equipReward(this.userId, rewardId);
          this.uiManager.showNotification('Ricompensa equipaggiata con successo', 'success');
          modal.remove();
          
          // Ricarica i dati delle ricompense
          await this.loadRewardsData();
          this._updateRewardsList();
        } catch (error) {
          console.error('Errore durante l\'equipaggiamento della ricompensa:', error);
          this.uiManager.showNotification('Errore durante l\'equipaggiamento della ricompensa', 'error');
        }
      });
    }
    
    // Event listener per rimuovere la ricompensa
    const unequipButton = modal.querySelector('.unequip-reward-button');
    if (unequipButton) {
      unequipButton.addEventListener('click', async () => {
        try {
          await this.eventManager.unequipReward(this.userId, rewardId);
          this.uiManager.showNotification('Ricompensa rimossa con successo', 'success');
          modal.remove();
          
          // Ricarica i dati delle ricompense
          await this.loadRewardsData();
          this._updateRewardsList();
        } catch (error) {
          console.error('Errore durante la rimozione della ricompensa:', error);
          this.uiManager.showNotification('Errore durante la rimozione della ricompensa', 'error');
        }
      });
    }
    
    // Event listener per modificare la ricompensa
    const editButton = modal.querySelector('.edit-reward-button');
    if (editButton) {
      editButton.addEventListener('click', () => {
        modal.remove();
        this.showEditRewardForm(rewardId);
      });
    }
    
    // Event listener per eliminare la ricompensa
    const deleteButton = modal.querySelector('.delete-reward-button');
    if (deleteButton) {
      deleteButton.addEventListener('click', async () => {
        if (confirm('Sei sicuro di voler eliminare questa ricompensa?')) {
          try {
            await this.eventManager.deleteReward(rewardId);
            this.uiManager.showNotification('Ricompensa eliminata con successo', 'success');
            modal.remove();
            
            // Ricarica i dati delle ricompense
            await this.loadRewardsData();
            this._updateRewardsList();
          } catch (error) {
            console.error('Errore durante l\'eliminazione della ricompensa:', error);
            this.uiManager.showNotification('Errore durante l\'eliminazione della ricompensa', 'error');
          }
        }
      });
    }
  }
  
  /**
   * Mostra il form per la modifica di una ricompensa
   * @param {String} rewardId - ID della ricompensa
   */
  showEditRewardForm(rewardId) {
    const reward = this.rewards.find(r => r._id === rewardId);
    if (!reward) return;
    
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Modifica Ricompensa</h3>
          
          <form id="edit-reward-form">
            <div class="form-group">
              <label for="name-input">Nome:</label>
              <input type="text" id="name-input" value="${reward.name}" required>
            </div>
            
            <div class="form-group">
              <label for="description-input">Descrizione:</label>
              <textarea id="description-input" required>${reward.description}</textarea>
            </div>
            
            <div class="form-group">
              <label for="type-select">Tipo:</label>
              <select id="type-select" required>
                <option value="badge" ${reward.type === 'badge' ? 'selected' : ''}>Badge</option>
                <option value="title" ${reward.type === 'title' ? 'selected' : ''}>Titolo</option>
                <option value="cosmetic" ${reward.type === 'cosmetic' ? 'selected' : ''}>Oggetto Cosmetico</option>
                <option value="points" ${reward.type === 'points' ? 'selected' : ''}>Punti</option>
                <option value="currency" ${reward.type === 'currency' ? 'selected' : ''}>Valuta</option>
                <option value="custom" ${reward.type === 'custom' ? 'selected' : ''}>Personalizzato</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="value-input">Valore:</label>
              <input type="text" id="value-input" value="${reward.value}" required>
            </div>
            
            <div class="form-group">
              <label for="image-url-input">URL Immagine:</label>
              <input type="url" id="image-url-input" value="${reward.imageUrl || ''}">
            </div>
            
            <div class="form-group">
              <label for="rarity-select">Rarità:</label>
              <select id="rarity-select">
                <option value="common" ${reward.rarity === 'common' ? 'selected' : ''}>Comune</option>
                <option value="uncommon" ${reward.rarity === 'uncommon' ? 'selected' : ''}>Non Comune</option>
                <option value="rare" ${reward.rarity === 'rare' ? 'selected' : ''}>Raro</option>
                <option value="epic" ${reward.rarity === 'epic' ? 'selected' : ''}>Epico</option>
                <option value="legendary" ${reward.rarity === 'legendary' ? 'selected' : ''}>Leggendario</option>
              </select>
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
    const form = document.getElementById('edit-reward-form');
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
        await this.eventManager.updateReward(rewardId, {
          name,
          description,
          type,
          value,
          imageUrl,
          rarity
        });
        
        this.uiManager.showNotification('Ricompensa aggiornata con successo', 'success');
        modal.remove();
        
        // Ricarica i dati delle ricompense
        await this.loadRewardsData();
        this._updateRewardsList();
      } catch (error) {
        console.error('Errore durante l\'aggiornamento della ricompensa:', error);
        this.uiManager.showNotification('Errore durante l\'aggiornamento della ricompensa', 'error');
      }
    });
  }
  
  /**
   * Mostra il form per la creazione di una nuova ricompensa
   */
  showCreateRewardForm() {
    const formHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <h3>Crea Nuova Ricompensa</h3>
          
          <form id="create-reward-form">
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
            
            <div class="form-group">
              <label for="event-select">Evento (opzionale):</label>
              <select id="event-select">
                <option value="">Nessun evento</option>
                <!-- Gli eventi verranno caricati dinamicamente -->
              </select>
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
    
    // Carica gli eventi disponibili
    this._loadAvailableEvents();
    
    // Aggiungi gli event listener
    const modal = document.querySelector('.modal-overlay');
    const form = document.getElementById('create-reward-form');
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
      const eventId = document.getElementById('event-select').value;
      
      try {
        await this.eventManager.createReward({
          name,
          description,
          type,
          value,
          imageUrl,
          rarity,
          eventId: eventId || null
        });
        
        this.uiManager.showNotification('Ricompensa creata con successo', 'success');
        modal.remove();
        
        // Ricarica i dati delle ricompense
        await this.loadRewardsData();
        this._updateRewardsList();
      } catch (error) {
        console.error('Errore durante la creazione della ricompensa:', error);
        this.uiManager.showNotification('Errore durante la creazione della ricompensa', 'error');
      }
    });
  }
  
  /**
   * Carica gli eventi disponibili
   * @private
   */
  async _loadAvailableEvents() {
    try {
      const events = await this.eventManager.getEvents({ status: 'active,upcoming' });
      
      const select = document.getElementById('event-select');
      if (select) {
        // Aggiungi le opzioni
        events.forEach(event => {
          const option = document.createElement('option');
          option.value = event._id;
          option.textContent = event.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Errore durante il caricamento degli eventi disponibili:', error);
    }
  }
  
  /**
   * Renderizza l'interfaccia
   * @private
   */
  _renderInterface() {
    const galleryHTML = `
      <div class="rewards-gallery">
        <div class="gallery-header">
          <h2 class="gallery-title">
            ${this.userId ? `Ricompense di ${this.user.nickname}` : 'Galleria delle Ricompense'}
          </h2>
          
          ${!this.userId ? `
            <div class="gallery-actions">
              <button class="create-reward-button">Crea Nuova Ricompensa</button>
            </div>
          ` : ''}
        </div>
        
        <div class="gallery-filters">
          <div class="filter-group">
            <label for="type-filter">Tipo:</label>
            <select id="type-filter">
              <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>Tutti</option>
              <option value="badge" ${this.filterType === 'badge' ? 'selected' : ''}>Badge</option>
              <option value="title" ${this.filterType === 'title' ? 'selected' : ''}>Titoli</option>
              <option value="cosmetic" ${this.filterType === 'cosmetic' ? 'selected' : ''}>Oggetti Cosmetici</option>
              <option value="points" ${this.filterType === 'points' ? 'selected' : ''}>Punti</option>
              <option value="currency" ${this.filterType === 'currency' ? 'selected' : ''}>Valuta</option>
              <option value="custom" ${this.filterType === 'custom' ? 'selected' : ''}>Personalizzati</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="rarity-filter">Rarità:</label>
            <select id="rarity-filter">
              <option value="all" ${this.filterRarity === 'all' ? 'selected' : ''}>Tutte</option>
              <option value="common" ${this.filterRarity === 'common' ? 'selected' : ''}>Comune</option>
              <option value="uncommon" ${this.filterRarity === 'uncommon' ? 'selected' : ''}>Non Comune</option>
              <option value="rare" ${this.filterRarity === 'rare' ? 'selected' : ''}>Raro</option>
              <option value="epic" ${this.filterRarity === 'epic' ? 'selected' : ''}>Epico</option>
              <option value="legendary" ${this.filterRarity === 'legendary' ? 'selected' : ''}>Leggendario</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="sort-by">Ordina per:</label>
            <select id="sort-by">
              <option value="date_desc" ${this.sortBy === 'date_desc' ? 'selected' : ''}>Data (più recenti)</option>
              <option value="date_asc" ${this.sortBy === 'date_asc' ? 'selected' : ''}>Data (più vecchi)</option>
              <option value="rarity_desc" ${this.sortBy === 'rarity_desc' ? 'selected' : ''}>Rarità (decrescente)</option>
              <option value="rarity_asc" ${this.sortBy === 'rarity_asc' ? 'selected' : ''}>Rarità (crescente)</option>
              <option value="name_asc" ${this.sortBy === 'name_asc' ? 'selected' : ''}>Nome (A-Z)</option>
              <option value="name_desc" ${this.sortBy === 'name_desc' ? 'selected' : ''}>Nome (Z-A)</option>
            </select>
          </div>
        </div>
        
        <div class="rewards-list">
          ${this._renderRewardsList()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = galleryHTML;
  }
  
  /**
   * Renderizza la lista delle ricompense
   * @returns {String} HTML della lista delle ricompense
   * @private
   */
  _renderRewardsList() {
    // Filtra le ricompense
    let filteredRewards = this.rewards;
    
    if (this.filterType !== 'all') {
      filteredRewards = filteredRewards.filter(reward => reward.type === this.filterType);
    }
    
    if (this.filterRarity !== 'all') {
      filteredRewards = filteredRewards.filter(reward => reward.rarity === this.filterRarity);
    }
    
    // Ordina le ricompense
    filteredRewards = this._sortRewards(filteredRewards, this.sortBy);
    
    if (filteredRewards.length === 0) {
      return `
        <div class="rewards-empty">
          <p>Nessuna ricompensa trovata.</p>
        </div>
      `;
    }
    
    let html = '<div class="rewards-grid">';
    
    filteredRewards.forEach(reward => {
      html += `
        <div class="reward-card ${reward.isEquipped ? 'equipped' : ''}" data-id="${reward._id}">
          <div class="reward-header">
            <h4 class="reward-name">${reward.name}</h4>
            <span class="reward-rarity ${reward.rarity}">${this._getRarityName(reward.rarity)}</span>
          </div>
          <div class="reward-image">
            <img src="${reward.imageUrl || '/assets/default-reward.png'}" alt="${reward.name}">
            ${reward.isEquipped ? '<span class="equipped-badge">Equipaggiata</span>' : ''}
          </div>
          <div class="reward-info">
            <p class="reward-type">${this._getRewardTypeName(reward.type)}</p>
            ${reward.event ? `<p class="reward-event">${reward.event.name}</p>` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Aggiorna solo il contenuto della lista se è già stata renderizzata
    const rewardsList = this.container.querySelector('.rewards-list');
    if (rewardsList) {
      rewardsList.innerHTML = html;
      this._attachRewardsEventListeners();
    }
    
    return html;
  }
  
  /**
   * Aggiorna la lista delle ricompense
   * @private
   */
  _updateRewardsList() {
    const rewardsList = this.container.querySelector('.rewards-list');
    if (rewardsList) {
      rewardsList.innerHTML = this._renderRewardsList();
      this._attachRewardsEventListeners();
    }
  }
  
  /**
   * Ordina le ricompense
   * @param {Array} rewards - Array di ricompense
   * @param {String} sortBy - Criterio di ordinamento
   * @returns {Array} Array di ricompense ordinato
   * @private
   */
  _sortRewards(rewards, sortBy) {
    const rarityOrder = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'epic': 4,
      'legendary': 5
    };
    
    switch (sortBy) {
      case 'date_asc':
        return [...rewards].sort((a, b) => new Date(a.obtainedAt || a.createdAt) - new Date(b.obtainedAt || b.createdAt));
      
      case 'date_desc':
        return [...rewards].sort((a, b) => new Date(b.obtainedAt || b.createdAt) - new Date(a.obtainedAt || a.createdAt));
      
      case 'rarity_asc':
        return [...rewards].sort((a, b) => (rarityOrder[a.rarity] || 0) - (rarityOrder[b.rarity] || 0));
      
      case 'rarity_desc':
        return [...rewards].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
      
      case 'name_asc':
        return [...rewards].sort((a, b) => a.name.localeCompare(b.name));
      
      case 'name_desc':
        return [...rewards].sort((a, b) => b.name.localeCompare(a.name));
      
      default:
        return rewards;
    }
  }
  
  /**
   * Aggiunge gli event listener
   * @private
   */
  _attachEventListeners() {
    // Filtri
    const typeFilter = this.container.querySelector('#type-filter');
    if (typeFilter) {
      typeFilter.addEventListener('change', () => {
        this.filterByType(typeFilter.value);
      });
    }
    
    const rarityFilter = this.container.querySelector('#rarity-filter');
    if (rarityFilter) {
      rarityFilter.addEventListener('change', () => {
        this.filterByRarity(rarityFilter.value);
      });
    }
    
    const sortBy = this.container.querySelector('#sort-by');
    if (sortBy) {
      sortBy.addEventListener('change', () => {
        this.sortRewards(sortBy.value);
      });
    }
    
    // Pulsante per creare una nuova ricompensa
    const createRewardButton = this.container.querySelector('.create-reward-button');
    if (createRewardButton) {
      createRewardButton.addEventListener('click', () => {
        this.showCreateRewardForm();
      });
    }
    
    // Aggiungi gli event listener per le ricompense
    this._attachRewardsEventListeners();
  }
  
  /**
   * Aggiunge gli event listener per le ricompense
   * @private
   */
  _attachRewardsEventListeners() {
    const rewardCards = this.container.querySelectorAll('.reward-card');
    rewardCards.forEach(card => {
      card.addEventListener('click', () => {
        const rewardId = card.dataset.id;
        this.showRewardDetails(rewardId);
      });
    });
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
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RewardsGalleryUI;
} else {
  window.RewardsGalleryUI = RewardsGalleryUI;
}
