# VaktaAI - AI-Powered Study Companion

## Overview

VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It features an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility, with a business vision to revolutionize personalized education through adaptive AI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Primary color Indigo (#4F46E5), 8pt spacing grid, 12px border radius, animations under 200ms.
*   **State Management**: TanStack Query for server state, local component state, session persistence, optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility features. Premium gradient-based chat UI with distinct user/AI message styles and auto-scroll. Implements a 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with a visual phase indicator and adaptive learning based on user profile and real-time interaction. Emotion detection (confident, confused, frustrated, bored, neutral) adapts tutor tone, response length, and difficulty.

### Backend Architecture

*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (384-dimensional embeddings using all-MiniLM-L6-v2). Optimized with B-tree and IVFFlat vector indexes (dot-product similarity) for performance.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku for various AI features including streaming responses, structured output, document processing, and citation tracking (RAG). **Embedding Generation**: Uses local all-MiniLM-L6-v2 model via @xenova/transformers (384 dimensions, 100% free, no external API calls) for semantic search and RAG. Agentic RAG is used for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Features include intelligent model routing, semantic caching with dot-product similarity, and dynamic token management. AI Tutor optimizations include: (1) Intent classification system with 19 categories and fast-path keyword detection, (2) Language-aware prompt engineering with separate Hindi/English system prompts, (3) Emotion detection layer (5 states: confident, confused, frustrated, bored, neutral), (4) Dynamic response adaptation (50-350 words based on intent+emotion), (5) Progressive hint system with 4-level Socratic progression and 30-second cooldown enforcement. All systems integrated into optimizedTutor.ts with production-ready error handling.
*   **Voice Services**: Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) for authentic Indian accent support (Hinglish code-mixing, natural prosody), with AssemblyAI STT and AWS Polly TTS as fallbacks. Enhanced TTS pipeline includes: (1) Indian English math pronunciation (× → "into", ÷ → "divided by"), (2) Hinglish math terms (barabar hai, guna), (3) Physics unit normalization (m/s, kg), (4) Intent+emotion combined prosody (19 intent types with pitch/pace/loudness adjustments), (5) Hinglish code-switching optimization via strategic comma placement around Devanagari script and transition words, (6) Technical term capitalization via emphasis markers. Default enhanced mode with backward compatibility for legacy systems.
*   **File Storage**: AWS S3 for object storage, using presigned URLs and metadata-based ACLs.
*   **Service Layer**: Modular services for document processing (PDF, DOCX, YouTube, Web content), AI operations, embedding generation, database abstraction, and object storage.
*   **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware for authorization.
*   **API Structure**: Categorized RESTful endpoints for authentication, documents, chats, messages, AI tutor, quizzes, study plans, and notes.

## External Dependencies

### Third-Party APIs

*   **OpenAI API**: For LLM features (GPT-4o, GPT-4o-mini).
*   **AWS S3**: Object storage.
*   **Google Gemini API**: For Gemini Flash 1.5.
*   **Anthropic API**: For Claude Haiku.
*   **Sarvam AI**: For STT/TTS with Indian accent optimization.
*   **AssemblyAI**: For STT (fallback).
*   **AWS Polly**: For TTS (fallback).

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
*   **@xenova/transformers**: Local embedding generation (all-MiniLM-L6-v2) for cost-free semantic search.