import Redis from 'ioredis';
import type { DetectedLanguage, LanguageDetectionResult } from './LanguageDetectionEngine';
import type { ValidationResult } from './ResponseValidator';

const REDIS_DISABLED = process.env.REDIS_DISABLED === 'true';

const redis = REDIS_DISABLED 
  ? null 
  : new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 0,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null,
    });

if (redis) {
  redis.on('error', (err) => {
    // Silently ignore Redis errors
  });

  redis.connect().catch(err => {
    console.log('[PERFORMANCE] Redis unavailable, caching disabled');
  });
} else {
  console.log('[PERFORMANCE] Redis disabled via REDIS_DISABLED env var');
}

/**
 * Performance Optimizer - Caching and optimization utilities
 */
export class PerformanceOptimizer {
  private readonly LANG_CACHE_PREFIX = 'vaktaai:lang_cache:';
  private readonly VAL_CACHE_PREFIX = 'vaktaai:val_cache:';
  private readonly LANG_CACHE_TTL = 3600; // 1 hour
  private readonly VAL_CACHE_TTL = 1800; // 30 minutes

  /**
   * Cache language detection result
   */
  async cacheLanguageDetection(
    text: string,
    result: LanguageDetectionResult
  ): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      const key = this.getLanguageCacheKey(text);
      const value = JSON.stringify(result);
      
      await redis.setex(key, this.LANG_CACHE_TTL, value);
      console.log('[PERF CACHE] ✅ Cached language detection');
    } catch (error) {
      console.error('[PERF CACHE] Error caching language detection:', error);
    }
  }

  /**
   * Get cached language detection result
   */
  async getCachedLanguageDetection(text: string): Promise<LanguageDetectionResult | null> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return null;
    }

    try {
      const key = this.getLanguageCacheKey(text);
      const cached = await redis.get(key);
      
      if (cached) {
        console.log('[PERF CACHE] ⚡ Language detection served from cache');
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[PERF CACHE] Error getting cached language detection:', error);
      return null;
    }
  }

  /**
   * Cache validation result
   */
  async cacheValidation(
    response: string,
    context: string,
    result: ValidationResult
  ): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      const key = this.getValidationCacheKey(response, context);
      const value = JSON.stringify(result);
      
      await redis.setex(key, this.VAL_CACHE_TTL, value);
      console.log('[PERF CACHE] ✅ Cached validation result');
    } catch (error) {
      console.error('[PERF CACHE] Error caching validation:', error);
    }
  }

  /**
   * Get cached validation result
   */
  async getCachedValidation(
    response: string,
    context: string
  ): Promise<ValidationResult | null> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return null;
    }

    try {
      const key = this.getValidationCacheKey(response, context);
      const cached = await redis.get(key);
      
      if (cached) {
        console.log('[PERF CACHE] ⚡ Validation served from cache');
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('[PERF CACHE] Error getting cached validation:', error);
      return null;
    }
  }

  /**
   * Batch language detection (optimize multiple detections)
   */
  async batchLanguageDetection(
    texts: string[]
  ): Promise<Map<string, LanguageDetectionResult | null>> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return new Map();
    }

    const results = new Map<string, LanguageDetectionResult | null>();

    try {
      // Get all keys
      const keys = texts.map(t => this.getLanguageCacheKey(t));
      
      // Batch get from Redis
      const cached = await redis.mget(...keys);
      
      for (let i = 0; i < texts.length; i++) {
        if (cached[i]) {
          results.set(texts[i], JSON.parse(cached[i] as string));
        } else {
          results.set(texts[i], null);
        }
      }
      
      const hitCount = Array.from(results.values()).filter(v => v !== null).length;
      if (hitCount > 0) {
        console.log(`[PERF CACHE] ⚡ Batch cache hits: ${hitCount}/${texts.length}`);
      }
      
      return results;
    } catch (error) {
      console.error('[PERF CACHE] Error in batch language detection:', error);
      return new Map();
    }
  }

  /**
   * Clear all performance caches
   */
  async clearCaches(): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      const langKeys = await this.scanKeys(this.LANG_CACHE_PREFIX);
      const valKeys = await this.scanKeys(this.VAL_CACHE_PREFIX);
      
      const allKeys = [...langKeys, ...valKeys];
      
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
        console.log(`[PERF CACHE] Cleared ${allKeys.length} cache entries`);
      }
    } catch (error) {
      console.error('[PERF CACHE] Error clearing caches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    languageCache: { size: number; hitRate?: number };
    validationCache: { size: number; hitRate?: number };
    status: string;
  }> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return {
        languageCache: { size: 0 },
        validationCache: { size: 0 },
        status: 'disconnected'
      };
    }

    try {
      const langKeys = await this.scanKeys(this.LANG_CACHE_PREFIX);
      const valKeys = await this.scanKeys(this.VAL_CACHE_PREFIX);
      
      return {
        languageCache: { size: langKeys.length },
        validationCache: { size: valKeys.length },
        status: 'connected'
      };
    } catch (error) {
      console.error('[PERF CACHE] Error getting cache stats:', error);
      return {
        languageCache: { size: 0 },
        validationCache: { size: 0 },
        status: 'error'
      };
    }
  }

  /**
   * Warmup cache with common queries
   */
  async warmupCache(commonQueries: Array<{ text: string; result: LanguageDetectionResult }>): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      for (const query of commonQueries) {
        await this.cacheLanguageDetection(query.text, query.result);
      }
      
      console.log(`[PERF CACHE] Warmed up cache with ${commonQueries.length} entries`);
    } catch (error) {
      console.error('[PERF CACHE] Error warming up cache:', error);
    }
  }

  // Helper methods
  private getLanguageCacheKey(text: string): string {
    // Use first 100 chars for key to avoid extremely long keys
    const textKey = text.substring(0, 100).replace(/\s+/g, '_');
    return `${this.LANG_CACHE_PREFIX}${this.hashString(textKey)}`;
  }

  private getValidationCacheKey(response: string, context: string): string {
    const combined = response.substring(0, 100) + '::' + context.substring(0, 50);
    return `${this.VAL_CACHE_PREFIX}${this.hashString(combined)}`;
  }

  private async scanKeys(prefix: string): Promise<string[]> {
    if (!redis) return [];
    
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    return keys;
  }

  private hashString(str: string): string {
    // Simple hash function for cache keys
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Metrics Tracker - Track system performance metrics
 */
export class MetricsTracker {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a metric value
   */
  record(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    
    const values = this.metrics.get(metric)!;
    values.push(value);
    
    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getStats(metric: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    const entries = Array.from(this.metrics.entries());
    for (const [metric, _] of entries) {
      result[metric] = this.getStats(metric);
    }
    
    return result;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    console.log('\n[PERFORMANCE METRICS SUMMARY]');
    console.log('=' .repeat(50));
    
    const entries = Array.from(this.metrics.entries());
    for (const [metric, _] of entries) {
      const stats = this.getStats(metric);
      if (stats) {
        console.log(`\n${metric}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Avg: ${stats.avg.toFixed(2)}ms`);
        console.log(`  P50: ${stats.p50}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
        console.log(`  Range: ${stats.min}ms - ${stats.max}ms`);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

export const performanceOptimizer = new PerformanceOptimizer();
export const metricsTracker = new MetricsTracker();
