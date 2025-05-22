// server/models/Queue.js - Modello per le code di matchmaking

const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mode: {
    type: String,
    enum: ['1v1', '2v2', '3v3'],
    required: true
  },
  mmr: {
    type: Number,
    default: 1000
  },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'started', 'cancelled'],
    default: 'waiting'
  },
  matchId: {
    type: String
  },
  matchDbId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  cancelReason: {
    type: String,
    enum: ['user_left', 'timeout', 'declined', 'error']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Scade dopo 24 ore
  }
});

// Indici per migliorare le performance delle query
QueueSchema.index({ user: 1, status: 1 });
QueueSchema.index({ mode: 1, status: 1 });
QueueSchema.index({ matchId: 1 });

module.exports = mongoose.model('Queue', QueueSchema);
