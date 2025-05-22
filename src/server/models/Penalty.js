// server/models/Penalty.js - Modello per le penalità

const mongoose = require('mongoose');

const PenaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['warning', 'chat_ban', 'ranked_ban', 'ban'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date
  },
  permanent: {
    type: Boolean,
    default: false
  },
  expired: {
    type: Boolean,
    default: false
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relatedReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per migliorare le performance delle query
PenaltySchema.index({ user: 1, type: 1, expired: 1 });
PenaltySchema.index({ expiresAt: 1, expired: 1 });

module.exports = mongoose.model('Penalty', PenaltySchema);
