/**
 * EventReward.js - Modello per le ricompense degli eventi
 * 
 * Questo modello definisce la struttura dei dati per le ricompense
 * assegnate ai partecipanti degli eventi e tornei.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definizione dei tipi di ricompensa
const REWARD_TYPES = {
  BADGE: 'badge',
  TITLE: 'title',
  COSMETIC: 'cosmetic',
  POINTS: 'points',
  CURRENCY: 'currency',
  CUSTOM: 'custom'
};

// Schema per le ricompense
const EventRewardSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(REWARD_TYPES),
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  imageUrl: {
    type: String
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  requirements: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Schema per le assegnazioni di ricompense agli utenti
const UserRewardSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewardId: {
    type: Schema.Types.ObjectId,
    ref: 'EventReward',
    required: true
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  awardedAt: {
    type: Date,
    default: Date.now
  },
  claimed: {
    type: Boolean,
    default: false
  },
  claimedAt: {
    type: Date
  },
  position: {
    type: Number
  },
  achievement: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indici per migliorare le performance delle query
EventRewardSchema.index({ eventId: 1 });
EventRewardSchema.index({ tournamentId: 1 });
EventRewardSchema.index({ type: 1 });
EventRewardSchema.index({ rarity: 1 });

UserRewardSchema.index({ userId: 1 });
UserRewardSchema.index({ rewardId: 1 });
UserRewardSchema.index({ eventId: 1 });
UserRewardSchema.index({ tournamentId: 1 });
UserRewardSchema.index({ claimed: 1 });

// Metodi statici per EventReward
EventRewardSchema.statics = {
  REWARD_TYPES,
  
  /**
   * Trova ricompense per un evento specifico
   * @param {String} eventId - ID dell'evento
   * @returns {Promise<Array>} Promessa che restituisce le ricompense
   */
  async findByEventId(eventId) {
    return this.find({ eventId });
  },
  
  /**
   * Trova ricompense per un torneo specifico
   * @param {String} tournamentId - ID del torneo
   * @returns {Promise<Array>} Promessa che restituisce le ricompense
   */
  async findByTournamentId(tournamentId) {
    return this.find({ tournamentId });
  },
  
  /**
   * Trova ricompense per tipo
   * @param {String} type - Tipo di ricompensa
   * @returns {Promise<Array>} Promessa che restituisce le ricompense
   */
  async findByType(type) {
    return this.find({ type });
  }
};

// Metodi statici per UserReward
UserRewardSchema.statics = {
  /**
   * Trova ricompense assegnate a un utente
   * @param {String} userId - ID dell'utente
   * @returns {Promise<Array>} Promessa che restituisce le ricompense assegnate
   */
  async findByUserId(userId) {
    return this.find({ userId })
      .populate('rewardId')
      .sort({ awardedAt: -1 });
  },
  
  /**
   * Trova ricompense assegnate per un evento specifico
   * @param {String} eventId - ID dell'evento
   * @returns {Promise<Array>} Promessa che restituisce le ricompense assegnate
   */
  async findByEventId(eventId) {
    return this.find({ eventId })
      .populate('userId', 'nickname avatar')
      .populate('rewardId')
      .sort({ position: 1 });
  },
  
  /**
   * Verifica se un utente ha ricevuto una ricompensa specifica
   * @param {String} userId - ID dell'utente
   * @param {String} rewardId - ID della ricompensa
   * @returns {Promise<Boolean>} Promessa che restituisce true se l'utente ha la ricompensa
   */
  async hasReward(userId, rewardId) {
    const count = await this.countDocuments({ userId, rewardId });
    return count > 0;
  }
};

// Metodi di istanza per UserReward
UserRewardSchema.methods = {
  /**
   * Segna la ricompensa come richiesta
   * @returns {Promise<UserReward>} Promessa che restituisce la ricompensa aggiornata
   */
  async claim() {
    if (this.claimed) {
      throw new Error('Questa ricompensa è già stata richiesta');
    }
    
    this.claimed = true;
    this.claimedAt = new Date();
    
    return this.save();
  }
};

const EventReward = mongoose.model('EventReward', EventRewardSchema);
const UserReward = mongoose.model('UserReward', UserRewardSchema);

module.exports = {
  EventReward,
  UserReward,
  REWARD_TYPES
};
