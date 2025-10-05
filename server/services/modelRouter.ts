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
  private geminiFlash: ChatGoogleGenerativeAI;
  private gpt4oMini: ChatOpenAI;
  private claudeHaiku: Anthropic;
  
  constructor() {
    // Tier 1: Cheap & Fast (75% of queries) - $0.07/M tokens
    this.geminiFlash = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash",
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });
    
    // Tier 2: Balanced (20% of queries) - $0.15/M tokens
    this.gpt4oMini = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Tier 3: Complex reasoning (5% of queries) - $0.25/M tokens
    this.claudeHaiku = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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
    
    // Routing logic - optimized for cost vs accuracy
    if (analysis.complexity <= 2 && analysis.intent !== 'numerical_solving') {
      // Tier 1: Gemini Flash (75% queries) - Best for simple explanations
      console.log(`[ROUTER] ✨ Gemini Flash ($0.07/M) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.geminiFlash,
        modelName: 'gemini-1.5-flash',
        costPerMillion: 0.07,
        analysis
      };
    }
    
    else if (analysis.complexity === 3 || analysis.subject === 'math' || analysis.intent === 'numerical_solving') {
      // Tier 2: GPT-4o-mini for moderate complexity & math
      console.log(`[ROUTER] 🧮 GPT-4o-mini ($0.15/M) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.gpt4oMini,
        modelName: 'gpt-4o-mini',
        costPerMillion: 0.15,
        analysis
      };
    }
    
    else {
      // Tier 3: Claude Haiku for complex reasoning (derivations, proofs)
      console.log(`[ROUTER] 🎯 Claude Haiku ($0.25/M) - ${analysis.intent} | ${analysis.subject}`);
      return {
        model: this.claudeHaiku,
        modelName: 'claude-haiku',
        costPerMillion: 0.25,
        analysis
      };
    }
  }
}

// Singleton instance
export const modelRouter = new IntelligentModelRouter();
