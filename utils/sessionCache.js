/**
 * Session Cache Utility
 * Provides caching for historical session data to improve performance
 * Uses both memory cache and localStorage for persistence
 */

const CACHE_VERSION = "v1";
const CACHE_PREFIX = `monaco_session_cache_${CACHE_VERSION}_`;
const MAX_MEMORY_CACHE_SIZE = 5; // Keep up to 5 sessions in memory
const MAX_LOCALSTORAGE_SIZE = 3; // Keep up to 3 sessions in localStorage

class SessionCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheOrder = []; // Track access order for LRU eviction
  }

  /**
   * Generate cache key for a session
   */
  getCacheKey(sessionPath) {
    return `${CACHE_PREFIX}${sessionPath.replace(/\//g, "_")}`;
  }

  /**
   * Check if session data is in cache
   */
  has(sessionPath) {
    // Check memory cache first
    if (this.memoryCache.has(sessionPath)) {
      return true;
    }

    // Check localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      const key = this.getCacheKey(sessionPath);
      return localStorage.getItem(key) !== null;
    }

    return false;
  }

  /**
   * Get session data from cache
   */
  get(sessionPath) {
    // Try memory cache first (fastest)
    if (this.memoryCache.has(sessionPath)) {
      this.updateAccessOrder(sessionPath);
      return this.memoryCache.get(sessionPath);
    }

    // Try localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const key = this.getCacheKey(sessionPath);
        const cached = localStorage.getItem(key);
        if (cached) {
          const data = JSON.parse(cached);
          
          // Move to memory cache for faster subsequent access
          this.set(sessionPath, data);
          
          return data;
        }
      } catch (e) {
        console.error("Error reading from localStorage cache:", e);
        // Clear corrupted cache entry
        this.remove(sessionPath);
      }
    }

    return null;
  }

  /**
   * Store session data in cache
   */
  set(sessionPath, data) {
    // Store in memory cache
    this.memoryCache.set(sessionPath, data);
    this.updateAccessOrder(sessionPath);
    
    // Enforce memory cache size limit (LRU eviction)
    if (this.cacheOrder.length > MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = this.cacheOrder.shift();
      this.memoryCache.delete(oldestKey);
    }

    // Store in localStorage (async, best effort)
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const key = this.getCacheKey(sessionPath);
        const serialized = JSON.stringify(data);
        
        // Check size (localStorage has ~5-10MB limit)
        const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
        
        if (sizeInMB < 5) { // Only cache if less than 5MB
          localStorage.setItem(key, serialized);
          
          // Manage localStorage cache size
          this.enforceLocalStorageLimit();
        }
      } catch (e) {
        if (e.name === "QuotaExceededError") {
          console.warn("localStorage quota exceeded, clearing old cache");
          this.clearOldestLocalStorage();
        } else {
          console.error("Error writing to localStorage cache:", e);
        }
      }
    }
  }

  /**
   * Remove session from cache
   */
  remove(sessionPath) {
    // Remove from memory
    this.memoryCache.delete(sessionPath);
    this.cacheOrder = this.cacheOrder.filter((key) => key !== sessionPath);

    // Remove from localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const key = this.getCacheKey(sessionPath);
        localStorage.removeItem(key);
      } catch (e) {
        console.error("Error removing from localStorage cache:", e);
      }
    }
  }

  /**
   * Clear all cached sessions
   */
  clear() {
    // Clear memory cache
    this.memoryCache.clear();
    this.cacheOrder = [];

    // Clear localStorage cache
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error("Error clearing localStorage cache:", e);
      }
    }
  }

  /**
   * Update access order for LRU caching
   */
  updateAccessOrder(sessionPath) {
    // Remove from current position
    this.cacheOrder = this.cacheOrder.filter((key) => key !== sessionPath);
    // Add to end (most recent)
    this.cacheOrder.push(sessionPath);
  }

  /**
   * Enforce localStorage cache size limit
   */
  enforceLocalStorageLimit() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(CACHE_PREFIX)
      );

      if (keys.length > MAX_LOCALSTORAGE_SIZE) {
        // Find oldest entries by checking the order
        const toRemove = keys.length - MAX_LOCALSTORAGE_SIZE;
        for (let i = 0; i < toRemove; i++) {
          if (keys[i]) {
            localStorage.removeItem(keys[i]);
          }
        }
      }
    } catch (e) {
      console.error("Error enforcing localStorage limit:", e);
    }
  }

  /**
   * Clear oldest entry from localStorage
   */
  clearOldestLocalStorage() {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(CACHE_PREFIX)
      );

      if (keys.length > 0) {
        localStorage.removeItem(keys[0]);
      }
    } catch (e) {
      console.error("Error clearing oldest localStorage entry:", e);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    
    let localStorageSize = 0;
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith(CACHE_PREFIX)
        );
        localStorageSize = keys.length;
      } catch (e) {
        console.error("Error getting cache stats:", e);
      }
    }

    return {
      memorySize,
      localStorageSize,
      totalSize: memorySize + localStorageSize,
    };
  }
}

// Export singleton instance
const sessionCache = new SessionCache();
export default sessionCache;

