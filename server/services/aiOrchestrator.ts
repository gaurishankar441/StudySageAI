import { AIProvider, AIProviderType } from "./aiProvider";
import { openAIProvider } from "./providers/openai";
import { cohereProvider } from "./providers/cohere";

export class AIOrchestrator {
  private providers: Map<AIProviderType, AIProvider>;
  private fallbackEnabled: boolean;

  constructor(fallbackEnabled: boolean = false) {
    this.providers = new Map();
    this.providers.set('openai', openAIProvider);
    this.providers.set('cohere', cohereProvider);
    this.fallbackEnabled = fallbackEnabled;
  }

  getProvider(providerType: AIProviderType, fallback: boolean = false): AIProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      if (fallback && this.fallbackEnabled) {
        const fallbackType: AIProviderType = providerType === 'openai' ? 'cohere' : 'openai';
        console.log(`Provider ${providerType} not available, falling back to ${fallbackType}`);
        return this.providers.get(fallbackType)!;
      }
      throw new Error(`AI provider ${providerType} not found`);
    }
    return provider;
  }

  async executeWithFallback<T>(
    providerType: AIProviderType,
    operation: (provider: AIProvider) => Promise<T>
  ): Promise<{ result: T; usedProvider: AIProviderType }> {
    let lastError: Error | null = null;
    
    try {
      const provider = this.getProvider(providerType);
      const result = await operation(provider);
      return { result, usedProvider: providerType };
    } catch (error) {
      lastError = error as Error;
      console.error(`Error with ${providerType}:`, error);
    }

    if (this.fallbackEnabled) {
      const fallbackType: AIProviderType = providerType === 'openai' ? 'cohere' : 'openai';
      try {
        console.log(`Attempting fallback to ${fallbackType}`);
        const fallbackProvider = this.getProvider(fallbackType);
        const result = await operation(fallbackProvider);
        return { result, usedProvider: fallbackType };
      } catch (fallbackError) {
        console.error(`Fallback to ${fallbackType} also failed:`, fallbackError);
        throw new Error(`Both ${providerType} and ${fallbackType} failed. Last error: ${lastError?.message}`);
      }
    }

    throw lastError || new Error(`Operation failed with ${providerType}`);
  }
}

export const aiOrchestrator = new AIOrchestrator(true);
