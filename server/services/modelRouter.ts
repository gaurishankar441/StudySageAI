import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import Anthropic from "@anthropic-ai/sdk";

// Intent classification patterns for fast routing
const INTENT_PATTERNS = {
  concept_explanation: ['explain', 'what is', 'define', 'help me understand', 'meaning of', 'समझाओ', 'क्या है', 'अर्थ'],
  numerical_solving: ['solve', 'calculate', 'find answer', 'compute', 'numerical', 'हल करो', 'गणना', 'उत्तर'],
  hint_request: ['hint', 'stuck', 'guide me', 'point me', 'suggest', 'संकेत', 'मदद'],
  quiz_generation: ['quiz', 'mcq', 'questions', 'test', 'प्रश्न'],
  summarization: ['summarize', 'summary', 'key points', 'tldr', 'सारांश'],
};

interface QueryAnalysis {
  intent: string;
  complexity: number; // 1-4 scale
  subject: 'physics' | 'chemistry' | 'math' | 'biology' | 'general';
  language: 'hindi' | 'english' | 'hinglish';
}

export interface ModelRouterResult {
  model: any;
  modelName: string;
  costPerMillion: number;
  analysis: QueryAnalysis;
}

export class IntelligentModelRouter {
  private geminiFlash: ChatGoogleGenerativeAI | null = null;
  private gpt4oMini: ChatOpenAI | null = null;
  private claudeHaiku: Anthropic | null = null;
  
  constructor() {
    // Lazy initialization - models are created when first needed
  }
  
  private getGeminiFlash(): ChatGoogleGenerativeAI {
    if (!this.geminiFlash) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY is not configured. Please add your Google API key to use this feature.');
      }
      this.geminiFlash = new ChatGoogleGenerativeAI({
        model: "gemini-1.5-flash",
        temperature: 0.7,
        apiKey,
      });
    }
    return this.geminiFlash;
  }
  
  private getGpt4oMini(): ChatOpenAI {
    if (!this.gpt4oMini) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use this feature.');
      }
      this.gpt4oMini = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        apiKey,
      });
    }
    return this.gpt4oMini;
  }
  
  private getClaudeHaiku(): Anthropic {
    if (!this.claudeHaiku) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured. Please add your Anthropic API key to use this feature.');
      }
      this.claudeHaiku = new Anthropic({
        apiKey,
      });
    }
    return this.claudeHaiku;
  }
  
  // Fast intent classification (50ms)
  async classifyQuery(query: string): Promise<QueryAnalysis> {
    const queryLower = query.toLowerCase();
    
    // Intent detection via keyword matching
    let intent = 'general';
    for (const [intentType, keywords] of Object.entries(INTENT_PATTERNS)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        intent = intentType;
        break;
      }
    }
    
    // Complexity scoring (rule-based, 0ms)
    let complexity = 1;
    if (queryLower.includes('derive') || queryLower.includes('prove') || queryLower.includes('सिद्ध')) {
      complexity = 4;
    } else if (queryLower.includes('solve numerically') || queryLower.includes('calculate') || queryLower.includes('गणना')) {
      complexity = 3;
    } else if (queryLower.includes('explain') || queryLower.includes('why') || queryLower.includes('समझाओ')) {
      complexity = 2;
    }
    
    // Subject detection
    let subject: any = 'general';
    if (queryLower.match(/force|velocity|acceleration|energy|momentum|motion|गति|बल|ऊर्जा/)) {
      subject = 'physics';
    } else if (queryLower.match(/reaction|element|compound|acid|base|bond|प्रतिक्रिया|तत्व/)) {
      subject = 'chemistry';
    } else if (queryLower.match(/integrate|differentiate|polynomial|matrix|calculus|समाकलन|अवकलन/)) {
      subject = 'math';
    } else if (queryLower.match(/cell|dna|enzyme|photosynthesis|कोशिका|जीव/)) {
      subject = 'biology';
    }
    
    // Language detection (simple heuristic)
    const hindiChars = query.match(/[\u0900-\u097F]/g);
    const language = hindiChars && hindiChars.length > 10 ? 'hindi' : 
                     hindiChars && hindiChars.length > 3 ? 'hinglish' : 'english';
    
    return { intent, complexity, subject, language };
  }
  
  // Route to appropriate model based on query analysis
  async routeQuery(query: string, context?: string): Promise<ModelRouterResult> {
    const analysis = await this.classifyQuery(query);
    
    // Check which API keys are available
    const hasGemini = !!process.env.GOOGLE_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasClaude = !!process.env.ANTHROPIC_API_KEY;
    
    // Routing logic - optimized for cost vs accuracy with graceful fallbacks
    if (analysis.complexity <= 2 && analysis.intent !== 'numerical_solving') {
      // Tier 1: Prefer Gemini Flash - Best for simple explanations
      if (hasGemini) {
        console.log(`[ROUTER] ✨ Gemini Flash ($0.07/M) - ${analysis.intent} | ${analysis.subject}`);
        return {
          model: this.getGeminiFlash(),
          modelName: 'gemini-1.5-flash',
          costPerMillion: 0.07,
          analysis
        };
      }
      // Fallback to OpenAI if Gemini not available
      if (hasOpenAI) {
        console.log(`[ROUTER] 🧮 GPT-4o-mini ($0.15/M) [Gemini unavailable] - ${analysis.intent} | ${analysis.subject}`);
        return {
          model: this.getGpt4oMini(),
          modelName: 'gpt-4o-mini',
          costPerMillion: 0.15,
          analysis
        };
      }
    }
    
    if (analysis.complexity === 3 || analysis.subject === 'math' || analysis.intent === 'numerical_solving') {
      // Tier 2: GPT-4o-mini for moderate complexity & math
      if (hasOpenAI) {
        console.log(`[ROUTER] 🧮 GPT-4o-mini ($0.15/M) - ${analysis.intent} | ${analysis.subject}`);
        return {
          model: this.getGpt4oMini(),
          modelName: 'gpt-4o-mini',
          costPerMillion: 0.15,
          analysis
        };
      }
      // Fallback to Gemini if OpenAI not available
      if (hasGemini) {
        console.log(`[ROUTER] ✨ Gemini Flash ($0.07/M) [OpenAI unavailable] - ${analysis.intent} | ${analysis.subject}`);
        return {
          model: this.getGeminiFlash(),
          modelName: 'gemini-1.5-flash',
          costPerMillion: 0.07,
          analysis
        };
      }
    }
    
    // Tier 3: Claude Haiku for complex reasoning (derivations, proofs)
    if (hasClaude) {
      console.log(`[ROUTER] 🎯 Claude Haiku ($0.25/M) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.getClaudeHaiku(),
        modelName: 'claude-haiku',
        costPerMillion: 0.25,
        analysis
      };
    }
    
    // Final fallback: use whatever is available
    if (hasOpenAI) {
      console.log(`[ROUTER] 🧮 GPT-4o-mini (fallback) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.getGpt4oMini(),
        modelName: 'gpt-4o-mini',
        costPerMillion: 0.15,
        analysis
      };
    }
    
    if (hasGemini) {
      console.log(`[ROUTER] ✨ Gemini Flash (fallback) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.getGeminiFlash(),
        modelName: 'gemini-1.5-flash',
        costPerMillion: 0.07,
        analysis
      };
    }
    
    // No API keys available
    throw new Error('No AI API keys configured. Please add at least one of: OPENAI_API_KEY, GOOGLE_API_KEY, or ANTHROPIC_API_KEY');
  }
}

// Singleton instance
export const modelRouter = new IntelligentModelRouter();
