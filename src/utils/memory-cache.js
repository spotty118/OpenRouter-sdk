/**
 * Simple in-memory cache implementation
 */

/**
 * MemoryCache provides a simple in-memory caching mechanism with TTL support
 */
export class MemoryCache {
  /**
   * Create a new memory cache
   * 
   * @param {number} ttl - Time to live in milliseconds (0 for no expiration)
   */
  constructor(ttl = 0) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Set a value in the cache
   * 
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttl - Optional TTL override for this specific item
   * @returns {boolean} True if the value was set successfully
   */
  set(key, value, ttl = this.ttl) {
    if (!key) return false;
    
    const item = {
      value,
      expires: ttl > 0 ? Date.now() + ttl : 0
    };
    
    this.cache.set(key, item);
    return true;
  }

  /**
   * Get a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {any} The cached value or null if not found or expired
   */
  get(key) {
    if (!key || !this.cache.has(key)) return null;
    
    const item = this.cache.get(key);
    
    // Check if the item has expired
    if (item.expires > 0 && item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Check if a key exists in the cache and is not expired
   * 
   * @param {string} key - The cache key
   * @returns {boolean} True if the key exists and is not expired
   */
  has(key) {
    if (!key || !this.cache.has(key)) return false;
    
    const item = this.cache.get(key);
    
    // Check if the item has expired
    if (item.expires > 0 && item.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a value from the cache
   * 
   * @param {string} key - The cache key
   * @returns {boolean} True if the key was deleted
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get the number of items in the cache
   * 
   * @returns {number} The number of items in the cache
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   * 
   * @returns {Array<string>} Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Remove all expired items from the cache
   * 
   * @returns {number} The number of items removed
   */
  prune() {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expires > 0 && item.expires < now) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
}

export default MemoryCache;
