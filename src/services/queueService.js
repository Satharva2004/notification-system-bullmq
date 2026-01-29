import { Queue } from 'bullmq';
import redisConnection from '../models/Redis.js';

/**
 * Queue Service
 * Manages notification queues using BullMQ
 */

// Get Redis connection for BullMQ
const connection = redisConnection.getClient();

// Create notification queue
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

/**
 * Queue Service Object
 */
export const queueService = {
  /**
   * Add a notification job to the queue
   * @param {Object} notificationData - Notification data
   * @param {Object} options - Job options
   * @returns {Promise<Job>} The created job
   */
  async addNotification(notificationData, options = {}) {
    try {
      const job = await notificationQueue.add(
        'send-notification',
        notificationData,
        {
          ...options,
          priority: options.priority || 1, // Lower number = higher priority
        }
      );
      console.log(`📬 Notification job added to queue: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Error adding notification to queue:', error);
      throw error;
    }
  },

  /**
   * Add a bulk notification job
   * @param {Array} notifications - Array of notification data
   * @returns {Promise<Array>} Array of created jobs
   */
  async addBulkNotifications(notifications) {
    try {
      const jobs = notifications.map((notification, index) => ({
        name: 'send-notification',
        data: notification,
        opts: {
          priority: notification.priority || 1,
        },
      }));

      const createdJobs = await notificationQueue.addBulk(jobs);
      console.log(`📬 ${createdJobs.length} notification jobs added to queue`);
      return createdJobs;
    } catch (error) {
      console.error('❌ Error adding bulk notifications to queue:', error);
      throw error;
    }
  },

  /**
   * Schedule a notification for later
   * @param {Object} notificationData - Notification data
   * @param {number} delay - Delay in milliseconds
   * @returns {Promise<Job>} The created job
   */
  async scheduleNotification(notificationData, delay) {
    try {
      const job = await notificationQueue.add(
        'send-notification',
        notificationData,
        {
          delay,
        }
      );
      console.log(`⏰ Notification scheduled for ${delay}ms from now: ${job.id}`);
      return job;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      throw error;
    }
  },

  /**
   * Get job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<Job>} The job
   */
  async getJob(jobId) {
    try {
      const job = await notificationQueue.getJob(jobId);
      return job;
    } catch (error) {
      console.error('❌ Error getting job:', error);
      throw error;
    }
  },

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        notificationQueue.getWaitingCount(),
        notificationQueue.getActiveCount(),
        notificationQueue.getCompletedCount(),
        notificationQueue.getFailedCount(),
        notificationQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      throw error;
    }
  },

  /**
   * Remove a job from the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<void>}
   */
  async removeJob(jobId) {
    try {
      const job = await notificationQueue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`🗑️ Job ${jobId} removed from queue`);
      }
    } catch (error) {
      console.error('❌ Error removing job:', error);
      throw error;
    }
  },

  /**
   * Pause the queue
   * @returns {Promise<void>}
   */
  async pauseQueue() {
    try {
      await notificationQueue.pause();
      console.log('⏸️ Queue paused');
    } catch (error) {
      console.error('❌ Error pausing queue:', error);
      throw error;
    }
  },

  /**
   * Resume the queue
   * @returns {Promise<void>}
   */
  async resumeQueue() {
    try {
      await notificationQueue.resume();
      console.log('▶️ Queue resumed');
    } catch (error) {
      console.error('❌ Error resuming queue:', error);
      throw error;
    }
  },

  /**
   * Clean old jobs from the queue
   * @param {number} grace - Grace period in milliseconds
   * @param {string} status - Job status to clean (completed, failed, etc.)
   * @returns {Promise<void>}
   */
  async cleanQueue(grace = 24 * 3600 * 1000, status = 'completed') {
    try {
      const jobs = await notificationQueue.clean(grace, 1000, status);
      console.log(`🧹 Cleaned ${jobs.length} ${status} jobs older than ${grace}ms`);
    } catch (error) {
      console.error('❌ Error cleaning queue:', error);
      throw error;
    }
  },

  /**
   * Close the queue connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await notificationQueue.close();
      console.log('🔌 Queue connection closed');
    } catch (error) {
      console.error('❌ Error closing queue:', error);
      throw error;
    }
  },
};

export default queueService;
