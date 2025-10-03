import { CohereClientV2 } from "cohere-ai";
import { AIProvider, Summary, Quiz, Note } from "../aiProvider";

const cohere = new CohereClientV2({
  token: process.env.COHERE_API_KEY || ""
});

export class CohereProvider implements AIProvider {
  async generateSummary(content: string, options?: {
    language?: string;
    maxLength?: number;
  }): Promise<Summary> {
    const language = options?.language || 'en';
    const maxLength = options?.maxLength || 200;

    const prompt = `Generate a concise summary in ${language}.
Structure: 
- Title (short, descriptive)
- Summary (${maxLength} words max)
- 5-8 key points as bullets

Content:
${content}

Return valid JSON: {"title": "...", "summary": "...", "keyPoints": ["...", "..."]}`;

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const contentItem = response.message?.content?.[0];
    const text = contentItem && 'text' in contentItem ? contentItem.text : '{}';
    const result = JSON.parse(text);
    return result as Summary;
  }

  async generateHighlights(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<string[]> {
    const language = options?.language || 'en';
    const count = options?.count || 5;

    const prompt = `Extract ${count} most important highlights from the content in ${language}.
Return valid JSON: {"highlights": ["highlight 1", "highlight 2", ...]}

Content:
${content}`;

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const contentItem = response.message?.content?.[0];
    const text = contentItem && 'text' in contentItem ? contentItem.text : '{}';
    const result = JSON.parse(text);
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

    const prompt = `Create ${questionCount} high-quality exam questions.
Subject: ${subject}. Difficulty: ${difficulty}. Language: ${language}.

Content:
${content}

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

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const contentItem = response.message?.content?.[0];
    const text = contentItem && 'text' in contentItem ? contentItem.text : '{}';
    const result = JSON.parse(text);
    return result as Quiz;
  }

  async generateFlashcards(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<Array<{ front: string; back: string }>> {
    const language = options?.language || 'en';
    const count = options?.count || 10;

    const prompt = `Create ${count} flashcards from the content in ${language}.
Return valid JSON: {"flashcards": [{"front": "...", "back": "..."}, ...]}

Content:
${content}`;

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const contentItem = response.message?.content?.[0];
    const text = contentItem && 'text' in contentItem ? contentItem.text : '{}';
    const result = JSON.parse(text);
    return result.flashcards || [];
  }

  async generateNotes(content: string, options?: {
    language?: string;
    includeFlashcards?: boolean;
  }): Promise<Note> {
    const language = options?.language || 'en';

    const prompt = `Generate student notes in ${language}.
Structure:
- Title (short, descriptive)
- Content (main notes with key concepts)
- Key points (5-8 bullets)
- Flashcards (8-12 pairs)

Content:
${content}

Return valid JSON: {
  "title": "...",
  "content": "...",
  "keyPoints": ["...", "..."],
  "flashcards": [{"front": "...", "back": "..."}, ...]
}`;

    const response = await cohere.chat({
      model: 'command-a-03-2025',
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const contentItem = response.message?.content?.[0];
    const text = contentItem && 'text' in contentItem ? contentItem.text : '{}';
    const result = JSON.parse(text);
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
      const stream = await cohere.chatStream({
        model: 'command-a-03-2025',
        messages: messages.map(m => ({ role: m.role as any, content: m.content })),
        temperature,
        maxTokens,
      });

      return new ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            if (event.type === 'content-delta') {
              const content = event.delta?.message?.content?.text || '';
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
          }
          controller.close();
        },
      });
    } else {
      const response = await cohere.chat({
        model: 'command-a-03-2025',
        messages: messages.map(m => ({ role: m.role as any, content: m.content })),
        temperature,
        maxTokens,
      });

      const contentItem = response.message?.content?.[0];
      return contentItem && 'text' in contentItem ? contentItem.text : '';
    }
  }
}

export const cohereProvider = new CohereProvider();
