/**
 * Admin.js - Modello per gli amministratori del sistema
 * 
 * Questo modello definisce la struttura dei dati per gli amministratori
 * e i moderatori del sistema, inclusi ruoli, permessi e log delle azioni.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definizione dei ruoli disponibili
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// Definizione dei permessi disponibili
const PERMISSIONS = {
  // Permessi generali
  VIEW_ADMIN_PANEL: 'view_admin_panel',
  
  // Permessi utenti
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Permessi moderazione
  BAN_USERS: 'ban_users',
  MUTE_USERS: 'mute_users',
  RESET_STATS: 'reset_stats',
  VIEW_REPORTS: 'view_reports',
  RESOLVE_REPORTS: 'resolve_reports',
  
  // Permessi configurazione
  EDIT_GAME_CONFIG: 'edit_game_config',
  EDIT_MATCHMAKING: 'edit_matchmaking',
  EDIT_SECURITY: 'edit_security',
  
  // Permessi tornei
  CREATE_TOURNAMENTS: 'create_tournaments',
  EDIT_TOURNAMENTS: 'edit_tournaments',
  DELETE_TOURNAMENTS: 'delete_tournaments',
  MANAGE_PARTICIPANTS: 'manage_participants',
  
  // Permessi eventi
  CREATE_EVENTS: 'create_events',
  EDIT_EVENTS: 'edit_events',
  DELETE_EVENTS: 'delete_events',
  
  // Permessi campionati
  CREATE_CHAMPIONSHIPS: 'create_championships',
  EDIT_CHAMPIONSHIPS: 'edit_championships',
  DELETE_CHAMPIONSHIPS: 'delete_championships',
  
  // Permessi log
  VIEW_LOGS: 'view_logs',
  DELETE_LOGS: 'delete_logs'
};

// Definizione dei permessi predefiniti per ogni ruolo
const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.VIEW_USERS, PERMISSIONS.EDIT_USERS,
    PERMISSIONS.BAN_USERS, PERMISSIONS.MUTE_USERS, PERMISSIONS.RESET_STATS,
    PERMISSIONS.VIEW_REPORTS, PERMISSIONS.RESOLVE_REPORTS,
    PERMISSIONS.EDIT_GAME_CONFIG, PERMISSIONS.EDIT_MATCHMAKING,
    PERMISSIONS.CREATE_TOURNAMENTS, PERMISSIONS.EDIT_TOURNAMENTS, PERMISSIONS.DELETE_TOURNAMENTS,
    PERMISSIONS.MANAGE_PARTICIPANTS,
    PERMISSIONS.CREATE_EVENTS, PERMISSIONS.EDIT_EVENTS, PERMISSIONS.DELETE_EVENTS,
    PERMISSIONS.CREATE_CHAMPIONSHIPS, PERMISSIONS.EDIT_CHAMPIONSHIPS, PERMISSIONS.DELETE_CHAMPIONSHIPS,
    PERMISSIONS.VIEW_LOGS
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_ADMIN_PANEL,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.BAN_USERS, PERMISSIONS.MUTE_USERS,
    PERMISSIONS.VIEW_REPORTS, PERMISSIONS.RESOLVE_REPORTS,
    PERMISSIONS.VIEW_LOGS
  ]
};

// Schema per le azioni amministrative
const AdminActionSchema = new Schema({
  type: {
    type: String,
    required: true
  },
  target: {
    type: {
      type: String,
      enum: ['user', 'tournament', 'event', 'championship', 'system'],
      required: true
    },
    id: {
      type: String
    }
  },
  details: {
    type: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
});

// Schema principale per gli amministratori
const AdminSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true,
    default: ROLES.MODERATOR
  },
  permissions: {
    type: [String],
    enum: Object.values(PERMISSIONS),
    default: function() {
      return DEFAULT_ROLE_PERMISSIONS[this.role] || DEFAULT_ROLE_PERMISSIONS[ROLES.MODERATOR];
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLogin: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  actions: [AdminActionSchema],
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Metodi statici
AdminSchema.statics = {
  ROLES,
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  
  /**
   * Trova un amministratore per ID utente
   * @param {String} userId - ID dell'utente
   * @returns {Promise<Admin>} Promessa che restituisce l'amministratore
   */
  async findByUserId(userId) {
    return this.findOne({ userId });
  },
  
  /**
   * Verifica se un utente ha un ruolo amministrativo
   * @param {String} userId - ID dell'utente
   * @returns {Promise<Boolean>} Promessa che restituisce true se l'utente è un amministratore
   */
  async isAdmin(userId) {
    const admin = await this.findOne({ userId });
    return !!admin;
  },
  
  /**
   * Verifica se un utente ha un permesso specifico
   * @param {String} userId - ID dell'utente
   * @param {String} permission - Permesso da verificare
   * @returns {Promise<Boolean>} Promessa che restituisce true se l'utente ha il permesso
   */
  async hasPermission(userId, permission) {
    const admin = await this.findOne({ userId });
    if (!admin) return false;
    
    // Super admin ha tutti i permessi
    if (admin.role === ROLES.SUPER_ADMIN) return true;
    
    return admin.permissions.includes(permission);
  },
  
  /**
   * Registra un'azione amministrativa
   * @param {String} userId - ID dell'utente amministratore
   * @param {String} actionType - Tipo di azione
   * @param {Object} target - Target dell'azione (tipo e id)
   * @param {Object} details - Dettagli dell'azione
   * @param {String} ipAddress - Indirizzo IP dell'amministratore
   * @returns {Promise<Admin>} Promessa che restituisce l'amministratore aggiornato
   */
  async logAction(userId, actionType, target, details, ipAddress) {
    const admin = await this.findOne({ userId });
    if (!admin) throw new Error('Admin not found');
    
    admin.actions.push({
      type: actionType,
      target,
      details,
      timestamp: new Date(),
      ipAddress
    });
    
    return admin.save();
  }
};

// Metodi di istanza
AdminSchema.methods = {
  /**
   * Verifica se l'amministratore ha un permesso specifico
   * @param {String} permission - Permesso da verificare
   * @returns {Boolean} True se l'amministratore ha il permesso
   */
  hasPermission(permission) {
    // Super admin ha tutti i permessi
    if (this.role === ROLES.SUPER_ADMIN) return true;
    
    return this.permissions.includes(permission);
  },
  
  /**
   * Aggiunge un permesso all'amministratore
   * @param {String} permission - Permesso da aggiungere
   * @returns {Admin} L'amministratore aggiornato
   */
  addPermission(permission) {
    if (!Object.values(PERMISSIONS).includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
    
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
    }
    
    return this;
  },
  
  /**
   * Rimuove un permesso dall'amministratore
   * @param {String} permission - Permesso da rimuovere
   * @returns {Admin} L'amministratore aggiornato
   */
  removePermission(permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
    return this;
  },
  
  /**
   * Imposta il ruolo dell'amministratore e aggiorna i permessi di conseguenza
   * @param {String} role - Nuovo ruolo
   * @param {Boolean} resetPermissions - Se true, resetta i permessi a quelli predefiniti per il ruolo
   * @returns {Admin} L'amministratore aggiornato
   */
  setRole(role, resetPermissions = true) {
    if (!Object.values(ROLES).includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    
    this.role = role;
    
    if (resetPermissions) {
      this.permissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    }
    
    return this;
  },
  
  /**
   * Registra un'azione amministrativa
   * @param {String} actionType - Tipo di azione
   * @param {Object} target - Target dell'azione (tipo e id)
   * @param {Object} details - Dettagli dell'azione
   * @param {String} ipAddress - Indirizzo IP dell'amministratore
   * @returns {Admin} L'amministratore aggiornato
   */
  logAction(actionType, target, details, ipAddress) {
    this.actions.push({
      type: actionType,
      target,
      details,
      timestamp: new Date(),
      ipAddress
    });
    
    return this;
  }
};

// Indici
AdminSchema.index({ userId: 1 }, { unique: true });
AdminSchema.index({ role: 1 });
AdminSchema.index({ 'actions.timestamp': -1 });

// Esportazione del modello
const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;
