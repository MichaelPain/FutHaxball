/**
 * MultiStageController.js - Controller per la gestione dei tornei multi-stage
 * 
 * Questo controller gestisce tutte le operazioni relative ai tornei con più fasi,
 * inclusa la creazione delle fasi, la transizione tra fasi e la gestione dei qualificati.
 */

const Tournament = require('../models/Tournament');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const Admin = require('../models/Admin');
const config = require('../config');
const { generateSlug, validateTournamentData } = require('../utils/tournamentUtils');

/**
 * Controller per la gestione dei tornei multi-stage
 */
class MultiStageController {
  /**
   * Crea una nuova fase per un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createStage(req, res) {
    try {
      const userId = req.user.id;
      const { tournamentId } = req.params;
      const { name, format, order, startDate, endDate, qualificationCount } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono creare fasi di torneo.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_TOURNAMENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Verifica che il torneo sia multi-stage
      if (tournament.format !== Tournament.TOURNAMENT_FORMATS.MULTI_STAGE) {
        return res.status(400).json({ 
          success: false, 
          message: 'Questo torneo non è di tipo multi-stage.' 
        });
      }
      
      // Verifica che il formato della fase sia valido
      if (!Object.values(Tournament.TOURNAMENT_FORMATS).includes(format)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Formato della fase non valido.' 
        });
      }
      
      // Verifica che l'ordine sia valido
      if (order <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'L\'ordine della fase deve essere un numero positivo.' 
        });
      }
      
      // Verifica che non esista già una fase con lo stesso ordine
      const existingStage = tournament.stages.find(s => s.order === order);
      if (existingStage) {
        return res.status(400).json({ 
          success: false, 
          message: 'Esiste già una fase con questo ordine.' 
        });
      }
      
      // Crea la nuova fase
      const newStage = {
        name,
        format,
        order,
        startDate,
        endDate,
        status: 'pending',
        qualificationCount: qualificationCount || 0,
        matches: []
      };
      
      // Aggiungi la fase al torneo
      tournament.stages.push(newStage);
      
      // Ordina le fasi per ordine
      tournament.stages.sort((a, b) => a.order - b.order);
      
      await tournament.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'create_tournament_stage',
        target: { type: 'tournament', id: tournament._id },
        details: { 
          tournamentName: tournament.name, 
          stageName: name,
          format,
          order
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(201).json({
        success: true,
        message: 'Fase del torneo creata con successo.',
        stage: newStage
      });
    } catch (error) {
      console.error('Errore durante la creazione della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la creazione della fase del torneo.' 
      });
    }
  }
  
  /**
   * Aggiorna una fase esistente di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async updateStage(req, res) {
    try {
      const userId = req.user.id;
      const { tournamentId, stageId } = req.params;
      const { name, format, order, startDate, endDate, qualificationCount } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono aggiornare fasi di torneo.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_TOURNAMENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Trova la fase da aggiornare
      const stageIndex = tournament.stages.findIndex(s => s._id.toString() === stageId);
      
      if (stageIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fase del torneo non trovata.' 
        });
      }
      
      const stage = tournament.stages[stageIndex];
      
      // Verifica che la fase non sia già attiva o completata
      if (stage.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Non è possibile modificare una fase che è già attiva o completata.' 
        });
      }
      
      // Verifica che il formato della fase sia valido
      if (format && !Object.values(Tournament.TOURNAMENT_FORMATS).includes(format)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Formato della fase non valido.' 
        });
      }
      
      // Verifica che l'ordine sia valido
      if (order && order <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'L\'ordine della fase deve essere un numero positivo.' 
        });
      }
      
      // Verifica che non esista già un'altra fase con lo stesso ordine
      if (order && order !== stage.order) {
        const existingStage = tournament.stages.find(s => s.order === order && s._id.toString() !== stageId);
        if (existingStage) {
          return res.status(400).json({ 
            success: false, 
            message: 'Esiste già una fase con questo ordine.' 
          });
        }
      }
      
      // Aggiorna i campi della fase
      if (name) stage.name = name;
      if (format) stage.format = format;
      if (order) stage.order = order;
      if (startDate) stage.startDate = startDate;
      if (endDate) stage.endDate = endDate;
      if (qualificationCount !== undefined) stage.qualificationCount = qualificationCount;
      
      // Ordina le fasi per ordine
      tournament.stages.sort((a, b) => a.order - b.order);
      
      await tournament.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'update_tournament_stage',
        target: { type: 'tournament', id: tournament._id },
        details: { 
          tournamentName: tournament.name, 
          stageName: stage.name,
          stageId,
          updatedFields: Object.keys(req.body)
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Fase del torneo aggiornata con successo.',
        stage: tournament.stages[stageIndex]
      });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'aggiornamento della fase del torneo.' 
      });
    }
  }
  
  /**
   * Elimina una fase di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async deleteStage(req, res) {
    try {
      const userId = req.user.id;
      const { tournamentId, stageId } = req.params;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono eliminare fasi di torneo.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_TOURNAMENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Trova la fase da eliminare
      const stageIndex = tournament.stages.findIndex(s => s._id.toString() === stageId);
      
      if (stageIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fase del torneo non trovata.' 
        });
      }
      
      const stage = tournament.stages[stageIndex];
      
      // Verifica che la fase non sia già attiva o completata
      if (stage.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Non è possibile eliminare una fase che è già attiva o completata.' 
        });
      }
      
      // Rimuovi la fase
      tournament.stages.splice(stageIndex, 1);
      
      await tournament.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'delete_tournament_stage',
        target: { type: 'tournament', id: tournament._id },
        details: { 
          tournamentName: tournament.name, 
          stageName: stage.name,
          stageId
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Fase del torneo eliminata con successo.'
      });
    } catch (error) {
      console.error('Errore durante l\'eliminazione della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'eliminazione della fase del torneo.' 
      });
    }
  }
  
  /**
   * Avvia una fase di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async startStage(req, res) {
    try {
      const userId = req.user.id;
      const { tournamentId, stageId } = req.params;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono avviare fasi di torneo.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.MANAGE_TOURNAMENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Trova la fase da avviare
      const stageIndex = tournament.stages.findIndex(s => s._id.toString() === stageId);
      
      if (stageIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fase del torneo non trovata.' 
        });
      }
      
      const stage = tournament.stages[stageIndex];
      
      // Verifica che la fase sia in stato pending
      if (stage.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          message: 'Questa fase è già stata avviata o completata.' 
        });
      }
      
      // Verifica che sia la prima fase o che la fase precedente sia completata
      if (stage.order > 1) {
        const previousStage = tournament.stages.find(s => s.order === stage.order - 1);
        if (previousStage && previousStage.status !== 'completed') {
          return res.status(400).json({ 
            success: false, 
            message: 'La fase precedente deve essere completata prima di avviare questa fase.' 
          });
        }
      }
      
      // Avvia la fase
      stage.status = 'active';
      stage.startDate = new Date();
      
      // Se è la prima fase, utilizza tutti i partecipanti del torneo
      if (stage.order === 1) {
        // Genera il bracket in base al formato della fase
        await this._generateBracket(tournament, stage);
      } else {
        // Utilizza i qualificati dalla fase precedente
        await this._advanceQualifiers(tournament, stage);
      }
      
      await tournament.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'start_tournament_stage',
        target: { type: 'tournament', id: tournament._id },
        details: { 
          tournamentName: tournament.name, 
          stageName: stage.name,
          stageId
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Fase del torneo avviata con successo.',
        stage: tournament.stages[stageIndex]
      });
    } catch (error) {
      console.error('Errore durante l\'avvio della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'avvio della fase del torneo.' 
      });
    }
  }
  
  /**
   * Completa una fase di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async completeStage(req, res) {
    try {
      const userId = req.user.id;
      const { tournamentId, stageId } = req.params;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono completare fasi di torneo.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.MANAGE_TOURNAMENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Trova la fase da completare
      const stageIndex = tournament.stages.findIndex(s => s._id.toString() === stageId);
      
      if (stageIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fase del torneo non trovata.' 
        });
      }
      
      const stage = tournament.stages[stageIndex];
      
      // Verifica che la fase sia in stato active
      if (stage.status !== 'active') {
        return res.status(400).json({ 
          success: false, 
          message: 'Questa fase non è attiva.' 
        });
      }
      
      // Verifica che tutte le partite siano completate
      const incompleteMatches = stage.matches.filter(m => m.status !== 'completed' && m.status !== 'cancelled');
      if (incompleteMatches.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tutte le partite devono essere completate prima di completare la fase.' 
        });
      }
      
      // Completa la fase
      stage.status = 'completed';
      stage.endDate = new Date();
      
      // Calcola i qualificati per la fase successiva
      const qualifiers = await this._calculateQualifiers(tournament, stage);
      
      // Se è l'ultima fase, completa il torneo
      const isLastStage = !tournament.stages.some(s => s.order > stage.order);
      if (isLastStage) {
        tournament.status = Tournament.TOURNAMENT_STATUS.COMPLETED;
        tournament.endDate = new Date();
      }
      
      await tournament.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'complete_tournament_stage',
        target: { type: 'tournament', id: tournament._id },
        details: { 
          tournamentName: tournament.name, 
          stageName: stage.name,
          stageId,
          qualifiers: qualifiers.length
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Fase del torneo completata con successo.',
        stage: tournament.stages[stageIndex],
        qualifiers,
        isLastStage
      });
    } catch (error) {
      console.error('Errore durante il completamento della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il completamento della fase del torneo.' 
      });
    }
  }
  
  /**
   * Ottiene i dettagli di una fase di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getStageDetails(req, res) {
    try {
      const { tournamentId, stageId } = req.params;
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Trova la fase
      const stage = tournament.stages.find(s => s._id.toString() === stageId);
      
      if (!stage) {
        return res.status(404).json({ 
          success: false, 
          message: 'Fase del torneo non trovata.' 
        });
      }
      
      // Ottieni i dettagli dei partecipanti
      const participantIds = new Set();
      stage.matches.forEach(match => {
        match.participants.forEach(participantId => {
          if (participantId) participantIds.add(participantId.toString());
        });
      });
      
      const participants = await User.find({ _id: { $in: Array.from(participantIds) } })
        .select('nickname avatar');
      
      const participantsMap = {};
      participants.forEach(participant => {
        participantsMap[participant._id.toString()] = {
          id: participant._id,
          nickname: participant.nickname,
          avatar: participant.avatar
        };
      });
      
      return res.status(200).json({
        success: true,
        stage,
        participants: participantsMap
      });
    } catch (error) {
      console.error('Errore durante il recupero dei dettagli della fase del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero dei dettagli della fase del torneo.' 
      });
    }
  }
  
  /**
   * Ottiene tutte le fasi di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getTournamentStages(req, res) {
    try {
      const { tournamentId } = req.params;
      
      // Ottieni il torneo
      const tournament = await Tournament.findById(tournamentId);
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Torneo non trovato.' 
        });
      }
      
      // Ordina le fasi per ordine
      const stages = tournament.stages.sort((a, b) => a.order - b.order);
      
      return res.status(200).json({
        success: true,
        stages
      });
    } catch (error) {
      console.error('Errore durante il recupero delle fasi del torneo:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero delle fasi del torneo.' 
      });
    }
  }
  
  /**
   * Genera il bracket per una fase di un torneo
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _generateBracket(tournament, stage) {
    // Implementazione specifica per ogni formato di fase
    switch (stage.format) {
      case Tournament.TOURNAMENT_FORMATS.SINGLE_ELIMINATION:
        await this._generateSingleEliminationBracket(tournament, stage);
        break;
      case Tournament.TOURNAMENT_FORMATS.DOUBLE_ELIMINATION:
        await this._generateDoubleEliminationBracket(tournament, stage);
        break;
      case Tournament.TOURNAMENT_FORMATS.ROUND_ROBIN:
        await this._generateRoundRobinBracket(tournament, stage);
        break;
      case Tournament.TOURNAMENT_FORMATS.SWISS:
        await this._generateSwissBracket(tournament, stage);
        break;
      default:
        throw new Error(`Formato di fase non supportato: ${stage.format}`);
    }
  }
  
  /**
   * Genera un bracket a eliminazione singola
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _generateSingleEliminationBracket(tournament, stage) {
    // Ottieni i partecipanti
    let participants;
    if (stage.order === 1) {
      // Prima fase: utilizza tutti i partecipanti del torneo
      participants = tournament.participants
        .filter(p => p.status === 'checked_in' || p.status === 'registered')
        .map(p => p.userId);
    } else {
      // Fasi successive: utilizza i qualificati dalla fase precedente
      const previousStage = tournament.stages.find(s => s.order === stage.order - 1);
      participants = await this._calculateQualifiers(tournament, previousStage);
    }
    
    // Mescola i partecipanti
    participants = this._shuffleArray(participants);
    
    // Calcola il numero di partite necessarie
    const numParticipants = participants.length;
    const numByes = this._getNextPowerOfTwo(numParticipants) - numParticipants;
    const numFirstRoundMatches = Math.floor(numParticipants / 2);
    
    // Crea le partite del primo round
    const matches = [];
    let matchNumber = 1;
    
    for (let i = 0; i < numFirstRoundMatches; i++) {
      const match = {
        round: 1,
        matchNumber: matchNumber++,
        stage: stage._id,
        participants: [participants[i * 2], participants[i * 2 + 1]],
        scores: [0, 0],
        status: 'pending',
        scheduledTime: stage.startDate
      };
      
      matches.push(match);
    }
    
    // Gestisci i bye (partecipanti che passano automaticamente al round successivo)
    let byeIndex = numParticipants - numByes;
    let currentRound = 1;
    let matchesInCurrentRound = numFirstRoundMatches;
    let matchesInNextRound = Math.ceil(matchesInCurrentRound / 2);
    
    while (matchesInNextRound > 0) {
      currentRound++;
      
      for (let i = 0; i < matchesInNextRound; i++) {
        const match = {
          round: currentRound,
          matchNumber: matchNumber++,
          stage: stage._id,
          participants: [],
          scores: [0, 0],
          status: 'pending',
          scheduledTime: null,
          previousMatches: []
        };
        
        // Collega le partite precedenti
        if (currentRound === 2 && i < numByes) {
          // Partita con bye
          match.participants.push(participants[byeIndex++]);
          match.previousMatches.push(null);
        } else {
          match.previousMatches.push(null);
        }
        
        match.previousMatches.push(null);
        
        matches.push(match);
      }
      
      matchesInCurrentRound = matchesInNextRound;
      matchesInNextRound = Math.ceil(matchesInCurrentRound / 2);
    }
    
    // Collega le partite
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      if (match.round > 1) {
        const previousRoundMatches = matches.filter(m => m.round === match.round - 1);
        const startIndex = (match.matchNumber - 1) * 2 - previousRoundMatches[0].matchNumber + 1;
        
        if (startIndex >= 0 && startIndex < previousRoundMatches.length) {
          match.previousMatches[0] = previousRoundMatches[startIndex]._id;
          previousRoundMatches[startIndex].nextMatchId = match._id;
        }
        
        if (startIndex + 1 >= 0 && startIndex + 1 < previousRoundMatches.length) {
          match.previousMatches[1] = previousRoundMatches[startIndex + 1]._id;
          previousRoundMatches[startIndex + 1].nextMatchId = match._id;
        }
      }
    }
    
    // Aggiungi le partite alla fase
    stage.matches = matches;
  }
  
  /**
   * Genera un bracket a eliminazione doppia
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _generateDoubleEliminationBracket(tournament, stage) {
    // Implementazione del bracket a eliminazione doppia
    // Simile a _generateSingleEliminationBracket ma con un bracket dei perdenti
    // ...
  }
  
  /**
   * Genera un bracket round robin
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _generateRoundRobinBracket(tournament, stage) {
    // Implementazione del bracket round robin
    // Ogni partecipante gioca contro tutti gli altri
    // ...
  }
  
  /**
   * Genera un bracket swiss
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _generateSwissBracket(tournament, stage) {
    // Implementazione del bracket swiss
    // I partecipanti giocano contro avversari con punteggio simile
    // ...
  }
  
  /**
   * Calcola i qualificati per la fase successiva
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @returns {Array} Array di ID dei partecipanti qualificati
   * @private
   */
  async _calculateQualifiers(tournament, stage) {
    const qualifiers = [];
    
    // Implementazione specifica per ogni formato di fase
    switch (stage.format) {
      case Tournament.TOURNAMENT_FORMATS.SINGLE_ELIMINATION:
        // Per l'eliminazione singola, i qualificati sono i vincitori delle partite dell'ultimo round
        const lastRound = Math.max(...stage.matches.map(m => m.round));
        const lastRoundMatches = stage.matches.filter(m => m.round === lastRound);
        
        // Se c'è solo una partita nell'ultimo round (la finale), prendi anche i finalisti
        if (lastRoundMatches.length === 1 && stage.qualificationCount > 1) {
          // Il vincitore della finale
          if (lastRoundMatches[0].winner) {
            qualifiers.push(lastRoundMatches[0].winner);
          }
          
          // Il secondo classificato (perdente della finale)
          const finalist = lastRoundMatches[0].participants.find(p => p.toString() !== lastRoundMatches[0].winner.toString());
          if (finalist) {
            qualifiers.push(finalist);
          }
          
          // Se servono più qualificati, prendi i semifinalisti
          if (stage.qualificationCount > 2) {
            const semifinalMatches = stage.matches.filter(m => m.round === lastRound - 1);
            for (const match of semifinalMatches) {
              const semifinalist = match.participants.find(p => !qualifiers.includes(p.toString()));
              if (semifinalist && qualifiers.length < stage.qualificationCount) {
                qualifiers.push(semifinalist);
              }
            }
          }
        } else {
          // Prendi i vincitori di tutte le partite dell'ultimo round
          for (const match of lastRoundMatches) {
            if (match.winner && qualifiers.length < stage.qualificationCount) {
              qualifiers.push(match.winner);
            }
          }
        }
        break;
        
      case Tournament.TOURNAMENT_FORMATS.DOUBLE_ELIMINATION:
        // Per l'eliminazione doppia, i qualificati sono i vincitori del bracket principale e dei perdenti
        // ...
        break;
        
      case Tournament.TOURNAMENT_FORMATS.ROUND_ROBIN:
        // Per il round robin, i qualificati sono i partecipanti con il punteggio più alto
        // ...
        break;
        
      case Tournament.TOURNAMENT_FORMATS.SWISS:
        // Per lo swiss, i qualificati sono i partecipanti con il punteggio più alto
        // ...
        break;
    }
    
    return qualifiers.slice(0, stage.qualificationCount);
  }
  
  /**
   * Avanza i qualificati alla fase successiva
   * @param {Tournament} tournament - Torneo
   * @param {Object} stage - Fase del torneo
   * @private
   */
  async _advanceQualifiers(tournament, stage) {
    // Ottieni la fase precedente
    const previousStage = tournament.stages.find(s => s.order === stage.order - 1);
    
    // Calcola i qualificati dalla fase precedente
    const qualifiers = await this._calculateQualifiers(tournament, previousStage);
    
    // Genera il bracket per la nuova fase utilizzando i qualificati
    // ...
  }
  
  /**
   * Mescola un array
   * @param {Array} array - Array da mescolare
   * @returns {Array} Array mescolato
   * @private
   */
  _shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
  
  /**
   * Ottiene la prossima potenza di 2
   * @param {Number} n - Numero
   * @returns {Number} Prossima potenza di 2
   * @private
   */
  _getNextPowerOfTwo(n) {
    if (n <= 0) return 1;
    n--;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    return n + 1;
  }
}

module.exports = new MultiStageController();
