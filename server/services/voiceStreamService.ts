import type { VoiceWebSocketClient, VoiceMessage, TTSChunkMessage, TranscriptionMessage, TTSStartMessage, TTSEndMessage } from '../types/voiceWebSocket';
import { sarvamVoiceService } from './sarvamVoice';
import { AssemblyAI } from 'assemblyai';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { ObjectStorageService } from '../objectStorage';
import { storage } from '../storage';
import { tutorSessionService } from './tutorSessionService';
import { intentClassifier } from './intentClassifier';
import { emotionDetector } from './emotionDetector';
import { LanguageDetectionEngine, type DetectedLanguage } from './LanguageDetectionEngine';
import { SessionContextManager } from './SessionContextManager';
import { DynamicPromptEngine } from './DynamicPromptEngine';
import { ResponseValidator } from './ResponseValidator';
import { optimizedAI } from './optimizedAIService';
import { enhancedVoiceService } from './enhancedVoiceService';
import { performanceOptimizer, metricsTracker } from './PerformanceOptimizer';
import { hintService } from './hintService';
import { ttsCacheService } from './ttsCacheService';
import { audioCompression } from './audioCompression';
import { ttsMetrics } from './ttsMetrics';

// Initialize AI Tutor services
const languageDetector = new LanguageDetectionEngine();
const sessionContextManager = new SessionContextManager();
const dynamicPromptEngine = new DynamicPromptEngine();
const responseValidator = new ResponseValidator();

const assemblyAI = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

const polly = new PollyClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export class VoiceStreamService {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ObjectStorageService();
  }

  /**
   * Process audio chunks from client and transcribe in real-time
   * Supports streaming STT with Sarvam (primary) and AssemblyAI (fallback)
   */
  async processAudioChunk(
    ws: VoiceWebSocketClient,
    audioData: string, // Base64 encoded audio
    format: 'webm' | 'opus' | 'wav',
    isLast: boolean,
    language: 'hi' | 'en' = 'en'
  ): Promise<void> {
    try {
      // Decode base64 audio
      const audioBuffer = Buffer.from(audioData, 'base64');

      // Add to buffer
      if (!ws.audioBuffer) {
        ws.audioBuffer = [];
      }
      ws.audioBuffer.push(audioBuffer);

      console.log(`[VOICE STREAM] Received audio chunk: ${audioBuffer.length} bytes (isLast: ${isLast})`);

      // If this is the last chunk, process the complete audio
      if (isLast && ws.audioBuffer.length > 0) {
        const completeAudio = Buffer.concat(ws.audioBuffer);
        ws.audioBuffer = []; // Clear buffer

        console.log(`[VOICE STREAM] Processing complete audio: ${completeAudio.length} bytes`);

        // Send interim "processing" message to show STT is in progress
        const interimMsg: TranscriptionMessage = {
          type: 'TRANSCRIPTION',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          text: '...',  // Indicate processing
          confidence: 0,
          language: language,
          isFinal: false
        };
        ws.send(JSON.stringify(interimMsg));

        // Transcribe using Sarvam (primary) or AssemblyAI (fallback)
        const transcription = await this.transcribeAudio(completeAudio, language);

        // Send final transcription result to client
        const transcriptionMsg: TranscriptionMessage = {
          type: 'TRANSCRIPTION',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          text: transcription.text,
          confidence: transcription.confidence,
          language: transcription.language as 'hi' | 'en',
          isFinal: true
        };

        ws.send(JSON.stringify(transcriptionMsg));

        console.log(`[VOICE STREAM] ✅ Transcription sent: "${transcription.text}"`);

        // 🔥 AUTO-TRIGGER AI TUTOR PIPELINE after successful transcription
        if (transcription.text && transcription.text.trim().length > 0 && ws.chatId && ws.userId) {
          console.log(`[VOICE STREAM] → Triggering AI Tutor pipeline for transcription`);
          await this.processTutorResponse(
            ws,
            transcription.text,
            ws.chatId,
            ws.userId,
            transcription.language as 'hi' | 'en'
          );
        }
      }
    } catch (error) {
      console.error('[VOICE STREAM] Audio processing error:', error);
      
      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'AUDIO_PROCESSING_ERROR',
        message: 'Failed to process audio',
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Transcribe audio using Sarvam AI (primary) or AssemblyAI (fallback)
   */
  private async transcribeAudio(
    audioBuffer: Buffer,
    language: 'hi' | 'en'
  ): Promise<{ text: string; confidence: number; language: string }> {
    // Try Sarvam AI first (Indian accent optimized)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log('[VOICE STREAM] Using Sarvam AI for STT...');
        return await sarvamVoiceService.transcribeAudio(audioBuffer, language);
      } catch (error) {
        console.warn('[VOICE STREAM] Sarvam STT failed, falling back to AssemblyAI:', error);
      }
    }

    // Fallback to AssemblyAI
    try {
      console.log('[VOICE STREAM] Using AssemblyAI for STT...');
      
      // AssemblyAI supports direct file upload via their upload API
      // Upload the audio buffer directly (works with any format: WAV, WebM, Opus, etc.)
      const uploadUrl = await assemblyAI.files.upload(audioBuffer);
      
      const transcript = await assemblyAI.transcripts.transcribe({
        audio: uploadUrl,
        language_code: language === 'hi' ? 'hi' : 'en',
      });

      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }

      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        language
      };
    } catch (error) {
      console.error('[VOICE STREAM] AssemblyAI STT error:', error);
      throw new Error('All STT providers failed');
    }
  }

  /**
   * 🚀 PHASE 1: Stream TTS chunks with REAL-TIME sentence-by-sentence generation
   * Detects sentence boundaries and generates TTS in parallel for <1.5s latency
   */
  async streamTTSChunksRealtime(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    intent?: string,
    personaId?: string
  ): Promise<void> {
    try {
      console.log(`[STREAMING TTS] 🚀 Real-time sentence-by-sentence TTS starting...`);
      
      // Sentence boundary regex (Hindi + English)
      const sentenceBoundary = /[।.!?]\s+|[।.!?]$/;
      
      // Split text into sentences
      const parts = text.split(sentenceBoundary);
      const sentences: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part) {
          sentences.push(part);
        }
      }
      
      console.log(`[STREAMING TTS] Split into ${sentences.length} sentences`);
      
      // 🔥 FIX #2: Send TTS_START to reset client queue state
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: text.substring(0, 100)
      };
      ws.send(JSON.stringify(startMsg));
      ws.isTTSActive = true;
      
      // Voice options for all chunks
      const voiceOptions = {
        emotion,
        intent,
        personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      };
      
      // 🔥 Generate TTS for all sentences IN PARALLEL (don't await!)
      const ttsPromises = sentences.map(async (sentence, index) => {
        // 🔥 FIX #3: Assign deterministic sequence numbers BEFORE synthesis
        const sequenceNumber = index;
        
        try {
          const startTime = Date.now();
          
          // 🚀 PHASE 2.1: Check cache first
          const cachedAudio = await ttsCacheService.get(sentence, language, emotion, personaId);
          
          let audioBuffer: Buffer;
          let cached = false;
          
          if (cachedAudio) {
            audioBuffer = cachedAudio;
            cached = true;
          } else {
            // Generate TTS audio
            audioBuffer = await enhancedVoiceService.synthesize(sentence, voiceOptions);
            
            // 🚀 PHASE 2.1: Store in cache for future use
            await ttsCacheService.set(sentence, language, audioBuffer, emotion, personaId);
          }
          
          const genTime = Date.now() - startTime;
          
          const cacheStatus = cached ? '💾 CACHED' : '🔨 GENERATED';
          console.log(`[STREAMING TTS] ✅ Chunk ${index + 1}/${sentences.length} ${cacheStatus} (${genTime}ms): "${sentence.substring(0, 40)}..."`);
          
          // 🚀 PHASE 2.2: Compress audio before sending (if beneficial)
          let finalAudioData: string;
          let compressed = false;
          let compressedSize = 0;
          
          if (audioCompression.shouldCompress(audioBuffer.length)) {
            const compressionResult = await audioCompression.compress(audioBuffer);
            finalAudioData = compressionResult.compressed.toString('base64');
            compressed = true;
            compressedSize = compressionResult.compressedSize;
          } else {
            finalAudioData = audioBuffer.toString('base64');
          }
          
          // 🚀 PHASE 2.4: Record metrics
          ttsMetrics.record({
            sentence,
            language,
            generationTime: genTime,
            cached,
            compressed,
            audioSize: audioBuffer.length,
            compressedSize: compressed ? compressedSize : undefined,
            sequence: sequenceNumber,
            sessionId: ws.sessionId,
          });
          
          // ✅ CORRECT: Send TTS chunk with flat payload (matches TTSChunkMessage)
          const ttsMsg: TTSChunkMessage = {
            type: 'TTS_CHUNK',
            timestamp: new Date().toISOString(),
            sessionId: ws.sessionId,
            data: finalAudioData,  // ✅ Direct base64 string (NOT nested!)
            chunkIndex: sequenceNumber,
            totalChunks: index === sentences.length - 1 ? sentences.length : undefined
          };
          
          ws.send(JSON.stringify(ttsMsg));
          
        } catch (error) {
          console.error(`[STREAMING TTS] ❌ Failed chunk ${index + 1}: ${error}`);
          
          // Send error message for failed chunk
          const errorMsg: VoiceMessage = {
            type: 'ERROR',
            timestamp: new Date().toISOString(),
            code: 'TTS_GENERATION_FAILED',
            message: `Failed to generate TTS for chunk ${sequenceNumber}`,
            recoverable: true
          };
          ws.send(JSON.stringify(errorMsg));
        }
      });
      
      // Don't await all - let them stream as they complete!
      // But track completion
      Promise.all(ttsPromises).then(() => {
        // Send TTS end notification (matches TTSEndMessage)
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks: sentences.length
        };
        ws.send(JSON.stringify(endMsg));
        
        ws.isTTSActive = false;
        console.log(`[STREAMING TTS] ✅ All ${sentences.length} chunks sent`);
      }).catch(error => {
        console.error('[STREAMING TTS] Error in parallel generation:', error);
      });
      
    } catch (error) {
      console.error('[STREAMING TTS] Setup error:', error);
      // Fallback to old method
      await this.streamTTSChunks(ws, text, language, emotion, intent, personaId);
    }
  }

  /**
   * Stream TTS chunks with emotion, intent, and persona support (AI Tutor pipeline)
   * Uses EnhancedVoiceService for emotion-based prosody and math-to-speech
   */
  async streamTTSChunks(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    emotion?: string,
    intent?: string,
    personaId?: string
  ): Promise<void> {
    try {
      console.log(`[VOICE TTS] Converting with emotion: ${emotion}, intent: ${intent}, persona: ${personaId}`);
      
      // Use EnhancedVoiceService to apply emotion, intent, and persona
      const voiceOptions = {
        emotion,
        intent,
        personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      };
      
      // Convert to speech with enhanced prosody
      const audioBuffer = await enhancedVoiceService.synthesize(text, voiceOptions);
      
      // Stream the enhanced audio chunks
      await this.streamTTSAudioDirect(ws, audioBuffer, language);
      
    } catch (error) {
      console.error('[VOICE TTS] Enhanced TTS error:', error);
      
      // Fallback to basic TTS without emotion/prosody
      await this.streamTTSAudio(ws, text, language);
    }
  }

  /**
   * Stream pre-generated audio buffer directly to client
   */
  private async streamTTSAudioDirect(
    ws: VoiceWebSocketClient,
    audioBuffer: Buffer,
    language: 'hi' | 'en'
  ): Promise<void> {
    try {
      console.log(`[VOICE STREAM] Starting direct audio streaming: ${audioBuffer.length} bytes`);
      
      // Mark TTS as active
      ws.isTTSActive = true;

      // Send TTS start notification
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: '' // Already processed
      };
      ws.send(JSON.stringify(startMsg));

      // Split audio into chunks for streaming (10KB chunks)
      const CHUNK_SIZE = 10 * 1024; // 10KB
      const totalChunks = Math.ceil(audioBuffer.length / CHUNK_SIZE);
      
      console.log(`[VOICE STREAM] Streaming ${totalChunks} audio chunks`);

      for (let i = 0; i < totalChunks; i++) {
        // Check if interrupted
        if (!ws.isTTSActive) {
          console.log('[VOICE STREAM] TTS interrupted at chunk', i);
          break;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);

        const chunkMsg: TTSChunkMessage = {
          type: 'TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          data: chunk.toString('base64'),
          chunkIndex: i,
          totalChunks: i === totalChunks - 1 ? totalChunks : undefined
        };

        ws.send(JSON.stringify(chunkMsg));
        
        // Small delay between chunks for smoother streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send TTS end notification
      if (ws.isTTSActive) {
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks
        };
        ws.send(JSON.stringify(endMsg));
        
        console.log(`[VOICE STREAM] ✅ Direct streaming complete: ${totalChunks} chunks sent`);
      }

      ws.isTTSActive = false;
    } catch (error) {
      console.error('[VOICE STREAM] Direct streaming error:', error);
      ws.isTTSActive = false;
      throw error;
    }
  }

  /**
   * Stream TTS audio chunks to client in real-time
   * Supports Sarvam Bulbul (primary) and AWS Polly (fallback)
   */
  async streamTTSAudio(
    ws: VoiceWebSocketClient,
    text: string,
    language: 'hi' | 'en',
    speaker?: string,
    pitch?: number,
    pace?: number,
    loudness?: number
  ): Promise<void> {
    try {
      console.log(`[VOICE STREAM] Starting TTS streaming for: "${text.substring(0, 50)}..."`);
      
      // Mark TTS as active
      ws.isTTSActive = true;

      // Send TTS start notification
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: text.substring(0, 100)
      };
      ws.send(JSON.stringify(startMsg));

      // Generate TTS audio (Sarvam primary, Polly fallback)
      const audioBuffer = await this.synthesizeSpeech(text, language, speaker, pitch, pace, loudness);

      // Check if TTS was interrupted
      if (!ws.isTTSActive) {
        console.log('[VOICE STREAM] TTS was interrupted, aborting stream');
        return;
      }

      // Split audio into chunks for streaming (10KB chunks)
      const CHUNK_SIZE = 10 * 1024; // 10KB
      const totalChunks = Math.ceil(audioBuffer.length / CHUNK_SIZE);
      
      console.log(`[VOICE STREAM] Streaming ${totalChunks} audio chunks (${audioBuffer.length} bytes total)`);

      for (let i = 0; i < totalChunks; i++) {
        // Check if interrupted
        if (!ws.isTTSActive) {
          console.log('[VOICE STREAM] TTS interrupted at chunk', i);
          break;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBuffer.length);
        const chunk = audioBuffer.slice(start, end);

        const chunkMsg: TTSChunkMessage = {
          type: 'TTS_CHUNK',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          data: chunk.toString('base64'),
          chunkIndex: i,
          totalChunks: i === totalChunks - 1 ? totalChunks : undefined
        };

        ws.send(JSON.stringify(chunkMsg));
        
        // Small delay between chunks for smoother streaming (adjust based on network)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send TTS end notification
      if (ws.isTTSActive) {
        const endMsg: TTSEndMessage = {
          type: 'TTS_END',
          timestamp: new Date().toISOString(),
          sessionId: ws.sessionId,
          totalChunks
        };
        ws.send(JSON.stringify(endMsg));
        
        console.log(`[VOICE STREAM] ✅ TTS streaming complete: ${totalChunks} chunks sent`);
      }

      ws.isTTSActive = false;
    } catch (error) {
      console.error('[VOICE STREAM] TTS streaming error:', error);
      ws.isTTSActive = false;
      
      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'TTS_STREAMING_ERROR',
        message: 'Failed to stream TTS audio',
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Synthesize speech using Sarvam Bulbul (primary) or AWS Polly (fallback)
   */
  private async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en',
    speaker?: string,
    pitch?: number,
    pace?: number,
    loudness?: number
  ): Promise<Buffer> {
    // Try Sarvam AI first (authentic Indian voices)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log('[VOICE STREAM] Using Sarvam Bulbul for TTS...');
        
        // Use custom speaker if provided, otherwise default based on language
        const sarvamSpeaker = speaker || (language === 'hi' ? 'anushka' : 'abhilash');
        
        // Note: Sarvam API doesn't support pitch/pace/loudness in the same call as base synthesizeSpeech
        // We'll need to enhance the Sarvam service for these parameters
        const audioBuffer = await sarvamVoiceService.synthesizeSpeech(text, language);
        
        console.log(`[VOICE STREAM] ✅ Sarvam TTS generated: ${audioBuffer.length} bytes`);
        return audioBuffer;
      } catch (error) {
        console.warn('[VOICE STREAM] Sarvam TTS failed, falling back to AWS Polly:', error);
      }
    }

    // Fallback to AWS Polly
    try {
      console.log('[VOICE STREAM] Using AWS Polly for TTS...');
      
      const voiceId = language === 'hi' ? 'Aditi' : 'Kajal';
      
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'neural',
        LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
      });

      const response = await polly.send(command);
      
      if (!response.AudioStream) {
        throw new Error('No audio stream from Polly');
      }

      // Convert AudioStream to Buffer
      const stream = response.AudioStream as any;
      const chunks: Buffer[] = [];
      
      // Handle stream chunks
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      const audioBuffer = Buffer.concat(chunks);
      console.log(`[VOICE STREAM] ✅ Polly TTS generated: ${audioBuffer.length} bytes`);
      
      return audioBuffer;
    } catch (error) {
      console.error('[VOICE STREAM] AWS Polly TTS error:', error);
      throw new Error('All TTS providers failed');
    }
  }

  /**
   * Stop TTS streaming immediately
   */
  stopTTSStream(ws: VoiceWebSocketClient): void {
    if (ws.isTTSActive) {
      console.log(`[VOICE STREAM] Stopping TTS stream for session ${ws.sessionId}`);
      ws.isTTSActive = false;
    }
  }

  /**
   * Clear audio buffer
   */
  clearAudioBuffer(ws: VoiceWebSocketClient): void {
    if (ws.audioBuffer) {
      console.log(`[VOICE STREAM] Clearing audio buffer: ${ws.audioBuffer.length} chunks`);
      ws.audioBuffer = [];
    }
  }

  /**
   * 🚀 HELPER: Generate and stream TTS for a single sentence IMMEDIATELY
   * Used for TRUE real-time streaming during AI response generation
   */
  private async generateAndStreamSentenceTTS(
    ws: VoiceWebSocketClient,
    sentence: string,
    sequenceNumber: number,
    isLast: boolean,
    voiceOptions: {
      emotion?: string;
      intent?: string;
      personaId?: string;
      language: 'hi' | 'en';
      enableMathSpeech?: boolean;
      enablePauses?: boolean;
      enableEmphasis?: boolean;
    }
  ): Promise<void> {
    try {
      const startTime = Date.now();
      
      // 🚀 PHASE 1: Check cache first
      const cachedAudio = await ttsCacheService.get(
        sentence, 
        voiceOptions.language, 
        voiceOptions.emotion, 
        voiceOptions.personaId
      );
      
      let audioBuffer: Buffer;
      let cached = false;
      
      if (cachedAudio) {
        audioBuffer = cachedAudio;
        cached = true;
      } else {
        // Generate TTS audio
        audioBuffer = await enhancedVoiceService.synthesize(sentence, voiceOptions);
        
        // Store in cache for future use
        await ttsCacheService.set(
          sentence, 
          voiceOptions.language, 
          audioBuffer, 
          voiceOptions.emotion, 
          voiceOptions.personaId
        );
      }
      
      const genTime = Date.now() - startTime;
      const cacheStatus = cached ? '💾 CACHED' : '🔨 GENERATED';
      console.log(`[TRUE STREAM] ✅ Sentence ${sequenceNumber} ${cacheStatus} (${genTime}ms): "${sentence.substring(0, 40)}..."`);
      
      // 🚀 PHASE 2: Send TTS chunk immediately (matching TTSChunkMessage format)
      const finalAudioData = audioBuffer.toString('base64');
      
      const ttsMsg: TTSChunkMessage = {
        type: 'TTS_CHUNK',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        data: finalAudioData,  // ✅ Direct base64 string (NOT nested!)
        chunkIndex: sequenceNumber,
        totalChunks: isLast ? sequenceNumber + 1 : undefined
      };
      
      ws.send(JSON.stringify(ttsMsg));
      
      // 🚀 PHASE 3: Record metrics
      ttsMetrics.record({
        sentence,
        language: voiceOptions.language,
        generationTime: genTime,
        cached,
        compressed: false,
        audioSize: audioBuffer.length,
        sequence: sequenceNumber,
        sessionId: ws.sessionId,
      });
      
    } catch (error) {
      console.error(`[TRUE STREAM] ❌ Failed sentence ${sequenceNumber}: ${error}`);
      
      // Send error message (skip this chunk)
      const errorMsg: VoiceMessage = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        code: 'TTS_GENERATION_FAILED',
        message: `Failed to generate TTS for chunk ${sequenceNumber}`,
        recoverable: true
      };
      ws.send(JSON.stringify(errorMsg));
    }
  }

  /**
   * Process transcribed text through complete AI Tutor pipeline and stream TTS response
   * Integrates 7-phase system, emotion detection, intent classification, dynamic prompts, and voice synthesis
   */
  async processTutorResponse(
    ws: VoiceWebSocketClient,
    transcribedText: string,
    chatId: string,
    userId: string,
    language: 'hi' | 'en'
  ): Promise<void> {
    try {
      console.log(`[VOICE TUTOR] Processing: "${transcribedText}" for chat ${chatId}`);

      // Get or create tutor session
      const chat = await storage.getChat(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const session = await tutorSessionService.getOrCreateSession(
        chatId,
        userId,
        chat.subject || 'General',
        chat.topic || 'General',
        user
      );

      // 🔥 STEP 1: LANGUAGE DETECTION with caching
      const startLangDetection = Date.now();
      const cachedLangResult = await performanceOptimizer.getCachedLanguageDetection(transcribedText);
      let langDetection = cachedLangResult;
      
      if (!cachedLangResult) {
        langDetection = await languageDetector.detectLanguage(transcribedText, {
          conversationHistory: [],
          userPreference: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
          topic: session.topic
        });
        await performanceOptimizer.cacheLanguageDetection(transcribedText, langDetection);
      }
      
      const langDetectionTime = Date.now() - startLangDetection;
      const detectedLang = langDetection?.language || 'english';
      console.log(`[VOICE TUTOR] Language: ${detectedLang} (${langDetection?.confidence.toFixed(2)}) - ${langDetectionTime}ms`);
      
      // 🔥 STEP 2: SESSION CONTEXT - Add language detection
      await sessionContextManager.addLanguageDetection(
        userId,
        chatId,
        detectedLang,
        langDetection?.confidence || 0.5
      );

      // 🔥 STEP 3: INTENT CLASSIFICATION + EMOTION DETECTION (parallel)
      const [intentResult, emotionResult] = await Promise.all([
        intentClassifier.classify(transcribedText, {
          currentPhase: session.currentPhase,
          currentTopic: session.topic,
          isInPracticeMode: session.currentPhase === 'practice'
        }),
        emotionDetector.detectEmotion(transcribedText, [], language)
      ]);

      console.log(`[VOICE TUTOR] Intent: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(0)}%) | Emotion: ${emotionResult.emotion}`);
      
      // Add emotion to session context
      await sessionContextManager.addEmotionDetection(
        userId,
        chatId,
        emotionResult.emotion,
        emotionResult.confidence
      );
      
      const sessionCtx = await sessionContextManager.getContext(userId, chatId);

      // 🔥 STEP 4: HANDLE SPECIAL INTENTS (hints, phase advancement)
      if (intentResult.intent === 'request_hint') {
        const hintState = hintService.getHintState(await storage.getChatMessages(chatId, 50)) || 
                         hintService.initializeHintState();
        const advanceResult = hintService.advanceHintLevel(hintState);
        
        if (!advanceResult.canAdvance) {
          // Send hint limit message as TTS
          await this.streamTTSChunks(ws, advanceResult.message || 'No more hints available', language, emotionResult.emotion, intentResult.intent);
          return;
        }
        
        // Generate hint with AI (simplified for voice - no streaming)
        const hintPrompt = hintService.buildHintPrompt(
          advanceResult.nextLevel,
          language,
          session.topic || 'General',
          transcribedText,
          hintState.previousHints
        );
        
        // Generate hint response
        const hintResponse = await optimizedAI.generateResponse(transcribedText, hintPrompt, {
          language: detectedLang === 'hinglish' ? 'hindi' : 'english',
          useCache: true
        });
        
        // Save hint message with metadata
        await storage.addMessage({
          chatId,
          role: 'assistant',
          content: hintResponse.response,
          tool: null,
          metadata: {
            hintState: hintService.updateHintStateWithResponse(advanceResult.newState, hintResponse.response),
            hintLevel: advanceResult.nextLevel,
            model: hintResponse.model,
            cost: hintResponse.cost
          }
        });
        
        // Stream hint as TTS
        await this.streamTTSChunks(ws, hintResponse.response, language, emotionResult.emotion, intentResult.intent);
        return;
      }

      // 🔥 STEP 5: ASSESSMENT PHASE - Analyze response
      if (session.currentPhase === 'assessment') {
        const assessmentResult = tutorSessionService.analyzeResponse(transcribedText);
        await tutorSessionService.recordAssessment(chatId, assessmentResult);
        console.log(`[VOICE TUTOR] Assessment: Level ${assessmentResult.level}, Score ${assessmentResult.score}`);
      }

      // 🔥 STEP 6: GENERATE DYNAMIC PROMPT with all context
      const promptResult = dynamicPromptEngine.generateSystemPrompt({
        detectedLanguage: detectedLang,
        preferredLanguage: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
        languageConfidence: langDetection?.confidence || 0.5,
        currentEmotion: emotionResult.emotion,
        emotionConfidence: emotionResult.confidence,
        emotionalStability: sessionCtx?.emotionalHistory && sessionCtx.emotionalHistory.length > 0 ? 
          (sessionCtx.emotionalHistory.filter(e => e.emotion === emotionResult.emotion).length / sessionCtx.emotionalHistory.length) : 0.5,
        subject: session.subject,
        topic: session.topic,
        level: session.level || 'beginner',
        currentPhase: session.currentPhase,
        intent: intentResult.intent,
        misconceptions: session.adaptiveMetrics?.misconceptions || [],
        strongConcepts: session.adaptiveMetrics?.strongConcepts || []
      });
      
      const systemPrompt = promptResult.systemPrompt;
      console.log(`[VOICE TUTOR] Dynamic prompt: ${systemPrompt.length} chars | Phase: ${session.currentPhase}`);

      // 🔥 STEP 7: SAVE USER MESSAGE with full metadata
      await storage.addMessage({
        chatId,
        role: 'user',
        content: transcribedText,
        tool: null,
        metadata: {
          intent: intentResult.intent,
          intentConfidence: intentResult.confidence,
          emotion: emotionResult.emotion,
          emotionConfidence: emotionResult.confidence,
          detectedLanguage: detectedLang,
          languageConfidence: langDetection?.confidence || 0,
          voiceInput: true
        }
      });

      // 🔥 STEP 8: TRUE STREAMING - Generate AI response AND TTS in parallel sentence-by-sentence!
      const startAIGeneration = Date.now();
      
      // Send TTS_START to reset client queue state
      const startMsg: TTSStartMessage = {
        type: 'TTS_START',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        text: 'Generating response...'
      };
      ws.send(JSON.stringify(startMsg));
      ws.isTTSActive = true;
      
      // Sentence accumulator and sequence tracking
      let currentSentence = '';
      let fullResponse = '';
      let sentenceIndex = 0;
      const sentenceBoundary = /[।.!?]\s+|[।.!?]$/;
      
      // Voice options for TTS
      const voiceOptions = {
        emotion: emotionResult.emotion,
        intent: intentResult.intent,
        personaId: session.personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      };
      
      // 🚀 Stream AI response with REAL-TIME sentence-by-sentence TTS generation!
      const aiResult = await optimizedAI.generateStreamingResponse(
        transcribedText,
        systemPrompt,
        async (chunk: string, meta?: any) => {
          // Handle completion event (save metadata)
          if (meta?.type === 'complete') {
            console.log(`[VOICE TUTOR] ✅ AI streaming complete - Model: ${meta.model}, Cost: $${meta.cost?.toFixed(6) || 0}`);
            
            // Process final partial sentence if exists
            if (currentSentence.trim().length > 0) {
              await this.generateAndStreamSentenceTTS(
                ws,
                currentSentence.trim(),
                sentenceIndex,
                true, // isLast
                voiceOptions
              );
            }
            
            // Send TTS_END
            const endMsg: TTSEndMessage = {
              type: 'TTS_END',
              timestamp: new Date().toISOString(),
              sessionId: ws.sessionId,
              totalChunks: sentenceIndex + 1
            };
            ws.send(JSON.stringify(endMsg));
            ws.isTTSActive = false;
            
            return;
          }
          
          // Accumulate text chunks
          currentSentence += chunk;
          fullResponse += chunk;
          
          // Check for sentence boundary
          const match = currentSentence.match(sentenceBoundary);
          if (match) {
            // Extract complete sentence(s)
            const parts = currentSentence.split(sentenceBoundary);
            
            // Process all complete sentences (all except last part which may be incomplete)
            for (let i = 0; i < parts.length - 1; i++) {
              const sentence = parts[i].trim();
              if (sentence) {
                // 🚀 IMMEDIATELY generate TTS for this sentence!
                await this.generateAndStreamSentenceTTS(
                  ws,
                  sentence,
                  sentenceIndex,
                  false, // not last
                  voiceOptions
                );
                sentenceIndex++;
              }
            }
            
            // Keep the incomplete part for next iteration
            currentSentence = parts[parts.length - 1] || '';
          }
        }
      );
      
      const aiGenerationTime = Date.now() - startAIGeneration;
      console.log(`[VOICE TUTOR] ✅ TRUE STREAMING complete: ${fullResponse.length} chars - ${aiGenerationTime}ms total`);

      // 🔥 STEP 9: VALIDATE RESPONSE QUALITY (after streaming)
      const startValidation = Date.now();
      const validation = await responseValidator.validate(fullResponse, {
        expectedLanguage: detectedLang,
        userEmotion: emotionResult.emotion,
        currentPhase: session.currentPhase,
        subject: session.subject || 'General',
        topic: session.topic || 'General',
        userMessage: transcribedText
      });
      const validationTime = Date.now() - startValidation;
      console.log(`[VOICE TUTOR] Validation: ${(validation.overallScore * 100).toFixed(1)}% - Valid: ${validation.isValid} (${validationTime}ms)`);

      // 🔥 STEP 10: SAVE AI RESPONSE with comprehensive metadata
      await storage.addMessage({
        chatId,
        role: 'assistant',
        content: fullResponse,
        tool: null,
        metadata: {
          model: aiResult.model,
          cost: aiResult.cost,
          cached: aiResult.cached,
          personaId: session.personaId,
          emotion: emotionResult.emotion,
          phase: session.currentPhase,
          voiceOutput: true,
          streamingTTS: true, // NEW: Indicates TRUE streaming was used
          validation: {
            isValid: validation.isValid,
            overallScore: validation.overallScore,
            languageMatchScore: validation.layers.languageMatch.score,
            toneScore: validation.layers.toneAppropriate.score,
            qualityScore: validation.layers.educationalQuality.score,
            safetyScore: validation.layers.safety.score
          },
          timings: {
            languageDetection: langDetectionTime,
            aiGeneration: aiGenerationTime,
            validation: validationTime,
            total: langDetectionTime + aiGenerationTime + validationTime
          }
        }
      });

      console.log(`[VOICE TUTOR] ✅ Complete pipeline finished for session ${ws.sessionId}`);

    } catch (error) {
      console.error('[VOICE TUTOR] Pipeline error:', error);
      
      const errorMsg = {
        type: 'ERROR',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        code: 'TUTOR_PIPELINE_ERROR',
        message: error instanceof Error ? error.message : 'AI Tutor pipeline failed',
        recoverable: true
      };
      
      ws.send(JSON.stringify(errorMsg));
    }
  }
}

// Export singleton instance
export const voiceStreamService = new VoiceStreamService();
