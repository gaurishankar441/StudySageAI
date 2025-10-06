import { SYSTEM_PROMPTS, RESPONSE_TEMPLATES } from '../config/languagePrompts';
import type { IntentType } from '../types/intents';

export class PromptBuilder {
  
  buildSystemPrompt(options: {
    userLanguage: 'hi' | 'en';
    subject: string;
    topic: string;
    level: string;
    currentPhase: string;
    intent?: IntentType;
    emotionalState?: string;
  }): string {
    
    const isHindi = options.userLanguage === 'hi';
    const basePrompt = isHindi ? SYSTEM_PROMPTS.hindi_hinglish : SYSTEM_PROMPTS.english_pure;
    
    let systemPrompt = basePrompt.core;
    
    if (options.intent) {
      const override = (basePrompt.intent_overrides as Record<string, string>)[options.intent];
      if (override) {
        systemPrompt += '\n\n' + override;
      }
    }
    
    systemPrompt += `\n\nCURRENT CONTEXT:
Subject: ${options.subject}
Topic: ${options.topic}
Student Level: ${options.level}
Session Phase: ${options.currentPhase}`;

    if (options.emotionalState === 'frustrated') {
      systemPrompt += '\n\nIMPORTANT: Student seems frustrated. Be extra patient, use simpler language, and offer breaks if needed.';
    } else if (options.emotionalState === 'confident') {
      systemPrompt += '\n\nIMPORTANT: Student is doing well. You can introduce slightly more challenging concepts.';
    }
    
    return systemPrompt;
  }
  
  getTemplate(language: 'hi' | 'en', type: string): string {
    const langKey = language === 'hi' ? 'hindi' : 'english';
    const templates = (RESPONSE_TEMPLATES as any)[langKey]?.[type] || [];
    if (templates.length === 0) return '';
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  fillTemplate(template: string, data: Record<string, string>): string {
    let filled = template;
    for (const [key, value] of Object.entries(data)) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return filled;
  }
}

export const promptBuilder = new PromptBuilder();
