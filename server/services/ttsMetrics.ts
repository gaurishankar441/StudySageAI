/**
 * 🚀 PHASE 2.4: TTS Performance Metrics & Monitoring
 * Tracks latency, cache performance, compression stats, and cost analytics
 */

interface TTSMetric {
  timestamp: Date;
  sentence: string;
  language: 'hi' | 'en';
  generationTime: number; // ms
  cached: boolean;
  compressed: boolean;
  audioSize: number; // bytes
  compressedSize?: number; // bytes if compressed
  sequence: number;
  sessionId?: string;
}

export class TTSMetricsService {
  private metrics: TTSMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Record a TTS generation metric
   */
  record(metric: Omit<TTSMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date(),
    });

    // Implement circular buffer - remove oldest if exceeds limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Get real-time performance stats
   */
  getStats(): {
    total: number;
    cacheHitRate: number;
    avgGenerationTime: number;
    avgCachedTime: number;
    avgGeneratedTime: number;
    compressionRate: number;
    avgCompressionRatio: number;
    totalAudioSize: number;
    totalCompressedSize: number;
    bandwidthSaved: number;
    recentMetrics: TTSMetric[];
  } {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        cacheHitRate: 0,
        avgGenerationTime: 0,
        avgCachedTime: 0,
        avgGeneratedTime: 0,
        compressionRate: 0,
        avgCompressionRatio: 0,
        totalAudioSize: 0,
        totalCompressedSize: 0,
        bandwidthSaved: 0,
        recentMetrics: [],
      };
    }

    const cached = this.metrics.filter(m => m.cached);
    const generated = this.metrics.filter(m => !m.cached);
    const compressed = this.metrics.filter(m => m.compressed);

    const totalAudioSize = this.metrics.reduce((sum, m) => sum + m.audioSize, 0);
    const totalCompressedSize = compressed.reduce((sum, m) => sum + (m.compressedSize || 0), 0);
    const bandwidthSaved = totalAudioSize - totalCompressedSize;

    return {
      total: this.metrics.length,
      cacheHitRate: (cached.length / this.metrics.length) * 100,
      avgGenerationTime: this.metrics.reduce((sum, m) => sum + m.generationTime, 0) / this.metrics.length,
      avgCachedTime: cached.length > 0 
        ? cached.reduce((sum, m) => sum + m.generationTime, 0) / cached.length 
        : 0,
      avgGeneratedTime: generated.length > 0
        ? generated.reduce((sum, m) => sum + m.generationTime, 0) / generated.length
        : 0,
      compressionRate: (compressed.length / this.metrics.length) * 100,
      avgCompressionRatio: compressed.length > 0
        ? compressed.reduce((sum, m) => {
            const ratio = m.compressedSize && m.audioSize 
              ? ((m.audioSize - m.compressedSize) / m.audioSize) * 100
              : 0;
            return sum + ratio;
          }, 0) / compressed.length
        : 0,
      totalAudioSize,
      totalCompressedSize,
      bandwidthSaved,
      recentMetrics: this.metrics.slice(-10), // Last 10 metrics
    };
  }

  /**
   * Get session-specific metrics
   */
  getSessionStats(sessionId: string) {
    const sessionMetrics = this.metrics.filter(m => m.sessionId === sessionId);
    
    if (sessionMetrics.length === 0) {
      return null;
    }

    const cached = sessionMetrics.filter(m => m.cached);
    
    return {
      totalChunks: sessionMetrics.length,
      cacheHits: cached.length,
      cacheHitRate: (cached.length / sessionMetrics.length) * 100,
      avgLatency: sessionMetrics.reduce((sum, m) => sum + m.generationTime, 0) / sessionMetrics.length,
      firstChunkLatency: sessionMetrics[0]?.generationTime || 0,
    };
  }

  /**
   * Get performance summary for logging
   */
  getSummary(): string {
    const stats = this.getStats();
    
    return `
📊 TTS Performance Metrics:
  - Total Chunks: ${stats.total}
  - Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%
  - Avg Generation Time: ${stats.avgGenerationTime.toFixed(1)}ms
    - Cached: ${stats.avgCachedTime.toFixed(1)}ms
    - Generated: ${stats.avgGeneratedTime.toFixed(1)}ms
  - Compression Rate: ${stats.compressionRate.toFixed(1)}%
  - Avg Compression Ratio: ${stats.avgCompressionRatio.toFixed(1)}%
  - Bandwidth Saved: ${(stats.bandwidthSaved / 1024).toFixed(1)}KB
    `.trim();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analytics
   */
  export(): TTSMetric[] {
    return [...this.metrics];
  }
}

// Export singleton instance
export const ttsMetrics = new TTSMetricsService();
