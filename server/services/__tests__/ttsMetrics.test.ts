/**
 * Unit tests for TTSMetricsService
 * Covers edge cases to prevent regression
 */

import { TTSMetricsService } from '../ttsMetrics';

describe('TTSMetricsService', () => {
  let service: TTSMetricsService;

  beforeEach(() => {
    service = new TTSMetricsService();
  });

  describe('Bandwidth Savings Calculation', () => {
    it('should correctly calculate bandwidth savings for compressed chunks', () => {
      // Record a compressed chunk
      service.record({
        sentence: 'Test sentence',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: true,
        audioSize: 10000,
        compressedSize: 5000,
        sequence: 1,
      });

      const stats = service.getStats();
      expect(stats.bandwidthSaved).toBe(5000); // 10000 - 5000
      expect(stats.avgCompressionRatio).toBeCloseTo(50, 0); // 50% compression
    });

    it('should not count uncompressed chunks in bandwidth savings', () => {
      // Record an uncompressed chunk
      service.record({
        sentence: 'Test sentence',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: false,
        audioSize: 10000,
        sequence: 1,
      });

      const stats = service.getStats();
      expect(stats.bandwidthSaved).toBe(0); // No compression
      expect(stats.compressionRate).toBe(0); // 0% of chunks compressed
    });

    it('should handle mixed compressed and uncompressed chunks correctly', () => {
      // Compressed chunk
      service.record({
        sentence: 'Compressed',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: true,
        audioSize: 10000,
        compressedSize: 4000,
        sequence: 1,
      });

      // Uncompressed chunk
      service.record({
        sentence: 'Uncompressed',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: false,
        audioSize: 5000,
        sequence: 2,
      });

      const stats = service.getStats();
      expect(stats.bandwidthSaved).toBe(6000); // Only from compressed chunk: 10000 - 4000
      expect(stats.compressionRate).toBe(50); // 1 out of 2 compressed
      expect(stats.totalAudioSize).toBe(15000); // Both chunks
    });

    it('should prevent negative bandwidth savings', () => {
      // Edge case: compressedSize > audioSize (shouldn't happen but defensive)
      service.record({
        sentence: 'Bad compression',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: true,
        audioSize: 1000,
        compressedSize: 1500, // Larger than original (shouldn't happen)
        sequence: 1,
      });

      const stats = service.getStats();
      expect(stats.bandwidthSaved).toBeGreaterThanOrEqual(0); // Math.max guard
    });

    it('should handle missing compressedSize gracefully', () => {
      // Compressed flag but no compressedSize (edge case)
      service.record({
        sentence: 'Missing size',
        language: 'en',
        generationTime: 100,
        cached: false,
        compressed: true,
        audioSize: 10000,
        compressedSize: undefined,
        sequence: 1,
      });

      const stats = service.getStats();
      expect(stats.bandwidthSaved).toBe(0); // Filtered out by compressedSize !== undefined check
      expect(stats.compressionRate).toBe(0); // Not counted as compressed
    });
  });

  describe('Cache Metrics', () => {
    it('should correctly calculate cache hit rate', () => {
      // 3 cached, 2 generated
      service.record({
        sentence: 'Cached 1',
        language: 'en',
        generationTime: 10,
        cached: true,
        compressed: false,
        audioSize: 5000,
        sequence: 1,
      });

      service.record({
        sentence: 'Generated 1',
        language: 'en',
        generationTime: 500,
        cached: false,
        compressed: false,
        audioSize: 5000,
        sequence: 2,
      });

      service.record({
        sentence: 'Cached 2',
        language: 'en',
        generationTime: 10,
        cached: true,
        compressed: false,
        audioSize: 5000,
        sequence: 3,
      });

      const stats = service.getStats();
      expect(stats.cacheHitRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
      expect(stats.avgCachedTime).toBe(10);
      expect(stats.avgGeneratedTime).toBe(500);
    });
  });

  describe('Empty State', () => {
    it('should return zero stats when no metrics recorded', () => {
      const stats = service.getStats();
      
      expect(stats.total).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
      expect(stats.avgGenerationTime).toBe(0);
      expect(stats.bandwidthSaved).toBe(0);
      expect(stats.recentMetrics).toEqual([]);
    });
  });

  describe('Circular Buffer', () => {
    it('should maintain max 1000 metrics', () => {
      // Record 1500 metrics
      for (let i = 0; i < 1500; i++) {
        service.record({
          sentence: `Metric ${i}`,
          language: 'en',
          generationTime: 100,
          cached: false,
          compressed: false,
          audioSize: 5000,
          sequence: i,
        });
      }

      const stats = service.getStats();
      expect(stats.total).toBe(1000); // Max limit
    });
  });
});
