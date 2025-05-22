// test/rankingTest.js - Test per il sistema di classifiche

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');
const Match = require('../src/server/models/Match');
const rankingController = require('../src/server/controllers/rankingController');

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
chai.use(chaiHttp);

describe('Sistema di Classifiche', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  let userIds = [];
  let matchId;
  
  // Prima di tutti i test, connettiti al database di test e crea utenti di test
  before(async function() {
    await mongoose.connect(dbConfig.url, dbConfig.options);
    
    // Pulisci il database di test
    await User.deleteMany({});
    await Match.deleteMany({});
    
    // Crea utenti di test
    for (let i = 0; i < 4; i++) {
      const user = new User({
        nickname: testUsers[i].nickname,
        email: testUsers[i].email,
        password: testUsers[i].password,
        isVerified: true
      });
      
      const savedUser = await user.save();
      userIds.push(savedUser._id);
    }
    
    // Crea una partita di test
    const match = new Match({
      matchId: 'test-match-1',
      type: 'ranked',
      mode: '1v1',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000), // 1 ora fa
      endTime: new Date(),
      redTeam: [{
        userId: userIds[0],
        nickname: testUsers[0].nickname,
        goals: 3,
        assists: 0,
        mmrBefore: 1000
      }],
      blueTeam: [{
        userId: userIds[1],
        nickname: testUsers[1].nickname,
        goals: 1,
        assists: 0,
        mmrBefore: 1000
      }],
      score: {
        red: 3,
        blue: 1
      },
      winner: 'red'
    });
    
    const savedMatch = await match.save();
    matchId = savedMatch._id;
    
    // Aggiorna l'MMR in base al risultato della partita
    await rankingController.updateMMR('test-match-1');
  });
  
  // Dopo tutti i test, disconnettiti dal database
  after(async function() {
    await mongoose.connection.close();
  });
  
  // Test per le classifiche
  describe('Classifiche', function() {
    it('Dovrebbe ottenere la classifica per la modalità solo', function(done) {
      chai.request(app)
        .get('/api/rankings/solo')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          // Potrebbe essere vuota se non ci sono abbastanza partite giocate
          done();
        });
    });
    
    it('Dovrebbe rifiutare una richiesta per una modalità non valida', function(done) {
      chai.request(app)
        .get('/api/rankings/invalid')
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('non valida');
          done();
        });
    });
  });
  
  // Test per le statistiche dei giocatori
  describe('Statistiche Giocatori', function() {
    it('Dovrebbe ottenere le statistiche di un giocatore', function(done) {
      chai.request(app)
        .get(`/api/players/${userIds[0]}/stats`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('nickname').equal(testUsers[0].nickname);
          expect(res.body).to.have.property('stats');
          expect(res.body).to.have.property('ranking');
          done();
        });
    });
    
    it('Dovrebbe rifiutare una richiesta per un giocatore non esistente', function(done) {
      chai.request(app)
        .get('/api/players/000000000000000000000000/stats')
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('message').that.includes('non trovato');
          done();
        });
    });
  });
  
  // Test per la posizione in classifica
  describe('Posizione in Classifica', function() {
    it('Dovrebbe ottenere la posizione in classifica di un giocatore', function(done) {
      chai.request(app)
        .get(`/api/rankings/solo/player/${userIds[0]}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('nickname').equal(testUsers[0].nickname);
          expect(res.body).to.have.property('mmr');
          // Potrebbe non avere un rank se non ha giocato abbastanza partite
          done();
        });
    });
  });
  
  // Test per l'esportazione delle classifiche
  describe('Esportazione Classifiche', function() {
    it('Dovrebbe esportare le classifiche in formato JSON', function(done) {
      chai.request(app)
        .get('/api/rankings/solo/export/json')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('array');
          done();
        });
    });
    
    it('Dovrebbe esportare le classifiche in formato CSV', function(done) {
      chai.request(app)
        .get('/api/rankings/solo/export/csv')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res).to.have.header('content-type', 'text/csv');
          expect(res).to.have.header('content-disposition').that.includes('attachment');
          done();
        });
    });
  });
});
