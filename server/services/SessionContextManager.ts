import Redis from 'ioredis';
import type { DetectedLanguage } from './LanguageDetectionEngine';
import type { EmotionalState } from '../config/emotionPatterns';

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
    console.log('[SESSION CONTEXT] Redis unavailable, context caching disabled');
  });
} else {
  console.log('[SESSION CONTEXT] Redis disabled via REDIS_DISABLED env var');
}

export interface SessionContext {
  userId: string;
  chatId: string;
  
  // Language tracking
  languageHistory: Array<{
    language: DetectedLanguage;
    confidence: number;
    timestamp: number;
  }>;
  preferredLanguage?: DetectedLanguage;
  currentLanguage?: DetectedLanguage;
  
  // Emotional state tracking
  emotionalHistory: Array<{
    emotion: EmotionalState;
    confidence: number;
    timestamp: number;
  }>;
  currentEmotion?: EmotionalState;
  
  // Conversation tracking
  messageCount: number;
  lastMessageTime: number;
  avgResponseTime: number;
  
  // Learning context
  currentPhase?: string;
  currentTopic?: string;
  currentSubject?: string;
  misconceptions: string[];
  strongConcepts: string[];
  
  // Performance metrics
  responseQualityScore: number;
  languageConsistencyScore: number;
}

export class SessionContextManager {
  private readonly SESSION_TTL = 3600 * 24; // 24 hours
  private readonly SESSION_PREFIX = 'vaktaai:session:';
  private readonly MAX_HISTORY_SIZE = 20; // Keep last 20 language/emotion detections

  /**
   * Get session context from Redis
   */
  async getContext(userId: string, chatId: string): Promise<SessionContext | null> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return null;
    }

    try {
      const key = this.getSessionKey(userId, chatId);
      const data = await redis.hgetall(key);
      
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return this.deserializeContext(data);
    } catch (error) {
      console.error('[SESSION CONTEXT] Error getting context:', error);
      return null;
    }
  }

  /**
   * Update session context in Redis
   */
  async updateContext(
    userId: string,
    chatId: string,
    updates: Partial<SessionContext>
  ): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      const key = this.getSessionKey(userId, chatId);
      
      // Get existing context or create new
      let context = await this.getContext(userId, chatId);
      if (!context) {
        context = this.createEmptyContext(userId, chatId);
      }

      // Merge updates
      context = { ...context, ...updates };

      // Trim history arrays to max size
      if (context.languageHistory.length > this.MAX_HISTORY_SIZE) {
        context.languageHistory = context.languageHistory.slice(-this.MAX_HISTORY_SIZE);
      }
      if (context.emotionalHistory.length > this.MAX_HISTORY_SIZE) {
        context.emotionalHistory = context.emotionalHistory.slice(-this.MAX_HISTORY_SIZE);
      }

      // Serialize and store
      const serialized = this.serializeContext(context);
      await redis.hset(key, serialized);
      await redis.expire(key, this.SESSION_TTL);

      console.log(`[SESSION CONTEXT] ✅ Updated context for chat ${chatId}`);
    } catch (error) {
      console.error('[SESSION CONTEXT] Error updating context:', error);
    }
  }

  /**
   * Add language detection to history
   */
  async addLanguageDetection(
    userId: string,
    chatId: string,
    language: DetectedLanguage,
    confidence: number
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const languageEntry = {
      language,
      confidence,
      timestamp: Date.now()
    };

    const updates: Partial<SessionContext> = {
      languageHistory: [
        ...(context?.languageHistory || []),
        languageEntry
      ],
      currentLanguage: language
    };

    // Calculate preferred language from history
    if (context?.languageHistory && context.languageHistory.length >= 3) {
      const langCounts: { [key: string]: number } = {};
      context.languageHistory.slice(-10).forEach(h => {
        langCounts[h.language] = (langCounts[h.language] || 0) + 1;
      });
      
      const preferred = Object.keys(langCounts).reduce((a, b) => 
        langCounts[a] > langCounts[b] ? a : b
      ) as DetectedLanguage;
      
      updates.preferredLanguage = preferred;
    }

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Add emotion detection to history
   */
  async addEmotionDetection(
    userId: string,
    chatId: string,
    emotion: EmotionalState,
    confidence: number
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const emotionEntry = {
      emotion,
      confidence,
      timestamp: Date.now()
    };

    const updates: Partial<SessionContext> = {
      emotionalHistory: [
        ...(context?.emotionalHistory || []),
        emotionEntry
      ],
      currentEmotion: emotion
    };

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Update learning context
   */
  async updateLearningContext(
    userId: string,
    chatId: string,
    updates: {
      currentPhase?: string;
      currentTopic?: string;
      currentSubject?: string;
      misconceptions?: string[];
      strongConcepts?: string[];
    }
  ): Promise<void> {
    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Update performance metrics
   */
  async updateMetrics(
    userId: string,
    chatId: string,
    metrics: {
      responseQualityScore?: number;
      languageConsistencyScore?: number;
      responseTime?: number;
    }
  ): Promise<void> {
    const context = await this.getContext(userId, chatId);
    
    const updates: Partial<SessionContext> = {
      messageCount: (context?.messageCount || 0) + 1,
      lastMessageTime: Date.now()
    };

    if (metrics.responseQualityScore !== undefined) {
      updates.responseQualityScore = metrics.responseQualityScore;
    }

    if (metrics.languageConsistencyScore !== undefined) {
      updates.languageConsistencyScore = metrics.languageConsistencyScore;
    }

    if (metrics.responseTime !== undefined && context) {
      // Calculate rolling average response time
      const prevAvg = context.avgResponseTime || 0;
      const count = context.messageCount || 0;
      updates.avgResponseTime = (prevAvg * count + metrics.responseTime) / (count + 1);
    }

    await this.updateContext(userId, chatId, updates);
  }

  /**
   * Get language consistency score (how consistent is the user's language)
   */
  getLanguageConsistency(context: SessionContext): number {
    if (context.languageHistory.length < 3) {
      return 0.5; // Neutral if not enough data
    }

    const recentHistory = context.languageHistory.slice(-10);
    const langCounts: { [key: string]: number } = {};
    
    recentHistory.forEach(h => {
      langCounts[h.language] = (langCounts[h.language] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(langCounts));
    return maxCount / recentHistory.length;
  }

  /**
   * Get emotional stability score (how stable is the user's emotion)
   */
  getEmotionalStability(context: SessionContext): number {
    if (context.emotionalHistory.length < 3) {
      return 0.5;
    }

    const recentHistory = context.emotionalHistory.slice(-10);
    const emotionCounts: { [key: string]: number } = {};
    
    recentHistory.forEach(h => {
      emotionCounts[h.emotion] = (emotionCounts[h.emotion] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(emotionCounts));
    return maxCount / recentHistory.length;
  }

  /**
   * Clear session context
   */
  async clearContext(userId: string, chatId: string): Promise<void> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return;
    }

    try {
      const key = this.getSessionKey(userId, chatId);
      await redis.del(key);
      console.log(`[SESSION CONTEXT] Cleared context for chat ${chatId}`);
    } catch (error) {
      console.error('[SESSION CONTEXT] Error clearing context:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return [];
    }

    try {
      const pattern = `${this.SESSION_PREFIX}${userId}:*`;
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      return keys.map(key => key.split(':')[3]); // Extract chatId
    } catch (error) {
      console.error('[SESSION CONTEXT] Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    status: string;
    ttl: number;
  }> {
    if (!redis || !redis.status || redis.status !== 'ready') {
      return { totalSessions: 0, status: 'disconnected', ttl: 0 };
    }

    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      let cursor = '0';
      let count = 0;

      do {
        const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        count += result[1].length;
      } while (cursor !== '0');

      return {
        totalSessions: count,
        status: 'connected',
        ttl: this.SESSION_TTL
      };
    } catch (error) {
      console.error('[SESSION CONTEXT] Error getting stats:', error);
      return { totalSessions: 0, status: 'error', ttl: 0 };
    }
  }

  // Helper methods
  private getSessionKey(userId: string, chatId: string): string {
    return `${this.SESSION_PREFIX}${userId}:${chatId}`;
  }

  private createEmptyContext(userId: string, chatId: string): SessionContext {
    return {
      userId,
      chatId,
      languageHistory: [],
      emotionalHistory: [],
      messageCount: 0,
      lastMessageTime: Date.now(),
      avgResponseTime: 0,
      misconceptions: [],
      strongConcepts: [],
      responseQualityScore: 0.5,
      languageConsistencyScore: 0.5
    };
  }

  private serializeContext(context: SessionContext): Record<string, string> {
    return {
      userId: context.userId,
      chatId: context.chatId,
      languageHistory: JSON.stringify(context.languageHistory),
      preferredLanguage: context.preferredLanguage || '',
      currentLanguage: context.currentLanguage || '',
      emotionalHistory: JSON.stringify(context.emotionalHistory),
      currentEmotion: context.currentEmotion || '',
      messageCount: context.messageCount.toString(),
      lastMessageTime: context.lastMessageTime.toString(),
      avgResponseTime: context.avgResponseTime.toString(),
      currentPhase: context.currentPhase || '',
      currentTopic: context.currentTopic || '',
      currentSubject: context.currentSubject || '',
      misconceptions: JSON.stringify(context.misconceptions),
      strongConcepts: JSON.stringify(context.strongConcepts),
      responseQualityScore: context.responseQualityScore.toString(),
      languageConsistencyScore: context.languageConsistencyScore.toString()
    };
  }

  private deserializeContext(data: Record<string, string>): SessionContext {
    return {
      userId: data.userId,
      chatId: data.chatId,
      languageHistory: JSON.parse(data.languageHistory || '[]'),
      preferredLanguage: data.preferredLanguage as DetectedLanguage || undefined,
      currentLanguage: data.currentLanguage as DetectedLanguage || undefined,
      emotionalHistory: JSON.parse(data.emotionalHistory || '[]'),
      currentEmotion: data.currentEmotion as EmotionalState || undefined,
      messageCount: parseInt(data.messageCount || '0'),
      lastMessageTime: parseInt(data.lastMessageTime || '0'),
      avgResponseTime: parseFloat(data.avgResponseTime || '0'),
      currentPhase: data.currentPhase || undefined,
      currentTopic: data.currentTopic || undefined,
      currentSubject: data.currentSubject || undefined,
      misconceptions: JSON.parse(data.misconceptions || '[]'),
      strongConcepts: JSON.parse(data.strongConcepts || '[]'),
      responseQualityScore: parseFloat(data.responseQualityScore || '0.5'),
      languageConsistencyScore: parseFloat(data.languageConsistencyScore || '0.5')
    };
  }
}

export const sessionContextManager = new SessionContextManager();
