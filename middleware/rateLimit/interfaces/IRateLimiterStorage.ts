/**
 * Interface for rate limiter storage implementations
 * Following the Interface Segregation Principle
 */
export interface IRateLimiterStorage {
  /**
   * Increments the request count for a key and returns the new count
   */
  increment(key: string, windowSizeInSeconds: number): Promise<number>;
  
  /**
   * Gets the time-to-live for a key in seconds
   */
  getTtl(key: string): Promise<number>;
  
  /**
   * Resets the counter for a key
   */
  reset(key: string): Promise<void>;
}
