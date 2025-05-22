// test/rankedSystemTest.js - Test per il sistema ranked e matchmaking

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');
const Match = require('../src/server/models/Match');
const Queue = require('../src/server/models/Queue');
const mmrCalculator = require('../src/server/utils/mmrCalculator');

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

describe('Sistema Ranked e Matchmaking', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  let tokens = [];
  
  // Prima di tutti i test, connettiti al database di test e crea utenti di test
  before(async function() {
    await mongoose.connect(dbConfig.url, dbConfig.options);
    
    // Pulisci il database di test
    await User.deleteMany({});
    await Match.deleteMany({});
    await Queue.deleteMany({});
    
    // Crea utenti di test
    for (let i = 0; i < 6; i++) {
      const user = new User({
        nickname: testUsers[i].nickname,
        email: testUsers[i].email,
        password: testUsers[i].password,
        isVerified: true,
        mmr: {
          '1v1': 1000 + (i * 50),
          '2v2': 1000 + (i * 40),
          '3v3': 1000 + (i * 30)
        },
        stats: {
          '1v1': {
            games: 10,
            wins: 5,
            losses: 5,
            goals: 20
          },
          '2v2': {
            games: 8,
            wins: 4,
            losses: 4,
            goals: 16
          },
          '3v3': {
            games: 6,
            wins: 3,
            losses: 3,
            goals: 12
          }
        }
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
  
  // Test per il sistema di matchmaking
  describe('Matchmaking', function() {
    it('Dovrebbe permettere a un utente di entrare in coda', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({
          mode: '1v1'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('coda');
          expect(res.body).to.have.property('mode').equal('1v1');
          expect(res.body).to.have.property('estimatedWaitTime');
          done();
        });
    });
    
    it('Dovrebbe impedire a un utente di entrare in coda due volte', function(done) {
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({
          mode: '1v1'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('già in coda');
          done();
        });
    });
    
    it('Dovrebbe permettere a un utente di uscire dalla coda', function(done) {
      chai.request(app)
        .post('/api/matchmaking/leave')
        .set('x-auth-token', tokens[0])
        .send({
          mode: '1v1'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('uscito');
          done();
        });
    });
    
    it('Dovrebbe creare un match quando ci sono abbastanza giocatori', function(done) {
      // Metti due giocatori in coda
      chai.request(app)
        .post('/api/matchmaking/join')
        .set('x-auth-token', tokens[0])
        .send({ mode: '1v1' })
        .end(() => {
          chai.request(app)
            .post('/api/matchmaking/join')
            .set('x-auth-token', tokens[1])
            .send({ mode: '1v1' })
            .end(() => {
              // Verifica che sia stato creato un match
              setTimeout(() => {
                Queue.find({ status: 'matched' }).then(queues => {
                  expect(queues).to.have.lengthOf(2);
                  expect(queues[0]).to.have.property('matchId');
                  expect(queues[1]).to.have.property('matchId');
                  expect(queues[0].matchId).to.equal(queues[1].matchId);
                  done();
                });
              }, 1000); // Attendi che il matchmaking processi la coda
            });
        });
    });
  });
  
  // Test per il sistema di classifiche
  describe('Classifiche', function() {
    it('Dovrebbe ottenere le classifiche per una modalità specifica', function(done) {
      chai.request(app)
        .get('/api/rankings/1v1')
        .set('x-auth-token', tokens[0])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('rankings');
          expect(res.body.rankings).to.be.an('array');
          expect(res.body.rankings).to.have.lengthOf(6);
          expect(res.body.rankings[0]).to.have.property('nickname');
          expect(res.body.rankings[0]).to.have.property('mmr');
          done();
        });
    });
    
    it('Dovrebbe ottenere le statistiche dell\'utente corrente', function(done) {
      chai.request(app)
        .get('/api/rankings/me')
        .set('x-auth-token', tokens[0])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('stats');
          expect(res.body.stats).to.have.property('1v1');
          expect(res.body.stats).to.have.property('2v2');
          expect(res.body.stats).to.have.property('3v3');
          expect(res.body.stats['1v1']).to.have.property('mmr');
          expect(res.body.stats['1v1']).to.have.property('games');
          expect(res.body.stats['1v1']).to.have.property('wins');
          expect(res.body.stats['1v1']).to.have.property('losses');
          done();
        });
    });
  });
  
  // Test per il calcolo dell'MMR
  describe('Calcolo MMR', function() {
    it('Dovrebbe calcolare correttamente la variazione di MMR per una vittoria', function() {
      const playerMmr = 1000;
      const opponentMmr = 1000;
      const result = 1; // Vittoria
      const mode = '1v1';
      
      const mmrChange = mmrCalculator.calculateMmrChange(playerMmr, opponentMmr, result, mode);
      
      expect(mmrChange).to.be.a('number');
      expect(mmrChange).to.be.greaterThan(0);
    });
    
    it('Dovrebbe calcolare correttamente la variazione di MMR per una sconfitta', function() {
      const playerMmr = 1000;
      const opponentMmr = 1000;
      const result = 0; // Sconfitta
      const mode = '1v1';
      
      const mmrChange = mmrCalculator.calculateMmrChange(playerMmr, opponentMmr, result, mode);
      
      expect(mmrChange).to.be.a('number');
      expect(mmrChange).to.be.lessThan(0);
    });
    
    it('Dovrebbe calcolare correttamente la variazione di MMR per un pareggio', function() {
      const playerMmr = 1000;
      const opponentMmr = 1000;
      const result = 0.5; // Pareggio
      const mode = '1v1';
      
      const mmrChange = mmrCalculator.calculateMmrChange(playerMmr, opponentMmr, result, mode);
      
      expect(mmrChange).to.be.a('number');
      expect(mmrChange).to.equal(0);
    });
    
    it('Dovrebbe dare più punti per una vittoria contro un avversario più forte', function() {
      const playerMmr = 1000;
      const opponentMmr = 1200;
      const result = 1; // Vittoria
      const mode = '1v1';
      
      const mmrChange = mmrCalculator.calculateMmrChange(playerMmr, opponentMmr, result, mode);
      const normalWinChange = mmrCalculator.calculateMmrChange(1000, 1000, 1, '1v1');
      
      expect(mmrChange).to.be.greaterThan(normalWinChange);
    });
    
    it('Dovrebbe togliere meno punti per una sconfitta contro un avversario più forte', function() {
      const playerMmr = 1000;
      const opponentMmr = 1200;
      const result = 0; // Sconfitta
      const mode = '1v1';
      
      const mmrChange = mmrCalculator.calculateMmrChange(playerMmr, opponentMmr, result, mode);
      const normalLossChange = mmrCalculator.calculateMmrChange(1000, 1000, 0, '1v1');
      
      expect(mmrChange).to.be.greaterThan(normalLossChange);
    });
  });
  
  // Test per la simulazione di un match completo
  describe('Simulazione Match Completo', function() {
    let matchId;
    
    it('Dovrebbe creare un match e aggiornare l\'MMR dei giocatori', async function() {
      // Crea un nuovo match
      const match = new Match({
        mode: '1v1',
        players: [
          {
            user: (await User.findOne({ nickname: testUsers[2].nickname }))._id,
            team: 0,
            startingMmr: 1100
          },
          {
            user: (await User.findOne({ nickname: testUsers[3].nickname }))._id,
            team: 1,
            startingMmr: 1150
          }
        ],
        status: 'in_progress',
        startedAt: new Date()
      });
      
      await match.save();
      matchId = match._id;
      
      // Simula la fine del match
      match.teamScores = { 0: 3, 1: 1 };
      match.status = 'completed';
      match.endedAt = new Date();
      
      // Aggiorna le statistiche
      match.players[0].goals = 3;
      match.players[1].goals = 1;
      
      // Calcola le statistiche e aggiorna l'MMR
      match.calculateStats();
      await match.updatePlayerMmr(mmrCalculator);
      
      await match.save();
      
      // Verifica che l'MMR sia stato aggiornato correttamente
      expect(match.players[0]).to.have.property('mmrChange').that.is.greaterThan(0);
      expect(match.players[1]).to.have.property('mmrChange').that.is.lessThan(0);
      
      // Aggiorna l'MMR degli utenti
      const user1 = await User.findById(match.players[0].user);
      const user2 = await User.findById(match.players[1].user);
      
      user1.mmr['1v1'] += match.players[0].mmrChange;
      user1.stats['1v1'].games += 1;
      user1.stats['1v1'].wins += 1;
      user1.stats['1v1'].goals += 3;
      
      user2.mmr['1v1'] += match.players[1].mmrChange;
      user2.stats['1v1'].games += 1;
      user2.stats['1v1'].losses += 1;
      user2.stats['1v1'].goals += 1;
      
      await user1.save();
      await user2.save();
      
      // Verifica che gli utenti siano stati aggiornati
      const updatedUser1 = await User.findById(match.players[0].user);
      const updatedUser2 = await User.findById(match.players[1].user);
      
      expect(updatedUser1.mmr['1v1']).to.equal(1100 + match.players[0].mmrChange);
      expect(updatedUser2.mmr['1v1']).to.equal(1150 + match.players[1].mmrChange);
    });
    
    it('Dovrebbe ottenere il riepilogo del match', async function() {
      const match = await Match.findById(matchId);
      const summary = match.getSummary();
      
      expect(summary).to.have.property('id');
      expect(summary).to.have.property('mode').equal('1v1');
      expect(summary).to.have.property('teams');
      expect(summary.teams).to.have.property('0');
      expect(summary.teams).to.have.property('1');
      expect(summary.teams[0]).to.have.property('score').equal(3);
      expect(summary.teams[1]).to.have.property('score').equal(1);
      expect(summary).to.have.property('winningTeam').equal(0);
    });
  });
});
