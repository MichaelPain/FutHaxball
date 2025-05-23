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

// New Integration-Style Unit Tests with Mocks
const sinon = require('sinon');
const authController = require('../src/server/controllers/authController');
const User = require('../src/server/models/User'); // Already required above, ensure consistency
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator'); // Mock this
const jwt = require('jsonwebtoken');
const { ConflictError, AuthenticationError, AppError } = require('../src/server/utils/customErrors');


describe('Auth Controller - Unit/Integration Style', function() {
  let req, res, next;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    req = {
      body: {},
      params: {},
      get: sinon.stub(),
      protocol: 'http'
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
      send: sinon.spy() // For verifyEmail HTML response
    };
    next = sinon.spy();

    // Mock express-validator
    sandbox.stub(validationResult(req), 'isEmpty').returns(true);
    sandbox.stub(validationResult(req), 'array').returns([]);
    
    // Mock nodemailer
    const mailOptions = {
        sendMail: sinon.stub().resolves()
    };
    sandbox.stub(nodemailer, 'createTransport').returns(mailOptions);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      req.body = { nickname: 'testuser', email: 'test@example.com', password: 'Password123!' };
      req.get.withArgs('host').returns('localhost:3000');

      sandbox.stub(User, 'findOne').resolves(null);
      const saveStub = sandbox.stub(User.prototype, 'save').resolvesThis();
      
      await authController.register(req, res, next);

      expect(saveStub.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({ message: 'Utente registrato con successo. Controlla la tua email per verificare l\'account.' })).to.be.true;
      expect(nodemailer.createTransport().sendMail.calledOnce).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should throw ConflictError if email is already taken', async () => {
      req.body = { nickname: 'testuser', email: 'test@example.com', password: 'Password123!' };
      sandbox.stub(User, 'findOne').withArgs({ email: 'test@example.com' }).resolves({ email: 'test@example.com' });

      await authController.register(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(ConflictError);
      expect(next.firstCall.args[0].message).to.equal('Email già in uso');
    });

    it('should throw ConflictError if nickname is already taken', async () => {
      req.body = { nickname: 'testuser', email: 'test@example.com', password: 'Password123!' };
      sandbox.stub(User, 'findOne')
        .withArgs({ email: 'test@example.com' }).resolves(null)
        .withArgs({ nickname: 'testuser' }).resolves({ nickname: 'testuser' });

      await authController.register(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(ConflictError);
      expect(next.firstCall.args[0].message).to.equal('Nickname già in uso');
    });

    it('should return 400 if validation fails', async () => {
      req.body = { email: 'invalid' }; // Example invalid input
      validationResult(req).isEmpty.returns(false); // Simulate validation error
      validationResult(req).array.returns([{ msg: 'Invalid email' }]);
      
      await authController.register(req, res, next);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ errors: [{ msg: 'Invalid email' }] })).to.be.true;
      expect(next.called).to.be.false;
    });
  });

  describe('login', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: 'userId123',
        nickname: 'testuser',
        email: 'test@example.com',
        isVerified: true,
        penalties: { isSuspended: false },
        comparePassword: sinon.stub(),
        save: sinon.stub().resolvesThis() // For lastLogin update
      };
      sandbox.stub(User, 'findOne').resolves(mockUser);
      sandbox.stub(jwt, 'sign').callsFake((payload, secret, options, callback) => {
        callback(null, 'mocked_jwt_token');
      });
    });

    it('should login successfully with valid credentials', async () => {
      req.body = { email: 'test@example.com', password: 'Password123!' };
      mockUser.comparePassword.resolves(true);

      await authController.login(req, res, next);

      expect(User.findOne.calledWith({ email: 'test@example.com' })).to.be.true;
      expect(mockUser.comparePassword.calledWith('Password123!')).to.be.true;
      expect(mockUser.save.calledOnce).to.be.true; // lastLogin updated
      expect(jwt.sign.calledOnce).to.be.true;
      expect(res.json.calledWith(sinon.match({ token: 'mocked_jwt_token', user: sinon.match.object }))).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should throw AuthenticationError if user not found', async () => {
      req.body = { email: 'unknown@example.com', password: 'Password123!' };
      User.findOne.withArgs({ email: 'unknown@example.com' }).resolves(null);

      await authController.login(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(AuthenticationError);
      expect(next.firstCall.args[0].message).to.equal('Credenziali non valide');
    });

    it('should throw AuthenticationError if password mismatches', async () => {
      req.body = { email: 'test@example.com', password: 'wrongPassword' };
      mockUser.comparePassword.resolves(false);

      await authController.login(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(AuthenticationError);
      expect(next.firstCall.args[0].message).to.equal('Credenziali non valide');
    });

    it('should throw AuthenticationError if account is not verified', async () => {
      req.body = { email: 'test@example.com', password: 'Password123!' };
      mockUser.isVerified = false;
      mockUser.comparePassword.resolves(true); // Password is correct

      await authController.login(req, res, next);

      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.instanceOf(AuthenticationError);
      expect(next.firstCall.args[0].message).to.equal('Account non verificato. Controlla la tua email.');
    });

    it('should throw AppError (403) if account is suspended', async () => {
      req.body = { email: 'test@example.com', password: 'Password123!' };
      mockUser.penalties = { 
        isSuspended: true, 
        suspensionReason: 'Test Suspension',
        suspensionEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Suspended for 1 more day
      };
      mockUser.comparePassword.resolves(true);

      await authController.login(req, res, next);

      expect(next.calledOnce).to.be.true;
      const error = next.firstCall.args[0];
      expect(error).to.be.instanceOf(AppError);
      expect(error.statusCode).to.equal(403);
      expect(error.message).to.include('Account sospeso: Test Suspension. Termina il:');
    });
    
    it('should login successfully if suspension period has passed', async () => {
        req.body = { email: 'test@example.com', password: 'Password123!' };
        mockUser.penalties = {
            isSuspended: true,
            suspensionReason: 'Expired Suspension',
            suspensionEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Suspension ended yesterday
        };
        mockUser.comparePassword.resolves(true);

        await authController.login(req, res, next);

        expect(mockUser.penalties.isSuspended).to.be.false; // Suspension should be lifted
        expect(mockUser.save.calledTwice).to.be.true; // Once for penalty removal, once for lastLogin
        expect(res.json.calledWith(sinon.match({ token: 'mocked_jwt_token' }))).to.be.true;
        expect(next.called).to.be.false;
    });
  });
});
