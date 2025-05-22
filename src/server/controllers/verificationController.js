// server/controllers/verificationController.js - Controller per il sistema di verifiche pre-partita

const Match = require('../models/Match');

// Mappa dei processi di verifica attivi
const activeVerifications = new Map();

// Inizializza il sistema di verifiche pre-partita
exports.initVerification = (io) => {
  console.log('Sistema di verifiche pre-partita inizializzato');
  
  // Configura gli handler per i socket
  io.on('connection', (socket) => {
    // Handler per il ping di verifica
    socket.on('verification:ping', (data) => {
      // Rispondi immediatamente con lo stesso timestamp
      socket.emit('verification:pong', {
        timestamp: data.timestamp
      });
    });
    
    // Handler per il completamento della verifica
    socket.on('verification:complete', (data) => {
      handleVerificationComplete(socket, data, io);
    });
    
    // Handler per il fallimento della verifica
    socket.on('verification:failed', (data) => {
      handleVerificationFailed(socket, data, io);
    });
    
    // Handler per la segnalazione di prontezza
    socket.on('verification:ready', (data) => {
      handlePlayerReady(socket, data, io);
    });
  });
};

// Avvia il processo di verifica per un match
exports.startVerification = async (req, res) => {
  try {
    const { matchId } = req.body;
    
    // Verifica che il match esista
    const match = await Match.findById(matchId).populate('players.user');
    if (!match) {
      return res.status(404).json({ message: 'Match non trovato' });
    }
    
    // Verifica che il match sia in stato pending
    if (match.status !== 'pending') {
      return res.status(400).json({ message: 'Il match non è in stato pending' });
    }
    
    // Crea il processo di verifica
    const verificationProcess = {
      matchId,
      startTime: Date.now(),
      timeout: 60, // 60 secondi per completare le verifiche
      players: match.players.map(player => ({
        userId: player.user._id.toString(),
        nickname: player.user.nickname,
        verified: false,
        ready: false
      })),
      allVerified: false,
      allReady: false,
      timeoutId: null
    };
    
    // Imposta il timeout per la verifica
    verificationProcess.timeoutId = setTimeout(() => {
      handleVerificationTimeout(matchId, req.app.get('io'));
    }, verificationProcess.timeout * 1000);
    
    // Salva il processo di verifica
    activeVerifications.set(matchId, verificationProcess);
    
    // Notifica tutti i giocatori
    const io = req.app.get('io');
    verificationProcess.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('verification:start', {
          matchId,
          players: verificationProcess.players,
          timeout: verificationProcess.timeout
        });
      }
    });
    
    // Aggiorna lo stato del match
    match.status = 'verifying';
    await match.save();
    
    // Invia la risposta
    res.status(200).json({
      message: 'Processo di verifica avviato',
      verificationProcess
    });
    
  } catch (error) {
    console.error('Errore nell\'avviare il processo di verifica:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni lo stato di verifica di un match
exports.getVerificationStatus = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Verifica che il processo di verifica esista
    const verificationProcess = activeVerifications.get(matchId);
    if (!verificationProcess) {
      return res.status(404).json({ message: 'Processo di verifica non trovato' });
    }
    
    // Invia la risposta
    res.status(200).json({
      verificationProcess
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere lo stato di verifica:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisce il completamento della verifica di un giocatore
function handleVerificationComplete(socket, data, io) {
  const { matchId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che il processo di verifica esista
  const verificationProcess = activeVerifications.get(matchId);
  if (!verificationProcess) {
    return socket.emit('error', { message: 'Processo di verifica non trovato' });
  }
  
  // Verifica che il giocatore sia parte del match
  const playerIndex = verificationProcess.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return socket.emit('error', { message: 'Non sei parte di questo match' });
  }
  
  // Aggiorna lo stato di verifica del giocatore
  verificationProcess.players[playerIndex].verified = true;
  
  // Notifica tutti i giocatori
  verificationProcess.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('verification:player_update', {
        userId,
        verificationStatus: 'verified'
      });
    }
  });
  
  // Verifica se tutti i giocatori hanno completato la verifica
  const allVerified = verificationProcess.players.every(p => p.verified);
  if (allVerified) {
    verificationProcess.allVerified = true;
    
    // Notifica tutti i giocatori
    verificationProcess.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('verification:all_verified');
      }
    });
  }
}

// Gestisce il fallimento della verifica di un giocatore
function handleVerificationFailed(socket, data, io) {
  const { matchId, reason } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che il processo di verifica esista
  const verificationProcess = activeVerifications.get(matchId);
  if (!verificationProcess) {
    return socket.emit('error', { message: 'Processo di verifica non trovato' });
  }
  
  // Verifica che il giocatore sia parte del match
  const playerIndex = verificationProcess.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return socket.emit('error', { message: 'Non sei parte di questo match' });
  }
  
  // Cancella il timeout
  if (verificationProcess.timeoutId) {
    clearTimeout(verificationProcess.timeoutId);
  }
  
  // Notifica tutti i giocatori
  verificationProcess.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('verification:failed', {
        userId,
        reason: reason || 'Verifica fallita'
      });
    }
  });
  
  // Rimuovi il processo di verifica
  activeVerifications.delete(matchId);
  
  // Aggiorna lo stato del match
  updateMatchStatus(matchId, 'cancelled', {
    cancelReason: 'verification_failed',
    failedBy: userId,
    failureReason: reason
  });
}

// Gestisce il timeout della verifica
function handleVerificationTimeout(matchId, io) {
  // Verifica che il processo di verifica esista
  const verificationProcess = activeVerifications.get(matchId);
  if (!verificationProcess) {
    return;
  }
  
  // Notifica tutti i giocatori
  verificationProcess.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('verification:failed', {
        reason: 'Timeout scaduto'
      });
    }
  });
  
  // Rimuovi il processo di verifica
  activeVerifications.delete(matchId);
  
  // Aggiorna lo stato del match
  updateMatchStatus(matchId, 'cancelled', {
    cancelReason: 'verification_timeout'
  });
}

// Gestisce la segnalazione di prontezza di un giocatore
function handlePlayerReady(socket, data, io) {
  const { matchId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che il processo di verifica esista
  const verificationProcess = activeVerifications.get(matchId);
  if (!verificationProcess) {
    return socket.emit('error', { message: 'Processo di verifica non trovato' });
  }
  
  // Verifica che il giocatore sia parte del match
  const playerIndex = verificationProcess.players.findIndex(p => p.userId === userId);
  if (playerIndex === -1) {
    return socket.emit('error', { message: 'Non sei parte di questo match' });
  }
  
  // Verifica che il giocatore abbia completato la verifica
  if (!verificationProcess.players[playerIndex].verified) {
    return socket.emit('error', { message: 'Devi completare la verifica prima di segnalare la prontezza' });
  }
  
  // Aggiorna lo stato di prontezza del giocatore
  verificationProcess.players[playerIndex].ready = true;
  
  // Notifica tutti i giocatori
  verificationProcess.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('verification:player_ready', {
        userId
      });
    }
  });
  
  // Verifica se tutti i giocatori sono pronti
  const allReady = verificationProcess.players.every(p => p.ready);
  if (allReady) {
    verificationProcess.allReady = true;
    
    // Cancella il timeout
    if (verificationProcess.timeoutId) {
      clearTimeout(verificationProcess.timeoutId);
    }
    
    // Notifica tutti i giocatori
    verificationProcess.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('verification:complete');
      }
    });
    
    // Rimuovi il processo di verifica
    activeVerifications.delete(matchId);
    
    // Aggiorna lo stato del match
    updateMatchStatus(matchId, 'in_progress', {
      startedAt: new Date()
    });
  }
}

// Aggiorna lo stato di un match
async function updateMatchStatus(matchId, status, additionalData = {}) {
  try {
    const match = await Match.findById(matchId);
    if (!match) {
      console.error(`Match non trovato: ${matchId}`);
      return;
    }
    
    match.status = status;
    
    // Aggiungi dati aggiuntivi
    if (status === 'in_progress') {
      match.startedAt = additionalData.startedAt || new Date();
    } else if (status === 'cancelled') {
      match.cancelReason = additionalData.cancelReason;
      
      if (additionalData.failedBy) {
        // Trova il giocatore che ha fallito la verifica
        const playerIndex = match.players.findIndex(p => 
          p.user.toString() === additionalData.failedBy
        );
        
        if (playerIndex !== -1) {
          match.players[playerIndex].disconnected = true;
        }
      }
    }
    
    await match.save();
    
  } catch (error) {
    console.error('Errore nell\'aggiornare lo stato del match:', error);
  }
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

// Pulisce le risorse quando il server si spegne
exports.cleanup = () => {
  // Cancella tutti i timeout
  for (const [matchId, verificationProcess] of activeVerifications) {
    if (verificationProcess.timeoutId) {
      clearTimeout(verificationProcess.timeoutId);
    }
  }
  
  // Svuota la mappa
  activeVerifications.clear();
};
