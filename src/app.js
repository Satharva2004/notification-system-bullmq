import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import redisConnection from './models/Redis.js';
import { notificationWorker } from './services/workerService.js';

const app = express();

// Initialize Redis connection
redisConnection.connect();

// Worker is automatically started when imported
console.log('🔄 Notification worker initialized and running');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Notification System API',
    version: config.apiVersion,
    status: 'running',
  });
});

app.use(`/api/${config.apiVersion}/notifications`, notificationRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

export default app;
