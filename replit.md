# VaktaAI - AI-Powered Study Companion

## Overview

VaktaAI is an AI-powered educational platform designed to be a comprehensive study companion. Its core features include an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A key principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility.

## Recent Changes

### October 5, 2025 - Phase 4 & 6 Completion

**Phase 4: Voice Service (Production Ready)**
- ✅ Implemented AssemblyAI STT for speech-to-text transcription
- ✅ Integrated AWS Polly TTS with neural/standard engine fallback for region compatibility
- ✅ Added 3 API endpoints: `/api/voice/transcribe`, `/api/voice/synthesize`, `/api/voice/ask`
- ✅ Integrated actual AI service (optimizedAI) - no placeholder responses
- ✅ Added comprehensive AWS environment validation (S3, Polly, credentials)
- ✅ All routes properly authenticated with isAuthenticated middleware

**Phase 6: JEE/NEET Test Suite (Production Ready)**
- ✅ Expanded test suite from 18 to 54 problems (3x increase)
- ✅ Coverage: JEE Physics (9), Chemistry (9), Math (9), NEET Biology (11), Physics (7), Chemistry (8)
- ✅ Created smart answer validator with:
  - Numeric validation (5% relative + 0.01 absolute tolerance)
  - Strict MCQ validation (regex patterns to avoid false positives)
  - Zero-value handling (no divide-by-zero errors)
  - Confidence scoring based on match type
- ✅ Fixed benchmark stats to return numbers (accuracyPercent, avgResponseTimeMs, etc.) for analytics
- ✅ All ground-truth answers verified correct

**Required Environment Variables:**
- `GOOGLE_API_KEY`: For Gemini Flash 1.5 (intelligent model routing, 75% cost reduction)
- `OPENAI_API_KEY`: For GPT-4o-mini and embeddings
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`: For S3 storage and Polly TTS

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Primary color Indigo (#4F46E5), 8pt spacing grid, 12px border radius, animations under 200ms.
*   **State Management**: TanStack Query for server state, local component state, session persistence, optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility features. Premium gradient-based chat UI with distinct user/AI message styles and auto-scroll.

### Backend Architecture

*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver.
*   **Database Schema**: Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (1536-dimensional embeddings).
*   **AI Integration**: OpenAI API (GPT-5) for various AI features, OpenAI text-embedding-3-small for semantic search. Includes streaming responses, structured output, document processing, and citation tracking (RAG). Agentic RAG for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring.
*   **File Storage**: AWS S3 for object storage, using presigned URLs and metadata-based ACLs.
*   **Service Layer**: Modular services for document processing, AI operations, embedding generation, database abstraction, and object storage.

### Authentication and Authorization

*   **Authentication**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies.
*   **Authorization**: Session-based middleware, user ID for data isolation, row-level security, object storage ACLs.

### API Structure

*   **Route Organization**: Categorized endpoints for authentication, documents, chats, messages, AI tutor, quizzes, study plans, and notes.
*   **Data Flow**: Authenticated requests, session validation, user ID extraction, business logic, database operations, streamed responses.

### Document Processing Pipeline

*   **Multi-Format Support**: PDF, DOCX, YouTube, Web content, plain text, with future audio/video transcription.
*   **Processing Workflow**: Upload to object storage, metadata creation, background text extraction, chunking, embedding generation for RAG, status updates.

### Production Optimization

*   **Intelligent Model Routing**: Tiered model selection (Gemini Flash 1.5, GPT-4o-mini, Claude Haiku) based on query intent, complexity, and language detection.
*   **Semantic Caching**: Embedding-based semantic matching for caching frequent queries with a 95% similarity threshold and 1-hour TTL.
*   **Specialized Prompts**: Custom prompt templates for JEE/NEET subjects (Physics, Chemistry, Math, Biology) focusing on exam patterns and Socratic guidance.
*   **Dynamic Token Management**: `tiktoken`-based token counting for dynamic context budget calculation, smart truncation, and chunk prioritization to prevent context overflow.

## External Dependencies

### Third-Party APIs

*   **OpenAI API**: GPT-5 for LLM features and text-embedding-3-small for semantic search.
*   **Replit Authentication**: OIDC provider for user authentication.
*   **AWS S3**: Object storage.
*   **Google Gemini API**: For Gemini Flash 1.5.
*   **Anthropic API**: For Claude Haiku.

### Database Services

*   **Neon PostgreSQL**: Serverless PostgreSQL database.
*   **Drizzle Kit**: Schema migration and database management.
*   **Redis**: For semantic caching.

### Frontend Libraries

*   **@tanstack/react-query**: Server state management.
*   **wouter**: Client-side routing.
*   **@radix-ui/***: Accessible UI primitives.
*   **@uppy/***: File upload management.
*   **react-hook-form**: Form validation.
*   **lucide-react**: Icon library.

### Backend Libraries

*   **express**: HTTP server framework.
*   **passport**: Authentication middleware.
*   **openid-client**: OIDC authentication client.
*   **drizzle-orm**: Type-safe ORM.
*   **multer**: Multipart form data handling.
*   **connect-pg-simple**: PostgreSQL session store.
*   **memoizee**: Function result caching.
*   **@langchain/***: Integration with various LLM providers.
*   **ioredis**: Redis client.