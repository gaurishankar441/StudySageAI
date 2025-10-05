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
    if (maxTokens <= 0) {
      return '';
    }

    const currentTokens = this.countTokens(text);
    
    if (currentTokens <= maxTokens) {
      return text;
    }

    const suffixTokens = this.countTokens(suffix);
    
    if (maxTokens <= suffixTokens) {
      const minSuffix = '[truncated]';
      const minSuffixTokens = this.countTokens(minSuffix);
      if (maxTokens <= minSuffixTokens) {
        return '';
      }
      return minSuffix;
    }

    const targetTokens = maxTokens - suffixTokens;
    
    if (targetTokens <= 0) {
      return '[truncated]';
    }
    
    const estimatedCharsPerToken = text.length / currentTokens;
    let estimatedChars = Math.floor(targetTokens * estimatedCharsPerToken);
    
    let truncated = text.substring(0, Math.max(1, estimatedChars));
    let truncatedTokens = this.countTokens(truncated);
    let iterations = 0;
    const maxIterations = 20;
    
    while (truncatedTokens > targetTokens && estimatedChars > 0 && iterations < maxIterations) {
      estimatedChars = Math.floor(estimatedChars * 0.9);
      if (estimatedChars === 0) {
        truncated = '';
        truncatedTokens = 0;
        break;
      }
      truncated = text.substring(0, estimatedChars);
      truncatedTokens = this.countTokens(truncated);
      iterations++;
    }
    
    if (truncatedTokens > targetTokens) {
      let charCount = truncated.length;
      while (charCount > 0 && this.countTokens(truncated.substring(0, charCount)) > targetTokens) {
        charCount = Math.floor(charCount * 0.8);
      }
      truncated = truncated.substring(0, Math.max(0, charCount));
    }
    
    return truncated + suffix;
  }

  static prioritizeAndTruncate(
    chunks: { text: string; score?: number }[],
    maxTokens: number
  ): string {
    if (maxTokens <= 0) {
      return '';
    }

    const sorted = chunks.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    let result = '';
    let currentTokens = 0;
    const separatorTokens = 2;
    
    for (const chunk of sorted) {
      const chunkTokens = this.countTokens(chunk.text);
      const totalNeeded = currentTokens + chunkTokens + (result ? separatorTokens : 0);
      
      if (totalNeeded <= maxTokens) {
        if (result) {
          result += '\n\n';
          currentTokens += separatorTokens;
        }
        result += chunk.text;
        currentTokens += chunkTokens;
      } else {
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 50) {
          if (result) {
            result += '\n\n';
            currentTokens += separatorTokens;
          }
          const partialChunk = this.truncateToTokenLimit(
            chunk.text,
            remainingTokens,
            '...'
          );
          result += partialChunk;
          currentTokens = this.countTokens(result);
        }
        break;
      }
    }
    
    const finalTokens = this.countTokens(result);
    if (finalTokens > maxTokens) {
      console.warn(`[TokenCounter] Final result (${finalTokens}) exceeds maxTokens (${maxTokens}). Re-truncating...`);
      return this.truncateToTokenLimit(result, maxTokens, '...');
    }
    
    return result.trim();
  }
}

export const tokenCounter = new TokenCounter();
