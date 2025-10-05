import { AssemblyAI } from 'assemblyai';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Readable } from 'stream';

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

export class VoiceService {
  /**
   * Transcribe audio to text using AssemblyAI
   * Supports multiple Indian languages for JEE/NEET students
   */
  async transcribeAudio(audioUrl: string, language: 'hi' | 'en' = 'en'): Promise<{
    text: string;
    confidence: number;
    language: string;
  }> {
    try {
      console.log(`[VOICE] Starting transcription for ${language}...`);
      
      const transcript = await assemblyAI.transcripts.transcribe({
        audio: audioUrl,
        language_code: language === 'hi' ? 'hi' : 'en',
        speaker_labels: false,
      });
      
      if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }
      
      console.log(`[VOICE] ✅ Transcription complete: ${transcript.text?.substring(0, 50)}...`);
      
      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        language,
      };
    } catch (error) {
      console.error('[VOICE] Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }
  
  /**
   * Synthesize text to speech using AWS Polly
   * Supports Hindi and English voices optimized for Indian students
   */
  async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    try {
      console.log(`[VOICE] Synthesizing speech in ${language}...`);
      
      // Voice selection for Indian languages
      const voiceId = language === 'hi' ? 'Aditi' : 'Joanna'; // Aditi = Hindi, Joanna = English
      
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'neural', // Neural voices for better quality
        LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN', // Indian English
      });
      
      const response = await polly.send(command);
      
      if (!response.AudioStream) {
        throw new Error('No audio stream received from Polly');
      }
      
      // Convert AWS SDK stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream as any);
      
      console.log(`[VOICE] ✅ Speech synthesized: ${audioBuffer.length} bytes`);
      
      return audioBuffer;
    } catch (error) {
      console.error('[VOICE] TTS error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }
  
  /**
   * Convert Readable stream to Buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  
  /**
   * Real-time streaming transcription (for future voice chat)
   * Using AssemblyAI real-time API
   */
  async startRealtimeTranscription(
    language: 'hi' | 'en' = 'en',
    onTranscript: (text: string) => void
  ) {
    try {
      const transcriber = assemblyAI.realtime.transcriber({
        sampleRate: 16000,
        encoding: 'pcm_s16le',
      });
      
      transcriber.on('transcript', (transcript) => {
        if (transcript.text) {
          onTranscript(transcript.text);
        }
      });
      
      transcriber.on('error', (error) => {
        console.error('[VOICE] Real-time error:', error);
      });
      
      await transcriber.connect();
      
      console.log('[VOICE] ✅ Real-time transcription started');
      
      return transcriber;
    } catch (error) {
      console.error('[VOICE] Real-time setup error:', error);
      throw new Error('Failed to start real-time transcription');
    }
  }
}

export const voiceService = new VoiceService();
