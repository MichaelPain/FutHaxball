/**
 * AdminController.js - Controller per le funzionalità del pannello di amministrazione
 * 
 * Questo controller gestisce tutte le operazioni relative al pannello di amministrazione,
 * inclusa l'autenticazione, la gestione degli utenti, la moderazione e la configurazione.
 */

const Admin = require('../models/Admin');
const User = require('../models/User');
const AuditLogService = require('../services/AuditLogService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const config = require('../config');
const { AuthorizationError, ValidationError, NotFoundError, AppError } = require('../utils/customErrors');

// Define Roles
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support'
};

// Define Permissions
const PERMISSIONS = {
  VIEW_ADMIN_PANEL: 'view_admin_panel',
  MANAGE_USERS: 'manage_users', // Includes view, update, ban, unban
  VIEW_USERS: 'view_users',
  UPDATE_USER: 'update_user',
  BAN_USER: 'ban_user',
  UNBAN_USER: 'unban_user',
  RESET_USER_STATS: 'reset_user_stats',
  MANAGE_ADMINS: 'manage_admins', // Includes add, update, remove admins
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_TOURNAMENTS: 'manage_tournaments',
  MANAGE_EVENTS: 'manage_events',
  SETUP_2FA: 'setup_2fa',
  // Add more specific permissions as needed
};

// Role to Permissions Mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_ADMIN_PANEL, PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS,
    PERMISSIONS.UPDATE_USER, PERMISSIONS.BAN_USER, PERMISSIONS.UNBAN_USER,
    PERMISSIONS.RESET_USER_STATS, PERMISSIONS.MANAGE_ADMINS, PERMISSIONS.VIEW_LOGS,
    PERMISSIONS.MANAGE_SETTINGS, PERMISSIONS.MANAGE_TOURNAMENTS, PERMISSIONS.MANAGE_EVENTS,
    PERMISSIONS.SETUP_2FA
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_ADMIN_PANEL, PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS,
    PERMISSIONS.UPDATE_USER, PERMISSIONS.BAN_USER, PERMISSIONS.UNBAN_USER,
    PERMISSIONS.RESET_USER_STATS, PERMISSIONS.VIEW_LOGS, PERMISSIONS.MANAGE_TOURNAMENTS,
    PERMISSIONS.MANAGE_EVENTS, PERMISSIONS.SETUP_2FA
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_ADMIN_PANEL, PERMISSIONS.VIEW_USERS, PERMISSIONS.BAN_USER,
    PERMISSIONS.UNBAN_USER, PERMISSIONS.VIEW_LOGS
  ],
  [ROLES.SUPPORT]: [
    PERMISSIONS.VIEW_ADMIN_PANEL, PERMISSIONS.VIEW_USERS, PERMISSIONS.VIEW_LOGS
  ]
};

// Helper function to check permissions (simulates middleware)
// Assumes req.user contains the user object with a 'role' property
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id; // Assuming JWT middleware sets req.user.id
      const admin = await Admin.findOne({ userId: userId }); // Fetch admin details including role

      if (!admin) {
        // Use next with an error object for consistency with global error handler
        return next(new AuthorizationError('Access denied. Admin profile not found.'));
      }

      const userRole = admin.role;
      if (!userRole || !ROLE_PERMISSIONS[userRole] || !ROLE_PERMISSIONS[userRole].includes(requiredPermission)) {
        await AuditLogService.logAction(userId, 'PERMISSION_DENIED', {
          details: `Attempted to access resource requiring ${requiredPermission}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
        // Use next with an error object
        return next(new AuthorizationError('Access denied. You do not have the required permission.'));
      }
      next();
    } catch (error) {
      console.error('Error in checkPermission middleware:', error);
      // Pass error to global error handler
      next(new AppError('Error checking permissions.', 500));
    }
  };
};

/**
 * Controller per il pannello di amministrazione
 */
class AdminController {
  /**
   * Verifica se un utente ha accesso al pannello di amministrazione
   * Questo metodo funge anche da "login" per il pannello, aggiornando lastLogin.
   * Il permesso VIEW_ADMIN_PANEL è implicito per accedere a questa funzione.
   * Ulteriori permessi sono gestiti dal middleware checkPermission per altre rotte.
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async checkAdminAccess(req, res, next) {
    try {
      const userId = req.user.id; // Assumed to be set by authMiddleware
      
      const admin = await Admin.findOne({ userId: userId }).populate('userId', 'email nickname avatar');
      
      if (!admin) {
        // This case should ideally be caught by auth if admin status is tied to general auth,
        // or if admin routes are strictly for users with an Admin model entry.
        return next(new AuthorizationError('Access denied. Admin profile not found.'));
      }

      // The route for this controller method (/api/admin/access) does not have checkPermission applied directly in adminRoutes.js
      // because this function itself is the gateway. We still need to ensure the user has at least VIEW_ADMIN_PANEL.
      if (!ROLE_PERMISSIONS[admin.role] || !ROLE_PERMISSIONS[admin.role].includes(PERMISSIONS.VIEW_ADMIN_PANEL)) {
        await AuditLogService.logAction(userId, 'ADMIN_ACCESS_DENIED', {
            details: 'User does not have VIEW_ADMIN_PANEL permission for initial access.',
            ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('Access denied. You do not have permission to view the admin panel.'));
      }
      
      admin.lastLogin = new Date();
      await admin.save();
      
      await AuditLogService.logAction(admin.userId._id, 'ADMIN_LOGIN_SUCCESS', { // Changed from 'LOGIN' for clarity
        targetType: 'AdminPanel',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        admin: {
          id: admin._id,
          userId: admin.userId._id,
          email: admin.userId.email,
          nickname: admin.userId.nickname,
          avatar: admin.userId.avatar,
          role: admin.role,
          permissions: ROLE_PERMISSIONS[admin.role] || [], // Send all permissions for the role
          createdAt: admin.createdAt,
          lastLogin: admin.lastLogin,
          twoFactorEnabled: admin.twoFactorEnabled
        }
      });
    } catch (error) {
      console.error('Error during admin access check:', error); // Corrected log message
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'ADMIN_ACCESS_ERROR', {
        details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error); // Pass to global error handler
    }
  }
  
  /**
   * Ottiene i dati della dashboard amministrativa
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async getDashboardData(req, res, next) {
    try {
      const userId = req.user.id; // Permission already checked by middleware
      
      // Ottieni statistiche utenti
      const totalUsers = await User.countDocuments();
      const newUsersToday = await User.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });
      const activeUsersToday = await User.countDocuments({ // This might be better tracked by recent activity logs
        lastLogin: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      });
      
      // Placeholder: Ottieni statistiche partite (da implementare con il modello Match)
      const totalMatches = 0; 
      const matchesToday = 0; 
      const activeMatches = 0; 
      
      // Placeholder: Ottieni statistiche tornei (da implementare con il modello Tournament)
      const totalTournaments = 0; 
      const activeTournaments = 0; 
      const upcomingTournaments = 0; 
      
      // Placeholder: Ottieni statistiche report (da implementare con il modello Report)
      const totalReports = 0; 
      const pendingReports = 0; 
      const resolvedReportsToday = 0; 
      
      // Ottieni statistiche sistema
      const serverStatus = {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(), // Consider formatting this (e.g., to MB)
        // cpuUsage might require a bit more to be useful (e.g., average over time)
      };
      
      await AuditLogService.logAction(userId, 'VIEW_DASHBOARD_SUCCESS', { // Changed from VIEW_DASHBOARD
        targetType: 'AdminDashboard',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(200).json({
        success: true,
        dashboard: {
          users: {
            total: totalUsers,
            newToday: newUsersToday,
            activeToday: activeUsersToday
          },
          matches: {
            total: totalMatches,
            today: matchesToday,
            active: activeMatches
          },
          tournaments: {
            total: totalTournaments,
            active: activeTournaments,
            upcoming: upcomingTournaments
          },
          reports: {
            total: totalReports,
            pending: pendingReports,
            resolvedToday: resolvedReportsToday
          },
          system: serverStatus
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'VIEW_DASHBOARD_ERROR', {
        details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene un elenco di utenti con paginazione e filtri
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async getUsers(req, res, next) {
    try {
      const userId = req.user.id; // Permission (VIEW_USERS) checked by middleware
      const { page = 1, limit = 10, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const query = {};
      if (search) {
        query.$or = [
          { nickname: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      // Note: Filtering by 'role' here refers to User roles if they exist, not Admin roles.
      // If User model doesn't have roles, this filter might need adjustment or removal.
      if (role) query.role = role; 
      if (status) query.status = status; // e.g., 'active', 'banned', 'unverified'

      const users = await User.find(query)
        .populate('adminProfile', 'role') // Populate admin role if linked
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      
      const totalUsers = await User.countDocuments(query);

      await AuditLogService.logAction(userId, 'VIEW_USERS_SUCCESS', {
        details: `Viewed user list page ${page}, limit ${limit}. Filters: ${JSON.stringify(req.query)}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        users: users.map(u => ({ // Return a mapped version to control exposed fields
            id: u._id,
            nickname: u.nickname,
            email: u.email,
            avatar: u.avatar,
            role: u.adminProfile ? u.adminProfile.role : (u.role || 'user'), // Show admin role if they are one
            status: u.status,
            isBanned: u.isBanned,
            banExpires: u.banExpires,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'VIEW_USERS_ERROR', {
        details: error.message, query: req.query,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i dettagli di un utente specifico
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async getUserDetails(req, res, next) {
    try {
      const viewingAdminId = req.user.id; // Permission (VIEW_USERS) checked by middleware
      const targetUserId = req.params.id;

      // Fetch user and potentially linked admin profile
      const user = await User.findById(targetUserId).populate('adminProfile'); 
      if (!user) {
        return next(new NotFoundError('User not found.'));
      }

      // Add more details as needed: stats, match history, tournament participation, etc.
      // const userStats = await Stats.findOne({ userId: targetUserId });
      // const matchHistory = await Match.find({ participants: targetUserId }).limit(10).sort({ date: -1 });

      await AuditLogService.logAction(viewingAdminId, 'VIEW_USER_DETAILS_SUCCESS', {
        targetType: 'User',
        targetId: targetUserId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        user: { // Selectively return fields
            id: user._id,
            nickname: user.nickname,
            email: user.email,
            avatar: user.avatar,
            status: user.status,
            isBanned: user.isBanned,
            banReason: user.banReason,
            banExpires: user.banExpires,
            roles: user.adminProfile ? [user.adminProfile.role, 'user'] : (user.role ? [user.role] : ['user']),
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
            // stats: userStats, 
            // matchHistory: matchHistory,
            // Any other relevant details
        }
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'VIEW_USER_DETAILS_ERROR', {
        targetType: 'User', targetId: req.params.id, details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Aggiorna i dettagli di un utente (es. ruolo, stato)
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async updateUser(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (UPDATE_USER) checked by middleware
      const targetUserId = req.params.id;
      const { email, nickname, status, role } = req.body; // Admin role to assign/change

      const userToUpdate = await User.findById(targetUserId);
      if (!userToUpdate) {
        return next(new NotFoundError('User to update not found.'));
      }

      const oldUserData = { ...userToUpdate.toObject() };
      let oldAdminRole = null;

      // Update basic user fields
      if (email && email !== userToUpdate.email) {
          // Add email validation and check for uniqueness if necessary
          const existingUser = await User.findOne({ email: email, _id: { $ne: targetUserId } });
          if (existingUser) {
              return next(new AppError('Email already in use by another account.', 409)); // Conflict
          }
          userToUpdate.email = email;
      }
      if (nickname) userToUpdate.nickname = nickname;
      if (status) userToUpdate.status = status; // e.g. 'verified', 'email_changed'

      // Role change logic - this is sensitive and needs careful permission handling
      if (role) {
        const performingAdmin = await Admin.findOne({ userId: adminUserId });
        if (!performingAdmin || !ROLE_PERMISSIONS[performingAdmin.role]?.includes(PERMISSIONS.MANAGE_ADMINS)) {
            await AuditLogService.logAction(adminUserId, 'UPDATE_USER_ROLE_CHANGE_DENIED', {
                targetType: 'User', targetId: targetUserId,
                details: `Admin ${adminUserId} lacks MANAGE_ADMINS to change role to ${role}.`,
                ipAddress: req.ip, userAgent: req.headers['user-agent']
            });
            return next(new AuthorizationError('You do not have permission to change user roles to admin roles.'));
        }

        // Check if the target user is already an admin
        let targetAdmin = await Admin.findOne({ userId: targetUserId });
        if (targetAdmin) {
            oldAdminRole = targetAdmin.role;
            if (targetAdmin.role !== role) {
                targetAdmin.role = role; // Update existing admin's role
                await targetAdmin.save();
            }
        } else {
            // Assigning a new admin role
            targetAdmin = new Admin({ userId: targetUserId, role: role, addedBy: adminUserId });
            await targetAdmin.save();
            userToUpdate.adminProfile = targetAdmin._id; // Link in User model if you have such a field
        }
      }

      await userToUpdate.save();
      const updatedUser = await User.findById(targetUserId).populate('adminProfile'); // Re-fetch to get populated admin role

      await AuditLogService.logAction(adminUserId, 'UPDATE_USER_SUCCESS', {
        targetType: 'User',
        targetId: targetUserId,
        details: { oldData: oldUserData, newData: updatedUser.toObject(), changes: req.body, oldAdminRole: oldAdminRole, newAdminRole: role },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'User updated successfully.',
        user: { // Return consistent user object
            id: updatedUser._id,
            nickname: updatedUser.nickname,
            email: updatedUser.email,
            status: updatedUser.status,
            role: updatedUser.adminProfile ? updatedUser.adminProfile.role : (updatedUser.role || 'user')
        }
      });
    } catch (error) {
      console.error('Error updating user:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UPDATE_USER_ERROR', {
        targetType: 'User', targetId: req.params.id, details: error.message, data: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Banna un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async banUser(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (BAN_USER) checked by middleware
      const targetUserId = req.params.id;
      const { reason, duration } = req.body;

      if (!reason) {
        return next(new ValidationError('A reason for banning is required.', [{field: 'reason', message: 'Reason is required'}]));
      }

      const userToBan = await User.findById(targetUserId);
      if (!userToBan) {
        return next(new NotFoundError('User to ban not found.'));
      }

      if (userToBan.isBanned) {
        return next(new AppError('User is already banned.', 409)); // Conflict
      }
      
      // Prevent banning other admins unless the performer is a SUPER_ADMIN or has specific higher privs
      const targetIsAdmin = await Admin.exists({ userId: targetUserId });
      if (targetIsAdmin) {
          const performingAdmin = await Admin.findOne({ userId: adminUserId });
          if (!performingAdmin || performingAdmin.role !== ROLES.SUPER_ADMIN) { // Simplified: only super_admin can ban other admins
               await AuditLogService.logAction(adminUserId, 'BAN_ADMIN_DENIED', {
                  targetType: 'User', targetId: targetUserId,
                  details: 'Attempted to ban an admin without SUPER_ADMIN privileges.',
                  ipAddress: req.ip, userAgent: req.headers['user-agent']
              });
              return next(new AuthorizationError('You do not have permission to ban an administrator.'));
          }
      }

      userToBan.isBanned = true;
      userToBan.banReason = reason;
      userToBan.banDate = new Date();
      if (duration) {
        userToBan.banExpires = parseDuration(duration);
      } else {
        userToBan.banExpires = null; // Permanent ban
      }
      
      await userToBan.save();

      // TODO: Implement logic to terminate user's active sessions (e.g., invalidate JWTs, disconnect sockets)

      await AuditLogService.logAction(adminUserId, 'BAN_USER_SUCCESS', {
        targetType: 'User',
        targetId: targetUserId,
        details: { reason, duration, expires: userToBan.banExpires },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: `User ${userToBan.nickname} banned successfully. ${userToBan.banExpires ? 'Expires on: ' + userToBan.banExpires : 'Permanent ban.'}`,
        user: { id: userToBan._id, isBanned: userToBan.isBanned, banReason: userToBan.banReason, banExpires: userToBan.banExpires }
      });
    } catch (error) {
      console.error('Error banning user:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'BAN_USER_ERROR', {
        targetType: 'User', targetId: req.params.id, details: error.message, data: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Rimuove il ban da un utente
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async unbanUser(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (UNBAN_USER) checked by middleware
      const targetUserId = req.params.id;

      const userToUnban = await User.findById(targetUserId);
      if (!userToUnban) {
        return next(new NotFoundError('User to unban not found.'));
      }

      if (!userToUnban.isBanned) {
        return next(new AppError('User is not currently banned.', 400));
      }

      const oldBanReason = userToUnban.banReason;
      userToUnban.isBanned = false;
      userToUnban.banReason = null;
      userToUnban.banDate = null;
      userToUnban.banExpires = null;
      
      await userToUnban.save();

      await AuditLogService.logAction(adminUserId, 'UNBAN_USER_SUCCESS', {
        targetType: 'User',
        targetId: targetUserId,
        details: { previousBanReason: oldBanReason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: `User ${userToUnban.nickname} unbanned successfully.`,
        user: { id: userToUnban._id, isBanned: userToUnban.isBanned }
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UNBAN_USER_ERROR', {
        targetType: 'User', targetId: req.params.id, details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Resetta le statistiche di un utente (placeholder)
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async resetUserStats(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (RESET_USER_STATS) checked by middleware
      const targetUserId = req.params.id;

      const user = await User.findById(targetUserId);
      if (!user) {
        return next(new NotFoundError('User not found.'));
      }

      // Placeholder: Actual stats reset logic to be implemented
      // e.g., await StatsModel.updateOne({ userId: targetUserId }, { $set: { score: 0, wins: 0, losses: 0 } });
      
      await AuditLogService.logAction(adminUserId, 'RESET_USER_STATS_SUCCESS', {
        targetType: 'User',
        targetId: targetUserId,
        details: 'User stats reset (placeholder action).',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: `Stats for user ${user.nickname} reset successfully (placeholder).`
      });
    } catch (error) {
      console.error('Error resetting user stats:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'RESET_USER_STATS_ERROR', {
        targetType: 'User', targetId: req.params.id, details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
  
  /**
   * Ottiene i log amministrativi con paginazione e filtri
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async getLogs(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (VIEW_LOGS) checked by middleware
      // Pass req.query directly to the service, it handles parsing page, limit, filters
      const { logs, pagination } = await AuditLogService.getLogs(req.query);

      // No need to log VIEW_LOGS_SUCCESS here, as getLogs itself might be an audit log entry
      // Or, if desired, log it minimally.
      // await AuditLogService.logAction(adminUserId, 'VIEW_AUDIT_LOGS', { /* minimal details */ });


      return res.status(200).json({
        success: true,
        logs,
        pagination
      });
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      // Avoid self-logging an error while trying to fetch logs if AuditLogService is down.
      // Consider a different logging mechanism for this specific error if AuditLogService is the one failing.
      if (!(error.message && error.message.includes('AuditLogService'))) {
           await AuditLogService.logAction(req.user?.id || 'unknown_user', 'VIEW_AUDIT_LOGS_ERROR', {
            details: error.message, query: req.query,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          });
      }
      next(error);
    }
  }

  // --- Gestione Amministratori ---

  /**
   * Aggiunge un nuovo amministratore
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async addAdmin(req, res, next) {
    try {
      const performingAdminId = req.user.id; // Permission (MANAGE_ADMINS) checked by middleware
      const { userId, role } = req.body;

      if (!userId || !role) {
        return next(new ValidationError('User ID and role are required.', [
            {field: 'userId', message: 'User ID is required'},
            {field: 'role', message: 'Role is required'}
        ]));
      }

      if (!Object.values(ROLES).includes(role)) {
        return next(new ValidationError('Invalid role specified.', [{field: 'role', message: 'Invalid role'}]));
      }
      
      // Prevent assigning SUPER_ADMIN unless the performing admin is also a SUPER_ADMIN
      if (role === ROLES.SUPER_ADMIN) {
          const performingAdmin = await Admin.findOne({ userId: performingAdminId });
          if (!performingAdmin || performingAdmin.role !== ROLES.SUPER_ADMIN) {
              await AuditLogService.logAction(performingAdminId, 'ADD_SUPER_ADMIN_DENIED', {
                  targetType: 'User', targetId: userId, details: 'Attempted to create SUPER_ADMIN without SUPER_ADMIN privilege.',
                  ipAddress: req.ip, userAgent: req.headers['user-agent']
              });
              return next(new AuthorizationError('You do not have permission to create Super Admins.'));
          }
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return next(new NotFoundError('User to be made admin not found.'));
      }

      const existingAdmin = await Admin.findOne({ userId: userId });
      if (existingAdmin) {
        return next(new AppError('This user is already an administrator.', 409)); // Conflict
      }

      const newAdmin = new Admin({
        userId,
        role,
        addedBy: performingAdminId, 
        status: 'active' // Or require email verification for admin role
      });
      await newAdmin.save();

      // Optionally link this admin profile back to the User model if there's a field for it
      // targetUser.adminProfile = newAdmin._id; 
      // await targetUser.save();

      await AuditLogService.logAction(performingAdminId, 'ADD_ADMIN_SUCCESS', {
        targetType: 'Admin',
        targetId: newAdmin._id.toString(),
        details: { userId: newAdmin.userId, role: newAdmin.role },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(201).json({
        success: true,
        message: `User ${targetUser.nickname} successfully added as ${role}.`,
        admin: { id: newAdmin._id, userId: newAdmin.userId, role: newAdmin.role }
      });
    } catch (error) {
      console.error('Error adding admin:', error);
       await AuditLogService.logAction(req.user?.id || 'unknown_user', 'ADD_ADMIN_ERROR', {
        details: error.message, data: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Aggiorna il ruolo o lo stato di un amministratore
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async updateAdmin(req, res, next) {
    try {
      const performingAdminId = req.user.id; // Permission (MANAGE_ADMINS) checked by middleware
      const targetAdminId = req.params.id; // This is Admin._id
      const { role, status } = req.body;

      if (!role && !status) {
        return next(new ValidationError('Either role or status must be provided for update.', []));
      }
      if (role && !Object.values(ROLES).includes(role)) {
        return next(new ValidationError('Invalid role specified.', [{field: 'role', message: 'Invalid role'}]));
      }
      // Add validation for status if there's a defined set of admin statuses

      const adminToUpdate = await Admin.findById(targetAdminId);
      if (!adminToUpdate) {
        return next(new NotFoundError('Administrator profile not found.'));
      }

      const oldAdminData = { ...adminToUpdate.toObject() };
      const performingAdmin = await Admin.findOne({ userId: performingAdminId });

      // Prevent role escalation or modification of SUPER_ADMIN by non-SUPER_ADMINS
      if (role && role !== adminToUpdate.role) {
          if (adminToUpdate.role === ROLES.SUPER_ADMIN && (!performingAdmin || performingAdmin.role !== ROLES.SUPER_ADMIN)) {
              await AuditLogService.logAction(performingAdminId, 'UPDATE_SUPER_ADMIN_DENIED', {
                  targetType: 'Admin', targetId: targetAdminId, details: 'Attempted to change role of SUPER_ADMIN without SUPER_ADMIN privilege.',
                  ipAddress: req.ip, userAgent: req.headers['user-agent']
              });
              return next(new AuthorizationError('You do not have permission to change the role of a Super Admin.'));
          }
          if (role === ROLES.SUPER_ADMIN && (!performingAdmin || performingAdmin.role !== ROLES.SUPER_ADMIN)) {
              await AuditLogService.logAction(performingAdminId, 'ASSIGN_SUPER_ADMIN_DENIED', {
                  targetType: 'Admin', targetId: targetAdminId, details: 'Attempted to assign SUPER_ADMIN role without SUPER_ADMIN privilege.',
                  ipAddress: req.ip, userAgent: req.headers['user-agent']
              });
              return next(new AuthorizationError('You do not have permission to assign Super Admin role.'));
          }
          adminToUpdate.role = role;
      }
      
      if (status) {
          // Similar checks if status changes are sensitive (e.g., deactivating a SUPER_ADMIN)
          adminToUpdate.status = status;
      }

      await adminToUpdate.save();

      await AuditLogService.logAction(performingAdminId, 'UPDATE_ADMIN_SUCCESS', {
        targetType: 'Admin',
        targetId: targetAdminId,
        details: { oldData: oldAdminData, newData: adminToUpdate.toObject(), changes: req.body },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Administrator profile updated successfully.',
        admin: { id: adminToUpdate._id, userId: adminToUpdate.userId, role: adminToUpdate.role, status: adminToUpdate.status }
      });
    } catch (error) {
      console.error('Error updating admin:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'UPDATE_ADMIN_ERROR', {
        targetType: 'Admin', targetId: req.params.id, details: error.message, data: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Rimuove un amministratore (revoca i privilegi)
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async removeAdmin(req, res, next) {
    try {
      const performingAdminId = req.user.id; // Permission (MANAGE_ADMINS) checked by middleware
      const targetAdminId = req.params.id; // This is Admin._id

      const adminToRemove = await Admin.findById(targetAdminId);
      if (!adminToRemove) {
        return next(new NotFoundError('Administrator profile to remove not found.'));
      }

      // Prevent removing SUPER_ADMIN unless by another SUPER_ADMIN
      // Also prevent admins from removing themselves through this endpoint (they should use a "resign" or "disable account" feature)
      if (adminToRemove.userId.toString() === performingAdminId) {
          return next(new AppError('Administrators cannot remove their own admin privileges through this endpoint.', 400));
      }
      if (adminToRemove.role === ROLES.SUPER_ADMIN) {
          const performingAdmin = await Admin.findOne({ userId: performingAdminId });
          if (!performingAdmin || performingAdmin.role !== ROLES.SUPER_ADMIN) {
            await AuditLogService.logAction(performingAdminId, 'REMOVE_SUPER_ADMIN_DENIED', {
                targetType: 'Admin', targetId: targetAdminId, details: 'Attempted to remove SUPER_ADMIN without SUPER_ADMIN privilege.',
                ipAddress: req.ip, userAgent: req.headers['user-agent']
            });
            return next(new AuthorizationError('You do not have permission to remove a Super Admin.'));
          }
      }
      
      const removedAdminDetails = { userId: adminToRemove.userId, role: adminToRemove.role };
      await Admin.findByIdAndDelete(targetAdminId); // Or mark as inactive: adminToRemove.status = 'revoked'; await adminToRemove.save();

      // Optionally unlink from User model if adminProfile field exists
      // await User.updateOne({ _id: adminToRemove.userId }, { $unset: { adminProfile: '' } });


      await AuditLogService.logAction(performingAdminId, 'REMOVE_ADMIN_SUCCESS', {
        targetType: 'Admin',
        targetId: targetAdminId, // Log the ID of the removed admin record
        details: { removedAdminUserId: removedAdminDetails.userId, removedAdminRole: removedAdminDetails.role },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Administrator privileges revoked successfully.'
      });
    } catch (error) {
      console.error('Error removing admin:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', 'REMOVE_ADMIN_ERROR', {
        targetType: 'Admin', targetId: req.params.id, details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  // --- Autenticazione a Due Fattori (per l'admin stesso) ---

  /**
   * Imposta l'autenticazione a due fattori per l'admin loggato
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async setupTwoFactor(req, res, next) {
    try {
      const adminUserId = req.user.id; // Permission (SETUP_2FA) checked by middleware

      const admin = await Admin.findOne({ userId: adminUserId });
      if (!admin) {
        return next(new NotFoundError('Admin profile not found.')); // Should not happen if auth is working
      }

      if (admin.twoFactorEnabled) {
        return next(new AppError('Two-factor authentication is already enabled.', 400));
      }

      const secret = speakeasy.generateSecret({
        name: `HaxBall Admin (${admin.userId})` // Customize as needed
      });

      admin.twoFactorSecret = secret.base32;
      admin.twoFactorTempSecret = secret.base32; // Store temporarily until verified
      await admin.save();

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      await AuditLogService.logAction(adminUserId, '2FA_SETUP_INITIATED', {
        targetType: 'AdminSelf',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: '2FA setup initiated. Scan QR code and verify.',
        qrCodeUrl,
        secret: secret.base32 // Send secret for manual entry if QR fails
      });
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', '2FA_SETUP_ERROR', {
        details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Verifica il token 2FA e abilita 2FA per l'admin
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async verifyTwoFactor(req, res, next) {
    try {
      const adminUserId = req.user.id; // VIEW_ADMIN_PANEL used in routes, implies basic access
      const { token } = req.body;

      if (!token) {
        return next(new ValidationError('2FA token is required.', [{field: 'token', message: 'Token is required'}]));
      }

      const admin = await Admin.findOne({ userId: adminUserId });
      if (!admin || !admin.twoFactorTempSecret) {
        return next(new AppError('2FA setup not initiated or temporary secret missing.', 400));
      }

      const verified = speakeasy.totp.verify({
        secret: admin.twoFactorTempSecret,
        encoding: 'base32',
        token: token
      });

      if (!verified) {
        await AuditLogService.logAction(adminUserId, '2FA_VERIFY_FAILED', {
          targetType: 'AdminSelf', details: 'Invalid 2FA token provided.',
          ipAddress: req.ip, userAgent: req.headers['user-agent']
        });
        return next(new AuthorizationError('Invalid 2FA token.'));
      }

      admin.twoFactorEnabled = true;
      admin.twoFactorSecret = admin.twoFactorTempSecret; // Persist the secret
      admin.twoFactorTempSecret = undefined; // Clear temporary secret
      await admin.save();

      await AuditLogService.logAction(adminUserId, '2FA_VERIFY_SUCCESS', {
        targetType: 'AdminSelf',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled successfully.'
      });
    } catch (error) {
      console.error('Error verifying 2FA token:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', '2FA_VERIFY_ERROR', {
        details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }

  /**
   * Disabilita l'autenticazione a due fattori per l'admin
   * @param {Object} req - Richiesta HTTP
   * @param {Object} res - Risposta HTTP
   * @param {Function} next - Funzione next di Express
   */
  async disableTwoFactor(req, res, next) {
    try {
      const adminUserId = req.user.id; // VIEW_ADMIN_PANEL used in routes
      const { password } = req.body; // Require current password to disable 2FA for security

      // It's crucial to verify the admin's current password before disabling 2FA
      // This part assumes you have the admin's primary user account password hash stored with the User model
      // and that req.user.id refers to the User._id.
      if (!password) {
          return next(new ValidationError('Current password is required to disable 2FA.', [{field: 'password', message: 'Password is required'}]));
      }

      const user = await User.findById(adminUserId).select('+password'); // Assuming adminUserId is User._id
      const admin = await Admin.findOne({ userId: adminUserId });

      if (!user || !admin) {
          return next(new NotFoundError('Admin or user profile not found.'));
      }
      if (!admin.twoFactorEnabled) {
          return next(new AppError('Two-factor authentication is not currently enabled.', 400));
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          await AuditLogService.logAction(adminUserId, '2FA_DISABLE_DENIED', {
              targetType: 'AdminSelf', details: 'Invalid password provided for 2FA disable.',
              ipAddress: req.ip, userAgent: req.headers['user-agent']
          });
          return next(new AuthorizationError('Invalid password.'));
      }
      
      admin.twoFactorEnabled = false;
      admin.twoFactorSecret = undefined;
      admin.twoFactorTempSecret = undefined; // Just in case
      await admin.save();

      await AuditLogService.logAction(adminUserId, '2FA_DISABLE_SUCCESS', {
        targetType: 'AdminSelf',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully.'
      });
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      await AuditLogService.logAction(req.user?.id || 'unknown_user', '2FA_DISABLE_ERROR', {
        details: error.message,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(error);
    }
  }
}

// Helper function to parse duration strings (e.g., "7d", "1m", "3h") into dates
// This should be robust and handle various formats or be moved to a utility file.
function parseDuration(duration) {
  if (!duration) return null;
  const now = new Date();
  const unit = duration.slice(-1).toLowerCase();
  const value = parseInt(duration.slice(0, -1));

  if (isNaN(value)) return null;

  switch (unit) {
    case 'd': // days
      return new Date(now.setDate(now.getDate() + value));
    case 'h': // hours
      return new Date(now.setHours(now.getHours() + value));
    case 'm': // minutes (though typically bans are longer)
      return new Date(now.setMinutes(now.getMinutes() + value));
    // Add 'w' for weeks, 'M' for months if needed
    default:
      return null; // Invalid duration unit
  }
}


module.exports = new AdminController();
// Export ROLES, PERMISSIONS, and checkPermission so they can be used in routes/other controllers
module.exports.ROLES = ROLES;
module.exports.PERMISSIONS = PERMISSIONS;
module.exports.checkPermission = checkPermission;
