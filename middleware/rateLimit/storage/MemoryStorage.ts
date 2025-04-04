import { IRateLimiterStorage } from '../interfaces/IRateLimiterStorage';

interface StorageRecord {
  count: number;
  expires: number;
}

/**
 * In-memory implementation of rate limiter storage
 * Note: This resets on deployments and is not suitable for multi-server deployments
 */
export class MemoryStorage implements IRateLimiterStorage {
  private storage = new Map<string, StorageRecord>();
  
  async increment(key: string, windowSizeInSeconds: number): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const record = this.storage.get(key);
    
    // If no record exists or it has expired, create a new one
    if (!record || record.expires <= now) {
      const expires = now + windowSizeInSeconds;
      this.storage.set(key, { count: 1, expires });
      return 1;
    }
    
    // Increment the existing record
    record.count += 1;
    this.storage.set(key, record);
    return record.count;
  }
  
  async getTtl(key: string): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const record = this.storage.get(key);
    
    if (!record) {
      return 0;
    }
    
    return Math.max(0, record.expires - now);
  }
  
  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }
}
