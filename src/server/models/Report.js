// server/models/Report.js - Modello per le segnalazioni di comportamenti scorretti

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reported: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['afk', 'toxic', 'cheating', 'griefing', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  matchId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'dismissed', 'actioned'],
    default: 'pending'
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handledAt: {
    type: Date
  },
  resultingPenalty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Penalty'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indici per migliorare le performance delle query
ReportSchema.index({ status: 1 });
ReportSchema.index({ reporter: 1 });
ReportSchema.index({ reported: 1 });
ReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
