import { AssemblyAI } from 'assemblyai';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { Readable } from 'stream';
import { sarvamVoiceService } from './sarvamVoice';

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
   * Transcribe audio to text
   * Primary: Sarvam AI (Indian accent optimized)
   * Fallback: AssemblyAI
   */
  async transcribeAudio(audioUrl: string, language: 'hi' | 'en' = 'en'): Promise<{
    text: string;
    confidence: number;
    language: string;
  }> {
    // Try Sarvam AI first (Indian accent optimized)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log(`[VOICE] Using Sarvam AI STT for ${language}...`);
        
        // Fetch audio from URL
        const audioResponse = await fetch(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        
        return await sarvamVoiceService.transcribeAudio(audioBuffer, language);
      } catch (sarvamError) {
        console.warn('[VOICE] Sarvam AI failed, falling back to AssemblyAI:', sarvamError);
      }
    }
    
    // Fallback to AssemblyAI
    try {
      console.log(`[VOICE] Using AssemblyAI STT for ${language}...`);
      
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
   * Synthesize text to speech
   * Primary: Sarvam AI (authentic Indian voices)
   * Fallback: AWS Polly
   */
  async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    // Try Sarvam AI first (authentic Indian voices)
    if (sarvamVoiceService.isAvailable()) {
      try {
        console.log(`[VOICE] Using Sarvam AI TTS for ${language}...`);
        return await sarvamVoiceService.synthesizeSpeech(text, language);
      } catch (sarvamError) {
        console.warn('[VOICE] Sarvam AI failed, falling back to AWS Polly:', sarvamError);
      }
    }
    
    // Fallback to AWS Polly
    try {
      console.log(`[VOICE] Using AWS Polly TTS for ${language}...`);
      
      // Voice selection for Indian languages
      const voiceId = language === 'hi' ? 'Aditi' : 'Joanna'; // Aditi = Hindi, Joanna = English
      
      // Try neural engine first, fallback to standard if not supported in region
      let response;
      try {
        const command = new SynthesizeSpeechCommand({
          Text: text,
          OutputFormat: 'mp3',
          VoiceId: voiceId,
          Engine: 'neural', // Neural voices for better quality
          LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
        });
        
        response = await polly.send(command);
      } catch (neuralError: any) {
        // Fallback to standard engine if neural not supported
        if (neuralError.name === 'InvalidParameterException' || neuralError.message?.includes('neural')) {
          console.warn('[VOICE] Neural engine not supported, using standard engine');
          const fallbackCommand = new SynthesizeSpeechCommand({
            Text: text,
            OutputFormat: 'mp3',
            VoiceId: voiceId,
            Engine: 'standard', // Fallback to standard
            LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
          });
          
          response = await polly.send(fallbackCommand);
        } else {
          throw neuralError;
        }
      }
      
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
