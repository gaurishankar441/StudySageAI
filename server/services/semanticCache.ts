import Redis from 'ioredis';
import { embeddingService } from '../embeddingService';

// Check if Redis is explicitly disabled
const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true';

// Redis client setup
const redis = REDIS_DISABLED 
  ? null 
  : new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 0, // Don't retry failed connections
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry
    });

// Suppress Redis error logs
if (redis) {
  redis.on('error', (err) => {
    // Silently ignore Redis errors - caching will be disabled
  });

  // Connect to Redis
  redis.connect().catch(err => {
    console.log('[CACHE] Redis unavailable, caching disabled');
  });
} else {
  console.log('[CACHE] Redis disabled via REDIS_DISABLED env var');
}

export class SemanticCache {
  private readonly SIMILARITY_THRESHOLD = 0.95; // 95% similar = cache hit
  private readonly TTL = 3600; // 1 hour cache
  private readonly MAX_CACHE_SIZE = 1000; // Max cached queries
  private readonly MAX_SCAN_ENTRIES = 200; // Max entries to check for similarity (performance)
  private readonly CACHE_PREFIX = 'vaktaai:cache:'; // Namespace for VaktaAI cache
  
  // Get cache keys using SCAN with limit (non-blocking, performance-optimized)
  private async scanCacheKeys(maxEntries?: number): Promise<string[]> {
    if (!redis) return [];
    
    const keys: string[] = [];
    let cursor = '0';
    const limit = maxEntries || this.MAX_SCAN_ENTRIES;
    
    do {
      const result = await redis.scan(cursor, 'MATCH', `${this.CACHE_PREFIX}*`, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
      
      // Stop if we've scanned enough entries for similarity check
      if (keys.length >= limit) {
        break;
      }
    } while (cursor !== '0');
    
    return keys.slice(0, limit); // Return at most 'limit' entries
  }
  
  async check(query: string): Promise<string | null> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return null; // Redis not available
    }
    
    const startTime = Date.now();
    
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Search cached queries (non-blocking SCAN)
      const cachedKeys = await this.scanCacheKeys();
      
      if (cachedKeys.length === 0) {
        console.log('[CACHE] Empty cache');
        return null;
      }
      
      // Check similarity with cached queries
      for (const key of cachedKeys) {
        const cached = await redis.hgetall(key);
        if (!cached.embedding) continue;
        
        // Parse stored embedding
        const cachedEmbedding = JSON.parse(cached.embedding);
        
        // Calculate dot-product similarity (for msmarco model)
        const similarity = this.dotProductSimilarity(queryEmbedding, cachedEmbedding);
        
        if (similarity > this.SIMILARITY_THRESHOLD) {
          console.log(`[CACHE HIT] ✅ Similarity: ${similarity.toFixed(3)}, Latency: ${Date.now() - startTime}ms`);
          
          // Update TTL on hit
          await redis.expire(key, this.TTL);
          
          return cached.response;
        }
      }
      
      console.log(`[CACHE MISS] ❌ Checked ${cachedKeys.length} entries in ${Date.now() - startTime}ms`);
      return null;
    } catch (error) {
      console.error('[CACHE] Error checking cache:', error);
      return null;
    }
  }
  
  async store(query: string, response: string) {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return; // Redis not available
    }
    
    try {
      // Enforce max cache size using SCAN (scan all for accurate count)
      const cacheKeys = await this.scanCacheKeys(Infinity); // Scan all entries for eviction
      if (cacheKeys.length >= this.MAX_CACHE_SIZE) {
        // Remove oldest key (first in scan result, based on timestamp in key)
        const oldestKey = cacheKeys[0];
        if (oldestKey) {
          await redis.del(oldestKey);
          console.log(`[CACHE] LRU eviction: removed ${oldestKey} (${cacheKeys.length}/${this.MAX_CACHE_SIZE} entries)`);
        }
      }
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const cacheKey = `${this.CACHE_PREFIX}${Date.now()}:${Math.random().toString(36).substring(7)}`;
      
      await redis.hset(cacheKey, {
        query,
        embedding: JSON.stringify(queryEmbedding),
        response,
        timestamp: Date.now(),
      });
      
      await redis.expire(cacheKey, this.TTL);
      
      console.log(`[CACHE STORE] ✅ Cached query (TTL: ${this.TTL}s)`);
    } catch (error) {
      console.error('[CACHE] Error storing in cache:', error);
    }
  }
  
  // Calculate dot-product similarity between two vectors
  // Used for msmarco-distilbert model which uses dot-product similarity
  private dotProductSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  // Clear entire cache (using SCAN)
  async clear() {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }
    
    const keys = await this.scanCacheKeys(Infinity); // Scan all entries
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE] Cleared ${keys.length} cached queries`);
    }
  }
  
  // Get cache statistics (using SCAN)
  async getStats() {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return { size: 0, status: 'disconnected' };
    }
    
    const keys = await this.scanCacheKeys(Infinity); // Scan all for stats
    return {
      size: keys.length,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.TTL,
      threshold: this.SIMILARITY_THRESHOLD,
      status: 'connected'
    };
  }
}

// Singleton instance
export const semanticCache = new SemanticCache();
