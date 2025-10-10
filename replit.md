# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It provides an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## Recent Changes

### Unity Half Panel Fallback Positioning Fix (October 10, 2025)
**Problem**: When `[data-half-panel]` element not found (timing issue), fallback positioning used `top: 0, right: 0, height: 100vh`, causing Unity to appear OUTSIDE half panel at top of screen instead of inside panel bounds.

**Root Cause**: Fallback didn't match HalfPanel's actual Tailwind classes (`bottom-4 right-4 w-[480px] h-[600px]`). Used wrong CSS properties.

**Solution**: Fixed fallback to EXACTLY match HalfPanel positioning:
```typescript
// OLD (WRONG) - Unity appeared at top:
globalUnityContainer.style.top = '0';         // ❌
globalUnityContainer.style.right = '0';       // ❌ Should be 16px  
globalUnityContainer.style.height = '100vh';  // ❌ Should be 600px

// NEW (CORRECT) - Unity inside panel:
globalUnityContainer.style.bottom = '16px';   // ✅ Matches bottom-4
globalUnityContainer.style.right = '16px';    // ✅ Matches right-4
globalUnityContainer.style.width = '480px';   // ✅ Matches w-[480px]
globalUnityContainer.style.height = '600px';  // ✅ Matches h-[600px]
globalUnityContainer.style.top = 'auto';      // ✅ Reset (CRITICAL!)
globalUnityContainer.style.left = 'auto';     // ✅ Reset (CRITICAL!)
```

**Additional Fix**: Increased delay from 100ms → 200ms to give React more time to render HalfPanel.

**Files Modified**:
- `client/src/components/tutor/avatar/AvatarContainer.tsx`: Fixed fallback positioning and increased delay to 200ms

**Result**: Even when DOM timing fails, Unity appears at bottom-right (16px, 16px) matching HalfPanel exactly. No more Unity outside panel bounds.

## System Architecture

### Frontend Architecture
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design featuring a purple/indigo gradient palette, glassmorphism effects, enhanced shadows, and custom animation tokens. Fully responsive with mobile-first breakpoints.
*   **State Management**: TanStack Query for server state, local component state, session persistence, and optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility. Premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual phase indicators and adaptive learning. Emotion detection adapts tutor tone, response length, and difficulty. Supports voice tutor interactions with real-time waveform visualization, MediaRecorder audio capture, and AudioContext queue system for TTS playback. Document chat features include a redesigned upload-first layout, OCR for image support, suggested questions, and a citation preview system.
*   **Unity 3D Avatar Integration**: Features a 4-state interactive avatar interface (Minimized bubble → Half panel → Fullscreen → Fullscreen+Chat) with global persistent Unity rendering. Unity loads once in background on app start and stays alive across all states/routes, enabling instant availability. Global Unity instance is reused across all states via CSS-only positioning and z-index management, avoiding DOM manipulation to prevent state loss. Includes dynamic positioning for the half panel, ensuring the avatar is correctly cropped within bounds, with a 100ms delay to ensure DOM readiness. TTS automatically routes through Unity avatar when ready, with graceful browser fallback during initial loading. Unity Audio Optimizations include an audio unlock button with AudioContext resume, `AUDIO_UNLOCKED` state tracking via PostMessage, HTML5 Audio fallback with Web Audio API AnalyserNode for amplitude-driven lip-sync when Unity audio fails.
*   **Phoneme-Based Lip Sync**: Integrates AWS Polly Speech Marks API for viseme timing data, mapping Polly visemes to Unity blendshapes. A dedicated endpoint `/session/tts-with-phonemes` returns both audio and phoneme sequence from the same Polly voice for perfect timing. The Unity bridge transmits a `PLAY_TTS_WITH_PHONEMES` message with base64 audio and phoneme array for natural lip animation.

### Backend Architecture
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2 model. Agentic RAG is employed for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System for context-aware prompt generation and validation. AI Tutor optimizations include intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and a progressive hint system.
*   **Voice Services**: Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) for authentic Indian accent support, with AssemblyAI STT and AWS Polly TTS as fallback. Enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion combined prosody, Hinglish code-switching optimization, and technical term capitalization. WebSocket protocol is used for real-time voice interaction. Streaming TTS implements real-time sentence-by-sentence generation with parallel synthesis, reducing first-audio latency. Optimizations include phrase-level TTS caching (Redis/in-memory), gzip audio compression, and Cache-Control headers. Reliability features include a circuit breaker pattern for TTS provider failover.
*   **File Storage**: AWS S3 for object storage, using presigned URLs and metadata-based ACLs.
*   **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware for authorization.
*   **Security Hardening**: Global and specific API rate limiting, Helmet.js for security headers, and environment-aware Content Security Policy (CSP).

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
*   **Tesseract.js**: OCR for image processing.

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