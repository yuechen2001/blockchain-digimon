import { NextRequest, NextResponse } from 'next/server';
import { IRateLimiterStrategy, RateLimitResult } from '../interfaces/IRateLimiterStrategy';
import { IRateLimiterStorage } from '../interfaces/IRateLimiterStorage';
import { IKeyGenerator } from '../interfaces/IKeyGenerator';
import { IpKeyGenerator } from './keyGenerators';

export interface FixedWindowOptions {
  /**
   * Window size in seconds
   */
  windowSeconds: number;
  
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  
  /**
   * Custom message when rate limit is exceeded
   */
  message?: string;
}

/**
 * Fixed Window rate limiting strategy
 * Allows a fixed number of requests in a time window
 */
export class FixedWindowStrategy implements IRateLimiterStrategy {
  private storage: IRateLimiterStorage;
  private keyGenerator: IKeyGenerator;
  private options: FixedWindowOptions;
  
  constructor(
    storage: IRateLimiterStorage,
    options: FixedWindowOptions,
    keyGenerator?: IKeyGenerator
  ) {
    this.storage = storage;
    this.options = options;
    this.keyGenerator = keyGenerator || new IpKeyGenerator();
  }
  
  async check(request: NextRequest): Promise<RateLimitResult> {
    const key = this.keyGenerator.generateKey(request);
    
    // Get current request count
    const count = await this.storage.increment(key, this.options.windowSeconds);
    
    // Get TTL for the key
    const ttl = await this.storage.getTtl(key);
    
    // Calculate remaining requests
    const remaining = Math.max(0, this.options.maxRequests - count);
    
    // Determine if request is allowed
    const allowed = count <= this.options.maxRequests;
    
    // Current timestamp in seconds
    const now = Math.floor(Date.now() / 1000);
    
    const result: RateLimitResult = {
      allowed,
      limit: this.options.maxRequests,
      remaining,
      reset: now + ttl
    };
    
    // If rate limited, create a response
    if (!allowed) {
      const message = this.options.message || 'Rate limit exceeded. Please try again later.';
      
      result.response = NextResponse.json(
        { error: 'Too Many Requests', message, retryAfter: ttl },
        { status: 429, headers: {
          'Retry-After': ttl.toString()
        }}
      );
    }
    
    return result;
  }
}
