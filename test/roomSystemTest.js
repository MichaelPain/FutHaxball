// test/roomSystemTest.js - Test per il sistema di stanze

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');
const Room = require('../src/server/models/Room');

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

describe('Sistema di Stanze', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  let tokens = [];
  let roomId;
  
  // Prima di tutti i test, connettiti al database di test e crea utenti di test
  before(async function() {
    await mongoose.connect(dbConfig.url, dbConfig.options);
    
    // Pulisci il database di test
    await User.deleteMany({});
    await Room.deleteMany({});
    
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
  
  // Test per la creazione di stanze
  describe('Creazione Stanze', function() {
    it('Dovrebbe creare una nuova stanza', function(done) {
      chai.request(app)
        .post('/api/rooms')
        .set('x-auth-token', tokens[0])
        .send({
          name: 'Test Room',
          password: null,
          maxPlayers: 10,
          type: 'normal'
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('room');
          expect(res.body.room).to.have.property('id');
          expect(res.body.room).to.have.property('name').equal('Test Room');
          expect(res.body.room).to.have.property('host').equal(testUsers[0].nickname);
          
          roomId = res.body.room.id;
          done();
        });
    });
    
    it('Dovrebbe rifiutare la creazione di una stanza senza nome', function(done) {
      chai.request(app)
        .post('/api/rooms')
        .set('x-auth-token', tokens[1])
        .send({
          name: '',
          password: null,
          maxPlayers: 10,
          type: 'normal'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('nome');
          done();
        });
    });
    
    it('Dovrebbe creare una stanza con password', function(done) {
      chai.request(app)
        .post('/api/rooms')
        .set('x-auth-token', tokens[1])
        .send({
          name: 'Private Room',
          password: 'secret123',
          maxPlayers: 8,
          type: 'normal'
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('room');
          expect(res.body.room).to.have.property('hasPassword').equal(true);
          done();
        });
    });
  });
  
  // Test per l'unione alle stanze
  describe('Unione alle Stanze', function() {
    it('Dovrebbe permettere di unirsi a una stanza pubblica', function(done) {
      chai.request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set('x-auth-token', tokens[1])
        .send({})
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('unito');
          expect(res.body).to.have.property('room');
          expect(res.body.room.players).to.include.something.that.has.property('nickname').equal(testUsers[1].nickname);
          done();
        });
    });
    
    it('Dovrebbe rifiutare l\'accesso a una stanza con password errata', function(done) {
      // Prima ottieni l'ID della stanza privata
      chai.request(app)
        .get('/api/rooms')
        .set('x-auth-token', tokens[2])
        .end((err, res) => {
          const privateRoom = res.body.rooms.find(room => room.name === 'Private Room');
          
          chai.request(app)
            .post(`/api/rooms/${privateRoom.id}/join`)
            .set('x-auth-token', tokens[2])
            .send({ password: 'wrongpassword' })
            .end((err, res) => {
              expect(res).to.have.status(401);
              expect(res.body).to.have.property('message').that.includes('password');
              done();
            });
        });
    });
    
    it('Dovrebbe permettere di unirsi a una stanza con password corretta', function(done) {
      // Prima ottieni l'ID della stanza privata
      chai.request(app)
        .get('/api/rooms')
        .set('x-auth-token', tokens[2])
        .end((err, res) => {
          const privateRoom = res.body.rooms.find(room => room.name === 'Private Room');
          
          chai.request(app)
            .post(`/api/rooms/${privateRoom.id}/join`)
            .set('x-auth-token', tokens[2])
            .send({ password: 'secret123' })
            .end((err, res) => {
              expect(res).to.have.status(200);
              expect(res.body).to.have.property('message').that.includes('unito');
              done();
            });
        });
    });
  });
  
  // Test per la gestione delle stanze
  describe('Gestione delle Stanze', function() {
    it('Dovrebbe permettere all\'host di espellere un giocatore', function(done) {
      chai.request(app)
        .post(`/api/rooms/${roomId}/kick`)
        .set('x-auth-token', tokens[0])
        .send({ playerId: testUsers[1].nickname })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('espulso');
          done();
        });
    });
    
    it('Dovrebbe impedire a un non-host di espellere un giocatore', function(done) {
      // Prima aggiungi un altro giocatore alla stanza
      chai.request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set('x-auth-token', tokens[2])
        .send({})
        .end(() => {
          // Poi prova a espellere qualcuno come non-host
          chai.request(app)
            .post(`/api/rooms/${roomId}/kick`)
            .set('x-auth-token', tokens[2])
            .send({ playerId: testUsers[0].nickname })
            .end((err, res) => {
              expect(res).to.have.status(403);
              expect(res.body).to.have.property('message').that.includes('host');
              done();
            });
        });
    });
    
    it('Dovrebbe permettere all\'host di trasferire i privilegi di host', function(done) {
      chai.request(app)
        .post(`/api/rooms/${roomId}/transfer-host`)
        .set('x-auth-token', tokens[0])
        .send({ newHostId: testUsers[2].nickname })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('trasferiti');
          
          // Verifica che il nuovo host sia effettivamente cambiato
          chai.request(app)
            .get(`/api/rooms/${roomId}`)
            .set('x-auth-token', tokens[0])
            .end((err, res) => {
              expect(res.body.room.host).to.equal(testUsers[2].nickname);
              done();
            });
        });
    });
  });
  
  // Test per il sistema di invito
  describe('Sistema di Invito', function() {
    it('Dovrebbe generare un link di invito valido', function(done) {
      chai.request(app)
        .get(`/api/rooms/${roomId}/invite`)
        .set('x-auth-token', tokens[2]) // Ora testUsers[2] è l'host
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('inviteLink');
          expect(res.body.inviteLink).to.include(roomId);
          done();
        });
    });
    
    it('Dovrebbe permettere di unirsi tramite link di invito', function(done) {
      // Simula l'unione tramite link di invito
      chai.request(app)
        .post(`/api/rooms/join-by-invite/${roomId}`)
        .set('x-auth-token', tokens[3])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('unito');
          expect(res.body).to.have.property('room');
          expect(res.body.room.players).to.include.something.that.has.property('nickname').equal(testUsers[3].nickname);
          done();
        });
    });
  });
  
  // Test per la chat della stanza
  describe('Chat della Stanza', function() {
    it('Dovrebbe inviare un messaggio alla chat della stanza', function(done) {
      const message = 'Ciao a tutti!';
      
      chai.request(app)
        .post(`/api/rooms/${roomId}/chat`)
        .set('x-auth-token', tokens[3])
        .send({ message })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('inviato');
          
          // Verifica che il messaggio sia stato aggiunto alla chat
          chai.request(app)
            .get(`/api/rooms/${roomId}/chat`)
            .set('x-auth-token', tokens[3])
            .end((err, res) => {
              expect(res.body).to.have.property('messages');
              expect(res.body.messages).to.be.an('array');
              expect(res.body.messages).to.include.something.that.has.property('text').equal(message);
              expect(res.body.messages).to.include.something.that.has.property('sender').equal(testUsers[3].nickname);
              done();
            });
        });
    });
  });
  
  // Test per l'uscita dalle stanze
  describe('Uscita dalle Stanze', function() {
    it('Dovrebbe permettere a un giocatore di lasciare la stanza', function(done) {
      chai.request(app)
        .post(`/api/rooms/${roomId}/leave`)
        .set('x-auth-token', tokens[3])
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('lasciato');
          
          // Verifica che il giocatore sia stato rimosso dalla stanza
          chai.request(app)
            .get(`/api/rooms/${roomId}`)
            .set('x-auth-token', tokens[0])
            .end((err, res) => {
              const players = res.body.room.players.map(p => p.nickname);
              expect(players).to.not.include(testUsers[3].nickname);
              done();
            });
        });
    });
    
    it('Dovrebbe trasferire automaticamente l\'host quando l\'host lascia la stanza', function(done) {
      // L'host attuale è testUsers[2]
      chai.request(app)
        .post(`/api/rooms/${roomId}/leave`)
        .set('x-auth-token', tokens[2])
        .end((err, res) => {
          expect(res).to.have.status(200);
          
          // Verifica che l'host sia stato trasferito a un altro giocatore
          chai.request(app)
            .get(`/api/rooms/${roomId}`)
            .set('x-auth-token', tokens[0])
            .end((err, res) => {
              expect(res.body.room.host).to.not.equal(testUsers[2].nickname);
              // L'host dovrebbe essere testUsers[0] poiché è l'unico rimasto nella stanza
              expect(res.body.room.host).to.equal(testUsers[0].nickname);
              done();
            });
        });
    });
    
    it('Dovrebbe chiudere la stanza quando l\'ultimo giocatore la lascia', function(done) {
      // L'unico giocatore rimasto è testUsers[0]
      chai.request(app)
        .post(`/api/rooms/${roomId}/leave`)
        .set('x-auth-token', tokens[0])
        .end((err, res) => {
          expect(res).to.have.status(200);
          
          // Verifica che la stanza sia stata rimossa
          chai.request(app)
            .get(`/api/rooms/${roomId}`)
            .set('x-auth-token', tokens[0])
            .end((err, res) => {
              expect(res).to.have.status(404);
              done();
            });
        });
    });
  });
});
