// Enhanced Voice Service with SSML-like Emotion, Math-to-Speech, and Natural Pauses
// Wraps Sarvam TTS with advanced prosody control

import { sarvamVoiceService } from './sarvamVoice';
import { EMOTION_CONFIGS, TUTOR_PERSONAS } from '../config/tutorPersonas';
import { INTENT_PROSODY_MAP, INTENT_PROSODY_DEFAULT } from '../config/intentProsody';
import { TTSSanitizer } from './ttsSanitizer';

export interface VoiceOptions {
  emotion?: string; // excited, teaching, gentle, friendly, curious, encouraging, celebratory
  intent?: string; // request_explanation, request_example, submit_answer, etc.
  personaId?: string; // priya, amit
  language?: 'hi' | 'en';
  enableMathSpeech?: boolean;
  enablePauses?: boolean;
  enableEmphasis?: boolean;
}

export class EnhancedVoiceService {
  /**
   * Convert math expressions to natural speech (Indian English pattern)
   * Examples:
   * - V=IR → "V equals I into R"
   * - F=ma → "F equals m into a"
   * - E=mc² → "E equals m into c squared"
   * - a²+b²=c² → "a squared plus b squared equals c squared"
   */
  private mathToSpeech(text: string, language: 'hi' | 'en' = 'en'): string {
    let converted = text;
    
    // Indian English: Use "into" for multiplication (common in JEE/NEET coaching)
    converted = converted.replace(/\s*×\s*/g, ' into ');
    converted = converted.replace(/\s*\*\s*/g, ' into ');
    
    // Common operators
    converted = converted.replace(/\s*=\s*/g, ' equals ');
    converted = converted.replace(/\s*\+\s*/g, ' plus ');
    converted = converted.replace(/\s*-\s*/g, ' minus ');
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
    
    // Units (common in Physics)
    converted = converted.replace(/\bm\/s\b/g, 'meters per second');
    converted = converted.replace(/\bm\/s²\b/g, 'meters per second squared');
    converted = converted.replace(/\bkg\b/g, 'kilograms');
    converted = converted.replace(/\bm\b(?![a-z])/gi, 'meters');
    converted = converted.replace(/\bN\b/g, 'newtons');
    converted = converted.replace(/\bJ\b/g, 'joules');
    
    // Hinglish math terms (if Hindi)
    if (language === 'hi') {
      converted = converted.replace(/equals/g, 'barabar hai');
      converted = converted.replace(/plus/g, 'jod');
      converted = converted.replace(/minus/g, 'ghata');
      converted = converted.replace(/into/g, 'guna');
      converted = converted.replace(/divided by/g, 'bhaag');
    }
    
    return converted;
  }
  
  /**
   * Inject natural pauses - SIMPLIFIED APPROACH
   * 
   * Note: Sarvam TTS doesn't support SSML, so fine-grained pause control isn't possible.
   * Instead, we rely on:
   * 1. Natural punctuation (periods, commas, colons) that TTS engines already pause on
   * 2. Global pace adjustment (slower pace = longer pauses everywhere)
   * 3. Strategic comma placement for Hinglish code-switching
   * 
   * This approach avoids text corruption while still providing prosody control.
   */
  private injectPauses(text: string, pauseMultiplier: number = 1.0): string {
    // Don't inject artificial punctuation - let natural punctuation and pace control pauses
    // The pauseMultiplier is used to adjust global pace in the calling function
    return text;
  }
  
  /**
   * Add emphasis to key concepts for better comprehension
   * Marks important words that should be stressed
   */
  private addEmphasis(text: string, emphasisWords: string[]): string {
    let emphasized = text;
    
    // JEE/NEET key concepts (technical terms)
    const technicalTerms = [
      'momentum', 'velocity', 'acceleration', 'force', 'energy', 'power',
      'electron', 'proton', 'neutron', 'atom', 'molecule', 'compound',
      'oxidation', 'reduction', 'catalyst', 'equilibrium', 'entropy',
      'DNA', 'RNA', 'cell', 'mitosis', 'meiosis', 'photosynthesis',
      'theorem', 'equation', 'formula', 'derivative', 'integral'
    ];
    
    // Hindi/Hinglish equivalents
    const hinglishTerms = [
      'veg', 'gati', 'tvaran', 'bal', 'urja', 'shakti',
      'vidyut', 'parmaanu', 'anu', 'yaugik', 'sanyog',
      'koshika', 'prakash-sanshleshan', 'sutra', 'samikaran'
    ];
    
    // Combine with intent-specific emphasis words
    const allEmphasisWords = [...emphasisWords, ...technicalTerms, ...hinglishTerms];
    
    // Add emphasis markers (will be converted to prosody)
    allEmphasisWords.forEach(word => {
      const regex = new RegExp(`\\b(${word})\\b`, 'gi');
      emphasized = emphasized.replace(regex, '<emphasis>$1</emphasis>');
    });
    
    return emphasized;
  }
  
  /**
   * Optimize for Hinglish code-switching
   * Adds commas around Hindi script and common Hinglish transition words
   * to trigger natural pauses in TTS for smoother code-switching
   */
  private optimizeHinglish(text: string): string {
    let optimized = text;
    
    // Add commas around Hindi script (Devanagari) for micro-pauses
    const hindiPattern = /[\u0900-\u097F]+/g;
    optimized = optimized.replace(hindiPattern, (match) => {
      return `, ${match}, `;
    });
    
    // Common Hinglish transition words - add commas for code-switch clarity
    const hinglishPhrases = [
      'matlab', 'yaani', 'kyunki', 'isliye', 'lekin', 'aur', 
      'toh', 'haan', 'nahi', 'bas', 'ek', 'do', 'teen',
      'dekho', 'samjho', 'socho'
    ];
    
    hinglishPhrases.forEach(phrase => {
      const regex = new RegExp(`\\b(${phrase})\\b`, 'gi');
      optimized = optimized.replace(regex, ', $1, ');
    });
    
    // Clean up excessive commas
    optimized = optimized.replace(/,\s*,+/g, ',');
    optimized = optimized.replace(/^\s*,\s*/, ''); // Remove leading comma
    optimized = optimized.replace(/\s*,\s*$/,''); // Remove trailing comma
    
    return optimized;
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
   * Clean SSML-like tags - SIMPLIFIED APPROACH
   * 
   * Since Sarvam doesn't support SSML, we simply remove all markup tags.
   * Prosody control is achieved through global pitch/pace/loudness parameters.
   */
  private cleanSSMLTags(text: string): string {
    let cleaned = text;
    
    // Remove all <break> tags (Sarvam doesn't support them)
    cleaned = cleaned.replace(/<break[^>]*\/>/g, '');
    
    // Remove <emphasis> tags but capitalize the content for subtle emphasis
    cleaned = cleaned.replace(/<emphasis>([^<]+)<\/emphasis>/g, (match, word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    
    // Clean up any excessive spaces created by tag removal
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Apply intent-based prosody adjustments on top of emotion
   */
  private applyIntentProsody(
    basePitch: number,
    basePace: number,
    baseLoudness: number,
    intent?: string
  ): { pitch: number; pace: number; loudness: number; pauseMultiplier: number; emphasisWords: string[] } {
    const intentConfig = intent ? (INTENT_PROSODY_MAP[intent] || INTENT_PROSODY_DEFAULT) : INTENT_PROSODY_DEFAULT;
    
    // Combine intent adjustments with base emotion prosody
    return {
      pitch: Math.max(-1.0, Math.min(1.0, basePitch + intentConfig.pitch)),
      pace: Math.max(0.5, Math.min(2.0, basePace * intentConfig.pace)),
      loudness: Math.max(0.5, Math.min(2.0, baseLoudness * intentConfig.loudness)),
      pauseMultiplier: intentConfig.pauseMultiplier,
      emphasisWords: intentConfig.emphasisWords
    };
  }
  
  /**
   * Main synthesis method with all enhancements
   */
  async synthesize(text: string, options: VoiceOptions = {}): Promise<Buffer> {
    const {
      emotion = 'friendly',
      intent,
      personaId = 'priya',
      language = 'en',
      enableMathSpeech = true,
      enablePauses = true,
      enableEmphasis = true
    } = options;
    
    let processedText = text;
    
    // Step 0: SANITIZE TEXT - Remove emojis, markdown, symbols for natural speech
    // Display text (with emojis) is shown to user, but TTS speaks clean text
    // Map language properly: 'en' → 'en', 'hi' → 'hi' (NOT forcing hinglish for English)
    const sanitizerLanguage = language === 'hi' ? 'hi' : language === 'en' ? 'en' : 'hinglish';
    const sanitizedText = TTSSanitizer.sanitizeForSpeech(processedText, {
      language: sanitizerLanguage,
      removeEmojis: true,
      removeMarkdown: true,
      addPauses: false  // We handle pauses separately in enhancedVoiceService
    });
    
    // Validate sanitized text has actual content (not just punctuation/whitespace)
    const hasContent = /[a-zA-Z0-9\u0900-\u097F]/.test(sanitizedText); // Check for English/Hindi alphanumeric
    if (!hasContent || sanitizedText.trim().length < 2) {
      console.warn('[ENHANCED VOICE] ⚠️ Sanitized text invalid, using original text');
      processedText = text; // Fallback to original text
    } else {
      processedText = sanitizedText; // Use sanitized text
    }
    
    // Step 1: Convert math expressions to speech (Indian English patterns)
    if (enableMathSpeech) {
      processedText = this.mathToSpeech(processedText, language);
    }
    
    // Step 2: Optimize for Hinglish code-switching (if Hindi or mixed content)
    if (language === 'hi' || processedText.match(/[\u0900-\u097F]/)) {
      processedText = this.optimizeHinglish(processedText);
    }
    
    // Step 3: Apply emotion-based prosody (base layer)
    const { text: emotionText, pitch: basePitch, pace: basePace, loudness: baseLoudness } = this.applyEmotionProsody(
      processedText,
      emotion,
      personaId
    );
    
    // Step 4: Apply intent-based prosody adjustments (override layer)
    const { pitch, pace, loudness, pauseMultiplier, emphasisWords } = this.applyIntentProsody(
      basePitch,
      basePace,
      baseLoudness,
      intent
    );
    
    // Step 5: Add key concept emphasis
    let finalText = emotionText;
    if (enableEmphasis) {
      finalText = this.addEmphasis(finalText, emphasisWords);
    }
    
    // Step 6: Inject natural pauses (simplified - no artificial punctuation)
    if (enablePauses) {
      finalText = this.injectPauses(finalText, pauseMultiplier);
    }
    
    // Step 7: Adjust pace based on pause multiplier
    // Higher multiplier = slower pace = longer natural pauses at punctuation
    // Using square root to make the effect more subtle and natural
    const adjustedPace = pace / Math.pow(pauseMultiplier, 0.6);
    const clampedPace = Math.max(0.5, Math.min(2.0, adjustedPace));
    
    // Step 8: Clean SSML-like tags (not supported by Sarvam API)
    const cleanText = this.cleanSSMLTags(finalText);
    
    console.log(`[ENHANCED VOICE] Intent: ${intent || 'none'}, Emotion: ${emotion}, Pitch: ${pitch.toFixed(2)}, Pace: ${clampedPace.toFixed(2)} (base: ${pace.toFixed(2)}), Loudness: ${loudness.toFixed(2)}, PauseMultiplier: ${pauseMultiplier.toFixed(2)}`);
    
    // Step 9: Synthesize with Sarvam (with combined prosody params)
    try {
      if (!sarvamVoiceService.isAvailable()) {
        throw new Error('Sarvam TTS not available - missing SARVAM_API_KEY');
      }
      
      return await this.synthesizeWithSarvam(cleanText, language, pitch, clampedPace, loudness, personaId);
      
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
    // ALWAYS use anushka (female voice) as fallback - Garima Ma'am for all subjects
    const speaker = persona?.voiceSettings?.sarvam?.speaker || 'anushka';
    
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
