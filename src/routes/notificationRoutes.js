import express from 'express';
import { notificationController } from '../controllers/notificationController.js';

const router = express.Router();

// GET all notifications
router.get('/', notificationController.getAllNotifications);

// GET notification by ID
router.get('/:id', notificationController.getNotificationById);

// POST create new notification
router.post('/', notificationController.createNotification);

// PUT update notification
router.put('/:id', notificationController.updateNotification);

// DELETE notification
router.delete('/:id', notificationController.deleteNotification);

// PATCH mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// POST send bulk notifications
router.post('/bulk', notificationController.sendBulkNotifications);

// GET job status by job ID
router.get('/jobs/:jobId', notificationController.getJobStatus);

// GET queue statistics
router.get('/queue/stats', notificationController.getQueueStats);

// DELETE cancel a queued job
router.delete('/jobs/:jobId', notificationController.cancelJob);

export { router as notificationRoutes };
