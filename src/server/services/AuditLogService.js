const AuditLog = require('../models/AuditLog');

class AuditLogService {
  static async logAction(userId, action, options = {}) {
    try {
      const { targetType, targetId, details, ipAddress, userAgent } = options;
      
      const logEntry = new AuditLog({
        userId,
        action,
        targetType,
        targetId,
        details,
        ipAddress,
        userAgent
      });
      
      await logEntry.save();
      console.log(`Audit log created: ${action} by ${userId}`);
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Optionally, handle this error more gracefully, e.g., by sending to a dedicated logging service
    }
  }
  
  static async getLogs(filters = {}, paginationOptions = {}) {
    try {
      const { page = 1, limit = 20 } = paginationOptions;
      const skip = (page - 1) * limit;
      
      const query = AuditLog.find(filters)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email'); // Populate user details
        
      const logs = await query.exec();
      const totalLogs = await AuditLog.countDocuments(filters);
      
      return {
        logs,
        totalPages: Math.ceil(totalLogs / limit),
        currentPage: page,
        totalLogs
      };
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      throw error; // Re-throw for controller to handle
    }
  }
  
  // Example usage of specific log types
  static async logLogin(userId, ipAddress, userAgent) {
    await this.logAction(userId, 'LOGIN', { ipAddress, userAgent });
  }
  
  static async logUserCreation(adminUserId, createdUserId, details) {
    await this.logAction(adminUserId, 'CREATE_USER', {
      targetType: 'User',
      targetId: createdUserId,
      details
    });
  }
  
  // Add more specific logging methods as needed
}

module.exports = AuditLogService; 