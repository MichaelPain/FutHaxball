// server/controllers/matchmakingController.js - Controller per il sistema di matchmaking

const User = require('../models/User');
const Match = require('../models/Match');
const Queue = require('../models/Queue');
const { calculateMmrChange } = require('../utils/mmrCalculator');

// Costanti per il matchmaking
const QUEUE_CHECK_INTERVAL = 5000; // 5 secondi
const MATCH_ACCEPT_TIMEOUT = 30; // 30 secondi
const MMR_RANGE_INITIAL = 100; // Range MMR iniziale
const MMR_RANGE_INCREMENT = 50; // Incremento del range MMR ogni intervallo
const MAX_MMR_RANGE = 500; // Range MMR massimo

// Mappa delle code attive per modalità
const activeQueues = {
  '1v1': [],
  '2v2': [],
  '3v3': []
};

// Mappa dei match in attesa di accettazione
const pendingMatches = new Map();

// Intervallo per il controllo delle code
let queueCheckInterval = null;

// Inizializza il sistema di matchmaking
exports.initMatchmaking = (io) => {
  // Avvia l'intervallo per il controllo delle code
  queueCheckInterval = setInterval(() => {
    processQueues(io);
  }, QUEUE_CHECK_INTERVAL);

  console.log('Sistema di matchmaking inizializzato');
};

// Ferma il sistema di matchmaking
exports.stopMatchmaking = () => {
  if (queueCheckInterval) {
    clearInterval(queueCheckInterval);
    queueCheckInterval = null;
  }
  console.log('Sistema di matchmaking fermato');
};

// Gestisce l'entrata in coda di un giocatore
exports.joinQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mode } = req.body;

    // Verifica che la modalità sia valida
    if (!['1v1', '2v2', '3v3'].includes(mode)) {
      return res.status(400).json({ message: 'Modalità non valida' });
    }

    // Verifica che l'utente non sia già in coda
    const userInQueue = activeQueues[mode].find(entry => entry.userId === userId);
    if (userInQueue) {
      return res.status(400).json({ message: 'Sei già in coda per questa modalità' });
    }

    // Ottieni l'MMR dell'utente per la modalità selezionata
    const user = await User.findById(userId);
    const mmr = user.mmr && user.mmr[mode] ? user.mmr[mode] : 1000; // MMR di default: 1000

    // Aggiungi l'utente alla coda
    const queueEntry = {
      userId,
      nickname: user.nickname,
      mmr,
      joinTime: Date.now(),
      mmrRange: MMR_RANGE_INITIAL,
      lastRangeUpdate: Date.now()
    };

    activeQueues[mode].push(queueEntry);

    // Salva l'entrata in coda nel database
    const queueRecord = new Queue({
      user: userId,
      mode,
      mmr,
      status: 'waiting'
    });
    await queueRecord.save();

    // Stima il tempo di attesa
    const estimatedWaitTime = estimateWaitTime(mode, mmr);

    // Invia la risposta
    res.status(200).json({
      message: 'Sei entrato in coda',
      mode,
      estimatedWaitTime
    });

    // Notifica il client tramite socket.io
    const io = req.app.get('io');
    const userSocket = getUserSocket(io, userId);
    if (userSocket) {
      userSocket.emit('matchmaking:wait_time_update', {
        mode,
        estimatedWaitTime,
        position: getQueuePosition(mode, userId)
      });
    }

  } catch (error) {
    console.error('Errore nell\'entrare in coda:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisce l'uscita dalla coda di un giocatore
exports.leaveQueue = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mode } = req.body;

    // Verifica che la modalità sia valida
    if (!mode) {
      // Se la modalità non è specificata, rimuovi l'utente da tutte le code
      Object.keys(activeQueues).forEach(queueMode => {
        activeQueues[queueMode] = activeQueues[queueMode].filter(entry => entry.userId !== userId);
      });

      // Aggiorna lo stato nel database
      await Queue.updateMany(
        { user: userId, status: 'waiting' },
        { status: 'cancelled' }
      );

      return res.status(200).json({ message: 'Sei uscito da tutte le code' });
    }

    if (!['1v1', '2v2', '3v3'].includes(mode)) {
      return res.status(400).json({ message: 'Modalità non valida' });
    }

    // Rimuovi l'utente dalla coda
    const userInQueue = activeQueues[mode].find(entry => entry.userId === userId);
    if (!userInQueue) {
      return res.status(400).json({ message: 'Non sei in coda per questa modalità' });
    }

    activeQueues[mode] = activeQueues[mode].filter(entry => entry.userId !== userId);

    // Aggiorna lo stato nel database
    await Queue.updateMany(
      { user: userId, mode, status: 'waiting' },
      { status: 'cancelled' }
    );

    // Invia la risposta
    res.status(200).json({ message: 'Sei uscito dalla coda', mode });

  } catch (error) {
    console.error('Errore nell\'uscire dalla coda:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisce l'accettazione di un match
exports.acceptMatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.body;

    // Verifica che il match esista
    if (!pendingMatches.has(matchId)) {
      return res.status(400).json({ message: 'Match non trovato o scaduto' });
    }

    const match = pendingMatches.get(matchId);

    // Verifica che l'utente sia parte del match
    const playerIndex = match.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'Non sei parte di questo match' });
    }

    // Aggiorna lo stato di accettazione del giocatore
    match.players[playerIndex].accepted = true;

    // Verifica se tutti i giocatori hanno accettato
    const allAccepted = match.players.every(player => player.accepted);
    if (allAccepted) {
      // Tutti hanno accettato, avvia il match
      startMatch(match, req.app.get('io'));
      pendingMatches.delete(matchId);
    } else {
      // Aggiorna il match in attesa
      pendingMatches.set(matchId, match);
    }

    // Invia la risposta
    res.status(200).json({
      message: 'Match accettato',
      allAccepted
    });

  } catch (error) {
    console.error('Errore nell\'accettare il match:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisce il rifiuto di un match
exports.declineMatch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { matchId } = req.body;

    // Verifica che il match esista
    if (!pendingMatches.has(matchId)) {
      return res.status(400).json({ message: 'Match non trovato o scaduto' });
    }

    const match = pendingMatches.get(matchId);

    // Verifica che l'utente sia parte del match
    const playerIndex = match.players.findIndex(player => player.userId === userId);
    if (playerIndex === -1) {
      return res.status(400).json({ message: 'Non sei parte di questo match' });
    }

    // Cancella il match e rimetti gli altri giocatori in coda
    cancelMatch(match, userId, req.app.get('io'));
    pendingMatches.delete(matchId);

    // Invia la risposta
    res.status(200).json({
      message: 'Match rifiutato'
    });

  } catch (error) {
    console.error('Errore nel rifiutare il match:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Processa tutte le code attive
function processQueues(io) {
  Object.keys(activeQueues).forEach(mode => {
    processQueue(mode, io);
  });
}

// Processa una singola coda
function processQueue(mode, io) {
  const queue = activeQueues[mode];
  
  // Aggiorna i range MMR per i giocatori in attesa da tempo
  updateMmrRanges(queue);

  // Ordina la coda per tempo di attesa (i più vecchi prima)
  queue.sort((a, b) => a.joinTime - b.joinTime);

  // Processa la coda in base alla modalità
  switch (mode) {
    case '1v1':
      process1v1Queue(queue, io);
      break;
    case '2v2':
      process2v2Queue(queue, io);
      break;
    case '3v3':
      process3v3Queue(queue, io);
      break;
  }
}

// Processa la coda 1v1
function process1v1Queue(queue, io) {
  // Serve almeno 2 giocatori per un match 1v1
  if (queue.length < 2) return;

  // Itera attraverso la coda
  for (let i = 0; i < queue.length; i++) {
    const player1 = queue[i];
    
    // Cerca un avversario compatibile
    for (let j = i + 1; j < queue.length; j++) {
      const player2 = queue[j];
      
      // Verifica la compatibilità MMR
      if (isMMRCompatible(player1, player2)) {
        // Crea il match
        createMatch([player1, player2], '1v1', io);
        
        // Rimuovi i giocatori dalla coda
        queue.splice(j, 1); // Rimuovi prima l'indice più alto
        queue.splice(i, 1);
        
        // Ricomincia dall'inizio
        i = -1;
        break;
      }
    }
  }
}

// Processa la coda 2v2
function process2v2Queue(queue, io) {
  // Serve almeno 4 giocatori per un match 2v2
  if (queue.length < 4) return;

  // Raggruppa i giocatori per MMR simile
  const players = [...queue];
  players.sort((a, b) => a.mmr - b.mmr);

  // Cerca di formare match con MMR bilanciati
  for (let i = 0; i <= players.length - 4; i++) {
    // Prendi 4 giocatori consecutivi
    const matchPlayers = players.slice(i, i + 4);
    
    // Verifica che tutti i giocatori siano compatibili tra loro
    let allCompatible = true;
    for (let j = 0; j < matchPlayers.length; j++) {
      for (let k = j + 1; k < matchPlayers.length; k++) {
        if (!isMMRCompatible(matchPlayers[j], matchPlayers[k])) {
          allCompatible = false;
          break;
        }
      }
      if (!allCompatible) break;
    }
    
    if (allCompatible) {
      // Crea il match
      createMatch(matchPlayers, '2v2', io);
      
      // Rimuovi i giocatori dalla coda
      matchPlayers.forEach(player => {
        const index = queue.findIndex(entry => entry.userId === player.userId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      });
      
      // Ricomincia dall'inizio
      i = -1;
    }
  }
}

// Processa la coda 3v3
function process3v3Queue(queue, io) {
  // Serve almeno 6 giocatori per un match 3v3
  if (queue.length < 6) return;

  // Raggruppa i giocatori per MMR simile
  const players = [...queue];
  players.sort((a, b) => a.mmr - b.mmr);

  // Cerca di formare match con MMR bilanciati
  for (let i = 0; i <= players.length - 6; i++) {
    // Prendi 6 giocatori consecutivi
    const matchPlayers = players.slice(i, i + 6);
    
    // Verifica che tutti i giocatori siano compatibili tra loro
    let allCompatible = true;
    for (let j = 0; j < matchPlayers.length; j++) {
      for (let k = j + 1; k < matchPlayers.length; k++) {
        if (!isMMRCompatible(matchPlayers[j], matchPlayers[k])) {
          allCompatible = false;
          break;
        }
      }
      if (!allCompatible) break;
    }
    
    if (allCompatible) {
      // Crea il match
      createMatch(matchPlayers, '3v3', io);
      
      // Rimuovi i giocatori dalla coda
      matchPlayers.forEach(player => {
        const index = queue.findIndex(entry => entry.userId === player.userId);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      });
      
      // Ricomincia dall'inizio
      i = -1;
    }
  }
}

// Aggiorna i range MMR per i giocatori in attesa da tempo
function updateMmrRanges(queue) {
  const now = Date.now();
  
  queue.forEach(player => {
    // Aggiorna il range MMR ogni 30 secondi
    if (now - player.lastRangeUpdate > 30000) {
      player.mmrRange = Math.min(player.mmrRange + MMR_RANGE_INCREMENT, MAX_MMR_RANGE);
      player.lastRangeUpdate = now;
    }
  });
}

// Verifica se due giocatori sono compatibili per MMR
function isMMRCompatible(player1, player2) {
  const mmrDiff = Math.abs(player1.mmr - player2.mmr);
  return mmrDiff <= Math.min(player1.mmrRange, player2.mmrRange);
}

// Crea un nuovo match
function createMatch(players, mode, io) {
  // Genera un ID univoco per il match
  const matchId = generateMatchId();
  
  // Calcola l'MMR medio
  const averageMmr = players.reduce((sum, player) => sum + player.mmr, 0) / players.length;
  
  // Prepara i dati del match
  const match = {
    id: matchId,
    mode,
    players: players.map(player => ({
      userId: player.userId,
      nickname: player.nickname,
      mmr: player.mmr,
      accepted: false
    })),
    averageMmr,
    createdAt: Date.now(),
    acceptTimeout: MATCH_ACCEPT_TIMEOUT
  };
  
  // Aggiungi il match alla lista dei match in attesa
  pendingMatches.set(matchId, match);
  
  // Imposta un timeout per la scadenza dell'accettazione
  setTimeout(() => {
    // Verifica se il match è ancora in attesa
    if (pendingMatches.has(matchId)) {
      const currentMatch = pendingMatches.get(matchId);
      
      // Verifica se tutti hanno accettato
      const allAccepted = currentMatch.players.every(player => player.accepted);
      
      if (!allAccepted) {
        // Cancella il match e rimetti in coda i giocatori che hanno accettato
        const declinedBy = currentMatch.players.find(player => !player.accepted)?.userId;
        cancelMatch(currentMatch, declinedBy, io);
        pendingMatches.delete(matchId);
      }
    }
  }, MATCH_ACCEPT_TIMEOUT * 1000);
  
  // Notifica tutti i giocatori
  players.forEach(player => {
    const userSocket = getUserSocket(io, player.userId);
    if (userSocket) {
      userSocket.emit('matchmaking:match_found', {
        matchId,
        mode,
        players: match.players.map(p => ({
          nickname: p.nickname,
          mmr: p.mmr
        })),
        averageMmr,
        acceptTimeout: MATCH_ACCEPT_TIMEOUT
      });
    }
  });
  
  // Aggiorna lo stato nel database
  players.forEach(async player => {
    try {
      await Queue.updateMany(
        { user: player.userId, mode, status: 'waiting' },
        { status: 'matched', matchId }
      );
    } catch (error) {
      console.error('Errore nell\'aggiornare lo stato della coda:', error);
    }
  });
}

// Avvia un match accettato da tutti
async function startMatch(match, io) {
  try {
    // Crea il record del match nel database
    const matchRecord = new Match({
      mode: match.mode,
      players: match.players.map(player => ({
        user: player.userId,
        team: assignTeam(player, match.players, match.mode),
        startingMmr: player.mmr
      })),
      status: 'in_progress'
    });
    
    await matchRecord.save();
    
    // Prepara i dati per il client
    const matchDetails = {
      matchId: matchRecord._id,
      mode: match.mode,
      players: match.players.map(player => ({
        userId: player.userId,
        nickname: player.nickname,
        team: assignTeam(player, match.players, match.mode)
      })),
      serverInfo: {
        host: process.env.GAME_SERVER_HOST || 'localhost',
        port: process.env.GAME_SERVER_PORT || 3001
      }
    };
    
    // Notifica tutti i giocatori
    match.players.forEach(player => {
      const userSocket = getUserSocket(io, player.userId);
      if (userSocket) {
        userSocket.emit('matchmaking:match_started', matchDetails);
      }
    });
    
    // Aggiorna lo stato nel database
    match.players.forEach(async player => {
      try {
        await Queue.updateMany(
          { user: player.userId, matchId: match.id },
          { status: 'started', matchDbId: matchRecord._id }
        );
      } catch (error) {
        console.error('Errore nell\'aggiornare lo stato della coda:', error);
      }
    });
    
  } catch (error) {
    console.error('Errore nell\'avviare il match:', error);
    
    // Notifica i giocatori dell'errore
    match.players.forEach(player => {
      const userSocket = getUserSocket(io, player.userId);
      if (userSocket) {
        userSocket.emit('matchmaking:match_cancelled', {
          reason: 'Errore del server nell\'avviare il match'
        });
      }
    });
  }
}

// Cancella un match e rimetti in coda i giocatori che hanno accettato
function cancelMatch(match, declinedBy, io) {
  // Notifica tutti i giocatori
  match.players.forEach(player => {
    const userSocket = getUserSocket(io, player.userId);
    if (userSocket) {
      userSocket.emit('matchmaking:match_cancelled', {
        reason: declinedBy ? 'Un giocatore ha rifiutato il match' : 'Tempo scaduto per l\'accettazione',
        declinedBy: declinedBy ? match.players.find(p => p.userId === declinedBy)?.nickname : null
      });
    }
    
    // Rimetti in coda solo i giocatori che hanno accettato
    if (player.accepted && player.userId !== declinedBy) {
      // Aggiungi nuovamente il giocatore alla coda appropriata
      const queueEntry = {
        userId: player.userId,
        nickname: player.nickname,
        mmr: player.mmr,
        joinTime: Date.now(),
        mmrRange: MMR_RANGE_INITIAL,
        lastRangeUpdate: Date.now()
      };
      
      activeQueues[match.mode].push(queueEntry);
      
      // Notifica il giocatore
      if (userSocket) {
        userSocket.emit('matchmaking:requeued', {
          mode: match.mode,
          estimatedWaitTime: estimateWaitTime(match.mode, player.mmr)
        });
      }
    }
  });
  
  // Aggiorna lo stato nel database
  match.players.forEach(async player => {
    try {
      if (player.accepted && player.userId !== declinedBy) {
        // Per i giocatori che hanno accettato, crea una nuova entrata in coda
        const queueRecord = new Queue({
          user: player.userId,
          mode: match.mode,
          mmr: player.mmr,
          status: 'waiting'
        });
        await queueRecord.save();
      }
      
      // Aggiorna lo stato delle code esistenti
      await Queue.updateMany(
        { user: player.userId, matchId: match.id },
        { status: 'cancelled', cancelReason: declinedBy ? 'declined' : 'timeout' }
      );
    } catch (error) {
      console.error('Errore nell\'aggiornare lo stato della coda:', error);
    }
  });
}

// Assegna un team a un giocatore
function assignTeam(player, allPlayers, mode) {
  // Per 1v1, assegna semplicemente team 0 e 1
  if (mode === '1v1') {
    return allPlayers.indexOf(player) === 0 ? 0 : 1;
  }
  
  // Per 2v2 e 3v3, bilancia i team in base all'MMR
  const sortedPlayers = [...allPlayers].sort((a, b) => b.mmr - a.mmr);
  const playerIndex = sortedPlayers.findIndex(p => p.userId === player.userId);
  
  // Assegna i team in modo alternato (0, 1, 1, 0 per 2v2 o 0, 1, 0, 1, 1, 0 per 3v3)
  if (mode === '2v2') {
    return [0, 1, 1, 0][playerIndex];
  } else { // 3v3
    return [0, 1, 0, 1, 1, 0][playerIndex];
  }
}

// Stima il tempo di attesa in coda
function estimateWaitTime(mode, mmr) {
  const queue = activeQueues[mode];
  
  // Se la coda è vuota, usa un valore predefinito
  if (queue.length === 0) {
    return getDefaultWaitTime(mode);
  }
  
  // Calcola il tempo medio di attesa degli ultimi 5 match
  // In una implementazione reale, questo dovrebbe essere basato su dati storici
  // Per ora, usiamo una stima basata sul numero di giocatori in coda
  const playersNeeded = mode === '1v1' ? 2 : (mode === '2v2' ? 4 : 6);
  const playersInRange = queue.filter(player => 
    Math.abs(player.mmr - mmr) <= MAX_MMR_RANGE
  ).length;
  
  if (playersInRange >= playersNeeded) {
    return 30; // 30 secondi se ci sono abbastanza giocatori
  } else {
    // Stima basata sul numero di giocatori mancanti
    return 30 + ((playersNeeded - playersInRange) * 60);
  }
}

// Ottiene il tempo di attesa predefinito per una modalità
function getDefaultWaitTime(mode) {
  switch (mode) {
    case '1v1': return 60; // 1 minuto
    case '2v2': return 120; // 2 minuti
    case '3v3': return 180; // 3 minuti
    default: return 120;
  }
}

// Ottiene la posizione in coda di un giocatore
function getQueuePosition(mode, userId) {
  const queue = activeQueues[mode];
  const index = queue.findIndex(entry => entry.userId === userId);
  return index !== -1 ? index + 1 : 0;
}

// Ottiene il socket di un utente
function getUserSocket(io, userId) {
  const userSockets = io.sockets.sockets;
  for (const [id, socket] of userSockets) {
    if (socket.user && socket.user.id === userId) {
      return socket;
    }
  }
  return null;
}

// Genera un ID univoco per un match
function generateMatchId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
