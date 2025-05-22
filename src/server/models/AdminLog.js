/**
 * AdminLog.js - Modello per i log delle azioni amministrative
 * 
 * Questo modello definisce la struttura dei dati per i log delle azioni
 * eseguite dagli amministratori, per scopi di audit e sicurezza.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema per i log amministrativi
const AdminLogSchema = new Schema({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  target: {
    type: {
      type: String,
      enum: ['user', 'admin', 'tournament', 'event', 'championship', 'system'],
      required: true
    },
    id: {
      type: Schema.Types.ObjectId,
      default: null
    }
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  result: {
    success: {
      type: Boolean,
      required: true
    },
    message: {
      type: String
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indici per migliorare le performance delle query
AdminLogSchema.index({ adminId: 1 });
AdminLogSchema.index({ action: 1 });
AdminLogSchema.index({ 'target.type': 1 });
AdminLogSchema.index({ 'target.id': 1 });
AdminLogSchema.index({ timestamp: -1 });
AdminLogSchema.index({ 'result.success': 1 });

// Metodi statici
AdminLogSchema.statics = {
  /**
   * Ottiene i log per un amministratore specifico
   * @param {String} adminId - ID dell'amministratore
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i log
   */
  async getLogsByAdmin(adminId, options = {}) {
    const query = this.find({ adminId });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ timestamp: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i log per un'azione specifica
   * @param {String} action - Tipo di azione
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i log
   */
  async getLogsByAction(action, options = {}) {
    const query = this.find({ action });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ timestamp: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i log per un target specifico
   * @param {String} targetType - Tipo di target
   * @param {String} targetId - ID del target
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i log
   */
  async getLogsByTarget(targetType, targetId, options = {}) {
    const query = this.find({
      'target.type': targetType,
      'target.id': targetId
    });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ timestamp: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i log in un intervallo di tempo
   * @param {Date} startDate - Data di inizio
   * @param {Date} endDate - Data di fine
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i log
   */
  async getLogsByTimeRange(startDate, endDate, options = {}) {
    const query = this.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ timestamp: -1 });
    }
    
    return query.exec();
  },
  
  /**
   * Ottiene i log con filtri avanzati
   * @param {Object} filters - Filtri da applicare
   * @param {Object} options - Opzioni di query (limit, skip, sort)
   * @returns {Promise<Array>} Promessa che restituisce i log
   */
  async getLogsWithFilters(filters = {}, options = {}) {
    const query = this.find(filters);
    
    if (options.limit) {
      query.limit(options.limit);
    }
    
    if (options.skip) {
      query.skip(options.skip);
    }
    
    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ timestamp: -1 });
    }
    
    if (options.populate) {
      query.populate(options.populate);
    }
    
    return query.exec();
  }
};

// Esportazione del modello
const AdminLog = mongoose.model('AdminLog', AdminLogSchema);
module.exports = AdminLog;
