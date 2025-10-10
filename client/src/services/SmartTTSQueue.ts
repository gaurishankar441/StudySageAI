/**
 * 🎤 Smart TTS Queue Manager
 * Validates avatar state before playing TTS
 * Tracks metrics and handles queue lifecycle
 */

import type { AvatarState } from '@/hooks/useAvatarState';
import type { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface TTSChunk {
  id: string;
  audio: string;           // Base64 audio data
  phonemes: Array<{
    time: number;
    blendshape: string;
    weight: number;
  }>;
  duration: number;         // Duration in milliseconds
  priority?: number;        // Optional priority (0-10)
  timestamp: number;        // When chunk was created
}

interface QueueMetrics {
  enqueued: number;
  played: number;
  rejected: number;
  errors: number;
  currentQueueLength: number;
}

/**
 * Smart TTS Queue Manager
 * Only plays TTS when avatar is in READY or PLAYING state
 */
export class SmartTTSQueue {
  private queue: TTSChunk[] = [];
  private avatarState: AvatarState = 'CLOSED';
  private avatarRef: React.MutableRefObject<UnityAvatarHandle | null>;
  private isProcessing = false;
  private currentlyPlaying: TTSChunk | null = null;

  // Metrics tracking
  private metrics: QueueMetrics = {
    enqueued: 0,
    played: 0,
    rejected: 0,
    errors: 0,
    currentQueueLength: 0
  };

  // Callbacks
  public onPlaybackStart?: (chunk: TTSChunk) => void;
  public onPlaybackComplete?: (chunk: TTSChunk) => void;
  public onQueueEmpty?: () => void;
  public onError?: (error: Error, chunk: TTSChunk) => void;

  constructor(avatarRef: React.MutableRefObject<UnityAvatarHandle | null>) {
    this.avatarRef = avatarRef;
  }

  /**
   * Enqueue TTS chunk with avatar state validation
   * Returns false if avatar not ready (chunk rejected)
   */
  enqueue(chunk: TTSChunk): boolean {
    // 🔒 VALIDATION: Check avatar state
    if (!this.canAcceptTTS()) {
      console.warn('[TTS Queue] ❌ Rejected - avatar not ready:', {
        avatarState: this.avatarState,
        chunkId: chunk.id,
        canAccept: this.canAcceptTTS()
      });

      this.metrics.rejected++;
      return false;
    }

    // Validate avatar ref
    if (!this.avatarRef.current || !this.avatarRef.current.isReady) {
      console.warn('[TTS Queue] ❌ Rejected - Unity not ready:', {
        chunkId: chunk.id,
        hasRef: !!this.avatarRef.current,
        isReady: this.avatarRef.current?.isReady
      });

      this.metrics.rejected++;
      return false;
    }

    // Add to queue
    this.queue.push({
      ...chunk,
      timestamp: chunk.timestamp || Date.now()
    });

    this.metrics.enqueued++;
    this.metrics.currentQueueLength = this.queue.length;

    console.log('[TTS Queue] ✅ Enqueued:', {
      id: chunk.id,
      queueLength: this.queue.length,
      avatarState: this.avatarState,
      duration: chunk.duration
    });

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Update avatar state from state machine
   */
  updateState(state: AvatarState): void {
    const previousState = this.avatarState;
    this.avatarState = state;

    console.log('[TTS Queue] 🔄 State updated:', {
      from: previousState,
      to: state,
      queueLength: this.queue.length
    });

    // Clear queue if avatar closed or error
    if (state === 'CLOSED' || state === 'ERROR') {
      console.log('[TTS Queue] 🧹 Clearing queue due to state:', state);
      this.clear();
    }
  }

  /**
   * Check if can accept TTS based on avatar state
   */
  private canAcceptTTS(): boolean {
    return this.avatarState === 'READY' || this.avatarState === 'PLAYING';
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Recheck state before each playback
      if (!this.canAcceptTTS()) {
        console.warn('[TTS Queue] ⏸️ Pausing - avatar not ready');
        break;
      }

      // Recheck Unity ref
      if (!this.avatarRef.current || !this.avatarRef.current.isReady) {
        console.warn('[TTS Queue] ⏸️ Pausing - Unity not ready');
        break;
      }

      const chunk = this.queue.shift()!;
      this.metrics.currentQueueLength = this.queue.length;
      this.currentlyPlaying = chunk;

      try {
        // Notify playback start
        this.onPlaybackStart?.(chunk);

        // Play chunk on Unity avatar
        await this.playChunk(chunk);

        // Update metrics
        this.metrics.played++;

        // Notify playback complete
        this.onPlaybackComplete?.(chunk);

        console.log('[TTS Queue] ✅ Played:', {
          id: chunk.id,
          remaining: this.queue.length
        });

      } catch (error) {
        console.error('[TTS Queue] ❌ Playback error:', error);
        this.metrics.errors++;
        this.onError?.(error as Error, chunk);
      } finally {
        this.currentlyPlaying = null;
      }
    }

    this.isProcessing = false;

    // Notify queue empty
    if (this.queue.length === 0) {
      console.log('[TTS Queue] 📭 Queue empty');
      this.onQueueEmpty?.();
    }
  }

  /**
   * Play chunk on Unity avatar
   */
  private async playChunk(chunk: TTSChunk): Promise<void> {
    console.log('[TTS Queue] ▶️ Playing on avatar:', {
      id: chunk.id,
      phonemes: chunk.phonemes.length,
      duration: chunk.duration
    });

    // Send to Unity avatar with phonemes
    this.avatarRef.current?.sendAudioWithPhonemesToAvatar(
      chunk.audio,
      chunk.phonemes,
      chunk.id
    );

    // Wait for audio completion (duration + 200ms buffer)
    await new Promise<void>(resolve => {
      setTimeout(resolve, chunk.duration + 200);
    });
  }

  /**
   * Clear queue and stop processing
   */
  clear(): void {
    console.log('[TTS Queue] 🧹 Clearing queue:', {
      queuedItems: this.queue.length,
      currentlyPlaying: this.currentlyPlaying?.id
    });

    this.queue = [];
    this.currentlyPlaying = null;
    this.isProcessing = false;
    this.metrics.currentQueueLength = 0;

    // Stop Unity playback if active
    if (this.avatarRef.current) {
      this.avatarRef.current.stopAudio?.();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): QueueMetrics {
    return {
      ...this.metrics,
      currentQueueLength: this.queue.length
    };
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      currentlyPlaying: this.currentlyPlaying,
      isProcessing: this.isProcessing,
      avatarState: this.avatarState,
      canAcceptTTS: this.canAcceptTTS(),
      metrics: this.getMetrics()
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      enqueued: 0,
      played: 0,
      rejected: 0,
      errors: 0,
      currentQueueLength: this.queue.length
    };
  }
}
