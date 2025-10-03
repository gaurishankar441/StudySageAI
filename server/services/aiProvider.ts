export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  rationale: string;
}

export interface Quiz {
  title: string;
  subject: string;
  difficulty: string;
  questions: QuizQuestion[];
}

export interface Note {
  title: string;
  content: string;
  keyPoints: string[];
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}

export interface Summary {
  title: string;
  summary: string;
  keyPoints: string[];
}

export interface AIProvider {
  generateSummary(content: string, options?: {
    language?: string;
    maxLength?: number;
  }): Promise<Summary>;

  generateHighlights(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<string[]>;

  generateQuiz(content: string, options?: {
    subject?: string;
    difficulty?: string;
    language?: string;
    questionCount?: number;
  }): Promise<Quiz>;

  generateFlashcards(content: string, options?: {
    language?: string;
    count?: number;
  }): Promise<Array<{ front: string; back: string }>>;

  generateNotes(content: string, options?: {
    language?: string;
    includeFlashcards?: boolean;
  }): Promise<Note>;

  chat(messages: Array<{ role: string; content: string }>, options?: {
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<ReadableStream | string>;
}

export type AIProviderType = 'openai' | 'cohere';
