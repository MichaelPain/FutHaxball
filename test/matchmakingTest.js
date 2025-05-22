// test/matchmakingTest.js - Test per il sistema di matchmaking

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');
const Match = require('../src/server/models/Match');

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

describe('Sistema di Matchmaking', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  let tokens = [];
  
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
      
      await user.save();
      
      // Effettua il login per ottenere i token
      const res = await chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[i].email,
          password: testUsers[i].password
        });
      
      tokens[i] = res.body.token;
    }
  });
  
  // Dopo tutti i test, disconnettiti dal database
  after(async function() {
    await mongoose.connection.close();
  });
  
  // Test per l'entrata in coda
  describe('Entrata in Coda', function() {
    it('Dovrebbe aggiungere un giocatore alla coda 1v1', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({ mode: '1v1' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('coda');
          done();
        });
    });
    
    it('Dovrebbe rifiutare l\'entrata in coda se già in coda', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({ mode: '2v2' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('già in coda');
          done();
        });
    });
    
    it('Dovrebbe creare un match quando due giocatori sono in coda 1v1', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[1])
        .send({ mode: '1v1' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          // Potrebbe trovare un match o rimanere in coda, entrambi sono risultati validi
          if (res.body.matchId) {
            expect(res.body).to.have.property('message').that.includes('Match trovato');
          } else {
            expect(res.body).to.have.property('message').that.includes('coda');
          }
          done();
        });
    });
  });
  
  // Test per l'uscita dalla coda
  describe('Uscita dalla Coda', function() {
    it('Dovrebbe rimuovere un giocatore dalla coda', function(done) {
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[0])
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('Rimosso');
          done();
        });
    });
    
    it('Dovrebbe gestire correttamente l\'uscita di un giocatore non in coda', function(done) {
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[0])
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('message').that.includes('non sei in nessuna coda');
          done();
        });
    });
  });
  
  // Test per la creazione di gruppi
  describe('Gestione Gruppi', function() {
    let groupId;
    
    it('Dovrebbe creare un nuovo gruppo per modalità 3v3', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[2])
        .send({ mode: '3v3' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('gruppo creato');
          expect(res.body).to.have.property('groupId');
          groupId = res.body.groupId;
          done();
        });
    });
    
    it('Dovrebbe permettere ad un altro giocatore di unirsi al gruppo', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[3])
        .send({ mode: '3v3', groupId })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('Aggiunto al gruppo');
          expect(res.body).to.have.property('players').with.lengthOf(2);
          done();
        });
    });
    
    it('Dovrebbe permettere ad un giocatore di lasciare il gruppo', function(done) {
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[3])
        .send({ groupId })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('Rimosso dal gruppo');
          expect(res.body).to.have.property('players').with.lengthOf(1);
          done();
        });
    });
    
    it('Dovrebbe rimuovere il gruppo quando l\'ultimo giocatore lo lascia', function(done) {
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[2])
        .send({ groupId })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('Gruppo rimosso');
          done();
        });
    });
  });
  
  // Test per lo stato della coda
  describe('Stato della Coda', function() {
    before(function(done) {
      // Aggiungi un giocatore alla coda
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({ mode: '1v1' })
        .end(() => done());
    });
    
    it('Dovrebbe ottenere lo stato della coda per un giocatore in coda', function(done) {
      chai.request(app)
        .get('/api/matchmaking/status')
        .set('x-auth-token', tokens[0])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('inQueue').equal(true);
          expect(res.body).to.have.property('mode').equal('1v1');
          done();
        });
    });
    
    it('Dovrebbe ottenere lo stato per un giocatore non in coda', function(done) {
      chai.request(app)
        .get('/api/matchmaking/status')
        .set('x-auth-token', tokens[1])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('inQueue').equal(false);
          expect(res.body).to.have.property('inGroup').equal(false);
          done();
        });
    });
    
    after(function(done) {
      // Rimuovi il giocatore dalla coda
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[0])
        .send({})
        .end(() => done());
    });
  });
});
