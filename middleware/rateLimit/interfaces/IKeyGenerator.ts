import { NextRequest } from 'next/server';

/**
 * Interface for key generators used in rate limiting
 */
export interface IKeyGenerator {
  /**
   * Generate a key for rate limiting based on the request
   */
  generateKey(request: NextRequest): string;
}
