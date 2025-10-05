import { encoding_for_model } from 'tiktoken';

const encoder = encoding_for_model('gpt-4');

export interface TokenBudget {
  total: number;
  systemPrompt: number;
  userMessage: number;
  available: number;
}

export class TokenCounter {
  static countTokens(text: string): number {
    try {
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('[TokenCounter] Error counting tokens:', error);
      return Math.ceil(text.length / 4);
    }
  }

  static calculateAvailableSpace(
    modelMaxTokens: number,
    systemPrompt: string,
    userMessageTemplate: string,
    maxResponseTokens: number = 1500
  ): TokenBudget {
    const systemTokens = this.countTokens(systemPrompt);
    const templateTokens = this.countTokens(userMessageTemplate);
    
    const available = modelMaxTokens - systemTokens - templateTokens - maxResponseTokens;
    
    return {
      total: modelMaxTokens,
      systemPrompt: systemTokens,
      userMessage: templateTokens,
      available: Math.max(0, available)
    };
  }

  static truncateToTokenLimit(
    text: string,
    maxTokens: number,
    suffix: string = '\n\n[... truncated due to length ...]'
  ): string {
    const currentTokens = this.countTokens(text);
    
    if (currentTokens <= maxTokens) {
      return text;
    }

    const suffixTokens = this.countTokens(suffix);
    const targetTokens = maxTokens - suffixTokens;
    
    const estimatedCharsPerToken = text.length / currentTokens;
    let estimatedChars = Math.floor(targetTokens * estimatedCharsPerToken);
    
    let truncated = text.substring(0, estimatedChars);
    let truncatedTokens = this.countTokens(truncated);
    
    while (truncatedTokens > targetTokens && estimatedChars > 0) {
      estimatedChars = Math.floor(estimatedChars * 0.9);
      truncated = text.substring(0, estimatedChars);
      truncatedTokens = this.countTokens(truncated);
    }
    
    return truncated + suffix;
  }

  static prioritizeAndTruncate(
    chunks: { text: string; score?: number }[],
    maxTokens: number
  ): string {
    const sorted = chunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    let result = '';
    let currentTokens = 0;
    
    for (const chunk of sorted) {
      const chunkTokens = this.countTokens(chunk.text);
      
      if (currentTokens + chunkTokens <= maxTokens) {
        result += chunk.text + '\n\n';
        currentTokens += chunkTokens + 2;
      } else {
        const remainingTokens = maxTokens - currentTokens - 50;
        if (remainingTokens > 100) {
          const partialChunk = this.truncateToTokenLimit(
            chunk.text,
            remainingTokens,
            '...'
          );
          result += partialChunk;
        }
        break;
      }
    }
    
    return result.trim();
  }
}

export const tokenCounter = new TokenCounter();
