/**
 * Developer Context Builder for Dual-Output System
 * 
 * Builds context messages for AI to understand persona, language, and emotion
 */

interface DevContextOptions {
  persona: "Priya" | "Amit";
  language: "en" | "hi" | "hinglish";
  emotion?: string;
  topicHints?: string[];
  userLevel?: string;
  subject?: string;
}

/**
 * Build developer context for dual-output generation
 * @param options - Context configuration
 * @returns Formatted context string for AI
 */
export function buildDevContext(options: DevContextOptions): string {
  const {
    persona,
    language,
    emotion = "neutral",
    topicHints = [],
    userLevel,
    subject
  } = options;
  
  const contextParts: string[] = [];
  
  // Core context
  contextParts.push(`Persona: ${persona}`);
  contextParts.push(`Language: ${language}`);
  contextParts.push(`Emotion: ${emotion}`);
  
  // Optional context
  if (topicHints.length > 0) {
    contextParts.push(`Topic hints: ${topicHints.join(", ")}`);
  }
  
  if (userLevel) {
    contextParts.push(`User level: ${userLevel}`);
  }
  
  if (subject) {
    contextParts.push(`Subject: ${subject}`);
  }
  
  // Persona-specific guidance
  if (persona === "Priya") {
    contextParts.push(`Teaching style: Warm, encouraging, uses everyday analogies, patient with mistakes`);
  } else if (persona === "Amit") {
    contextParts.push(`Teaching style: Friendly, enthusiastic, uses sports/games analogies, energetic`);
  }
  
  // Language-specific guidance
  if (language === "hinglish") {
    contextParts.push(`Code-switching: Mix Hindi and English naturally, tech terms in English`);
  } else if (language === "hi") {
    contextParts.push(`Use simple Hindi vocabulary, technical terms can stay in English if commonly used`);
  }
  
  // Emotion-specific guidance
  const emotionGuidance: Record<string, string> = {
    confused: "User is confused - slow down, use simpler language, more analogies, shorter steps",
    frustrated: "User is frustrated - be patient, reassuring tone, break into tiny steps",
    excited: "User is excited - match their energy, faster pace, celebrate progress",
    curious: "User is curious - encourage exploration, pose questions, build on interest",
    neutral: "Standard conversational teaching pace and tone"
  };
  
  if (emotion && emotionGuidance[emotion]) {
    contextParts.push(`Adaptation: ${emotionGuidance[emotion]}`);
  }
  
  return contextParts.join("\n");
}

/**
 * Get prosody settings based on emotion
 * @param emotion - Detected user emotion
 * @returns Prosody attributes for SSML
 */
export function getEmotionProsody(emotion: string): { rate: string; pitch: string } {
  const prosodyMap: Record<string, { rate: string; pitch: string }> = {
    confused: { rate: "slow", pitch: "+1%" },
    frustrated: { rate: "slow", pitch: "+0%" },
    excited: { rate: "fast", pitch: "+3%" },
    curious: { rate: "medium", pitch: "+2%" },
    calm: { rate: "slow", pitch: "-1%" },
    neutral: { rate: "medium", pitch: "+0%" }
  };
  
  return prosodyMap[emotion] || prosodyMap.neutral;
}

/**
 * Get break time based on content type
 * @param purpose - Segment purpose
 * @returns Break time in milliseconds
 */
export function getBreakTime(purpose: "step" | "example" | "recap" | "transition"): string {
  const breakMap: Record<string, string> = {
    step: "250ms",
    example: "400ms",
    recap: "350ms",
    transition: "300ms"
  };
  
  return breakMap[purpose] || "250ms";
}

/**
 * Estimate segment count based on topic complexity
 * @param topicHints - Topic keywords
 * @returns Suggested number of segments
 */
export function estimateSegmentCount(topicHints: string[]): number {
  // Complex topics need more segments (5-7)
  const complexKeywords = ['proof', 'derivation', 'mechanism', 'synthesis', 'integration'];
  const hasComplex = topicHints.some(hint => 
    complexKeywords.some(keyword => hint.toLowerCase().includes(keyword))
  );
  
  if (hasComplex) return 6;
  
  // Medium topics (4-5 segments)
  const mediumKeywords = ['concept', 'equation', 'reaction', 'process'];
  const hasMedium = topicHints.some(hint =>
    mediumKeywords.some(keyword => hint.toLowerCase().includes(keyword))
  );
  
  if (hasMedium) return 5;
  
  // Simple topics (3-4 segments)
  return 4;
}
