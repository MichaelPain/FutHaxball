// test/mapEditorTest.js - Test per l'editor di mappe

const chai = require('chai');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');
const Map = require('../src/server/models/Map');

// Configurazione del server per i test
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

// Carica le variabili d'ambiente
dotenv.config();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rotte API
app.use('/api', require('../src/server/routes/api'));

// Aspettative
const expect = chai.expect;
chai.use(require('chai-http'));

describe('Editor di Mappe', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  let token;
  let mapId;
  
  // Prima di tutti i test, connettiti al database di test e crea un utente di test
  before(async function() {
    await mongoose.connect(dbConfig.url, dbConfig.options);
    
    // Pulisci il database di test
    await User.deleteMany({});
    await Map.deleteMany({});
    
    // Crea un utente di test
    const user = new User({
      nickname: testUsers[0].nickname,
      email: testUsers[0].email,
      password: testUsers[0].password,
      isVerified: true
    });
    
    await user.save();
    
    // Effettua il login per ottenere il token
    const res = await chai.request(app)
      .post('/api/auth/login')
      .send({
        email: testUsers[0].email,
        password: testUsers[0].password
      });
    
    token = res.body.token;
  });
  
  // Dopo tutti i test, disconnettiti dal database
  after(async function() {
    await mongoose.connection.close();
  });
  
  // Test per la creazione di mappe
  describe('Creazione Mappe', function() {
    it('Dovrebbe creare una nuova mappa', function(done) {
      const testMap = {
        name: 'Test Map',
        width: 800,
        height: 600,
        elements: {
          walls: [
            { x: 100, y: 100, width: 200, height: 20 }
          ],
          goals: {
            red: { x: 0, y: 300, width: 8, height: 140 },
            blue: { x: 792, y: 300, width: 8, height: 140 }
          },
          spawnPoints: {
            red: [{ x: 200, y: 300 }],
            blue: [{ x: 600, y: 300 }]
          },
          decorations: [
            { x: 400, y: 300, width: 50, height: 50, color: '#cccccc' }
          ]
        }
      };
      
      chai.request(app)
        .post('/api/maps')
        .set('x-auth-token', token)
        .send(testMap)
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('map');
          expect(res.body.map).to.have.property('id');
          expect(res.body.map).to.have.property('name').equal('Test Map');
          expect(res.body.map).to.have.property('author').equal(testUsers[0].nickname);
          
          mapId = res.body.map.id;
          done();
        });
    });
    
    it('Dovrebbe rifiutare la creazione di una mappa senza nome', function(done) {
      const invalidMap = {
        name: '',
        width: 800,
        height: 600,
        elements: {
          walls: [],
          goals: {
            red: { x: 0, y: 300, width: 8, height: 140 },
            blue: { x: 792, y: 300, width: 8, height: 140 }
          },
          spawnPoints: {
            red: [{ x: 200, y: 300 }],
            blue: [{ x: 600, y: 300 }]
          },
          decorations: []
        }
      };
      
      chai.request(app)
        .post('/api/maps')
        .set('x-auth-token', token)
        .send(invalidMap)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('nome');
          done();
        });
    });
    
    it('Dovrebbe rifiutare la creazione di una mappa senza porte', function(done) {
      const invalidMap = {
        name: 'Invalid Map',
        width: 800,
        height: 600,
        elements: {
          walls: [],
          goals: {},
          spawnPoints: {
            red: [{ x: 200, y: 300 }],
            blue: [{ x: 600, y: 300 }]
          },
          decorations: []
        }
      };
      
      chai.request(app)
        .post('/api/maps')
        .set('x-auth-token', token)
        .send(invalidMap)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('porte');
          done();
        });
    });
  });
  
  // Test per il recupero delle mappe
  describe('Recupero Mappe', function() {
    it('Dovrebbe ottenere la lista delle mappe', function(done) {
      chai.request(app)
        .get('/api/maps')
        .set('x-auth-token', token)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('maps');
          expect(res.body.maps).to.be.an('array');
          expect(res.body.maps).to.have.lengthOf.at.least(1);
          expect(res.body.maps[0]).to.have.property('name').equal('Test Map');
          done();
        });
    });
    
    it('Dovrebbe ottenere una mappa specifica', function(done) {
      chai.request(app)
        .get(`/api/maps/${mapId}`)
        .set('x-auth-token', token)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('map');
          expect(res.body.map).to.have.property('id').equal(mapId);
          expect(res.body.map).to.have.property('name').equal('Test Map');
          expect(res.body.map).to.have.property('elements');
          expect(res.body.map.elements).to.have.property('walls');
          expect(res.body.map.elements).to.have.property('goals');
          expect(res.body.map.elements).to.have.property('spawnPoints');
          done();
        });
    });
    
    it('Dovrebbe gestire correttamente la richiesta di una mappa inesistente', function(done) {
      chai.request(app)
        .get('/api/maps/000000000000000000000000')
        .set('x-auth-token', token)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('message').that.includes('non trovata');
          done();
        });
    });
  });
  
  // Test per l'aggiornamento delle mappe
  describe('Aggiornamento Mappe', function() {
    it('Dovrebbe aggiornare una mappa esistente', function(done) {
      const updatedMap = {
        name: 'Updated Test Map',
        width: 800,
        height: 600,
        elements: {
          walls: [
            { x: 100, y: 100, width: 200, height: 20 },
            { x: 500, y: 100, width: 200, height: 20 }
          ],
          goals: {
            red: { x: 0, y: 300, width: 8, height: 140 },
            blue: { x: 792, y: 300, width: 8, height: 140 }
          },
          spawnPoints: {
            red: [{ x: 200, y: 300 }],
            blue: [{ x: 600, y: 300 }]
          },
          decorations: [
            { x: 400, y: 300, width: 50, height: 50, color: '#cccccc' }
          ]
        }
      };
      
      chai.request(app)
        .put(`/api/maps/${mapId}`)
        .set('x-auth-token', token)
        .send(updatedMap)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('map');
          expect(res.body.map).to.have.property('name').equal('Updated Test Map');
          expect(res.body.map.elements.walls).to.have.lengthOf(2);
          done();
        });
    });
    
    it('Dovrebbe impedire l\'aggiornamento di una mappa da parte di un utente non autorizzato', function(done) {
      // Crea un altro utente
      const user = new User({
        nickname: testUsers[1].nickname,
        email: testUsers[1].email,
        password: testUsers[1].password,
        isVerified: true
      });
      
      user.save().then(() => {
        // Effettua il login con il nuovo utente
        chai.request(app)
          .post('/api/auth/login')
          .send({
            email: testUsers[1].email,
            password: testUsers[1].password
          })
          .end((err, res) => {
            const unauthorizedToken = res.body.token;
            
            // Prova ad aggiornare la mappa con il nuovo utente
            chai.request(app)
              .put(`/api/maps/${mapId}`)
              .set('x-auth-token', unauthorizedToken)
              .send({
                name: 'Unauthorized Update',
                width: 800,
                height: 600,
                elements: {
                  walls: [],
                  goals: {
                    red: { x: 0, y: 300, width: 8, height: 140 },
                    blue: { x: 792, y: 300, width: 8, height: 140 }
                  },
                  spawnPoints: {
                    red: [{ x: 200, y: 300 }],
                    blue: [{ x: 600, y: 300 }]
                  },
                  decorations: []
                }
              })
              .end((err, res) => {
                expect(res).to.have.status(403);
                expect(res.body).to.have.property('message').that.includes('autorizzato');
                done();
              });
          });
      });
    });
  });
  
  // Test per l'eliminazione delle mappe
  describe('Eliminazione Mappe', function() {
    it('Dovrebbe eliminare una mappa esistente', function(done) {
      chai.request(app)
        .delete(`/api/maps/${mapId}`)
        .set('x-auth-token', token)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('eliminata');
          
          // Verifica che la mappa sia stata effettivamente eliminata
          chai.request(app)
            .get(`/api/maps/${mapId}`)
            .set('x-auth-token', token)
            .end((err, res) => {
              expect(res).to.have.status(404);
              done();
            });
        });
    });
  });
});
