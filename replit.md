# VaktaAI - AI-Powered Study Companion

## Overview

VaktaAI is a comprehensive educational platform that provides students with five core learning tools: AI Tutor, DocChat, Quiz Generation, Study Plan Management, and Smart Notes. The application supports multilingual learning (English and Hindi), handles multiple content formats (PDFs, videos, audio, web content), and emphasizes grounded, citation-based responses to prevent hallucination.

The platform is designed around a "fast, calm UI" principle with a maximum 3-click navigation philosophy, featuring real-time streaming responses, keyboard-first interactions, and accessibility considerations.

## Recent Changes

### October 4, 2025 - Voice Conversation Feature
- **AI Tutor Voice Input**: Complete voice conversation functionality using OpenAI Whisper for speech-to-text transcription. Students can now speak questions via microphone, see transcript appear immediately in chat, and receive AI tutor responses. Backend endpoint POST /api/tutor/transcribe processes audio files (webm format). Frontend implements MediaRecorder for audio capture with visual recording states (red pulsing mic button). Features optimistic UI updates showing transcripts immediately, visible "Transcribing..." indicator during processing, and automatic error rollback on failures. Complete flow: Record → Transcribe → Display → AI Response.

### October 3, 2025 - Latest Session
- **India-centric Student Profile System**: Complete profile management with Settings page supporting education board (CBSE/ICSE/State Board), exam target (JEE/NEET/Board Exams/Other), current class, and subject tagging. Database schema extended with India-specific fields. PATCH /api/auth/profile endpoint implemented with form validation and persistence. User preferences auto-populate in AI Tutor QuickToolModal and DocChat ActionModal for streamlined UX.

- **UI Polish & Branding**: Integrated VaktaAI logo across application (sidebar: 40px, landing page: 96px, tutor header: 80px, browser favicon). Consistent modal design with proper loading states, visual hierarchy, and India-centric field integration. Verified through end-to-end Playwright testing.

### October 3, 2025 - Earlier
- **AI Tutor Quick Tools**: Implemented modal-first right rail with 5 instant tools (Explain Concept, Hint, Example, Practice 5, Summary). Features India-centric prompts supporting CBSE/ICSE/State Board, JEE/NEET, with English/Hindi toggle. SSE streaming with proper buffering, form reset on modal open, and visual progress indicators.

- **YouTube Transcript Extraction**: Upgraded to `@danielxceron/youtube-transcript` library for improved reliability with 2025 YouTube formats. Supports all URL types (watch, shorts, live, embed) with dual fallback system.

- **Quiz Partial Submission**: Users can now submit quizzes without answering all questions. Results display shows separate counts for Correct, Wrong, and Unattempted questions, with all questions displaying correct answers and explanations regardless of attempt status.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server, configured for optimized bundling
- Client-side routing via Wouter (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management with aggressive caching strategies

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- shadcn/ui component library built on top of Radix (New York style variant)
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables for theming with light/dark mode support
- Inter font for UI elements, STIX Two Math for mathematical notation

**Design System Tokens**
- Primary color: Indigo (#4F46E5)
- Neutral base with generous padding (12-16px) and 8pt spacing grid
- 12px border radius (rounded-xl) for modern, friendly aesthetic
- Lucide icons throughout the interface
- Animations capped at 200ms with ease-out timing

**State Management Strategy**
- TanStack Query handles all server state with queryKey-based caching
- Local component state for UI interactions
- Authentication state managed through React Query with session persistence
- Optimistic updates for improved perceived performance

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server with TypeScript
- RESTful API design pattern for all client-server communication
- Session-based authentication with connect-pg-simple for PostgreSQL session storage
- Middleware-based request logging and error handling

**Database Layer**
- PostgreSQL as the primary relational database
- Drizzle ORM for type-safe database queries and schema management
- Neon serverless PostgreSQL driver for connection pooling
- WebSocket-based connection via Neon for improved performance

**Database Schema Design**
The schema supports multi-tenant user data with cascade deletions:
- `users`: Core user profiles with authentication data
- `documents`: Uploaded/processed content with metadata and status tracking
- `chats`: Conversational sessions for AI Tutor and DocChat modes
- `messages`: Individual chat messages with role-based storage
- `notes`: User-created notes with template support
- `quizzes`: Generated quiz metadata with subject/difficulty tracking
- `quizQuestions`: Individual quiz questions with answers and rationale
- `quizAttempts`: User quiz submissions with scoring
- `studyPlans`: Long-term learning schedules
- `studyTasks`: Individual tasks within study plans
- `flashcards`: Spaced repetition learning cards
- `chunks`: Vector-searchable document fragments (for RAG implementation)
- `sessions`: Server-side session storage for authentication

**AI Integration Architecture**
- OpenAI API integration for LLM-powered features
- Streaming response support for real-time tutor interactions
- Structured output generation for quizzes, flashcards, and study plans
- Document processing pipeline for text extraction and chunking
- Citation tracking for grounded responses (RAG pattern)

**File Storage Strategy**
- Google Cloud Storage integration via @google-cloud/storage
- Replit sidecar authentication for seamless cloud access
- Object ACL (Access Control List) system for fine-grained permissions
- Multer middleware for multipart/form-data file uploads (200MB limit)
- Uppy frontend integration for direct-to-cloud uploads with presigned URLs

**Service Layer Organization**
- `documentService`: Handles text extraction from PDFs, DOCX, YouTube, and web content
- `aiServiceManager`: Orchestrates AI operations (tutor sessions, quiz generation, notes summarization)
- `storage`: Database abstraction layer with typed CRUD operations
- `objectStorageService`: Cloud storage operations with ACL management

### Authentication and Authorization

**Authentication Mechanism**
- Custom email/password authentication with bcrypt hashing
- Server-side sessions stored in PostgreSQL with 7-day TTL
- HTTP-only, secure cookies for session management
- Password requirements: minimum 8 characters
- User registration and login with form validation

**Authorization Pattern**
- Session-based authentication with `isAuthenticated` middleware
- User ID stored in session for data isolation
- Row-level security through userId foreign key constraints
- Object storage ACL for document-level access control

### API Structure

**Route Organization**
- `/api/auth/*`: Authentication endpoints (login, logout, user profile)
- `/api/documents/*`: Document upload and management
- `/api/chats/*`: Chat session CRUD operations
- `/api/messages/*`: Message history retrieval
- `/api/tutor/*`: AI tutor session management (includes voice transcription)
- `/api/quizzes/*`: Quiz generation and attempts
- `/api/study-plans/*`: Study plan CRUD operations
- `/api/notes/*`: Note creation and management

**Data Flow Pattern**
1. Client makes authenticated API request
2. Express middleware validates session
3. Route handler extracts userId from session
4. Service layer performs business logic
5. Storage layer executes database operations
6. Response streamed back to client (where applicable)

### Document Processing Pipeline

**Multi-Format Support**
- PDF: Text extraction with page metadata
- DOCX: Structured content extraction
- YouTube: Transcript fetching via URL
- Web: Article extraction from URLs
- Audio/Video: Transcription support (architecture ready)
- Plain text: Direct ingestion

**Processing Workflow**
1. File uploaded to object storage via presigned URL
2. Document metadata created with 'processing' status
3. Background job extracts text content
4. Text chunked into searchable segments
5. Chunks stored with embeddings for RAG
6. Document status updated to 'ready'

## External Dependencies

### Third-Party APIs
- **OpenAI API**: GPT-based language model for tutoring, quiz generation, and content summarization
- **Replit Authentication**: OIDC provider for user authentication
- **Google Cloud Storage**: Object storage for uploaded files and media

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with WebSocket support
- **Drizzle Kit**: Schema migration and database management tool

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight client-side routing
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@uppy/core, @uppy/aws-s3, @uppy/dashboard**: File upload management
- **react-hook-form + @hookform/resolvers**: Form validation with Zod schemas
- **lucide-react**: Icon library

### Backend Libraries
- **express**: HTTP server framework
- **passport**: Authentication middleware
- **openid-client**: OIDC authentication client
- **drizzle-orm**: Type-safe database ORM
- **multer**: Multipart form data handling
- **connect-pg-simple**: PostgreSQL session store
- **memoizee**: Function result caching

### Development Tools
- **Vite**: Frontend build tool and dev server
- **TypeScript**: Type safety across the stack
- **ESBuild**: Backend bundling for production
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS transformation pipeline