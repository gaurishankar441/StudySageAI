/**
 * SSML Utilities for TTS Dual-Output System
 * 
 * Functions for sanitizing, validating, estimating duration, and compressing SSML
 * to ensure high-quality teacher-style speech output.
 */

/**
 * Estimate speech duration in seconds from SSML content
 * @param ssml - SSML string to analyze
 * @param wpm - Words per minute (default 140 for conversational speech)
 * @returns Estimated duration in seconds
 */
export function estimateSpeechSeconds(ssml: string, wpm: number = 140): number {
  // Remove all SSML tags to get plain text
  const text = ssml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Count words
  const words = text.split(" ").filter(Boolean).length;
  
  // Calculate duration: (words / wpm) * 60 seconds
  const baseDuration = (words / wpm) * 60;
  
  // Add time for breaks (estimate ~250ms per break on average)
  const breakMatches = ssml.match(/<break\s+time="(\d+)ms"\/>/g) || [];
  const totalBreakTime = breakMatches.reduce((sum, breakTag) => {
    const match = breakTag.match(/(\d+)ms/);
    return sum + (match ? parseInt(match[1]) / 1000 : 0.25);
  }, 0);
  
  return Math.round(baseDuration + totalBreakTime);
}

/**
 * Sanitize SSML by removing markdown, code blocks, and ensuring valid structure
 * @param ssml - Raw SSML string (may contain markdown artifacts)
 * @returns Clean SSML string
 */
export function sanitizeSSML(ssml: string): string {
  let cleaned = ssml;
  
  // Remove code blocks (```...```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  
  // Remove inline code (`...`)
  cleaned = cleaned.replace(/`[^`]+`/g, "");
  
  // Remove markdown images ![alt](url)
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, "");
  
  // Remove markdown links [text](url) but keep the text
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, "$1");
  
  // Remove markdown headings (#, ##, ###)
  cleaned = cleaned.replace(/^#+\s+/gm, "");
  
  // Remove markdown emphasis (*word*, **word**, _word_, __word__)
  cleaned = cleaned.replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1");
  
  // Remove blockquotes (>)
  cleaned = cleaned.replace(/^>\s*/gm, "");
  
  // Remove horizontal rules (---, ***)
  cleaned = cleaned.replace(/^[-*]{3,}\s*$/gm, "");
  
  // Remove list markers (-, *, 1., 2.)
  cleaned = cleaned.replace(/^[-*]\s+/gm, "");
  cleaned = cleaned.replace(/^\d+\.\s+/gm, "");
  
  // Ensure single <speak> root tag
  if (!/<\s*speak[^>]*>/i.test(cleaned)) {
    cleaned = `<speak>${cleaned}</speak>`;
  } else {
    // Remove duplicate speak tags (keep only outermost)
    cleaned = cleaned.replace(/<\/?speak[^>]*>/gi, (match, offset, str) => {
      const isFirst = str.indexOf('<speak') === offset;
      const isLast = str.lastIndexOf('</speak>') === offset;
      if (isFirst || isLast) return match;
      return '';
    });
  }
  
  // Remove unsupported SSML tags but preserve their content
  // Replace <p> with break, keep text
  cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1<break time=\"300ms\"/>");
  
  // Remove audio, sub, mark tags but keep their inner text
  cleaned = cleaned.replace(/<(audio|sub|mark)\b[^>]*>(.*?)<\/\1>/gi, "$2");
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ");
  
  return cleaned.trim();
}

/**
 * Strict SSML linting and validation
 * @param ssml - SSML string to validate
 * @returns Object with validation result and fixed SSML
 */
export function lintSSMLStrict(ssml: string): { ok: boolean; fixed: string; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fixed = ssml;
  let hasCriticalErrors = false;
  
  // Escape unescaped XML entities
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(fixed)) {
    fixed = fixed.replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, "&amp;");
    warnings.push("Auto-fixed: Escaped unescaped XML entities");
  }
  
  // Ensure <speak> root tag exists
  const hasSpeakTag = /<\s*speak[^>]*>[\s\S]*<\/\s*speak\s*>/i.test(fixed);
  if (!hasSpeakTag) {
    fixed = `<speak>${fixed}</speak>`;
    warnings.push("Auto-fixed: Added missing <speak> root tag");
  }
  
  // Check for markdown artifacts (auto-fix, just warn)
  if (/[*_`#]/.test(fixed)) {
    fixed = fixed.replace(/[*_`#]/g, "");
    warnings.push("Auto-fixed: Removed markdown artifacts (*, _, `, #)");
  }
  
  // Check for unclosed tags (basic check - warning only)
  const openTags = fixed.match(/<(\w+)[^/>]*(?<!\/)>/g) || [];
  const closeTags = fixed.match(/<\/(\w+)>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    warnings.push("Possible unclosed tags detected (tag count mismatch)");
  }
  
  // Check for invalid prosody values
  const prosodyRegex = /<prosody\s+([^>]+)>/g;
  let match;
  while ((match = prosodyRegex.exec(fixed)) !== null) {
    const attrs = match[1];
    
    // Check rate values (critical error if truly invalid)
    if (/rate="([^"]+)"/.test(attrs)) {
      const rateMatch = attrs.match(/rate="([^"]+)"/);
      const rate = rateMatch?.[1];
      const validRates = ['x-slow', 'slow', 'medium', 'fast', 'x-fast'];
      if (rate && !validRates.includes(rate) && !/^\d+%$/.test(rate)) {
        errors.push(`Invalid prosody rate: ${rate}`);
        hasCriticalErrors = true;
      }
    }
    
    // Check pitch values (critical error if truly invalid)
    if (/pitch="([^"]+)"/.test(attrs)) {
      const pitchMatch = attrs.match(/pitch="([^"]+)"/);
      const pitch = pitchMatch?.[1];
      const validPitches = ['x-low', 'low', 'medium', 'high', 'x-high'];
      if (pitch && !validPitches.includes(pitch) && !/^[+-]?\d+%$/.test(pitch)) {
        errors.push(`Invalid prosody pitch: ${pitch}`);
        hasCriticalErrors = true;
      }
    }
  }
  
  // Check for very long text without breaks (UX advisory - warning only)
  const textBetweenBreaks = fixed.split(/<break[^>]*\/?>/);
  textBetweenBreaks.forEach((segment, idx) => {
    const plainText = segment.replace(/<[^>]+>/g, " ").trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    if (wordCount > 50) {
      warnings.push(`Segment ${idx} has ${wordCount} words without break - consider adding pauses`);
    }
  });
  
  const ok = !hasCriticalErrors;
  
  return { ok, fixed, errors, warnings };
}

/**
 * Compress SSML to target duration while keeping key content
 * Strategy: Keep hook, core concept, 1 example, 1 recap; remove tangents
 * 
 * @param ssml - SSML string to compress
 * @param options - Compression options
 * @returns Compressed SSML
 */
export function compressSpeakSSML(
  ssml: string,
  options: { targetSeconds?: number; maxWords?: number } = {}
): string {
  const targetSeconds = options.targetSeconds || 45;
  const maxWords = options.maxWords || Math.floor((targetSeconds * 140) / 60); // ~140 wpm
  
  // Extract content between <speak> tags
  const speakMatch = ssml.match(/<speak[^>]*>([\s\S]*)<\/speak>/i);
  const content = speakMatch ? speakMatch[1] : ssml;
  
  // Split by sentence-like boundaries, preserving punctuation
  // Use capturing group to keep delimiters
  const sentenceParts = content.split(/(<\/s>|[.!?])/);
  const sentences: string[] = [];
  
  for (let i = 0; i < sentenceParts.length; i += 2) {
    const text = sentenceParts[i]?.trim();
    const delimiter = sentenceParts[i + 1] || '';
    
    if (text) {
      // Recombine text with its punctuation
      sentences.push(text + delimiter);
    }
  }
  
  // Filter empty
  const validSentences = sentences.filter(Boolean);
  
  // Priority scoring: hook (first), examples, recaps, explanations
  const scoredSentences = validSentences.map((sentence, idx) => {
    let score = 0;
    const lower = sentence.toLowerCase();
    
    // First sentence (hook) - highest priority
    if (idx === 0) score += 10;
    
    // Last sentence (recap/conclusion) - high priority
    if (idx === sentences.length - 1) score += 8;
    
    // Contains example keywords
    if (/for example|let's say|consider|imagine|think of/i.test(lower)) score += 6;
    
    // Contains explanation keywords
    if (/because|so|therefore|this means|in other words/i.test(lower)) score += 5;
    
    // Contains recap keywords
    if (/remember|to summarize|in short|key point|main idea/i.test(lower)) score += 7;
    
    // Contains question (engagement)
    if (/\?/.test(sentence)) score += 4;
    
    // Contains emphasis tags (important content)
    if (/<emphasis/.test(sentence)) score += 3;
    
    // Shorter sentences are better for compression
    const wordCount = sentence.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    if (wordCount < 15) score += 2;
    
    return { sentence, score, wordCount, idx };
  });
  
  // Sort by score (descending)
  scoredSentences.sort((a, b) => b.score - a.score);
  
  // Select sentences up to maxWords
  const selected: typeof scoredSentences = [];
  let totalWords = 0;
  
  for (const item of scoredSentences) {
    if (totalWords + item.wordCount <= maxWords) {
      selected.push(item);
      totalWords += item.wordCount;
    }
  }
  
  // Re-sort by original order to maintain flow
  selected.sort((a, b) => a.idx - b.idx);
  
  // Reconstruct SSML with breaks
  const compressed = selected
    .map(item => item.sentence)
    .join('<break time="250ms"/>');
  
  // Get prosody wrapper if it exists
  const prosodyMatch = content.match(/<prosody[^>]*>/);
  const prosodyTag = prosodyMatch ? prosodyMatch[0] : '<prosody rate="medium" pitch="+0%">';
  
  return `<speak>${prosodyTag}${compressed}</prosody></speak>`;
}

/**
 * Extract plain text from SSML (for logging, debugging)
 * @param ssml - SSML string
 * @returns Plain text without tags
 */
export function ssmlToPlainText(ssml: string): string {
  return ssml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validate SSML against AWS Polly requirements
 * @param ssml - SSML string to validate
 * @returns Validation result with issues
 */
export function validatePollySSML(ssml: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check max length (3000 characters for Polly)
  if (ssml.length > 3000) {
    issues.push(`SSML exceeds 3000 characters (${ssml.length})`);
  }
  
  // Check for unsupported tags
  const unsupportedTags = ['audio', 'p', 'sub', 'mark', 'desc', 'meta'];
  unsupportedTags.forEach(tag => {
    if (new RegExp(`<${tag}[\\s>]`, 'i').test(ssml)) {
      issues.push(`Unsupported tag: <${tag}>`);
    }
  });
  
  // Check prosody attributes
  if (/<prosody/.test(ssml)) {
    const prosodyMatches = ssml.match(/<prosody\s+([^>]+)>/g) || [];
    prosodyMatches.forEach(tag => {
      // Validate rate
      if (/rate="([^"]+)"/.test(tag)) {
        const rate = tag.match(/rate="([^"]+)"/)?.[1];
        const validRates = ['x-slow', 'slow', 'medium', 'fast', 'x-fast'];
        if (rate && !validRates.includes(rate) && !/^\d+%$/.test(rate)) {
          issues.push(`Invalid rate value: ${rate}`);
        }
      }
    });
  }
  
  // Check break time values
  const breakMatches = ssml.match(/<break\s+time="([^"]+)"\s*\/?>/g) || [];
  breakMatches.forEach(breakTag => {
    const time = breakTag.match(/time="([^"]+)"/)?.[1];
    if (time && !/^\d+(ms|s)$/.test(time)) {
      issues.push(`Invalid break time format: ${time}`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
}
