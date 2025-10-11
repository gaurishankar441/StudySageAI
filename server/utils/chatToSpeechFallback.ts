/**
 * Chat-to-Speech Fallback Converter
 * 
 * Rule-based converter that transforms chat markdown to SSML when AI fails
 */

import { getEmotionProsody } from '../prompts/dualOutput.dev';

interface ChatToSpeechOptions {
  language: 'en' | 'hi' | 'hinglish';
  emotion?: string;
  wpm?: number;
}

/**
 * Convert chat markdown to teacher-style SSML
 */
export function chatToSpeechSSML(chatMd: string, options: ChatToSpeechOptions): string {
  const { language, emotion = 'neutral', wpm = 140 } = options;
  
  // Step 1: Strip markdown noise
  let text = chatMd;
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  
  // Remove headings but keep the text
  text = text.replace(/^#+\s+/gm, '');
  
  // Remove images
  text = text.replace(/!\[.*?\]\(.*?\)/g, '');
  
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove horizontal rules
  text = text.replace(/^[-*]{3,}\s*$/gm, '');
  
  // Convert bullet points to natural speech
  text = text.replace(/^[-*]\s+/gm, '');
  text = text.replace(/^\d+\.\s+/gm, '');
  
  // Remove blockquotes
  text = text.replace(/^>\s*/gm, '');
  
  // Remove emphasis markers
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  
  // Remove KaTeX/LaTeX math ($$...$$)
  text = text.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
    return mathToSpeech(math.trim(), language);
  });
  
  // Remove inline math ($...$)
  text = text.replace(/\$([^$]+)\$/g, (match, math) => {
    return mathToSpeech(math.trim(), language);
  });
  
  // Step 2: Convert remaining math expressions
  text = mathToSpeech(text, language);
  
  // Step 3: Clean up whitespace
  text = text.replace(/\n{2,}/g, '\n');
  text = text.replace(/\s+/g, ' ');
  text = text.trim();
  
  // Step 4: Sentence split
  const sentences = text
    .split(/([.!?])\s+/)
    .reduce<string[]>((acc, part, idx, arr) => {
      if (idx % 2 === 0) {
        const sentence = part.trim();
        const punctuation = arr[idx + 1] || '';
        if (sentence) {
          acc.push(sentence + punctuation);
        }
      }
      return acc;
    }, []);
  
  // Step 5: Wrap sentences with SSML breaks
  const ssmlSentences = sentences
    .slice(0, 8) // Limit to ~8 sentences for 25-45s speech
    .map(s => `<s>${escapeXml(s)}</s>`)
    .join('<break time="250ms"/>');
  
  // Step 6: Add prosody based on emotion
  const prosody = getEmotionProsody(emotion);
  
  // Step 7: Construct final SSML
  return `<speak><prosody rate="${prosody.rate}" pitch="${prosody.pitch}">${ssmlSentences}</prosody></speak>`;
}

/**
 * Convert mathematical expressions to spoken words
 */
function mathToSpeech(text: string, language: 'en' | 'hi' | 'hinglish'): string {
  let converted = text;
  
  // Indian English: Use "into" for multiplication (common in JEE/NEET coaching)
  converted = converted.replace(/\s*×\s*/g, ' into ');
  converted = converted.replace(/\s*\*\s*/g, ' into ');
  converted = converted.replace(/\s*·\s*/g, ' into ');
  
  // Common operators
  if (language === 'hi' || language === 'hinglish') {
    converted = converted.replace(/\s*=\s*/g, ' barabar hai ');
    converted = converted.replace(/\s*\+\s*/g, ' plus ');
    converted = converted.replace(/\s*-\s*/g, ' minus ');
  } else {
    converted = converted.replace(/\s*=\s*/g, ' equals ');
    converted = converted.replace(/\s*\+\s*/g, ' plus ');
    converted = converted.replace(/\s*-\s*/g, ' minus ');
  }
  
  converted = converted.replace(/\s*÷\s*/g, ' divided by ');
  converted = converted.replace(/\s*\/\s*/g, ' divided by ');
  
  // Powers and exponents
  converted = converted.replace(/(\w+)²/g, '$1 squared');
  converted = converted.replace(/(\w+)³/g, '$1 cubed');
  converted = converted.replace(/(\w+)\^(\d+)/g, '$1 to the power $2');
  converted = converted.replace(/(\w+)\^{([^}]+)}/g, '$1 to the power $2');
  
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
  
  // Fractions
  converted = converted.replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1 divided by $2');
  converted = converted.replace(/(\d+)\/(\d+)/g, '$1 by $2');
  
  // Square root
  converted = converted.replace(/\\sqrt{([^}]+)}/g, 'square root of $1');
  converted = converted.replace(/√\s*([^\s]+)/g, 'square root of $1');
  converted = converted.replace(/√/g, 'square root of');
  
  // Special symbols
  converted = converted.replace(/≈/g, ' approximately equals ');
  converted = converted.replace(/≠/g, ' not equals ');
  converted = converted.replace(/≤/g, ' less than or equal to ');
  converted = converted.replace(/≥/g, ' greater than or equal to ');
  converted = converted.replace(/∞/g, ' infinity ');
  converted = converted.replace(/∫/g, ' integral of ');
  converted = converted.replace(/∑/g, ' sum of ');
  converted = converted.replace(/∏/g, ' product of ');
  converted = converted.replace(/±/g, ' plus or minus ');
  
  // Subscripts (common in Chemistry)
  converted = converted.replace(/H₂O/g, 'H two O');
  converted = converted.replace(/CO₂/g, 'CO two');
  converted = converted.replace(/(\w+)₂/g, '$1 two');
  converted = converted.replace(/(\w+)₃/g, '$1 three');
  converted = converted.replace(/(\w+)₄/g, '$1 four');
  converted = converted.replace(/_{(\d+)}/g, ' subscript $1');
  
  // Units (common in Physics)
  converted = converted.replace(/\s*m\/s²/g, ' meters per second squared');
  converted = converted.replace(/\s*m\/s/g, ' meters per second');
  converted = converted.replace(/\s*km\/h/g, ' kilometers per hour');
  converted = converted.replace(/\s*J\b/g, ' joules');
  converted = converted.replace(/\s*W\b/g, ' watts');
  converted = converted.replace(/\s*N\b/g, ' newtons');
  converted = converted.replace(/\s*Pa\b/g, ' pascals');
  converted = converted.replace(/\s*°C\b/g, ' degrees Celsius');
  converted = converted.replace(/\s*K\b/g, ' kelvin');
  
  // Clean up multiple spaces
  converted = converted.replace(/\s+/g, ' ');
  
  return converted;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate fallback dual-output from chat-only response
 */
export function generateFallbackDualOutput(
  chatMd: string,
  options: ChatToSpeechOptions & { persona?: 'Priya' | 'Amit' }
): {
  chat_md: string;
  speak_ssml: string;
  speak_meta: {
    persona?: 'Priya' | 'Amit';
    language: 'en' | 'hi' | 'hinglish';
    avg_wpm: number;
  };
} {
  const { language, emotion, wpm = 140, persona } = options;
  
  return {
    chat_md: chatMd,
    speak_ssml: chatToSpeechSSML(chatMd, { language, emotion, wpm }),
    speak_meta: {
      persona,
      language,
      avg_wpm: wpm
    }
  };
}
