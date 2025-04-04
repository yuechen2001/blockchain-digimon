import { NextRequest } from 'next/server';
import { IKeyGenerator } from '../interfaces/IKeyGenerator';

/**
 * Gets the IP address from a Next.js request
 * @param request The Next.js request
 * @returns The IP address or a fallback string
 */
function getIpAddress(request: NextRequest): string {
  // Next.js 12+ stores IP in headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Try to get from connection info (Next.js 13+)
  const ip = request.headers.get('x-real-ip');
  if (ip) {
    return ip;
  }
  
  // Fallback
  return 'unknown-ip';
}

/**
 * Generates a key based on IP address
 */
export class IpKeyGenerator implements IKeyGenerator {
  private prefix: string;
  
  constructor(prefix: string = 'ratelimit') {
    this.prefix = prefix;
  }
  
  generateKey(request: NextRequest): string {
    const ip = getIpAddress(request);
    return `${this.prefix}:ip:${ip}`;
  }
}

/**
 * Generates a key based on IP and path
 */
export class IpPathKeyGenerator implements IKeyGenerator {
  private prefix: string;
  
  constructor(prefix: string = 'ratelimit') {
    this.prefix = prefix;
  }
  
  generateKey(request: NextRequest): string {
    const ip = getIpAddress(request);
    const path = request.nextUrl.pathname;
    return `${this.prefix}:ip-path:${ip}:${path}`;
  }
}

/**
 * Generates a key based on authentication token
 * Especially useful for wallet-based authentication in blockchain apps
 */
export class AuthTokenKeyGenerator implements IKeyGenerator {
  private prefix: string;
  private headerName: string;
  
  constructor(prefix: string = 'ratelimit', headerName: string = 'authorization') {
    this.prefix = prefix;
    this.headerName = headerName;
  }
  
  generateKey(request: NextRequest): string {
    const authHeader = request.headers.get(this.headerName);
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return `${this.prefix}:token:${token}`;
    }
    
    // Fall back to IP if no token
    const ip = getIpAddress(request);
    return `${this.prefix}:ip:${ip}`;
  }
}
