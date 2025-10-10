import type { WebSocket } from 'ws';
import type { EmotionalState } from '../config/emotionPatterns';

// Tutor phase type based on schema
export type TutorPhase = 'greeting' | 'rapport' | 'assessment' | 'teaching' | 'practice' | 'feedback' | 'closure';

// WebSocket message types for voice tutor
export type VoiceMessageType =
  | 'AUDIO_CHUNK'          // Client → Server: Audio data for STT
  | 'TRANSCRIPTION'        // Server → Client: STT result
  | 'TTS_CHUNK'            // Server → Client: Audio chunk for playback
  | 'PHONEME_TTS_CHUNK'    // Server → Client: Audio + Phoneme data for lip-sync
  | 'TTS_START'            // Server → Client: TTS generation started
  | 'TTS_END'              // Server → Client: TTS generation complete
  | 'TTS_SKIP'             // Server → Client: Skip failed TTS chunk (PHASE 1)
  | 'INTERRUPT'            // Client → Server: Stop TTS playback
  | 'PHASE_CHANGE'         // Server → Client: Tutor phase transition
  | 'EMOTION_DETECTED'     // Server → Client: Emotion detection result
  | 'SESSION_STATE'        // Bidirectional: Session state sync
  | 'AVATAR_STATE'         // Client → Server: Avatar state change (CLOSED, LOADING, READY, PLAYING, ERROR)
  | 'AVATAR_STATE_ACK'     // Server → Client: Avatar state acknowledgment
  | 'AI_RESPONSE_TEXT'     // Server → Client: Text-only AI response (when avatar not ready)
  | 'ERROR'                // Server → Client: Error occurred
  | 'PING'                 // Bidirectional: Keep-alive
  | 'PONG';                // Bidirectional: Keep-alive response

// Base message structure
export interface VoiceWebSocketMessage {
  type: VoiceMessageType;
  timestamp: string;
  sessionId?: string;
}

// Audio chunk from client (browser recording)
export interface AudioChunkMessage extends VoiceWebSocketMessage {
  type: 'AUDIO_CHUNK';
  data: string; // Base64 encoded audio
  format: 'webm' | 'opus' | 'wav';
  isLast: boolean; // Indicates end of recording
}

// Transcription result
export interface TranscriptionMessage extends VoiceWebSocketMessage {
  type: 'TRANSCRIPTION';
  text: string;
  confidence: number;
  language: 'hi' | 'en';
  isFinal: boolean;
}

// TTS audio chunk to client
export interface TTSChunkMessage extends VoiceWebSocketMessage {
  type: 'TTS_CHUNK';
  data: string; // Base64 encoded audio (MP3)
  chunkIndex: number;
  totalChunks?: number;
}

// Phoneme data structure for Unity lip-sync
export interface PhonemeData {
  time: number;
  blendshape: string;
  weight: number;
}

// TTS audio chunk with phoneme data for lip-sync
export interface PhonemeTTSChunkMessage extends VoiceWebSocketMessage {
  type: 'PHONEME_TTS_CHUNK';
  audio: string; // Base64 encoded audio (MP3)
  phonemes: PhonemeData[]; // Phoneme timing data for Unity lip-sync
  chunkIndex: number;
  totalChunks?: number;
  text: string; // Text being spoken (for debugging/display)
}

// TTS start notification
export interface TTSStartMessage extends VoiceWebSocketMessage {
  type: 'TTS_START';
  text: string;
  estimatedDuration?: number; // milliseconds
}

// TTS end notification
export interface TTSEndMessage extends VoiceWebSocketMessage {
  type: 'TTS_END';
  totalChunks: number;
}

// Interrupt TTS playback
export interface InterruptMessage extends VoiceWebSocketMessage {
  type: 'INTERRUPT';
  reason?: 'user_speaking' | 'user_clicked' | 'error';
}

// Phase change notification
export interface PhaseChangeMessage extends VoiceWebSocketMessage {
  type: 'PHASE_CHANGE';
  phase: TutorPhase;
  phaseStep: number;
  progress: number;
  description?: string;
}

// Emotion detection result
export interface EmotionDetectedMessage extends VoiceWebSocketMessage {
  type: 'EMOTION_DETECTED';
  emotion: EmotionalState;
  confidence: number;
  source: 'text' | 'voice' | 'combined';
}

// Session state sync
export interface SessionStateMessage extends VoiceWebSocketMessage {
  type: 'SESSION_STATE';
  chatId: string;
  currentPhase: TutorPhase;
  personaId: string;
  language: 'hi' | 'en';
  isVoiceActive: boolean;
}

// Avatar state change message (Client → Server)
export interface AvatarStateMessage extends VoiceWebSocketMessage {
  type: 'AVATAR_STATE';
  state: 'CLOSED' | 'LOADING' | 'READY' | 'PLAYING' | 'ERROR';
  canAcceptTTS: boolean;
}

// Avatar state acknowledgment (Server → Client)
export interface AvatarStateAckMessage extends VoiceWebSocketMessage {
  type: 'AVATAR_STATE_ACK';
  canAcceptTTS: boolean;
  state: string;
}

// AI response text-only (Server → Client) - When avatar not ready
export interface AIResponseTextMessage extends VoiceWebSocketMessage {
  type: 'AI_RESPONSE_TEXT';
  text: string;
  messageId?: string;
}

// Error message
export interface ErrorMessage extends VoiceWebSocketMessage {
  type: 'ERROR';
  code: string;
  message: string;
  recoverable: boolean;
}

// Ping/Pong for keep-alive
export interface PingMessage extends VoiceWebSocketMessage {
  type: 'PING';
}

export interface PongMessage extends VoiceWebSocketMessage {
  type: 'PONG';
}

// Union type for all messages
export type VoiceMessage =
  | AudioChunkMessage
  | TranscriptionMessage
  | TTSChunkMessage
  | PhonemeTTSChunkMessage
  | TTSStartMessage
  | TTSEndMessage
  | InterruptMessage
  | PhaseChangeMessage
  | EmotionDetectedMessage
  | SessionStateMessage
  | AvatarStateMessage
  | AvatarStateAckMessage
  | AIResponseTextMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// WebSocket connection with session metadata
export interface VoiceWebSocketClient extends WebSocket {
  userId?: string;
  chatId?: string;
  sessionId?: string;
  language?: 'hi' | 'en'; // Cached from chat for performance
  personaId?: string; // Cached from session for persona-based TTS
  isAlive?: boolean;
  audioBuffer?: Buffer[];
  isTTSActive?: boolean;
  ttsSequence?: number; // PHASE 1: Sequence counter for streaming TTS chunks
  
  // Avatar state management
  avatarSession?: any; // AvatarSession from avatarStateService
  avatarState?: string; // Current avatar state (CLOSED, LOADING, READY, PLAYING, ERROR)
  avatarReady?: boolean; // Quick check if avatar can accept TTS
}

// Session state for voice tutor
export interface VoiceSessionState {
  chatId: string;
  userId: string;
  personaId: string;
  currentPhase: TutorPhase;
  language: 'hi' | 'en';
  isVoiceActive: boolean;
  audioBuffer: Buffer[];
  isTTSActive: boolean;
  lastActivity: Date;
}
