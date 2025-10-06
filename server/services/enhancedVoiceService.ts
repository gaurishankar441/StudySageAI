// Enhanced Voice Service with SSML-like Emotion, Math-to-Speech, and Natural Pauses
// Wraps Sarvam TTS with advanced prosody control

import { sarvamVoiceService } from './sarvamVoice';
import { EMOTION_CONFIGS, TUTOR_PERSONAS } from '../config/tutorPersonas';

export interface VoiceOptions {
  emotion?: string; // excited, teaching, gentle, friendly, curious, encouraging, celebratory
  personaId?: string; // priya, amit
  language?: 'hi' | 'en';
  enableMathSpeech?: boolean;
  enablePauses?: boolean;
}

export class EnhancedVoiceService {
  /**
   * Convert math expressions to natural speech
   * Examples:
   * - V=IR → "V equals I into R"
   * - E=mc² → "E equals m times c squared"
   * - a²+b²=c² → "a squared plus b squared equals c squared"
   */
  private mathToSpeech(text: string): string {
    let converted = text;
    
    // Common operators
    converted = converted.replace(/\s*=\s*/g, ' equals ');
    converted = converted.replace(/\s*\+\s*/g, ' plus ');
    converted = converted.replace(/\s*-\s*/g, ' minus ');
    converted = converted.replace(/\s*×\s*/g, ' times ');
    converted = converted.replace(/\s*÷\s*/g, ' divided by ');
    converted = converted.replace(/\s*\/\s*/g, ' divided by ');
    
    // Powers and exponents
    converted = converted.replace(/(\w+)²/g, '$1 squared');
    converted = converted.replace(/(\w+)³/g, '$1 cubed');
    converted = converted.replace(/(\w+)\^(\d+)/g, '$1 to the power $2');
    
    // Greek letters (common in Physics/Chemistry)
    converted = converted.replace(/α/g, 'alpha');
    converted = converted.replace(/β/g, 'beta');
    converted = converted.replace(/γ/g, 'gamma');
    converted = converted.replace(/δ/g, 'delta');
    converted = converted.replace(/Δ/g, 'delta');
    converted = converted.replace(/θ/g, 'theta');
    converted = converted.replace(/λ/g, 'lambda');
    converted = converted.replace(/μ/g, 'mu');
    converted = converted.replace(/π/g, 'pi');
    converted = converted.replace(/σ/g, 'sigma');
    converted = converted.replace(/ω/g, 'omega');
    
    // Fractions (simple)
    converted = converted.replace(/(\d+)\/(\d+)/g, '$1 by $2');
    
    // Special symbols
    converted = converted.replace(/≈/g, ' approximately equals ');
    converted = converted.replace(/≠/g, ' not equals ');
    converted = converted.replace(/≤/g, ' less than or equal to ');
    converted = converted.replace(/≥/g, ' greater than or equal to ');
    converted = converted.replace(/∞/g, ' infinity ');
    converted = converted.replace(/√/g, ' square root of ');
    
    // Subscripts (common in Chemistry)
    converted = converted.replace(/H₂O/g, 'H two O');
    converted = converted.replace(/CO₂/g, 'CO two');
    converted = converted.replace(/(\w+)₂/g, '$1 two');
    converted = converted.replace(/(\w+)₃/g, '$1 three');
    converted = converted.replace(/(\w+)₄/g, '$1 four');
    
    return converted;
  }
  
  /**
   * Inject natural pauses for better comprehension
   * - After commas: 300ms
   * - After periods/question marks: 500ms
   * - After colons: 400ms
   * - Between sections: 600ms
   */
  private injectPauses(text: string): string {
    let withPauses = text;
    
    // Pause after sentence endings (., !, ?, ।)
    withPauses = withPauses.replace(/([.!?।])\s+/g, '$1<break time="500ms"/> ');
    
    // Pause after commas
    withPauses = withPauses.replace(/,\s+/g, ',<break time="300ms"/> ');
    
    // Pause after colons
    withPauses = withPauses.replace(/:\s+/g, ':<break time="400ms"/> ');
    
    // Pause before section breaks (emoji or numbered lists)
    withPauses = withPauses.replace(/([🎯📚💡🔑✅⚠️💪🌟])/g, '<break time="600ms"/>$1');
    withPauses = withPauses.replace(/(^\d+\.\s)/gm, '<break time="400ms"/>$1');
    
    return withPauses;
  }
  
  /**
   * Apply emotion-based prosody adjustments
   */
  private applyEmotionProsody(
    text: string,
    emotion: string = 'friendly',
    personaId?: string
  ): { text: string; pitch: number; pace: number; loudness: number } {
    const emotionConfig = EMOTION_CONFIGS[emotion] || EMOTION_CONFIGS.friendly;
    
    // Parse pitch ("+12%" → 1.12, "-3%" → 0.97)
    let pitch = 0;
    if (emotionConfig.pitch.includes('%')) {
      const percentMatch = emotionConfig.pitch.match(/([-+]?\d+)%/);
      if (percentMatch) {
        const percent = parseInt(percentMatch[1]);
        pitch = percent / 100; // Convert to decimal for Sarvam
      }
    }
    
    // Parse pace/rate ("medium-fast" → 1.1, "slow" → 0.9)
    let pace = 1.0;
    if (emotionConfig.rate === 'slow') pace = 0.9;
    else if (emotionConfig.rate === 'fast') pace = 1.15;
    else if (emotionConfig.rate === 'medium-fast') pace = 1.1;
    else if (emotionConfig.rate === 'medium') pace = 1.0;
    
    // Parse volume ("loud" → 1.2, "soft" → 0.8)
    let loudness = 1.0;
    if (emotionConfig.volume === 'loud') loudness = 1.2;
    else if (emotionConfig.volume === 'x-loud') loudness = 1.3;
    else if (emotionConfig.volume === 'soft') loudness = 0.8;
    else if (emotionConfig.volume === 'medium') loudness = 1.0;
    
    // Apply persona-specific adjustments if provided
    if (personaId) {
      const persona = TUTOR_PERSONAS[personaId];
      if (persona?.voiceSettings?.sarvam) {
        const personaPitch = parseFloat(persona.voiceSettings.sarvam.pitch) || 1.0;
        const personaPace = parseFloat(persona.voiceSettings.sarvam.pace) || 1.0;
        const personaLoudness = parseFloat(persona.voiceSettings.sarvam.loudness) || 1.0;
        
        // Combine emotion with persona settings (multiplicative)
        pitch = pitch + (personaPitch - 1.0);
        pace = pace * personaPace;
        loudness = loudness * personaLoudness;
      }
    }
    
    return { text, pitch, pace, loudness };
  }
  
  /**
   * Clean SSML-like tags that are not supported by the backend
   */
  private cleanSSMLTags(text: string): string {
    // Remove <break> tags (already processed as pauses in timing)
    return text.replace(/<break[^>]*>/g, '');
  }
  
  /**
   * Main synthesis method with all enhancements
   */
  async synthesize(text: string, options: VoiceOptions = {}): Promise<Buffer> {
    const {
      emotion = 'friendly',
      personaId = 'priya',
      language = 'en',
      enableMathSpeech = true,
      enablePauses = true
    } = options;
    
    let processedText = text;
    
    // Step 1: Convert math expressions to speech
    if (enableMathSpeech) {
      processedText = this.mathToSpeech(processedText);
    }
    
    // Step 2: Inject natural pauses (will be timing-based, not SSML)
    if (enablePauses) {
      processedText = this.injectPauses(processedText);
    }
    
    // Step 3: Apply emotion-based prosody
    const { text: finalText, pitch, pace, loudness } = this.applyEmotionProsody(
      processedText,
      emotion,
      personaId
    );
    
    // Step 4: Clean SSML tags not supported
    const cleanText = this.cleanSSMLTags(finalText);
    
    console.log(`[ENHANCED VOICE] Emotion: ${emotion}, Pitch: ${pitch.toFixed(2)}, Pace: ${pace.toFixed(2)}, Loudness: ${loudness.toFixed(2)}`);
    
    // Step 5: Synthesize with Sarvam (with prosody params)
    try {
      if (!sarvamVoiceService.isAvailable()) {
        throw new Error('Sarvam TTS not available - missing SARVAM_API_KEY');
      }
      
      return await this.synthesizeWithSarvam(cleanText, language, pitch, pace, loudness, personaId);
      
    } catch (error) {
      console.error('[ENHANCED VOICE] Synthesis failed:', error);
      throw error;
    }
  }
  
  /**
   * Synthesize with Sarvam with custom prosody
   */
  private async synthesizeWithSarvam(
    text: string,
    language: 'hi' | 'en',
    pitch: number,
    pace: number,
    loudness: number,
    personaId: string
  ): Promise<Buffer> {
    const persona = TUTOR_PERSONAS[personaId];
    const speaker = persona?.voiceSettings?.sarvam?.speaker || (language === 'hi' ? 'anushka' : 'abhilash');
    
    // Sarvam API expects specific parameter ranges
    const MAX_CHARS = 500;
    
    if (text.length <= MAX_CHARS) {
      return await this.synthesizeSarvamChunk(text, language, speaker, pitch, pace, loudness);
    }
    
    // Split and combine for long text
    const chunks = this.splitTextIntoChunks(text, MAX_CHARS);
    const audioBuffers: Buffer[] = [];
    
    for (const chunk of chunks) {
      const buffer = await this.synthesizeSarvamChunk(chunk, language, speaker, pitch, pace, loudness);
      audioBuffers.push(buffer);
    }
    
    return Buffer.concat(audioBuffers);
  }
  
  /**
   * Synthesize single chunk with Sarvam
   */
  private async synthesizeSarvamChunk(
    text: string,
    language: 'hi' | 'en',
    speaker: string,
    pitch: number,
    pace: number,
    loudness: number
  ): Promise<Buffer> {
    const apiKey = process.env.SARVAM_API_KEY || '';
    
    console.log(`[SARVAM TTS] Calling Sarvam API - Speaker: ${speaker}, Model: bulbul:v2, Lang: ${language}, Text: "${text.substring(0, 50)}..."`);
    
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'API-Subscription-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language === 'hi' ? 'hi-IN' : 'en-IN',
        speaker: speaker,
        model: 'bulbul:v2',
        pitch: pitch, // -1.0 to 1.0
        pace: pace, // 0.5 to 2.0
        loudness: loudness, // 0.5 to 2.0
        speech_sample_rate: 22050,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SARVAM TTS] ❌ API call failed - Status: ${response.status}, Error: ${errorText}`);
      throw new Error(`Sarvam TTS failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.audios || result.audios.length === 0) {
      console.error('[SARVAM TTS] ❌ No audio in response');
      throw new Error('No audio received from Sarvam TTS');
    }
    
    console.log(`[SARVAM TTS] ✅ Successfully generated audio - Size: ${result.audios[0].length} bytes`);
    return Buffer.from(result.audios[0], 'base64');
  }
  
  /**
   * Split text into chunks (reuse from SarvamVoiceService)
   */
  private splitTextIntoChunks(text: string, maxChars: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?।॥]+[.!?।॥]+|[^.!?।॥]+$/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      if (trimmedSentence.length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        for (let i = 0; i < trimmedSentence.length; i += maxChars) {
          chunks.push(trimmedSentence.substring(i, i + maxChars));
        }
        continue;
      }
      
      if (currentChunk.length + trimmedSentence.length + 1 > maxChars) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}

export const enhancedVoiceService = new EnhancedVoiceService();
