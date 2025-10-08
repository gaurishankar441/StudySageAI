# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It provides an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## Recent Changes (October 2025)
*   **DocChat Redesign - Upload-First Layout (Latest)**: Redesigned based on user feedback with upload panel as the largest section. Two-column layout: left upload panel (60% width, 3/5 grid) with file upload + unified URL input, right documents panel (40% width, 2/5 grid) with compact list format. Single-selection only - users can select one document at a time. Documents displayed as compact list items with icon, title, status badge, and delete button on hover. Purple border highlights selected document. Start Chat button at bottom shows selection count. Backend auto-detects YouTube vs Website URLs via /api/documents/by-url. Removed text paste option per user request.
*   **CSP Security Fix for Fonts**: Added Google Fonts sources to Content Security Policy in both production and development modes - https://fonts.googleapis.com in styleSrc and https://fonts.gstatic.com in fontSrc to resolve font loading issues.

## Recent Changes (October 2025 - Earlier)
*   **DocChat Shepherd AI-Inspired Redesign**: Implemented clean three-panel layout (Sources sidebar | Chat area | Quick Actions panel) with collapsible panels and fixed-position toggle buttons for reliable control.
*   **Mobile-First DocChat UX**: Fully responsive mobile design with conditional positioning (fixed overlay on mobile, inline flex on desktop), hamburger menu, 44px touch targets, safe area padding, and mobile-optimized bottom-aligned input.
*   **AI-Powered Suggested Questions**: Auto-generates 3 contextual follow-up questions after each AI response using GPT-4o-mini. Displays as horizontal scrolling chips with one-click populate. 500ms debounce prevents excessive API calls.
*   **Citation Preview System**: Clickable citation badges [1], [2] in AI responses open mobile-optimized dialog showing full document excerpt with source info. Parses metadata.sources array for accurate attribution. Fixed backend to include chunk text in sources array for complete citation display.
*   **Voice Input with Sarvam STT**: Mic button records audio via MediaRecorder, transcribes using Sarvam Saarika v2 STT (/api/voice/transcribe), auto-fills message input. Red pulsing animation during recording. Supports Hindi/English based on user preference. Verified Sarvam-first architecture with AssemblyAI fallback.
*   **Touch Gestures**: Swipe left to close actions panel, swipe right to close sources sidebar. 50px threshold prevents accidental triggers. Mobile-only with proper event cleanup.
*   **Floating Action Button (FAB)**: Mobile-exclusive FAB for Quick Actions in thumb-friendly bottom-right position. Gradient design with shadow-2xl elevation. Desktop uses sidebar toggle instead.
*   **Quick Actions with SSE Streaming**: Integrated Summary, Highlights, Quiz, and Flashcards generation with robust SSE streaming. Fixed critical bug where split JSON events across network chunks were dropped by implementing persistent buffer that accumulates chunks and splits by `\n\n` to extract complete SSE events.
*   **Analytics Tracking System**: POST /api/analytics/event endpoint logs feature usage (suggested questions clicks, user interactions). Frontend tracks engagement with eventType, eventData, and chatId for product analytics.
*   **YouTube Transcript with Timestamps**: Backend stores transcript segments with timestamps in metadata.transcriptSegments array. Each segment includes text, startTime (seconds), and duration for future video playback sync.
*   **Critical Bug Fix - OpenAI Model**: Fixed non-existent "gpt-5" model across all OpenAI provider methods (generateSuggestedQuestions, summarizeDocument, extractKeyPoints, generateQuizQuestions, createFlashcards) - changed to "gpt-4o-mini" to prevent API failures.
*   **System Verification Completed**: Comprehensive verification of all DocChat mobile features, API connectivity, authentication middleware, voice services, and citation system. No LSP errors, all endpoints secured, mobile UX fully responsive.
*   **Security Hardening**: Removed critical security vulnerability (`NODE_TLS_REJECT_UNAUTHORIZED = '0'`) from database configuration that was disabling TLS certificate verification globally.
*   **UI Bug Fixes**: Fixed nested anchor tag warnings in AppLayout by removing redundant `<a>` tags within Wouter's `<Link>` components.
*   **Optimistic UI**: Implemented instant user message display with error rollback using tempId-based filtering for better UX.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend Architecture
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design (October 2025) featuring a purple/indigo gradient palette, glassmorphism effects, enhanced shadows, and custom animation tokens. Includes design utilities like `glass-card`, `btn-gradient`, `gradient-text`, `card-interactive`, and `transition-smooth`. Features skeleton loaders, typing indicators, and stagger animations. Fully responsive with mobile-first breakpoints. The Dialog System (December 2024) provides a unified stable theme across all dialog components, ensuring no hover movement and consistent backdrop blur glassmorphism.
*   **State Management**: TanStack Query for server state, local component state, session persistence, and optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility. Premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual phase indicators and adaptive learning based on user profile and real-time interaction. Emotion detection (confident, confused, frustrated, bored, neutral) adapts tutor tone, response length, and difficulty.

### Backend Architecture
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (384-dimensional embeddings). Optimized with B-tree and IVFFlat vector indexes for performance.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2 model via @xenova/transformers for semantic search and RAG. Agentic RAG is employed for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, and dynamic token management. The Dynamic Language System (October 2025) features a LanguageDetectionEngine with 4-layer analysis, a SessionContextManager for language history and emotion states, a DynamicPromptEngine for context-aware prompt generation, and a ResponseValidator with 4-layer validation. AI Tutor optimizations include intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and a progressive hint system.
*   **Voice Services**: Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) for authentic Indian accent support, with AssemblyAI STT and AWS Polly TTS as fallbacks. Enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion combined prosody, Hinglish code-switching optimization, and technical term capitalization.
*   **File Storage**: AWS S3 for object storage, using presigned URLs and metadata-based ACLs.
*   **Service Layer**: Modular services for document processing, AI operations, embedding generation, database abstraction, and object storage.
*   **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware for authorization.
*   **API Structure**: Categorized RESTful endpoints for authentication, documents, chats, messages, AI tutor, quizzes, study plans, and notes.
*   **Security Hardening**: Global API rate limiting, authentication rate limiting, signup rate limiting, AI endpoint rate limiting, and upload rate limiting. Implements Helmet.js for security headers, including environment-aware Content Security Policy (CSP). Enforces a strong password policy (min 8 chars, max 128 chars, requiring uppercase, lowercase, digit, special character).

## External Dependencies

### Third-Party APIs
*   **OpenAI API**: LLM features.
*   **AWS S3**: Object storage.
*   **Google Gemini API**: Gemini Flash 1.5.
*   **Anthropic API**: Claude Haiku.
*   **Sarvam AI**: STT/TTS with Indian accent optimization.
*   **AssemblyAI**: STT (fallback).
*   **AWS Polly**: TTS (fallback).

### Database Services
*   **Neon PostgreSQL**: Serverless PostgreSQL database.
*   **Drizzle Kit**: Schema migration and database management.
*   **Redis**: Semantic caching.

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
*   **@langchain/***: LLM provider integration.
*   **ioredis**: Redis client.
*   **@xenova/transformers**: Local embedding generation (all-MiniLM-L6-v2).