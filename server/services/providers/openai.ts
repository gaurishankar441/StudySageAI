import OpenAI from "openai";
import { AIProvider, Summary, Quiz, Note } from "../aiProvider";

// Lazy initialization of OpenAI client
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key to use this feature.');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export class OpenAIProvider implements AIProvider {
  async generateSummary(content: string, options?: {
    language?: string;
    maxLength?: number;
  }): Promise<Summary> {
    const language = options?.language || 'en';
    const maxLength = options?.maxLength || 200;

    const systemPrompt = `Generate a concise summary in ${language}.
Structure: 
- Title (short, descriptive)
- Summary (${maxLength} words max)
- 5-8 key points as bullets

Return valid JSON: {"title": "...", "summary": "...", "keyPoints": ["...", "..."]}`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as Summary;
  }

  async generateHighlights(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<string[]> {
    const language = options?.language || 'en';
    const count = options?.count || 5;

    const systemPrompt = `Extract ${count} most important highlights from the content in ${language}.
Return valid JSON array of strings: ["highlight 1", "highlight 2", ...]`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.highlights || [];
  }

  async generateQuiz(content: string, options?: {
    subject?: string;
    difficulty?: string;
    language?: string;
    questionCount?: number;
  }): Promise<Quiz> {
    const subject = options?.subject || 'General';
    const difficulty = options?.difficulty || 'medium';
    const language = options?.language || 'en';
    const questionCount = options?.questionCount || 5;

    const systemPrompt = `Create ${questionCount} high-quality exam questions.
Subject: ${subject}. Difficulty: ${difficulty}. Language: ${language}.
Return valid JSON: {
  "title": "...",
  "subject": "${subject}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "rationale": "Why this is correct..."
    }
  ]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as Quiz;
  }

  async generateFlashcards(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<Array<{ front: string; back: string }>> {
    const language = options?.language || 'en';
    const count = options?.count || 10;

    const systemPrompt = `Create ${count} flashcards from the content in ${language}.
Return valid JSON: {"flashcards": [{"front": "...", "back": "..."}, ...]}`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.flashcards || [];
  }

  async generateNotes(content: string, options?: {
    language?: string;
    includeFlashcards?: boolean;
  }): Promise<Note> {
    const language = options?.language || 'en';

    const systemPrompt = `Generate student notes in ${language}.
Structure:
- Title (short, descriptive)
- Content (main notes with key concepts)
- Key points (5-8 bullets)
- Flashcards (8-12 pairs)

Return valid JSON: {
  "title": "...",
  "content": "...",
  "keyPoints": ["...", "..."],
  "flashcards": [{"front": "...", "back": "..."}, ...]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as Note;
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ReadableStream | string> {
    const temperature = options?.temperature || 0.7;
    const maxTokens = options?.maxTokens || 2048;

    if (options?.stream) {
      const stream = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any[],
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      });

      return new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }
          controller.close();
        },
      });
    } else {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages as any[],
        temperature,
        max_completion_tokens: maxTokens,
      });

      return response.choices[0].message.content || '';
    }
  }
}

export const openAIProvider = new OpenAIProvider();
