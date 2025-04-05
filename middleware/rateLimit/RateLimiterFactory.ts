import { IRateLimiterStrategy } from './interfaces/IRateLimiterStrategy';
import { IRateLimiterStorage } from './interfaces/IRateLimiterStorage';
import { IKeyGenerator } from './interfaces/IKeyGenerator';
import { MemoryStorage } from './storage/MemoryStorage';
import { RedisStorage } from './storage/RedisStorage';
import { FixedWindowStrategy } from './strategies/FixedWindowStrategy';
import { IpKeyGenerator, IpPathKeyGenerator, AuthTokenKeyGenerator } from './strategies/keyGenerators';

export type StorageType = 'memory' | 'redis';
export type KeyGeneratorType = 'ip' | 'ip-path' | 'auth';

export interface RateLimiterOptions {
  /**
   * Type of storage to use
   */
  storageType?: StorageType;
  
  /**
   * Redis URL if using Redis storage
   */
  redisUrl?: string;
  
  /**
   * Window size in seconds
   */
  windowSeconds: number;
  
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  
  /**
   * Type of key generator to use
   */
  keyGeneratorType?: KeyGeneratorType;
  
  /**
   * Custom error message when rate limit is exceeded
   */
  message?: string;
  
  /**
   * Prefix for storage keys
   */
  keyPrefix?: string;
  
  /**
   * Header name for auth token key generator
   */
  authHeaderName?: string;
}

/**
 * Factory class for creating rate limiters
 * Following the Factory pattern and Dependency Inversion Principle
 */
export class RateLimiterFactory {
  /**
   * Create a rate limiter strategy based on options
   */
  static createStrategy(options: RateLimiterOptions): IRateLimiterStrategy {
    // Create storage
    const storage = this.createStorage(options);
    
    // Create key generator
    const keyGenerator = this.createKeyGenerator(options);
    
    // Create and return strategy
    return new FixedWindowStrategy(
      storage,
      {
        windowSeconds: options.windowSeconds,
        maxRequests: options.maxRequests,
        message: options.message
      },
      keyGenerator
    );
  }
  
  /**
   * Create a storage implementation
   */
  private static createStorage(options: RateLimiterOptions): IRateLimiterStorage {
    const storageType = options.storageType || 'memory';
    
    if (storageType === 'redis') {
      // Use REDIS_URL environment variable
      const redisUrl = process.env.REDIS_URL || options.redisUrl;
      return new RedisStorage(redisUrl);
    }
    
    // Default to memory storage
    return new MemoryStorage();
  }
  
  /**
   * Create a key generator
   */
  private static createKeyGenerator(options: RateLimiterOptions): IKeyGenerator {
    const keyGeneratorType = options.keyGeneratorType || 'ip';
    const keyPrefix = options.keyPrefix || 'ratelimit';
    
    switch (keyGeneratorType) {
      case 'ip-path':
        return new IpPathKeyGenerator(keyPrefix);
      case 'auth':
        return new AuthTokenKeyGenerator(keyPrefix, options.authHeaderName);
      case 'ip':
      default:
        return new IpKeyGenerator(keyPrefix);
    }
  }
}
