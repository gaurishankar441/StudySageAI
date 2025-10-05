import Redis from 'ioredis';
import { embeddingService } from '../embeddingService';

// Redis client setup
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Connect to Redis
redis.connect().catch(err => {
  console.warn('[CACHE] Redis connection failed, caching disabled:', err.message);
});

export class SemanticCache {
  private readonly SIMILARITY_THRESHOLD = 0.95; // 95% similar = cache hit
  private readonly TTL = 3600; // 1 hour cache
  private readonly MAX_CACHE_SIZE = 1000; // Max cached queries
  
  async check(query: string): Promise<string | null> {
    if (!redis.status || redis.status !== 'ready') {
      return null; // Redis not available
    }
    
    const startTime = Date.now();
    
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Search cached queries (scan all cache:* keys)
      const cachedKeys = await redis.keys('cache:*');
      
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
        
        // Calculate cosine similarity
        const similarity = this.cosineSimilarity(queryEmbedding, cachedEmbedding);
        
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
    if (!redis.status || redis.status !== 'ready') {
      return; // Redis not available
    }
    
    try {
      // Enforce max cache size
      const cacheSize = await redis.dbsize();
      if (cacheSize >= this.MAX_CACHE_SIZE) {
        // Remove random key (LRU would be better, but this is simpler)
        const randomKey = (await redis.keys('cache:*'))[0];
        if (randomKey) {
          await redis.del(randomKey);
        }
      }
      
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const cacheKey = `cache:${Date.now()}:${Math.random().toString(36).substring(7)}`;
      
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
  
  // Calculate cosine similarity between two vectors
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }
    
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  // Clear entire cache
  async clear() {
    if (!redis.status || redis.status !== 'ready') {
      return;
    }
    
    const keys = await redis.keys('cache:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[CACHE] Cleared ${keys.length} cached queries`);
    }
  }
  
  // Get cache statistics
  async getStats() {
    if (!redis.status || redis.status !== 'ready') {
      return { size: 0, status: 'disconnected' };
    }
    
    const keys = await redis.keys('cache:*');
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
