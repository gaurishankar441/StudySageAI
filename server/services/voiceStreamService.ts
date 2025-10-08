import type { VoiceWebSocketClient, VoiceMessage, TTSChunkMessage, TranscriptionMessage, TTSStartMessage, TTSEndMessage } from '../types/voiceWebSocket';
import { sarvamVoiceService } from './sarvamVoice';
import { AssemblyAI } from 'assemblyai';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { ObjectStorageService } from '../objectStorage';

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
}

// Export singleton instance
export const voiceStreamService = new VoiceStreamService();
