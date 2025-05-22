# Architettura del Pannello di Amministrazione e Sistema Tornei

## Panoramica dell'Architettura

Questo documento descrive l'architettura tecnica per l'implementazione del pannello di amministrazione e del sistema di tornei/eventi per il clone di HaxBall. L'architettura è progettata per integrarsi perfettamente con il sistema esistente, mantenendo la modularità e la scalabilità.

## Architettura Generale

L'architettura segue un pattern MVC (Model-View-Controller) esteso, con una chiara separazione tra dati, logica di business e presentazione. Il sistema è diviso in moduli indipendenti ma interconnessi:

```
                  +-------------------+
                  |    Client Side    |
                  +-------------------+
                  | - Admin UI        |
                  | - Tournament UI   |
                  | - Event Tab       |
                  +--------+----------+
                           |
                           v
+------------+    +-------------------+    +------------+
| WebSocket  |<-->|    Server Side    |<-->|  RESTful   |
| (Real-time)|    +-------------------+    |   API      |
+------------+    | - Admin Module    |    +------------+
                  | - Tournament Module|
                  | - Auth Module     |
                  +--------+----------+
                           |
                           v
                  +-------------------+
                  |   Data Layer      |
                  +-------------------+
                  | - User Model      |
                  | - Tournament Model|
                  | - Admin Log Model |
                  +-------------------+
```

## Componenti Principali

### 1. Modulo di Amministrazione

#### 1.1 AdminManager
Classe principale che coordina tutte le funzionalità amministrative.

```javascript
class AdminManager {
    constructor(authManager, dataManager, networkManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.networkManager = networkManager;
        this.dashboardManager = new DashboardManager(dataManager);
        this.userManager = new UserManager(dataManager, authManager);
        this.moderationManager = new ModerationManager(dataManager, networkManager);
        this.configManager = new ConfigManager(dataManager);
        this.logManager = new LogManager(dataManager);
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    checkAdminAccess(userId, requiredRole) { /* ... */ }
    performAdminAction(userId, action, params) { /* ... */ }
    getDashboardData() { /* ... */ }
    // ...
}
```

#### 1.2 DashboardManager
Gestisce la raccolta e presentazione dei dati per la dashboard amministrativa.

```javascript
class DashboardManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.metrics = {
            realTimeUsers: 0,
            activeGames: 0,
            serverStatus: {},
            // ...
        };
    }
    
    // Metodi principali
    refreshMetrics() { /* ... */ }
    getMetrics() { /* ... */ }
    generateReport(timeRange) { /* ... */ }
    // ...
}
```

#### 1.3 UserManager
Gestisce le operazioni amministrative sugli utenti.

```javascript
class UserManager {
    constructor(dataManager, authManager) {
        this.dataManager = dataManager;
        this.authManager = authManager;
    }
    
    // Metodi principali
    getUsers(filters, pagination) { /* ... */ }
    getUserDetails(userId) { /* ... */ }
    updateUser(userId, userData) { /* ... */ }
    changeUserRole(userId, newRole) { /* ... */ }
    resetUserPassword(userId) { /* ... */ }
    // ...
}
```

#### 1.4 ModerationManager
Gestisce le azioni di moderazione.

```javascript
class ModerationManager {
    constructor(dataManager, networkManager) {
        this.dataManager = dataManager;
        this.networkManager = networkManager;
    }
    
    // Metodi principali
    banUser(userId, duration, reason) { /* ... */ }
    muteUser(userId, duration, scope) { /* ... */ }
    resetUserStats(userId, reason) { /* ... */ }
    getReports(filters, pagination) { /* ... */ }
    resolveReport(reportId, resolution) { /* ... */ }
    // ...
}
```

#### 1.5 ConfigManager
Gestisce le configurazioni di sistema.

```javascript
class ConfigManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.configs = {
            gamePhysics: {},
            matchmaking: {},
            security: {},
            // ...
        };
    }
    
    // Metodi principali
    getConfigs() { /* ... */ }
    updateConfig(configKey, value) { /* ... */ }
    resetToDefaults(configGroup) { /* ... */ }
    // ...
}
```

#### 1.6 LogManager
Gestisce i log amministrativi.

```javascript
class LogManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    
    // Metodi principali
    logAdminAction(adminId, action, params, result) { /* ... */ }
    getLogs(filters, pagination) { /* ... */ }
    // ...
}
```

### 2. Modulo Tornei

#### 2.1 TournamentManager
Classe principale che coordina tutte le funzionalità relative ai tornei.

```javascript
class TournamentManager {
    constructor(dataManager, networkManager, rankingSystem) {
        this.dataManager = dataManager;
        this.networkManager = networkManager;
        this.rankingSystem = rankingSystem;
        this.tournamentCreator = new TournamentCreator(dataManager);
        this.participantManager = new ParticipantManager(dataManager, networkManager);
        this.bracketManager = new BracketManager(dataManager);
        this.matchManager = new TournamentMatchManager(dataManager, networkManager);
        this.mmrIntegrator = new MMRIntegrator(dataManager, rankingSystem);
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    getTournaments(filters, pagination) { /* ... */ }
    getTournamentDetails(tournamentId) { /* ... */ }
    startTournament(tournamentId) { /* ... */ }
    endTournament(tournamentId) { /* ... */ }
    // ...
}
```

#### 2.2 TournamentCreator
Gestisce la creazione e configurazione dei tornei.

```javascript
class TournamentCreator {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.tournamentTemplates = {
            elimination: { /* ... */ },
            roundRobin: { /* ... */ },
            swiss: { /* ... */ }
        };
    }
    
    // Metodi principali
    createTournament(tournamentData) { /* ... */ }
    updateTournament(tournamentId, tournamentData) { /* ... */ }
    deleteTournament(tournamentId) { /* ... */ }
    getTemplates() { /* ... */ }
    // ...
}
```

#### 2.3 ParticipantManager
Gestisce i partecipanti ai tornei.

```javascript
class ParticipantManager {
    constructor(dataManager, networkManager) {
        this.dataManager = dataManager;
        this.networkManager = networkManager;
    }
    
    // Metodi principali
    registerParticipant(tournamentId, userId, teamId) { /* ... */ }
    unregisterParticipant(tournamentId, userId) { /* ... */ }
    getParticipants(tournamentId, filters) { /* ... */ }
    seedParticipants(tournamentId, method) { /* ... */ }
    createTeam(tournamentId, teamData) { /* ... */ }
    // ...
}
```

#### 2.4 BracketManager
Gestisce i bracket dei tornei.

```javascript
class BracketManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.bracketGenerators = {
            singleElimination: { /* ... */ },
            doubleElimination: { /* ... */ },
            roundRobin: { /* ... */ },
            swiss: { /* ... */ }
        };
    }
    
    // Metodi principali
    generateBracket(tournamentId) { /* ... */ }
    updateBracket(tournamentId, matchResults) { /* ... */ }
    getBracket(tournamentId) { /* ... */ }
    // ...
}
```

#### 2.5 TournamentMatchManager
Gestisce le partite dei tornei.

```javascript
class TournamentMatchManager {
    constructor(dataManager, networkManager) {
        this.dataManager = dataManager;
        this.networkManager = networkManager;
    }
    
    // Metodi principali
    createMatch(tournamentId, matchData) { /* ... */ }
    startMatch(matchId) { /* ... */ }
    updateMatchResult(matchId, result) { /* ... */ }
    getMatches(tournamentId, round) { /* ... */ }
    // ...
}
```

#### 2.6 MMRIntegrator
Gestisce l'integrazione con il sistema MMR.

```javascript
class MMRIntegrator {
    constructor(dataManager, rankingSystem) {
        this.dataManager = dataManager;
        this.rankingSystem = rankingSystem;
        this.weightFactors = {
            tournamentSize: { /* ... */ },
            tournamentImportance: { /* ... */ },
            matchStage: { /* ... */ }
        };
    }
    
    // Metodi principali
    calculateMMRImpact(tournamentId, matchId, result) { /* ... */ }
    applyMMRChanges(userId, mmrChange, mode) { /* ... */ }
    getTournamentMMRHistory(tournamentId) { /* ... */ }
    getUserTournamentMMRHistory(userId) { /* ... */ }
    // ...
}
```

### 3. Interfaccia Utente

#### 3.1 AdminUI
Componenti UI per il pannello di amministrazione.

```javascript
class AdminUI {
    constructor(adminManager, uiManager) {
        this.adminManager = adminManager;
        this.uiManager = uiManager;
        this.components = {
            dashboard: new AdminDashboardUI(adminManager, uiManager),
            users: new AdminUsersUI(adminManager, uiManager),
            moderation: new AdminModerationUI(adminManager, uiManager),
            config: new AdminConfigUI(adminManager, uiManager),
            logs: new AdminLogsUI(adminManager, uiManager)
        };
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    handleNavigation(section) { /* ... */ }
    // ...
}
```

#### 3.2 TournamentUI
Componenti UI per il sistema di tornei.

```javascript
class TournamentUI {
    constructor(tournamentManager, uiManager) {
        this.tournamentManager = tournamentManager;
        this.uiManager = uiManager;
        this.components = {
            list: new TournamentListUI(tournamentManager, uiManager),
            details: new TournamentDetailsUI(tournamentManager, uiManager),
            bracket: new TournamentBracketUI(tournamentManager, uiManager),
            registration: new TournamentRegistrationUI(tournamentManager, uiManager)
        };
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    handleNavigation(tournamentId, section) { /* ... */ }
    // ...
}
```

#### 3.3 EventsTabUI
Componente UI per la tab Eventi nella home page.

```javascript
class EventsTabUI {
    constructor(tournamentManager, uiManager) {
        this.tournamentManager = tournamentManager;
        this.uiManager = uiManager;
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    refreshEvents() { /* ... */ }
    // ...
}
```

### 4. Modelli di Dati

#### 4.1 AdminModel
Schema per i dati amministrativi.

```javascript
const AdminSchema = {
    userId: String,
    role: String, // 'admin', 'moderator'
    permissions: [String],
    createdAt: Date,
    lastLogin: Date,
    actions: [{
        type: String,
        timestamp: Date,
        details: Object
    }]
};
```

#### 4.2 TournamentModel
Schema per i dati dei tornei.

```javascript
const TournamentSchema = {
    id: String,
    name: String,
    description: String,
    format: String, // 'elimination', 'roundRobin', 'swiss'
    mode: String, // '1v1', '2v2', '3v3'
    type: String, // 'casual', 'ranked'
    status: String, // 'upcoming', 'active', 'completed'
    startDate: Date,
    endDate: Date,
    createdBy: String,
    participants: [{
        userId: String,
        teamId: String,
        seed: Number,
        status: String
    }],
    teams: [{
        id: String,
        name: String,
        members: [String]
    }],
    bracket: {
        rounds: Number,
        matches: [{
            id: String,
            round: Number,
            participants: [String],
            winner: String,
            status: String,
            startTime: Date,
            endTime: Date,
            score: Object
        }]
    },
    rules: Object,
    prizes: [Object],
    mmrImpact: {
        enabled: Boolean,
        factor: Number
    }
};
```

#### 4.3 AdminLogModel
Schema per i log amministrativi.

```javascript
const AdminLogSchema = {
    id: String,
    adminId: String,
    action: String,
    target: {
        type: String,
        id: String
    },
    params: Object,
    result: {
        success: Boolean,
        message: String
    },
    timestamp: Date,
    ipAddress: String
};
```

## Flussi di Dati

### 1. Accesso al Pannello di Amministrazione

```
1. Utente con ruolo admin/moderator accede alla pagina di amministrazione
2. AuthManager verifica le credenziali e il ruolo
3. AdminManager carica i dati della dashboard
4. AdminUI renderizza l'interfaccia appropriata in base al ruolo
```

### 2. Creazione di un Torneo

```
1. Admin accede alla sezione tornei del pannello
2. Compila il form di creazione torneo
3. TournamentCreator valida i dati e crea il torneo
4. BracketManager inizializza la struttura del bracket
5. Il torneo viene salvato nel database
6. Il torneo appare nella tab Eventi per tutti gli utenti
```

### 3. Partecipazione a un Torneo

```
1. Utente visualizza il torneo nella tab Eventi
2. Utente si registra al torneo
3. ParticipantManager verifica l'idoneità e registra l'utente
4. Quando il torneo inizia, BracketManager genera il bracket
5. TournamentMatchManager crea le partite iniziali
```

### 4. Impatto MMR di un Torneo Ranked

```
1. Una partita di torneo ranked termina
2. TournamentMatchManager aggiorna il risultato
3. BracketManager aggiorna il bracket
4. MMRIntegrator calcola l'impatto MMR
5. RankingSystem applica le modifiche MMR
6. Le classifiche vengono aggiornate
```

## Integrazione con i Sistemi Esistenti

### 1. Integrazione con il Sistema di Autenticazione

```javascript
// Estensione dell'AuthManager esistente
class AuthManager {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare i ruoli amministrativi
    getUserRole(userId) { /* ... */ }
    hasPermission(userId, permission) { /* ... */ }
    assignRole(userId, role) { /* ... */ }
    // ...
}
```

### 2. Integrazione con il Sistema di Ranking

```javascript
// Estensione del RankingSystem esistente
class RankingSystem {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare i tornei
    applyTournamentResult(userId, opponentId, result, tournamentFactor, mode) { /* ... */ }
    calculateTournamentMMRChange(userMMR, opponentMMR, result, tournamentFactor) { /* ... */ }
    // ...
}
```

### 3. Integrazione con l'Interfaccia Utente

```javascript
// Estensione dell'UIManager esistente
class UIManager {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare la tab Eventi e il pannello admin
    addEventsTab() { /* ... */ }
    renderAdminPanel() { /* ... */ }
    // ...
}
```

## Considerazioni di Sicurezza

1. **Autenticazione a Due Fattori**
   - Implementazione di 2FA per gli account amministrativi
   - Sessioni con timeout per il pannello di amministrazione

2. **Controllo degli Accessi**
   - Verifica delle autorizzazioni per ogni azione amministrativa
   - Limitazione delle azioni in base al ruolo

3. **Protezione contro Attacchi**
   - Validazione di tutti gli input lato server
   - Protezione CSRF per tutte le azioni amministrative
   - Rate limiting per le API amministrative

4. **Audit e Logging**
   - Log dettagliati di tutte le azioni amministrative
   - Tracciamento delle modifiche ai dati sensibili

## Considerazioni di Performance

1. **Ottimizzazione Database**
   - Indici appropriati per le query frequenti
   - Caching dei dati amministrativi e dei tornei attivi

2. **Caricamento Asincrono**
   - Caricamento lazy dei dati amministrativi
   - Aggiornamenti incrementali per dashboard e bracket

3. **Scalabilità**
   - Architettura modulare per facilitare la scalabilità orizzontale
   - Separazione delle risorse per amministrazione e gioco

## Piano di Implementazione

1. **Fase 1: Struttura Base**
   - Implementazione delle classi core
   - Setup del database per i nuovi modelli
   - Integrazione con i sistemi esistenti

2. **Fase 2: Pannello di Amministrazione**
   - Implementazione della dashboard
   - Sviluppo delle funzionalità di gestione utenti
   - Creazione degli strumenti di moderazione

3. **Fase 3: Sistema di Tornei**
   - Implementazione della creazione tornei
   - Sviluppo del sistema di bracket
   - Integrazione con il matchmaking

4. **Fase 4: Interfaccia Utente**
   - Creazione della tab Eventi
   - Sviluppo delle pagine di dettaglio torneo
   - Implementazione delle notifiche

5. **Fase 5: Integrazione MMR**
   - Implementazione del calcolo impatto MMR
   - Integrazione con il sistema di ranking
   - Test e bilanciamento

6. **Fase 6: Test e Ottimizzazione**
   - Test funzionali completi
   - Test di carico e performance
   - Ottimizzazione e risoluzione bug

## Conclusione

Questa architettura è progettata per fornire un sistema robusto, scalabile e sicuro per l'amministrazione del gioco e la gestione dei tornei. L'approccio modulare garantisce che le nuove funzionalità si integrino perfettamente con il sistema esistente senza comprometterne la stabilità.
