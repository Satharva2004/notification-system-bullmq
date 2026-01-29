import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Redis Connection Manager
 * Provides a singleton Redis connection for the application
 */
class RedisConnection {
  constructor() {
    this.client = null;
  }

  /**
   * Initialize Redis connection
   * @returns {Redis} Redis client instance
   */
  connect() {
    if (this.client) {
      return this.client;
    }

    const redisConfig = {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.client = new Redis(redisConfig);

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });

    this.client.on('ready', () => {
      console.log('🚀 Redis is ready to accept commands');
    });

    return this.client;
  }

  /**
   * Get the Redis client instance
   * @returns {Redis} Redis client instance
   */
  getClient() {
    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      console.log('🔌 Redis disconnected');
    }
  }
}

// Export singleton instance
const redisConnection = new RedisConnection();
export default redisConnection;
