/**
 * TTS Text Sanitizer
 * Separates display text from speech text for natural human-like TTS
 * Removes emojis, markdown, and symbols that don't sound natural when spoken
 */

interface SanitizeOptions {
  language?: 'hi' | 'en' | 'hinglish';
  removeEmojis?: boolean;
  removeMarkdown?: boolean;
  addPauses?: boolean;
}

export class TTSSanitizer {
  /**
   * Main sanitization function
   * Converts display text (with emojis/formatting) to TTS-friendly clean text
   */
  static sanitizeForSpeech(
    displayText: string,
    options: SanitizeOptions = {}
  ): string {
    const {
      language = 'hinglish',
      removeEmojis = true,
      removeMarkdown = true,
      addPauses = true,
    } = options;

    let speechText = displayText;

    // Step 1: Remove all emojis
    if (removeEmojis) {
      speechText = this.removeEmojis(speechText);
    }

    // Step 2: Remove markdown formatting
    if (removeMarkdown) {
      speechText = this.removeMarkdown(speechText);
    }

    // Step 3: Add natural pauses
    if (addPauses) {
      speechText = this.addNaturalPauses(speechText);
    }

    // Step 4: Language-specific cleanup
    speechText = this.languageSpecificCleanup(speechText, language);

    // Step 5: Clean up extra spaces
    speechText = speechText
      .replace(/\s+/g, ' ')
      .replace(/\s([,.!?])/g, '$1')
      .trim();

    return speechText;
  }

  /**
   * Remove all emojis from text
   * Comprehensive emoji removal using Unicode ranges
   */
  private static removeEmojis(text: string): string {
    // Remove emojis using comprehensive pattern without u flag for TS compatibility
    return text
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Surrogate pairs (most emojis)
      .replace(/[\u2600-\u26FF]/g, '')   // Misc symbols
      .replace(/[\u2700-\u27BF]/g, '')   // Dingbats
      .replace(/[\uE000-\uF8FF]/g, '')   // Private use area
      .replace(/[\u1F000-\u1F9FF]/g, '') // Emoticons, symbols, pictographs
      .replace(/[\u1FA00-\u1FAFF]/g, ''); // Extended symbols
  }

  /**
   * Remove markdown formatting
   */
  private static removeMarkdown(text: string): string {
    return text
      // Remove bold **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic *text* or _text_
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove headers
      .replace(/^#+\s/gm, '')
      // Remove code blocks ```code```
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
      // Remove bullet points
      .replace(/^[\*\-\+]\s/gm, '')
      // Remove numbered lists
      .replace(/^\d+\.\s/gm, '');
  }

  /**
   * Add natural pauses for better speech flow
   */
  private static addNaturalPauses(text: string): string {
    return text
      // Add pause after sentences (. ! ?)
      .replace(/([.!?])\s/g, '$1 <break time="500ms"/> ')
      // Add pause after commas
      .replace(/,\s/g, ', <break time="300ms"/> ')
      // Add pause after dashes
      .replace(/\s-\s/g, ' <break time="400ms"/> - ')
      // Add pause after colons
      .replace(/:\s/g, ': <break time="400ms"/> ');
  }

  /**
   * Language-specific cleanup for natural speech
   */
  private static languageSpecificCleanup(
    text: string,
    language: 'hi' | 'en' | 'hinglish'
  ): string {
    if (language === 'hinglish' || language === 'hi') {
      // Replace common English words with Hindi equivalents for smoother flow
      const replacements: { [key: string]: string } = {
        'okay': 'theek hai',
        'OK': 'theek hai',
        'great': 'bahut achha',
        'good': 'achha',
        'perfect': 'bilkul sahi',
        'excellent': 'shandar',
        'awesome': 'zabardast',
      };

      Object.entries(replacements).forEach(([eng, hin]) => {
        const regex = new RegExp(`\\b${eng}\\b`, 'gi');
        text = text.replace(regex, hin);
      });
    }

    return text;
  }

  /**
   * Extract clean speech text from tutor response
   * Specifically for responses with greetings, emojis, formatting
   */
  static extractSpeechFromTutorResponse(response: string): string {
    // Remove emojis and special characters
    let speechText = this.removeEmojis(response);
    
    // Remove markdown
    speechText = this.removeMarkdown(speechText);
    
    // Clean up spacing
    speechText = speechText.replace(/\s+/g, ' ').trim();

    return speechText;
  }

  /**
   * Separate display text and speech text
   * Returns both versions for UI and TTS
   */
  static separateDisplayAndSpeech(text: string, language: 'hi' | 'en' | 'hinglish' = 'hinglish'): {
    display: string;
    speech: string;
  } {
    return {
      display: text, // Original with emojis and formatting
      speech: this.sanitizeForSpeech(text, { language }), // Clean for TTS
    };
  }
}
