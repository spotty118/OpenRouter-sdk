/**
 * In-memory cache implementation
 */
import { Cache } from '../interfaces/cache.js';
/**
 * Simple in-memory cache implementation
 */
export declare class MemoryCache<T> implements Cache<T> {
    private cache;
    private defaultTTL;
    /**
     * Create a new memory cache
     * @param defaultTTL - Default time-to-live in milliseconds (default: 1 hour)
     */
    constructor(defaultTTL?: number);
    /**
     * Retrieve a value from the cache
     * @param key - The key to retrieve
     * @returns The cached value or null if not found or expired
     */
    get(key: string): T | null;
    /**
     * Store a value in the cache
     * @param key - The key to store the value under
     * @param value - The value to store
     * @param ttl - Optional Time-To-Live in milliseconds
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Delete a value from the cache
     * @param key - The key to delete
     */
    delete(key: string): void;
    /**
     * Clear all entries from the cache
     */
    clear(): void;
}
//# sourceMappingURL=memory-cache.d.ts.map