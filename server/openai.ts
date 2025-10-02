import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface TutorResponse {
  explain: string;
  check?: {
    stem: string;
    options: string[];
    answer: string;
    rationale: string;
  };
  meta: {
    step: 'teach' | 'remediate' | 'recap';
    progress?: number;
  };
}

export interface QuizQuestion {
  type: 'mcq_single' | 'mcq_multi' | 'short' | 'long';
  stem: string;
  options?: string[];
  answer: string[];
  rationale: string;
  sourceRef?: string;
}

export interface NoteSummary {
  bigIdea: string;
  keyTerms: { term: string; definition: string }[];
  summary: string;
  sections: { heading: string; content: string; examples?: string[] }[];
  flashcards: { front: string; back: string }[];
  quizableFacts: string[];
}

export interface StudyPlanTask {
  date: string;
  type: 'read' | 'tutor' | 'quiz' | 'flashcards' | 'video';
  duration: number;
  title: string;
  description: string;
}

export class AIService {
  // AI Tutor functionality
  async generateTutorResponse(
    subject: string,
    level: string,
    topic: string,
    language: string,
    conversationHistory: { role: string; content: string }[],
    currentStep: string,
    context?: string
  ): Promise<TutorResponse> {
    const systemPrompt = `You are VaktaAI, a patient, rigorous conversational tutor.
Subject: ${subject}. Level: ${level}. Language: ${language}. Topic: ${topic}.
Rules:
- Use the Diagnose → Teach → Check → Remediate loop.
- One micro-concept per turn (≤120 words) + tiny example.
- Ask a short check question (MCQ or short) every turn.
- If the student is wrong, explain the misconception and use a simpler analogy.
- Every 3 steps, summarize key points as bullets.
- For math/science, render formulas in LaTeX ($...$).
- If you cite external facts, include citations if available from DOCS. Otherwise say you're not sure.
- Tone: warm, encouraging, never condescending.
- Respond in valid JSON format with the structure: {"explain": "...", "check": {...}, "meta": {...}}
${context ? `\nDOCS (optional context):\n${context}` : ''}`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(msg => ({ role: msg.role as any, content: msg.content }))
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    return JSON.parse(content) as TutorResponse;
  }

  // DocChat functionality
  async generateDocChatResponse(
    question: string,
    context: string,
    language: string = 'en'
  ): Promise<string> {
    const systemPrompt = `You are VaktaAI, a grounded study assistant.
Ground your answer ONLY in CONTEXT below. If unsure, say so.
Return crisp bullets; include citations like [Doc {title}, p.{page} §{heading}].
Language: ${language}. Keep tone friendly and clear.

CONTEXT:
${context}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_completion_tokens: 8192,
    });

    return response.choices[0].message.content || '';
  }

  // Quiz generation
  async generateQuiz(
    subject: string,
    topic: string,
    difficulty: string,
    questionCount: number,
    questionTypes: string[],
    language: string = 'en',
    context?: string
  ): Promise<QuizQuestion[]> {
    const systemPrompt = `Create ${questionCount} high-quality exam-style questions on ${topic} in ${subject}.
Language: ${language}. Difficulty: ${difficulty}. Types: ${questionTypes.join(', ')}.
For each question return JSON in this exact format:
{ "type":"mcq_single|mcq_multi|short|long",
  "stem":"...",
  "options":["A","B","C","D"], 
  "answer":["B"], 
  "rationale":"Why this is correct and others aren't",
  "sourceRef":"Doc p.12 §3.1" }
Constraints:
- Single unambiguous correct answer (unless multi).
- Plausible distractors. Spread cognitive levels.
- Return a JSON array of questions.
${context ? `\nSOURCE CONTEXT:\n${context}` : ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    const result = JSON.parse(content);
    return result.questions || result;
  }

  // Notes summarization
  async summarizeContent(
    content: string,
    language: string = 'en',
    template: string = 'cornell'
  ): Promise<NoteSummary> {
    const systemPrompt = `Produce student notes in ${language}, ${template} style.
Sections:
1) Big Idea (3-5 lines)
2) Key Terms (term: definition) — 10-15 items
3) Summary (≤180 words)
4) Sectioned bullets per heading with examples and formulas ($...$)
5) 8-12 flashcard pairs and 6-10 quizable facts
Include source breadcrumbs (URL title or Doc page). Be concise.
Return valid JSON with structure: {"bigIdea": "...", "keyTerms": [...], "summary": "...", "sections": [...], "flashcards": [...], "quizableFacts": [...]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `SOURCE:\n${content}` }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) throw new Error('No response from AI');

    return JSON.parse(responseContent) as NoteSummary;
  }

  // Study plan generation
  async generateStudyPlan(
    subject: string,
    topics: string[],
    level: string,
    language: string,
    examDate?: Date,
    intensity: string = 'regular',
    sessionDuration: number = 30
  ): Promise<StudyPlanTask[]> {
    const daysToExam = examDate ? Math.max(Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 7) : 28;
    
    const systemPrompt = `Create a ${daysToExam}-day study plan for Subject: ${subject}, Topics: ${topics.join(', ')}, Level: ${level}, Language: ${language}.
Exam date: ${examDate ? examDate.toISOString().split('T')[0] : "none"}. Intensity: ${intensity}. Session duration: ${sessionDuration} min.
Mix tasks: read/docchat, tutor checkpoints, quizzes (10-20 qs), flashcards with SRS.
Return JSON array of tasks with {"date": "YYYY-MM-DD", "type": "read|tutor|quiz|flashcards|video", "duration": minutes, "title": "...", "description": "..."}.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    const result = JSON.parse(content);
    return result.tasks || result;
  }

  // Document analysis for ingestion
  async analyzeDocument(
    title: string,
    content: string,
    sourceType: string
  ): Promise<{ summary: string; subject?: string; language: string; topics: string[] }> {
    const systemPrompt = `Analyze this document and return JSON with:
{"summary": "Brief description", "subject": "main academic subject", "language": "detected language code", "topics": ["list of main topics"]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Title: ${title}\nType: ${sourceType}\nContent: ${content.substring(0, 4000)}` }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const responseContent = response.choices[0].message.content;
    if (!responseContent) throw new Error('No response from AI');

    return JSON.parse(responseContent);
  }

  // Streaming chat responses
  async *streamChatResponse(
    messages: { role: string; content: string }[],
    systemPrompt: string
  ): AsyncGenerator<string, void, unknown> {
    const stream = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => ({ role: msg.role as any, content: msg.content }))
      ],
      stream: true,
      max_completion_tokens: 8192,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // Generate embeddings for RAG
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  }

  // Rerank search results
  async rerankResults(
    query: string,
    results: { text: string; metadata?: any }[],
    topK: number = 8
  ): Promise<{ text: string; metadata?: any; score: number }[]> {
    if (results.length <= topK) {
      return results.map(r => ({ ...r, score: 1.0 }));
    }

    // For now, we'll use a simple approach - in production you'd use a reranking model
    const prompt = `Rank these ${results.length} text passages by relevance to the query: "${query}"\n\nPassages:\n${results.map((r, i) => `${i + 1}. ${r.text.substring(0, 200)}...`).join('\n\n')}\n\nReturn only the numbers of the most relevant ${topK} passages, in order of relevance (most relevant first), separated by commas.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 100,
    });

    const content = response.choices[0].message.content;
    if (!content) return results.slice(0, topK).map(r => ({ ...r, score: 1.0 }));

    try {
      const indices = content.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < results.length);
      const reranked = indices.slice(0, topK).map((i, rank) => ({
        ...results[i],
        score: 1.0 - (rank / topK)
      }));
      return reranked;
    } catch {
      return results.slice(0, topK).map(r => ({ ...r, score: 1.0 }));
    }
  }
}

export const aiService = new AIService();
