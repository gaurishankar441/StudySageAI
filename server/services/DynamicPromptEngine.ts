import type { DetectedLanguage, LanguageDetectionResult } from './LanguageDetectionEngine';
import type { SessionContext } from './SessionContextManager';
import type { EmotionalState } from '../config/emotionPatterns';
import type { IntentType } from '../types/intents';
import { SYSTEM_PROMPTS, RESPONSE_TEMPLATES } from '../config/languagePrompts';
import { EMOTION_RESPONSE_MODIFIERS } from '../config/emotionPatterns';

export interface PromptContext {
  // Language context
  detectedLanguage: DetectedLanguage;
  languageConfidence: number;
  preferredLanguage?: DetectedLanguage;
  
  // Emotional context
  currentEmotion: EmotionalState;
  emotionConfidence: number;
  emotionalStability?: number;
  
  // Learning context
  subject: string;
  topic: string;
  level: string;
  currentPhase: string;
  
  // Intent context
  intent?: IntentType;
  
  // Session context
  messageCount?: number;
  misconceptions?: string[];
  strongConcepts?: string[];
  avgResponseTime?: number;
}

export interface GeneratedPrompt {
  systemPrompt: string;
  userPromptPrefix?: string;
  responseGuidelines: string[];
  adaptations: string[];
}

export class DynamicPromptEngine {
  
  /**
   * Generate context-aware system prompt
   */
  generateSystemPrompt(context: PromptContext): GeneratedPrompt {
    const adaptations: string[] = [];
    
    // 1. Base language prompt
    let systemPrompt = this.getBaseLanguagePrompt(context.detectedLanguage, context.preferredLanguage);
    adaptations.push(`Language: ${context.detectedLanguage} (confidence: ${(context.languageConfidence * 100).toFixed(0)}%)`);
    
    // 2. Intent-specific overrides
    if (context.intent) {
      const intentOverride = this.getIntentOverride(context.detectedLanguage, context.intent);
      if (intentOverride) {
        systemPrompt += '\n\n' + intentOverride;
        adaptations.push(`Intent: ${context.intent}`);
      }
    }
    
    // 3. Emotional adaptation
    const emotionGuidelines = this.getEmotionGuidelines(context.currentEmotion, context.emotionalStability);
    if (emotionGuidelines) {
      systemPrompt += '\n\n' + emotionGuidelines;
      adaptations.push(`Emotion: ${context.currentEmotion}`);
    }
    
    // 4. Learning context
    const learningContext = this.getLearningContext(context);
    systemPrompt += '\n\n' + learningContext;
    adaptations.push(`Phase: ${context.currentPhase}, Level: ${context.level}`);
    
    // 5. Misconceptions and strengths adaptation
    if (context.misconceptions && context.misconceptions.length > 0) {
      const misconceptionGuidance = this.getMisconceptionGuidance(context.misconceptions);
      systemPrompt += '\n\n' + misconceptionGuidance;
      adaptations.push(`Targeting ${context.misconceptions.length} misconceptions`);
    }
    
    if (context.strongConcepts && context.strongConcepts.length > 0) {
      const strengthGuidance = this.getStrengthGuidance(context.strongConcepts);
      systemPrompt += '\n\n' + strengthGuidance;
      adaptations.push(`Building on ${context.strongConcepts.length} strong concepts`);
    }
    
    // 6. Response time adaptation (if slow responses, keep it concise)
    if (context.avgResponseTime && context.avgResponseTime > 3000) {
      systemPrompt += '\n\nIMPORTANT: Keep responses concise and focused (user has slow response times).';
      adaptations.push('Optimized for slow connection');
    }
    
    // 7. Language consistency reminder
    if (context.preferredLanguage && context.preferredLanguage !== context.detectedLanguage) {
      systemPrompt += `\n\nNOTE: User typically uses ${context.preferredLanguage} but current message is in ${context.detectedLanguage}. Match current message language unless user explicitly requests change.`;
      adaptations.push('Language switch detected');
    }
    
    // Generate response guidelines
    const responseGuidelines = this.generateResponseGuidelines(context);
    
    return {
      systemPrompt,
      responseGuidelines,
      adaptations
    };
  }

  /**
   * Get base language-specific prompt
   */
  private getBaseLanguagePrompt(detected: DetectedLanguage, preferred?: DetectedLanguage): string {
    // Use preferred language if available and high consistency
    const targetLanguage = preferred || detected;
    
    if (targetLanguage === 'hindi' || targetLanguage === 'hinglish') {
      return SYSTEM_PROMPTS.hindi_hinglish.core;
    } else {
      return SYSTEM_PROMPTS.english_pure.core;
    }
  }

  /**
   * Get intent-specific override
   */
  private getIntentOverride(language: DetectedLanguage, intent: IntentType): string | null {
    const isHindi = language === 'hindi' || language === 'hinglish';
    const basePrompt = isHindi ? SYSTEM_PROMPTS.hindi_hinglish : SYSTEM_PROMPTS.english_pure;
    
    const override = (basePrompt.intent_overrides as Record<string, string>)[intent];
    return override || null;
  }

  /**
   * Get emotion-based guidelines
   */
  private getEmotionGuidelines(emotion: EmotionalState, stability?: number): string | null {
    const modifiers = EMOTION_RESPONSE_MODIFIERS[emotion];
    if (!modifiers) return null;
    
    let guidelines = `\nEMOTIONAL STATE ADAPTATION (${emotion}):\n`;
    guidelines += `- Tone: ${modifiers.tone}\n`;
    guidelines += `- Response Length: ${modifiers.responseLength}\n`;
    guidelines += `- Suggested Actions: ${modifiers.suggestedActions.join(', ')}\n`;
    
    // Add stability consideration
    if (stability !== undefined && stability < 0.5) {
      guidelines += `- NOTE: Emotional state is unstable (${(stability * 100).toFixed(0)}% consistency). Be extra attentive to mood shifts.\n`;
    }
    
    return guidelines;
  }

  /**
   * Get learning context section
   */
  private getLearningContext(context: PromptContext): string {
    return `
CURRENT LEARNING CONTEXT:
Subject: ${context.subject}
Topic: ${context.topic}
Student Level: ${context.level}
Session Phase: ${context.currentPhase}
${context.messageCount ? `Messages in Session: ${context.messageCount}` : ''}`;
  }

  /**
   * Get misconception guidance
   */
  private getMisconceptionGuidance(misconceptions: string[]): string {
    return `
IDENTIFIED MISCONCEPTIONS:
${misconceptions.map((m, i) => `${i + 1}. ${m}`).join('\n')}

IMPORTANT: Address these gently without making student feel bad. Use questions to guide them to correct understanding.`;
  }

  /**
   * Get strength guidance
   */
  private getStrengthGuidance(strongConcepts: string[]): string {
    return `
STUDENT'S STRONG CONCEPTS:
${strongConcepts.map((s, i) => `${i + 1}. ${s}`).join('\n')}

IMPORTANT: Build on these strengths when teaching new concepts. Use these as anchors for explanations.`;
  }

  /**
   * Generate response guidelines based on context
   */
  private generateResponseGuidelines(context: PromptContext): string[] {
    const guidelines: string[] = [];
    
    // Language guidelines
    if (context.detectedLanguage === 'hindi' || context.detectedLanguage === 'hinglish') {
      guidelines.push('Use natural Hinglish code-switching (60-70% Hindi, 30-40% English for technical terms)');
      guidelines.push('Start sentences in Hindi, include English technical terms mid-sentence');
    } else {
      guidelines.push('Use clear, professional English');
      guidelines.push('Avoid complex jargon unless student level is advanced');
    }
    
    // Emotional guidelines
    const emotionMods = EMOTION_RESPONSE_MODIFIERS[context.currentEmotion];
    if (emotionMods) {
      guidelines.push(`Tone: ${emotionMods.tone}`);
      guidelines.push(`Encouragement level: ${emotionMods.encouragement}`);
    }
    
    // Phase guidelines
    switch (context.currentPhase) {
      case 'greeting':
        guidelines.push('Warm welcome, build rapport quickly');
        break;
      case 'assessment':
        guidelines.push('Diagnose level without making student anxious');
        break;
      case 'teaching':
        guidelines.push('Break concepts into chunks, check understanding frequently');
        break;
      case 'practice':
        guidelines.push('Give hints, not answers. Let student solve problems');
        break;
      case 'feedback':
        guidelines.push('Be specific and constructive, celebrate progress');
        break;
      case 'closure':
        guidelines.push('Recap key points, motivate for next session');
        break;
    }
    
    // Intent guidelines
    if (context.intent === 'request_hint') {
      guidelines.push('CRITICAL: Give guiding question, NOT full solution');
    } else if (context.intent === 'submit_answer') {
      guidelines.push('Evaluate answer, give constructive feedback');
    } else if (context.intent === 'request_explanation') {
      guidelines.push('Explain concept with relatable examples');
    }
    
    return guidelines;
  }

  /**
   * Generate user prompt prefix (optional context injection)
   */
  generateUserPromptPrefix(context: PromptContext): string | undefined {
    // Add context that helps AI understand the situation better
    const prefixes: string[] = [];
    
    if (context.messageCount && context.messageCount === 1) {
      prefixes.push('[First message in session]');
    }
    
    if (context.emotionalStability !== undefined && context.emotionalStability < 0.4) {
      prefixes.push('[Student mood is fluctuating]');
    }
    
    if (context.languageConfidence < 0.7) {
      prefixes.push('[Language detection confidence is low]');
    }
    
    return prefixes.length > 0 ? prefixes.join(' ') + '\n\n' : undefined;
  }

  /**
   * Build complete prompt package for AI model
   */
  buildPromptPackage(
    context: PromptContext,
    userMessage: string
  ): {
    systemPrompt: string;
    userMessage: string;
    metadata: {
      adaptations: string[];
      guidelines: string[];
    };
  } {
    const generated = this.generateSystemPrompt(context);
    const prefix = this.generateUserPromptPrefix(context);
    
    return {
      systemPrompt: generated.systemPrompt,
      userMessage: prefix ? prefix + userMessage : userMessage,
      metadata: {
        adaptations: generated.adaptations,
        guidelines: generated.responseGuidelines
      }
    };
  }

  /**
   * Get response template for specific situation
   */
  getResponseTemplate(
    language: DetectedLanguage,
    type: 'greeting' | 'correct_answer' | 'wrong_answer' | 'check_understanding' | 'encouragement'
  ): string | null {
    const langKey = (language === 'hindi' || language === 'hinglish') ? 'hindi' : 'english';
    const templates = (RESPONSE_TEMPLATES as any)[langKey]?.[type] || [];
    
    if (templates.length === 0) return null;
    
    // Return random template from available options
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Calculate prompt complexity score
   */
  calculateComplexityScore(prompt: string): number {
    // Simple heuristic: character count + unique instruction count
    const charScore = Math.min(prompt.length / 2000, 1); // Normalize to 0-1
    const instructionCount = (prompt.match(/IMPORTANT:|NOTE:|CRITICAL:/g) || []).length;
    const instructionScore = Math.min(instructionCount / 5, 1);
    
    return (charScore + instructionScore) / 2;
  }

  /**
   * Optimize prompt (remove redundancy if too complex)
   */
  optimizePrompt(prompt: string, maxComplexity: number = 0.8): string {
    const complexity = this.calculateComplexityScore(prompt);
    
    if (complexity <= maxComplexity) {
      return prompt;
    }
    
    // Remove less critical sections
    let optimized = prompt;
    
    // Remove optional notes if too long
    if (complexity > 0.9) {
      optimized = optimized.replace(/\nNOTE:.*?\n/g, '\n');
    }
    
    // Condense learning context if still too long
    if (this.calculateComplexityScore(optimized) > maxComplexity) {
      optimized = optimized.replace(/CURRENT LEARNING CONTEXT:[\s\S]*?(?=\n\n|$)/, 
        'CONTEXT: ' + prompt.match(/Subject: (.*?)\nTopic: (.*?)\n/)?.[0] || '');
    }
    
    return optimized;
  }
}

export const dynamicPromptEngine = new DynamicPromptEngine();
