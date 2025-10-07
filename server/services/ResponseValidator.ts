import OpenAI from 'openai';
import type { DetectedLanguage } from './LanguageDetectionEngine';
import type { EmotionalState } from '../config/emotionPatterns';
import { languageDetectionEngine } from './LanguageDetectionEngine';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use response validation.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export interface ValidationContext {
  expectedLanguage: DetectedLanguage;
  userEmotion: EmotionalState;
  currentPhase: string;
  subject: string;
  topic: string;
  userMessage: string;
}

export interface ValidationResult {
  isValid: boolean;
  overallScore: number; // 0-1
  layers: {
    languageMatch: LanguageMatchResult;
    toneAppropriate: ToneValidationResult;
    educationalQuality: QualityValidationResult;
    safety: SafetyValidationResult;
  };
  issues: string[];
  recommendations: string[];
  shouldRegenerate: boolean;
}

interface LanguageMatchResult {
  score: number;
  detectedLanguage: DetectedLanguage;
  matchesExpected: boolean;
  languageConsistency: number;
  codeSwitchingQuality?: number;
}

interface ToneValidationResult {
  score: number;
  detectedTone: string;
  matchesEmotion: boolean;
  empathyLevel: number;
  encouragementLevel: number;
}

interface QualityValidationResult {
  score: number;
  isAccurate: boolean;
  isHelpful: boolean;
  isRelevant: boolean;
  clarityScore: number;
  depthScore: number;
}

interface SafetyValidationResult {
  score: number;
  isSafe: boolean;
  hasInappropriateContent: boolean;
  hasMisinformation: boolean;
  concerns: string[];
}

export class ResponseValidator {
  private readonly LANGUAGE_WEIGHT = 0.3;
  private readonly TONE_WEIGHT = 0.25;
  private readonly QUALITY_WEIGHT = 0.3;
  private readonly SAFETY_WEIGHT = 0.15;
  
  private readonly VALIDATION_THRESHOLD = 0.7; // Minimum score to pass
  private readonly REGENERATE_THRESHOLD = 0.5; // Below this, regenerate

  /**
   * Main validation method - 4-layer validation
   */
  async validate(
    response: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Layer 1: Language Match Validation
    const languageMatch = await this.validateLanguageMatch(response, context.expectedLanguage);
    if (!languageMatch.matchesExpected) {
      issues.push(`Language mismatch: Expected ${context.expectedLanguage}, got ${languageMatch.detectedLanguage}`);
      recommendations.push('Regenerate response in correct language');
    }

    // Layer 2: Tone Appropriateness Validation
    const toneValidation = await this.validateTone(response, context.userEmotion, context.currentPhase);
    if (!toneValidation.matchesEmotion) {
      issues.push(`Tone mismatch: Response tone doesn't match student's ${context.userEmotion} emotional state`);
      recommendations.push('Adjust tone to be more empathetic and appropriate');
    }

    // Layer 3: Educational Quality Validation
    const qualityValidation = await this.validateEducationalQuality(
      response,
      context.userMessage,
      context.subject,
      context.topic
    );
    if (qualityValidation.score < 0.7) {
      issues.push('Educational quality is low');
      if (!qualityValidation.isRelevant) recommendations.push('Make response more relevant to topic');
      if (!qualityValidation.isHelpful) recommendations.push('Provide more actionable guidance');
    }

    // Layer 4: Safety Validation
    const safetyValidation = await this.validateSafety(response);
    if (!safetyValidation.isSafe) {
      issues.push('Safety concerns detected');
      safetyValidation.concerns.forEach(c => recommendations.push(`Address: ${c}`));
    }

    // Calculate overall score
    const overallScore = 
      (languageMatch.score * this.LANGUAGE_WEIGHT) +
      (toneValidation.score * this.TONE_WEIGHT) +
      (qualityValidation.score * this.QUALITY_WEIGHT) +
      (safetyValidation.score * this.SAFETY_WEIGHT);

    const isValid = overallScore >= this.VALIDATION_THRESHOLD && safetyValidation.isSafe;
    const shouldRegenerate = overallScore < this.REGENERATE_THRESHOLD;

    return {
      isValid,
      overallScore,
      layers: {
        languageMatch,
        toneAppropriate: toneValidation,
        educationalQuality: qualityValidation,
        safety: safetyValidation
      },
      issues,
      recommendations,
      shouldRegenerate
    };
  }

  /**
   * Layer 1: Validate language match
   */
  private async validateLanguageMatch(
    response: string,
    expectedLanguage: DetectedLanguage
  ): Promise<LanguageMatchResult> {
    // Use existing language detection engine
    const detection = await languageDetectionEngine.detectLanguage(response);
    
    const matchesExpected = detection.language === expectedLanguage;
    
    // Calculate language consistency score
    let languageConsistency = 1.0;
    if (expectedLanguage === 'hinglish') {
      // For Hinglish, check code-switching quality
      const lexical = detection.analysis.lexical;
      const totalWords = lexical.hindiWords.length + lexical.englishWords.length;
      
      if (totalWords > 0) {
        const hindiRatio = lexical.hindiWords.length / totalWords;
        // Ideal Hinglish: 60-70% Hindi, 30-40% English
        if (hindiRatio >= 0.6 && hindiRatio <= 0.7) {
          languageConsistency = 1.0;
        } else {
          languageConsistency = 1.0 - Math.abs(hindiRatio - 0.65) / 0.65;
        }
      }
    }

    const score = matchesExpected ? 
      (detection.confidence * 0.7 + languageConsistency * 0.3) : 
      detection.confidence * 0.3; // Penalty for mismatch

    return {
      score,
      detectedLanguage: detection.language,
      matchesExpected,
      languageConsistency,
      codeSwitchingQuality: expectedLanguage === 'hinglish' ? languageConsistency : undefined
    };
  }

  /**
   * Layer 2: Validate tone appropriateness
   */
  private async validateTone(
    response: string,
    userEmotion: EmotionalState,
    currentPhase: string
  ): Promise<ToneValidationResult> {
    try {
      const prompt = `Analyze the tone of this AI tutor response:

Response: "${response}"

Context:
- Student's emotional state: ${userEmotion}
- Session phase: ${currentPhase}

Evaluate:
1. Detected tone (friendly, professional, empathetic, encouraging, neutral)
2. Does the tone match the student's emotional state? (yes/no)
3. Empathy level (0-10)
4. Encouragement level (0-10)

Respond in JSON format:
{
  "detectedTone": "string",
  "matchesEmotion": boolean,
  "empathyLevel": number,
  "encouragementLevel": number,
  "reasoning": "string"
}`;

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 200
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      // Calculate score based on match and levels
      const matchScore = result.matchesEmotion ? 1.0 : 0.3;
      const empathyScore = result.empathyLevel / 10;
      const encouragementScore = result.encouragementLevel / 10;

      const score = matchScore * 0.5 + empathyScore * 0.25 + encouragementScore * 0.25;

      return {
        score,
        detectedTone: result.detectedTone || 'unknown',
        matchesEmotion: result.matchesEmotion || false,
        empathyLevel: result.empathyLevel / 10,
        encouragementLevel: result.encouragementLevel / 10
      };

    } catch (error) {
      console.error('[VALIDATOR] Tone validation failed:', error);
      // Fallback to simple heuristics
      return this.fallbackToneValidation(response, userEmotion);
    }
  }

  /**
   * Layer 3: Validate educational quality
   */
  private async validateEducationalQuality(
    response: string,
    userMessage: string,
    subject: string,
    topic: string
  ): Promise<QualityValidationResult> {
    try {
      const prompt = `Evaluate the educational quality of this AI tutor response:

Student Question: "${userMessage}"
AI Response: "${response}"

Subject: ${subject}
Topic: ${topic}

Evaluate:
1. Is the response factually accurate? (yes/no)
2. Is it helpful and actionable? (yes/no)
3. Is it relevant to the topic? (yes/no)
4. Clarity score (0-10) - how clear and understandable
5. Depth score (0-10) - appropriate level of detail

Respond in JSON format:
{
  "isAccurate": boolean,
  "isHelpful": boolean,
  "isRelevant": boolean,
  "clarityScore": number,
  "depthScore": number,
  "reasoning": "string"
}`;

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 250
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');

      const accuracyScore = result.isAccurate ? 1.0 : 0.0;
      const helpfulScore = result.isHelpful ? 1.0 : 0.5;
      const relevanceScore = result.isRelevant ? 1.0 : 0.3;
      const clarityNorm = result.clarityScore / 10;
      const depthNorm = result.depthScore / 10;

      const score = 
        accuracyScore * 0.3 +
        helpfulScore * 0.25 +
        relevanceScore * 0.25 +
        clarityNorm * 0.1 +
        depthNorm * 0.1;

      return {
        score,
        isAccurate: result.isAccurate || false,
        isHelpful: result.isHelpful || false,
        isRelevant: result.isRelevant || false,
        clarityScore: clarityNorm,
        depthScore: depthNorm
      };

    } catch (error) {
      console.error('[VALIDATOR] Quality validation failed:', error);
      return this.fallbackQualityValidation(response, userMessage);
    }
  }

  /**
   * Layer 4: Validate safety
   */
  private async validateSafety(response: string): Promise<SafetyValidationResult> {
    const concerns: string[] = [];
    
    // Rule-based safety checks (fast)
    const lowerResponse = response.toLowerCase();
    
    // Check for inappropriate content
    const inappropriatePatterns = [
      /\b(stupid|idiot|dumb|moron)\b/i,
      /you('re| are) (so )?(bad|terrible|useless)/i,
      /give up|you can't/i
    ];
    
    const hasInappropriate = inappropriatePatterns.some(p => p.test(response));
    if (hasInappropriate) {
      concerns.push('Potentially discouraging or negative language detected');
    }

    // Check for misinformation indicators
    const certaintyPatterns = [
      /always true/i,
      /never wrong/i,
      /100% certain/i,
      /definitely incorrect/i
    ];
    
    const hasCertaintyIssues = certaintyPatterns.some(p => p.test(response));
    if (hasCertaintyIssues) {
      concerns.push('Overly certain language - may indicate potential misinformation');
    }

    // Check for harmful instructions (in educational context)
    const harmfulPatterns = [
      /just copy/i,
      /don't need to understand/i,
      /memorize without/i
    ];
    
    const hasHarmfulGuidance = harmfulPatterns.some(p => p.test(response));
    if (hasHarmfulGuidance) {
      concerns.push('Promotes surface learning over deep understanding');
    }

    // Quick LLM safety check for complex cases
    let llmSafetyScore = 1.0;
    if (concerns.length > 0 || response.length > 500) {
      llmSafetyScore = await this.llmSafetyCheck(response);
    }

    const isSafe = concerns.length === 0 && llmSafetyScore > 0.8;
    const score = isSafe ? llmSafetyScore : Math.min(llmSafetyScore, 0.7 - concerns.length * 0.1);

    return {
      score,
      isSafe,
      hasInappropriateContent: hasInappropriate,
      hasMisinformation: hasCertaintyIssues,
      concerns
    };
  }

  /**
   * LLM-based safety check (for complex cases)
   */
  private async llmSafetyCheck(response: string): Promise<number> {
    try {
      const prompt = `Evaluate the safety of this AI tutor response for a student:

Response: "${response}"

Is this response:
1. Respectful and encouraging?
2. Free from misinformation?
3. Promoting healthy learning habits?

Rate safety from 0.0 (unsafe) to 1.0 (completely safe).

Respond with just a number between 0.0 and 1.0.`;

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 10
      });

      const score = parseFloat(completion.choices[0].message.content || '0.5');
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      console.error('[VALIDATOR] LLM safety check failed:', error);
      return 0.8; // Default to safe if check fails
    }
  }

  /**
   * Fallback tone validation (rule-based)
   */
  private fallbackToneValidation(response: string, emotion: EmotionalState): ToneValidationResult {
    const lower = response.toLowerCase();
    
    // Simple keyword-based tone detection
    const encouragingWords = ['great', 'good', 'excellent', 'well done', 'shabash', 'badhiya', 'perfect'];
    const empatheticWords = ['understand', 'samajh', 'difficult', 'mushkil', 'help', 'madad'];
    
    const hasEncouragement = encouragingWords.some(w => lower.includes(w));
    const hasEmpathy = empatheticWords.some(w => lower.includes(w));
    
    const matchesEmotion = 
      (emotion === 'frustrated' && hasEmpathy) ||
      (emotion === 'confident' && hasEncouragement) ||
      (emotion === 'confused' && hasEmpathy) ||
      (emotion === 'neutral');

    return {
      score: matchesEmotion ? 0.7 : 0.5,
      detectedTone: hasEmpathy ? 'empathetic' : hasEncouragement ? 'encouraging' : 'neutral',
      matchesEmotion,
      empathyLevel: hasEmpathy ? 0.7 : 0.3,
      encouragementLevel: hasEncouragement ? 0.8 : 0.4
    };
  }

  /**
   * Fallback quality validation (rule-based)
   */
  private fallbackQualityValidation(response: string, userMessage: string): QualityValidationResult {
    const responseWords = new Set(response.toLowerCase().split(/\s+/));
    const questionWords = new Set(userMessage.toLowerCase().split(/\s+/));
    
    // Check relevance by word overlap
    const commonWords = Array.from(responseWords).filter(w => questionWords.has(w) && w.length > 3);
    const relevanceScore = Math.min(commonWords.length / 5, 1.0);
    
    // Check helpfulness by length and structure
    const hasExplanation = response.length > 100;
    const hasExample = /example|उदाहरण|for instance|jaise/i.test(response);
    const helpfulScore = (hasExplanation ? 0.5 : 0) + (hasExample ? 0.5 : 0);
    
    return {
      score: (relevanceScore + helpfulScore) / 2,
      isAccurate: true, // Assume accurate if can't verify
      isHelpful: helpfulScore > 0.5,
      isRelevant: relevanceScore > 0.3,
      clarityScore: 0.7,
      depthScore: hasExplanation ? 0.7 : 0.4
    };
  }

  /**
   * Quick validation (lightweight, for performance-critical paths)
   */
  async quickValidate(response: string, expectedLanguage: DetectedLanguage): Promise<boolean> {
    const detected = languageDetectionEngine.quickDetect(response);
    return detected === expectedLanguage;
  }

  /**
   * Get validation summary for logging
   */
  getValidationSummary(result: ValidationResult): string {
    return `Score: ${(result.overallScore * 100).toFixed(0)}% | ` +
           `Lang: ${(result.layers.languageMatch.score * 100).toFixed(0)}% | ` +
           `Tone: ${(result.layers.toneAppropriate.score * 100).toFixed(0)}% | ` +
           `Quality: ${(result.layers.educationalQuality.score * 100).toFixed(0)}% | ` +
           `Safety: ${(result.layers.safety.score * 100).toFixed(0)}%`;
  }
}

export const responseValidator = new ResponseValidator();
