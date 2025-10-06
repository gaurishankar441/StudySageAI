import type { IntentType } from '../types/intents';
import type { EmotionalState } from './emotionPatterns';

export interface ResponseConfig {
  targetWordCount: number;
  minWords: number;
  maxWords: number;
  structure: ResponseStructure;
  formatGuidance: string;
}

export type ResponseStructure = 
  | 'teaching'           // Explanation-heavy, concept building
  | 'practice'           // Problem-focused, guided practice
  | 'support'            // Encouragement-heavy, emotional support
  | 'assessment'         // Question-asking, understanding check
  | 'conversational';    // Casual, rapport building

const INTENT_LENGTH_TARGETS: Record<IntentType, { base: number; range: [number, number] }> = {
  request_explanation: { base: 200, range: [150, 300] },
  request_example: { base: 150, range: [100, 250] },
  request_simplification: { base: 180, range: [120, 280] },
  request_hint: { base: 80, range: [50, 120] },
  request_solution: { base: 150, range: [100, 250] },
  submit_answer: { base: 120, range: [80, 200] },
  ask_doubt: { base: 180, range: [120, 280] },
  change_topic: { base: 100, range: [70, 150] },
  pause_session: { base: 60, range: [40, 100] },
  review_previous: { base: 140, range: [100, 200] },
  frustration: { base: 100, range: [60, 150] },
  needs_motivation: { base: 100, range: [60, 150] },
  celebration: { base: 80, range: [50, 120] },
  technical_issue: { base: 120, range: [80, 180] },
  feature_query: { base: 120, range: [80, 180] },
  feedback: { base: 100, range: [60, 150] },
  casual_chat: { base: 80, range: [50, 120] },
  request_practice: { base: 120, range: [80, 180] },
  inappropriate: { base: 60, range: [40, 100] },
};

const EMOTION_LENGTH_MODIFIERS: Record<EmotionalState, number> = {
  confident: 0.8,      // Concise, student can handle it
  confused: 1.2,       // More detailed, break it down
  frustrated: 0.7,     // Brief, don't overwhelm
  bored: 0.9,          // Varied, keep it interesting
  neutral: 1.0,        // Standard length
};

const INTENT_STRUCTURES: Record<IntentType, ResponseStructure> = {
  request_explanation: 'teaching',
  request_example: 'teaching',
  request_simplification: 'teaching',
  request_hint: 'practice',
  request_solution: 'teaching',
  submit_answer: 'practice',
  ask_doubt: 'teaching',
  change_topic: 'conversational',
  pause_session: 'support',
  review_previous: 'teaching',
  frustration: 'support',
  needs_motivation: 'support',
  celebration: 'support',
  technical_issue: 'conversational',
  feature_query: 'conversational',
  feedback: 'conversational',
  casual_chat: 'conversational',
  request_practice: 'practice',
  inappropriate: 'conversational',
};

const STRUCTURE_TEMPLATES: Record<ResponseStructure, string> = {
  teaching: `STRUCTURE: Teaching Mode
- Start with clear concept definition
- Provide 1-2 concrete examples
- Explain WHY/HOW it works
- End with understanding check
- Use analogies where helpful`,

  practice: `STRUCTURE: Practice Mode
- Acknowledge student's attempt
- Guide toward solution (don't give full answer)
- Ask leading questions
- Provide incremental hints
- Encourage independent thinking`,

  support: `STRUCTURE: Support Mode
- Lead with empathy/acknowledgment
- Normalize the feeling/situation
- Provide brief encouragement
- Offer actionable next step
- Keep tone warm and reassuring`,

  assessment: `STRUCTURE: Assessment Mode
- Ask focused diagnostic question
- Check specific understanding
- Listen for misconceptions
- Keep it conversational, not quiz-like
- Use student's response to adapt`,

  conversational: `STRUCTURE: Conversational Mode
- Match student's tone and energy
- Keep it natural and friendly
- Brief responses unless asked for more
- Maintain rapport and connection
- Transition smoothly to teaching when needed`,
};

export class ResponseAdapter {
  calculateResponseConfig(
    intent: IntentType,
    emotion: EmotionalState,
    currentPhase?: string
  ): ResponseConfig {
    const DEFAULT_CONFIG = { base: 150, range: [100, 250] as [number, number] };
    const DEFAULT_STRUCTURE: ResponseStructure = 'teaching';
    
    const intentTarget = INTENT_LENGTH_TARGETS[intent] ?? DEFAULT_CONFIG;
    const emotionModifier = EMOTION_LENGTH_MODIFIERS[emotion] ?? 1.0;
    
    const minWords = Math.max(50, Math.round(intentTarget.range[0] * emotionModifier));
    const maxWords = Math.min(350, Math.round(intentTarget.range[1] * emotionModifier));
    
    const rawTarget = Math.round(intentTarget.base * emotionModifier);
    const targetWordCount = Math.max(minWords, Math.min(maxWords, rawTarget));
    
    let structure = INTENT_STRUCTURES[intent] ?? DEFAULT_STRUCTURE;
    
    if (currentPhase === 'greeting' || currentPhase === 'rapport') {
      structure = 'conversational';
    } else if (currentPhase === 'assessment') {
      structure = 'assessment';
    } else if (currentPhase === 'feedback' || currentPhase === 'closure') {
      structure = 'support';
    }
    
    const formatGuidance = STRUCTURE_TEMPLATES[structure];
    
    if (!INTENT_LENGTH_TARGETS[intent]) {
      console.warn(`[RESPONSE ADAPTER] Unknown intent: ${intent}, using default config`);
    }
    
    return {
      targetWordCount,
      minWords,
      maxWords,
      structure,
      formatGuidance,
    };
  }

  buildLengthConstraint(config: ResponseConfig, language: 'hi' | 'en'): string {
    const wordTerm = language === 'hi' ? 'shabdon' : 'words';
    
    return `
RESPONSE LENGTH CONSTRAINT:
Target: ${config.targetWordCount} ${wordTerm}
Range: ${config.minWords}-${config.maxWords} ${wordTerm}
CRITICAL: Keep response within this range. Don't be too brief or too verbose.
${language === 'hi' ? 'Hinglish mein bhi yeh word count follow karo.' : 'Follow this word count strictly.'}
    `.trim();
  }

  buildStructureGuidance(config: ResponseConfig): string {
    return `
${config.formatGuidance}

IMPORTANT: Follow this structure pattern to ensure response is well-organized and effective.
    `.trim();
  }
}

export const responseAdapter = new ResponseAdapter();
