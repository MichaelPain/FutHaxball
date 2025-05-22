// server/controllers/penaltyController.js - Controller per il sistema di penalità

const User = require('../models/User');
const Penalty = require('../models/Penalty');
const Report = require('../models/Report');

// Inizializza il sistema di penalità
exports.initPenaltySystem = (io) => {
  console.log('Sistema di penalità inizializzato');
  
  // Configura gli handler per i socket
  io.on('connection', (socket) => {
    // Handler per la richiesta delle penalità dell'utente
    socket.on('penalty:fetch_user_penalties', () => {
      if (socket.user) {
        fetchUserPenalties(socket.user.id, socket);
      } else {
        socket.emit('error', { message: 'Non autenticato' });
      }
    });
    
    // Handler per la richiesta delle penalità di un giocatore
    socket.on('penalty:fetch_player_penalties', (data) => {
      if (socket.user && socket.user.isAdmin) {
        fetchPlayerPenalties(data.playerId, socket);
      } else {
        socket.emit('error', { message: 'Non autorizzato' });
      }
    });
    
    // Handler per la segnalazione di comportamenti scorretti
    socket.on('penalty:report_misconduct', (data) => {
      if (socket.user) {
        reportMisconduct(socket.user.id, data, socket);
      } else {
        socket.emit('error', { message: 'Non autenticato' });
      }
    });
  });
  
  // Avvia il controllo periodico delle penalità scadute
  startPenaltyExpirationCheck(io);
};

// Ottieni le penalità di un utente
exports.getUserPenalties = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Ottieni le penalità dell'utente
    const penalties = await Penalty.find({ user: userId })
      .sort({ createdAt: -1 });
    
    // Verifica quali penalità sono scadute
    const now = new Date();
    penalties.forEach(penalty => {
      if (!penalty.permanent && penalty.expiresAt && penalty.expiresAt <= now) {
        penalty.expired = true;
      }
    });
    
    // Invia la risposta
    res.status(200).json({
      penalties: penalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        permanent: p.permanent,
        expired: p.expired
      }))
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere le penalità dell\'utente:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni le penalità di un giocatore (solo admin)
exports.getPlayerPenalties = async (req, res) => {
  try {
    // Verifica che l'utente sia un admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    const { playerId } = req.params;
    
    // Ottieni le penalità del giocatore
    const penalties = await Penalty.find({ user: playerId })
      .sort({ createdAt: -1 });
    
    // Verifica quali penalità sono scadute
    const now = new Date();
    penalties.forEach(penalty => {
      if (!penalty.permanent && penalty.expiresAt && penalty.expiresAt <= now) {
        penalty.expired = true;
      }
    });
    
    // Invia la risposta
    res.status(200).json({
      penalties: penalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        permanent: p.permanent,
        expired: p.expired
      }))
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere le penalità del giocatore:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Assegna una penalità a un utente (solo admin)
exports.assignPenalty = async (req, res) => {
  try {
    // Verifica che l'utente sia un admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    const { userId, type, reason, duration, permanent } = req.body;
    
    // Verifica che l'utente esista
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Verifica che il tipo di penalità sia valido
    if (!['warning', 'chat_ban', 'ranked_ban', 'ban'].includes(type)) {
      return res.status(400).json({ message: 'Tipo di penalità non valido' });
    }
    
    // Calcola la data di scadenza
    let expiresAt = null;
    if (!permanent) {
      if (!duration) {
        return res.status(400).json({ message: 'Durata richiesta per penalità non permanenti' });
      }
      
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + duration);
    }
    
    // Crea la penalità
    const penalty = new Penalty({
      user: userId,
      type,
      reason,
      expiresAt,
      permanent: !!permanent,
      assignedBy: req.user.id
    });
    
    await penalty.save();
    
    // Notifica l'utente
    const io = req.app.get('io');
    const userSocket = getUserSocket(io, userId);
    if (userSocket) {
      userSocket.emit('penalty:received', {
        id: penalty._id,
        type: penalty.type,
        reason: penalty.reason,
        createdAt: penalty.createdAt,
        expiresAt: penalty.expiresAt,
        permanent: penalty.permanent
      });
    }
    
    // Invia la risposta
    res.status(201).json({
      message: 'Penalità assegnata con successo',
      penalty: {
        id: penalty._id,
        type: penalty.type,
        reason: penalty.reason,
        createdAt: penalty.createdAt,
        expiresAt: penalty.expiresAt,
        permanent: penalty.permanent
      }
    });
    
  } catch (error) {
    console.error('Errore nell\'assegnare la penalità:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Rimuovi una penalità (solo admin)
exports.removePenalty = async (req, res) => {
  try {
    // Verifica che l'utente sia un admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    const { penaltyId } = req.params;
    
    // Verifica che la penalità esista
    const penalty = await Penalty.findById(penaltyId);
    if (!penalty) {
      return res.status(404).json({ message: 'Penalità non trovata' });
    }
    
    // Rimuovi la penalità
    await penalty.remove();
    
    // Notifica l'utente
    const io = req.app.get('io');
    const userSocket = getUserSocket(io, penalty.user.toString());
    if (userSocket) {
      userSocket.emit('penalty:expired', {
        id: penalty._id
      });
    }
    
    // Invia la risposta
    res.status(200).json({
      message: 'Penalità rimossa con successo'
    });
    
  } catch (error) {
    console.error('Errore nel rimuovere la penalità:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Segnala un comportamento scorretto
exports.reportMisconduct = async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { playerNickname, type, description, matchId } = req.body;
    
    // Verifica che il tipo di segnalazione sia valido
    if (!['afk', 'toxic', 'cheating', 'griefing', 'other'].includes(type)) {
      return res.status(400).json({ message: 'Tipo di segnalazione non valido' });
    }
    
    // Trova l'utente segnalato
    const reportedUser = await User.findOne({ nickname: playerNickname });
    if (!reportedUser) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Crea la segnalazione
    const report = new Report({
      reporter: reporterId,
      reported: reportedUser._id,
      type,
      description,
      matchId,
      status: 'pending'
    });
    
    await report.save();
    
    // Invia la risposta
    res.status(201).json({
      message: 'Segnalazione inviata con successo',
      report: {
        id: report._id,
        type: report.type,
        createdAt: report.createdAt
      }
    });
    
  } catch (error) {
    console.error('Errore nell\'inviare la segnalazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Ottieni le segnalazioni (solo admin)
exports.getReports = async (req, res) => {
  try {
    // Verifica che l'utente sia un admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    const { status } = req.query;
    
    // Costruisci la query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    // Ottieni le segnalazioni
    const reports = await Report.find(query)
      .populate('reporter', 'nickname')
      .populate('reported', 'nickname')
      .sort({ createdAt: -1 });
    
    // Invia la risposta
    res.status(200).json({
      reports: reports.map(r => ({
        id: r._id,
        reporter: r.reporter.nickname,
        reported: r.reported.nickname,
        type: r.type,
        description: r.description,
        matchId: r.matchId,
        status: r.status,
        createdAt: r.createdAt
      }))
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere le segnalazioni:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Gestisci una segnalazione (solo admin)
exports.handleReport = async (req, res) => {
  try {
    // Verifica che l'utente sia un admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    const { reportId } = req.params;
    const { action, penaltyType, penaltyReason, penaltyDuration, penaltyPermanent } = req.body;
    
    // Verifica che la segnalazione esista
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Segnalazione non trovata' });
    }
    
    // Verifica che l'azione sia valida
    if (!['dismiss', 'warn', 'penalize'].includes(action)) {
      return res.status(400).json({ message: 'Azione non valida' });
    }
    
    // Gestisci la segnalazione in base all'azione
    if (action === 'dismiss') {
      // Aggiorna lo stato della segnalazione
      report.status = 'dismissed';
      report.handledBy = req.user.id;
      report.handledAt = new Date();
      
      await report.save();
      
      // Invia la risposta
      res.status(200).json({
        message: 'Segnalazione respinta',
        report: {
          id: report._id,
          status: report.status
        }
      });
      
    } else if (action === 'warn' || action === 'penalize') {
      // Verifica che il tipo di penalità sia valido
      if (action === 'penalize' && !['chat_ban', 'ranked_ban', 'ban'].includes(penaltyType)) {
        return res.status(400).json({ message: 'Tipo di penalità non valido' });
      }
      
      // Calcola la data di scadenza
      let expiresAt = null;
      if (action === 'penalize' && !penaltyPermanent) {
        if (!penaltyDuration) {
          return res.status(400).json({ message: 'Durata richiesta per penalità non permanenti' });
        }
        
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + penaltyDuration);
      }
      
      // Crea la penalità
      const penalty = new Penalty({
        user: report.reported,
        type: action === 'warn' ? 'warning' : penaltyType,
        reason: penaltyReason || `Penalità per ${report.type}`,
        expiresAt,
        permanent: action === 'penalize' ? !!penaltyPermanent : false,
        assignedBy: req.user.id,
        relatedReport: report._id
      });
      
      await penalty.save();
      
      // Aggiorna lo stato della segnalazione
      report.status = 'actioned';
      report.handledBy = req.user.id;
      report.handledAt = new Date();
      report.resultingPenalty = penalty._id;
      
      await report.save();
      
      // Notifica l'utente
      const io = req.app.get('io');
      const userSocket = getUserSocket(io, report.reported.toString());
      if (userSocket) {
        userSocket.emit('penalty:received', {
          id: penalty._id,
          type: penalty.type,
          reason: penalty.reason,
          createdAt: penalty.createdAt,
          expiresAt: penalty.expiresAt,
          permanent: penalty.permanent
        });
      }
      
      // Invia la risposta
      res.status(200).json({
        message: action === 'warn' ? 'Avvertimento inviato' : 'Penalità assegnata',
        report: {
          id: report._id,
          status: report.status
        },
        penalty: {
          id: penalty._id,
          type: penalty.type,
          reason: penalty.reason,
          createdAt: penalty.createdAt,
          expiresAt: penalty.expiresAt,
          permanent: penalty.permanent
        }
      });
    }
    
  } catch (error) {
    console.error('Errore nel gestire la segnalazione:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Verifica se un utente può giocare partite ranked
exports.canPlayRanked = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verifica se l'utente ha penalità attive che impediscono di giocare ranked
    const now = new Date();
    const activePenalties = await Penalty.find({
      user: userId,
      $or: [
        { type: 'ranked_ban', permanent: true },
        { type: 'ranked_ban', expiresAt: { $gt: now } },
        { type: 'ban', permanent: true },
        { type: 'ban', expiresAt: { $gt: now } }
      ]
    });
    
    const canPlay = activePenalties.length === 0;
    
    // Invia la risposta
    res.status(200).json({
      canPlayRanked: canPlay,
      penalties: activePenalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        expiresAt: p.expiresAt,
        permanent: p.permanent
      }))
    });
    
  } catch (error) {
    console.error('Errore nel verificare se l\'utente può giocare ranked:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Verifica se un utente può usare la chat
exports.canUseChat = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verifica se l'utente ha penalità attive che impediscono di usare la chat
    const now = new Date();
    const activePenalties = await Penalty.find({
      user: userId,
      $or: [
        { type: 'chat_ban', permanent: true },
        { type: 'chat_ban', expiresAt: { $gt: now } },
        { type: 'ban', permanent: true },
        { type: 'ban', expiresAt: { $gt: now } }
      ]
    });
    
    const canUse = activePenalties.length === 0;
    
    // Invia la risposta
    res.status(200).json({
      canUseChat: canUse,
      penalties: activePenalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        expiresAt: p.expiresAt,
        permanent: p.permanent
      }))
    });
    
  } catch (error) {
    console.error('Errore nel verificare se l\'utente può usare la chat:', error);
    res.status(500).json({ message: 'Errore del server' });
  }
};

// Funzioni interne

// Ottieni le penalità di un utente (via socket)
async function fetchUserPenalties(userId, socket) {
  try {
    // Ottieni le penalità dell'utente
    const penalties = await Penalty.find({ user: userId })
      .sort({ createdAt: -1 });
    
    // Verifica quali penalità sono scadute
    const now = new Date();
    penalties.forEach(penalty => {
      if (!penalty.permanent && penalty.expiresAt && penalty.expiresAt <= now) {
        penalty.expired = true;
      }
    });
    
    // Invia le penalità
    socket.emit('penalty:user_penalties', {
      penalties: penalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        permanent: p.permanent,
        expired: p.expired
      }))
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere le penalità dell\'utente:', error);
    socket.emit('error', { message: 'Errore del server' });
  }
}

// Ottieni le penalità di un giocatore (via socket)
async function fetchPlayerPenalties(playerId, socket) {
  try {
    // Ottieni le penalità del giocatore
    const penalties = await Penalty.find({ user: playerId })
      .sort({ createdAt: -1 });
    
    // Verifica quali penalità sono scadute
    const now = new Date();
    penalties.forEach(penalty => {
      if (!penalty.permanent && penalty.expiresAt && penalty.expiresAt <= now) {
        penalty.expired = true;
      }
    });
    
    // Invia le penalità
    socket.emit('penalty:player_penalties', {
      playerId,
      penalties: penalties.map(p => ({
        id: p._id,
        type: p.type,
        reason: p.reason,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        permanent: p.permanent,
        expired: p.expired
      }))
    });
    
  } catch (error) {
    console.error('Errore nell\'ottenere le penalità del giocatore:', error);
    socket.emit('error', { message: 'Errore del server' });
  }
}

// Segnala un comportamento scorretto (via socket)
async function reportMisconduct(reporterId, data, socket) {
  try {
    const { playerId, type, description, matchId } = data;
    
    // Verifica che il tipo di segnalazione sia valido
    if (!['afk', 'toxic', 'cheating', 'griefing', 'other'].includes(type)) {
      return socket.emit('error', { message: 'Tipo di segnalazione non valido' });
    }
    
    // Trova l'utente segnalato
    let reportedUser;
    
    // Se è stato fornito un ID, cerca per ID
    if (playerId && mongoose.Types.ObjectId.isValid(playerId)) {
      reportedUser = await User.findById(playerId);
    } 
    // Altrimenti, cerca per nickname
    else if (data.nickname) {
      reportedUser = await User.findOne({ nickname: data.nickname });
    }
    
    if (!reportedUser) {
      return socket.emit('error', { message: 'Utente non trovato' });
    }
    
    // Crea la segnalazione
    const report = new Report({
      reporter: reporterId,
      reported: reportedUser._id,
      type,
      description,
      matchId,
      status: 'pending'
    });
    
    await report.save();
    
    // Invia la conferma
    socket.emit('penalty:report_submitted', {
      message: 'Segnalazione inviata con successo',
      reportId: report._id
    });
    
  } catch (error) {
    console.error('Errore nell\'inviare la segnalazione:', error);
    socket.emit('error', { message: 'Errore del server' });
  }
}

// Avvia il controllo periodico delle penalità scadute
function startPenaltyExpirationCheck(io) {
  // Controlla ogni ora
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Trova le penalità scadute
      const expiredPenalties = await Penalty.find({
        permanent: false,
        expiresAt: { $lte: now },
        expired: { $ne: true }
      });
      
      // Aggiorna le penalità e notifica gli utenti
      for (const penalty of expiredPenalties) {
        penalty.expired = true;
        await penalty.save();
        
        // Notifica l'utente
        const userSocket = getUserSocket(io, penalty.user.toString());
        if (userSocket) {
          userSocket.emit('penalty:expired', {
            id: penalty._id
          });
        }
      }
      
      if (expiredPenalties.length > 0) {
        console.log(`${expiredPenalties.length} penalità scadute elaborate`);
      }
      
    } catch (error) {
      console.error('Errore nel controllo delle penalità scadute:', error);
    }
  }, 3600000); // 1 ora
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
  // Nessuna risorsa da pulire
};
