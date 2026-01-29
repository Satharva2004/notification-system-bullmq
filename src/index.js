import app from './app.js';
import { config } from './config/config.js';
import redisConnection from './models/Redis.js';
import { workerService } from './services/workerService.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
    console.log(`🚀 Notification System started on port ${PORT}`);
    console.log(`📝 Environment: ${config.nodeEnv}`);
    console.log(`🔗 API Version: ${config.apiVersion}`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`${signal} signal received: closing HTTP server`);

    server.close(async () => {
        console.log('HTTP server closed');

        // Close worker
        try {
            await workerService.close();
            console.log('Worker closed');
        } catch (error) {
            console.error('Error closing worker:', error);
        }

        // Close Redis connection
        try {
            await redisConnection.disconnect();
            console.log('Redis disconnected');
        } catch (error) {
            console.error('Error disconnecting Redis:', error);
        }

        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


process.on('SIGINT', () => gracefulShutdown('SIGINT'));

