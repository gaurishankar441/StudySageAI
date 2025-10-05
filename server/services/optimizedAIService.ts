import { modelRouter } from './modelRouter';
import { semanticCache } from './semanticCache';
import { getPromptForQuery } from '../prompts/jeeNeetPrompts';
import { costTracker } from './costTracker';
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || ""
});

export class OptimizedAIService {
  /**
   * Generate AI response with intelligent routing, caching, and JEE/NEET optimization
   */
  async generateResponse(
    query: string,
    context?: string,
    options?: {
      language?: 'hindi' | 'english';
      useCache?: boolean;
      stream?: boolean;
    }
  ): Promise<string> {
    const { language = 'english', useCache = true, stream = false } = options || {};
    
    // Step 1: Check semantic cache first
    if (useCache) {
      const cached = await semanticCache.check(query);
      if (cached) {
        console.log('[OPTIMIZED AI] ⚡ Response served from cache (0 cost!)');
        return cached;
      }
    }
    
    // Step 2: Route to appropriate model
    const routerResult = await modelRouter.routeQuery(query, context);
    const { model, modelName, costPerMillion, analysis } = routerResult;
    
    // Step 3: Get specialized JEE/NEET prompt
    const systemPrompt = getPromptForQuery(query, analysis.intent, analysis.subject);
    
    // Step 4: Generate response based on model type
    let response = '';
    let inputTokens = 0;
    let outputTokens = 0;
    
    if (modelName === 'gemini-1.5-flash') {
      // LangChain Google Generative AI
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user' as const, content: query }
      ];
      
      const result = await model.invoke(messages);
      response = result.content as string;
      
      // Estimate tokens (rough calculation)
      inputTokens = Math.ceil((systemPrompt.length + query.length + (context?.length || 0)) / 4);
      outputTokens = Math.ceil(response.length / 4);
    }
    
    else if (modelName === 'gpt-4o-mini') {
      // OpenAI via LangChain
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user' as const, content: query }
      ];
      
      const result = await model.invoke(messages);
      response = result.content as string;
      
      inputTokens = Math.ceil((systemPrompt.length + query.length + (context?.length || 0)) / 4);
      outputTokens = Math.ceil(response.length / 4);
    }
    
    else if (modelName === 'claude-haiku') {
      // Anthropic Claude
      const result = await model.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...(context ? [{ role: 'user' as const, content: `Context:\n${context}` }] : []),
          { role: 'user' as const, content: query }
        ],
      });
      
      response = result.content[0].type === 'text' ? result.content[0].text : '';
      inputTokens = result.usage.input_tokens;
      outputTokens = result.usage.output_tokens;
    }
    
    // Step 5: Track cost
    costTracker.trackTokenUsage(modelName, inputTokens, outputTokens);
    
    // Step 6: Store in cache for future use
    if (useCache && response) {
      await semanticCache.store(query, response);
    }
    
    return response;
  }
  
  /**
   * Generate response with streaming support
   */
  async generateStreamingResponse(
    query: string,
    context?: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // For streaming, we'll use OpenAI directly (best streaming support)
    const analysis = await modelRouter.classifyQuery(query);
    const systemPrompt = getPromptForQuery(query, analysis.intent, analysis.subject);
    
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
      { role: 'user', content: query }
    ];
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for streaming (cheaper)
      messages,
      stream: true,
    });
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      if (onChunk) {
        onChunk(content);
      }
    }
    
    // Track cost (estimate)
    const inputTokens = Math.ceil((systemPrompt.length + query.length + (context?.length || 0)) / 4);
    const outputTokens = Math.ceil(fullResponse.length / 4);
    costTracker.trackTokenUsage('gpt-4o-mini', inputTokens, outputTokens);
    
    // Cache the complete response
    await semanticCache.store(query, fullResponse);
    
    return fullResponse;
  }
  
  /**
   * Generate quiz questions with JEE/NEET optimization
   */
  async generateQuiz(
    subject: string,
    topic: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) {
    const query = `Generate ${count} ${difficulty} MCQ questions for ${subject} on ${topic}`;
    const analysis = await modelRouter.classifyQuery(query);
    
    // Use GPT-4o-mini for quiz generation (good quality, cheaper than GPT-4)
    const prompt = getPromptForQuery(query, 'quiz_generation', subject.toLowerCase());
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0].message.content || '{}';
    
    // Track cost
    costTracker.trackTokenUsage(
      'gpt-4o-mini',
      response.usage?.prompt_tokens || 0,
      response.usage?.completion_tokens || 0
    );
    
    return JSON.parse(content);
  }
}

// Singleton instance
export const optimizedAI = new OptimizedAIService();
