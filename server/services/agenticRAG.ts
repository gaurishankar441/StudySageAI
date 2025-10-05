import OpenAI from 'openai';
import { documentService } from './documentService';
import { TokenCounter } from '../utils/tokenCounter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AgenticRAGTool {
  name: string;
  description: string;
  parameters: any;
}

interface AgenticRAGStep {
  step: number;
  action: string;
  tool: string;
  input: any;
  output: any;
  reflection: string;
}

interface AgenticRAGResult {
  answer: string;
  sources: any[];
  steps: AgenticRAGStep[];
  confidence: number;
}

export class AgenticRAGService {
  private tools: AgenticRAGTool[] = [
    {
      name: 'search_documents',
      description: 'Search for specific information in documents using semantic search. Use this when you need to find particular facts, concepts, or sections.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return (default: 10)'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'get_document_sections',
      description: 'Get specific sections or pages from documents. Use when you need structured information from particular parts of documents.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'The topic or section to retrieve'
          },
          maxChunks: {
            type: 'number',
            description: 'Number of chunks to retrieve (default: 20)'
          }
        },
        required: ['topic']
      }
    },
    {
      name: 'verify_information',
      description: 'Cross-reference information across multiple documents to verify accuracy. Use when you need to confirm facts or find contradictions.',
      parameters: {
        type: 'object',
        properties: {
          claim: {
            type: 'string',
            description: 'The claim or information to verify'
          }
        },
        required: ['claim']
      }
    },
    {
      name: 'synthesize_answer',
      description: 'Synthesize a final answer based on gathered information. Use this as the last step after collecting all necessary information.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The original question to answer'
          },
          information: {
            type: 'string',
            description: 'All gathered information to synthesize'
          }
        },
        required: ['question', 'information']
      }
    }
  ];

  async executeAgenticRAG(
    userQuery: string,
    userId: string,
    docIds: string[],
    language: string = 'en',
    onChunk?: (chunk: string) => void
  ): Promise<AgenticRAGResult> {
    const steps: AgenticRAGStep[] = [];
    let gatheredInfo: string[] = [];
    let allSources: any[] = [];

    // Step 1: Plan the approach
    const plan = await this.planApproach(userQuery, language);
    if (onChunk) onChunk(`**Planning:** ${plan}\n\n`);

    // Step 2: Execute plan with multiple tool calls
    const maxSteps = 5;
    let currentStep = 1;
    let needsMoreInfo = true;

    while (needsMoreInfo && currentStep <= maxSteps) {
      if (onChunk) onChunk(`**Step ${currentStep}:** `);

      // Agent decides what tool to use
      const toolCall = await this.decideNextAction(
        userQuery,
        gatheredInfo.join('\n\n'),
        steps,
        language
      );

      if (!toolCall || toolCall.tool === 'synthesize_answer') {
        needsMoreInfo = false;
        break;
      }

      // Execute the tool
      const result = await this.executeTool(
        toolCall.tool,
        toolCall.input,
        userId,
        docIds
      );

      if (result.chunks) {
        gatheredInfo.push(result.content);
        allSources.push(...result.chunks);
      }

      // Self-reflection: Is this information useful?
      const reflection = await this.reflectOnInfo(
        userQuery,
        result.content,
        gatheredInfo.join('\n\n')
      );

      steps.push({
        step: currentStep,
        action: toolCall.action,
        tool: toolCall.tool,
        input: toolCall.input,
        output: result.content.substring(0, 500),
        reflection
      });

      if (onChunk) onChunk(`${toolCall.action}\n${reflection}\n\n`);

      // Check if we have enough information
      if (reflection.includes('sufficient') || reflection.includes('complete') || currentStep >= 3) {
        needsMoreInfo = false;
      }

      currentStep++;
    }

    // Step 3: Synthesize final answer
    if (onChunk) onChunk(`**Synthesizing Answer:**\n\n`);

    const finalAnswer = await this.synthesizeFinalAnswer(
      userQuery,
      gatheredInfo.join('\n\n'),
      allSources,
      language,
      onChunk
    );

    // Step 4: Calculate confidence
    const confidence = this.calculateConfidence(steps, allSources.length);

    return {
      answer: finalAnswer,
      sources: allSources,
      steps,
      confidence
    };
  }

  private async planApproach(query: string, language: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a planning agent. Analyze the user query and create a brief plan (2-3 steps) for how to answer it using document search. Be concise.${language === 'hi' ? ' Respond in Hindi.' : ''}`
        },
        {
          role: 'user',
          content: `Query: "${query}"\n\nCreate a brief plan:`
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.choices[0].message.content || 'Search for relevant information and synthesize answer.';
  }

  private async decideNextAction(
    originalQuery: string,
    gatheredInfo: string,
    steps: AgenticRAGStep[],
    language: string
  ): Promise<{ action: string; tool: string; input: any } | null> {
    const toolsJSON = JSON.stringify(this.tools, null, 2);

    const systemPrompt = `You are an intelligent agent that decides what action to take next to answer a query. Based on the original query, information gathered so far, and available tools, decide which tool to use next.

Available tools:
${toolsJSON}

Respond in JSON format:
{
  "action": "brief description of what you're doing",
  "tool": "tool_name",
  "input": { ...tool parameters }
}

If you have enough information, use "synthesize_answer" as the tool.${language === 'hi' ? ' Descriptions can be in Hindi.' : ''}`;

    const userMessageTemplate = `Original Query: "${originalQuery}"

Information gathered so far:
{PLACEHOLDER}

Steps completed: ${steps.length}

What should I do next?`;

    const budget = TokenCounter.calculateAvailableSpace(
      8192,
      systemPrompt,
      userMessageTemplate,
      300
    );

    const truncatedInfo = gatheredInfo
      ? TokenCounter.truncateToTokenLimit(gatheredInfo, budget.available, '\n\n[... truncated ...]')
      : 'None yet';

    const infoTokens = TokenCounter.countTokens(gatheredInfo || '');
    const truncatedTokens = TokenCounter.countTokens(truncatedInfo);
    
    console.log('[decideNextAction] Info tokens:', infoTokens, '→', truncatedTokens, `(available: ${budget.available})`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Original Query: "${originalQuery}"

Information gathered so far:
${truncatedInfo}

Steps completed: ${steps.length}

What should I do next?`
        }
      ],
      temperature: 0.4,
      max_tokens: 300
    });

    try {
      const content = response.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (e) {
      // If JSON parsing fails, default to search
      return {
        action: 'Searching for relevant information',
        tool: 'search_documents',
        input: { query: originalQuery, maxResults: 10 }
      };
    }
  }

  private async executeTool(
    toolName: string,
    input: any,
    userId: string,
    docIds: string[]
  ): Promise<{ content: string; chunks?: any[] }> {
    switch (toolName) {
      case 'search_documents':
        const searchChunks = await documentService.retrieveRelevantChunks(
          input.query,
          userId,
          docIds,
          input.maxResults || 10
        );
        return {
          content: searchChunks
            .map((c, i) => `[${i + 1}] ${c.metadata.docTitle} (p.${c.metadata.page}): ${c.text}`)
            .join('\n\n'),
          chunks: searchChunks
        };

      case 'get_document_sections':
        const sectionChunks = await documentService.retrieveRelevantChunks(
          input.topic,
          userId,
          docIds,
          input.maxChunks || 20
        );
        return {
          content: sectionChunks
            .map(c => `${c.metadata.docTitle} - ${c.text}`)
            .join('\n\n'),
          chunks: sectionChunks
        };

      case 'verify_information':
        const verifyChunks = await documentService.retrieveRelevantChunks(
          input.claim,
          userId,
          docIds,
          15
        );
        return {
          content: `Verification search for: "${input.claim}"\n\n` +
            verifyChunks
              .map(c => `${c.metadata.docTitle}: ${c.text}`)
              .join('\n\n'),
          chunks: verifyChunks
        };

      default:
        return { content: 'Tool not found' };
    }
  }

  private async reflectOnInfo(
    query: string,
    newInfo: string,
    allInfo: string
  ): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a reflection agent. Evaluate if the gathered information is sufficient to answer the query. Respond in 1-2 sentences.'
        },
        {
          role: 'user',
          content: `Query: "${query}"

New information found:
${newInfo.substring(0, 1000)}

Is this helpful? Do we need more information?`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    return response.choices[0].message.content || 'Information gathered.';
  }

  private async synthesizeFinalAnswer(
    query: string,
    gatheredInfo: string,
    sources: any[],
    language: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const langInstruction = language === 'hi' 
      ? 'Respond in Hindi (हिन्दी). Use Devanagari script.'
      : 'Respond in English.';

    // Truncate gathered info to fit within context limits
    // GPT-4 has 8K context, we need room for system prompt, query, and response
    // Hindi text uses more tokens, so being more conservative: 3000 chars ≈ 5000 tokens
    const maxInfoLength = 3000;
    const truncatedInfo = gatheredInfo.length > maxInfoLength
      ? gatheredInfo.substring(0, maxInfoLength) + '\n\n[... information truncated due to length ...]'
      : gatheredInfo;

    console.log('[synthesizeFinalAnswer] Gathered info length:', gatheredInfo.length);
    console.log('[synthesizeFinalAnswer] Truncated to:', truncatedInfo.length);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a helpful AI tutor for Indian students. Synthesize a comprehensive answer based on the gathered information. Include citations with [source number] format. ${langInstruction}`
        },
        {
          role: 'user',
          content: `Question: "${query}"

Gathered Information:
${truncatedInfo}

Please provide a comprehensive answer with proper citations.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true
    });

    let fullAnswer = '';
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullAnswer += content;
      if (onChunk) onChunk(content);
    }

    return fullAnswer;
  }

  private calculateConfidence(steps: AgenticRAGStep[], sourceCount: number): number {
    // Confidence based on:
    // 1. Number of sources found (more is better, up to a point)
    // 2. Number of steps taken (sweet spot is 2-3 steps)
    
    const sourceScore = Math.min(sourceCount / 10, 1) * 50; // Max 50 points
    const stepScore = steps.length >= 2 && steps.length <= 3 ? 50 : 30; // 50 points for optimal steps
    
    return Math.round(sourceScore + stepScore);
  }
}

export const agenticRAGService = new AgenticRAGService();
