/**
 * Cache interfaces for data storage
 */
/**
 * Cache entry with expiration metadata
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiry: number;
}
/**
 * Generic cache interface
 */
export interface Cache<T> {
    /**
     * Retrieve a value from the cache
     * @param key The key to retrieve
     * @returns The cached value or null if not found or expired
     */
    get(key: string): T | null;
    /**
     * Store a value in the cache
     * @param key The key to store the value under
     * @param value The value to store
     * @param ttl Optional Time-To-Live in milliseconds
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Delete a value from the cache
     * @param key The key to delete
     */
    delete(key: string): void;
    /**
     * Clear all entries from the cache
     */
    clear(): void;
}
//# sourceMappingURL=cache.d.ts.map