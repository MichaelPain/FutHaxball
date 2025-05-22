const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'CREATE_ROOM', 'DELETE_ROOM', 'START_GAME', 'END_GAME',
      'CREATE_TOURNAMENT', 'UPDATE_TOURNAMENT', 'DELETE_TOURNAMENT',
      'BAN_USER', 'UNBAN_USER', 'MUTE_USER', 'UNMUTE_USER',
      'GRANT_PERMISSION', 'REVOKE_PERMISSION', 'SYSTEM_CONFIG_CHANGE'
      // Add more actions as needed
    ]
  },
  targetType: {
    type: String,
    // e.g., 'User', 'Room', 'Tournament', 'System'
  },
  targetId: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    // Store additional information about the action, e.g., old and new values for an update
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

// Indexing for faster queries
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog; 