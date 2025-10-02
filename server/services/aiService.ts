import { aiService } from "../openai";
import { storage } from "../storage";
import { documentService } from "./documentService";

export class AIServiceManager {
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
    const docIds = chat.docIds ? JSON.parse(chat.docIds as string) : [];
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

    // Generate questions
    const questions = await aiService.generateQuiz(
      subject,
      topic,
      difficulty,
      questionCount,
      questionTypes,
      language,
      context
    );

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

    // Generate summary
    const summary = await aiService.summarizeContent(combinedContent, language, template);

    // Create note
    const note = await storage.createNote({
      userId,
      title,
      language,
      template,
      content: summary,
      sourceIds: JSON.stringify(sourceIds)
    });

    // Generate flashcards
    for (const flashcard of summary.flashcards) {
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
      examDate,
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
    for await (const chunk of aiService.streamChatResponse(history.slice(-10), systemPrompt)) {
      fullResponse += chunk;
      yield chunk;
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
