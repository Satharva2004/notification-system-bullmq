import { Worker } from 'bullmq';
import redisConnection from '../models/Redis.js';

/**
 * Worker Service
 * Processes notification jobs from the queue
 */

// Get Redis connection for BullMQ
const connection = redisConnection.getClient();

/**
 * Process notification job
 * @param {Job} job - BullMQ job object
 * @returns {Promise<Object>} Processing result
 */
async function processNotification(job) {
  const { id, data } = job;

  console.log(`🔄 Processing notification job ${id}:`, data);

  try {
    // Extract notification data
    const {
      userId,
      type,
      title,
      message,
      channel, // email, sms, push, webhook
      recipient,
      metadata = {},
    } = data;

    // Simulate notification sending based on channel
    switch (channel) {
      case 'email':
        await sendEmailNotification({ recipient, title, message, metadata });
        break;
      case 'sms':
        await sendSMSNotification({ recipient, message, metadata });
        break;
      case 'push':
        await sendPushNotification({ userId, title, message, metadata });
        break;
      case 'webhook':
        await sendWebhookNotification({ recipient, data: { title, message, ...metadata } });
        break;
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }

    console.log(`✅ Notification job ${id} completed successfully`);

    return {
      success: true,
      jobId: id,
      channel,
      recipient,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error processing notification job ${id}:`, error);
    throw error; // BullMQ will handle retries
  }
}

/**
 * Send email notification
 * @param {Object} params - Email parameters
 */
async function sendEmailNotification({ recipient, title, message, metadata }) {
  // TODO: Implement actual email sending logic (e.g., using nodemailer, SendGrid, etc.)
  console.log(`📧 Sending email to ${recipient}:`);
  console.log(`   Subject: ${title}`);
  console.log(`   Message: ${message}`);

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { sent: true, channel: 'email', recipient };
}

/**
 * Send SMS notification
 * @param {Object} params - SMS parameters
 */
async function sendSMSNotification({ recipient, message, metadata }) {
  // TODO: Implement actual SMS sending logic (e.g., using Twilio, AWS SNS, etc.)
  console.log(`📱 Sending SMS to ${recipient}:`);
  console.log(`   Message: ${message}`);

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 800));

  return { sent: true, channel: 'sms', recipient };
}

/**
 * Send push notification
 * @param {Object} params - Push notification parameters
 */
async function sendPushNotification({ userId, title, message, metadata }) {
  // TODO: Implement actual push notification logic (e.g., using Firebase, OneSignal, etc.)
  console.log(`🔔 Sending push notification to user ${userId}:`);
  console.log(`   Title: ${title}`);
  console.log(`   Message: ${message}`);

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 600));

  return { sent: true, channel: 'push', userId };
}

/**
 * Send webhook notification
 * @param {Object} params - Webhook parameters
 */
async function sendWebhookNotification({ recipient, data }) {
  // TODO: Implement actual webhook sending logic (e.g., using axios, fetch, etc.)
  console.log(`🌐 Sending webhook to ${recipient}:`);
  console.log(`   Data:`, data);

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 1200));

  return { sent: true, channel: 'webhook', recipient };
}

/**
 * Create and start the notification worker
 */
export const notificationWorker = new Worker(
  'notifications',
  processNotification,
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per 1 second
    },
  }
);

// Worker event handlers
notificationWorker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result);
});

notificationWorker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

notificationWorker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

notificationWorker.on('active', (job) => {
  console.log(`🔄 Job ${job.id} is now active`);
});

notificationWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Job ${jobId} has stalled`);
});

/**
 * Worker Service Object
 */
export const workerService = {
  /**
   * Get worker instance
   * @returns {Worker} Worker instance
   */
  getWorker() {
    return notificationWorker;
  },

  /**
   * Pause the worker
   * @returns {Promise<void>}
   */
  async pause() {
    await notificationWorker.pause();
    console.log('⏸️ Worker paused');
  },

  /**
   * Resume the worker
   * @returns {Promise<void>}
   */
  async resume() {
    await notificationWorker.resume();
    console.log('▶️ Worker resumed');
  },

  /**
   * Close the worker
   * @returns {Promise<void>}
   */
  async close() {
    await notificationWorker.close();
    console.log('🔌 Worker closed');
  },

  /**
   * Check if worker is running
   * @returns {boolean}
   */
  isRunning() {
    return notificationWorker.isRunning();
  },

  /**
   * Check if worker is paused
   * @returns {boolean}
   */
  isPaused() {
    return notificationWorker.isPaused();
  },
};

export default workerService;