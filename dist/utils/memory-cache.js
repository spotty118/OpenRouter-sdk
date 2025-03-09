"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
/**
 * Simple in-memory cache implementation
 */
class MemoryCache {
    cache = new Map();
    defaultTTL;
    /**
     * Create a new memory cache
     * @param defaultTTL - Default time-to-live in milliseconds (default: 1 hour)
     */
    constructor(defaultTTL = 60 * 60 * 1000) {
        this.defaultTTL = defaultTTL;
    }
    /**
     * Retrieve a value from the cache
     * @param key - The key to retrieve
     * @returns The cached value or null if not found or expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if entry is expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Store a value in the cache
     * @param key - The key to store the value under
     * @param value - The value to store
     * @param ttl - Optional Time-To-Live in milliseconds
     */
    set(key, value, ttl) {
        const expiry = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            expiry
        });
    }
    /**
     * Delete a value from the cache
     * @param key - The key to delete
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all entries from the cache
     */
    clear() {
        this.cache.clear();
    }
}
exports.MemoryCache = MemoryCache;
