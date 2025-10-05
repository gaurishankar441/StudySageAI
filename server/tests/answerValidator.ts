/**
 * Smart answer validation for JEE/NEET problems
 * Handles numeric tolerance, multiple choice, and various answer formats
 */

export interface ValidationResult {
  isCorrect: boolean;
  confidence: number;
  matchType: 'exact' | 'numeric' | 'contains' | 'option' | 'none';
}

export class AnswerValidator {
  /**
   * Validate AI response against correct answer
   */
  static validate(aiResponse: string, correctAnswer: string, options?: string[]): ValidationResult {
    const aiLower = aiResponse.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();
    
    // 1. Exact match (case-insensitive)
    if (aiLower === correctLower || aiLower.includes(correctLower)) {
      return {
        isCorrect: true,
        confidence: 0.95,
        matchType: 'exact',
      };
    }
    
    // 2. Numeric validation with tolerance
    const numericResult = this.validateNumeric(aiResponse, correctAnswer);
    if (numericResult.isCorrect) {
      return numericResult;
    }
    
    // 3. Multiple choice validation (check if option letter/text is present)
    if (options && options.length > 0) {
      const optionResult = this.validateOption(aiResponse, correctAnswer, options);
      if (optionResult.isCorrect) {
        return optionResult;
      }
    }
    
    // 4. Partial match - answer appears anywhere in response
    if (aiLower.includes(correctLower)) {
      return {
        isCorrect: true,
        confidence: 0.75,
        matchType: 'contains',
      };
    }
    
    // 5. No match
    return {
      isCorrect: false,
      confidence: 0.2,
      matchType: 'none',
    };
  }
  
  /**
   * Validate numeric answers with tolerance
   */
  private static validateNumeric(aiResponse: string, correctAnswer: string): ValidationResult {
    // Extract first number from correct answer
    const correctNumMatch = correctAnswer.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (!correctNumMatch) {
      return { isCorrect: false, confidence: 0, matchType: 'none' };
    }
    
    const correctNum = parseFloat(correctNumMatch[0]);
    
    // Extract numbers from AI response
    const aiNumMatches = aiResponse.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (!aiNumMatches) {
      return { isCorrect: false, confidence: 0, matchType: 'none' };
    }
    
    const relativeTolerance = 0.05; // 5% relative tolerance
    const absoluteTolerance = 0.01; // Absolute tolerance for values near zero
    
    for (const aiNumStr of aiNumMatches) {
      const aiNum = parseFloat(aiNumStr);
      const diff = Math.abs(aiNum - correctNum);
      
      // For zero or near-zero values, use absolute tolerance
      if (Math.abs(correctNum) < 0.1) {
        if (diff <= absoluteTolerance) {
          return {
            isCorrect: true,
            confidence: 0.90,
            matchType: 'numeric',
          };
        }
      } else {
        // For non-zero values, use relative tolerance
        const relativeDiff = diff / Math.abs(correctNum);
        
        if (relativeDiff <= relativeTolerance) {
          return {
            isCorrect: true,
            confidence: 0.90,
            matchType: 'numeric',
          };
        }
      }
    }
    
    return { isCorrect: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Validate multiple choice answers
   */
  private static validateOption(
    aiResponse: string,
    correctAnswer: string,
    options: string[]
  ): ValidationResult {
    const aiLower = aiResponse.toLowerCase();
    const correctLower = correctAnswer.toLowerCase();
    
    // Find which option is the correct one
    const correctIndex = options.findIndex(opt => opt.toLowerCase() === correctLower);
    
    if (correctIndex === -1) {
      return { isCorrect: false, confidence: 0, matchType: 'none' };
    }
    
    const optionLetter = String.fromCharCode(65 + correctIndex); // A, B, C, D...
    const optionLetterLower = optionLetter.toLowerCase();
    
    // Strict option letter patterns to avoid false positives (e.g., "a" in "answer")
    const optionPatterns = [
      new RegExp(`\\boption\\s+${optionLetterLower}\\b`, 'i'),    // "option a"
      new RegExp(`\\(${optionLetterLower}\\)`, 'i'),               // "(a)"
      new RegExp(`^${optionLetterLower}[\\)\\.]`, 'i'),           // "a)" or "a." at start
      new RegExp(`\\s${optionLetterLower}[\\)\\.]`, 'i'),         // " a)" or " a."
      new RegExp(`answer\\s+is\\s+${optionLetterLower}\\b`, 'i'), // "answer is a"
      new RegExp(`\\bcorrect\\s+is\\s+${optionLetterLower}\\b`, 'i'), // "correct is a"
    ];
    
    // Check for explicit option letter patterns
    for (const pattern of optionPatterns) {
      if (pattern.test(aiResponse)) {
        return {
          isCorrect: true,
          confidence: 0.90,
          matchType: 'option',
        };
      }
    }
    
    // Check if full option text is present
    if (aiLower.includes(correctLower)) {
      return {
        isCorrect: true,
        confidence: 0.85,
        matchType: 'option',
      };
    }
    
    return { isCorrect: false, confidence: 0, matchType: 'none' };
  }
  
  /**
   * Extract answer from AI response (for debugging)
   */
  static extractAnswer(aiResponse: string): string {
    // Try to find explicit answer patterns
    const patterns = [
      /answer[:\s]+(.+?)(?:\.|$)/i,
      /(?:is|are|equals?)[:\s]+(.+?)(?:\.|$)/i,
      /therefore[,:\s]+(.+?)(?:\.|$)/i,
    ];
    
    for (const pattern of patterns) {
      const match = aiResponse.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return aiResponse.substring(0, 100); // First 100 chars as fallback
  }
}
