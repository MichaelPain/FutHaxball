// test/rankedFeaturesTest.js - Test per le funzionalità ranked

const assert = require('assert');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Modelli
const User = require('../src/server/models/User');
const Match = require('../src/server/models/Match');
const Penalty = require('../src/server/models/Penalty');
const Report = require('../src/server/models/Report');

// Controller
const verificationController = require('../src/server/controllers/verificationController');
const rankedMatchController = require('../src/server/controllers/rankedMatchController');
const penaltyController = require('../src/server/controllers/penaltyController');

// Configurazione del database in memoria per i test
let mongoServer;
let io;

// Funzione di setup
async function setupTest() {
  // Crea un server MongoDB in memoria
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connetti a MongoDB
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Mock per Socket.IO
  io = {
    on: sinon.stub(),
    sockets: {
      sockets: new Map()
    }
  };
  
  // Crea utenti di test
  const users = [];
  for (let i = 0; i < 6; i++) {
    const user = new User({
      email: `test${i}@example.com`,
      nickname: `TestPlayer${i}`,
      password: 'password123',
      mmr: {
        '1v1': 1000 + i * 50,
        '2v2': 1000 + i * 40,
        '3v3': 1000 + i * 30
      }
    });
    await user.save();
    users.push(user);
  }
  
  return { users, io };
}

// Funzione di teardown
async function teardownTest() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

// Test per il sistema di verifiche pre-partita
async function testVerificationSystem() {
  console.log('Esecuzione test per il sistema di verifiche pre-partita...');
  
  try {
    const { users, io } = await setupTest();
    
    // Inizializza il controller
    verificationController.initVerification(io);
    
    // Crea un match di test
    const match = new Match({
      mode: '2v2',
      players: [
        { user: users[0]._id, team: 0 },
        { user: users[1]._id, team: 0 },
        { user: users[2]._id, team: 1 },
        { user: users[3]._id, team: 1 }
      ],
      status: 'pending'
    });
    await match.save();
    
    // Mock per la richiesta e la risposta
    const req = {
      body: { matchId: match._id },
      app: {
        get: () => io
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Avvia il processo di verifica
    await verificationController.startVerification(req, res);
    
    // Verifica che la risposta sia corretta
    assert(res.status.calledWith(200), 'Stato della risposta non è 200');
    assert(res.json.called, 'json() non è stato chiamato');
    
    // Verifica che il match sia stato aggiornato
    const updatedMatch = await Match.findById(match._id);
    assert.strictEqual(updatedMatch.status, 'verifying', 'Lo stato del match non è stato aggiornato a "verifying"');
    
    console.log('Test per il sistema di verifiche pre-partita completato con successo!');
    
  } catch (error) {
    console.error('Errore nel test del sistema di verifiche pre-partita:', error);
    throw error;
  } finally {
    await teardownTest();
  }
}

// Test per la gestione delle partite ranked
async function testRankedMatchManagement() {
  console.log('Esecuzione test per la gestione delle partite ranked...');
  
  try {
    const { users, io } = await setupTest();
    
    // Inizializza il controller
    rankedMatchController.initRankedMatches(io);
    
    // Crea un match di test
    const match = new Match({
      mode: '2v2',
      players: [
        { user: users[0]._id, team: 0 },
        { user: users[1]._id, team: 0 },
        { user: users[2]._id, team: 1 },
        { user: users[3]._id, team: 1 }
      ],
      status: 'in_progress'
    });
    await match.save();
    
    // Mock per la richiesta e la risposta
    const req = {
      body: { matchId: match._id },
      app: {
        get: () => io
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Avvia la partita ranked
    await rankedMatchController.startRankedMatch(req, res);
    
    // Verifica che la risposta sia corretta
    assert(res.status.calledWith(200), 'Stato della risposta non è 200');
    assert(res.json.called, 'json() non è stato chiamato');
    
    // Simula la fine della partita
    const endReq = {
      body: { 
        matchId: match._id,
        winningTeam: 0
      },
      app: {
        get: () => io
      }
    };
    
    const endRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Termina la partita ranked
    await rankedMatchController.endRankedMatch(endReq, endRes);
    
    // Verifica che la risposta sia corretta
    assert(endRes.status.calledWith(200), 'Stato della risposta non è 200');
    assert(endRes.json.called, 'json() non è stato chiamato');
    
    // Verifica che il match sia stato aggiornato
    const updatedMatch = await Match.findById(match._id);
    assert.strictEqual(updatedMatch.status, 'completed', 'Lo stato del match non è stato aggiornato a "completed"');
    assert.strictEqual(updatedMatch.winningTeam, 0, 'Il team vincente non è stato impostato correttamente');
    
    console.log('Test per la gestione delle partite ranked completato con successo!');
    
  } catch (error) {
    console.error('Errore nel test della gestione delle partite ranked:', error);
    throw error;
  } finally {
    await teardownTest();
  }
}

// Test per il sistema di penalità
async function testPenaltySystem() {
  console.log('Esecuzione test per il sistema di penalità...');
  
  try {
    const { users, io } = await setupTest();
    
    // Inizializza il controller
    penaltyController.initPenaltySystem(io);
    
    // Crea un admin
    const admin = new User({
      email: 'admin@example.com',
      nickname: 'Admin',
      password: 'adminpass',
      isAdmin: true
    });
    await admin.save();
    
    // Mock per la richiesta e la risposta
    const req = {
      user: {
        id: admin._id,
        isAdmin: true
      },
      body: {
        userId: users[0]._id,
        type: 'warning',
        reason: 'Test warning',
        duration: 24,
        permanent: false
      },
      app: {
        get: () => io
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Assegna una penalità
    await penaltyController.assignPenalty(req, res);
    
    // Verifica che la risposta sia corretta
    assert(res.status.calledWith(201), 'Stato della risposta non è 201');
    assert(res.json.called, 'json() non è stato chiamato');
    
    // Verifica che la penalità sia stata creata
    const penalties = await Penalty.find({ user: users[0]._id });
    assert.strictEqual(penalties.length, 1, 'La penalità non è stata creata');
    assert.strictEqual(penalties[0].type, 'warning', 'Il tipo di penalità non è corretto');
    
    // Test per la segnalazione di comportamenti scorretti
    const reportReq = {
      user: {
        id: users[1]._id
      },
      body: {
        playerNickname: users[0].nickname,
        type: 'toxic',
        description: 'Test report',
        matchId: 'test123'
      }
    };
    
    const reportRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Invia una segnalazione
    await penaltyController.reportMisconduct(reportReq, reportRes);
    
    // Verifica che la risposta sia corretta
    assert(reportRes.status.calledWith(201), 'Stato della risposta non è 201');
    assert(reportRes.json.called, 'json() non è stato chiamato');
    
    // Verifica che la segnalazione sia stata creata
    const reports = await Report.find({ reporter: users[1]._id });
    assert.strictEqual(reports.length, 1, 'La segnalazione non è stata creata');
    assert.strictEqual(reports[0].type, 'toxic', 'Il tipo di segnalazione non è corretto');
    
    console.log('Test per il sistema di penalità completato con successo!');
    
  } catch (error) {
    console.error('Errore nel test del sistema di penalità:', error);
    throw error;
  } finally {
    await teardownTest();
  }
}

// Test per l'integrazione tra i vari sistemi
async function testSystemsIntegration() {
  console.log('Esecuzione test per l\'integrazione tra i vari sistemi...');
  
  try {
    const { users, io } = await setupTest();
    
    // Inizializza tutti i controller
    verificationController.initVerification(io);
    rankedMatchController.initRankedMatches(io);
    penaltyController.initPenaltySystem(io);
    
    // Crea un admin
    const admin = new User({
      email: 'admin@example.com',
      nickname: 'Admin',
      password: 'adminpass',
      isAdmin: true
    });
    await admin.save();
    
    // Assegna una penalità di tipo ranked_ban a un utente
    const penalty = new Penalty({
      user: users[0]._id,
      type: 'ranked_ban',
      reason: 'Test ranked ban',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ore
      permanent: false,
      assignedBy: admin._id
    });
    await penalty.save();
    
    // Verifica se l'utente può giocare ranked
    const canPlayReq = {
      user: {
        id: users[0]._id
      }
    };
    
    const canPlayRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    await penaltyController.canPlayRanked(canPlayReq, canPlayRes);
    
    // Verifica che la risposta sia corretta
    assert(canPlayRes.status.calledWith(200), 'Stato della risposta non è 200');
    assert(canPlayRes.json.called, 'json() non è stato chiamato');
    
    // Verifica che l'utente non possa giocare ranked
    const responseData = canPlayRes.json.firstCall.args[0];
    assert.strictEqual(responseData.canPlayRanked, false, 'L\'utente può giocare ranked nonostante il ban');
    
    // Crea un match con utenti senza ban
    const match = new Match({
      mode: '2v2',
      players: [
        { user: users[1]._id, team: 0 },
        { user: users[2]._id, team: 0 },
        { user: users[3]._id, team: 1 },
        { user: users[4]._id, team: 1 }
      ],
      status: 'pending'
    });
    await match.save();
    
    // Avvia il processo di verifica
    const verifyReq = {
      body: { matchId: match._id },
      app: {
        get: () => io
      }
    };
    
    const verifyRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    await verificationController.startVerification(verifyReq, verifyRes);
    
    // Verifica che la risposta sia corretta
    assert(verifyRes.status.calledWith(200), 'Stato della risposta non è 200');
    
    // Aggiorna lo stato del match a in_progress (simulando il completamento della verifica)
    match.status = 'in_progress';
    await match.save();
    
    // Avvia la partita ranked
    const startMatchReq = {
      body: { matchId: match._id },
      app: {
        get: () => io
      }
    };
    
    const startMatchRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    await rankedMatchController.startRankedMatch(startMatchReq, startMatchRes);
    
    // Verifica che la risposta sia corretta
    assert(startMatchRes.status.calledWith(200), 'Stato della risposta non è 200');
    
    // Termina la partita ranked
    const endMatchReq = {
      body: { 
        matchId: match._id,
        winningTeam: 0
      },
      app: {
        get: () => io
      }
    };
    
    const endMatchRes = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    await rankedMatchController.endRankedMatch(endMatchReq, endMatchRes);
    
    // Verifica che la risposta sia corretta
    assert(endMatchRes.status.calledWith(200), 'Stato della risposta non è 200');
    
    // Verifica che il match sia stato completato correttamente
    const updatedMatch = await Match.findById(match._id);
    assert.strictEqual(updatedMatch.status, 'completed', 'Lo stato del match non è stato aggiornato a "completed"');
    
    console.log('Test per l\'integrazione tra i vari sistemi completato con successo!');
    
  } catch (error) {
    console.error('Errore nel test dell\'integrazione tra i vari sistemi:', error);
    throw error;
  } finally {
    await teardownTest();
  }
}

// Esegui tutti i test
async function runAllTests() {
  console.log('Avvio dei test per le funzionalità ranked...');
  
  try {
    await testVerificationSystem();
    await testRankedMatchManagement();
    await testPenaltySystem();
    await testSystemsIntegration();
    
    console.log('Tutti i test completati con successo!');
    return true;
  } catch (error) {
    console.error('Errore durante l\'esecuzione dei test:', error);
    return false;
  }
}

// Esporta le funzioni di test
module.exports = {
  runAllTests,
  testVerificationSystem,
  testRankedMatchManagement,
  testPenaltySystem,
  testSystemsIntegration
};

// Se eseguito direttamente
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Errore fatale durante i test:', error);
      process.exit(1);
    });
}
