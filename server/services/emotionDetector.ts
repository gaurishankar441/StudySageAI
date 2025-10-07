import OpenAI from 'openai';
import { EMOTION_PATTERNS, type EmotionalState } from '../config/emotionPatterns';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use emotion detection.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface EmotionResult {
  emotion: EmotionalState;
  confidence: number;
  reasoning?: string;
  detectionMethod: 'keyword' | 'llm';
}

interface EmotionScore {
  emotion: EmotionalState;
  score: number;
  matchedKeywords?: string[];
}

export class EmotionDetector {
  private readonly KEYWORD_THRESHOLD = 0.75;
  private readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;

  async detectEmotion(
    message: string,
    previousMessages?: Array<{ role: string; content: string }>,
    language: 'hi' | 'en' = 'en'
  ): Promise<EmotionResult> {
    const normalized = message.toLowerCase();
    
    const keywordScores = this.scoreByKeywords(normalized);
    const topKeywordEmotion = keywordScores[0];
    
    if (topKeywordEmotion && topKeywordEmotion.score >= this.HIGH_CONFIDENCE_THRESHOLD) {
      console.log(`[EMOTION] Fast-path: ${topKeywordEmotion.emotion} (${topKeywordEmotion.score.toFixed(2)}) - Keywords: ${topKeywordEmotion.matchedKeywords?.join(', ')}`);
      
      return {
        emotion: topKeywordEmotion.emotion,
        confidence: topKeywordEmotion.score,
        detectionMethod: 'keyword'
      };
    }
    
    if (topKeywordEmotion && topKeywordEmotion.score >= this.KEYWORD_THRESHOLD) {
      console.log(`[EMOTION] Using keyword detection: ${topKeywordEmotion.emotion} (${topKeywordEmotion.score.toFixed(2)})`);
      
      return {
        emotion: topKeywordEmotion.emotion,
        confidence: topKeywordEmotion.score,
        detectionMethod: 'keyword'
      };
    }
    
    console.log(`[EMOTION] Keyword scores too low, using LLM detection`);
    return await this.detectWithLLM(message, previousMessages, language);
  }

  private scoreByKeywords(normalizedMessage: string): EmotionScore[] {
    const scores: EmotionScore[] = [];
    
    for (const [emotion, pattern] of Object.entries(EMOTION_PATTERNS)) {
      if (emotion === 'neutral') continue;
      
      let matchCount = 0;
      const matchedKeywords: string[] = [];
      
      for (const phrase of pattern.phrases) {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          matchCount += 2;
          matchedKeywords.push(phrase);
        }
      }
      
      for (const keyword of pattern.keywords) {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
        if (regex.test(normalizedMessage)) {
          matchCount += 1;
          matchedKeywords.push(keyword);
        }
      }
      
      if (matchCount > 0) {
        const baseScore = Math.min(matchCount * 0.25, 1.0);
        const finalScore = baseScore * pattern.weight;
        
        scores.push({
          emotion: emotion as EmotionalState,
          score: finalScore,
          matchedKeywords
        });
      }
    }
    
    scores.sort((a, b) => b.score - a.score);
    return scores;
  }

  private async detectWithLLM(
    message: string,
    previousMessages?: Array<{ role: string; content: string }>,
    language: 'hi' | 'en' = 'en'
  ): Promise<EmotionResult> {
    try {
      const contextMessages = previousMessages?.slice(-4) || [];
      
      const systemPrompt = `You are an expert at detecting student emotions in educational conversations.

Analyze the student's message and classify their emotional state into ONE of these categories:

1. **confident**: Student feels confident, understands the concept, ready to move forward
   - Signs: "got it", "easy", "clear", "samajh gaya", "next"
   
2. **confused**: Student is confused, needs clarification or simpler explanation
   - Signs: "don't understand", "confused", "samajh nahi aaya", "kya hai"
   
3. **frustrated**: Student is frustrated, struggling, might give up
   - Signs: "can't do", "too hard", "giving up", "nahi ho raha", "stuck"
   
4. **bored**: Student is disengaged, finds content too easy or repetitive
   - Signs: "boring", "already know", "pata hai", "too easy"
   
5. **neutral**: Student is engaged but showing no strong emotion, balanced state
   - Default when no clear emotional signal

Consider:
- Current message tone and word choice
- ${language === 'hi' ? 'Hindi/Hinglish expressions' : 'English expressions'}
- Context from previous messages if available
- Question marks (?) often indicate confusion
- Exclamation marks (!) can indicate confidence or frustration

Respond with JSON only:
{
  "emotion": "confident" | "confused" | "frustrated" | "bored" | "neutral",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

      const userPrompt = contextMessages.length > 0
        ? `Previous context:\n${contextMessages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nCurrent message: "${message}"`
        : `Student message: "${message}"`;

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        console.warn('[EMOTION] No response from LLM, defaulting to neutral');
        return { emotion: 'neutral', confidence: 0.5, detectionMethod: 'llm' };
      }

      const parsed = JSON.parse(response);
      
      console.log(`[EMOTION] LLM detected: ${parsed.emotion} (${parsed.confidence}) - ${parsed.reasoning}`);
      
      return {
        emotion: parsed.emotion as EmotionalState,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        detectionMethod: 'llm'
      };

    } catch (error) {
      console.error('[EMOTION] LLM detection failed:', error);
      return {
        emotion: 'neutral',
        confidence: 0.5,
        detectionMethod: 'llm'
      };
    }
  }

  getEmotionModifiers(emotion: EmotionalState) {
    const { EMOTION_RESPONSE_MODIFIERS } = require('../config/emotionPatterns');
    return EMOTION_RESPONSE_MODIFIERS[emotion];
  }
}

export const emotionDetector = new EmotionDetector();
