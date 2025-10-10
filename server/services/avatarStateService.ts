/**
 * 🎭 Avatar State Service (Server)
 * Tracks avatar session states and validates TTS generation eligibility
 */

import type { VoiceWebSocketClient } from '../types/voiceWebSocket';

export type AvatarState = 
  | 'CLOSED'
  | 'LOADING'
  | 'READY'
  | 'PLAYING'
  | 'ERROR';

interface AvatarSession {
  userId: string;
  sessionId: string;
  chatId: string;
  state: AvatarState;
  canAcceptTTS: boolean;
  lastHeartbeat: number;
  createdAt: number;
}

/**
 * Avatar State Service
 * Manages avatar session states across WebSocket connections
 */
class AvatarStateService {
  private sessions = new Map<string, AvatarSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval (every 2 minutes)
    this.startCleanup();
  }

  /**
   * Update avatar session state from client
   */
  updateSession(
    ws: VoiceWebSocketClient,
    payload: {
      state: AvatarState;
      canAcceptTTS?: boolean;
      timestamp?: number;
    }
  ): void {
    // Validate required fields
    if (!ws.userId || !ws.sessionId || !ws.chatId) {
      console.error('[Avatar State Service] ❌ Missing required fields on WebSocket:', {
        hasUserId: !!ws.userId,
        hasSessionId: !!ws.sessionId,
        hasChatId: !!ws.chatId
      });
      return;
    }

    const session: AvatarSession = {
      userId: ws.userId,
      sessionId: ws.sessionId,
      chatId: ws.chatId,
      state: payload.state,
      canAcceptTTS: payload.canAcceptTTS ?? (payload.state === 'READY' || payload.state === 'PLAYING'),
      lastHeartbeat: payload.timestamp || Date.now(),
      createdAt: this.sessions.get(ws.sessionId)?.createdAt || Date.now()
    };

    this.sessions.set(ws.sessionId, session);

    // Attach session to WebSocket client for quick access
    ws.avatarSession = session;
    ws.avatarState = session.state;
    ws.avatarReady = session.canAcceptTTS;

    console.log('[Avatar State Service] ✅ Session updated:', {
      sessionId: ws.sessionId,
      userId: ws.userId,
      state: session.state,
      canAcceptTTS: session.canAcceptTTS
    });

    // Send acknowledgment to client
    this.sendAcknowledgment(ws, session);
  }

  /**
   * Send acknowledgment to client
   */
  private sendAcknowledgment(ws: VoiceWebSocketClient, session: AvatarSession): void {
    try {
      ws.send(JSON.stringify({
        type: 'AVATAR_STATE_ACK',
        canAcceptTTS: session.canAcceptTTS,
        state: session.state,
        timestamp: Date.now()
      }));

      console.log('[Avatar State Service] 📤 Sent ACK to client');
    } catch (error) {
      console.error('[Avatar State Service] ❌ Failed to send ACK:', error);
    }
  }

  /**
   * Check if TTS can be generated for session
   */
  canGenerateTTS(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn('[Avatar State Service] ⚠️ Session not found:', sessionId);
      return false;
    }

    const canGenerate = session.canAcceptTTS && 
                       (session.state === 'READY' || session.state === 'PLAYING');

    if (!canGenerate) {
      console.log('[Avatar State Service] ❌ Cannot generate TTS:', {
        sessionId,
        state: session.state,
        canAcceptTTS: session.canAcceptTTS
      });
    }

    return canGenerate;
  }

  /**
   * Get avatar state for session
   */
  getState(sessionId: string): AvatarState | null {
    return this.sessions.get(sessionId)?.state || null;
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): AvatarSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Remove session (on disconnect)
   */
  removeSession(sessionId: string): void {
    const removed = this.sessions.delete(sessionId);
    
    if (removed) {
      console.log('[Avatar State Service] 🗑️ Removed session:', sessionId);
    }
  }

  /**
   * Update heartbeat for session
   */
  heartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.lastHeartbeat = Date.now();
    }
  }

  /**
   * Cleanup stale sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    let removed = 0;

    // Use Array.from() for Map iteration
    Array.from(this.sessions.entries()).forEach(([sessionId, session]) => {
      if (now - session.lastHeartbeat > timeout) {
        this.sessions.delete(sessionId);
        removed++;
        
        console.log('[Avatar State Service] 🧹 Removed stale session:', {
          sessionId,
          userId: session.userId,
          lastSeen: new Date(session.lastHeartbeat).toISOString()
        });
      }
    });

    if (removed > 0) {
      console.log(`[Avatar State Service] 🧹 Cleanup complete - removed ${removed} stale session(s)`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000); // Every 2 minutes

    console.log('[Avatar State Service] 🧹 Cleanup interval started (2 min)');
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Avatar State Service] 🛑 Cleanup interval stopped');
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AvatarSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get statistics
   */
  getStats() {
    const sessions = this.getActiveSessions();
    
    return {
      total: sessions.length,
      byState: {
        CLOSED: sessions.filter(s => s.state === 'CLOSED').length,
        LOADING: sessions.filter(s => s.state === 'LOADING').length,
        READY: sessions.filter(s => s.state === 'READY').length,
        PLAYING: sessions.filter(s => s.state === 'PLAYING').length,
        ERROR: sessions.filter(s => s.state === 'ERROR').length
      },
      readyForTTS: sessions.filter(s => s.canAcceptTTS).length
    };
  }
}

// Singleton instance
export const avatarStateService = new AvatarStateService();

// Export types
export type { AvatarSession };
