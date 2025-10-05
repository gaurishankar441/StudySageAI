/**
 * Sarvam AI Voice Service
 * Indian accent optimized STT (Saarika) & TTS (Bulbul)
 * Supports 10+ Indian languages with authentic voices
 */

export class SarvamVoiceService {
  private apiKey: string;
  private baseUrl = 'https://api.sarvam.ai';

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[SARVAM] API key not configured');
    }
  }

  /**
   * Transcribe audio using Sarvam Saarika model
   * Optimized for Indian accents and Hinglish code-mixing
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    language: 'hi' | 'en' = 'en'
  ): Promise<{
    text: string;
    confidence: number;
    language: string;
  }> {
    try {
      console.log(`[SARVAM STT] Starting transcription for ${language}...`);

      const formData = new FormData();
      
      // Create blob from buffer for FormData
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', 'saarika:v2');
      formData.append('language_code', language === 'hi' ? 'hi-IN' : 'en-IN');
      formData.append('with_timestamps', 'false');

      const response = await fetch(`${this.baseUrl}/speech-to-text`, {
        method: 'POST',
        headers: {
          'API-Subscription-Key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SARVAM STT] API error:', errorText);
        throw new Error(`Sarvam STT failed: ${response.status}`);
      }

      const result = await response.json();
      
      console.log(`[SARVAM STT] ✅ Transcription complete: ${result.transcript?.substring(0, 50)}...`);

      return {
        text: result.transcript || '',
        confidence: 0.95, // Sarvam doesn't return confidence, default high
        language: result.language_code || language,
      };
    } catch (error) {
      console.error('[SARVAM STT] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Synthesize speech using Sarvam Bulbul model
   * Natural Indian voices with prosody control
   */
  async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    try {
      console.log(`[SARVAM TTS] Synthesizing speech in ${language}...`);

      // Speaker selection for natural Indian voices
      const speaker = language === 'hi' ? 'meera' : 'arvind'; // Meera = Hindi female, Arvind = English male

      const response = await fetch(`${this.baseUrl}/text-to-speech`, {
        method: 'POST',
        headers: {
          'API-Subscription-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [text],
          target_language_code: language === 'hi' ? 'hi-IN' : 'en-IN',
          speaker: speaker,
          model: 'bulbul:v2',
          pitch: 0,
          pace: 1.0,
          loudness: 1.0,
          speech_sample_rate: 22050,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SARVAM TTS] API error:', errorText);
        throw new Error(`Sarvam TTS failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.audios || result.audios.length === 0) {
        throw new Error('No audio received from Sarvam TTS');
      }

      // Convert base64 audio to buffer
      const audioBase64 = result.audios[0];
      const audioBuffer = Buffer.from(audioBase64, 'base64');

      console.log(`[SARVAM TTS] ✅ Speech synthesized: ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      console.error('[SARVAM TTS] Synthesis error:', error);
      throw error;
    }
  }

  /**
   * Check if Sarvam service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const sarvamVoiceService = new SarvamVoiceService();
