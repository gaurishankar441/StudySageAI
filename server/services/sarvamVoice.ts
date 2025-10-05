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
   * Handles text longer than 500 chars by chunking
   */
  async synthesizeSpeech(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    try {
      console.log(`[SARVAM TTS] Synthesizing speech in ${language} (${text.length} chars)...`);

      // Sarvam has 500 char limit per request - chunk if needed
      const MAX_CHARS = 500;
      
      if (text.length <= MAX_CHARS) {
        return await this.synthesizeChunk(text, language);
      }

      // Split text into chunks at sentence boundaries
      const chunks = this.splitTextIntoChunks(text, MAX_CHARS);
      console.log(`[SARVAM TTS] Splitting into ${chunks.length} chunks...`);

      // Synthesize each chunk
      const audioBuffers: Buffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[SARVAM TTS] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);
        const buffer = await this.synthesizeChunk(chunk, language);
        audioBuffers.push(buffer);
      }

      // Combine all audio buffers
      const combinedBuffer = Buffer.concat(audioBuffers);
      console.log(`[SARVAM TTS] ✅ Combined speech synthesized: ${combinedBuffer.length} bytes`);

      return combinedBuffer;
    } catch (error) {
      console.error('[SARVAM TTS] Synthesis error:', error);
      throw error;
    }
  }

  /**
   * Synthesize a single chunk of text (≤500 chars)
   */
  private async synthesizeChunk(
    text: string,
    language: 'hi' | 'en' = 'en'
  ): Promise<Buffer> {
    // Valid speakers for bulbul:v2 - anushka, abhilash, manisha, vidya, arya, karun, hitesh
    const speaker = language === 'hi' ? 'anushka' : 'abhilash'; // Female Hindi, Male English

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

    return Buffer.from(result.audios[0], 'base64');
  }

  /**
   * Split text into chunks at sentence boundaries (max 500 chars each)
   */
  private splitTextIntoChunks(text: string, maxChars: number): string[] {
    const chunks: string[] = [];
    
    // Split by sentences (., !, ?, ।, ॥ for Hindi)
    const sentences = text.match(/[^.!?।॥]+[.!?।॥]+|[^.!?।॥]+$/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      // If single sentence > maxChars, force split
      if (trimmedSentence.length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        // Split long sentence into smaller parts
        for (let i = 0; i < trimmedSentence.length; i += maxChars) {
          chunks.push(trimmedSentence.substring(i, i + maxChars));
        }
        continue;
      }
      
      // If adding sentence exceeds limit, save current chunk
      if (currentChunk.length + trimmedSentence.length + 1 > maxChars) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }
    
    // Add remaining chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Check if Sarvam service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const sarvamVoiceService = new SarvamVoiceService();
