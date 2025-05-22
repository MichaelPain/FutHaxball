// profile.js - Gestisce il profilo utente e le statistiche

export class ProfileManager {
    constructor(uiManager, authManager, networkManager) {
        this.uiManager = uiManager;
        this.authManager = authManager;
        this.networkManager = networkManager;
        
        // Elementi DOM
        this.profileScreen = null;
        this.profileContainer = null;
        this.statsContainer = null;
        this.achievementsContainer = null;
        this.historyContainer = null;
        this.settingsContainer = null;
        this.backButton = null;
        
        // Tab corrente
        this.currentTab = 'stats';
        
        // Modalità statistica corrente
        this.currentStatsMode = '1v1';
    }
    
    initUI() {
        console.log("Inizializzazione UI profilo");
        
        // Ottieni il riferimento alla schermata del profilo
        this.profileScreen = document.getElementById('profile-screen');
        
        if (!this.profileScreen) {
            console.error('Elemento profile-screen non trovato');
            return;
        }
        
        // Verifica se l'utente è autenticato
        if (!this.authManager.isLoggedIn()) {
            this.uiManager.showNotification('Devi effettuare il login per visualizzare il profilo', 'error');
            this.uiManager.showScreen('auth-screen');
            return;
        }
        
        // Crea l'interfaccia utente
        this.createProfileUI();
        
        // Configura gli event listener
        this.setupEventListeners();
        
        // Mostra la tab corrente
        this.showTab(this.currentTab);
    }
    
    createProfileUI() {
        // Pulisci la schermata
        this.profileScreen.innerHTML = '';
        
        // Crea il container principale
        const container = document.createElement('div');
        container.className = 'profile-container';
        this.profileContainer = container;
        
        // Ottieni i dati dell'utente
        const user = this.authManager.getUser();
        
        // Crea l'header del profilo
        const header = document.createElement('div');
        header.className = 'profile-header';
        
        const avatar = document.createElement('div');
        avatar.className = 'profile-avatar';
        avatar.innerHTML = `<span>${user.nickname.charAt(0).toUpperCase()}</span>`;
        
        // Aggiungi pulsante per cambiare avatar
        const changeAvatarBtn = document.createElement('button');
        changeAvatarBtn.className = 'change-avatar-btn';
        changeAvatarBtn.textContent = 'Cambia Avatar';
        changeAvatarBtn.addEventListener('click', () => {
            this.showAvatarSelectionModal();
        });
        
        const avatarContainer = document.createElement('div');
        avatarContainer.className = 'avatar-container';
        avatarContainer.appendChild(avatar);
        avatarContainer.appendChild(changeAvatarBtn);
        
        header.appendChild(avatarContainer);
        
        const userInfo = document.createElement('div');
        userInfo.className = 'profile-user-info';
        
        // Aggiungi nome utente con pulsante modifica
        const nicknameContainer = document.createElement('div');
        nicknameContainer.className = 'nickname-container';
        
        const nickname = document.createElement('h2');
        nickname.textContent = user.nickname;
        
        const editNicknameBtn = document.createElement('button');
        editNicknameBtn.className = 'edit-btn';
        editNicknameBtn.setAttribute('data-field', 'nickname');
        editNicknameBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editNicknameBtn.addEventListener('click', () => {
            this.showEditFieldModal('nickname', user.nickname);
        });
        
        nicknameContainer.appendChild(nickname);
        nicknameContainer.appendChild(editNicknameBtn);
        userInfo.appendChild(nicknameContainer);
        
        // Aggiungi dettagli utente
        const userDetails = document.createElement('div');
        userDetails.className = 'profile-user-details';
        
        // Livello
        const levelContainer = document.createElement('div');
        levelContainer.className = 'detail-container';
        
        const level = document.createElement('span');
        level.className = 'profile-level';
        level.textContent = `Livello ${this.generateRandomLevel()}`;
        
        levelContainer.appendChild(level);
        userDetails.appendChild(levelContainer);
        
        // Rank
        const rankContainer = document.createElement('div');
        rankContainer.className = 'detail-container';
        
        const rank = document.createElement('span');
        rank.className = 'profile-rank';
        rank.textContent = `Rank: ${this.generateRandomRank()}`;
        
        rankContainer.appendChild(rank);
        userDetails.appendChild(rankContainer);
        
        // Email
        const emailContainer = document.createElement('div');
        emailContainer.className = 'detail-container';
        
        const email = document.createElement('span');
        email.className = 'profile-email';
        email.textContent = user.email || 'email@example.com';
        
        const editEmailBtn = document.createElement('button');
        editEmailBtn.className = 'edit-btn';
        editEmailBtn.setAttribute('data-field', 'email');
        editEmailBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editEmailBtn.addEventListener('click', () => {
            this.showEditFieldModal('email', user.email || 'email@example.com');
        });
        
        emailContainer.appendChild(email);
        emailContainer.appendChild(editEmailBtn);
        userDetails.appendChild(emailContainer);
        
        // Pulsante cambio password
        const changePasswordBtn = document.createElement('button');
        changePasswordBtn.className = 'change-password-btn';
        changePasswordBtn.textContent = 'Cambia Password';
        changePasswordBtn.addEventListener('click', () => {
            this.showChangePasswordModal();
        });
        
        userDetails.appendChild(changePasswordBtn);
        userInfo.appendChild(userDetails);
        
        header.appendChild(userInfo);
        container.appendChild(header);
        
        // Crea i tab
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'profile-tabs';
        
        const tabs = [
            { id: 'stats', label: 'Statistiche' },
            { id: 'achievements', label: 'Obiettivi' },
            { id: 'history', label: 'Cronologia' },
            { id: 'settings', label: 'Impostazioni' }
        ];
        
        tabs.forEach(tab => {
            const tabButton = document.createElement('button');
            tabButton.className = `profile-tab ${tab.id === this.currentTab ? 'active' : ''}`;
            tabButton.dataset.tab = tab.id;
            tabButton.textContent = tab.label;
            tabButton.id = `profile-tab-${tab.id}`;
            tabsContainer.appendChild(tabButton);
        });
        
        container.appendChild(tabsContainer);
        
        // Crea i contenitori per i contenuti dei tab
        this.statsContainer = document.createElement('div');
        this.statsContainer.className = 'profile-content stats-content';
        this.statsContainer.id = 'stats-content';
        container.appendChild(this.statsContainer);
        
        this.achievementsContainer = document.createElement('div');
        this.achievementsContainer.className = 'profile-content achievements-content';
        this.achievementsContainer.id = 'achievements-content';
        this.achievementsContainer.style.display = 'none';
        container.appendChild(this.achievementsContainer);
        
        this.historyContainer = document.createElement('div');
        this.historyContainer.className = 'profile-content history-content';
        this.historyContainer.id = 'history-content';
        this.historyContainer.style.display = 'none';
        container.appendChild(this.historyContainer);
        
        this.settingsContainer = document.createElement('div');
        this.settingsContainer.className = 'profile-content settings-content';
        this.settingsContainer.id = 'settings-content';
        this.settingsContainer.style.display = 'none';
        container.appendChild(this.settingsContainer);
        
        // Crea il footer
        const footer = document.createElement('div');
        footer.className = 'profile-footer';
        
        // Pulsante per tornare indietro
        this.backButton = document.createElement('button');
        this.backButton.className = 'back-btn';
        this.backButton.textContent = 'Indietro';
        this.backButton.id = 'profile-back-button';
        
        footer.appendChild(this.backButton);
        container.appendChild(footer);
        
        // Aggiungi il container alla schermata
        this.profileScreen.appendChild(container);
        
        // Aggiungi stili CSS personalizzati
        this.addCustomStyles();
        
        // Popola i contenuti dei tab
        this.populateStatsTab();
        this.populateAchievementsTab();
        this.populateHistoryTab();
        this.populateSettingsTab();
    }
    
    setupEventListeners() {
        console.log("Configurazione event listener per il profilo");
        
        // Tab
        const tabs = this.profileContainer.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                console.log(`Cambio tab: ${tabId}`);
                
                // Rimuovi la classe active da tutti i tab
                tabs.forEach(t => t.classList.remove('active'));
                
                // Aggiungi la classe active al tab corrente
                tab.classList.add('active');
                
                // Mostra il contenuto del tab
                this.showTab(tabId);
            });
        });
        
        // Pulsante per tornare indietro
        this.backButton.addEventListener('click', () => {
            console.log("Torno al menu principale");
            this.uiManager.showScreen('main-menu-screen');
        });
        
        // Pulsanti nelle impostazioni
        const saveSettingsButton = document.getElementById('save-profile-settings');
        if (saveSettingsButton) {
            saveSettingsButton.addEventListener('click', () => {
                this.saveProfileSettings();
            });
        }
        
        const resetSettingsButton = document.getElementById('reset-profile-settings');
        if (resetSettingsButton) {
            resetSettingsButton.addEventListener('click', () => {
                this.resetProfileSettings();
            });
        }
    }
    
    setupStatsModeButtons() {
        // Configura i pulsanti per le modalità delle statistiche
        const modeButtons = this.statsContainer.querySelectorAll('.stats-tab');
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.getAttribute('data-mode');
                console.log(`Cambio modalità statistiche: ${mode}`);
                
                // Rimuovi la classe active da tutti i pulsanti
                modeButtons.forEach(btn => btn.classList.remove('active'));
                
                // Aggiungi la classe active al pulsante corrente
                button.classList.add('active');
                
                // Aggiorna le statistiche per la modalità selezionata
                this.updateStatsForMode(mode);
            });
        });
    }
    
    showTab(tabId) {
        console.log(`Mostro tab: ${tabId}`);
        
        // Aggiorna il tab corrente
        this.currentTab = tabId;
        
        // Nascondi tutti i contenuti
        this.statsContainer.style.display = 'none';
        this.achievementsContainer.style.display = 'none';
        this.historyContainer.style.display = 'none';
        this.settingsContainer.style.display = 'none';
        
        // Mostra il contenuto del tab corrente
        switch (tabId) {
            case 'stats':
                this.statsContainer.style.display = 'block';
                break;
            case 'achievements':
                this.achievementsContainer.style.display = 'block';
                break;
            case 'history':
                this.historyContainer.style.display = 'block';
                break;
            case 'settings':
                this.settingsContainer.style.display = 'block';
                break;
        }
    }
    
    populateStatsTab() {
        // Crea i tab per le diverse modalità
        const statsModesTabs = document.createElement('div');
        statsModesTabs.className = 'stats-modes-tabs';
        
        const modes = [
            { id: '1v1', label: '1v1' },
            { id: '2v2', label: '2v2' },
            { id: '3v3+', label: '3v3+' }
        ];
        
        modes.forEach(mode => {
            const modeButton = document.createElement('button');
            modeButton.className = `stats-tab ${mode.id === this.currentStatsMode ? 'active' : ''}`;
            modeButton.dataset.mode = mode.id;
            modeButton.textContent = mode.label;
            statsModesTabs.appendChild(modeButton);
        });
        
        this.statsContainer.appendChild(statsModesTabs);
        
        // Contenitore per le statistiche
        const statsContent = document.createElement('div');
        statsContent.className = 'stats-content-container';
        this.statsContainer.appendChild(statsContent);
        
        // Aggiorna le statistiche per la modalità corrente
        this.updateStatsForMode(this.currentStatsMode);
        
        // Configura i pulsanti per le modalità
        this.setupStatsModeButtons();
    }
    
    updateStatsForMode(mode) {
        // Aggiorna la modalità corrente
        this.currentStatsMode = mode;
        
        // Genera statistiche casuali per la versione di sviluppo
        const stats = this.generateRandomStats(mode);
        
        // Ottieni il contenitore delle statistiche
        const statsContent = this.statsContainer.querySelector('.stats-content-container');
        
        // Crea il contenuto delle statistiche
        let content = `
            <h3>Statistiche ${this.getModeDisplayName(mode)}</h3>
            
            <div class="stats-section">
                <h4>Generali</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Partite giocate</span>
                        <span class="stat-value">${stats.gamesPlayed}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Vittorie</span>
                        <span class="stat-value">${stats.wins}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sconfitte</span>
                        <span class="stat-value">${stats.losses}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Percentuale vittorie</span>
                        <span class="stat-value">${stats.winRate}%</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-section">
                <h4>Prestazioni</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Goal segnati</span>
                        <span class="stat-value">${stats.goals}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Assist</span>
                        <span class="stat-value">${stats.assists}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Goal per partita</span>
                        <span class="stat-value">${stats.goalsPerGame}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Assist per partita</span>
                        <span class="stat-value">${stats.assistsPerGame}</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-section">
                <h4>Classifiche</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">MMR</span>
                        <span class="stat-value">${stats.mmr}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Rank</span>
                        <span class="stat-value">${stats.rank}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Posizione</span>
                        <span class="stat-value">${stats.position}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Miglior posizione</span>
                        <span class="stat-value">${stats.bestPosition}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Aggiungi statistiche specifiche per la modalità 3v3+
        if (mode === '3v3+') {
            content += `
                <div class="stats-section">
                    <h4>Dettagli 3v3+</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">3v3 Partite</span>
                            <span class="stat-value">${stats.games3v3}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">4v4 Partite</span>
                            <span class="stat-value">${stats.games4v4}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">5v5 Partite</span>
                            <span class="stat-value">${stats.games5v5}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Modalità preferita</span>
                            <span class="stat-value">${stats.favoriteTeamSize}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Aggiungi il grafico MMR
        content += `
            <div class="stats-section">
                <h4>Andamento MMR</h4>
                <div class="mmr-chart">
                    <div class="chart-placeholder">
                        <p>Grafico MMR non disponibile nella versione di sviluppo</p>
                    </div>
                </div>
            </div>
        `;
        
        // Aggiorna il contenuto
        statsContent.innerHTML = content;
    }
    
    populateAchievementsTab() {
        // Genera obiettivi casuali per la versione di sviluppo
        const achievements = this.generateRandomAchievements();
        
        // Crea il contenuto del tab obiettivi
        let content = `
            <h3>Obiettivi</h3>
            <div class="achievements-grid">
        `;
        
        // Aggiungi gli obiettivi
        achievements.forEach(achievement => {
            content += `
                <div class="achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                        <div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                            </div>
                            <span class="progress-text">${achievement.progress}%</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        content += `
            </div>
        `;
        
        this.achievementsContainer.innerHTML = content;
    }
    
    populateHistoryTab() {
        // Genera cronologia partite casuali per la versione di sviluppo
        const matches = this.generateRandomMatches();
        
        // Crea il contenuto del tab cronologia
        let content = `
            <h3>Cronologia Partite</h3>
            <div class="match-history-list">
        `;
        
        // Aggiungi le partite
        matches.forEach(match => {
            content += `
                <div class="match-item ${match.result === 'Vittoria' ? 'win' : match.result === 'Sconfitta' ? 'loss' : 'draw'}">
                    <div class="match-header">
                        <span class="match-mode">${match.mode}</span>
                        <span class="match-date">${match.date}</span>
                        <span class="match-result">${match.result}</span>
                    </div>
                    <div class="match-details">
                        <div class="match-teams">
                            <div class="match-team red">
                                <span class="team-name">Squadra Rossa</span>
                                <div class="team-players">
                                    ${match.redTeam.map(player => `
                                        <div class="team-player">
                                            <span class="player-name">${player.name}</span>
                                            <span class="player-stats">${player.goals}G ${player.assists}A</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="match-score">
                                <span>${match.redScore} - ${match.blueScore}</span>
                            </div>
                            <div class="match-team blue">
                                <span class="team-name">Squadra Blu</span>
                                <div class="team-players">
                                    ${match.blueTeam.map(player => `
                                        <div class="team-player">
                                            <span class="player-name">${player.name}</span>
                                            <span class="player-stats">${player.goals}G ${player.assists}A</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        content += `
            </div>
        `;
        
        this.historyContainer.innerHTML = content;
    }
    
    populateSettingsTab() {
        // Crea il contenuto del tab impostazioni
        let content = `
            <h3>Impostazioni Profilo</h3>
            
            <div class="settings-section">
                <h4>Notifiche</h4>
                <div class="settings-grid">
                    <div class="setting-item">
                        <label for="notification-messages">Messaggi</label>
                        <input type="checkbox" id="notification-messages" checked>
                    </div>
                    <div class="setting-item">
                        <label for="notification-invites">Inviti</label>
                        <input type="checkbox" id="notification-invites" checked>
                    </div>
                    <div class="setting-item">
                        <label for="notification-friends">Amici</label>
                        <input type="checkbox" id="notification-friends" checked>
                    </div>
                    <div class="setting-item">
                        <label for="notification-tournaments">Tornei</label>
                        <input type="checkbox" id="notification-tournaments" checked>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Privacy</h4>
                <div class="settings-grid">
                    <div class="setting-item">
                        <label for="privacy-profile">Profilo pubblico</label>
                        <input type="checkbox" id="privacy-profile" checked>
                    </div>
                    <div class="setting-item">
                        <label for="privacy-stats">Statistiche pubbliche</label>
                        <input type="checkbox" id="privacy-stats" checked>
                    </div>
                    <div class="setting-item">
                        <label for="privacy-history">Cronologia pubblica</label>
                        <input type="checkbox" id="privacy-history" checked>
                    </div>
                    <div class="setting-item">
                        <label for="privacy-online">Stato online</label>
                        <input type="checkbox" id="privacy-online" checked>
                    </div>
                </div>
            </div>
            
            <div class="settings-actions">
                <button id="reset-profile-settings" class="btn-secondary">Ripristina</button>
                <button id="save-profile-settings" class="btn-primary">Salva</button>
            </div>
        `;
        
        this.settingsContainer.innerHTML = content;
    }
    
    showAvatarSelectionModal() {
        // Crea il modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        // Crea il contenuto del modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Titolo
        const title = document.createElement('h3');
        title.textContent = 'Seleziona Avatar';
        modalContent.appendChild(title);
        
        // Griglia di avatar
        const avatarGrid = document.createElement('div');
        avatarGrid.className = 'avatar-grid';
        
        // Crea alcuni avatar di esempio
        const avatars = [
            { id: 'avatar1', emoji: '😀' },
            { id: 'avatar2', emoji: '🎮' },
            { id: 'avatar3', emoji: '⚽' },
            { id: 'avatar4', emoji: '🏆' },
            { id: 'avatar5', emoji: '🚀' },
            { id: 'avatar6', emoji: '🔥' },
            { id: 'avatar7', emoji: '🌟' },
            { id: 'avatar8', emoji: '🎯' },
            { id: 'avatar9', emoji: '🎲' }
        ];
        
        avatars.forEach(avatar => {
            const avatarItem = document.createElement('div');
            avatarItem.className = 'avatar-item';
            avatarItem.textContent = avatar.emoji;
            avatarItem.addEventListener('click', () => {
                // Simula la selezione dell'avatar
                this.uiManager.showNotification('Avatar aggiornato!', 'success');
                modal.remove();
            });
            avatarGrid.appendChild(avatarItem);
        });
        
        modalContent.appendChild(avatarGrid);
        
        // Pulsante per caricare un avatar personalizzato
        const uploadButton = document.createElement('button');
        uploadButton.className = 'btn-secondary';
        uploadButton.textContent = 'Carica immagine';
        uploadButton.addEventListener('click', () => {
            this.uiManager.showNotification('Funzionalità di caricamento in arrivo!', 'info');
        });
        modalContent.appendChild(uploadButton);
        
        // Pulsante per chiudere il modal
        const closeButton = document.createElement('button');
        closeButton.className = 'btn-primary';
        closeButton.textContent = 'Annulla';
        closeButton.addEventListener('click', () => {
            modal.remove();
        });
        modalContent.appendChild(closeButton);
        
        // Aggiungi il contenuto al modal
        modal.appendChild(modalContent);
        
        // Aggiungi il modal al documento
        document.body.appendChild(modal);
    }
    
    showEditFieldModal(field, currentValue) {
        // Crea il modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        // Crea il contenuto del modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Titolo
        const title = document.createElement('h3');
        title.textContent = `Modifica ${this.getFieldDisplayName(field)}`;
        modalContent.appendChild(title);
        
        // Campo di input
        const input = document.createElement('input');
        input.type = field === 'email' ? 'email' : 'text';
        input.value = currentValue;
        input.className = 'modal-input';
        modalContent.appendChild(input);
        
        // Pulsanti azione
        const actionButtons = document.createElement('div');
        actionButtons.className = 'modal-actions';
        
        // Pulsante annulla
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'Annulla';
        cancelButton.addEventListener('click', () => {
            modal.remove();
        });
        actionButtons.appendChild(cancelButton);
        
        // Pulsante salva
        const saveButton = document.createElement('button');
        saveButton.className = 'btn-primary';
        saveButton.textContent = 'Salva';
        saveButton.addEventListener('click', () => {
            // Simula il salvataggio
            this.uiManager.showNotification(`${this.getFieldDisplayName(field)} aggiornato!`, 'success');
            modal.remove();
        });
        actionButtons.appendChild(saveButton);
        
        modalContent.appendChild(actionButtons);
        
        // Aggiungi il contenuto al modal
        modal.appendChild(modalContent);
        
        // Aggiungi il modal al documento
        document.body.appendChild(modal);
    }
    
    showChangePasswordModal() {
        // Crea il modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        // Crea il contenuto del modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        // Titolo
        const title = document.createElement('h3');
        title.textContent = 'Cambia Password';
        modalContent.appendChild(title);
        
        // Campi di input
        const currentPasswordGroup = document.createElement('div');
        currentPasswordGroup.className = 'form-group';
        
        const currentPasswordLabel = document.createElement('label');
        currentPasswordLabel.textContent = 'Password attuale:';
        currentPasswordGroup.appendChild(currentPasswordLabel);
        
        const currentPasswordInput = document.createElement('input');
        currentPasswordInput.type = 'password';
        currentPasswordInput.className = 'modal-input';
        currentPasswordGroup.appendChild(currentPasswordInput);
        
        modalContent.appendChild(currentPasswordGroup);
        
        const newPasswordGroup = document.createElement('div');
        newPasswordGroup.className = 'form-group';
        
        const newPasswordLabel = document.createElement('label');
        newPasswordLabel.textContent = 'Nuova password:';
        newPasswordGroup.appendChild(newPasswordLabel);
        
        const newPasswordInput = document.createElement('input');
        newPasswordInput.type = 'password';
        newPasswordInput.className = 'modal-input';
        newPasswordGroup.appendChild(newPasswordInput);
        
        modalContent.appendChild(newPasswordGroup);
        
        const confirmPasswordGroup = document.createElement('div');
        confirmPasswordGroup.className = 'form-group';
        
        const confirmPasswordLabel = document.createElement('label');
        confirmPasswordLabel.textContent = 'Conferma nuova password:';
        confirmPasswordGroup.appendChild(confirmPasswordLabel);
        
        const confirmPasswordInput = document.createElement('input');
        confirmPasswordInput.type = 'password';
        confirmPasswordInput.className = 'modal-input';
        confirmPasswordGroup.appendChild(confirmPasswordInput);
        
        modalContent.appendChild(confirmPasswordGroup);
        
        // Pulsanti azione
        const actionButtons = document.createElement('div');
        actionButtons.className = 'modal-actions';
        
        // Pulsante annulla
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'Annulla';
        cancelButton.addEventListener('click', () => {
            modal.remove();
        });
        actionButtons.appendChild(cancelButton);
        
        // Pulsante salva
        const saveButton = document.createElement('button');
        saveButton.className = 'btn-primary';
        saveButton.textContent = 'Cambia Password';
        saveButton.addEventListener('click', () => {
            // Simula il cambio password
            this.uiManager.showNotification('Password aggiornata con successo!', 'success');
            modal.remove();
        });
        actionButtons.appendChild(saveButton);
        
        modalContent.appendChild(actionButtons);
        
        // Aggiungi il contenuto al modal
        modal.appendChild(modalContent);
        
        // Aggiungi il modal al documento
        document.body.appendChild(modal);
    }
    
    saveProfileSettings() {
        // Simula il salvataggio delle impostazioni
        this.uiManager.showNotification('Impostazioni del profilo salvate!', 'success');
    }
    
    resetProfileSettings() {
        // Simula il ripristino delle impostazioni
        
        // Ripristina i checkbox
        const checkboxes = this.settingsContainer.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        
        this.uiManager.showNotification('Impostazioni del profilo ripristinate!', 'info');
    }
    
    // Metodi di utilità
    generateRandomLevel() {
        return Math.floor(Math.random() * 100) + 1;
    }
    
    generateRandomRank() {
        const ranks = ['Bronzo', 'Argento', 'Oro', 'Platino', 'Diamante', 'Campione', 'Gran Campione'];
        const divisions = ['I', 'II', 'III', 'IV'];
        
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        const division = divisions[Math.floor(Math.random() * divisions.length)];
        
        return `${rank} ${division}`;
    }
    
    generateRandomStats(mode = '1v1') {
        const gamesPlayed = Math.floor(Math.random() * 500) + 50;
        const wins = Math.floor(Math.random() * gamesPlayed);
        const losses = gamesPlayed - wins;
        const winRate = Math.floor((wins / gamesPlayed) * 100);
        
        const goals = Math.floor(Math.random() * 1000) + 100;
        const assists = Math.floor(Math.random() * 500) + 50;
        
        const goalsPerGame = (goals / gamesPlayed).toFixed(2);
        const assistsPerGame = (assists / gamesPlayed).toFixed(2);
        
        const mmr = Math.floor(Math.random() * 1000) + 500;
        const position = Math.floor(Math.random() * 10000) + 1;
        const bestPosition = Math.floor(Math.random() * position) + 1;
        
        const stats = {
            gamesPlayed,
            wins,
            losses,
            winRate,
            goals,
            assists,
            goalsPerGame,
            assistsPerGame,
            mmr,
            rank: this.generateRandomRank(),
            position,
            bestPosition,
            favoriteMode: ['1v1', '2v2', '3v3+'][Math.floor(Math.random() * 3)]
        };
        
        // Aggiungi statistiche specifiche per la modalità 3v3+
        if (mode === '3v3+') {
            stats.games3v3 = Math.floor(Math.random() * 200) + 20;
            stats.games4v4 = Math.floor(Math.random() * 150) + 15;
            stats.games5v5 = Math.floor(Math.random() * 100) + 10;
            stats.favoriteTeamSize = ['3v3', '4v4', '5v5'][Math.floor(Math.random() * 3)];
        }
        
        return stats;
    }
    
    generateRandomAchievements() {
        const achievements = [
            {
                name: 'Primo Goal',
                description: 'Segna il tuo primo goal',
                icon: '⚽',
                progress: 100,
                unlocked: true
            },
            {
                name: 'Bomber',
                description: 'Segna 100 goal',
                icon: '🔥',
                progress: 78,
                unlocked: false
            },
            {
                name: 'Assistman',
                description: 'Fornisci 50 assist',
                icon: '👟',
                progress: 92,
                unlocked: false
            },
            {
                name: 'Vincitore',
                description: 'Vinci 10 partite consecutive',
                icon: '🏆',
                progress: 40,
                unlocked: false
            },
            {
                name: 'Campione',
                description: 'Raggiungi il rank Campione',
                icon: '👑',
                progress: 65,
                unlocked: false
            },
            {
                name: 'Veterano',
                description: 'Gioca 1000 partite',
                icon: '🎮',
                progress: 32,
                unlocked: false
            }
        ];
        
        return achievements;
    }
    
    generateRandomMatches() {
        const matches = [];
        
        for (let i = 0; i < 5; i++) {
            const redScore = Math.floor(Math.random() * 5);
            const blueScore = Math.floor(Math.random() * 5);
            
            let result;
            if (redScore > blueScore) {
                result = 'Vittoria';
            } else if (redScore < blueScore) {
                result = 'Sconfitta';
            } else {
                result = 'Pareggio';
            }
            
            const modes = ['1v1', '2v2', '3v3', '4v4', '5v5'];
            const mode = modes[Math.floor(Math.random() * modes.length)];
            
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toLocaleDateString();
            
            const redTeam = [];
            const blueTeam = [];
            
            // Numero di giocatori per squadra in base alla modalità
            const playersPerTeam = parseInt(mode.charAt(0), 10);
            
            for (let j = 0; j < playersPerTeam; j++) {
                redTeam.push({
                    name: `Giocatore${j + 1}`,
                    goals: Math.floor(Math.random() * 3),
                    assists: Math.floor(Math.random() * 2)
                });
                
                blueTeam.push({
                    name: `Avversario${j + 1}`,
                    goals: Math.floor(Math.random() * 3),
                    assists: Math.floor(Math.random() * 2)
                });
            }
            
            matches.push({
                mode,
                date: dateString,
                result,
                redScore,
                blueScore,
                redTeam,
                blueTeam
            });
        }
        
        return matches;
    }
    
    getFieldDisplayName(field) {
        switch (field) {
            case 'nickname': return 'Nickname';
            case 'email': return 'Email';
            default: return field;
        }
    }
    
    getModeDisplayName(mode) {
        switch (mode) {
            case '1v1': return 'Solo (1v1)';
            case '2v2': return 'Doubles (2v2)';
            case '3v3+': return 'Team (3v3+)';
            default: return mode;
        }
    }
    
    addCustomStyles() {
        // Aggiungi stili CSS personalizzati se non esistono già
        if (!document.getElementById('profile-custom-styles')) {
            const style = document.createElement('style');
            style.id = 'profile-custom-styles';
            style.textContent = `
                .profile-container {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #1a1a1a;
                    border-radius: 8px;
                    color: #fff;
                }
                
                .profile-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #333;
                }
                
                .avatar-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-right: 30px;
                }
                
                .profile-avatar {
                    width: 100px;
                    height: 100px;
                    background-color: #4caf50;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 10px;
                }
                
                .profile-avatar span {
                    font-size: 48px;
                    color: white;
                }
                
                .change-avatar-btn {
                    background-color: #333;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .change-avatar-btn:hover {
                    background-color: #444;
                }
                
                .profile-user-info {
                    flex: 1;
                }
                
                .nickname-container {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                }
                
                .nickname-container h2 {
                    margin: 0;
                    margin-right: 10px;
                    font-size: 28px;
                }
                
                .profile-user-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .detail-container {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .profile-level, .profile-rank, .profile-email {
                    font-size: 16px;
                    color: #ccc;
                }
                
                .edit-btn {
                    background-color: transparent;
                    color: #4caf50;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 5px;
                }
                
                .edit-btn:hover {
                    color: #6abf69;
                }
                
                .change-password-btn {
                    background-color: #2196f3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 15px;
                    font-size: 14px;
                }
                
                .change-password-btn:hover {
                    background-color: #0b7dda;
                }
                
                .profile-tabs {
                    display: flex;
                    border-bottom: 1px solid #333;
                    margin-bottom: 20px;
                }
                
                .profile-tab {
                    background-color: transparent;
                    color: #ccc;
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                    font-size: 16px;
                    position: relative;
                }
                
                .profile-tab.active {
                    color: #4caf50;
                }
                
                .profile-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background-color: #4caf50;
                }
                
                .profile-content {
                    padding: 20px 0;
                }
                
                .stats-modes-tabs {
                    display: flex;
                    margin-bottom: 20px;
                    background-color: #222;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .stats-tab {
                    background-color: transparent;
                    color: #ccc;
                    border: none;
                    padding: 10px 20px;
                    cursor: pointer;
                    flex: 1;
                    text-align: center;
                }
                
                .stats-tab.active {
                    background-color: #4caf50;
                    color: white;
                }
                
                .stats-section {
                    margin-bottom: 30px;
                }
                
                .stats-section h4 {
                    margin-bottom: 15px;
                    color: #4caf50;
                    border-bottom: 1px solid #333;
                    padding-bottom: 5px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .stat-item {
                    background-color: #222;
                    padding: 15px;
                    border-radius: 4px;
                    display: flex;
                    flex-direction: column;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: #ccc;
                    margin-bottom: 5px;
                }
                
                .stat-value {
                    font-size: 20px;
                    font-weight: bold;
                    color: white;
                }
                
                .mmr-chart {
                    background-color: #222;
                    border-radius: 4px;
                    padding: 20px;
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .chart-placeholder {
                    text-align: center;
                    color: #666;
                }
                
                .achievements-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .achievement-item {
                    background-color: #222;
                    border-radius: 4px;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                }
                
                .achievement-item.unlocked {
                    border-left: 4px solid #4caf50;
                }
                
                .achievement-item.locked {
                    border-left: 4px solid #666;
                    opacity: 0.7;
                }
                
                .achievement-icon {
                    font-size: 32px;
                    margin-right: 15px;
                    width: 40px;
                    text-align: center;
                }
                
                .achievement-info {
                    flex: 1;
                }
                
                .achievement-info h4 {
                    margin: 0 0 5px 0;
                }
                
                .achievement-info p {
                    margin: 0 0 10px 0;
                    font-size: 14px;
                    color: #ccc;
                }
                
                .achievement-progress {
                    display: flex;
                    align-items: center;
                }
                
                .progress-bar {
                    flex: 1;
                    height: 6px;
                    background-color: #333;
                    border-radius: 3px;
                    overflow: hidden;
                    margin-right: 10px;
                }
                
                .progress-fill {
                    height: 100%;
                    background-color: #4caf50;
                }
                
                .progress-text {
                    font-size: 12px;
                    color: #ccc;
                }
                
                .match-history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                
                .match-item {
                    background-color: #222;
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .match-item.win {
                    border-left: 4px solid #4caf50;
                }
                
                .match-item.loss {
                    border-left: 4px solid #f44336;
                }
                
                .match-item.draw {
                    border-left: 4px solid #ff9800;
                }
                
                .match-header {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 15px;
                    background-color: rgba(0, 0, 0, 0.2);
                }
                
                .match-mode {
                    font-weight: bold;
                }
                
                .match-date {
                    color: #ccc;
                }
                
                .match-result {
                    font-weight: bold;
                }
                
                .match-item.win .match-result {
                    color: #4caf50;
                }
                
                .match-item.loss .match-result {
                    color: #f44336;
                }
                
                .match-item.draw .match-result {
                    color: #ff9800;
                }
                
                .match-details {
                    padding: 15px;
                }
                
                .match-teams {
                    display: flex;
                    align-items: center;
                }
                
                .match-team {
                    flex: 1;
                }
                
                .match-team.red {
                    color: #f44336;
                }
                
                .match-team.blue {
                    color: #2196f3;
                    text-align: right;
                }
                
                .team-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                    display: block;
                }
                
                .team-players {
                    font-size: 14px;
                    color: #ccc;
                }
                
                .team-player {
                    margin: 3px 0;
                }
                
                .match-score {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 0 20px;
                }
                
                .settings-section {
                    margin-bottom: 30px;
                }
                
                .settings-section h4 {
                    margin-bottom: 15px;
                    color: #4caf50;
                    border-bottom: 1px solid #333;
                    padding-bottom: 5px;
                }
                
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #222;
                    padding: 10px 15px;
                    border-radius: 4px;
                }
                
                .settings-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-top: 20px;
                }
                
                .btn-primary {
                    background-color: #4caf50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .btn-secondary {
                    background-color: #666;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .profile-footer {
                    margin-top: 30px;
                    display: flex;
                    justify-content: center;
                }
                
                .back-btn {
                    background-color: #333;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal-content {
                    background-color: #222;
                    padding: 20px;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 100%;
                }
                
                .modal-content h3 {
                    margin-top: 0;
                    margin-bottom: 20px;
                    color: #4caf50;
                }
                
                .modal-input {
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 15px;
                    background-color: #333;
                    border: 1px solid #444;
                    color: white;
                    border-radius: 4px;
                }
                
                .form-group {
                    margin-bottom: 15px;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    color: #ccc;
                }
                
                .modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .avatar-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .avatar-item {
                    width: 60px;
                    height: 60px;
                    background-color: #333;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    cursor: pointer;
                }
                
                .avatar-item:hover {
                    background-color: #444;
                }
                
                @media (max-width: 768px) {
                    .profile-header {
                        flex-direction: column;
                        text-align: center;
                    }
                    
                    .avatar-container {
                        margin-right: 0;
                        margin-bottom: 20px;
                    }
                    
                    .nickname-container {
                        justify-content: center;
                    }
                    
                    .profile-user-details {
                        grid-template-columns: 1fr;
                    }
                    
                    .stats-grid, .settings-grid, .achievements-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .match-teams {
                        flex-direction: column;
                    }
                    
                    .match-team.blue {
                        text-align: left;
                        margin-top: 10px;
                    }
                    
                    .match-score {
                        margin: 10px 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}
