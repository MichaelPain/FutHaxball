// test/authTest.js - Test per il sistema di autenticazione

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const { dbConfig, testUsers } = require('./testConfig');
const User = require('../src/server/models/User');

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

describe('Sistema di Autenticazione', function() {
  // Aumenta il timeout per i test che coinvolgono il database
  this.timeout(10000);
  
  // Prima di tutti i test, connettiti al database di test
  before(async function() {
    await mongoose.connect(dbConfig.url, dbConfig.options);
    // Pulisci il database di test
    await User.deleteMany({});
  });
  
  // Dopo tutti i test, disconnettiti dal database
  after(async function() {
    await mongoose.connection.close();
  });
  
  // Test per la registrazione
  describe('Registrazione', function() {
    it('Dovrebbe registrare un nuovo utente', function(done) {
      chai.request(app)
        .post('/api/auth/register')
        .send(testUsers[0])
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('message').that.includes('successo');
          done();
        });
    });
    
    it('Dovrebbe rifiutare una registrazione con email già in uso', function(done) {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          nickname: 'DifferentNickname',
          email: testUsers[0].email,
          password: 'password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('già in uso');
          done();
        });
    });
    
    it('Dovrebbe rifiutare una registrazione con nickname già in uso', function(done) {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          nickname: testUsers[0].nickname,
          email: 'different@example.com',
          password: 'password123'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('già in uso');
          done();
        });
    });
    
    it('Dovrebbe rifiutare una registrazione con password troppo corta', function(done) {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          nickname: 'ValidNickname',
          email: 'valid@example.com',
          password: 'short'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('errors');
          done();
        });
    });
  });
  
  // Test per il login
  describe('Login', function() {
    // Prima dei test di login, registra un utente e verifica l'account
    before(async function() {
      // Registra l'utente di test
      const user = new User({
        nickname: testUsers[1].nickname,
        email: testUsers[1].email,
        password: testUsers[1].password,
        isVerified: true // Impostiamo direttamente come verificato per i test
      });
      
      await user.save();
    });
    
    it('Dovrebbe effettuare il login con credenziali valide', function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          expect(res.body).to.have.property('user');
          expect(res.body.user).to.have.property('nickname').equal(testUsers[1].nickname);
          done();
        });
    });
    
    it('Dovrebbe rifiutare il login con email non valida', function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUsers[1].password
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('non valide');
          done();
        });
    });
    
    it('Dovrebbe rifiutare il login con password non valida', function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: 'wrongpassword'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('message').that.includes('non valide');
          done();
        });
    });
  });
  
  // Test per il profilo utente
  describe('Profilo Utente', function() {
    let token;
    
    // Prima dei test del profilo, effettua il login
    before(function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        })
        .end((err, res) => {
          token = res.body.token;
          done();
        });
    });
    
    it('Dovrebbe ottenere il profilo dell\'utente autenticato', function(done) {
      chai.request(app)
        .get('/api/auth/profile')
        .set('x-auth-token', token)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('nickname').equal(testUsers[1].nickname);
          expect(res.body).to.have.property('email').equal(testUsers[1].email);
          done();
        });
    });
    
    it('Dovrebbe aggiornare il nickname dell\'utente', function(done) {
      const newNickname = 'UpdatedNickname';
      
      chai.request(app)
        .put('/api/auth/profile')
        .set('x-auth-token', token)
        .send({ nickname: newNickname })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('nickname').equal(newNickname);
          done();
        });
    });
    
    it('Dovrebbe rifiutare l\'accesso senza token', function(done) {
      chai.request(app)
        .get('/api/auth/profile')
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });
  });
  
  // Test per il cambio password
  describe('Cambio Password', function() {
    let token;
    const newPassword = 'newpassword123';
    
    // Prima dei test del cambio password, effettua il login
    before(function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        })
        .end((err, res) => {
          token = res.body.token;
          done();
        });
    });
    
    it('Dovrebbe cambiare la password con credenziali valide', function(done) {
      chai.request(app)
        .post('/api/auth/change-password')
        .set('x-auth-token', token)
        .send({
          currentPassword: testUsers[1].password,
          newPassword: newPassword
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').that.includes('successo');
          done();
        });
    });
    
    it('Dovrebbe effettuare il login con la nuova password', function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: newPassword
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('token');
          done();
        });
    });
    
    it('Dovrebbe rifiutare il login con la vecchia password', function(done) {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers[1].email,
          password: testUsers[1].password
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          done();
        });
    });
  });
});
