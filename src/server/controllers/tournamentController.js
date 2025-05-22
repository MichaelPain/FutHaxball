/**
 * TournamentController.js - Controller per la gestione dei tornei
 * 
 * Questo controller gestisce tutte le operazioni relative ai tornei,
 * inclusa la creazione, la gestione dei partecipanti, il bracket e i risultati.
 */

const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Admin = require('../models/Admin');
const AuditLogService = require('../services/AuditLogService');
const config = require('../config');
const { generateSlug, validateTournamentData, validateRegistrationData } = require('../utils/tournamentUtils');
const geoip = require('geoip-lite');
const { ROLES, PERMISSIONS, checkPermission } = require('./adminController');
const { AppError, ValidationError, NotFoundError, AuthorizationError, ConflictError } = require('../middleware/errorHandler');

/**
 * Controller per la gestione dei tornei
 */
class TournamentController {
  /**
   * Crea un nuovo torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async createTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const tournamentData = req.body;
      
      // Permission check (assuming this route is protected by checkPermission(PERMISSIONS.MANAGE_TOURNAMENTS))
      // For now, a simplified check, enhance with proper admin role check if needed for non-admin creators
      const adminUser = await Admin.findOne({ userId });
      if (!adminUser || !ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)) {
        // If not an admin with permission, check if regular users are allowed to create certain tournament types
        // This part of logic would depend on your application rules (e.g. only 'casual' type)
        // For now, restrict to admins with MANAGE_TOURNAMENTS perm
         await AuditLogService.logAction(userId, 'CREATE_TOURNAMENT_DENIED', {
          details: 'User does not have MANAGE_TOURNAMENTS permission.',
          ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('You do not have permission to create tournaments.'));
      }
      
      const validationResult = validateTournamentData(tournamentData);
      if (!validationResult.isValid) {
        const valError = new ValidationError('Tournament data validation failed.');
        validationResult.errors.forEach(err => valError.addError(err.field, err.message));
        return next(valError);
      }
      
      const slug = await generateSlug(tournamentData.name);
      
      const tournament = new Tournament({
        ...tournamentData,
        slug,
        createdBy: userId,
        status: Tournament.TOURNAMENT_STATUS.DRAFT // Default to draft
      });
      
      if (tournament.visibility === 'private') {
        tournament.generateInviteCode();
      }
      
      await tournament.save();
      
      await AuditLogService.logAction(userId, 'CREATE_TOURNAMENT', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { name: tournament.name, type: tournament.type, slug: tournament.slug },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(201).json({
        success: true,
        message: 'Tournament created successfully.',
        tournament: tournament.toObject() // Send full object initially
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'CREATE_TOURNAMENT_ERROR', {
        details: error.message, data: req.body, ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error); // Pass to global error handler
    }
  }
  
  /**
   * Ottiene i dettagli di un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getTournamentDetails(req, res, next) {
    try {
      const { slug } = req.params;
      const tournament = await Tournament.findBySlug(slug)
        .populate('createdBy', 'nickname avatar')
        .populate('participants.userId', 'nickname avatar')
        .populate('teams.members', 'nickname avatar')
        .populate('teams.captain', 'nickname avatar');
      
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }
      
      let canView = tournament.visibility !== 'private';
      let canEdit = false;
      let isRegistered = false;

      if (req.user) {
        const userId = req.user.id;
        if (tournament.createdBy._id.toString() === userId) canView = true;
        
        const adminUser = await Admin.findOne({ userId });
        if(adminUser && ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)){
            canView = true;
            canEdit = true; // Admins with permission can edit
        } else if (tournament.createdBy._id.toString() === userId) {
            canEdit = true; // Creator can edit (depending on tournament status)
        }

        if(tournament.visibility === 'private' && !canView){
             if (req.query.inviteCode === tournament.inviteCode) {
                canView = true;
            } else {
                 await AuditLogService.logAction(userId, 'VIEW_PRIVATE_TOURNAMENT_DENIED', {
                    targetType: 'Tournament', targetId: tournament._id.toString(), details: 'Missing or invalid invite code.',
                    ipAddress: req.ip, userAgent: req.headers['user-agent']
                });
                return next(new AuthorizationError('This tournament is private. A valid invite code is required.'));
            }
        }
        isRegistered = tournament.isUserRegistered(userId);
      } else if (tournament.visibility === 'private') {
         if (req.query.inviteCode === tournament.inviteCode) {
            canView = true;
        } else {
            return next(new AuthorizationError('This tournament is private. A valid invite code is required to view.'));
        }
      }

      if (!canView) { // Should ideally not be reached if logic above is correct
        return next(new AuthorizationError('You do not have permission to view this tournament.'));
      }

      // Determine if current user can edit based on status and role/ownership
      if (canEdit && ![Tournament.TOURNAMENT_STATUS.DRAFT, Tournament.TOURNAMENT_STATUS.REGISTRATION].includes(tournament.status)) {
          canEdit = false; // Cannot edit if tournament is active, completed, or cancelled
      }
      
      await AuditLogService.logAction(req.user?.id || 'anonymous', 'VIEW_TOURNAMENT_DETAILS', {
        targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        tournament: {
          ...tournament.toObject(),
          isRegistered,
          canEdit,
          inviteCode: canEdit || (req.user && tournament.createdBy._id.toString() === req.user.id) ? tournament.inviteCode : undefined,
          password: undefined // Always hide password
        }
      });
    } catch (error) {
      console.error('Error fetching tournament details:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'VIEW_TOURNAMENT_DETAILS_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Aggiorna un torneo esistente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async updateTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;
      const tournamentData = req.body;
      
      const tournament = await Tournament.findBySlug(slug);
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }
      
      // Permission check: User must be creator or an Admin with MANAGE_TOURNAMENTS permission
      const adminUser = await Admin.findOne({ userId });
      const isCreator = tournament.createdBy.toString() === userId;
      let canManage = false;
      if(adminUser && ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)) {
          canManage = true;
      }

      if (!isCreator && !canManage) {
        await AuditLogService.logAction(userId, 'UPDATE_TOURNAMENT_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), details: 'User is not creator or authorized admin.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('You do not have permission to update this tournament.'));
      }
      
      // Check tournament status: Only DRAFT or REGISTRATION can be fully updated.
      // Some fields might be updatable later (e.g. description, streamUrl) - requires more granular logic
      if (![Tournament.TOURNAMENT_STATUS.DRAFT, Tournament.TOURNAMENT_STATUS.REGISTRATION].includes(tournament.status)) {
        return next(new AppError('Cannot update tournament that is not in draft or registration phase.', 400));
      }
      
      const validationResult = validateTournamentData(tournamentData, true);
      if (!validationResult.isValid) {
        const valError = new ValidationError('Tournament data validation failed.');
        validationResult.errors.forEach(err => valError.addError(err.field, err.message));
        return next(valError);
      }
      
      const oldTournamentData = { ...tournament.toObject() };

      // Apply updates
      const updatableFields = [
        'name', 'description', 'format', 'mode', 'type', 'visibility',
        'registrationOpen', 'registrationClose', 'startDate', 'endDate',
        'checkInRequired', 'checkInStart', 'checkInEnd',
        'maxParticipants', 'minParticipants', 'rules', 'prizes',
        'mmrImpact', 'geoLocation', 'password', 'streamUrl',
        'discordUrl', 'tags', 'banner', 'logo', 'status' // Allow status changes if permitted
      ];
      
      Object.keys(tournamentData).forEach(field => {
        if (updatableFields.includes(field)) {
          // Special handling for name change to update slug if it's different
          if (field === 'name' && tournamentData.name !== tournament.name) {
            tournament.name = tournamentData.name;
            // Regenerate slug only if name changes. This might need more complex logic
            // if slugs must be absolutely unique even after name changes of other tournaments.
            // For simplicity, only update if the new name makes a different slug than current.
            // generateSlug will ensure uniqueness if it collides.
            // This is a simplification. True slug management on update is complex.
          } else {
            tournament[field] = tournamentData[field];
          }
        }
      });

      // If name changed, slug might need an update. This is a tricky part.
      // If the new name would generate a different base slug, update it.
      // This is a simplified approach.
      if (tournamentData.name && tournamentData.name !== oldTournamentData.name) {
          const newSlugCandidate = tournamentData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
          const oldSlugBase = oldTournamentData.slug.replace(/-\d+$/, ''); // remove numeric suffix if any
          if (newSlugCandidate !== oldSlugBase) {
              tournament.slug = await generateSlug(tournamentData.name);
          }
      }

      // Handle invite code for private tournaments
      if (tournament.visibility === 'private' && !tournament.inviteCode) {
        tournament.generateInviteCode();
      } else if (tournament.visibility !== 'private') {
        tournament.inviteCode = undefined;
      }
      
      await tournament.save();
      const newTournamentData = tournament.toObject();

      await AuditLogService.logAction(userId, 'UPDATE_TOURNAMENT', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { oldData: oldTournamentData, newData: newTournamentData, changes: tournamentData },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        message: 'Tournament updated successfully.',
        tournament: newTournamentData
      });
    } catch (error) {
      console.error('Error updating tournament:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UPDATE_TOURNAMENT_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message, data: req.body,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Elimina un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async deleteTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;

      const tournament = await Tournament.findBySlug(slug);
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }

      // Permission check: User must be creator or an Admin with MANAGE_TOURNAMENTS permission
      const adminUser = await Admin.findOne({ userId });
      const isCreator = tournament.createdBy.toString() === userId;
      let canManage = false;
      if(adminUser && ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)) {
          canManage = true;
      }

      if (!isCreator && !canManage) {
        await AuditLogService.logAction(userId, 'DELETE_TOURNAMENT_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), details: 'User is not creator or authorized admin.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('You do not have permission to delete this tournament.'));
      }

      // It's generally safer to not allow deletion of tournaments that have started or have participants,
      // unless it's a specific admin override. Consider a 'cancel' or 'archive' status instead.
      // For this example, we'll allow deletion of DRAFT or CANCELLED tournaments.
      if (![Tournament.TOURNAMENT_STATUS.DRAFT, Tournament.TOURNAMENT_STATUS.CANCELLED, Tournament.TOURNAMENT_STATUS.REGISTRATION].includes(tournament.status) && !canManage) {
         return next(new AppError('Cannot delete a tournament that is active, upcoming or completed. Only admins can delete such tournaments if necessary, prefer cancelling.', 400));
      } 
      // Admins with full manage permission might be allowed to delete even active ones, but this is risky.
      // Add a specific check if canManage and status is problematic.
      if (canManage && ![Tournament.TOURNAMENT_STATUS.DRAFT, Tournament.TOURNAMENT_STATUS.CANCELLED, Tournament.TOURNAMENT_STATUS.REGISTRATION].includes(tournament.status)) {
          // Log this carefully if an admin is deleting an active/completed tournament
          await AuditLogService.logAction(userId, 'DELETE_ACTIVE_TOURNAMENT_BY_ADMIN', {
            targetType: 'Tournament', targetId: tournament._id.toString(), details: `Admin deleting a tournament with status: ${tournament.status}`,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
          });
      }

      const deletedTournamentName = tournament.name;
      const deletedTournamentId = tournament._id.toString();

      await tournament.deleteOne(); // Changed from remove() to deleteOne()

      await AuditLogService.logAction(userId, 'DELETE_TOURNAMENT', {
        targetType: 'Tournament',
        targetId: deletedTournamentId, // Log the ID as targetId is a string here
        details: { name: deletedTournamentName, slug: slug },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({ 
        success: true, 
        message: `Tournament '${deletedTournamentName}' deleted successfully.` 
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'DELETE_TOURNAMENT_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Registra un utente a un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async registerToTournament(req, res, next) {
    try {
      const userId = req.user.id; // Assumes user is authenticated
      const { slug } = req.params;
      const { teamId, password } = req.body; // Optional: teamId for team tournaments, password for protected ones

      const tournament = await Tournament.findBySlug(slug);
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }

      // Check if registration is open
      const now = new Date();
      if (tournament.status !== Tournament.TOURNAMENT_STATUS.REGISTRATION) {
          return next(new AppError('Tournament registration is not currently open.', 400));
      }
      if (tournament.registrationOpen && now < new Date(tournament.registrationOpen)) {
          return next(new AppError(`Tournament registration opens at ${tournament.registrationOpen}.`, 400));
      }
      if (tournament.registrationClose && now > new Date(tournament.registrationClose)) {
          return next(new AppError('Tournament registration has closed.', 400));
      }

      // Check for tournament password if required
      if (tournament.password && tournament.password !== password) {
        await AuditLogService.logAction(userId, 'TOURNAMENT_REGISTRATION_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), details: 'Invalid tournament password provided.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('Invalid password for tournament registration.'));
      }

      // Check if user is already registered
      if (tournament.isUserRegistered(userId)) {
        return next(new ConflictError('You are already registered for this tournament.'));
      }

      // Check for max participants
      if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants) {
        return next(new AppError('Tournament has reached its maximum number of participants.', 400));
      }
      
      // TODO: Add validation for teamId if it's a team-based tournament and teamId is provided
      // e.g., check if team exists, if user is part of the team, if team fits tournament mode, etc.

      const registrationResult = await tournament.registerUser(userId, teamId);
      if (!registrationResult.success) {
          // The model method should ideally throw specific errors or return detailed failure reasons
          return next(new AppError(registrationResult.message || 'Failed to register for tournament.', 500));
      }

      await tournament.save(); // Save changes to participant list

      await AuditLogService.logAction(userId, 'REGISTER_TOURNAMENT', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { slug: tournament.slug, teamId: teamId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Successfully registered for the tournament.',
        registrationDetails: registrationResult.participant // Send back participant details
      });
    } catch (error) {
      console.error('Error registering for tournament:', error);
       // Check for Mongoose duplicate key error if registration attempts to create duplicate participant entry
      if (error.code === 11000) { // MongoDB duplicate key error
        return next(new ConflictError('Registration conflict. You might already be registered or there was a unique constraint violation.'));
      }
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'REGISTER_TOURNAMENT_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message, data: req.body,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Annulla la registrazione di un utente a un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async unregisterFromTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;
      
      const tournament = await Tournament.findBySlug(slug);
      
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }
      
      if (!tournament.isUserRegistered(userId)) {
        return next(new AppError('You are not registered for this tournament.', 400));
      }
      
      // Check if the tournament is still in a phase where unregistration is allowed
      if (![Tournament.TOURNAMENT_STATUS.REGISTRATION, Tournament.TOURNAMENT_STATUS.UPCOMING].includes(tournament.status)) {
        await AuditLogService.logAction(userId, 'UNREGISTER_TOURNAMENT_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: `Attempted to unregister from tournament in status: ${tournament.status}`,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError('Unregistration is not allowed for tournaments that are active, completed, or cancelled.', 400));
      }
      
      const unregistrationResult = await tournament.unregisterUser(userId); // Assuming this method exists and might return info
      if (!unregistrationResult || (typeof unregistrationResult === 'object' && !unregistrationResult.success && unregistrationResult.success !== undefined)) { // check for explicit failure
          // If unregisterUser can fail and returns a reason:
          const message = unregistrationResult?.message || 'Failed to unregister from tournament due to an unknown reason.';
          await AuditLogService.logAction(userId, 'UNREGISTER_TOURNAMENT_FAILED', {
              targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
              details: message,
              ipAddress: req.ip, userAgent: req.headers['user-agent']
          });
          return next(new AppError(message, 500)); // Or appropriate status code
      }
      await tournament.save();
      
      await AuditLogService.logAction(userId, 'UNREGISTER_TOURNAMENT', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { slug: tournament.slug },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Successfully unregistered from the tournament.'
      });
    } catch (error) {
      console.error('Error unregistering from tournament:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UNREGISTER_TOURNAMENT_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Effettua il check-in per un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async checkInToTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;
      
      const tournament = await Tournament.findBySlug(slug);
      
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }
      
      if (!tournament.isUserRegistered(userId)) {
        await AuditLogService.logAction(userId, 'TOURNAMENT_CHECKIN_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: 'User not registered for the tournament.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError('You are not registered for this tournament.', 400));
      }
      
      if (!tournament.checkInRequired) {
         await AuditLogService.logAction(userId, 'TOURNAMENT_CHECKIN_NOT_REQUIRED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: 'Check-in attempted for a tournament that does not require it.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError('Check-in is not required for this tournament.', 400));
      }
      
      const now = new Date();
      if (!tournament.checkInStart || !tournament.checkInEnd || now < new Date(tournament.checkInStart) || now > new Date(tournament.checkInEnd)) {
        await AuditLogService.logAction(userId, 'TOURNAMENT_CHECKIN_WINDOW_CLOSED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: `Check-in window is not open. Current time: ${now}, Check-in start: ${tournament.checkInStart}, Check-in end: ${tournament.checkInEnd}`,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError('Tournament check-in is not currently open.', 400));
      }
      
      // Attempt to check-in user. Model method should handle logic like already checked-in.
      const checkInResult = await tournament.checkInUser(userId);
      if (!checkInResult || (typeof checkInResult === 'object' && !checkInResult.success && checkInResult.success !== undefined)){
          const message = checkInResult?.message || 'Failed to check-in for the tournament.';
          // Example: if checkInUser returns { success: false, message: 'Already checked in' }
          if (message.toLowerCase().includes('already checked in')) {
            return next(new ConflictError(message));
          }
          await AuditLogService.logAction(userId, 'TOURNAMENT_CHECKIN_FAILED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug, 
            details: message,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
          });
          return next(new AppError(message, 400)); // Or 500 if it's an unexpected model failure
      }

      await tournament.save(); // Save tournament state after check-in
      
      await AuditLogService.logAction(userId, 'TOURNAMENT_CHECKIN_SUCCESS', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { slug: tournament.slug },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Check-in completed successfully.'
        // Optionally return participant status: participant: checkInResult.participant
      });
    } catch (error) {
      console.error('Error during tournament check-in:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'TOURNAMENT_CHECKIN_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Avvia un torneo
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async startTournament(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug } = req.params;
      
      const tournament = await Tournament.findBySlug(slug);
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }
      
      // Permission Check: User must be creator or Admin with MANAGE_TOURNAMENTS
      const adminUser = await Admin.findOne({ userId });
      const isCreator = tournament.createdBy.toString() === userId;
      let canManage = false;
      if(adminUser && ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)) {
          canManage = true;
      }

      if (!isCreator && !canManage) {
        await AuditLogService.logAction(userId, 'START_TOURNAMENT_DENIED', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: 'User is not creator or authorized admin to start the tournament.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('You do not have permission to start this tournament.'));
      }
      
      // Check tournament status
      if (![Tournament.TOURNAMENT_STATUS.REGISTRATION, Tournament.TOURNAMENT_STATUS.UPCOMING].includes(tournament.status)) {
         await AuditLogService.logAction(userId, 'START_TOURNAMENT_INVALID_STATUS', {
            targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
            details: `Attempted to start tournament in status: ${tournament.status}`,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError('Tournament cannot be started in its current state. Must be in REGISTRATION or UPCOMING.', 400));
      }
      
      // Verify minimum participants if tournament is moving from REGISTRATION
      // If UPCOMING, assume participant check was done or it's being forced start by admin.
      if (tournament.status === Tournament.TOURNAMENT_STATUS.REGISTRATION) {
          const participantsToConsider = tournament.checkInRequired 
            ? tournament.participants.filter(p => p.status === 'checked_in') 
            : tournament.participants;
          
          if (participantsToConsider.length < tournament.minParticipants) {
            await AuditLogService.logAction(userId, 'START_TOURNAMENT_MIN_PARTICIPANTS_NOT_MET', {
                targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
                details: `Min participants: ${tournament.minParticipants}, Actual: ${participantsToConsider.length}`,
                ipAddress: req.ip, userAgent: req.headers['user-agent']
            });
            return next(new AppError(`Tournament requires at least ${tournament.minParticipants} ${tournament.checkInRequired ? 'checked-in ' : ''}participants to start. Currently ${participantsToConsider.length}.`, 400));
          }
      }
      
      // Update status and generate bracket if applicable
      // If status is already UPCOMING, an admin might be forcing a bracket regeneration or re-triggering logic.
      // If moving from REGISTRATION to UPCOMING, this is the primary start action.
      const previousStatus = tournament.status;
      tournament.status = Tournament.TOURNAMENT_STATUS.ACTIVE; // Typically goes to ACTIVE once started

      // Generate bracket logic: should typically happen when tournament becomes ACTIVE
      // The original logic had it generated if check-in was complete OR not required.
      // This should be tied to the actual start of the tournament (i.e., moving to ACTIVE status)
      // Let's assume generateBracket() also handles seeding, etc.
      if (tournament.matches.length === 0) { // Only generate if not already generated
          try {
              await tournament.generateBracket(); // Ensure this is an async method if it involves DB ops or complex logic
          } catch (bracketError) {
              tournament.status = previousStatus; // Revert status on error
              await AuditLogService.logAction(userId, 'START_TOURNAMENT_BRACKET_ERROR', {
                targetType: 'Tournament', targetId: tournament._id.toString(), slug: tournament.slug,
                details: `Bracket generation failed: ${bracketError.message}`,
                ipAddress: req.ip, userAgent: req.headers['user-agent']
              });
              return next(new AppError(`Failed to generate tournament bracket: ${bracketError.message}`, 500));
          }
      } else if (previousStatus === Tournament.TOURNAMENT_STATUS.UPCOMING && canManage) {
          // If admin is starting an UPCOMING tournament again, maybe allow bracket regeneration?
          // This is a policy decision. For now, let's assume we don't regenerate if matches exist.
      }
      
      await tournament.save();
      
      await AuditLogService.logAction(userId, 'START_TOURNAMENT_SUCCESS', {
        targetType: 'Tournament',
        targetId: tournament._id.toString(),
        details: { slug: tournament.slug, oldStatus: previousStatus, newStatus: tournament.status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        message: 'Tournament started successfully.',
        tournament: {
          _id: tournament._id, // Corrected from id to _id
          name: tournament.name,
          slug: tournament.slug,
          status: tournament.status
        }
      });
    } catch (error) {
      console.error('Error starting tournament:', error);
       await AuditLogService.logAction(req.user?.id || 'unknown_user', 'START_TOURNAMENT_ERROR', {
        targetType: 'Tournament', slug: req.params.slug, details: error.message,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Aggiorna il risultato di una partita
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async updateMatchResult(req, res, next) {
    try {
      const userId = req.user.id;
      const { slug, matchId } = req.params;
      const { scores, winnerId, status: newMatchStatus } = req.body; // status for manual override e.g. 'completed', 'cancelled'

      const tournament = await Tournament.findBySlug(slug);
      if (!tournament) {
        return next(new NotFoundError('Tournament not found.'));
      }

      // Permission Check
      const adminUser = await Admin.findOne({ userId });
      const isCreator = tournament.createdBy.toString() === userId;
      let canManage = false;
      if(adminUser && ROLE_PERMISSIONS[adminUser.role]?.includes(PERMISSIONS.MANAGE_TOURNAMENTS)) {
          canManage = true;
      }

      if (!isCreator && !canManage) {
        await AuditLogService.logAction(userId, 'UPDATE_MATCH_RESULT_DENIED', {
            targetType: 'Tournament', tournamentId: tournament._id.toString(), matchId,
            details: 'User is not creator or authorized admin.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('You do not have permission to update match results for this tournament.'));
      }

      if (tournament.status !== Tournament.TOURNAMENT_STATUS.ACTIVE) {
        return next(new AppError('Match results can only be updated for active tournaments.', 400));
      }

      const match = tournament.matches.id(matchId);
      if (!match) {
        return next(new NotFoundError('Match not found in this tournament.'));
      }

      // Validate inputs (basic example)
      if (scores && (!Array.isArray(scores) || scores.some(isNaN))) {
          return next(new ValidationError('Scores must be an array of numbers.'));
      }
      // More validation for winnerId against participants of the match, newMatchStatus against allowed values etc.

      const oldMatchData = { ...match.toObject() };

      // Call the model method to update the match result
      // This method should handle the logic of advancing players, updating scores, winner, status, etc.
      // It should throw an error if something goes wrong (e.g. invalid winnerId for the match participants)
      try {
        // Assuming updateMatchResult might take an object for more flexible updates
        await tournament.updateMatchResult(matchId, { scores, winnerId, status: newMatchStatus }); 
      } catch (modelError) {
         await AuditLogService.logAction(userId, 'UPDATE_MATCH_RESULT_MODEL_ERROR', {
            targetType: 'Match', targetId: matchId, tournamentId: tournament._id.toString(),
            details: `Model error: ${modelError.message}`,
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AppError(`Failed to update match result: ${modelError.message}`, 400)); // Or 500 if internal
      }
      
      await tournament.save(); // Save the tournament to persist match changes
      const updatedMatch = tournament.matches.id(matchId); // Fetch the updated match

      await AuditLogService.logAction(userId, 'UPDATE_MATCH_RESULT_SUCCESS', {
        targetType: 'Match',
        targetId: matchId,
        tournamentId: tournament._id.toString(),
        details: { slug: tournament.slug, oldData: oldMatchData, newData: updatedMatch.toObject(), inputs: req.body },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Match result updated successfully.',
        match: updatedMatch.toObject()
      });
    } catch (error) {
      console.error('Error updating match result:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UPDATE_MATCH_RESULT_ERROR', {
        targetType: 'Match', matchId: req.params.matchId, tournamentSlug: req.params.slug, 
        details: error.message, data: req.body,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i tornei attivi
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getActiveTournaments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = {
        status: { $in: [
          Tournament.TOURNAMENT_STATUS.REGISTRATION, 
          Tournament.TOURNAMENT_STATUS.UPCOMING, 
          Tournament.TOURNAMENT_STATUS.ACTIVE
        ]},
        visibility: 'public' // Only public tournaments for general listing
      };
      
      if (req.query.type && Object.values(Tournament.TOURNAMENT_TYPES).includes(req.query.type.toUpperCase())) {
        filter.type = req.query.type.toUpperCase();
      } else if (req.query.type) {
        // Optionally log or ignore invalid type query param
      }
      
      if (req.query.mode && Object.values(Tournament.TOURNAMENT_MODES).includes(req.query.mode.toUpperCase())) {
        filter.mode = req.query.mode.toUpperCase();
      } else if (req.query.mode) {
        // Optionally log or ignore invalid mode query param
      }
      
      // Basic country code validation (e.g., 2-letter ISO code)
      if (req.query.country && /^[A-Z]{2}$/i.test(req.query.country)) {
        filter.$or = [
          { 'geoLocation.type': 'country', 'geoLocation.countries': req.query.country.toUpperCase() },
          { 'geoLocation.type': 'continent' }, // Assuming continent might include this country
          { 'geoLocation.type': 'international' }
        ];
      } else if (req.query.country) {
        // Optionally log or ignore invalid country query param
      }
      
      const tournaments = await Tournament.find(filter)
        .select('name slug format mode type status startDate endDate participantsCount banner logo createdBy geoLocation') // participantsCount for overview
        .populate('createdBy', 'nickname avatar')
        .skip(skip)
        .limit(limit)
        .sort({ startDate: 1 })
        .lean(); // Use .lean() for faster queries when not modifying docs
      
      const total = await Tournament.countDocuments(filter);

      // No sensitive data exposed here, so audit logging might be light or focused on errors.
      // AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_ACTIVE_TOURNAMENTS', { ... });
      
      return res.status(200).json({
        success: true,
        tournaments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching active tournaments:', error);
      await AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_ACTIVE_TOURNAMENTS_ERROR', {
        details: error.message, query: req.query,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error); // Pass to global error handler
    }
  }
  
  /**
   * Ottiene i tornei creati da un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getUserTournaments(req, res, next) {
    try {
      const userId = req.user.id; // Requires authentication
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = { createdBy: userId };
      if (req.query.status) {
        // Optional: allow filtering by status if provided in query
        const statuses = req.query.status.split(',').map(s => s.trim().toUpperCase());
        // Validate statuses against Tournament.TOURNAMENT_STATUS if necessary
        filter.status = { $in: statuses };
      }

      const tournaments = await Tournament.find(filter)
        .select('name slug format mode type status startDate endDate participantsCount banner logo createdAt') // participantsCount
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      
      const total = await Tournament.countDocuments(filter);
      
      await AuditLogService.logAction(userId, 'GET_USER_TOURNAMENTS', {
        details: `Fetched page ${page} with limit ${limit}. Total: ${total}`,
        query: req.query,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        tournaments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching user tournaments:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'GET_USER_TOURNAMENTS_ERROR', {
        details: error.message, query: req.query,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i tornei a cui partecipa un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getParticipatingTournaments(req, res, next) {
    try {
      const userId = req.user.id; // Requires authentication
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = { 'participants.userId': userId };
      if (req.query.status) {
        const statuses = req.query.status.split(',').map(s => s.trim().toUpperCase());
        // Validate statuses against Tournament.TOURNAMENT_STATUS if necessary
        filter.status = { $in: statuses };
      }
      if (req.query.active) { // Convenience filter for ongoing/upcoming/registration
        filter.status = { $in: [
            Tournament.TOURNAMENT_STATUS.REGISTRATION, 
            Tournament.TOURNAMENT_STATUS.UPCOMING, 
            Tournament.TOURNAMENT_STATUS.ACTIVE
        ]};
      }

      const tournaments = await Tournament.find(filter)
        .select('name slug format mode type status startDate endDate participantsCount banner logo createdBy') // participantsCount
        .populate('createdBy', 'nickname avatar') // So user can see who created it
        .skip(skip)
        .limit(limit)
        .sort({ startDate: 1 }) // Sort by when they start
        .lean();
      
      const total = await Tournament.countDocuments(filter);
      
      await AuditLogService.logAction(userId, 'GET_PARTICIPATING_TOURNAMENTS', {
        details: `Fetched page ${page} with limit ${limit}. Total: ${total}`,
        query: req.query,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        tournaments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching participating tournaments:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'GET_PARTICIPATING_TOURNAMENTS_ERROR', {
        details: error.message, query: req.query,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i tornei per tipo (campionati, eventi, ecc.)
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getTournamentsByType(req, res, next) {
    try {
      const { type } = req.params;
      const normalizedType = type.toUpperCase();
      
      if (!Object.values(Tournament.TOURNAMENT_TYPES).includes(normalizedType)) {
        return next(new ValidationError('Invalid tournament type specified.', [{ field: 'type', message: 'Invalid tournament type' }]));
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = {
        type: normalizedType,
        visibility: 'public' // Only public tournaments
      };

      // Optional: Add other filters from query like mode, etc.
      if (req.query.mode && Object.values(Tournament.TOURNAMENT_MODES).includes(req.query.mode.toUpperCase())) {
        filter.mode = req.query.mode.toUpperCase();
      }

      const tournaments = await Tournament.find(filter)
        .select('name slug format mode type status startDate endDate participantsCount banner logo createdBy geoLocation')
        .populate('createdBy', 'nickname avatar')
        .skip(skip)
        .limit(limit)
        .sort({ startDate: -1 })
        .lean();
      
      const total = await Tournament.countDocuments(filter);

      // AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_TOURNAMENTS_BY_TYPE', { ... }); // Optional for success
      
      return res.status(200).json({
        success: true,
        tournaments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error(`Error fetching tournaments by type (${req.params.type}):`, error);
      await AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_TOURNAMENTS_BY_TYPE_ERROR', {
        details: error.message, type: req.params.type, query: req.query,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i tornei per geolocalizzazione
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   */
  async getTournamentsByLocation(req, res, next) {
    try {
      const { country } = req.params;
      const normalizedCountry = country.toUpperCase();

      // Basic validation for country code (e.g., 2-letter ISO code)
      if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
        return next(new ValidationError('Invalid country code specified. Must be a 2-letter ISO code.', [{ field: 'country', message: 'Invalid country code' }]));
      }
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const filter = {
        $or: [
          { 'geoLocation.type': 'country', 'geoLocation.countries': normalizedCountry },
          // If a continent includes this country, it might be relevant. 
          // This part of the logic depends on how geoip-lite or your geo data is structured for continents.
          // For simplicity, we might only include 'international' or specific continent checks if available.
          // { 'geoLocation.type': 'continent', 'geoLocation.continents': relevantContinent }, 
          { 'geoLocation.type': 'international' } // International tournaments are relevant to any location search
        ],
        visibility: 'public' // Only public tournaments
      };

      // Optional: Add other filters from query like type, mode, etc.
      if (req.query.type && Object.values(Tournament.TOURNAMENT_TYPES).includes(req.query.type.toUpperCase())) {
        filter.type = req.query.type.toUpperCase();
      }
      if (req.query.mode && Object.values(Tournament.TOURNAMENT_MODES).includes(req.query.mode.toUpperCase())) {
        filter.mode = req.query.mode.toUpperCase();
      }

      const tournaments = await Tournament.find(filter)
        .select('name slug format mode type status startDate endDate participantsCount banner logo createdBy geoLocation')
        .populate('createdBy', 'nickname avatar')
        .skip(skip)
        .limit(limit)
        .sort({ startDate: -1 })
        .lean();
      
      const total = await Tournament.countDocuments(filter);

      // AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_TOURNAMENTS_BY_LOCATION', { ... }); // Optional
      
      return res.status(200).json({
        success: true,
        tournaments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error(`Error fetching tournaments by location (${req.params.country}):`, error);
      await AuditLogService.logAction(req.user?.id || 'anonymous', 'GET_TOURNAMENTS_BY_LOCATION_ERROR', {
        details: error.message, country: req.params.country, query: req.query,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
}

module.exports = new TournamentController();
