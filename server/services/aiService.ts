import { aiService } from "../openai";
import { storage } from "../storage";
import { documentService } from "./documentService";
import { aiOrchestrator } from "./aiOrchestrator";
import { AIProviderType } from "./aiProvider";

export class AIServiceManager {
  private async getUserProvider(userId: string): Promise<AIProviderType> {
    const user = await storage.getUser(userId);
    return (user?.aiProvider as AIProviderType) || 'cohere';
  }
  // Tutor session management
  async startTutorSession(
    userId: string,
    subject: string,
    level: string,
    topic: string,
    language: string = 'en'
  ) {
    const chat = await storage.createChat({
      userId,
      mode: 'tutor',
      subject,
      level,
      topic,
      language,
      title: `${subject}: ${topic}`
    });

    // Add initial system message
    await storage.addMessage({
      chatId: chat.id,
      role: 'system',
      content: `Starting tutor session: ${subject} (${level}) - ${topic} in ${language}`,
      metadata: { step: 'start', progress: 0 }
    });

    return chat;
  }

  async continueTutorSession(
    chatId: string,
    userMessage: string,
    userId: string
  ) {
    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error('Chat not found or access denied');
    }

    // Add user message
    await storage.addMessage({
      chatId,
      role: 'user',
      content: userMessage
    });

    // Get conversation history
    const messages = await storage.getChatMessages(chatId);
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    // Generate tutor response
    const response = await aiService.generateTutorResponse(
      chat.subject!,
      chat.level!,
      chat.topic!,
      chat.language!,
      history.slice(-10), // last 10 messages for context
      'teach'
    );

    // Add assistant message
    const assistantMessage = await storage.addMessage({
      chatId,
      role: 'assistant',
      content: JSON.stringify(response),
      metadata: response.meta
    });

    return { response, messageId: assistantMessage.id };
  }

  // DocChat session management
  async startDocChatSession(
    userId: string,
    docIds: string[],
    language: string = 'en'
  ) {
    const chat = await storage.createChat({
      userId,
      mode: 'docchat',
      language,
      title: 'Document Chat',
      docIds: JSON.stringify(docIds)
    });

    return chat;
  }

  async sendDocChatMessage(
    chatId: string,
    message: string,
    userId: string
  ) {
    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error('Chat not found or access denied');
    }

    // Add user message
    await storage.addMessage({
      chatId,
      role: 'user',
      content: message
    });

    // Get relevant context from documents
    const docIds = chat.docIds 
      ? (typeof chat.docIds === 'string' ? JSON.parse(chat.docIds) : chat.docIds)
      : [];
    const relevantChunks = await documentService.retrieveRelevantChunks(
      message,
      userId,
      docIds
    );

    const context = relevantChunks
      .map(chunk => `[${chunk.metadata.docTitle}, p.${chunk.metadata.page} §${chunk.metadata.section}]\n${chunk.text}`)
      .join('\n\n');

    // Generate response
    const response = await aiService.generateDocChatResponse(
      message,
      context,
      chat.language!
    );

    // Add assistant message
    const assistantMessage = await storage.addMessage({
      chatId,
      role: 'assistant',
      content: response,
      metadata: { sources: relevantChunks.map(c => c.metadata) }
    });

    return { response, messageId: assistantMessage.id, sources: relevantChunks };
  }

  // Quiz generation and management
  async generateQuiz(
    userId: string,
    title: string,
    source: string,
    sourceId: string | null,
    subject: string,
    topic: string,
    difficulty: string,
    questionCount: number,
    questionTypes: string[],
    language: string = 'en'
  ) {
    // Create quiz record
    const quiz = await storage.createQuiz({
      userId,
      title,
      source,
      sourceId,
      subject,
      topic,
      difficulty,
      totalQuestions: questionCount,
      language
    });

    // Get context if from document
    let context = '';
    if (sourceId && (source === 'document' || source === 'youtube' || source === 'website')) {
      const chunks = await documentService.retrieveRelevantChunks(
        topic,
        userId,
        [sourceId]
      );
      context = chunks.map(c => c.text).join('\n\n');
    }

    // Get user's preferred AI provider
    const providerType = await this.getUserProvider(userId);
    console.log(`Generating quiz using ${providerType} provider for user ${userId}`);

    // Generate quiz using orchestrator
    const { result: quizData, usedProvider } = await aiOrchestrator.executeWithFallback(
      providerType,
      async (provider) => provider.generateQuiz(context || topic, {
        subject,
        difficulty,
        language,
        questionCount
      })
    );

    console.log(`Quiz generated successfully using ${usedProvider}`);

    // Convert to old format for compatibility
    const questions = quizData.questions.map(q => ({
      type: 'mcq_single' as const,
      stem: q.question,
      options: q.options,
      answer: [q.correctAnswer],
      rationale: q.rationale,
      sourceRef: ''
    }));

    // Store questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      await storage.addQuizQuestion({
        quizId: quiz.id,
        type: question.type,
        stem: question.stem,
        options: question.options || null,
        answer: question.answer,
        rationale: question.rationale,
        sourceRef: question.sourceRef,
        order: i + 1
      });
    }

    return quiz;
  }

  async gradeQuizAttempt(
    quizId: string,
    userId: string,
    answers: Record<string, any>,
    timeSpent: number
  ) {
    const quiz = await storage.getQuiz(quizId);
    if (!quiz || quiz.userId !== userId) {
      throw new Error('Quiz not found or access denied');
    }

    const questions = await storage.getQuizQuestions(quizId);
    let correctCount = 0;
    const feedback: any[] = [];

    for (const question of questions) {
      const userAnswer = answers[question.id];
      const isCorrect = this.checkAnswer(question.answer as string[], userAnswer);
      
      if (isCorrect) correctCount++;
      
      feedback.push({
        questionId: question.id,
        isCorrect,
        userAnswer,
        correctAnswer: question.answer,
        rationale: question.rationale
      });
    }

    const score = (correctCount / questions.length) * 100;

    // Create attempt record
    const attempt = await storage.createQuizAttempt({
      quizId,
      userId,
      answers,
      score,
      totalScore: 100,
      completedAt: new Date(),
      timeSpent,
      metadata: { feedback }
    });

    return { attempt, score, correctCount, totalQuestions: questions.length, feedback };
  }

  private checkAnswer(correctAnswers: string[], userAnswer: any): boolean {
    if (Array.isArray(userAnswer)) {
      return JSON.stringify(correctAnswers.sort()) === JSON.stringify(userAnswer.sort());
    }
    return correctAnswers.includes(String(userAnswer));
  }

  // Notes and summary generation
  async generateNoteFromSources(
    userId: string,
    title: string,
    sourceIds: string[],
    template: string = 'cornell',
    language: string = 'en'
  ) {
    // Get content from sources
    let combinedContent = '';
    for (const sourceId of sourceIds) {
      const chunks = await documentService.retrieveRelevantChunks('', userId, [sourceId], 20);
      combinedContent += chunks.map(c => c.text).join('\n\n') + '\n\n';
    }

    // Get user's preferred AI provider
    const providerType = await this.getUserProvider(userId);
    console.log(`Generating notes using ${providerType} provider for user ${userId}`);

    // Generate summary using orchestrator
    const { result: noteData, usedProvider } = await aiOrchestrator.executeWithFallback(
      providerType,
      async (provider) => provider.generateNotes(combinedContent, {
        language,
        includeFlashcards: true
      })
    );

    console.log(`Notes generated successfully using ${usedProvider}`);

    // Create note
    const note = await storage.createNote({
      userId,
      title: noteData.title || title,
      language,
      template,
      content: noteData,
      sourceIds: JSON.stringify(sourceIds)
    });

    // Generate flashcards
    for (const flashcard of noteData.flashcards) {
      await storage.createFlashcard({
        userId,
        noteId: note.id,
        front: flashcard.front,
        back: flashcard.back
      });
    }

    return note;
  }

  // Study plan generation
  async generateStudyPlan(
    userId: string,
    name: string,
    subject: string,
    topics: string[],
    gradeLevel: string,
    examDate: Date | null,
    intensity: string,
    sessionDuration: number,
    language: string = 'en'
  ) {
    // Create study plan
    const plan = await storage.createStudyPlan({
      userId,
      name,
      subject,
      topics: JSON.stringify(topics),
      gradeLevel,
      examDate,
      intensity,
      sessionDuration,
      language
    });

    // Generate tasks
    const tasks = await aiService.generateStudyPlan(
      subject,
      topics,
      gradeLevel,
      language,
      examDate || undefined,
      intensity,
      sessionDuration
    );

    // Store tasks
    for (const task of tasks) {
      await storage.addStudyTask({
        planId: plan.id,
        title: task.title,
        type: task.type,
        dueAt: new Date(task.date),
        durationMin: task.duration,
        payload: { description: task.description }
      });
    }

    return plan;
  }

  // Quick Tools execution with streaming
  async executeQuickTool(
    sessionId: string | undefined,
    toolType: string,
    params: {
      subject: string;
      level: string;
      topic: string;
      userQuery?: string;
      difficulty?: string;
      language: string;
      examBoard?: string;
      subtopic?: string;
      exampleType?: string;
      qTypes?: string;
      count?: number;
      summaryTurns?: number;
    },
    userId: string,
    onChunk: (chunk: string) => void
  ) {
    const systemPrompt = this.buildQuickToolPrompt(toolType, params);

    let fullResponse = '';

    try {
      for await (const chunk of aiService.streamChatResponse([], systemPrompt)) {
        fullResponse += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Quick tool streaming error:', error);
      throw error;
    }

    // Optionally save to chat if sessionId provided
    if (sessionId) {
      await storage.addMessage({
        chatId: sessionId,
        role: 'assistant',
        content: fullResponse,
        metadata: { toolType, params }
      });
    }

    return fullResponse;
  }

  // Build India-centric prompts for each tool type
  private buildQuickToolPrompt(
    toolType: string,
    params: {
      subject: string;
      level: string;
      topic: string;
      userQuery?: string;
      difficulty?: string;
      language: string;
      examBoard?: string;
      subtopic?: string;
      exampleType?: string;
      qTypes?: string;
      count?: number;
      summaryTurns?: number;
    }
  ): string {
    const { subject, level, topic, language, examBoard, subtopic, userQuery, difficulty, exampleType, qTypes, count } = params;

    const langText = language === 'hi' ? 'हिन्दी (Hindi)' : 'English';
    const boardText = examBoard ? `aligned to ${examBoard}` : 'aligned to Indian curriculum';

    switch (toolType) {
      case 'explain':
        return `System: You are a patient, exam-focused tutor for Indian students.
User context:
- Subject: ${subject}, Level: ${level}, Topic: ${topic}
- Board/Exam: ${examBoard || 'General'}
- Language: ${langText}

Task: Explain the concept "${subtopic || topic}" in ${langText} using:
1) 4-6 short paragraphs, student-friendly language
2) 1 simple analogy from daily life
3) Boxed key formulae (if any) with units
4) 3 quick-check questions with answers at the end
5) If helpful, describe one simple diagram to draw in notebook

Keep it ${boardText}. Use clear examples relevant to Indian students.`;

      case 'hint':
        return `Provide 2-3 progressive hints (no full solution) for this question in ${langText}:

Question: ${userQuery || 'the current problem'}

Context:
- Subject: ${subject} (${level})
- Topic: ${topic}
- Board: ${examBoard || 'General'}

Make each hint shorter than 30 words. Last hint should push toward the method, not the answer. Be encouraging!`;

      case 'example':
        return `Create a ${exampleType || 'Solved Example'} for ${topic} at ${difficulty || 'medium'} difficulty for an Indian ${level} student (${examBoard || 'General curriculum'}).

Requirements:
- Show steps clearly with proper units
- Include common mistakes to avoid
- Use numbers and scenarios relevant to Indian context
- Language: ${langText}

Keep it practical and exam-focused!`;

      case 'practice5':
        return `Generate ${count || 5} ${qTypes || 'mixed type'} practice questions for ${topic} (${difficulty || 'medium'} difficulty) ${boardText}.

Return as JSON array:
[{
  "q": "question text",
  "type": "mcq|short|numeric",
  "options": ["A","B","C","D"]?,
  "answer": "B"|42|"text",
  "explain": "brief explanation why"
}]

Context:
- Subject: ${subject}
- Level: ${level}
- Language: ${langText}
- Board: ${examBoard || 'General'}

Make questions exam-style and grade-appropriate!`;

      case 'summary':
        return `Summarise the recent tutoring session on ${topic} for ${examBoard || 'an Indian'} student.

Include:
- Key ideas covered (bulleted, 4-6 points)
- 3 main takeaways for revision
- Important formulae boxed (if any) with units
- 1 suggested next study step

Context:
- Subject: ${subject} (${level})
- Language: ${langText}

Keep it concise and actionable!`;

      default:
        return `You are a helpful tutor for ${subject} (${level}), teaching ${topic} in ${langText}.`;
    }
  }

  // DocChat Actions execution
  async executeDocChatAction(
    action: string,
    docIds: string[],
    params: { language: string; level?: string; examBoard?: string; [key: string]: any },
    userId: string,
    onChunk: (chunk: string) => void
  ) {
    const chunks = await documentService.retrieveRelevantChunks('', userId, docIds, 50);
    const docContent = chunks.map(c => c.text).join('\n\n');
    const prompt = this.buildDocChatActionPrompt(action, docContent, params);

    let fullResponse = '';
    try {
      for await (const chunk of aiService.streamChatResponse([], prompt)) {
        fullResponse += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('DocChat action error:', error);
      throw error;
    }
    return fullResponse;
  }

  private buildDocChatActionPrompt(action: string, content: string, params: any): string {
    const { language, level, examBoard, keywords, maxLength, density, extractQuotes, count, types, difficulty, style } = params;
    const lang = language === 'hi' ? 'हिन्दी' : 'English';
    const board = examBoard ? ` for ${examBoard}` : '';

    switch (action) {
      case 'summary':
        return `Create a structured summary from the following content${board} in ${lang}.
${keywords ? `Focus on: ${keywords}\n` : ''}
Detail level: ${maxLength || 'Medium'}

Include:
- Introduction (2-3 lines)
- Key Points (bulleted, 5-8 items)
- Examples/Diagrams mentioned
- Important formulae boxed with units
- References with page/section numbers

Content:
${content.slice(0, 8000)}

Output in ${lang}.`;

      case 'highlights':
        return `Extract ${density || 'Medium'} density highlights from this content in ${lang}.
${extractQuotes ? 'Include exact quotes with page/section references.\n' : ''}
Format as numbered list. Language: ${lang}

Content:
${content.slice(0, 8000)}`;

      case 'quiz':
        return `Generate ${count || 10} ${types || 'mixed'} questions at ${difficulty || 'medium'} difficulty${board} from this content.

Return JSON:
[{
  "q": "question",
  "type": "mcq|short|numeric|assertion-reason",
  "options": ["A","B","C","D"]?,
  "answer": "B"|"text"|42,
  "explain": "brief explanation",
  "page": "source reference"
}]

Language: ${lang}
Content:
${content.slice(0, 8000)}`;

      case 'flashcards':
        return `Generate ${count || 10} ${style || 'Basic'} flashcards from this content in ${lang}.
Keep answers < 32 words.

Return JSON:
[{"front": "question/term", "back": "answer/definition", "source": "page/section"}]

Content:
${content.slice(0, 8000)}`;

      default:
        return `Analyze this content in ${lang}:\n${content.slice(0, 8000)}`;
    }
  }

  // Streaming responses for real-time chat
  async *streamTutorResponse(
    chatId: string,
    userMessage: string,
    userId: string
  ): AsyncGenerator<string, void, unknown> {
    const chat = await storage.getChat(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error('Chat not found or access denied');
    }

    // Add user message
    await storage.addMessage({
      chatId,
      role: 'user',
      content: userMessage
    });

    // Get conversation history
    const messages = await storage.getChatMessages(chatId);
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    const systemPrompt = `You are VaktaAI, a patient tutor for ${chat.subject} at ${chat.level} level, teaching ${chat.topic} in ${chat.language}.
Use the Diagnose → Teach → Check → Remediate loop. Keep responses under 120 words with examples.
Be encouraging and clear. Use LaTeX for math formulas ($...$).`;

    let fullResponse = '';
    
    try {
      // Try streaming first
      for await (const chunk of aiService.streamChatResponse(history.slice(-10), systemPrompt)) {
        fullResponse += chunk;
        yield chunk;
      }
    } catch (error: any) {
      // Fallback to non-streaming if organization not verified for streaming
      console.warn('Streaming failed, falling back to non-streaming:', error.message);
      
      const response = await aiService.generateTutorResponse(
        chat.subject || '',
        chat.level || '',
        chat.topic || '',
        chat.language || 'en',
        history.slice(-10),
        'teach',
        undefined
      );
      
      fullResponse = JSON.stringify(response);
      yield fullResponse;
    }

    // Save complete response
    await storage.addMessage({
      chatId,
      role: 'assistant',
      content: fullResponse
    });
  }
}

export const aiServiceManager = new AIServiceManager();
