# VaktaAI - AI-Powered Study Companion

## Overview

VaktaAI is a comprehensive educational platform offering AI Tutor, DocChat, Quiz Generation, Study Plan Management, and Smart Notes. It supports multilingual learning (English, Hindi) and multiple content formats (PDFs, videos, audio, web content). The platform emphasizes grounded, citation-based AI responses to prevent hallucination and is designed with a "fast, calm UI" featuring maximum 3-click navigation, real-time streaming, keyboard-first interactions, and accessibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

*   **Framework & Build System**: React with TypeScript, Vite for bundling and development, Wouter for client-side routing, TanStack Query for server state management.
*   **UI Component System**: Radix UI primitives, shadcn/ui (New York style), Tailwind CSS for styling, custom design tokens, CSS variables for theming, Inter font.
*   **Design System**: Primary color Indigo (#4F46E5), 12-16px padding, 8pt spacing grid, 12px border radius, Lucide icons, animations capped at 200ms ease-out.
*   **State Management**: TanStack Query for server state and caching, local component state for UI, session persistence for authentication, optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with opaque scrims, animations, accessibility (focus trap, scroll lock, ARIA). Premium gradient-based chat UI with distinct user/AI message styles and smart auto-scroll.

### Backend Architecture

*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication (connect-pg-simple), middleware for logging and error handling.
*   **Database Layer**: PostgreSQL with pgvector extension, Drizzle ORM for type-safe queries, Neon serverless driver, WebSocket-based connection.
*   **Database Schema**: Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (1536-dimensional embeddings).
*   **AI Integration**: 
    - **LLM**: OpenAI API (GPT-5) for tutoring, chat, quiz generation, summarization
    - **Embeddings**: OpenAI text-embedding-3-small (1536-dim) for semantic search - multilingual support
    - **Features**: Streaming responses, structured output, document processing, citation tracking (RAG)
*   **File Storage**: AWS S3 via `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, presigned URLs for uploads, metadata-based ACL policies, Multer for multipart handling, Uppy for direct-to-cloud uploads.
*   **Service Layer**: `documentService` for content extraction, `aiServiceManager` for AI operations, `embeddingService` for OpenAI embeddings, `storage` for DB abstraction, `objectStorageService` for cloud storage.

### Authentication and Authorization

*   **Authentication**: Custom email/password with bcrypt, server-side sessions (7-day TTL) in PostgreSQL, HTTP-only secure cookies.
*   **Authorization**: Session-based `isAuthenticated` middleware, user ID for data isolation, row-level security via foreign keys, object storage ACLs.

### API Structure

*   **Route Organization**: Categorized endpoints for authentication (`/api/auth/*`), documents (`/api/documents/*`), chats (`/api/chats/*`), messages (`/api/messages/*`), AI tutor (`/api/tutor/*`), quizzes (`/api/quizzes/*`), study plans (`/api/study-plans/*`), and notes (`/api/notes/*`).
*   **Data Flow**: Authenticated client requests, session validation, user ID extraction, business logic, database operations, streamed responses.

### Document Processing Pipeline

*   **Multi-Format Support**: PDF, DOCX, YouTube, Web content, plain text, and future audio/video transcription.
*   **Processing Workflow**: File upload to object storage, metadata creation, background text extraction, chunking, embedding generation for RAG, status update.

## External Dependencies

### Third-Party APIs

*   **OpenAI API**: GPT-5 for LLM features (tutoring, chat, quiz generation, summarization) and text-embedding-3-small for semantic search (1536 dimensions).
*   **Replit Authentication**: OIDC provider for user authentication.
*   **AWS S3**: Object storage for user-uploaded files and media.

### Database Services

*   **Neon PostgreSQL**: Serverless PostgreSQL database.
*   **Drizzle Kit**: Schema migration and database management.

### Frontend Libraries

*   **@tanstack/react-query**: Server state management.
*   **wouter**: Lightweight client-side routing.
*   **@radix-ui/***: Accessible UI primitives.
*   **@uppy/core, @uppy/aws-s3, @uppy/dashboard**: File upload management.
*   **react-hook-form + @hookform/resolvers**: Form validation.
*   **lucide-react**: Icon library.

### Backend Libraries

*   **express**: HTTP server framework.
*   **passport**: Authentication middleware.
*   **openid-client**: OIDC authentication client.
*   **drizzle-orm**: Type-safe ORM.
*   **multer**: Multipart form data handling.
*   **connect-pg-simple**: PostgreSQL session store.
*   **memoizee**: Function result caching.

## Recent Changes

### October 5, 2025 - Agentic RAG Implementation
**Upgraded from Simple RAG to Agentic RAG for DocChat:**
- Created `server/services/agenticRAG.ts` with intelligent multi-step reasoning
- **Planning Agent**: Analyzes queries and creates execution plans before retrieval
- **Tool System**: 4 specialized tools (search_documents, get_document_sections, verify_information, synthesize_answer)
- **Multi-step Reasoning**: Up to 5 reasoning steps with dynamic tool selection based on query complexity
- **Self-Reflection**: Agent evaluates information sufficiency after each step to decide if more retrieval needed
- **Confidence Scoring**: Calculates confidence (0-100) based on sources found and reasoning steps executed
- **Streaming Support**: Real-time progress updates via onChunk callback for transparent AI reasoning
- **Multilingual**: Full Hindi/English support with language-aware instructions
- Updated `aiService.ts`: Integrated Agentic RAG into sendDocChatMessage() replacing simple RAG
- **Benefits**: Better complex query handling, transparent reasoning process, source verification, optimized retrieval (only gets what's needed)

### October 5, 2025 - AWS S3 Migration
**Migrated object storage from Google Cloud Storage to AWS S3:**
- Completely rewrote `server/objectStorage.ts` to use AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **S3 Client**: Region-based configuration with IAM credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- **Presigned URLs**: Generate presigned PUT URLs for direct client uploads (15-minute TTL)
- **Metadata-based ACL**: Store ACL policies in S3 object metadata instead of separate ACL entries
- **Bucket Structure**: `private/uploads/` for user documents, configurable public paths
- **Streaming**: Direct S3 → Express response streaming for downloads
- **Compatibility**: Maintained existing API surface for seamless integration with documentService and routes
- **Environment Variables**: AWS_S3_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- **Reason**: Application will be deployed on AWS infrastructure in production

### October 5, 2025 - OpenAI Embeddings Migration
**Switched from local model to OpenAI API for embeddings:**
- **Previous**: Attempted to use BGE-M3 (BAAI/bge-m3) via Transformers.js - ONNX models not available
- **Current**: OpenAI text-embedding-3-small API (1536 dimensions, multilingual)
- Rewrote `server/embeddingService.ts` to use OpenAI Embeddings API instead of local Transformers.js
- **Database Migration**: Vector column migrated from 768→1536 dimensions
- **SQL Migration**: `ALTER TABLE chunks DROP COLUMN embedding; ALTER TABLE chunks ADD COLUMN embedding vector(1536);`
- **Benefits**: Reliable API-based embeddings, no local model loading issues, excellent multilingual support
- **Verified**: Document processing, semantic chunking, embedding generation, vector search (66% similarity on test)
- **Ready**: RAG pipeline fully functional for DocChat and Quick Actions