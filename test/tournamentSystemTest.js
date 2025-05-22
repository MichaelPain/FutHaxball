/**
 * tournamentSystemTest.js - Test per il sistema di tornei
 * 
 * Questo file contiene i test per verificare il corretto funzionamento
 * del sistema di tornei, inclusi tornei standard, eventi, campionati
 * geolocalizzati, tornei multi-stage e sistema di ricompense.
 */

const assert = require('assert');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server/server');
const Tournament = require('../src/server/models/Tournament');
const User = require('../src/server/models/User');
const EventReward = require('../src/server/models/EventReward');
const GeoLocationService = require('../src/server/services/GeoLocationService');
const CountryDetector = require('../src/server/services/CountryDetector');
const RegionManager = require('../src/server/services/RegionManager');
const QualificationPathway = require('../src/server/services/QualificationPathway');

// Configurazione del test
const testConfig = require('./testConfig');

describe('Sistema di Tornei', function() {
  let authToken;
  let testUser;
  let testTournament;
  let testEvent;
  let testChampionship;
  let testReward;
  
  // Prima di tutti i test
  before(async function() {
    this.timeout(10000); // Timeout più lungo per la connessione al database
    
    // Connessione al database di test
    await mongoose.connect(testConfig.testDbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    // Pulisci il database di test
    await Tournament.deleteMany({});
    await User.deleteMany({});
    await EventReward.deleteMany({});
    
    // Crea un utente di test
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      nickname: 'TestUser'
    };
    
    const res = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    assert.strictEqual(res.status, 201);
    testUser = res.body.user;
    
    // Login per ottenere il token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    assert.strictEqual(loginRes.status, 200);
    authToken = loginRes.body.token;
  });
  
  // Dopo tutti i test
  after(async function() {
    // Disconnessione dal database
    await mongoose.disconnect();
  });
  
  // Test per i servizi di geolocalizzazione
  describe('Servizi di Geolocalizzazione', function() {
    it('GeoLocationService dovrebbe rilevare la posizione tramite IP', async function() {
      const geoLocationService = new GeoLocationService();
      const location = await geoLocationService.getLocationByIp('8.8.8.8'); // IP di Google DNS
      
      assert.strictEqual(location.success, true);
      assert.strictEqual(typeof location.country_code, 'string');
      assert.strictEqual(typeof location.country_name, 'string');
    });
    
    it('CountryDetector dovrebbe rilevare il paese di un utente', async function() {
      const countryDetector = new CountryDetector();
      const countryInfo = await countryDetector.detectCountry({ ip: '8.8.8.8' });
      
      assert.strictEqual(typeof countryInfo.country_code, 'string');
      assert.strictEqual(typeof countryInfo.country_name, 'string');
    });
    
    it('RegionManager dovrebbe fornire informazioni sui paesi e continenti', function() {
      const regionManager = new RegionManager();
      const continents = regionManager.getAllContinents();
      
      assert.strictEqual(Array.isArray(continents), true);
      assert.strictEqual(continents.length > 0, true);
      
      const europeCountries = regionManager.getCountriesInContinent('EU');
      assert.strictEqual(Array.isArray(europeCountries), true);
      assert.strictEqual(europeCountries.length > 0, true);
    });
    
    it('QualificationPathway dovrebbe fornire percorsi di qualificazione', function() {
      const regionManager = new RegionManager();
      const qualificationPathway = new QualificationPathway({ regionManager });
      
      const nationalPathway = qualificationPathway.getNationalQualificationPathway('IT');
      assert.strictEqual(typeof nationalPathway.country, 'object');
      assert.strictEqual(typeof nationalPathway.continent, 'object');
      assert.strictEqual(typeof nationalPathway.qualifiesTo, 'object');
      
      const continentalPathway = qualificationPathway.getContinentalQualificationPathway('EU');
      assert.strictEqual(typeof continentalPathway.continent, 'object');
      assert.strictEqual(typeof continentalPathway.qualifiesTo, 'object');
      assert.strictEqual(typeof continentalPathway.qualifiesFrom, 'object');
    });
  });
  
  // Test per i tornei standard
  describe('Tornei Standard', function() {
    it('Dovrebbe creare un nuovo torneo', async function() {
      const tournamentData = {
        name: 'Torneo di Test',
        description: 'Questo è un torneo di test',
        format: 'single_elimination',
        startDate: new Date(Date.now() + 86400000), // Domani
        endDate: new Date(Date.now() + 172800000), // Dopodomani
        maxParticipants: 16,
        status: 'registration'
      };
      
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tournamentData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.tournament.name, tournamentData.name);
      assert.strictEqual(res.body.tournament.format, tournamentData.format);
      
      testTournament = res.body.tournament;
    });
    
    it('Dovrebbe ottenere la lista dei tornei', async function() {
      const res = await request(app)
        .get('/api/tournaments');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere i dettagli di un torneo', async function() {
      const res = await request(app)
        .get(`/api/tournaments/${testTournament._id}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.tournament._id, testTournament._id);
      assert.strictEqual(res.body.tournament.name, testTournament.name);
    });
    
    it('Dovrebbe registrare un partecipante a un torneo', async function() {
      const res = await request(app)
        .post(`/api/tournaments/${testTournament._id}/register`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
    
    it('Dovrebbe aggiornare un torneo', async function() {
      const updateData = {
        name: 'Torneo di Test Aggiornato',
        description: 'Descrizione aggiornata'
      };
      
      const res = await request(app)
        .put(`/api/tournaments/${testTournament._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.tournament.name, updateData.name);
      assert.strictEqual(res.body.tournament.description, updateData.description);
    });
    
    it('Dovrebbe avviare un torneo', async function() {
      const res = await request(app)
        .post(`/api/tournaments/${testTournament._id}/start`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.tournament.status, 'active');
    });
    
    it('Dovrebbe completare un torneo', async function() {
      const res = await request(app)
        .post(`/api/tournaments/${testTournament._id}/complete`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.tournament.status, 'completed');
    });
  });
  
  // Test per gli eventi
  describe('Eventi', function() {
    it('Dovrebbe creare un nuovo evento', async function() {
      const eventData = {
        name: 'Evento di Test',
        description: 'Questo è un evento di test',
        format: 'single_elimination',
        startDate: new Date(Date.now() + 86400000), // Domani
        endDate: new Date(Date.now() + 172800000), // Dopodomani
        maxParticipants: 16,
        status: 'registration',
        type: 'event',
        rewards: [
          {
            name: 'Badge di Partecipazione',
            description: 'Badge per aver partecipato all\'evento',
            type: 'badge',
            value: 'participation_badge',
            rarity: 'common'
          }
        ]
      };
      
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.event.name, eventData.name);
      assert.strictEqual(res.body.event.type, 'event');
      
      testEvent = res.body.event;
    });
    
    it('Dovrebbe ottenere la lista degli eventi', async function() {
      const res = await request(app)
        .get('/api/events');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere i dettagli di un evento', async function() {
      const res = await request(app)
        .get(`/api/events/${testEvent._id}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.event._id, testEvent._id);
      assert.strictEqual(res.body.event.name, testEvent.name);
    });
    
    it('Dovrebbe registrare un partecipante a un evento', async function() {
      const res = await request(app)
        .post(`/api/events/${testEvent._id}/register`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });
    
    it('Dovrebbe creare una ricompensa', async function() {
      const rewardData = {
        name: 'Badge di Test',
        description: 'Questo è un badge di test',
        type: 'badge',
        value: 'test_badge',
        imageUrl: 'https://example.com/badge.png',
        rarity: 'rare'
      };
      
      const res = await request(app)
        .post('/api/rewards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(rewardData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.reward.name, rewardData.name);
      assert.strictEqual(res.body.reward.type, rewardData.type);
      
      testReward = res.body.reward;
    });
    
    it('Dovrebbe ottenere la lista delle ricompense', async function() {
      const res = await request(app)
        .get('/api/rewards');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere le ricompense di un utente', async function() {
      const res = await request(app)
        .get(`/api/users/${testUser._id}/rewards`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body.rewards), true);
    });
  });
  
  // Test per i campionati geolocalizzati
  describe('Campionati Geolocalizzati', function() {
    it('Dovrebbe creare un nuovo campionato nazionale', async function() {
      const championshipData = {
        name: 'Campionato Italiano',
        description: 'Campionato nazionale italiano',
        format: 'round_robin',
        startDate: new Date(Date.now() + 86400000), // Domani
        endDate: new Date(Date.now() + 172800000), // Dopodomani
        maxParticipants: 16,
        status: 'registration',
        type: 'championship',
        geoRestriction: {
          type: 'country',
          country: 'IT'
        }
      };
      
      const res = await request(app)
        .post('/api/geo-championships')
        .set('Authorization', `Bearer ${authToken}`)
        .send(championshipData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.championship.name, championshipData.name);
      assert.strictEqual(res.body.championship.geoRestriction.country, 'IT');
      
      testChampionship = res.body.championship;
    });
    
    it('Dovrebbe ottenere la lista dei campionati', async function() {
      const res = await request(app)
        .get('/api/geo-championships');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere i campionati di un paese', async function() {
      const res = await request(app)
        .get('/api/geo-championships/country/IT');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere i campionati di un continente', async function() {
      const res = await request(app)
        .get('/api/geo-championships/continent/EU');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
    });
    
    it('Dovrebbe ottenere i campionati internazionali', async function() {
      const res = await request(app)
        .get('/api/geo-championships/international');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
    });
    
    it('Dovrebbe rilevare la posizione geografica dell\'utente', async function() {
      const res = await request(app)
        .get('/api/geo-location/detect')
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(typeof res.body.country_code, 'string');
      assert.strictEqual(typeof res.body.country_name, 'string');
    });
  });
  
  // Test per i tornei multi-stage
  describe('Tornei Multi-Stage', function() {
    let testMultiStageTournament;
    let testStage;
    
    it('Dovrebbe creare un nuovo torneo multi-stage', async function() {
      const tournamentData = {
        name: 'Torneo Multi-Stage di Test',
        description: 'Questo è un torneo multi-stage di test',
        format: 'multi_stage',
        startDate: new Date(Date.now() + 86400000), // Domani
        endDate: new Date(Date.now() + 2592000000), // Tra un mese
        maxParticipants: 32,
        status: 'registration'
      };
      
      const res = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tournamentData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.tournament.name, tournamentData.name);
      assert.strictEqual(res.body.tournament.format, 'multi_stage');
      
      testMultiStageTournament = res.body.tournament;
    });
    
    it('Dovrebbe creare una fase per un torneo multi-stage', async function() {
      const stageData = {
        name: 'Fase di Gruppi',
        format: 'round_robin',
        order: 1,
        startDate: new Date(Date.now() + 86400000), // Domani
        endDate: new Date(Date.now() + 604800000), // Tra una settimana
        qualificationCount: 8
      };
      
      const res = await request(app)
        .post(`/api/multi-stage/${testMultiStageTournament._id}/stages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(stageData);
      
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.stage.name, stageData.name);
      assert.strictEqual(res.body.stage.format, stageData.format);
      
      testStage = res.body.stage;
    });
    
    it('Dovrebbe ottenere le fasi di un torneo multi-stage', async function() {
      const res = await request(app)
        .get(`/api/multi-stage/${testMultiStageTournament._id}/stages`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body), true);
      assert.strictEqual(res.body.length > 0, true);
    });
    
    it('Dovrebbe ottenere i dettagli di una fase', async function() {
      const res = await request(app)
        .get(`/api/multi-stage/${testMultiStageTournament._id}/stages/${testStage._id}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.stage._id, testStage._id);
      assert.strictEqual(res.body.stage.name, testStage.name);
    });
    
    it('Dovrebbe aggiornare una fase', async function() {
      const updateData = {
        name: 'Fase di Gruppi Aggiornata',
        qualificationCount: 10
      };
      
      const res = await request(app)
        .put(`/api/multi-stage/${testMultiStageTournament._id}/stages/${testStage._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.stage.name, updateData.name);
      assert.strictEqual(res.body.stage.qualificationCount, updateData.qualificationCount);
    });
    
    it('Dovrebbe avviare una fase', async function() {
      // Prima registra l'utente al torneo
      await request(app)
        .post(`/api/tournaments/${testMultiStageTournament._id}/register`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const res = await request(app)
        .post(`/api/multi-stage/${testMultiStageTournament._id}/stages/${testStage._id}/start`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.stage.status, 'active');
    });
    
    it('Dovrebbe generare un bracket per una fase', async function() {
      const res = await request(app)
        .post(`/api/multi-stage/${testMultiStageTournament._id}/stages/${testStage._id}/generate-bracket`)
        .set('Authorization', `Bearer ${authToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Array.isArray(res.body.bracket), true);
    });
  });
  
  // Test per l'interfaccia utente
  describe('Interfaccia Utente', function() {
    it('Dovrebbe servire la pagina principale', async function() {
      const res = await request(app)
        .get('/');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.type, 'text/html');
    });
    
    it('Dovrebbe servire i file CSS', async function() {
      const res = await request(app)
        .get('/css/style.css');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.type, 'text/css');
    });
    
    it('Dovrebbe servire i file JavaScript', async function() {
      const res = await request(app)
        .get('/js/main.js');
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.type, 'application/javascript');
    });
  });
});
