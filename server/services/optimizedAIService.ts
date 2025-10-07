import { modelRouter } from './modelRouter';
import { semanticCache } from './semanticCache';
import { getPromptForQuery } from '../prompts/jeeNeetPrompts';
import { costTracker } from './costTracker';
import OpenAI from 'openai';

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use AI services.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

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
  ): Promise<{ response: string; cached: boolean; model?: string; cost?: number }> {
    const { language = 'english', useCache = true, stream = false } = options || {};
    
    // Step 1: Check semantic cache first
    if (useCache) {
      const cached = await semanticCache.check(query);
      if (cached) {
        console.log('[OPTIMIZED AI] ⚡ Response served from cache (0 cost!)');
        return { response: cached, cached: true };
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
    const cost = costTracker.trackTokenUsage(modelName, inputTokens, outputTokens);
    
    // Step 6: Store in cache for future use
    if (useCache && response) {
      await semanticCache.store(query, response);
    }
    
    return {
      response,
      cached: false,
      model: modelName,
      cost,
    };
  }
  
  /**
   * Generate response with streaming support
   * Note: Currently uses GPT-4o-mini for all streaming (best streaming support)
   * Non-streaming requests use intelligent routing for maximum cost savings
   */
  async generateStreamingResponse(
    query: string,
    context?: string,
    onChunk?: (chunk: string, meta?: any) => void
  ): Promise<{ response: string; cached: boolean; model?: string; cost?: number }> {
    // Step 1: Check cache first - if hit, send entire response as chunks
    const cached = await semanticCache.check(query);
    if (cached) {
      console.log('[OPTIMIZED AI STREAM] ⚡ Response served from cache (0 cost!)');
      
      // Send cached response as chunks for smooth UX
      if (onChunk) {
        const words = cached.split(' ');
        for (const word of words) {
          onChunk(word + ' ', { cached: true, model: 'cache', type: 'chunk' });
        }
        // Send completion event for cache hits
        onChunk('', { cached: true, model: 'cache', cost: 0, type: 'complete' });
      }
      
      return { response: cached, cached: true, model: 'cache', cost: 0 };
    }
    
    // Step 2: Analyze query for specialized prompt (but use GPT-4o-mini for streaming)
    const analysis = await modelRouter.classifyQuery(query);
    const systemPrompt = getPromptForQuery(query, analysis.intent, analysis.subject);
    
    // Step 3: Stream using GPT-4o-mini (best streaming support, still 97% cheaper than GPT-4)
    const streamModel = 'gpt-4o-mini';
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
      { role: 'user', content: query }
    ];
    
    let fullResponse = '';
    let actualInputTokens = 0;
    let actualOutputTokens = 0;
    let partialCost = 0;
    
    try {
      const stream = await getOpenAI().chat.completions.create({
        model: streamModel,
        messages,
        stream: true,
        stream_options: { include_usage: true }, // Get actual token counts
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        // Capture actual token usage from final chunk
        if (chunk.usage) {
          actualInputTokens = chunk.usage.prompt_tokens;
          actualOutputTokens = chunk.usage.completion_tokens;
        }
        
        if (onChunk && content) {
          onChunk(content, { cached: false, model: streamModel, type: 'chunk' });
        }
      }
      
      // Step 4: Track cost with actual tokens
      const cost = costTracker.trackTokenUsage(
        streamModel, 
        actualInputTokens, 
        actualOutputTokens
      );
      
      // Step 5: Cache the complete response
      await semanticCache.store(query, fullResponse);
      
      // Send completion event
      if (onChunk) {
        onChunk('', { cached: false, model: streamModel, cost, type: 'complete' });
      }
      
      return {
        response: fullResponse,
        cached: false,
        model: streamModel,
        cost,
      };
    } catch (streamError) {
      // Track partial cost even on error (best effort with estimates)
      if (actualInputTokens > 0 || actualOutputTokens > 0) {
        // Use actual tokens if we got them
        partialCost = costTracker.trackTokenUsage(streamModel, actualInputTokens, actualOutputTokens);
      } else if (fullResponse.length > 0) {
        // Fallback to estimates for partial response
        const estInputTokens = Math.ceil((systemPrompt.length + query.length + (context?.length || 0)) / 4);
        const estOutputTokens = Math.ceil(fullResponse.length / 4);
        partialCost = costTracker.trackTokenUsage(streamModel, estInputTokens, estOutputTokens);
      }
      
      // Send error event with partial cost
      if (onChunk) {
        onChunk('', { 
          cached: false, 
          model: streamModel, 
          cost: partialCost,
          partialResponse: fullResponse,
          type: 'error',
          error: streamError instanceof Error ? streamError.message : 'Stream failed'
        });
      }
      
      throw streamError; // Re-throw for route handler
    }
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
    
    const response = await getOpenAI().chat.completions.create({
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
