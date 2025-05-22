/**
 * Notification management system
 */
import eventManager from './eventManager';
import i18n from './i18n';
import securityLogger from './securityLogger';

class NotificationManager {
  constructor() {
    this.queue = [];
    this.maxQueueSize = 5;
    this.defaultDuration = 5000; // 5 seconds
    this.isProcessing = false;
    this.notificationTypes = {
      SUCCESS: 'success',
      ERROR: 'error',
      WARNING: 'warning',
      INFO: 'info'
    };

    // Bind methods
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * Shows a notification
   * @param {Object} options - Notification options
   * @param {string} options.type - Notification type (success, error, warning, info)
   * @param {string} options.message - Notification message
   * @param {number} [options.duration] - Duration in milliseconds
   * @param {boolean} [options.persistent] - Whether the notification should persist
   * @param {Object} [options.data] - Additional data for the notification
   */
  async show(options) {
    try {
      const notification = {
        id: Date.now(),
        type: options.type || this.notificationTypes.INFO,
        message: options.message,
        duration: options.duration || this.defaultDuration,
        persistent: options.persistent || false,
        data: options.data || {},
        timestamp: Date.now()
      };

      // Add to queue
      this.queue.push(notification);

      // Process queue if not already processing
      if (!this.isProcessing) {
        await this.processQueue();
      }

      this.logNotification('show', notification);
      eventManager.emit('notification:show', notification);

      return notification.id;
    } catch (error) {
      this.logError('show', error);
      throw error;
    }
  }

  /**
   * Shows a success notification
   * @param {string} message - Notification message
   * @param {Object} [options] - Additional options
   */
  success(message, options = {}) {
    return this.show({
      type: this.notificationTypes.SUCCESS,
      message,
      ...options
    });
  }

  /**
   * Shows an error notification
   * @param {string} message - Notification message
   * @param {Object} [options] - Additional options
   */
  error(message, options = {}) {
    return this.show({
      type: this.notificationTypes.ERROR,
      message,
      ...options
    });
  }

  /**
   * Shows a warning notification
   * @param {string} message - Notification message
   * @param {Object} [options] - Additional options
   */
  warning(message, options = {}) {
    return this.show({
      type: this.notificationTypes.WARNING,
      message,
      ...options
    });
  }

  /**
   * Shows an info notification
   * @param {string} message - Notification message
   * @param {Object} [options] - Additional options
   */
  info(message, options = {}) {
    return this.show({
      type: this.notificationTypes.INFO,
      message,
      ...options
    });
  }

  /**
   * Removes a notification
   * @param {number} id - Notification ID
   */
  remove(id) {
    try {
      const index = this.queue.findIndex(n => n.id === id);
      if (index !== -1) {
        const notification = this.queue[index];
        this.queue.splice(index, 1);
        
        this.logNotification('remove', notification);
        eventManager.emit('notification:remove', notification);
      }
    } catch (error) {
      this.logError('remove', error);
      throw error;
    }
  }

  /**
   * Clears all notifications
   */
  clear() {
    try {
      this.queue = [];
      this.logNotification('clear');
      eventManager.emit('notification:clear');
    } catch (error) {
      this.logError('clear', error);
      throw error;
    }
  }

  /**
   * Processes the notification queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const notification = this.queue[0];

        // Emit event for UI to handle
        eventManager.emit('notification:display', notification);

        // Wait for duration if not persistent
        if (!notification.persistent) {
          await new Promise(resolve => setTimeout(resolve, notification.duration));
          this.remove(notification.id);
        } else {
          // For persistent notifications, wait for manual removal
          await new Promise(resolve => {
            const handler = (removedNotification) => {
              if (removedNotification.id === notification.id) {
                eventManager.off('notification:remove', handler);
                resolve();
              }
            };
            eventManager.on('notification:remove', handler);
          });
        }
      }
    } catch (error) {
      this.logError('process_queue', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sets the maximum queue size
   * @param {number} size - Maximum number of notifications in queue
   */
  setMaxQueueSize(size) {
    if (size < 1) {
      throw new Error('Max queue size must be at least 1');
    }
    this.maxQueueSize = size;
  }

  /**
   * Sets the default notification duration
   * @param {number} duration - Duration in milliseconds
   */
  setDefaultDuration(duration) {
    if (duration < 0) {
      throw new Error('Duration must be non-negative');
    }
    this.defaultDuration = duration;
  }

  /**
   * Gets the current queue
   * @returns {Array} Notification queue
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * Gets the queue size
   * @returns {number} Number of notifications in queue
   */
  getQueueSize() {
    return this.queue.length;
  }

  /**
   * Logs a notification action
   * @param {string} action - Action type
   * @param {Object} [notification] - Notification data
   */
  logNotification(action, notification = null) {
    securityLogger.log(
      'NOTIFICATION',
      `Notification ${action}`,
      'INFO',
      notification ? {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        persistent: notification.persistent
      } : {}
    );
  }

  /**
   * Logs a notification error
   * @param {string} action - Action type
   * @param {Error} error - Error object
   */
  logError(action, error) {
    securityLogger.log(
      'NOTIFICATION',
      `Notification error during ${action}: ${error.message}`,
      'ERROR',
      {
        action,
        error: error.message,
        stack: error.stack
      }
    );
  }
}

const notificationManager = new NotificationManager();
export default notificationManager; 