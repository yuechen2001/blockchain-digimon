import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterFactory, RateLimiterOptions } from './RateLimiterFactory';

/**
 * Configuration for different API routes
 */
export interface RouteConfig {
  pattern: RegExp;
  method: string;
  options: RateLimiterOptions;
}

/**
 * Default rate limit configuration for all API routes
 */
const DEFAULT_RATE_LIMIT: RateLimiterOptions = {
  storageType: process.env.DEPLOY_ENV === 'production' ? 'redis' : 'memory',
  windowSeconds: 60, // 1 minute window
  maxRequests: 60,   // 60 requests per minute
  keyGeneratorType: 'ip',
  message: 'Rate limit exceeded. Please try again later.'
};

/**
 * Route configurations with specific rate limits
 */
const ROUTE_CONFIGS: RouteConfig[] = [
  // NFT minting endpoints - more restricted
  {
    pattern: /^\/api\/digimons\/mint$/,
    method: 'POST',
    options: {
      storageType: process.env.DEPLOY_ENV === 'production' ? 'redis' : 'memory',
      windowSeconds: 60,
      maxRequests: 5, // Very restricted - 5 mints per minute
      keyGeneratorType: 'auth',
      message: 'Minting rate limit exceeded. Please try again later.'
    }
  },
  // Marketplace transactions - somewhat restricted
  {
    pattern: /^\/api\/marketplace\/(buy|sell|list)/,
    method: 'POST',
    options: {
      storageType: process.env.DEPLOY_ENV === 'production' ? 'redis' : 'memory',
      windowSeconds: 60,
      maxRequests: 10, // 10 transactions per minute
      keyGeneratorType: 'auth',
      message: 'Transaction rate limit exceeded. Please try again later.'
    }
  },
  // Read-only API endpoints - less restricted
  {
    pattern: /^\/api\/(digimons|marketplace)$/,
    method: 'GET',
    options: {
      storageType: process.env.DEPLOY_ENV === 'production' ? 'redis' : 'memory',
      windowSeconds: 60,
      maxRequests: 100, // 100 reads per minute
      keyGeneratorType: 'ip',
      message: 'Too many requests. Please try again later.'
    }
  }
];

/**
 * Apply rate limiting to a request
 * @param request The incoming request
 * @returns NextResponse with rate limit headers or an error
 */
export async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  // Skip for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return null;
  }
  
  // Skip for auth API routes
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return null;
  }
  
  // Find a matching route configuration
  const matchedRoute = ROUTE_CONFIGS.find(route => 
    route.pattern.test(request.nextUrl.pathname) && 
    (route.method === 'ANY' || route.method === request.method)
  );
  
  // Use matched route config or default
  const options = matchedRoute?.options || DEFAULT_RATE_LIMIT;
  
  // Create the rate limiter using our factory
  const rateLimiter = RateLimiterFactory.createStrategy(options);
  
  // Check if the request is within limits
  const result = await rateLimiter.check(request);
  
  // If rate limited, return the response
  if (!result.allowed && result.response) {
    return result.response;
  }
  
  // For allowed requests, return null so the middleware continues
  // The middleware wrapper will add the rate limit headers to the final response
  return null;
}

/**
 * Add rate limit headers to a response
 * @param response The response to modify
 * @param result The rate limit result
 * @returns The response with rate limit headers
 */
export function addRateLimitHeaders(
  response: NextResponse, 
  result: { limit: number; remaining: number; reset: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  
  return response;
}
