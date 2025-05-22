/**
 * EventController.js - Controller per la gestione degli eventi personalizzati
 * 
 * Questo controller gestisce tutte le operazioni relative agli eventi personalizzati,
 * inclusa la creazione, la gestione delle ricompense e l'assegnazione ai partecipanti.
 */

const Tournament = require('../models/Tournament');
const { EventReward, UserReward } = require('../models/EventReward');
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');
const Admin = require('../models/Admin');
const config = require('../config');
const { generateSlug, validateTournamentData } = require('../utils/tournamentUtils');

/**
 * Controller per la gestione degli eventi personalizzati
 */
class EventController {
  /**
   * Crea un nuovo evento
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const eventData = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono creare eventi.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.CREATE_EVENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Valida i dati dell'evento
      if (!eventData.name || !eventData.startDate || !eventData.eventType) {
        return res.status(400).json({ 
          success: false, 
          message: 'Dati dell\'evento non validi. Nome, data di inizio e tipo di evento sono obbligatori.' 
        });
      }
      
      // Genera uno slug unico
      const slug = await generateSlug(eventData.name);
      
      // Prepara i dati del torneo
      const tournamentData = {
        name: eventData.name,
        description: eventData.description,
        slug,
        format: eventData.format || Tournament.TOURNAMENT_FORMATS.SINGLE_ELIMINATION,
        mode: eventData.mode || Tournament.GAME_MODES.ONE_VS_ONE,
        type: Tournament.TOURNAMENT_TYPES.EVENT,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        createdBy: userId,
        isEvent: true,
        eventType: eventData.eventType,
        eventDetails: {
          startDate: eventData.startDate,
          endDate: eventData.endDate,
          recurrence: eventData.recurrence,
          theme: eventData.theme,
          specialRules: eventData.specialRules
        },
        visibility: eventData.visibility || 'public'
      };
      
      // Crea il torneo/evento
      const tournament = new Tournament(tournamentData);
      
      // Genera un codice di invito se l'evento è privato
      if (tournament.visibility === 'private') {
        tournament.generateInviteCode();
      }
      
      await tournament.save();
      
      // Crea le ricompense dell'evento se specificate
      if (eventData.rewards && Array.isArray(eventData.rewards) && eventData.rewards.length > 0) {
        const rewardPromises = eventData.rewards.map(rewardData => {
          const reward = new EventReward({
            name: rewardData.name,
            description: rewardData.description,
            type: rewardData.type,
            value: rewardData.value,
            imageUrl: rewardData.imageUrl,
            rarity: rewardData.rarity || 'common',
            eventId: tournament._id,
            tournamentId: tournament._id,
            requirements: rewardData.requirements || {},
            expiresAt: rewardData.expiresAt,
            createdBy: userId
          });
          
          return reward.save();
        });
        
        await Promise.all(rewardPromises);
      }
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'create_event',
        target: { type: 'tournament', id: tournament._id },
        details: { name: tournament.name, type: tournament.eventType },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(201).json({
        success: true,
        message: 'Evento creato con successo.',
        event: {
          id: tournament._id,
          name: tournament.name,
          slug: tournament.slug,
          eventType: tournament.eventType,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          inviteCode: tournament.inviteCode
        }
      });
    } catch (error) {
      console.error('Errore durante la creazione dell\'evento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante la creazione dell\'evento.' 
      });
    }
  }
  
  /**
   * Ottiene i dettagli di un evento
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getEventDetails(req, res) {
    try {
      const { slug } = req.params;
      
      // Ottieni il torneo/evento
      const tournament = await Tournament.findOne({ 
        slug, 
        isEvent: true 
      })
      .populate('createdBy', 'nickname avatar')
      .populate('participants.userId', 'nickname avatar');
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Evento non trovato.' 
        });
      }
      
      // Ottieni le ricompense dell'evento
      const rewards = await EventReward.find({ eventId: tournament._id });
      
      // Verifica se l'evento è privato
      if (tournament.visibility === 'private') {
        // Se l'utente non è autenticato, verifica il codice di invito
        if (!req.user && !req.query.inviteCode) {
          return res.status(403).json({ 
            success: false, 
            message: 'Questo evento è privato. È richiesto un codice di invito.' 
          });
        }
        
        // Se l'utente non è il creatore o un amministratore, verifica il codice di invito
        if (req.user && 
            tournament.createdBy._id.toString() !== req.user.id && 
            !await Admin.isAdmin(req.user.id) && 
            req.query.inviteCode !== tournament.inviteCode) {
          return res.status(403).json({ 
            success: false, 
            message: 'Questo evento è privato. È richiesto un codice di invito valido.' 
          });
        }
      }
      
      // Determina se l'utente è registrato all'evento
      let isRegistered = false;
      if (req.user) {
        isRegistered = tournament.isUserRegistered(req.user.id);
      }
      
      // Determina se l'utente può modificare l'evento
      let canEdit = false;
      if (req.user) {
        canEdit = await Admin.isAdmin(req.user.id) && 
                 await Admin.hasPermission(req.user.id, Admin.PERMISSIONS.EDIT_EVENTS);
      }
      
      return res.status(200).json({
        success: true,
        event: {
          ...tournament.toObject(),
          rewards,
          isRegistered,
          canEdit,
          // Rimuovi informazioni sensibili
          password: undefined,
          inviteCode: canEdit ? tournament.inviteCode : undefined
        }
      });
    } catch (error) {
      console.error('Errore durante il recupero dei dettagli dell\'evento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero dei dettagli dell\'evento.' 
      });
    }
  }
  
  /**
   * Aggiorna un evento esistente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async updateEvent(req, res) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;
      const eventData = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono modificare eventi.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(userId, Admin.PERMISSIONS.EDIT_EVENTS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Ottieni il torneo/evento
      const tournament = await Tournament.findOne({ slug, isEvent: true });
      
      if (!tournament) {
        return res.status(404).json({ 
          success: false, 
          message: 'Evento non trovato.' 
        });
      }
      
      // Verifica lo stato dell'evento
      if (tournament.status !== Tournament.TOURNAMENT_STATUS.DRAFT && 
          tournament.status !== Tournament.TOURNAMENT_STATUS.REGISTRATION) {
        return res.status(400).json({ 
          success: false, 
          message: 'Non è possibile modificare un evento che è già iniziato o completato.' 
        });
      }
      
      // Aggiorna i campi dell'evento
      const updatableFields = [
        'name', 'description', 'format', 'mode', 'visibility',
        'registrationOpen', 'registrationClose', 'startDate', 'endDate',
        'checkInRequired', 'checkInStart', 'checkInEnd',
        'maxParticipants', 'minParticipants', 'rules'
      ];
      
      updatableFields.forEach(field => {
        if (eventData[field] !== undefined) {
          tournament[field] = eventData[field];
        }
      });
      
      // Aggiorna i dettagli specifici dell'evento
      if (eventData.eventDetails) {
        tournament.eventDetails = {
          ...tournament.eventDetails,
          ...eventData.eventDetails
        };
      }
      
      // Se il nome è cambiato, aggiorna lo slug
      if (eventData.name && eventData.name !== tournament.name) {
        tournament.slug = await generateSlug(eventData.name);
      }
      
      await tournament.save();
      
      // Aggiorna le ricompense se specificate
      if (eventData.rewards && Array.isArray(eventData.rewards)) {
        // Rimuovi le ricompense esistenti
        await EventReward.deleteMany({ eventId: tournament._id });
        
        // Crea le nuove ricompense
        if (eventData.rewards.length > 0) {
          const rewardPromises = eventData.rewards.map(rewardData => {
            const reward = new EventReward({
              name: rewardData.name,
              description: rewardData.description,
              type: rewardData.type,
              value: rewardData.value,
              imageUrl: rewardData.imageUrl,
              rarity: rewardData.rarity || 'common',
              eventId: tournament._id,
              tournamentId: tournament._id,
              requirements: rewardData.requirements || {},
              expiresAt: rewardData.expiresAt,
              createdBy: userId
            });
            
            return reward.save();
          });
          
          await Promise.all(rewardPromises);
        }
      }
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(userId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'update_event',
        target: { type: 'tournament', id: tournament._id },
        details: { name: tournament.name, fields: Object.keys(eventData) },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Evento aggiornato con successo.',
        event: {
          id: tournament._id,
          name: tournament.name,
          slug: tournament.slug,
          eventType: tournament.eventType,
          startDate: tournament.startDate,
          endDate: tournament.endDate
        }
      });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dell\'evento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'aggiornamento dell\'evento.' 
      });
    }
  }
  
  /**
   * Assegna una ricompensa a un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async assignReward(req, res) {
    try {
      const adminId = req.user.id;
      const { rewardId, userId, position, achievement } = req.body;
      
      // Verifica i permessi
      const isAdmin = await Admin.isAdmin(adminId);
      if (!isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Solo gli amministratori possono assegnare ricompense.' 
        });
      }
      
      const hasPermission = await Admin.hasPermission(adminId, Admin.PERMISSIONS.ASSIGN_REWARDS);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accesso negato. Non hai i permessi necessari.' 
        });
      }
      
      // Verifica che la ricompensa esista
      const reward = await EventReward.findById(rewardId);
      if (!reward) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ricompensa non trovata.' 
        });
      }
      
      // Verifica che l'utente esista
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utente non trovato.' 
        });
      }
      
      // Verifica se l'utente ha già ricevuto questa ricompensa
      const existingReward = await UserReward.findOne({ userId, rewardId });
      if (existingReward) {
        return res.status(400).json({ 
          success: false, 
          message: 'L\'utente ha già ricevuto questa ricompensa.' 
        });
      }
      
      // Crea l'assegnazione della ricompensa
      const userReward = new UserReward({
        userId,
        rewardId,
        eventId: reward.eventId,
        tournamentId: reward.tournamentId,
        position,
        achievement,
        metadata: req.body.metadata || {}
      });
      
      await userReward.save();
      
      // Registra l'azione amministrativa
      const admin = await Admin.findByUserId(adminId);
      await AdminLog.create({
        adminId: admin._id,
        action: 'assign_reward',
        target: { type: 'user', id: userId },
        details: { 
          rewardId: reward._id, 
          rewardName: reward.name,
          eventId: reward.eventId,
          position,
          achievement
        },
        result: { success: true },
        ipAddress: req.ip
      });
      
      return res.status(200).json({
        success: true,
        message: 'Ricompensa assegnata con successo.',
        userReward: {
          id: userReward._id,
          userId,
          rewardId,
          eventId: reward.eventId,
          tournamentId: reward.tournamentId,
          awardedAt: userReward.awardedAt,
          position,
          achievement
        }
      });
    } catch (error) {
      console.error('Errore durante l\'assegnazione della ricompensa:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante l\'assegnazione della ricompensa.' 
      });
    }
  }
  
  /**
   * Ottiene le ricompense di un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getUserRewards(req, res) {
    try {
      const { userId } = req.params;
      
      // Verifica che l'utente esista
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'Utente non trovato.' 
        });
      }
      
      // Ottieni le ricompense dell'utente
      const userRewards = await UserReward.find({ userId })
        .populate('rewardId')
        .populate('eventId', 'name slug')
        .populate('tournamentId', 'name slug')
        .sort({ awardedAt: -1 });
      
      return res.status(200).json({
        success: true,
        userRewards
      });
    } catch (error) {
      console.error('Errore durante il recupero delle ricompense dell\'utente:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero delle ricompense dell\'utente.' 
      });
    }
  }
  
  /**
   * Ottiene gli eventi attivi
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getActiveEvents(req, res) {
    try {
      const now = new Date();
      
      // Ottieni gli eventi attivi
      const activeEvents = await Tournament.find({
        isEvent: true,
        startDate: { $lte: now },
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }
        ],
        status: { $in: [Tournament.TOURNAMENT_STATUS.REGISTRATION, Tournament.TOURNAMENT_STATUS.UPCOMING, Tournament.TOURNAMENT_STATUS.ACTIVE] },
        visibility: 'public'
      })
      .select('name slug eventType startDate endDate eventDetails')
      .sort({ startDate: 1 });
      
      // Ottieni gli eventi imminenti
      const upcomingEvents = await Tournament.find({
        isEvent: true,
        startDate: { $gt: now },
        status: { $in: [Tournament.TOURNAMENT_STATUS.REGISTRATION, Tournament.TOURNAMENT_STATUS.UPCOMING] },
        visibility: 'public'
      })
      .select('name slug eventType startDate endDate eventDetails')
      .sort({ startDate: 1 })
      .limit(5);
      
      return res.status(200).json({
        success: true,
        activeEvents,
        upcomingEvents
      });
    } catch (error) {
      console.error('Errore durante il recupero degli eventi attivi:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Errore durante il recupero degli eventi attivi.' 
      });
    }
  }
}

module.exports = new EventController();
