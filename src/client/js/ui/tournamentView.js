// Implementazione della visualizzazione del torneo

export class TournamentView {
    constructor(screenManager, tournamentManager) {
        this.screenManager = screenManager;
        this.tournamentManager = tournamentManager;
        this.currentTournament = null;
        this.bracketView = null;
        this.matchDetails = null;
        this.statistics = null;
        this.initializeUI();
    }

    initializeUI() {
        this.initElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupResponsiveLayout();
    }

    initElements() {
        // Elementi principali
        this.container = document.getElementById('tournament-view-screen');
        this.bracketContainer = document.getElementById('tournament-bracket-container');
        this.matchDetailsContainer = document.getElementById('match-details-container');
        this.statisticsContainer = document.getElementById('tournament-statistics');
        
        // Elementi informativi
        this.tournamentName = document.getElementById('tournament-name');
        this.tournamentDate = document.getElementById('tournament-date');
        this.tournamentType = document.getElementById('tournament-type');
        this.tournamentStatus = document.getElementById('tournament-status');
        this.tournamentParticipants = document.getElementById('tournament-participants');
        this.tournamentDescription = document.getElementById('tournament-description');
        
        // Pulsanti e controlli
        this.joinButton = document.getElementById('tournament-join-btn');
        this.backButton = document.querySelector('#tournament-view-screen .back-btn');
        this.refreshButton = document.getElementById('refresh-bracket');
        this.zoomControls = document.getElementById('bracket-zoom-controls');
        
        // Elementi per le statistiche
        this.statsTabs = document.getElementById('stats-tabs');
        this.statsContent = document.getElementById('stats-content');
    }

    setupEventListeners() {
        // Eventi per i pulsanti principali
        if (this.joinButton) {
            this.joinButton.addEventListener('click', () => this.handleJoinTournament());
        }
        
        if (this.backButton) {
            this.backButton.addEventListener('click', () => this.handleBack());
        }
        
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.refreshBracket());
        }
        
        // Eventi per lo zoom del tabellone
        if (this.zoomControls) {
            const zoomIn = this.zoomControls.querySelector('.zoom-in');
            const zoomOut = this.zoomControls.querySelector('.zoom-out');
            const zoomReset = this.zoomControls.querySelector('.zoom-reset');
            
            if (zoomIn) zoomIn.addEventListener('click', () => this.zoomBracket(1.2));
            if (zoomOut) zoomOut.addEventListener('click', () => this.zoomBracket(0.8));
            if (zoomReset) zoomReset.addEventListener('click', () => this.resetZoom());
        }
        
        // Eventi per le tab delle statistiche
        if (this.statsTabs) {
            this.statsTabs.addEventListener('click', (e) => {
                if (e.target.classList.contains('stats-tab')) {
                    this.switchStatsTab(e.target.dataset.tab);
                }
            });
        }
    }

    setupDragAndDrop() {
        if (this.bracketContainer) {
            let isDragging = false;
            let startX, startY, scrollLeft, scrollTop;
            
            this.bracketContainer.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.pageX - this.bracketContainer.offsetLeft;
                startY = e.pageY - this.bracketContainer.offsetTop;
                scrollLeft = this.bracketContainer.scrollLeft;
                scrollTop = this.bracketContainer.scrollTop;
            });
            
            this.bracketContainer.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - this.bracketContainer.offsetLeft;
                const y = e.pageY - this.bracketContainer.offsetTop;
                const walkX = (x - startX) * 2;
                const walkY = (y - startY) * 2;
                this.bracketContainer.scrollLeft = scrollLeft - walkX;
                this.bracketContainer.scrollTop = scrollTop - walkY;
            });
            
            this.bracketContainer.addEventListener('mouseup', () => {
                isDragging = false;
            });
            
            this.bracketContainer.addEventListener('mouseleave', () => {
                isDragging = false;
            });
        }
    }

    setupResponsiveLayout() {
        const updateLayout = () => {
            const isMobile = window.innerWidth < 768;
            this.container.classList.toggle('mobile-view', isMobile);
            
            if (isMobile) {
                this.showMobileBracketView();
            } else {
                this.showDesktopBracketView();
            }
        };
        
        window.addEventListener('resize', updateLayout);
        updateLayout();
    }

    showTournament(tournamentData) {
        if (!this.validateTournamentData(tournamentData)) {
            this.showError('Dati del torneo non validi');
            return;
        }
        
        this.currentTournament = tournamentData;
        this.updateTournamentInfo();
        this.generateBracket(tournamentData.bracket);
        this.updateStatistics(tournamentData);
        this.setupMatchDetails();
    }

    validateTournamentData(data) {
        return data && data.id && data.name && data.bracket;
    }

    updateTournamentInfo() {
        const data = this.currentTournament;
        
        this.tournamentName.textContent = data.name;
        this.tournamentDate.textContent = this.formatDate(data.date);
        this.tournamentType.textContent = data.type;
        this.tournamentStatus.textContent = data.status;
        this.tournamentParticipants.textContent = `${data.participants}/${data.maxParticipants}`;
        this.tournamentDescription.textContent = data.description;
        
        this.updateJoinButton();
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateJoinButton() {
        if (!this.joinButton) return;
        
        const canJoin = this.currentTournament.status === 'In arrivo' && 
                       this.currentTournament.participants < this.currentTournament.maxParticipants;
        
        this.joinButton.style.display = canJoin ? 'block' : 'none';
        this.joinButton.disabled = !canJoin;
        this.joinButton.textContent = canJoin ? 'Partecipa' : 'Iscritto';
    }

    generateBracket(bracketData) {
        if (!this.bracketContainer) return;
        
        this.bracketContainer.innerHTML = '';
        
        if (!bracketData || !bracketData.rounds || bracketData.rounds.length === 0) {
            this.showNoBracketMessage();
            return;
        }
        
        const bracketElement = document.createElement('div');
        bracketElement.className = 'tournament-bracket';
        
        bracketData.rounds.forEach((round, roundIndex) => {
            const roundElement = this.createRoundElement(round, roundIndex);
            bracketElement.appendChild(roundElement);
        });
        
        this.bracketContainer.appendChild(bracketElement);
        this.addBracketStyles();
        this.setupMatchInteractions();
    }

    createRoundElement(round, roundIndex) {
        const roundElement = document.createElement('div');
        roundElement.className = 'bracket-round';
        roundElement.dataset.roundIndex = roundIndex;
        
        const roundTitle = document.createElement('div');
        roundTitle.className = 'round-title';
        roundTitle.textContent = round.name;
        roundElement.appendChild(roundTitle);
        
        round.matches.forEach((match, matchIndex) => {
            const matchElement = this.createMatchElement(match, matchIndex);
            roundElement.appendChild(matchElement);
        });
        
        return roundElement;
    }

    createMatchElement(match, matchIndex) {
        const matchElement = document.createElement('div');
        matchElement.className = 'bracket-match';
        matchElement.dataset.matchId = match.id;
        
        const matchHeader = document.createElement('div');
        matchHeader.className = 'match-header';
        matchHeader.innerHTML = `
            <span class="match-number">Match ${matchIndex + 1}</span>
            <span class="match-status">${this.getMatchStatus(match)}</span>
        `;
        matchElement.appendChild(matchHeader);
        
        const player1Element = this.createPlayerElement(match.player1, match.score1, match.winner === match.player1);
        const player2Element = this.createPlayerElement(match.player2, match.score2, match.winner === match.player2);
        
        matchElement.appendChild(player1Element);
        matchElement.appendChild(player2Element);
        
        if (match.status === 'live') {
            this.addLiveMatchIndicators(matchElement);
        }
        
        return matchElement;
    }

    createPlayerElement(player, score, isWinner) {
        const playerElement = document.createElement('div');
        playerElement.className = 'match-player';
        if (isWinner) playerElement.classList.add('match-winner');
        
        playerElement.innerHTML = `
            <div class="player-info">
                <img src="${player.avatar || 'default-avatar.png'}" alt="${player.name}" class="player-avatar">
                <span class="player-name">${player.name || 'TBD'}</span>
            </div>
            <span class="player-score">${score !== null ? score : '-'}</span>
        `;
        
        return playerElement;
    }

    getMatchStatus(match) {
        if (match.status === 'live') return 'In corso';
        if (match.status === 'completed') return 'Completato';
        if (match.status === 'scheduled') return this.formatDate(match.scheduledTime);
        return 'In attesa';
    }

    addLiveMatchIndicators(matchElement) {
        const liveIndicator = document.createElement('div');
        liveIndicator.className = 'live-indicator';
        liveIndicator.innerHTML = `
            <span class="live-dot"></span>
            <span class="live-text">LIVE</span>
        `;
        matchElement.appendChild(liveIndicator);
    }

    setupMatchInteractions() {
        const matches = this.bracketContainer.querySelectorAll('.bracket-match');
        matches.forEach(match => {
            match.addEventListener('click', () => {
                const matchId = match.dataset.matchId;
                this.showMatchDetails(matchId);
            });
        });
    }

    showMatchDetails(matchId) {
        const match = this.findMatchById(matchId);
        if (!match) return;
        
        this.matchDetailsContainer.innerHTML = `
            <div class="match-details">
                <h3>Dettagli Match</h3>
                <div class="match-teams">
                    <div class="team team1 ${match.winner === match.player1 ? 'winner' : ''}">
                        <img src="${match.player1.avatar || 'default-avatar.png'}" alt="${match.player1.name}">
                        <span>${match.player1.name}</span>
                        <span class="score">${match.score1}</span>
                    </div>
                    <div class="team team2 ${match.winner === match.player2 ? 'winner' : ''}">
                        <img src="${match.player2.avatar || 'default-avatar.png'}" alt="${match.player2.name}">
                        <span>${match.player2.name}</span>
                        <span class="score">${match.score2}</span>
                    </div>
                </div>
                <div class="match-stats">
                    <div class="stat">
                        <span class="stat-label">Possesso palla</span>
                        <div class="stat-bars">
                            <div class="stat-bar team1" style="width: ${match.stats.possession1}%"></div>
                            <div class="stat-bar team2" style="width: ${match.stats.possession2}%"></div>
                        </div>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Tiri</span>
                        <div class="stat-values">
                            <span>${match.stats.shots1}</span>
                            <span>${match.stats.shots2}</span>
                        </div>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Tiri in porta</span>
                        <div class="stat-values">
                            <span>${match.stats.shotsOnTarget1}</span>
                            <span>${match.stats.shotsOnTarget2}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.matchDetailsContainer.style.display = 'block';
    }

    findMatchById(matchId) {
        if (!this.currentTournament || !this.currentTournament.bracket) return null;
        
        for (const round of this.currentTournament.bracket.rounds) {
            const match = round.matches.find(m => m.id === matchId);
            if (match) return match;
        }
        
        return null;
    }

    updateStatistics(tournamentData) {
        if (!this.statisticsContainer) return;
        
        const stats = this.calculateTournamentStatistics(tournamentData);
        
        this.statisticsContainer.innerHTML = `
            <div class="stats-overview">
                <div class="stat-card">
                    <h4>Partite Giocate</h4>
                    <span class="stat-value">${stats.matchesPlayed}</span>
                </div>
                <div class="stat-card">
                    <h4>Gol Totali</h4>
                    <span class="stat-value">${stats.totalGoals}</span>
                </div>
                <div class="stat-card">
                    <h4>Media Gol/Partita</h4>
                    <span class="stat-value">${stats.averageGoals.toFixed(2)}</span>
                </div>
            </div>
            <div class="stats-details">
                <div class="stats-tabs">
                    <button class="stats-tab active" data-tab="players">Giocatori</button>
                    <button class="stats-tab" data-tab="teams">Squadre</button>
                    <button class="stats-tab" data-tab="matches">Partite</button>
                </div>
                <div class="stats-content">
                    <div class="stats-panel active" id="players-stats">
                        ${this.generatePlayerStats(stats.playerStats)}
                    </div>
                    <div class="stats-panel" id="teams-stats">
                        ${this.generateTeamStats(stats.teamStats)}
                    </div>
                    <div class="stats-panel" id="matches-stats">
                        ${this.generateMatchStats(stats.matchStats)}
                    </div>
                </div>
            </div>
        `;
    }

    calculateTournamentStatistics(tournamentData) {
        // Implementazione del calcolo delle statistiche
        return {
            matchesPlayed: 0,
            totalGoals: 0,
            averageGoals: 0,
            playerStats: [],
            teamStats: [],
            matchStats: []
        };
    }

    generatePlayerStats(playerStats) {
        return `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Giocatore</th>
                        <th>Gol</th>
                        <th>Assist</th>
                        <th>Partite</th>
                    </tr>
                </thead>
                <tbody>
                    ${playerStats.map(player => `
                        <tr>
                            <td>${player.name}</td>
                            <td>${player.goals}</td>
                            <td>${player.assists}</td>
                            <td>${player.matches}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateTeamStats(teamStats) {
        return `
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Squadra</th>
                        <th>Vittorie</th>
                        <th>Pareggi</th>
                        <th>Sconfitte</th>
                        <th>Gol Fatti</th>
                        <th>Gol Subiti</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamStats.map(team => `
                        <tr>
                            <td>${team.name}</td>
                            <td>${team.wins}</td>
                            <td>${team.draws}</td>
                            <td>${team.losses}</td>
                            <td>${team.goalsFor}</td>
                            <td>${team.goalsAgainst}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    generateMatchStats(matchStats) {
        return `
            <div class="match-stats-grid">
                ${matchStats.map(match => `
                    <div class="match-stat-card">
                        <div class="match-header">
                            <span class="match-date">${this.formatDate(match.date)}</span>
                            <span class="match-round">${match.round}</span>
                        </div>
                        <div class="match-teams">
                            <div class="team">
                                <span class="team-name">${match.team1}</span>
                                <span class="team-score">${match.score1}</span>
                            </div>
                            <div class="team">
                                <span class="team-name">${match.team2}</span>
                                <span class="team-score">${match.score2}</span>
                            </div>
                        </div>
                        <div class="match-summary">
                            <span class="match-result">${match.result}</span>
                            <span class="match-duration">${match.duration}'</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    switchStatsTab(tabId) {
        const tabs = this.statsTabs.querySelectorAll('.stats-tab');
        const panels = this.statsContent.querySelectorAll('.stats-panel');
        
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabId}-stats`);
        });
    }

    zoomBracket(factor) {
        if (!this.bracketContainer) return;
        
        const currentScale = parseFloat(this.bracketContainer.style.transform.replace('scale(', '').replace(')', '')) || 1;
        const newScale = Math.max(0.5, Math.min(2, currentScale * factor));
        
        this.bracketContainer.style.transform = `scale(${newScale})`;
    }

    resetZoom() {
        if (!this.bracketContainer) return;
        
        this.bracketContainer.style.transform = 'scale(1)';
    }

    showMobileBracketView() {
        if (!this.bracketContainer) return;
        
        this.bracketContainer.classList.add('mobile-view');
        this.setupMobileNavigation();
    }

    showDesktopBracketView() {
        if (!this.bracketContainer) return;
        
        this.bracketContainer.classList.remove('mobile-view');
    }

    setupMobileNavigation() {
        const rounds = this.bracketContainer.querySelectorAll('.bracket-round');
        let currentRoundIndex = 0;
        
        const showRound = (index) => {
            rounds.forEach((round, i) => {
                round.style.display = i === index ? 'block' : 'none';
            });
        };
        
        // Aggiungi controlli di navigazione
        const navControls = document.createElement('div');
        navControls.className = 'mobile-round-nav';
        navControls.innerHTML = `
            <button class="nav-prev">←</button>
            <span class="round-indicator">Round ${currentRoundIndex + 1}/${rounds.length}</span>
            <button class="nav-next">→</button>
        `;
        
        this.bracketContainer.parentNode.insertBefore(navControls, this.bracketContainer);
        
        // Gestisci la navigazione
        const prevButton = navControls.querySelector('.nav-prev');
        const nextButton = navControls.querySelector('.nav-next');
        const indicator = navControls.querySelector('.round-indicator');
        
        prevButton.addEventListener('click', () => {
            if (currentRoundIndex > 0) {
                currentRoundIndex--;
                showRound(currentRoundIndex);
                indicator.textContent = `Round ${currentRoundIndex + 1}/${rounds.length}`;
            }
        });
        
        nextButton.addEventListener('click', () => {
            if (currentRoundIndex < rounds.length - 1) {
                currentRoundIndex++;
                showRound(currentRoundIndex);
                indicator.textContent = `Round ${currentRoundIndex + 1}/${rounds.length}`;
            }
        });
        
        // Mostra il primo round
        showRound(0);
    }

    showError(message) {
        this.screenManager.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.screenManager.showNotification(message, 'success');
    }

    addBracketStyles() {
        const styleId = 'tournament-bracket-styles';
        
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .tournament-bracket {
                    display: flex;
                    justify-content: space-around;
                    min-width: 800px;
                    transition: transform 0.3s ease;
                }
                
                .bracket-round {
                    display: flex;
                    flex-direction: column;
                    margin: 0 10px;
                    min-width: 200px;
                }
                
                .round-title {
                    text-align: center;
                    margin-bottom: 20px;
                    color: #4caf50;
                    font-weight: bold;
                    font-size: 18px;
                }
                
                .bracket-match {
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    margin-bottom: 20px;
                    padding: 10px;
                    border-left: 3px solid #4caf50;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                
                .bracket-match:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
                
                .match-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    font-size: 12px;
                    color: #888;
                }
                
                .match-player {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .match-player:last-child {
                    border-bottom: none;
                }
                
                .player-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .player-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                
                .match-winner {
                    background-color: rgba(76, 175, 80, 0.2);
                    border-radius: 3px;
                }
                
                .live-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-top: 8px;
                    color: #ff4444;
                    font-size: 12px;
                }
                
                .live-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #ff4444;
                    border-radius: 50%;
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .mobile-view {
                    min-width: 100%;
                    overflow-x: hidden;
                }
                
                .mobile-round-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    margin-bottom: 10px;
                }
                
                .nav-prev, .nav-next {
                    background: none;
                    border: none;
                    color: #4caf50;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 5px 10px;
                }
                
                .round-indicator {
                    color: #fff;
                    font-size: 14px;
                }
                
                .match-details {
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    padding: 20px;
                    margin-top: 20px;
                }
                
                .match-teams {
                    display: flex;
                    justify-content: space-between;
                    margin: 20px 0;
                }
                
                .team {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .team.winner {
                    color: #4caf50;
                }
                
                .match-stats {
                    display: grid;
                    gap: 15px;
                }
                
                .stat {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                
                .stat-label {
                    color: #888;
                    font-size: 12px;
                }
                
                .stat-bars {
                    display: flex;
                    height: 20px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    overflow: hidden;
                }
                
                .stat-bar {
                    height: 100%;
                    transition: width 0.3s ease;
                }
                
                .stat-bar.team1 {
                    background-color: #4caf50;
                }
                
                .stat-bar.team2 {
                    background-color: #2196f3;
                }
                
                .stat-values {
                    display: flex;
                    justify-content: space-between;
                }
                
                .stats-overview {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    padding: 20px;
                    text-align: center;
                }
                
                .stat-card h4 {
                    color: #888;
                    margin-bottom: 10px;
                }
                
                .stat-value {
                    font-size: 24px;
                    color: #4caf50;
                }
                
                .stats-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .stats-tab {
                    background: none;
                    border: none;
                    color: #888;
                    padding: 10px 20px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                }
                
                .stats-tab.active {
                    color: #4caf50;
                    border-bottom-color: #4caf50;
                }
                
                .stats-panel {
                    display: none;
                }
                
                .stats-panel.active {
                    display: block;
                }
                
                .stats-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .stats-table th,
                .stats-table td {
                    padding: 10px;
                    text-align: left;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .stats-table th {
                    color: #888;
                    font-weight: normal;
                }
                
                .match-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                }
                
                .match-stat-card {
                    background-color: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                    padding: 15px;
                }
                
                .match-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    font-size: 12px;
                    color: #888;
                }
                
                .match-teams {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                }
                
                .match-summary {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #888;
                }
            `;
            
            document.head.appendChild(style);
        }
    }
}

// Esporta la classe
export default TournamentView;
