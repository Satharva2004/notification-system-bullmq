import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notificationService } from '../services/notificationService.js';
import { queueService } from '../services/queueService.js';
import { AppError } from '../middlewares/errorHandler.js';

export const notificationController = {
    // Get all notifications
    getAllNotifications: asyncHandler(async (req, res) => {
        const notifications = await notificationService.getAll();
        res.status(200).json({
            success: true,
            data: notifications,
        });
    }),

    // Get notification by ID
    getNotificationById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const notification = await notificationService.getById(id);

        if (!notification) {
            throw new AppError('Notification not found', 404);
        }

        res.status(200).json({
            success: true,
            data: notification,
        });
    }),

    // Create and queue new notification
    createNotification: asyncHandler(async (req, res) => {
        const {
            userId,
            type,
            title,
            message,
            channel = 'email', // email, sms, push, webhook
            recipient,
            priority = 1,
            delay = 0,
            metadata = {},
        } = req.body;

        // Validate required fields
        if (!userId || !title || !message || !recipient) {
            throw new AppError('Missing required fields: userId, title, message, recipient', 400);
        }

        // Validate channel
        const validChannels = ['email', 'sms', 'push', 'webhook'];
        if (!validChannels.includes(channel)) {
            throw new AppError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`, 400);
        }

        const notificationData = {
            userId,
            type,
            title,
            message,
            channel,
            recipient,
            metadata,
        };

        // Add to queue
        let job;
        if (delay > 0) {
            // Schedule for later
            job = await queueService.scheduleNotification(notificationData, delay);
        } else {
            // Send immediately
            job = await queueService.addNotification(notificationData, { priority });
        }

        res.status(201).json({
            success: true,
            message: 'Notification queued successfully',
            data: {
                jobId: job.id,
                status: 'queued',
                notificationData,
            },
        });
    }),

    // Send bulk notifications
    sendBulkNotifications: asyncHandler(async (req, res) => {
        const { notifications } = req.body;

        if (!Array.isArray(notifications) || notifications.length === 0) {
            throw new AppError('Notifications array is required and must not be empty', 400);
        }

        // Validate each notification
        for (const notification of notifications) {
            if (!notification.userId || !notification.title || !notification.message || !notification.recipient) {
                throw new AppError('Each notification must have userId, title, message, and recipient', 400);
            }
        }

        const jobs = await queueService.addBulkNotifications(notifications);

        res.status(201).json({
            success: true,
            message: `${jobs.length} notifications queued successfully`,
            data: {
                jobIds: jobs.map(job => job.id),
                count: jobs.length,
            },
        });
    }),

    // Get job status
    getJobStatus: asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        const job = await queueService.getJob(jobId);

        if (!job) {
            throw new AppError('Job not found', 404);
        }

        const state = await job.getState();
        const progress = job.progress;

        res.status(200).json({
            success: true,
            data: {
                jobId: job.id,
                state,
                progress,
                data: job.data,
                attemptsMade: job.attemptsMade,
                finishedOn: job.finishedOn,
                processedOn: job.processedOn,
            },
        });
    }),

    // Get queue statistics
    getQueueStats: asyncHandler(async (req, res) => {
        const stats = await queueService.getQueueStats();

        res.status(200).json({
            success: true,
            data: stats,
        });
    }),

    // Update notification
    updateNotification: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const data = req.body;

        const notification = await notificationService.update(id, data);

        res.status(200).json({
            success: true,
            message: 'Notification updated successfully',
            data: notification,
        });
    }),

    // Delete notification
    deleteNotification: asyncHandler(async (req, res) => {
        const { id } = req.params;

        await notificationService.delete(id);

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully',
        });
    }),

    // Mark notification as read
    markAsRead: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const notification = await notificationService.markAsRead(id);

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: notification,
        });
    }),

    // Cancel a queued job
    cancelJob: asyncHandler(async (req, res) => {
        const { jobId } = req.params;

        await queueService.removeJob(jobId);

        res.status(200).json({
            success: true,
            message: 'Job cancelled successfully',
        });
    }),
};

