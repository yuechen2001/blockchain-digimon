import { IRateLimiterStorage } from '../interfaces/IRateLimiterStorage';
import { createClient } from 'redis';

/**
 * Redis implementation of rate limiter storage
 * Suitable for production and distributed environments
 */
export class RedisStorage implements IRateLimiterStorage {
  private client;
  private isConnected = false;
  
  constructor(url?: string) {
    this.client = createClient({
      url: url || process.env.REDIS_URL
    });
    
    // Handle connection events
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
      this.isConnected = false;
    });
    
    this.client.on('connect', () => {
      this.isConnected = true;
    });
    
    // Connect to Redis
    this.connect().catch(err => {
      console.error('Redis initial connection error:', err);
    });
  }
  
  private async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }
  
  async increment(key: string, windowSizeInSeconds: number): Promise<number> {
    try {
      await this.connect();
      const count = await this.client.incr(key);
      
      // If this is a new key, set expiration
      if (count === 1) {
        await this.client.expire(key, windowSizeInSeconds);
      }
      
      return count;
    } catch (error) {
      console.error('Redis increment error:', error);
      return 1; // Fail open on error
    }
  }
  
  async getTtl(key: string): Promise<number> {
    try {
      await this.connect();
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error);
      return 0; // Fail open on error
    }
  }
  
  async reset(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
}
