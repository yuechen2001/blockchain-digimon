import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp in seconds
  response?: NextResponse; // Optional response to return if rate limited
}

/**
 * Interface for rate limiting strategies
 */
export interface IRateLimiterStrategy {
  /**
   * Check if a request should be allowed based on rate limits
   */
  check(request: NextRequest): Promise<RateLimitResult>;
}
