import type { WebSocket } from 'ws';
import type { EmotionalState } from '../config/emotionPatterns';

// Tutor phase type based on schema
export type TutorPhase = 'greeting' | 'rapport' | 'assessment' | 'teaching' | 'practice' | 'feedback' | 'closure';

// WebSocket message types for voice tutor
export type VoiceMessageType =
  | 'AUDIO_CHUNK'          // Client → Server: Audio data for STT
  | 'TRANSCRIPTION'        // Server → Client: STT result
  | 'TTS_CHUNK'            // Server → Client: Audio chunk for playback
  | 'TTS_START'            // Server → Client: TTS generation started
  | 'TTS_END'              // Server → Client: TTS generation complete
  | 'INTERRUPT'            // Client → Server: Stop TTS playback
  | 'PHASE_CHANGE'         // Server → Client: Tutor phase transition
  | 'EMOTION_DETECTED'     // Server → Client: Emotion detection result
  | 'SESSION_STATE'        // Bidirectional: Session state sync
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
  | TTSStartMessage
  | TTSEndMessage
  | InterruptMessage
  | PhaseChangeMessage
  | EmotionDetectedMessage
  | SessionStateMessage
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
