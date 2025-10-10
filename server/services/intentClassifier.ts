import { optimizedAI } from './optimizedAIService';
import { INTENT_PATTERNS, CONTEXT_SHORTCUTS } from '../config/intentPatterns';
import type { IntentResult, IntentType } from '../types/intents';

interface ClassificationContext {
  currentPhase?: string;
  lastAIMessage?: string;
  sessionState?: string;
  currentTopic?: string;
  isInPracticeMode?: boolean;
}

export class IntentClassifier {
  
  async classify(message: string, context: ClassificationContext): Promise<IntentResult> {
    const keywordResult = await this.classifyWithKeywords(message, context);
    if (keywordResult && keywordResult.confidence > 0.9) {
      console.log(`[INTENT] Fast match: ${keywordResult.intent} (${keywordResult.confidence})`);
      return keywordResult;
    }
    
    console.log('[INTENT] Using LLM classification');
    return await this.classifyWithLLM(message, context);
  }
  
  private async classifyWithKeywords(message: string, context: ClassificationContext): Promise<IntentResult | null> {
    const messageLower = message.toLowerCase().trim();
    
    if (context.isInPracticeMode || context.currentPhase === 'practice') {
      if (CONTEXT_SHORTCUTS.practiceMode.numericAnswer.test(messageLower)) {
        return {
          intent: 'submit_answer',
          confidence: 0.95,
          entities: this.extractEntities(message, 'submit_answer')
        };
      }
      if (CONTEXT_SHORTCUTS.practiceMode.mcqAnswer.test(messageLower)) {
        return {
          intent: 'submit_answer',
          confidence: 0.95,
          entities: this.extractEntities(message, 'submit_answer')
        };
      }
    }
    
    let bestMatch: { intent: IntentType; matchCount: number; totalKeywords: number } | null = null;
    
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
      if (pattern.keywords.length === 0) continue;
      
      const matchCount = pattern.keywords.filter(kw => 
        messageLower.includes(kw.toLowerCase())
      ).length;
      
      if (matchCount >= pattern.threshold) {
        if (!bestMatch || matchCount > bestMatch.matchCount) {
          bestMatch = { 
            intent: intent as IntentType, 
            matchCount,
            totalKeywords: pattern.keywords.length
          };
        }
      }
    }
    
    if (bestMatch) {
      const baseConfidence = 0.92;
      const bonusPerMatch = 0.02;
      const confidence = Math.min(0.98, baseConfidence + (bestMatch.matchCount - 1) * bonusPerMatch);
      
      return {
        intent: bestMatch.intent,
        confidence,
        entities: this.extractEntities(message, bestMatch.intent)
      };
    }
    
    return null;
  }
  
  private async classifyWithLLM(message: string, context: ClassificationContext): Promise<IntentResult> {
    const prompt = `Classify the following student message into ONE intent category.

Student message: "${message}"
Current topic: ${context.currentTopic || 'N/A'}
Last AI message: "${context.lastAIMessage?.substring(0, 100) || 'N/A'}"
Session phase: ${context.currentPhase || 'N/A'}

Intent categories:
- request_explanation, request_example, request_simplification, ask_doubt
- request_practice, submit_answer, request_hint, request_solution
- change_topic, pause_session, review_previous
- frustration, needs_motivation, celebration
- technical_issue, feature_query, feedback, casual_chat, inappropriate

Return JSON: {"intent": "intent_name", "confidence": 0.85, "entities": {}}`;

    try {
      const result = await optimizedAI.generateResponse(
        prompt,
        undefined,
        { useCache: false }
      );
      
      const responseText = result.response.trim();
      let parsed: any;
      
      // Strategy 1: Try parsing entire response directly
      try {
        parsed = JSON.parse(responseText);
      } catch {
        // Strategy 2: Look for JSON in code blocks (```json ... ```)
        const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          try {
            parsed = JSON.parse(codeBlockMatch[1]);
          } catch {
            // Continue to next strategy
          }
        }
      }
      
      // Strategy 3: Extract JSON object by counting braces (handles nested objects)
      if (!parsed) {
        const firstBrace = responseText.indexOf('{');
        if (firstBrace !== -1) {
          let braceCount = 0;
          let jsonStr = '';
          
          for (let i = firstBrace; i < responseText.length; i++) {
            const char = responseText[i];
            jsonStr += char;
            
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            
            if (braceCount === 0) {
              try {
                parsed = JSON.parse(jsonStr);
                break;
              } catch {
                // Invalid JSON, continue
              }
            }
          }
        }
      }
      
      // Validate parsed result
      if (!parsed || !parsed.intent || typeof parsed.confidence !== 'number') {
        console.warn('[INTENT] Invalid LLM response format, defaulting to ask_doubt');
        console.warn('[INTENT] Response was:', responseText.substring(0, 200));
        return { intent: 'ask_doubt', confidence: 0.5, entities: {} };
      }
      
      return {
        intent: parsed.intent as IntentType,
        confidence: Math.max(0.5, Math.min(1.0, parsed.confidence)),
        entities: parsed.entities || this.extractEntities(message, parsed.intent)
      };
    } catch (error) {
      console.error('[INTENT] LLM classification error:', error);
      return { intent: 'ask_doubt', confidence: 0.5, entities: {} };
    }
  }
  
  private extractEntities(message: string, intent: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    const numberMatch = message.match(/(-?\d+\.?\d*)\s*(m\/s|m\/s²|m\/s^2|kg|m|s|N|J|joule|joules|cal|mol|atm|pa|pascal)?/i);
    if (numberMatch) {
      entities.answer = parseFloat(numberMatch[1]);
      entities.unit = numberMatch[2] || null;
    }
    
    const optionMatch = message.match(/option\s*([a-d])/i);
    if (optionMatch) {
      entities.selectedOption = optionMatch[1].toUpperCase();
    }
    
    const topicKeywords = ['physics', 'chemistry', 'biology', 'math', 'kinematics', 'thermodynamics', 'optics', 'mechanics', 'organic', 'inorganic'];
    for (const topic of topicKeywords) {
      if (message.toLowerCase().includes(topic)) {
        entities.requestedTopic = topic;
        break;
      }
    }
    
    return entities;
  }
}

export const intentClassifier = new IntentClassifier();
