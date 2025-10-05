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
*   **Database Schema**: Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (768-dimensional embeddings).
*   **AI Integration**: 
    - **LLM**: OpenAI API (GPT-5) for tutoring, chat, quiz generation, summarization
    - **Embeddings**: Vyakyarth-1-Indic (768-dim) for semantic search - optimized for Hindi and Indic languages
    - **Features**: Streaming responses, structured output, document processing, citation tracking (RAG)
*   **File Storage**: Google Cloud Storage via `@google-cloud/storage`, Replit sidecar auth, object ACLs, Multer for multipart uploads, Uppy for direct-to-cloud uploads.
*   **Service Layer**: `documentService` for content extraction, `aiServiceManager` for AI operations, `embeddingService` for Vyakyarth-1-Indic embeddings, `storage` for DB abstraction, `objectStorageService` for cloud storage.

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

*   **OpenAI API**: GPT-5 for LLM features (tutoring, chat, quiz generation, summarization).
*   **Vyakyarth-1-Indic**: Krutrim AI Labs' embedding model for semantic search (768 dimensions, optimized for Hindi/Indic languages).
*   **Replit Authentication**: OIDC provider for user authentication.
*   **Google Cloud Storage**: Object storage for user-uploaded files and media.

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
*   **@xenova/transformers**: For running Vyakyarth-1-Indic embedding model locally.