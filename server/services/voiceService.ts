import { AssemblyAI } from 'assemblyai';
import { PollyClient, SynthesizeSpeechCommand, SpeechMarkType } from '@aws-sdk/client-polly';
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
   * Get Speech Marks (viseme timing data) from AWS Polly
   * Used for phoneme-based lip sync
   */
  async getVisemeData(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Array<{time: number; type: string; value: string}>> {
    try {
      console.log(`[VOICE] Fetching viseme data from AWS Polly for ${language}...`);
      
      // Voice selection (same as TTS)
      const voiceId = language === 'hi' ? 'Aditi' : 'Aditi'; // Using Aditi for Indian English
      
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'json', // JSON format for speech marks
        VoiceId: voiceId,
        Engine: 'standard', // Speech marks only work with standard engine
        LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
        SpeechMarkTypes: ['viseme'], // Request viseme timing data
      });
      
      const response = await polly.send(command);
      
      if (!response.AudioStream) {
        throw new Error('No speech marks received from Polly');
      }
      
      // Convert stream to string (JSON lines)
      const speechMarksText = await this.streamToString(response.AudioStream as any);
      
      // Parse speech marks (each line is a JSON object)
      const visemes: Array<{time: number; type: string; value: string}> = [];
      const lines = speechMarksText.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const mark = JSON.parse(line);
          if (mark.type === 'viseme') {
            visemes.push({
              time: mark.time,
              type: 'viseme',
              value: mark.value,
            });
          }
        }
      }
      
      console.log(`[VOICE] ✅ Fetched ${visemes.length} visemes from Polly`);
      
      return visemes;
    } catch (error) {
      console.error('[VOICE] Viseme fetch error:', error);
      // Return empty array as fallback (amplitude-based lip sync will be used)
      return [];
    }
  }

  /**
   * 🎯 NEW: Synthesize speech with Polly AND get viseme data (for phoneme-based lip-sync)
   * Critical: Both audio and visemes come from the SAME Polly voice to ensure timing alignment
   * Returns: { audio: Buffer, visemes: Array<{time, type, value}> }
   */
  async synthesizeWithVisemes(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<{ audio: Buffer; visemes: Array<{time: number; type: string; value: string}> }> {
    try {
      const voiceId = language === 'hi' ? 'Aditi' : 'Aditi'; // Indian English
      
      console.log(`[VOICE+VISEMES] Synthesizing audio + visemes with Polly ${voiceId}...`);
      
      // 1. Get audio (MP3)
      const audioCommand = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'standard', // Must match viseme engine
        LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
      });
      
      const audioResponse = await polly.send(audioCommand);
      const audioBuffer = await this.streamToBuffer(audioResponse.AudioStream as any);
      
      // 2. Get visemes (Speech Marks)
      const visemeCommand = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'json',
        VoiceId: voiceId,
        Engine: 'standard', // Same engine as audio
        LanguageCode: language === 'hi' ? 'hi-IN' : 'en-IN',
        SpeechMarkTypes: ['viseme'],
      });
      
      const visemeResponse = await polly.send(visemeCommand);
      const speechMarksText = await this.streamToString(visemeResponse.AudioStream as any);
      
      // Parse visemes
      const visemes: Array<{time: number; type: string; value: string}> = [];
      const lines = speechMarksText.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const mark = JSON.parse(line);
          if (mark.type === 'viseme') {
            visemes.push({
              time: mark.time,
              type: 'viseme',
              value: mark.value,
            });
          }
        }
      }
      
      console.log(`[VOICE+VISEMES] ✅ Generated ${audioBuffer.length} bytes audio + ${visemes.length} visemes`);
      
      return { audio: audioBuffer, visemes };
    } catch (error) {
      console.error('[VOICE+VISEMES] Error:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Phase 5: Synthesize SSML with Polly AND get viseme data (for phoneme-based lip-sync)
   * Same as synthesizeWithVisemes but accepts SSML instead of text
   * Returns: { audio: Buffer, visemes: Array<{time, type, value}> }
   */
  async synthesizeSSMLWithVisemes(
    ssml: string,
    options: {
      voiceId?: string;
      engine?: 'neural' | 'standard';
      language: 'hi' | 'en' | 'hinglish';
    }
  ): Promise<{ audio: Buffer; visemes: Array<{time: number; type: string; value: string}> }> {
    try {
      // Language code mapping (Hinglish uses en-IN)
      const languageCode = options.language === 'hi' ? 'hi-IN' : 'en-IN';
      
      // Default voice selection
      const voiceId = (options.voiceId || (options.language === 'hi' ? 'Aditi' : 'Aditi')) as any;
      const engine = options.engine || 'standard'; // SSML + visemes work best with standard
      
      console.log(`[VOICE+SSML] Synthesizing SSML audio + visemes with Polly ${voiceId} (${engine})...`);
      
      // 1. Get audio (MP3) from SSML
      const audioCommand = new SynthesizeSpeechCommand({
        Text: ssml,
        TextType: 'ssml', // 🎯 KEY: Tell Polly this is SSML
        OutputFormat: 'mp3',
        VoiceId: voiceId as any,
        Engine: engine,
        LanguageCode: languageCode,
      });
      
      const audioResponse = await polly.send(audioCommand);
      const audioBuffer = await this.streamToBuffer(audioResponse.AudioStream as any);
      
      // 2. Get visemes (Speech Marks) from SSML
      const visemeCommand = new SynthesizeSpeechCommand({
        Text: ssml,
        TextType: 'ssml', // 🎯 KEY: Tell Polly this is SSML
        OutputFormat: 'json',
        VoiceId: voiceId as any,
        Engine: engine, // Must match audio engine
        LanguageCode: languageCode,
        SpeechMarkTypes: ['viseme'],
      });
      
      const visemeResponse = await polly.send(visemeCommand);
      const speechMarksText = await this.streamToString(visemeResponse.AudioStream as any);
      
      // Parse visemes
      const visemes: Array<{time: number; type: string; value: string}> = [];
      const lines = speechMarksText.trim().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          const mark = JSON.parse(line);
          if (mark.type === 'viseme') {
            visemes.push({
              time: mark.time,
              type: 'viseme',
              value: mark.value,
            });
          }
        }
      }
      
      console.log(`[VOICE+SSML] ✅ Generated ${audioBuffer.length} bytes audio + ${visemes.length} visemes from SSML`);
      
      return { audio: audioBuffer, visemes };
    } catch (error) {
      console.error('[VOICE+SSML] Error:', error);
      throw error;
    }
  }
  
  /**
   * Convert Readable stream to string
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Uint8Array[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
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
