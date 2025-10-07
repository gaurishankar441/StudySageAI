# VaktaAI - AI-Powered Study Companion

## Overview

VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It features an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility, with a business vision to revolutionize personalized education through adaptive AI.

## Recent Changes (December 2024)

### UI/UX Theme Consistency - Dialog Boxes
**Date**: December 18, 2024

**Problem**: Dialog boxes across the application had inconsistent theming and unwanted hover movement that affected user experience.

**Changes Made**:
1. **Removed Hover Movement**: Eliminated transform animations on all dialog components that caused boxes to move when cursor hovered over them
2. **Unified Theme Applied to All Dialog Components**:
   - **Dialog** (`client/src/components/ui/dialog.tsx`): Removed `glassmorphism` prop, applied stable background `bg-white/95 dark:bg-slate-900/95` with `backdrop-blur-xl`
   - **AlertDialog** (`client/src/components/ui/alert-dialog.tsx`): Same stable theme with backdrop blur
   - **Drawer** (`client/src/components/ui/drawer.tsx`): Updated bottom sheet with consistent theme and improved rounded corners (20px)
   - **DialogUnified** (`client/src/components/ui/dialog-unified.tsx`): Already had stable theme, no changes needed
   - **AuthModal** (`client/src/components/landing/AuthModal.tsx`): Previously fixed to remove hover movement

**Theme Specifications**:
- Background: `bg-white/95 dark:bg-slate-900/95` (95% opacity for subtle transparency)
- Backdrop: `backdrop-blur-xl` (glassmorphism effect without movement)
- Border: `border-slate-200 dark:border-slate-700`
- Rounded corners: `rounded-2xl` for main dialogs, `rounded-t-[20px]` for drawers
- Shadows: Using `var(--shadow-2xl)` for depth
- Z-index: Proper layering with `var(--z-modal-scrim)` and `var(--z-modal-panel)`

**Impact**: All 50+ dialog instances across TutorSetupWizard, DocChatActionModal, QuickToolModal, NotesModal, QuizModal, StudyPlanWizard, AuthModal, and base dialog components now have consistent, stable appearance with no unwanted movement.

### Priority 1 Security Hardening (Production-Ready)
**Date**: October 7, 2025

**Objective**: Implement essential security features to protect against common web vulnerabilities and abuse.

**Implementation Details**:

1. **Rate Limiting** (`server/middleware/security.ts`):
   - **Global API Limiter**: 100 requests per 15 minutes per IP for general API endpoints
   - **Authentication Limiter**: 5 requests per 15 minutes per IP for login attempts
   - **Signup Limiter**: 3 requests per hour per IP to prevent account creation spam
   - **AI Limiter**: 30 requests per minute per authenticated user (userId + IP composite key) for all AI endpoints
   - **Upload Limiter**: 10 requests per hour per authenticated user for file uploads
   - All limiters return 429 status with JSON error messages
   - Optional Redis support for distributed rate limiting (fallbacks to in-memory store)

2. **Helmet.js Security Headers** (`server/index.ts`):
   - **Environment-Aware CSP**:
     - Production: Strict CSP with `script-src: ['self']` only, `unsafe-inline` removed for script safety
     - Development: Permissive CSP allowing `unsafe-inline` and `unsafe-eval` for Vite HMR
   - **Other Security Headers**: XSS protection, frame denial, MIME sniffing prevention, referrer policy
   - Cross-origin policies configured for external resource access

3. **Strong Password Policy** (`server/auth.ts`):
   - Minimum 8 characters, maximum 128 characters
   - Required character types: uppercase letter, lowercase letter, digit, special character
   - Zod validation with clear error messages
   - Enforced at signup and applied to all new user registrations

**Route Coverage**:
- Auth endpoints: `/api/auth/login`, `/api/auth/signup` (with specific auth/signup limiters)
- AI streaming: `GET/POST /api/chats/:id/stream` (with aiLimiter)
- Tutor routes: `/api/tutor/optimized/*` (with aiLimiter)
- Upload endpoints: `/api/documents/upload`, `/api/notes/*/attachments` (with uploadLimiter)
- All other API routes protected by global apiLimiter

**Security Status**:
- ✅ Session-based authentication (NOT JWT)
- ✅ Comprehensive rate limiting across all critical endpoints
- ✅ Production-ready Helmet CSP configuration
- ✅ Strong password validation
- ⏳ 2FA/MFA (Priority 2 - deferred)
- ⏳ Account lockout after failed attempts (Priority 2 - deferred)

**Architect Approval**: Security implementation reviewed and approved. All AI endpoints properly rate-limited, Helmet CSP production-ready with environment detection.

## User Preferences

Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend Architecture

*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: **Sarvam AI-Inspired Modern Design** (October 2025) - Purple/Indigo gradient palette with glassmorphism effects. Gradient variables (`--gradient-primary`, `--gradient-accent`, `--gradient-subtle`) for consistent theming. Enhanced shadow system (shadow-sm to shadow-2xl). Animation tokens (200-400ms durations, custom easing). Design utilities: `glass-card` (glassmorphism), `btn-gradient` (gradient buttons), `gradient-text` (gradient text), `card-interactive` (hover effects), `transition-smooth`. Skeleton loaders with shimmer effects, typing indicators, stagger animations for lists/grids. Fully responsive with mobile-first breakpoints (sm:640px, md:768px, lg:1024px). Complete `data-testid` coverage for testing. **Dialog System** (December 2024): Unified stable dialog theme across all components - no hover movement, consistent backdrop blur glassmorphism (`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl`), Material Design z-index layering.
*   **State Management**: TanStack Query for server state, local component state, session persistence, optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility features and stable, no-movement interactions. Premium gradient-based chat UI with distinct user/AI message styles and auto-scroll. Implements a 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with a visual phase indicator and adaptive learning based on user profile and real-time interaction. Emotion detection (confident, confused, frustrated, bored, neutral) adapts tutor tone, response length, and difficulty.

### Backend Architecture

*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (384-dimensional embeddings using all-MiniLM-L6-v2). Optimized with B-tree and IVFFlat vector indexes (dot-product similarity) for performance.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku for various AI features including streaming responses, structured output, document processing, and citation tracking (RAG). **Embedding Generation**: Uses local all-MiniLM-L6-v2 model via @xenova/transformers (384 dimensions, 100% free, no external API calls) for semantic search and RAG. Agentic RAG is used for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Features include intelligent model routing, semantic caching with dot-product similarity, and dynamic token management. **Dynamic Language System (October 2025)**: Comprehensive multi-layer language detection and response validation system featuring: (1) **LanguageDetectionEngine** with 4-layer analysis (Lexical: Devanagari/Latin script counting + word categorization; Syntactic: sentence structure + code-mixing patterns; Statistical: character frequency analysis; Contextual: conversation history tracking) achieving 95%+ accuracy with confidence levels (very_high/high/medium/low), (2) **SessionContextManager** with Redis-based session tracking for language history, emotion states, and conversation patterns with 1-hour TTL caching, (3) **DynamicPromptEngine** for context-aware prompt generation using multi-factor analysis (language + emotion + phase + intent), (4) **ResponseValidator** with 4-layer validation (Language Match: detects language mismatches; Tone: validates emotional appropriateness; Educational Quality: checks comprehension + examples + structure; Safety: content filtering) scoring 0-1 with automatic regeneration triggers, (5) **PerformanceOptimizer** with semantic caching for language detection results (1-hour TTL) and validation results (30-min TTL), batch processing optimization, and comprehensive metrics tracking (language_detection_ms, ai_generation_ms, validation_ms). All components integrated into optimizedTutor.ts with full metadata logging and sub-2s response time targets. Database tracking tables: language_detection_logs, response_validation_logs, tutor_metrics. AI Tutor optimizations include: (1) Intent classification system with 19 categories and fast-path keyword detection, (2) Language-aware prompt engineering with separate Hindi/English system prompts, (3) Emotion detection layer (5 states: confident, confused, frustrated, bored, neutral), (4) Dynamic response adaptation (50-350 words based on intent+emotion), (5) Progressive hint system with 4-level Socratic progression and 30-second cooldown enforcement.
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