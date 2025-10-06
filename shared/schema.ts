import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  real,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash"), // Nullable for migration from OIDC users
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  locale: varchar("locale").default('en'),
  aiProvider: varchar("ai_provider").default('cohere'), // 'cohere' or 'openai' - cohere is default
  
  // India-centric student profile fields
  educationBoard: varchar("education_board"), // 'CBSE', 'ICSE', 'State Board', etc.
  examTarget: varchar("exam_target"), // 'JEE', 'NEET', 'Board Exams', 'Other'
  currentClass: varchar("current_class"), // '10th', '12th', 'BSc Year 1', etc.
  subjects: text("subjects").array(), // Array of subjects
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  sourceType: varchar("source_type").notNull(), // 'pdf', 'docx', 'youtube', 'web', 'audio', 'video'
  sourceUrl: varchar("source_url"),
  fileKey: varchar("file_key"), // object storage key
  pages: integer("pages"),
  language: varchar("lang").default('en'),
  tokens: integer("tokens"),
  status: varchar("status").default('processing'), // 'processing', 'ready', 'error'
  metadata: jsonb("metadata").$type<{
    videoId?: string;
    url?: string;
    duration?: string;
    segments?: number;
    extractedAt?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Composite index for user documents ordered by creation
  index("documents_user_id_created_at_idx").on(table.userId, table.createdAt),
  // Index for filtering by status
  index("documents_status_idx").on(table.status),
]);

// Document chunks for RAG
export const chunks = pgTable("chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: varchar("doc_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  ord: integer("ord").notNull(), // chunk order
  text: text("text").notNull(),
  tokens: integer("tokens"),
  page: integer("page"),
  section: varchar("section"),
  heading: varchar("heading"),
  language: varchar("lang"),
  hash: varchar("hash"),
  embedding: vector("embedding"), // pgvector embedding (1536 dimensions for OpenAI text-embedding-3-small)
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Composite index for document chunks in order
  index("chunks_doc_id_ord_idx").on(table.docId, table.ord),
  // Note: Vector index (IVFFlat) will be created via SQL migration
]);

// Chats table
export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title"),
  mode: varchar("mode").notNull(), // 'tutor', 'docchat', 'general'
  subject: varchar("subject"),
  level: varchar("level"),
  language: varchar("language").default('en'),
  topic: varchar("topic"),
  docIds: jsonb("doc_ids"), // array of document IDs for docchat
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Composite index for user chats ordered by creation (most recent first)
  index("chats_user_id_created_at_idx").on(table.userId, table.createdAt),
  // Index for filtering by mode
  index("chats_mode_idx").on(table.mode),
]);

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  tool: varchar("tool"), // tool used for this message
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Composite index for chat messages ordered by creation (chronological order)
  index("messages_chat_id_created_at_idx").on(table.chatId, table.createdAt),
]);

// Notes table
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  language: varchar("lang").default('en'),
  template: varchar("template"), // 'cornell', 'lecture', 'research', etc.
  content: jsonb("content_json"),
  sourceIds: jsonb("source_ids"), // array of document IDs used as sources
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quizzes table
export const quizzes = pgTable("quizzes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  source: varchar("source"), // 'topic', 'document', 'youtube', 'website'
  sourceId: varchar("source_id"), // document ID if from document
  subject: varchar("subject"),
  topic: varchar("topic"),
  language: varchar("lang").default('en'),
  difficulty: varchar("difficulty").default('medium'),
  totalQuestions: integer("total").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quiz questions table
export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type").notNull(), // 'mcq_single', 'mcq_multi', 'short', 'long'
  stem: text("stem").notNull(), // the question text
  options: jsonb("options"), // array of options for MCQ
  answer: jsonb("answer"), // correct answer(s)
  rationale: text("rationale"), // explanation
  sourceRef: varchar("source_ref"), // citation
  order: integer("order").notNull(),
  metadata: jsonb("metadata"),
});

// Quiz attempts table
export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  answers: jsonb("answers"), // user's answers
  score: real("score"),
  totalScore: real("total_score"),
  completedAt: timestamp("completed_at"),
  timeSpent: integer("time_spent"), // in seconds
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study plans table
export const studyPlans = pgTable("study_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  mode: varchar("mode").default('exam'), // 'exam', 'continuous'
  language: varchar("lang").default('en'),
  gradeLevel: varchar("grade_level"),
  subject: varchar("subject"),
  topics: jsonb("topics"), // array of topics
  examDate: timestamp("exam_date"),
  intensity: varchar("intensity").default('regular'), // 'light', 'regular', 'intense'
  sessionDuration: integer("session_duration").default(30), // in minutes
  preferences: jsonb("preferences"),
  status: varchar("status").default('active'), // 'active', 'paused', 'completed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Study tasks table
export const studyTasks = pgTable("study_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => studyPlans.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title").notNull(),
  type: varchar("type").notNull(), // 'read', 'tutor', 'quiz', 'flashcards', 'video'
  dueAt: timestamp("due_at"),
  durationMin: integer("duration_min"),
  payload: jsonb("payload"), // task-specific data
  status: varchar("status").default('pending'), // 'pending', 'completed', 'skipped'
  completedAt: timestamp("completed_at"),
  srsInterval: integer("srs_interval"), // spaced repetition interval in days
  srsDueAt: timestamp("srs_due_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards table
export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  noteId: varchar("note_id").references(() => notes.id, { onDelete: "cascade" }),
  quizId: varchar("quiz_id").references(() => quizzes.id, { onDelete: "cascade" }),
  front: text("front").notNull(),
  back: text("back").notNull(),
  tags: jsonb("tags"), // array of tags
  difficulty: integer("difficulty").default(0), // SRS difficulty
  interval: integer("interval").default(1), // SRS interval
  repetition: integer("repetition").default(0), // SRS repetition count
  easeFactor: real("ease_factor").default(2.5), // SRS ease factor
  nextReview: timestamp("next_review").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tutor Sessions table - tracks 7-phase conversation flow
export const tutorSessions = pgTable("tutor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  
  // Session state
  currentPhase: varchar("current_phase").notNull().default('greeting'), // greeting, rapport, assessment, teaching, practice, feedback, closure
  phaseStep: integer("phase_step").default(0), // sub-step within current phase
  progress: integer("progress").default(0), // 0-100 overall progress
  
  // Persona & adaptation
  personaId: varchar("persona_id").notNull(), // 'priya', 'amit'
  level: varchar("level").default('beginner'), // beginner, intermediate, advanced
  adaptiveMetrics: jsonb("adaptive_metrics").$type<{
    diagnosticScore?: number; // 0-100
    checkpointsPassed?: number;
    hintsUsed?: number;
    misconceptions?: string[];
    strongConcepts?: string[];
  }>(),
  
  // User context snapshot (from profile at session start)
  profileSnapshot: jsonb("profile_snapshot").$type<{
    firstName?: string;
    lastName?: string;
    currentClass?: string;
    examTarget?: string;
    educationBoard?: string;
  }>(),
  
  // Session data
  lastCheckpoint: jsonb("last_checkpoint"), // last question/state for resume
  voiceEnabled: boolean("voice_enabled").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for user's tutor sessions
  index("tutor_sessions_user_id_idx").on(table.userId),
  // Index for phase queries
  index("tutor_sessions_phase_idx").on(table.currentPhase),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  chats: many(chats),
  notes: many(notes),
  quizzes: many(quizzes),
  studyPlans: many(studyPlans),
  flashcards: many(flashcards),
  quizAttempts: many(quizAttempts),
  tutorSessions: many(tutorSessions),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  chunks: many(chunks),
}));

export const chunksRelations = relations(chunks, ({ one }) => ({
  document: one(documents, {
    fields: [chunks.docId],
    references: [documents.id],
  }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
  tutorSession: one(tutorSessions, {
    fields: [chats.id],
    references: [tutorSessions.chatId],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
  flashcards: many(flashcards),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  user: one(users, {
    fields: [quizzes.userId],
    references: [users.id],
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts),
  flashcards: many(flashcards),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id],
  }),
}));

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
}));

export const studyPlansRelations = relations(studyPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [studyPlans.userId],
    references: [users.id],
  }),
  tasks: many(studyTasks),
}));

export const studyTasksRelations = relations(studyTasks, ({ one }) => ({
  plan: one(studyPlans, {
    fields: [studyTasks.planId],
    references: [studyPlans.id],
  }),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  user: one(users, {
    fields: [flashcards.userId],
    references: [users.id],
  }),
  note: one(notes, {
    fields: [flashcards.noteId],
    references: [notes.id],
  }),
  quiz: one(quizzes, {
    fields: [flashcards.quizId],
    references: [quizzes.id],
  }),
}));

export const tutorSessionsRelations = relations(tutorSessions, ({ one }) => ({
  user: one(users, {
    fields: [tutorSessions.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [tutorSessions.chatId],
    references: [chats.id],
  }),
}));

// Insert schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  createdAt: true,
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyTaskSchema = createInsertSchema(studyTasks).omit({
  id: true,
  createdAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export const insertChunkSchema = createInsertSchema(chunks).omit({
  id: true,
  createdAt: true,
});

export const insertTutorSessionSchema = createInsertSchema(tutorSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schema for users (exclude password_hash from inserts, handle separately)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type AuthUser = Omit<User, 'passwordHash'>; // Exclude password hash from auth responses
export type InsertDocument = typeof insertDocumentSchema._type;
export type Document = typeof documents.$inferSelect;
export type InsertChat = typeof insertChatSchema._type;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = typeof insertMessageSchema._type;
export type Message = typeof messages.$inferSelect;
export type InsertNote = typeof insertNoteSchema._type;
export type Note = typeof notes.$inferSelect;
export type InsertQuiz = typeof insertQuizSchema._type;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuizQuestion = typeof insertQuizQuestionSchema._type;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type InsertQuizAttempt = typeof insertQuizAttemptSchema._type;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertStudyPlan = typeof insertStudyPlanSchema._type;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertStudyTask = typeof insertStudyTaskSchema._type;
export type StudyTask = typeof studyTasks.$inferSelect;
export type InsertFlashcard = typeof insertFlashcardSchema._type;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertChunk = typeof insertChunkSchema._type;
export type Chunk = typeof chunks.$inferSelect;
export type InsertTutorSession = typeof insertTutorSessionSchema._type;
export type TutorSession = typeof tutorSessions.$inferSelect;
