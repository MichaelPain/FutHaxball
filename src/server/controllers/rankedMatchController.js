// server/controllers/rankedMatchController.js - Controller per la gestione delle partite ranked

const Match = require('../models/Match');
const User = require('../models/User');
const mmrCalculator = require('../utils/mmrCalculator');

// Mappa delle partite ranked attive
const activeMatches = new Map();

// Inizializza il sistema di gestione delle partite ranked
exports.initRankedMatches = (io) => {
  console.log('Sistema di gestione partite ranked inizializzato');
  
  // Configura gli handler per i socket
  io.on('connection', (socket) => {
    // Handler per i tocchi della palla
    socket.on('ranked:ball_touch', (data) => {
      handleBallTouch(socket, data, io);
    });
    
    // Handler per i calci della palla
    socket.on('ranked:ball_kick', (data) => {
      handleBallKick(socket, data, io);
    });
    
    // Handler per i gol
    socket.on('ranked:goal', (data) => {
      handleGoal(socket, data, io);
    });
    
    // Handler per le autoreti
    socket.on('ranked:own_goal', (data) => {
      handleOwnGoal(socket, data, io);
    });
    
    // Handler per il possesso palla
    socket.on('ranked:possession', (data) => {
      handlePossession(socket, data, io);
    });
    
    // Handler per la disconnessione di un giocatore
    socket.on('ranked:player_disconnect', (data) => {
      handlePlayerDisconnect(socket, data, io);
    });
    
    // Handler per la riconnessione di un giocatore
    socket.on('ranked:player_reconnect', (data) => {
      handlePlayerReconnect(socket, data, io);
    });
    
    // Handler per problemi tecnici
    socket.on('ranked:technical_issue', (data) => {
      handleTechnicalIssue(socket, data, io);
    });
    
    // Handler per richieste di timeout
    socket.on('ranked:timeout_request', (data) => {
      handleTimeoutRequest(socket, data, io);
    });
  });
};

// Avvia una partita ranked
exports.startRankedMatch = async (req, res) => {
  try {
    const { matchId } = req.body;
    
    // Verifica che il match esista
    const match = await Match.findById(matchId).populate('players.user');
    if (!match) {
      return res.status(404).json({ message: 'Match non trovato' });
    }
    
    // Verifica che il match sia in stato in_progress
    if (match.status !== 'in_progress') {
      return res.status(400).json({ message: 'Il match non è in stato in_progress' });
    }
    
    // Crea la partita attiva
    const activeMatch = {
      id: matchId,
      mode: match.mode,
      players: match.players.map(player => ({
        userId: player.user._id.toString(),
        nickname: player.user.nickname,
        team: player.team,
        connected: true,
        disconnectedAt: null,
        reconnectedAt: null
      })),
      score: [0, 0], // [Rosso, Blu]
      startTime: Date.now(),
      goals: [],
      possession: {
        0: 50, // Team rosso
        1: 50  // Team blu
      },
      kicks: {},
      touches: {},
      lastTouch: null,
      timeouts: [],
      technicalIssues: []
    };
    
    // Inizializza le statistiche per ogni giocatore
    activeMatch.players.forEach(player => {
      activeMatch.kicks[player.userId] = 0;
      activeMatch.touches[player.userId] = 0;
    });
    
    // Salva la partita attiva
    activeMatches.set(matchId, activeMatch);
    
    // Notifica tutti i giocatori
    const io = req.app.get('io');
    activeMatch.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:match_start', {
          id: matchId,
          mode: match.mode,
          players: activeMatch.players,
          score: activeMatch.score,
          startTime: activeMatch.startTime
        });
      }
    });
    
    // Invia la risposta
    res.status(200).json({
      message: 'Partita ranked avviata',
      match: activeMatch
    });
    
  } catch (error) {
    console.error('Errore nell\'avviare la partita ranked:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Termina una partita ranked
exports.endRankedMatch = async (req, res) => {
  try {
    const { matchId, winningTeam } = req.body;
    
    // Verifica che la partita attiva esista
    const activeMatch = activeMatches.get(matchId);
    if (!activeMatch) {
      return res.status(404).json({ message: 'Partita attiva non trovata' });
    }
    
    // Aggiorna il database
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match non trovato nel database' });
    }
    
    // Aggiorna lo stato del match
    match.status = 'completed';
    match.endedAt = new Date();
    match.winningTeam = winningTeam;
    match.teamScores = {
      0: activeMatch.score[0],
      1: activeMatch.score[1]
    };
    
    // Aggiorna le statistiche dei giocatori
    for (let i = 0; i < match.players.length; i++) {
      const player = match.players[i];
      const activePlayer = activeMatch.players.find(p => p.userId === player.user.toString());
      
      if (activePlayer) {
        // Aggiorna gol, assist, tocchi, calci
        player.goals = activeMatch.goals.filter(g => g.scorerId === activePlayer.userId).length;
        player.assists = activeMatch.goals.filter(g => g.assisterId === activePlayer.userId).length;
        player.ownGoals = activeMatch.goals.filter(g => g.ownGoal && g.ownGoalPlayerId === activePlayer.userId).length;
        player.touches = activeMatch.touches[activePlayer.userId] || 0;
        player.kicks = activeMatch.kicks[activePlayer.userId] || 0;
        
        // Calcola il possesso palla per il giocatore (approssimazione)
        const teamPossession = activeMatch.possession[activePlayer.team];
        const teamPlayers = activeMatch.players.filter(p => p.team === activePlayer.team).length;
        player.possession = teamPossession / teamPlayers;
        
        // Aggiorna lo stato di disconnessione
        player.disconnected = !activePlayer.connected;
      }
    }
    
    // Calcola la variazione di MMR
    await match.calculateStats();
    await match.updatePlayerMmr(mmrCalculator);
    
    // Salva il match
    await match.save();
    
    // Aggiorna l'MMR e le statistiche degli utenti
    for (const player of match.players) {
      const user = await User.findById(player.user);
      if (user) {
        // Aggiorna l'MMR
        if (!user.mmr) user.mmr = {};
        if (!user.mmr[match.mode]) user.mmr[match.mode] = 1000;
        user.mmr[match.mode] += player.mmrChange || 0;
        
        // Aggiorna le statistiche
        if (!user.stats) user.stats = {};
        if (!user.stats[match.mode]) {
          user.stats[match.mode] = {
            games: 0,
            wins: 0,
            losses: 0,
            goals: 0,
            assists: 0,
            ownGoals: 0
          };
        }
        
        user.stats[match.mode].games += 1;
        
        if (player.team === match.winningTeam) {
          user.stats[match.mode].wins += 1;
        } else if (match.winningTeam !== null) {
          user.stats[match.mode].losses += 1;
        }
        
        user.stats[match.mode].goals += player.goals || 0;
        user.stats[match.mode].assists += player.assists || 0;
        user.stats[match.mode].ownGoals += player.ownGoals || 0;
        
        await user.save();
      }
    }
    
    // Notifica tutti i giocatori
    const io = req.app.get('io');
    activeMatch.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:match_end', {
          id: matchId,
          winningTeam,
          score: activeMatch.score,
          duration: Math.floor((Date.now() - activeMatch.startTime) / 1000),
          players: match.players.map(p => ({
            userId: p.user.toString(),
            team: p.team,
            goals: p.goals,
            assists: p.assists,
            ownGoals: p.ownGoals,
            mmrChange: p.mmrChange
          }))
        });
      }
    });
    
    // Rimuovi la partita attiva
    activeMatches.delete(matchId);
    
    // Invia la risposta
    res.status(200).json({
      message: 'Partita ranked terminata',
      match: match.getSummary()
    });
    
  } catch (error) {
    console.error('Errore nel terminare la partita ranked:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni lo stato di una partita ranked
exports.getRankedMatchStatus = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    // Verifica che la partita attiva esista
    const activeMatch = activeMatches.get(matchId);
    if (!activeMatch) {
      return res.status(404).json({ message: 'Partita attiva non trovata' });
    }
    
    // Invia la risposta
    res.status(200).json({
      match: activeMatch
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere lo stato della partita ranked:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisce i tocchi della palla
function handleBallTouch(socket, data, io) {
  const { matchId, playerId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il giocatore sia parte della partita
  const player = activeMatch.players.find(p => p.userId === playerId);
  if (!player) {
    return socket.emit('error', { message: 'Giocatore non trovato nella partita' });
  }
  
  // Aggiorna le statistiche
  if (!activeMatch.touches[playerId]) {
    activeMatch.touches[playerId] = 0;
  }
  activeMatch.touches[playerId]++;
  
  // Aggiorna l'ultimo tocco
  activeMatch.lastTouch = {
    playerId,
    timestamp: Date.now()
  };
  
  // Notifica tutti i giocatori ogni 10 tocchi per ridurre il traffico
  if (activeMatch.touches[playerId] % 10 === 0) {
    activeMatch.players.forEach(p => {
      const playerSocket = getUserSocket(io, p.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:stats_update', {
          touches: { [playerId]: activeMatch.touches[playerId] },
          lastTouch: activeMatch.lastTouch
        });
      }
    });
  }
}

// Gestisce i calci della palla
function handleBallKick(socket, data, io) {
  const { matchId, playerId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il giocatore sia parte della partita
  const player = activeMatch.players.find(p => p.userId === playerId);
  if (!player) {
    return socket.emit('error', { message: 'Giocatore non trovato nella partita' });
  }
  
  // Aggiorna le statistiche
  if (!activeMatch.kicks[playerId]) {
    activeMatch.kicks[playerId] = 0;
  }
  activeMatch.kicks[playerId]++;
  
  // Notifica tutti i giocatori ogni 5 calci per ridurre il traffico
  if (activeMatch.kicks[playerId] % 5 === 0) {
    activeMatch.players.forEach(p => {
      const playerSocket = getUserSocket(io, p.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:stats_update', {
          kicks: { [playerId]: activeMatch.kicks[playerId] }
        });
      }
    });
  }
}

// Gestisce i gol
function handleGoal(socket, data, io) {
  const { matchId, teamId, scorerId, assisterId, timestamp } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il team sia valido
  if (teamId !== 0 && teamId !== 1) {
    return socket.emit('error', { message: 'Team non valido' });
  }
  
  // Verifica che il marcatore sia parte della partita e del team corretto
  if (scorerId) {
    const scorer = activeMatch.players.find(p => p.userId === scorerId);
    if (!scorer) {
      return socket.emit('error', { message: 'Marcatore non trovato nella partita' });
    }
    if (scorer.team !== teamId) {
      return socket.emit('error', { message: 'Il marcatore non è nel team indicato' });
    }
  }
  
  // Verifica che l'assistente sia parte della partita e del team corretto
  if (assisterId) {
    const assister = activeMatch.players.find(p => p.userId === assisterId);
    if (!assister) {
      return socket.emit('error', { message: 'Assistente non trovato nella partita' });
    }
    if (assister.team !== teamId) {
      return socket.emit('error', { message: 'L\'assistente non è nel team indicato' });
    }
  }
  
  // Aggiorna il punteggio
  activeMatch.score[teamId]++;
  
  // Registra il gol
  const goalData = {
    teamId,
    scorerId,
    assisterId,
    timestamp: timestamp || Date.now(),
    ownGoal: false
  };
  
  activeMatch.goals.push(goalData);
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:goal_scored', {
        ...goalData,
        score: activeMatch.score
      });
    }
  });
}

// Gestisce le autoreti
function handleOwnGoal(socket, data, io) {
  const { matchId, teamId, ownGoalPlayerId, timestamp } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il team sia valido
  if (teamId !== 0 && teamId !== 1) {
    return socket.emit('error', { message: 'Team non valido' });
  }
  
  // Verifica che il giocatore sia parte della partita
  if (ownGoalPlayerId) {
    const player = activeMatch.players.find(p => p.userId === ownGoalPlayerId);
    if (!player) {
      return socket.emit('error', { message: 'Giocatore non trovato nella partita' });
    }
    // L'autorete è per il team opposto
    if (player.team === teamId) {
      return socket.emit('error', { message: 'Il giocatore è nel team che ha segnato il gol' });
    }
  }
  
  // Aggiorna il punteggio
  activeMatch.score[teamId]++;
  
  // Registra l'autorete
  const goalData = {
    teamId,
    scorerId: null,
    assisterId: null,
    timestamp: timestamp || Date.now(),
    ownGoal: true,
    ownGoalPlayerId
  };
  
  activeMatch.goals.push(goalData);
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:goal_scored', {
        ...goalData,
        score: activeMatch.score
      });
    }
  });
}

// Gestisce gli aggiornamenti del possesso palla
function handlePossession(socket, data, io) {
  const { matchId, possession } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il possesso sia valido
  if (!possession || typeof possession !== 'object' || 
      typeof possession[0] !== 'number' || typeof possession[1] !== 'number' ||
      possession[0] < 0 || possession[1] < 0 || 
      possession[0] + possession[1] !== 100) {
    return socket.emit('error', { message: 'Dati di possesso non validi' });
  }
  
  // Aggiorna il possesso
  activeMatch.possession = possession;
  
  // Notifica tutti i giocatori ogni 10 secondi per ridurre il traffico
  if (!activeMatch._lastPossessionUpdate || Date.now() - activeMatch._lastPossessionUpdate > 10000) {
    activeMatch.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:stats_update', {
          possession: activeMatch.possession
        });
      }
    });
    
    activeMatch._lastPossessionUpdate = Date.now();
  }
}

// Gestisce la disconnessione di un giocatore
function handlePlayerDisconnect(socket, data, io) {
  const { matchId, playerId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il giocatore sia parte della partita
  const playerIndex = activeMatch.players.findIndex(p => p.userId === playerId);
  if (playerIndex === -1) {
    return socket.emit('error', { message: 'Giocatore non trovato nella partita' });
  }
  
  // Aggiorna lo stato del giocatore
  activeMatch.players[playerIndex].connected = false;
  activeMatch.players[playerIndex].disconnectedAt = Date.now();
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:player_update', {
        playerId,
        connected: false,
        disconnectedAt: activeMatch.players[playerIndex].disconnectedAt
      });
    }
  });
}

// Gestisce la riconnessione di un giocatore
function handlePlayerReconnect(socket, data, io) {
  const { matchId, playerId } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il giocatore sia parte della partita
  const playerIndex = activeMatch.players.findIndex(p => p.userId === playerId);
  if (playerIndex === -1) {
    return socket.emit('error', { message: 'Giocatore non trovato nella partita' });
  }
  
  // Aggiorna lo stato del giocatore
  activeMatch.players[playerIndex].connected = true;
  activeMatch.players[playerIndex].reconnectedAt = Date.now();
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:player_update', {
        playerId,
        connected: true,
        reconnectedAt: activeMatch.players[playerIndex].reconnectedAt
      });
    }
  });
}

// Gestisce i problemi tecnici
function handleTechnicalIssue(socket, data, io) {
  const { matchId, issueType, description, timestamp } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Registra il problema tecnico
  const issue = {
    userId,
    issueType,
    description,
    timestamp: timestamp || Date.now(),
    resolved: false
  };
  
  activeMatch.technicalIssues.push(issue);
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(player => {
    const playerSocket = getUserSocket(io, player.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:technical_issue', {
        ...issue,
        issueId: activeMatch.technicalIssues.length - 1
      });
    }
  });
}

// Gestisce le richieste di timeout
function handleTimeoutRequest(socket, data, io) {
  const { matchId, reason, timestamp } = data;
  const userId = socket.user ? socket.user.id : null;
  
  if (!userId) {
    return socket.emit('error', { message: 'Non autenticato' });
  }
  
  // Verifica che la partita attiva esista
  const activeMatch = activeMatches.get(matchId);
  if (!activeMatch) {
    return socket.emit('error', { message: 'Partita attiva non trovata' });
  }
  
  // Verifica che il giocatore sia parte della partita
  const player = activeMatch.players.find(p => p.userId === userId);
  if (!player) {
    return socket.emit('error', { message: 'Non sei parte di questa partita' });
  }
  
  // Verifica che non ci siano già timeout attivi
  const activeTimeout = activeMatch.timeouts.find(t => !t.endTime);
  if (activeTimeout) {
    return socket.emit('error', { message: 'C\'è già un timeout attivo' });
  }
  
  // Registra il timeout
  const timeout = {
    userId,
    reason,
    startTime: timestamp || Date.now(),
    endTime: null,
    team: player.team
  };
  
  activeMatch.timeouts.push(timeout);
  
  // Notifica tutti i giocatori
  activeMatch.players.forEach(p => {
    const playerSocket = getUserSocket(io, p.userId);
    if (playerSocket) {
      playerSocket.emit('ranked:timeout_start', {
        ...timeout,
        timeoutId: activeMatch.timeouts.length - 1
      });
    }
  });
}

// Termina un timeout
exports.endTimeout = async (req, res) => {
  try {
    const { matchId, timeoutId } = req.body;
    
    // Verifica che la partita attiva esista
    const activeMatch = activeMatches.get(matchId);
    if (!activeMatch) {
      return res.status(404).json({ message: 'Partita attiva non trovata' });
    }
    
    // Verifica che il timeout esista
    if (!activeMatch.timeouts[timeoutId]) {
      return res.status(404).json({ message: 'Timeout non trovato' });
    }
    
    // Verifica che il timeout sia attivo
    if (activeMatch.timeouts[timeoutId].endTime) {
      return res.status(400).json({ message: 'Il timeout è già terminato' });
    }
    
    // Termina il timeout
    activeMatch.timeouts[timeoutId].endTime = Date.now();
    
    // Notifica tutti i giocatori
    const io = req.app.get('io');
    activeMatch.players.forEach(player => {
      const playerSocket = getUserSocket(io, player.userId);
      if (playerSocket) {
        playerSocket.emit('ranked:timeout_end', {
          timeoutId,
          endTime: activeMatch.timeouts[timeoutId].endTime
        });
      }
    });
    
    // Invia la risposta
    res.status(200).json({
      message: 'Timeout terminato',
      timeout: activeMatch.timeouts[timeoutId]
    });
    
  } catch (error) {
    console.error('Errore nel terminare il timeout:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

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
  // Svuota la mappa
  activeMatches.clear();
};
