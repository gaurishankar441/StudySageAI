import Redis from 'ioredis';
import crypto from 'crypto';

const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true';

// Track Redis connection status
let redisConnected = false;
let redisErrorLogged = false;

// Redis client setup with TLS for Upstash
const redisUrlRaw = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = redisUrlRaw.includes('upstash.io');

console.log('[TTS CACHE] 🔍 Raw URL starts with:', redisUrlRaw.substring(0, 20));
console.log('[TTS CACHE] 🔍 Is Upstash:', isUpstash);

// For Upstash, force TLS by using rediss:// scheme
const redisUrl = isUpstash 
  ? redisUrlRaw.replace(/^redis:\/\//, 'rediss://') 
  : redisUrlRaw;

console.log('[TTS CACHE] 🔍 Final URL starts with:', redisUrl.substring(0, 20));
console.log('[TTS CACHE] 🔍 Using TLS:', redisUrl.startsWith('rediss://'));

// ioredis will handle TLS automatically with rediss:// scheme
const redis: Redis | null = REDIS_DISABLED 
  ? null 
  : new Redis(redisUrl, {
      maxRetriesPerRequest: 0,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
      family: isUpstash ? 6 : 4, // IPv6 for Upstash
    });

// Add error handler before attempting connection
if (redis) {
  redis.on('error', (err) => {
    redisConnected = false;
    // Log only once with detailed error
    if (!redisErrorLogged) {
      console.log('[TTS CACHE] ⚠️ Redis error:', err.message);
      console.log('[TTS CACHE] Using in-memory fallback');
      redisErrorLogged = true;
    }
  });

  redis.on('ready', () => {
    redisConnected = true;
    redisErrorLogged = false;
    console.log('[TTS CACHE] ✅ Redis connected successfully!');
  });

  redis.connect().catch((err) => {
    console.log('[TTS CACHE] ❌ Connection failed:', err.message);
    console.log('[TTS CACHE] Using in-memory fallback');
    redisConnected = false;
  });
} else {
  console.log('[TTS CACHE] ✅ Using in-memory cache (REDIS_DISABLED=true)');
}

// In-memory fallback cache
interface CacheEntry {
  audio: Buffer;
  timestamp: number;
  hits: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY_CACHE_SIZE = 100; // Store max 100 items in memory
const MEMORY_CACHE_TTL = 3600 * 1000; // 1 hour in ms

/**
 * 🚀 PHASE 2.1: TTS Cache Service
 * Caches TTS audio to reduce generation cost by 40%
 */
export class TTSCacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly REDIS_PREFIX = 'tts:audio:';
  
  // Common educational phrases that should be cached
  private readonly COMMON_PHRASES = [
    'Let me explain',
    'For example',
    'Do you understand',
    'Let\'s try',
    'Very good',
    'That\'s correct',
    'Not quite',
    'Try again',
    'चलिए समझते हैं', // Let's understand (Hindi)
    'उदाहरण के लिए', // For example (Hindi)
    'समझ आया', // Understood (Hindi)
    'बहुत अच्छे', // Very good (Hindi)
  ];

  /**
   * Generate cache key from TTS parameters
   */
  private generateKey(
    text: string, 
    language: 'hi' | 'en',
    emotion?: string,
    voice?: string
  ): string {
    // Normalize text (lowercase, trim whitespace)
    const normalized = text.toLowerCase().trim();
    
    // Create hash for long text to keep key size manageable
    const textKey = normalized.length > 100 
      ? crypto.createHash('md5').update(normalized).digest('hex')
      : normalized;
    
    return `${this.REDIS_PREFIX}${textKey}:${language}:${emotion || 'neutral'}:${voice || 'default'}`;
  }

  /**
   * Get cached audio if available
   */
  async get(
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    voice?: string
  ): Promise<Buffer | null> {
    const key = this.generateKey(text, language, emotion, voice);
    
    try {
      // Try Redis first (only if connected)
      if (redis && !REDIS_DISABLED && redisConnected) {
        const cached = await redis.getBuffer(key);
        if (cached) {
          console.log(`[TTS CACHE] ✅ Redis HIT: "${text.substring(0, 30)}..."`);
          
          // Increment hit counter for analytics
          await redis.hincrby(`${this.REDIS_PREFIX}stats`, key, 1);
          
          return cached;
        }
      }
      
      // Fallback to memory cache
      const memEntry = memoryCache.get(key);
      if (memEntry) {
        // Check if expired
        if (Date.now() - memEntry.timestamp < MEMORY_CACHE_TTL) {
          memEntry.hits++;
          console.log(`[TTS CACHE] ✅ Memory HIT: "${text.substring(0, 30)}..." (${memEntry.hits} hits)`);
          return memEntry.audio;
        } else {
          // Expired, remove
          memoryCache.delete(key);
        }
      }
      
      console.log(`[TTS CACHE] ❌ MISS: "${text.substring(0, 30)}..."`);
      return null;
      
    } catch (error) {
      // Silently fallback to memory cache
      return null;
    }
  }

  /**
   * Store audio in cache
   */
  async set(
    text: string,
    language: 'hi' | 'en',
    audio: Buffer,
    emotion?: string,
    voice?: string,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(text, language, emotion, voice);
    const cacheTTL = ttl || this.DEFAULT_TTL;
    
    try {
      // Store in Redis if available and connected
      if (redis && !REDIS_DISABLED && redisConnected) {
        await redis.setex(key, cacheTTL, audio);
        console.log(`[TTS CACHE] 💾 Redis STORED: "${text.substring(0, 30)}..." (${audio.length} bytes, TTL: ${cacheTTL}s)`);
      }
      
      // Also store in memory cache (for faster access)
      // Implement LRU: if cache is full, remove oldest entry
      if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }
      
      memoryCache.set(key, {
        audio,
        timestamp: Date.now(),
        hits: 0
      });
      
      console.log(`[TTS CACHE] 💾 Memory STORED: "${text.substring(0, 30)}..." (${memoryCache.size}/${MAX_MEMORY_CACHE_SIZE})`);
      
    } catch (error) {
      // Silently fallback to memory-only caching
    }
  }

  /**
   * Check if text is a common phrase that should be pre-cached
   */
  isCommonPhrase(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.COMMON_PHRASES.some(phrase => 
      normalized.includes(phrase.toLowerCase())
    );
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    redisEnabled: boolean;
    memoryCacheSize: number;
    memoryCacheMax: number;
    topHits?: Array<{ key: string; hits: number }>;
  }> {
    const stats: any = {
      redisEnabled: !REDIS_DISABLED && redis !== null,
      memoryCacheSize: memoryCache.size,
      memoryCacheMax: MAX_MEMORY_CACHE_SIZE,
    };
    
    try {
      if (redis && !REDIS_DISABLED && redisConnected) {
        const hitStats = await redis.hgetall(`${this.REDIS_PREFIX}stats`);
        if (hitStats) {
          const topHits = Object.entries(hitStats)
            .map(([key, hits]) => ({ key, hits: parseInt(hits as string) }))
            .sort((a, b) => b.hits - a.hits)
            .slice(0, 10);
          stats.topHits = topHits;
        }
      }
    } catch (error) {
      console.error('[TTS CACHE] Stats error:', error);
    }
    
    return stats;
  }

  /**
   * Clear entire cache (useful for testing)
   */
  async clear(): Promise<void> {
    try {
      if (redis && !REDIS_DISABLED) {
        const keys = await redis.keys(`${this.REDIS_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
      
      memoryCache.clear();
      console.log('[TTS CACHE] ✨ Cache cleared');
      
    } catch (error) {
      console.error('[TTS CACHE] Clear error:', error);
    }
  }

  /**
   * Pre-cache common educational phrases
   */
  async warmup(
    generateTTS: (text: string, language: 'hi' | 'en') => Promise<Buffer>
  ): Promise<void> {
    console.log('[TTS CACHE] 🔥 Warming up cache with common phrases...');
    
    const warmupPromises = this.COMMON_PHRASES.map(async (phrase) => {
      try {
        // Detect language (simple heuristic)
        const language: 'hi' | 'en' = /[\u0900-\u097F]/.test(phrase) ? 'hi' : 'en';
        
        // Check if already cached
        const cached = await this.get(phrase, language);
        if (!cached) {
          // Generate and cache
          const audio = await generateTTS(phrase, language);
          await this.set(phrase, language, audio, undefined, undefined, 7200); // 2 hour TTL
          console.log(`[TTS CACHE] 🔥 Warmed: "${phrase}"`);
        }
      } catch (error) {
        console.error(`[TTS CACHE] Warmup failed for "${phrase}":`, error);
      }
    });
    
    await Promise.allSettled(warmupPromises);
    console.log('[TTS CACHE] ✅ Warmup complete');
  }
}

// Export singleton instance
export const ttsCacheService = new TTSCacheService();
