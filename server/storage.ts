import {
  users,
  documents,
  chats,
  messages,
  notes,
  quizzes,
  quizQuestions,
  quizAttempts,
  studyPlans,
  studyTasks,
  flashcards,
  chunks,
  tutorSessions,
  languageDetectionLogs,
  responseValidationLogs,
  type User,
  type UpsertUser,
  type InsertDocument,
  type Document,
  type InsertChat,
  type Chat,
  type InsertMessage,
  type Message,
  type InsertNote,
  type Note,
  type InsertQuiz,
  type Quiz,
  type InsertQuizQuestion,
  type QuizQuestion,
  type InsertQuizAttempt,
  type QuizAttempt,
  type InsertStudyPlan,
  type StudyPlan,
  type InsertStudyTask,
  type StudyTask,
  type InsertFlashcard,
  type Flashcard,
  type InsertChunk,
  type Chunk,
  type InsertTutorSession,
  type TutorSession,
  type InsertLanguageDetectionLog,
  type LanguageDetectionLog,
  type InsertResponseValidationLog,
  type ResponseValidationLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<string>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  updateDocumentStatus(id: string, status: string, metadata?: any): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  
  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChat(id: string): Promise<Chat | undefined>;
  getChatsByUser(userId: string): Promise<Chat[]>;
  addMessage(message: InsertMessage): Promise<Message>;
  getChatMessages(chatId: string): Promise<Message[]>;
  
  // Notes operations
  createNote(note: InsertNote): Promise<Note>;
  getNote(id: string): Promise<Note | undefined>;
  getNotesByUser(userId: string): Promise<Note[]>;
  updateNote(id: string, updates: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Quiz operations
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizzesByUser(userId: string): Promise<Quiz[]>;
  addQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  getQuizQuestions(quizId: string): Promise<QuizQuestion[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  getQuizAttempts(quizId: string, userId: string): Promise<QuizAttempt[]>;
  
  // Study Plan operations
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  getStudyPlan(id: string): Promise<StudyPlan | undefined>;
  getStudyPlansByUser(userId: string): Promise<StudyPlan[]>;
  updateStudyPlan(id: string, updates: Partial<InsertStudyPlan>): Promise<StudyPlan>;
  addStudyTask(task: InsertStudyTask): Promise<StudyTask>;
  getStudyTasks(planId: string): Promise<StudyTask[]>;
  updateStudyTask(id: string, updates: Partial<InsertStudyTask>): Promise<StudyTask>;
  
  // Flashcard operations
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  getFlashcardsByUser(userId: string): Promise<Flashcard[]>;
  getFlashcardsByNote(noteId: string): Promise<Flashcard[]>;
  updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard>;
  
  // Chunk operations
  createChunks(chunks: InsertChunk[]): Promise<Chunk[]>;
  getChunksByDocument(docId: string): Promise<Chunk[]>;
  deleteChunksByDocument(docId: string): Promise<void>;
  searchChunks(query: string, limit?: number): Promise<Chunk[]>;
  
  // Tutor Session operations
  createTutorSession(session: InsertTutorSession): Promise<TutorSession>;
  getTutorSession(chatId: string): Promise<TutorSession | undefined>;
  getTutorSessionByUserId(userId: string): Promise<TutorSession[]>;
  updateTutorSession(chatId: string, updates: Partial<InsertTutorSession>): Promise<TutorSession>;
  deleteTutorSession(chatId: string): Promise<void>;
  
  // Language Detection Logging
  logLanguageDetection(log: InsertLanguageDetectionLog): Promise<LanguageDetectionLog>;
  
  // Response Validation Logging
  logResponseValidation(log: InsertResponseValidationLog): Promise<ResponseValidationLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string }): Promise<string> {
    const [user] = await db.insert(users).values(userData).returning();
    return user.id;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: userData,
      })
      .returning();
    return user;
  }

  // Document operations
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(document).returning();
    return doc;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async updateDocumentStatus(id: string, status: string, metadata?: any): Promise<void> {
    await db
      .update(documents)
      .set({ status, metadata })
      .where(eq(documents.id, id));
  }

  async deleteDocument(id: string): Promise<void> {
    // Delete associated chunks first (cascade will handle this automatically via FK constraint)
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Chat operations
  async createChat(chat: InsertChat): Promise<Chat> {
    const [newChat] = await db.insert(chats).values(chat).returning();
    return newChat;
  }

  async getChat(id: string): Promise<Chat | undefined> {
    const [chat] = await db.select().from(chats).where(eq(chats.id, id));
    return chat;
  }

  async getChatsByUser(userId: string): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.createdAt));
  }

  async addMessage(message: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(message).returning();
    return msg;
  }

  async getChatMessages(chatId: string, limit?: number): Promise<Message[]> {
    const query = db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.createdAt);
    
    // Add limit for pagination (helpful for long chats)
    if (limit) {
      return await query.limit(limit);
    }
    
    return await query;
  }

  // Notes operations
  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async getNotesByUser(userId: string): Promise<Note[]> {
    return await db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt));
  }

  async updateNote(id: string, updates: Partial<InsertNote>): Promise<Note> {
    const [updated] = await db
      .update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Quiz operations
  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getQuizzesByUser(userId: string): Promise<Quiz[]> {
    return await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.userId, userId))
      .orderBy(desc(quizzes.createdAt));
  }

  async addQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion> {
    const [q] = await db.insert(quizQuestions).values(question).returning();
    return q;
  }

  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    return await db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(quizQuestions.order);
  }

  async createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt> {
    const [att] = await db.insert(quizAttempts).values(attempt).returning();
    return att;
  }

  async getQuizAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
    return await db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)))
      .orderBy(desc(quizAttempts.createdAt));
  }

  // Study Plan operations
  async createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan> {
    const [newPlan] = await db.insert(studyPlans).values(plan).returning();
    return newPlan;
  }

  async getStudyPlan(id: string): Promise<StudyPlan | undefined> {
    const [plan] = await db.select().from(studyPlans).where(eq(studyPlans.id, id));
    return plan;
  }

  async getStudyPlansByUser(userId: string): Promise<StudyPlan[]> {
    return await db
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.userId, userId))
      .orderBy(desc(studyPlans.createdAt));
  }

  async updateStudyPlan(id: string, updates: Partial<InsertStudyPlan>): Promise<StudyPlan> {
    const [updated] = await db
      .update(studyPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(studyPlans.id, id))
      .returning();
    return updated;
  }

  async addStudyTask(task: InsertStudyTask): Promise<StudyTask> {
    const [newTask] = await db.insert(studyTasks).values(task).returning();
    return newTask;
  }

  async getStudyTasks(planId: string): Promise<StudyTask[]> {
    return await db
      .select()
      .from(studyTasks)
      .where(eq(studyTasks.planId, planId))
      .orderBy(studyTasks.dueAt);
  }

  async updateStudyTask(id: string, updates: Partial<InsertStudyTask>): Promise<StudyTask> {
    const [updated] = await db
      .update(studyTasks)
      .set(updates)
      .where(eq(studyTasks.id, id))
      .returning();
    return updated;
  }

  // Flashcard operations
  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [card] = await db.insert(flashcards).values(flashcard).returning();
    return card;
  }

  async getFlashcardsByUser(userId: string): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId))
      .orderBy(flashcards.nextReview);
  }

  async getFlashcardsByNote(noteId: string): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.noteId, noteId));
  }

  async updateFlashcard(id: string, updates: Partial<InsertFlashcard>): Promise<Flashcard> {
    const [updated] = await db
      .update(flashcards)
      .set(updates)
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  // Chunk operations
  async createChunks(chunkData: InsertChunk[]): Promise<Chunk[]> {
    if (chunkData.length === 0) return [];
    // Type assertion needed due to custom vector type
    const newChunks = await db.insert(chunks).values(chunkData as any).returning();
    return newChunks;
  }

  async getChunksByDocument(docId: string): Promise<Chunk[]> {
    return await db
      .select()
      .from(chunks)
      .where(eq(chunks.docId, docId))
      .orderBy(chunks.ord);
  }

  async deleteChunksByDocument(docId: string): Promise<void> {
    await db.delete(chunks).where(eq(chunks.docId, docId));
  }

  async updateChunkEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    await db.update(chunks)
      .set({ embedding })
      .where(eq(chunks.id, chunkId));
  }

  async searchChunks(query: string, limit: number = 10): Promise<Chunk[]> {
    // Basic text search for now - will implement vector search later
    // For now, just return all chunks (will be improved with embeddings)
    return await db
      .select()
      .from(chunks)
      .limit(limit);
  }

  // Vector similarity search using pgvector with IVFFlat optimization
  // Using inner product (dot-product) for msmarco-distilbert model
  async searchChunksByEmbedding(
    queryEmbedding: number[],
    docIds?: string[],
    limit: number = 8
  ): Promise<Array<Chunk & { similarity: number }>> {
    const embeddingStr = JSON.stringify(queryEmbedding);
    
    // Build query with probes setting in same SQL statement (ensures same connection)
    // Using CTE to set probes, then execute search in same query
    // <#> is negative inner product operator, so we multiply by -1 to get actual score
    let query;
    if (docIds && docIds.length > 0) {
      // Filter by specific documents using parameterized array (SQL injection safe)
      // sql.join creates comma-separated list for = ANY() operator
      const docIdsLiterals = docIds.map(id => sql`${id}`);
      query = sql`
        WITH _ AS (SELECT set_config('ivfflat.probes', '10', true))
        SELECT 
          id, doc_id as "docId", ord, text, tokens, page, section, heading, 
          lang as language, hash, embedding, metadata, created_at as "createdAt",
          ((embedding <#> ${embeddingStr}::vector) * -1) as similarity
        FROM chunks
        WHERE doc_id = ANY(ARRAY[${sql.join(docIdsLiterals, sql`, `)}])
        ORDER BY embedding <#> ${embeddingStr}::vector
        LIMIT ${limit}
      `;
    } else {
      // No filter - search all chunks
      query = sql`
        WITH _ AS (SELECT set_config('ivfflat.probes', '10', true))
        SELECT 
          id, doc_id as "docId", ord, text, tokens, page, section, heading, 
          lang as language, hash, embedding, metadata, created_at as "createdAt",
          ((embedding <#> ${embeddingStr}::vector) * -1) as similarity
        FROM chunks
        ORDER BY embedding <#> ${embeddingStr}::vector
        LIMIT ${limit}
      `;
    }
    
    const results = await db.execute(query);
    return results.rows as unknown as Array<Chunk & { similarity: number }>;
  }

  // Tutor Session operations
  async createTutorSession(session: InsertTutorSession): Promise<TutorSession> {
    const [result] = await db.insert(tutorSessions).values(session).returning();
    return result;
  }

  async getTutorSession(chatId: string): Promise<TutorSession | undefined> {
    const [result] = await db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.chatId, chatId));
    return result;
  }

  async getTutorSessionByUserId(userId: string): Promise<TutorSession[]> {
    return db
      .select()
      .from(tutorSessions)
      .where(eq(tutorSessions.userId, userId))
      .orderBy(desc(tutorSessions.createdAt));
  }

  async updateTutorSession(chatId: string, updates: Partial<InsertTutorSession>): Promise<TutorSession> {
    const [result] = await db
      .update(tutorSessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tutorSessions.chatId, chatId))
      .returning();
    return result;
  }

  async deleteTutorSession(chatId: string): Promise<void> {
    await db.delete(tutorSessions).where(eq(tutorSessions.chatId, chatId));
  }

  // Language Detection Logging
  async logLanguageDetection(log: InsertLanguageDetectionLog): Promise<LanguageDetectionLog> {
    const [result] = await db.insert(languageDetectionLogs).values(log).returning();
    return result;
  }

  // Response Validation Logging
  async logResponseValidation(log: InsertResponseValidationLog): Promise<ResponseValidationLog> {
    const [result] = await db.insert(responseValidationLogs).values(log).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
