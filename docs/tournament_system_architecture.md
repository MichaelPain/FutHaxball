# Architettura del Sistema di Tornei Avanzato

## Panoramica

Questo documento descrive l'architettura tecnica per l'implementazione del sistema di tornei avanzato per il clone di HaxBall. L'architettura è progettata per supportare eventi personalizzati, tornei multi-stage e campionati basati sulla geolocalizzazione, integrandosi perfettamente con il sistema esistente.

## Componenti Principali

### 1. Sistema di Eventi Personalizzati

#### 1.1 EventManager
Classe principale che gestisce la creazione e configurazione di eventi personalizzati.

```javascript
class EventManager {
    constructor(tournamentManager, dataManager) {
        this.tournamentManager = tournamentManager;
        this.dataManager = dataManager;
        this.eventTemplates = {
            weeklyChallenge: { /* ... */ },
            seasonalCup: { /* ... */ },
            specialEvent: { /* ... */ }
        };
    }
    
    // Metodi principali
    createEvent(eventData) { /* ... */ }
    updateEvent(eventId, eventData) { /* ... */ }
    getActiveEvents() { /* ... */ }
    getUpcomingEvents() { /* ... */ }
    getEventDetails(eventId) { /* ... */ }
    scheduleEvent(eventId, schedule) { /* ... */ }
    cancelEvent(eventId) { /* ... */ }
}
```

#### 1.2 EventRewardManager
Gestisce i premi e le ricompense per gli eventi.

```javascript
class EventRewardManager {
    constructor(dataManager, userManager) {
        this.dataManager = dataManager;
        this.userManager = userManager;
    }
    
    // Metodi principali
    defineRewards(eventId, rewards) { /* ... */ }
    assignReward(userId, rewardId) { /* ... */ }
    getUserRewards(userId) { /* ... */ }
    getEventRewards(eventId) { /* ... */ }
}
```

### 2. Sistema di Tornei Multi-Stage

#### 2.1 MultiStageManager
Gestisce la configurazione e l'esecuzione di tornei con più fasi.

```javascript
class MultiStageManager {
    constructor(tournamentManager, bracketManager) {
        this.tournamentManager = tournamentManager;
        this.bracketManager = bracketManager;
    }
    
    // Metodi principali
    createStage(tournamentId, stageData) { /* ... */ }
    updateStage(tournamentId, stageId, stageData) { /* ... */ }
    deleteStage(tournamentId, stageId) { /* ... */ }
    getStages(tournamentId) { /* ... */ }
    advanceToNextStage(tournamentId) { /* ... */ }
    getQualifiedParticipants(tournamentId, stageId) { /* ... */ }
}
```

#### 2.2 StageTransitionManager
Gestisce le transizioni tra le diverse fasi di un torneo.

```javascript
class StageTransitionManager {
    constructor(multiStageManager, bracketManager) {
        this.multiStageManager = multiStageManager;
        this.bracketManager = bracketManager;
    }
    
    // Metodi principali
    calculateQualifiers(tournamentId, stageId, rules) { /* ... */ }
    transferParticipants(fromStageId, toStageId, participants) { /* ... */ }
    seedNextStage(tournamentId, stageId, seedingMethod) { /* ... */ }
}
```

### 3. Sistema di Campionati Geolocalizzati

#### 3.1 GeoChampionshipManager
Gestisce la creazione e configurazione di campionati basati sulla geolocalizzazione.

```javascript
class GeoChampionshipManager {
    constructor(tournamentManager, geoLocationService) {
        this.tournamentManager = tournamentManager;
        this.geoLocationService = geoLocationService;
    }
    
    // Metodi principali
    createNationalChampionship(countryCode, championshipData) { /* ... */ }
    createContinentalChampionship(continent, championshipData) { /* ... */ }
    createInternationalChampionship(championshipData) { /* ... */ }
    getChampionshipsByRegion(regionType, regionCode) { /* ... */ }
    getQualificationPath(userId) { /* ... */ }
}
```

#### 3.2 GeoLocationService
Servizio per la gestione delle informazioni geografiche.

```javascript
class GeoLocationService {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.geoipService = new GeoIPService();
        this.countryData = { /* ... */ };
        this.continentData = { /* ... */ };
    }
    
    // Metodi principali
    getUserCountry(userId) { /* ... */ }
    getUserContinent(userId) { /* ... */ }
    getCountryPlayers(countryCode) { /* ... */ }
    getContinentPlayers(continent) { /* ... */ }
    validateGeoRestriction(userId, restriction) { /* ... */ }
}
```

### 4. Interfaccia Utente Avanzata

#### 4.1 TournamentDashboardUI
Componente UI per la dashboard dei tornei.

```javascript
class TournamentDashboardUI {
    constructor(tournamentManager, eventManager, uiManager) {
        this.tournamentManager = tournamentManager;
        this.eventManager = eventManager;
        this.uiManager = uiManager;
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    showActiveEvents() { /* ... */ }
    showUpcomingTournaments() { /* ... */ }
    showUserTournaments() { /* ... */ }
    showGeoChampionships() { /* ... */ }
}
```

#### 4.2 TournamentCreationUI
Componente UI per la creazione e configurazione di tornei.

```javascript
class TournamentCreationUI {
    constructor(tournamentManager, multiStageManager, geoChampionshipManager, uiManager) {
        this.tournamentManager = tournamentManager;
        this.multiStageManager = multiStageManager;
        this.geoChampionshipManager = geoChampionshipManager;
        this.uiManager = uiManager;
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    showBasicTournamentForm() { /* ... */ }
    showMultiStageForm() { /* ... */ }
    showGeoChampionshipForm() { /* ... */ }
    showEventForm() { /* ... */ }
}
```

#### 4.3 ChampionshipBracketUI
Componente UI per la visualizzazione dei bracket dei campionati.

```javascript
class ChampionshipBracketUI {
    constructor(tournamentManager, multiStageManager, uiManager) {
        this.tournamentManager = tournamentManager;
        this.multiStageManager = multiStageManager;
        this.uiManager = uiManager;
    }
    
    // Metodi principali
    initialize() { /* ... */ }
    render() { /* ... */ }
    showMultiStageBracket(tournamentId) { /* ... */ }
    showStageNavigation(tournamentId) { /* ... */ }
    showQualificationPaths() { /* ... */ }
}
```

### 5. Estensioni ai Modelli Esistenti

#### 5.1 Estensione del Modello Tournament

```javascript
// Nuovi campi per il modello Tournament
const TournamentSchemaExtension = {
    isEvent: {
        type: Boolean,
        default: false
    },
    eventType: {
        type: String,
        enum: ['weekly', 'seasonal', 'special', null],
        default: null
    },
    eventDetails: {
        startDate: Date,
        endDate: Date,
        recurrence: String,
        theme: String,
        specialRules: Schema.Types.Mixed
    },
    rewards: [{
        rank: Number,
        type: String,
        value: Schema.Types.Mixed,
        description: String
    }],
    qualificationPaths: [{
        fromTournamentId: Schema.Types.ObjectId,
        qualificationRules: Schema.Types.Mixed
    }]
};
```

#### 5.2 Estensione del Modello User

```javascript
// Nuovi campi per il modello User
const UserSchemaExtension = {
    geoLocation: {
        country: String,
        countryCode: String,
        continent: String,
        region: String,
        city: String,
        lastUpdated: Date
    },
    rewards: [{
        id: Schema.Types.ObjectId,
        tournamentId: Schema.Types.ObjectId,
        eventId: Schema.Types.ObjectId,
        type: String,
        value: Schema.Types.Mixed,
        awarded: Date,
        claimed: Boolean,
        claimedDate: Date
    }]
};
```

## Flussi di Dati

### 1. Creazione di un Campionato Nazionale

```
1. Admin accede alla sezione tornei del pannello
2. Seleziona "Crea Campionato Nazionale"
3. Seleziona il paese e configura i dettagli
4. GeoChampionshipManager crea il torneo con restrizioni geografiche
5. Il sistema notifica i giocatori del paese selezionato
```

### 2. Gestione di un Torneo Multi-Stage

```
1. Admin crea un torneo con formato multi-stage
2. Configura le diverse fasi (gruppi, playoff, finale)
3. MultiStageManager inizializza la struttura delle fasi
4. Quando una fase termina, StageTransitionManager calcola i qualificati
5. I partecipanti qualificati vengono trasferiti alla fase successiva
```

### 3. Partecipazione a un Evento Speciale

```
1. Utente visualizza l'evento nella dashboard
2. Utente si registra all'evento
3. Durante l'evento, le regole speciali vengono applicate
4. Al termine, EventRewardManager assegna i premi
5. I premi vengono visualizzati nel profilo dell'utente
```

## Integrazione con i Sistemi Esistenti

### 1. Integrazione con il Pannello di Amministrazione

```javascript
// Estensione dell'AdminUI esistente
class AdminUI {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare la gestione avanzata dei tornei
    initializeTournamentManagement() {
        this.components.tournaments = {
            dashboard: new TournamentDashboardUI(this.tournamentManager, this.eventManager, this.uiManager),
            creation: new TournamentCreationUI(this.tournamentManager, this.multiStageManager, this.geoChampionshipManager, this.uiManager),
            management: new TournamentManagementUI(this.tournamentManager, this.uiManager)
        };
    }
    
    renderTournamentSection(section) {
        switch(section) {
            case 'dashboard':
                this.components.tournaments.dashboard.render();
                break;
            case 'creation':
                this.components.tournaments.creation.render();
                break;
            case 'management':
                this.components.tournaments.management.render();
                break;
        }
    }
}
```

### 2. Integrazione con il Sistema di Ranking

```javascript
// Estensione del RankingSystem esistente
class RankingSystem {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare i campionati geolocalizzati
    calculateNationalRanking(countryCode) { /* ... */ }
    calculateContinentalRanking(continent) { /* ... */ }
    getGeoRankings(userId) { /* ... */ }
    applyChampionshipResult(userId, tournamentId, position) { /* ... */ }
}
```

### 3. Integrazione con l'Interfaccia Utente

```javascript
// Estensione dell'UIManager esistente
class UIManager {
    // Metodi esistenti...
    
    // Nuovi metodi per supportare la visualizzazione dei tornei avanzati
    addTournamentTab() { /* ... */ }
    renderEventsList() { /* ... */ }
    renderChampionshipBracket(tournamentId) { /* ... */ }
    showUserRewards(userId) { /* ... */ }
}
```

## Considerazioni di Implementazione

### 1. Gestione della Geolocalizzazione

Per implementare correttamente i campionati basati sulla geolocalizzazione, utilizzeremo:

1. **Rilevamento automatico del paese**:
   - Utilizzo di GeoIP per determinare il paese dell'utente
   - Possibilità per l'utente di confermare/modificare il paese
   - Verifica periodica per aggiornare le informazioni

2. **Struttura gerarchica dei campionati**:
   - Campionati nazionali come primo livello
   - Campionati continentali come secondo livello
   - Campionati internazionali come livello finale
   - Percorsi di qualificazione tra i livelli

3. **Gestione delle restrizioni**:
   - Verifica dell'idoneità in base al paese dell'utente
   - Gestione delle eccezioni e casi speciali
   - Protezione contro tentativi di eludere le restrizioni

### 2. Implementazione dei Tornei Multi-Stage

Per i tornei multi-stage, implementeremo:

1. **Configurazione flessibile delle fasi**:
   - Supporto per diversi formati in ogni fase
   - Configurazione del numero di qualificati
   - Regole di avanzamento personalizzabili

2. **Transizione tra le fasi**:
   - Calcolo automatico dei qualificati
   - Gestione dei pareggi e situazioni speciali
   - Seeding intelligente per le fasi successive

3. **Visualizzazione integrata**:
   - Navigazione intuitiva tra le fasi
   - Visualizzazione dello stato di avanzamento
   - Indicatori di qualificazione

### 3. Sistema di Eventi Personalizzati

Per gli eventi personalizzati, implementeremo:

1. **Tipi di eventi**:
   - Eventi settimanali con regole semplici
   - Eventi stagionali con temi specifici
   - Eventi speciali con meccaniche uniche

2. **Regole personalizzabili**:
   - Modificatori di fisica del gioco
   - Condizioni di vittoria alternative
   - Limitazioni speciali

3. **Sistema di ricompense**:
   - Badge e titoli visualizzabili nel profilo
   - Oggetti cosmetici per personalizzazione
   - Punti speciali per classifiche dedicate

## Piano di Implementazione

1. **Fase 1: Estensione dei Modelli**
   - Aggiornare il modello Tournament con i campi aggiuntivi
   - Estendere il modello User con informazioni geografiche
   - Creare nuovi modelli per eventi e ricompense

2. **Fase 2: Implementazione dei Manager**
   - Sviluppare EventManager e EventRewardManager
   - Implementare MultiStageManager e StageTransitionManager
   - Creare GeoChampionshipManager e GeoLocationService

3. **Fase 3: Sviluppo dell'Interfaccia Utente**
   - Implementare TournamentDashboardUI
   - Sviluppare TournamentCreationUI
   - Creare ChampionshipBracketUI

4. **Fase 4: Integrazione e Test**
   - Integrare con il pannello di amministrazione esistente
   - Collegare con il sistema di ranking
   - Testare tutte le funzionalità

5. **Fase 5: Ottimizzazione e Documentazione**
   - Ottimizzare le performance
   - Aggiornare la documentazione
   - Preparare guide per amministratori e utenti
