# VaktaAI - Complete Developer Documentation
## Ultra-Detailed Technical Reference

---

## 📋 Table of Contents
1. [Technology Stack](#technology-stack)
2. [System Architecture](#system-architecture)
3. [Features & Functionality](#features--functionality)
4. [AI Services & APIs](#ai-services--apis)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Open Source Libraries](#open-source-libraries)
8. [Document Processing Pipeline](#document-processing-pipeline)
9. [Authentication & Security](#authentication--security)
10. [Voice Services](#voice-services)

---

## 🛠️ Technology Stack

### **Frontend Stack**
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | Core UI framework |
| **TypeScript** | 5.6.3 | Type safety |
| **Vite** | 5.4.20 | Build tool & dev server |
| **Wouter** | 3.3.5 | Client-side routing (lightweight React Router alternative) |
| **TanStack Query (React Query)** | 5.60.5 | Server state management, caching, optimistic updates |
| **Tailwind CSS** | 3.4.17 | Utility-first styling |
| **shadcn/ui + Radix UI** | Latest | Accessible component primitives |
| **Framer Motion** | 11.13.1 | Animation library |
| **React Hook Form** | 7.55.0 | Form validation |
| **Zod** | 3.24.2 | Schema validation |
| **Lucide React** | 0.453.0 | Icon library |
| **Recharts** | 2.15.2 | Data visualization charts |
| **KaTeX** | 0.16.23 | Math rendering |
| **React Markdown** | 10.1.0 | Markdown rendering with math support |

### **Backend Stack**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime environment |
| **Express.js** | 4.21.2 | HTTP server framework |
| **TypeScript** | 5.6.3 | Type-safe backend code |
| **Drizzle ORM** | 0.39.1 | Type-safe database ORM |
| **PostgreSQL** | 16+ (Neon Serverless) | Primary database |
| **pgvector** | Latest | Vector similarity search extension |
| **tsx** | 4.20.5 | TypeScript execution |
| **esbuild** | 0.25.0 | Production bundler |

### **AI & ML Stack**
| Service/Library | Version | Purpose |
|-----------------|---------|---------|
| **OpenAI API** | 6.0.1 | GPT-4o, GPT-4o-mini, Whisper, Embeddings |
| **Google Gemini** | 0.24.1 | Gemini 1.5 Flash (cost-effective fallback) |
| **Anthropic Claude** | 0.65.0 | Claude Haiku (complex reasoning) |
| **Sarvam AI** | Custom API | Indian accent STT (Saarika v2), TTS (Bulbul v2) |
| **@xenova/transformers** | 2.17.2 | Local embeddings (all-MiniLM-L6-v2) |
| **LangChain** | 0.3.x | AI orchestration framework |
| **Cohere** | 7.19.0 | Alternative LLM provider |
| **tiktoken** | 1.0.22 | Token counting |

### **File Processing Libraries**
| Library | Version | Purpose |
|---------|---------|---------|
| **pdf-parse** | 2.1.1 | PDF text extraction |
| **mammoth** | 1.11.0 | DOCX text extraction |
| **tesseract.js** | 6.0.1 | OCR for images |
| **@mozilla/readability** | 0.6.0 | Web article extraction |
| **jsdom** | 27.0.0 | DOM parsing for web scraping |
| **@danielxceron/youtube-transcript** | 1.2.3 | YouTube transcript fetching |

### **Storage & Cloud Services**
| Service | SDK Version | Purpose |
|---------|-------------|---------|
| **AWS S3** | 3.901.0 | Object storage for files |
| **AWS Polly** | 3.901.0 | TTS fallback |
| **Neon PostgreSQL** | 0.10.4 | Serverless database |
| **Redis (ioredis)** | 5.8.0 | Semantic caching |

### **Authentication & Security**
| Library | Version | Purpose |
|---------|---------|---------|
| **Passport.js** | 0.7.0 | Authentication middleware |
| **bcrypt** | 6.0.0 | Password hashing |
| **express-session** | 1.18.1 | Session management |
| **connect-pg-simple** | 10.0.0 | PostgreSQL session store |
| **Helmet.js** | 8.1.0 | Security headers (CSP, XSS protection) |
| **express-rate-limit** | 8.1.0 | API rate limiting |

---

## 🏗️ System Architecture

### **High-Level Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                     │
│  React + TypeScript + TanStack Query + Tailwind CSS     │
└────────────────────┬───────────────────────────────────┘
                     │ REST API + SSE Streaming
                     ▼
┌─────────────────────────────────────────────────────────┐
│              EXPRESS.JS BACKEND (Node.js)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  API Routes Layer                               │   │
│  │  /api/auth, /api/documents, /api/chats, etc.    │   │
│  └────────────────────┬────────────────────────────┘   │
│                       ▼                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Service Layer                                  │   │
│  │  • AIService (GPT-4o orchestration)             │   │
│  │  • DocumentService (file processing)            │   │
│  │  • EmbeddingService (local/OpenAI)              │   │
│  │  • VoiceService (Sarvam/AssemblyAI/Polly)       │   │
│  │  • AgenticRAG (multi-step reasoning)            │   │
│  └────────────────────┬────────────────────────────┘   │
│                       ▼                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Storage Layer (Drizzle ORM)                    │   │
│  │  Database abstraction & CRUD operations          │   │
│  └────────────────────┬────────────────────────────┘   │
└────────────────────────┼───────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│         POSTGRESQL DATABASE (Neon + pgvector)           │
│  • Users, Documents, Chats, Messages                    │
│  • Chunks (with 384-dim vector embeddings)              │
│  • Quizzes, Notes, Study Plans, Flashcards              │
└─────────────────────────────────────────────────────────┘

              ┌──────────────────────────────┐
              │   EXTERNAL SERVICES          │
              │  • OpenAI (GPT-4o, Embeddings│
              │  • Sarvam AI (STT, TTS)      │
              │  • AWS S3 (File Storage)     │
              │  • Redis (Semantic Cache)    │
              └──────────────────────────────┘
```

### **Design Patterns**
- **REST API**: RESTful endpoints for CRUD operations
- **Server-Sent Events (SSE)**: Streaming AI responses in real-time
- **Repository Pattern**: Storage layer abstraction via Drizzle ORM
- **Service Layer Pattern**: Business logic separated from routes
- **Multi-tenant Architecture**: User-scoped data isolation
- **Agentic AI**: Multi-step reasoning with planning, tool execution, reflection
- **RAG (Retrieval Augmented Generation)**: Vector search + LLM synthesis

---

## 🎯 Features & Functionality

### **1. AI Tutor (Conversational Learning)**

#### **7-Phase Conversational Flow**
| Phase | Description | AI Behavior |
|-------|-------------|-------------|
| **Greeting** | Warm welcome, establish rapport | Friendly tone, student name usage, cultural sensitivity |
| **Rapport Building** | Understand student background | Assess prior knowledge, learning style, comfort level |
| **Assessment** | Evaluate current understanding | Diagnostic questions, knowledge gaps identification |
| **Teaching** | Core concept delivery | Adaptive explanations, visual aids, examples |
| **Practice** | Hands-on problem solving | Guided practice, progressive difficulty, hint system |
| **Feedback** | Performance evaluation | Constructive feedback, misconception correction |
| **Closure** | Session summary, next steps | Key takeaways, confidence building, resources |

#### **Adaptive Learning Features**
- **Intent Classification**: Detects user intent (explanation request, example request, answer submission, etc.)
- **Emotion Detection**: Identifies student emotion (confident, confused, frustrated, bored, neutral)
- **Dynamic Response Adaptation**: Adjusts tone, length, complexity based on emotion
- **Progressive Hint System**: Socratic method hints (conceptual → formulaic → numerical)
- **Multilingual Support**: English, Hindi, Hinglish code-mixing

#### **AI Tutor Personas**
| Persona | Voice | Characteristics |
|---------|-------|-----------------|
| **Priya** | Female, warm | Patient, encouraging, cultural references |
| **Amit** | Male, energetic | Enthusiastic, example-driven, relatable |

#### **Quick Tools**
- **Explanation**: Detailed concept breakdown
- **Hint**: Progressive Socratic hints
- **Example**: Contextual real-world examples
- **Quiz**: Quick knowledge check
- **Summary**: Session recap

### **2. DocChat (Document Q&A with RAG)**

#### **Supported Document Formats**
| Format | Processing Method | Key Features |
|--------|-------------------|--------------|
| **PDF** | pdf-parse library | Page-level chunking, metadata extraction |
| **DOCX** | mammoth library | Style-aware text extraction |
| **Images** | Tesseract.js OCR | English + Hindi Devanagari support |
| **YouTube** | YouTube Transcript API | Timestamped segments, video metadata |
| **Web Articles** | Readability + jsdom | Clean content extraction |

#### **RAG Pipeline**
1. **Document Upload**: File/URL submission
2. **Text Extraction**: Format-specific parsing
3. **Semantic Chunking**: 
   - Target: 350 words/chunk
   - Sentence-level splitting with embedding similarity
   - Preserves semantic coherence
4. **Embedding Generation**: 
   - Local: all-MiniLM-L6-v2 (384 dimensions)
   - OpenAI: text-embedding-3-small (fallback)
5. **Vector Storage**: pgvector with IVFFlat index
6. **Query Processing**:
   - User query → embedding
   - Top-K similarity search (cosine distance)
   - Context assembly with token budgeting
7. **AI Response**: GPT-4o with retrieved chunks
8. **Citation Tracking**: Source attribution with excerpts

#### **Agentic RAG Features**
- **Planning Agent**: Decomposes complex queries into sub-questions
- **Tool Execution**: search_documents, get_document_sections, verify_information, synthesize_answer
- **Multi-Step Reasoning**: Iterative information gathering
- **Self-Reflection**: Validates completeness before responding
- **Confidence Scoring**: Quality assessment (0-100)

#### **Quick Actions**
- **Summary**: Document summarization (200-word limit)
- **Highlights**: Key points extraction (5-8 bullets)
- **Quiz**: Auto-generated MCQs from content
- **Flashcards**: Spaced repetition cards

#### **Citation System**
- Clickable citation badges [1], [2] in responses
- Preview dialog with full excerpt + source metadata
- Mobile-optimized citation viewer

#### **Voice Features**
- **Voice Input**: Mic button → Sarvam STT → auto-fill message
- **Suggested Questions**: AI-generated follow-ups after each response
- **Touch Gestures**: Swipe left/right to toggle panels (mobile)

### **3. Quiz Generator**

#### **Question Types**
| Type | Description | Use Case |
|------|-------------|----------|
| **MCQ Single** | Single correct answer | Conceptual understanding |
| **MCQ Multi** | Multiple correct answers | Complex scenarios |
| **Short Answer** | Brief text response | Definitions, formulas |
| **Long Answer** | Detailed explanation | Proofs, derivations |

#### **Generation Sources**
- AI-generated (subject + topic + difficulty)
- Document-based (extract from PDFs/videos)
- Study plan-linked quizzes

#### **Features**
- **Partial Submission**: Save progress, resume later
- **Instant Grading**: Auto-scoring with rationale
- **Performance Tracking**: Accuracy metrics, weak areas
- **Spaced Repetition**: Convert incorrect answers to flashcards

### **4. Study Plan Manager**

#### **Plan Types**
| Mode | Description | Use Case |
|------|-------------|----------|
| **Exam Mode** | Deadline-driven, structured | JEE/NEET preparation |
| **Continuous** | Self-paced, topic-based | Long-term learning |

#### **Intensity Levels**
- **Light**: 30 min/day, 3 days/week
- **Regular**: 1 hour/day, 5 days/week
- **Intense**: 2+ hours/day, daily

#### **Task Types**
| Task Type | Description | Integration |
|-----------|-------------|-------------|
| **Read** | Study material review | Document links |
| **Tutor** | AI tutoring session | Auto-launches AI Tutor |
| **Quiz** | Practice questions | Auto-generated quizzes |
| **Flashcards** | Spaced repetition | SRS algorithm |
| **Video** | YouTube lecture | Embedded player |

#### **AI-Powered Generation**
- **Input**: Grade level, subjects, topics, exam date, intensity
- **Output**: Daily task breakdown with durations
- **Adaptation**: Re-prioritize based on performance

### **5. Smart Notes**

#### **Note Templates**
| Template | Structure | Best For |
|----------|-----------|----------|
| **Cornell** | Cues, Notes, Summary | Lecture notes |
| **Outline** | Hierarchical bullets | Topic organization |
| **Mind Map** | Visual connections | Concept linking |
| **Simple** | Freeform text | Quick capture |

#### **Creation Sources**
- Manual input
- Document summarization
- Audio transcription
- URL content extraction

#### **AI Features**
- **Auto-Summarization**: GPT-4o-mini condensation
- **Flashcard Generation**: Auto-convert to SRS cards
- **Tag Extraction**: Topic/subject auto-tagging

### **6. Flashcards (Spaced Repetition)**

#### **SRS Algorithm (SM-2)**
- **Variables**: Interval, Repetition count, Ease Factor
- **Grading**: Again (0), Hard (3), Good (4), Easy (5)
- **Scheduling**: Next review date calculation
- **Retention**: Optimal memory consolidation

#### **Creation Sources**
- Manual creation
- Quiz wrong answers
- Note excerpts

---

## 🤖 AI Services & APIs

### **OpenAI API Integration**

#### **Models Used**
| Model | Use Cases | Configuration |
|-------|-----------|---------------|
| **gpt-4o** | AI Tutor, DocChat, Complex reasoning | temp: 0.7, streaming: yes |
| **gpt-4o-mini** | Quiz gen, summaries, study plans, analysis | temp: 0.7, JSON mode: yes |
| **text-embedding-3-small** | Semantic search embeddings | dim: 1536 |
| **whisper-1** | Audio transcription (fallback) | language: auto-detect |

#### **API Methods**
```typescript
// Chat Completions (Streaming)
openai.chat.completions.create({
  model: "gpt-4o",
  messages: [...],
  stream: true,
  temperature: 0.7
})

// Chat Completions (JSON Mode)
openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  response_format: { type: "json_object" },
  max_completion_tokens: 2048
})

// Embeddings
openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "text to embed"
})

// Audio Transcription
openai.audio.transcriptions.create({
  file: audioBuffer,
  model: "whisper-1",
  language: "en"
})
```

### **Google Gemini Integration**

#### **Model Used**
- **gemini-1.5-flash**: Cost-effective alternative to GPT-4o-mini

#### **LangChain Integration**
```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const geminiFlash = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  temperature: 0.7,
  apiKey: process.env.GOOGLE_API_KEY
});

const response = await geminiFlash.invoke(messages);
```

### **Anthropic Claude Integration**

#### **Model Used**
- **claude-haiku**: Complex reasoning (derivations, proofs)

#### **API Usage**
```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const response = await anthropic.messages.create({
  model: "claude-haiku-20240307",
  max_tokens: 2048,
  messages: [...]
});
```

### **Sarvam AI (Indian Voice Services)**

#### **Speech-to-Text (Saarika v2)**
```typescript
// API Endpoint: https://api.sarvam.ai/speech-to-text
const formData = new FormData();
formData.append('file', audioBlob, 'audio.wav');
formData.append('model', 'saarika:v2');
formData.append('language_code', 'hi-IN'); // or 'en-IN'
formData.append('with_timestamps', 'false');

const response = await fetch('/speech-to-text', {
  method: 'POST',
  headers: { 'API-Subscription-Key': apiKey },
  body: formData
});

// Response: { transcript: "...", language_code: "hi-IN" }
```

#### **Text-to-Speech (Bulbul v2)**
```typescript
// API Endpoint: https://api.sarvam.ai/text-to-speech
const response = await fetch('/text-to-speech', {
  method: 'POST',
  headers: {
    'API-Subscription-Key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputs: ["Text to synthesize..."],
    target_language_code: 'hi-IN', // or 'en-IN'
    speaker: 'meera', // Indian voice
    pitch: 0,
    pace: 1.0,
    loudness: 1.5,
    speech_sample_rate: 8000,
    enable_preprocessing: true,
    model: 'bulbul:v2'
  })
});

// Response: { audios: [base64AudioString] }
```

#### **Enhanced Voice Features**
- **Math-to-Speech**: Converts equations (V=IR → "V equals I into R")
- **Emotion-Based Prosody**: Adjusts pitch/pace/loudness by emotion
- **Hinglish Optimization**: Code-switching support
- **Technical Term Capitalization**: Physics/Chemistry units

### **Intelligent Model Router**

#### **Routing Logic**
```typescript
// Query Analysis
interface QueryAnalysis {
  intent: string;        // explanation, example, solve, etc.
  complexity: number;    // 1-4 scale
  subject: string;       // physics, chemistry, math
  language: string;      // en, hi, hinglish
  requiresReasoning: boolean;
}

// Model Selection
if (complexity >= 4 && requiresReasoning) {
  return "claude-haiku"; // $0.25/1M input tokens
} else if (complexity >= 3) {
  return "gpt-4o-mini";  // $0.15/1M input tokens
} else {
  return "gemini-flash"; // $0.075/1M input tokens
}
```

#### **Fallback Chain**
1. Primary model (based on analysis)
2. If API key missing → Next cheapest model
3. If all fail → Error with helpful message

### **Local Embedding Service**

#### **Model: all-MiniLM-L6-v2**
```typescript
import { pipeline } from "@xenova/transformers";

const extractor = await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2'
);

const embeddings = await extractor(texts, {
  pooling: 'mean',
  normalize: true
});

// Output: 384-dimensional vectors
```

#### **Use Cases**
- Document chunking (semantic similarity)
- RAG retrieval (cosine similarity search)
- Duplicate detection (chunk deduplication)

---

## 🗄️ Database Schema

### **Core Tables**

#### **users**
```typescript
{
  id: varchar (UUID) PK,
  email: varchar UNIQUE,
  passwordHash: varchar,
  firstName: varchar,
  lastName: varchar,
  profileImageUrl: varchar,
  locale: varchar DEFAULT 'en',
  aiProvider: varchar DEFAULT 'openai',
  educationBoard: varchar,
  examTarget: varchar,
  currentClass: varchar,
  subjects: text[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **documents**
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id,
  title: varchar NOT NULL,
  sourceType: varchar NOT NULL, // pdf, docx, youtube, web, image, text
  sourceUrl: varchar,
  fileKey: varchar, // S3 object key
  pages: integer,
  language: varchar DEFAULT 'en',
  tokens: integer,
  status: varchar DEFAULT 'processing', // processing, ready, error
  metadata: jsonb, // { transcriptSegments, videoId, confidence, etc. }
  createdAt: timestamp
}
```

#### **chunks** (RAG Vector Store)
```typescript
{
  id: varchar (UUID) PK,
  docId: varchar FK → documents.id CASCADE,
  ord: integer NOT NULL, // Chunk order
  text: text NOT NULL,
  tokens: integer,
  page: integer,
  section: varchar,
  heading: varchar,
  language: varchar,
  hash: varchar, // Deduplication
  embedding: vector(384), // pgvector
  metadata: jsonb,
  createdAt: timestamp
}

// Indexes
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX chunks_docId_idx ON chunks (docId);
```

#### **chats**
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  title: varchar,
  mode: varchar NOT NULL, // tutor, docchat, general
  subject: varchar,
  level: varchar,
  language: varchar DEFAULT 'en',
  topic: varchar,
  docIds: jsonb, // Array of document IDs for DocChat
  metadata: jsonb,
  createdAt: timestamp
}
```

#### **messages**
```typescript
{
  id: varchar (UUID) PK,
  chatId: varchar FK → chats.id CASCADE,
  role: varchar NOT NULL, // user, assistant, system
  content: text NOT NULL,
  tool: varchar, // hint, example, summary, etc.
  metadata: jsonb, // { sources, citations, emotion, intent }
  createdAt: timestamp
}
```

#### **quizzes**
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  title: varchar NOT NULL,
  source: varchar, // ai, document, study_plan
  sourceId: varchar,
  subject: varchar,
  topic: varchar,
  language: varchar DEFAULT 'en',
  difficulty: varchar DEFAULT 'medium',
  totalQuestions: integer NOT NULL,
  metadata: jsonb,
  createdAt: timestamp
}
```

#### **quiz_questions**
```typescript
{
  id: varchar (UUID) PK,
  quizId: varchar FK → quizzes.id CASCADE,
  type: varchar NOT NULL, // mcq_single, mcq_multi, short, long
  stem: text NOT NULL, // Question text
  options: jsonb, // [{ id, text }, ...]
  answer: jsonb, // Correct answer(s)
  rationale: text,
  sourceRef: varchar,
  order: integer NOT NULL,
  metadata: jsonb
}
```

#### **quiz_attempts**
```typescript
{
  id: varchar (UUID) PK,
  quizId: varchar FK → quizzes.id CASCADE,
  userId: varchar FK → users.id CASCADE,
  answers: jsonb, // { questionId: userAnswer }
  score: real,
  totalScore: real,
  completedAt: timestamp,
  timeSpent: integer, // seconds
  metadata: jsonb,
  createdAt: timestamp
}
```

#### **notes**
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  title: varchar NOT NULL,
  language: varchar DEFAULT 'en',
  template: varchar, // cornell, outline, mindmap, simple
  content_json: jsonb,
  sourceIds: jsonb, // Array of source doc/chat IDs
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **flashcards** (Spaced Repetition)
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  noteId: varchar FK → notes.id CASCADE,
  quizId: varchar FK → quizzes.id CASCADE,
  front: text NOT NULL,
  back: text NOT NULL,
  tags: jsonb,
  difficulty: integer DEFAULT 0,
  interval: integer DEFAULT 1, // Days until next review
  repetition: integer DEFAULT 0,
  easeFactor: real DEFAULT 2.5, // SM-2 algorithm
  nextReview: timestamp,
  createdAt: timestamp
}
```

#### **study_plans**
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  name: varchar NOT NULL,
  mode: varchar DEFAULT 'exam', // exam, continuous
  language: varchar DEFAULT 'en',
  gradeLevel: varchar,
  subject: varchar,
  topics: jsonb,
  examDate: timestamp,
  intensity: varchar DEFAULT 'regular', // light, regular, intense
  sessionDuration: integer DEFAULT 30, // minutes
  preferences: jsonb,
  status: varchar DEFAULT 'active', // active, paused, completed
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **study_tasks**
```typescript
{
  id: varchar (UUID) PK,
  planId: varchar FK → study_plans.id CASCADE,
  title: varchar NOT NULL,
  type: varchar NOT NULL, // read, tutor, quiz, flashcards, video
  dueAt: timestamp,
  durationMin: integer,
  payload: jsonb, // Task-specific data
  status: varchar DEFAULT 'pending', // pending, completed, skipped
  completedAt: timestamp,
  srsInterval: integer, // Spaced repetition
  srsDueAt: timestamp,
  metadata: jsonb,
  createdAt: timestamp
}
```

#### **tutor_sessions** (7-Phase Tracking)
```typescript
{
  id: varchar (UUID) PK,
  chatId: varchar FK → chats.id CASCADE UNIQUE,
  userId: varchar FK → users.id CASCADE,
  subject: varchar NOT NULL,
  topic: varchar NOT NULL,
  currentPhase: varchar NOT NULL DEFAULT 'greeting',
  phaseStep: integer DEFAULT 0,
  progress: integer DEFAULT 0 NOT NULL,
  personaId: varchar NOT NULL, // priya, amit
  level: varchar DEFAULT 'beginner',
  adaptiveMetrics: jsonb,
  profileSnapshot: jsonb,
  lastCheckpoint: jsonb,
  voiceEnabled: boolean DEFAULT false,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **language_detection_logs** (Analytics)
```typescript
{
  id: varchar (UUID) PK,
  userId: varchar FK → users.id CASCADE,
  chatId: varchar FK → chats.id CASCADE,
  inputText: text NOT NULL,
  detectedLanguage: varchar NOT NULL, // hindi, hinglish, english
  confidence: real NOT NULL,
  confidenceLevel: varchar NOT NULL, // very_high, high, medium, low
  lexicalScore: real,
  syntacticScore: real,
  statisticalScore: real,
  contextualScore: real,
  processingTime: integer, // ms
  detectionMethod: varchar,
  metadata: jsonb,
  createdAt: timestamp
}
```

### **Vector Search Queries**

#### **Semantic Search (Cosine Similarity)**
```sql
-- Find top 10 relevant chunks
SELECT 
  c.id, 
  c.text, 
  c.page, 
  c.metadata,
  1 - (c.embedding <=> $1::vector) AS similarity
FROM chunks c
WHERE c.docId = ANY($2::varchar[])
ORDER BY c.embedding <=> $1::vector
LIMIT 10;
```

---

## 🔌 API Endpoints

### **Authentication**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/auth/signup` | Create account | `{ email, password, firstName, lastName }` | User object + session |
| POST | `/api/auth/login` | Login | `{ email, password }` | User object + session |
| POST | `/api/auth/logout` | Logout | - | `{ message }` |
| GET | `/api/auth/user` | Get current user | - | User object |
| PATCH | `/api/auth/profile` | Update profile | `{ firstName?, lastName?, locale?, subjects? }` | Updated user |

### **Documents**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/documents/upload` | Upload file | `multipart/form-data` | Document object |
| POST | `/api/documents/by-url` | Add YouTube/Web | `{ url: string }` | Document object |
| GET | `/api/documents` | List user docs | - | Document[] |
| GET | `/api/documents/:id/status` | Get status | - | `{ status, metadata }` |
| DELETE | `/api/documents/:id` | Delete doc | - | `{ message }` |
| POST | `/api/objects/upload` | Get presigned URL | `{ fileName, fileType }` | `{ presignedUrl, objectKey }` |

### **Chats & AI**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/chats` | Create chat | `{ mode, subject?, level?, topic?, docIds? }` | Chat object |
| GET | `/api/chats` | List user chats | `?mode=tutor` (optional) | Chat[] |
| GET | `/api/chats/:id` | Get chat details | - | Chat object |
| DELETE | `/api/chats/:id` | Delete chat | - | `{ message }` |
| GET | `/api/chats/:id/messages` | Get chat history | - | Message[] |
| GET | `/api/chats/:id/stream` | Stream AI response (SSE) | `?message=query` | SSE stream |

### **AI Tutor**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/tutor/session` | Start tutor session | `{ subject, level, topic, language }` | Chat + Session object |
| POST | `/api/tutor/quick-tool/:kind` | Execute quick tool | `{ message, chatId }` | Tool response |
| POST | `/api/tutor/tts` | Synthesize speech | `{ text, language, emotion?, intent? }` | Audio buffer |
| POST | `/api/tutor/transcribe` | Transcribe audio | `multipart/form-data` | `{ text, language }` |

### **DocChat**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/docchat/session` | Start DocChat | `{ docIds: string[], language? }` | Chat object |
| POST | `/api/docchat/action/:actionType` | Quick action (SSE) | `{ chatId, language? }` | SSE stream |

### **Quizzes**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/quizzes` | Generate quiz | `{ subject, topic, difficulty, questionCount, language? }` | Quiz + Questions |
| GET | `/api/quizzes` | List user quizzes | - | Quiz[] |
| GET | `/api/quizzes/:id` | Get quiz details | - | Quiz + Questions |
| POST | `/api/quizzes/:id/attempts` | Submit attempt | `{ answers: { [questionId]: answer }, timeSpent? }` | Attempt + Score |

### **Study Plans**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/study-plans` | Create plan | `{ name, mode, gradeLevel, subject, topics, examDate?, intensity, sessionDuration }` | StudyPlan + Tasks |
| GET | `/api/study-plans` | List user plans | - | StudyPlan[] |
| GET | `/api/study-plans/:id` | Get plan details | - | StudyPlan + Tasks |
| PATCH | `/api/study-plans/:id/tasks/:taskId` | Update task status | `{ status: 'completed' }` | Updated task |
| DELETE | `/api/study-plans/:id` | Delete plan | - | `{ message }` |

### **Notes & Flashcards**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/notes` | Create note | `{ title, template, sourceIds?, audio?, url? }` | Note object |
| GET | `/api/notes` | List user notes | - | Note[] |
| GET | `/api/notes/:id` | Get note details | - | Note object |
| PATCH | `/api/notes/:id` | Update note | `{ title?, content_json? }` | Updated note |
| GET | `/api/flashcards` | Get due flashcards | `?limit=20` | Flashcard[] |

### **Voice Services**
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/voice/transcribe` | Transcribe audio | `multipart/form-data (audio file)` | `{ text, language, confidence }` |

---

## 📚 Open Source Libraries

### **Frontend Dependencies**
```json
{
  "@tanstack/react-query": "5.60.5",
  "@radix-ui/*": "Latest",
  "wouter": "3.3.5",
  "react-hook-form": "7.55.0",
  "zod": "3.24.2",
  "tailwindcss": "3.4.17",
  "framer-motion": "11.13.1",
  "lucide-react": "0.453.0",
  "recharts": "2.15.2",
  "react-markdown": "10.1.0",
  "rehype-katex": "7.0.1",
  "remark-math": "6.0.0"
}
```

### **Backend Dependencies**
```json
{
  "express": "4.21.2",
  "drizzle-orm": "0.39.1",
  "@neondatabase/serverless": "0.10.4",
  "bcrypt": "6.0.0",
  "passport": "0.7.0",
  "helmet": "8.1.0",
  "express-rate-limit": "8.1.0",
  "multer": "2.0.2"
}
```

### **AI & ML Libraries**
```json
{
  "openai": "6.0.1",
  "@google/generative-ai": "0.24.1",
  "@anthropic-ai/sdk": "0.65.0",
  "@langchain/openai": "0.6.14",
  "@langchain/google-genai": "0.2.18",
  "@xenova/transformers": "2.17.2",
  "tiktoken": "1.0.22"
}
```

### **Document Processing**
```json
{
  "pdf-parse": "2.1.1",
  "mammoth": "1.11.0",
  "tesseract.js": "6.0.1",
  "@mozilla/readability": "0.6.0",
  "jsdom": "27.0.0",
  "@danielxceron/youtube-transcript": "1.2.3"
}
```

### **Storage & Cloud**
```json
{
  "@aws-sdk/client-s3": "3.901.0",
  "@aws-sdk/s3-request-presigner": "3.901.0",
  "@aws-sdk/client-polly": "3.901.0",
  "ioredis": "5.8.0"
}
```

---

## 📄 Document Processing Pipeline

### **1. PDF Processing**
```typescript
import { pdf } from 'pdf-parse';

async extractFromPDF(buffer: Buffer) {
  const data = await pdf(buffer);
  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      info: data.info
    }
  };
}
```

### **2. DOCX Processing**
```typescript
import mammoth from 'mammoth';

async extractFromDOCX(buffer: Buffer) {
  const { value: text } = await mammoth.extractRawText({ buffer });
  return { text, metadata: {} };
}
```

### **3. Image OCR (Tesseract.js)**
```typescript
import { createWorker } from 'tesseract.js';

async extractFromImage(buffer: Buffer) {
  const worker = await createWorker('eng+hin'); // English + Hindi
  const { data: { text, confidence } } = await worker.recognize(buffer);
  await worker.terminate();
  
  return {
    text,
    metadata: {
      confidence,
      language: text.match(/[\u0900-\u097F]/) ? 'hi' : 'en'
    }
  };
}
```

### **4. YouTube Transcript**
```typescript
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';

async extractFromYouTube(url: string) {
  const videoId = extractVideoId(url);
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  
  const text = segments.map(s => s.text).join(' ');
  const transcriptSegments = segments.map(s => ({
    text: s.text,
    startTime: s.offset / 1000,
    duration: s.duration / 1000
  }));
  
  return {
    text,
    metadata: {
      videoId,
      transcriptSegments
    }
  };
}
```

### **5. Web Scraping**
```typescript
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

async extractFromWeb(url: string) {
  const response = await fetch(url);
  const html = await response.text();
  
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  
  return {
    text: article?.textContent || '',
    metadata: {
      title: article?.title,
      excerpt: article?.excerpt
    }
  };
}
```

### **6. Semantic Chunking**
```typescript
async semanticChunk(text: string, targetChunkSize: number = 350) {
  // 1. Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // 2. Generate sentence embeddings
  const embeddings = await embeddingService.generateBatch(sentences);
  
  // 3. Calculate similarity between consecutive sentences
  const similarities = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    similarities.push(cosineSimilarity(embeddings[i], embeddings[i + 1]));
  }
  
  // 4. Find split points (low similarity = semantic boundary)
  const threshold = percentile(similarities, 25);
  const chunks = [];
  let currentChunk = [];
  
  for (let i = 0; i < sentences.length; i++) {
    currentChunk.push(sentences[i]);
    
    if (similarities[i] < threshold || currentChunk.join(' ').split(/\s+/).length >= targetChunkSize) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
    }
  }
  
  return chunks;
}
```

---

## 🔐 Authentication & Security

### **Password Security**
```typescript
import bcrypt from 'bcrypt';

// Hashing (Signup)
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Verification (Login)
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### **Session Management**
```typescript
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
```

### **Authentication Middleware**
```typescript
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Usage
app.get('/api/documents', requireAuth, async (req, res) => {
  const docs = await storage.getUserDocuments(req.session.userId);
  res.json(docs);
});
```

### **Rate Limiting**
```typescript
import rateLimit from 'express-rate-limit';

// Global API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // 5 login attempts per 15 min
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### **Content Security Policy (Helmet.js)**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["'self'", "https://www.youtube.com"],
      connectSrc: ["'self'"]
    }
  }
}));
```

---

## 🎤 Voice Services

### **Sarvam AI (Primary)**
- **STT Model**: Saarika v2 (Indian accent optimized)
- **TTS Model**: Bulbul v2 (Natural Indian voices)
- **Languages**: Hindi (hi-IN), English (en-IN)
- **Features**: Hinglish code-mixing, prosody control

### **AssemblyAI (STT Fallback)**
```typescript
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

const transcript = await client.transcripts.transcribe({
  audio: audioBuffer,
  language_code: 'en'
});
```

### **AWS Polly (TTS Fallback)**
```typescript
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const polly = new PollyClient({ region: 'us-east-1' });

const command = new SynthesizeSpeechCommand({
  Text: text,
  OutputFormat: 'mp3',
  VoiceId: 'Aditi', // Indian English voice
  Engine: 'neural'
});

const response = await polly.send(command);
const audioStream = response.AudioStream;
```

---

## 🚀 Deployment & Environment

### **Environment Variables**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
PGHOST=host
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=db

# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
ANTHROPIC_API_KEY=...
SARVAM_API_KEY=...
ASSEMBLYAI_API_KEY=...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...

# Redis (Optional)
REDIS_DISABLED=true

# Session
SESSION_SECRET=random_secret
```

### **Build & Run**
```bash
# Development
npm run dev

# Production Build
npm run build
npm start

# Database Migration
npm run db:push
```

---

## 📊 Performance Optimizations

### **1. Semantic Caching (Redis)**
- Cache AI responses by embedding similarity
- 90% cache hit rate for repeated queries
- TTL: 24 hours

### **2. Vector Index (pgvector)**
- IVFFlat index for 10x faster similarity search
- Probes tuned for accuracy/speed tradeoff

### **3. Token Management**
- Dynamic context window based on model limits
- Token counting with tiktoken
- Smart truncation to fit budget

### **4. Streaming Responses**
- Server-Sent Events (SSE) for real-time AI output
- Reduced perceived latency
- Better UX for long responses

---

**End of Documentation** 🎯
