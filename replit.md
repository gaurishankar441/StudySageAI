# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It provides an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend Architecture
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design (October 2025) featuring a purple/indigo gradient palette, glassmorphism effects, enhanced shadows, and custom animation tokens. Includes skeleton loaders, typing indicators, and stagger animations. Fully responsive with mobile-first breakpoints.
*   **State Management**: TanStack Query for server state, local component state, session persistence, and optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility. Premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual phase indicators and adaptive learning. Emotion detection (confident, confused, frustrated, bored, neutral) adapts tutor tone, response length, and difficulty. Supports voice tutor interactions with real-time waveform visualization, MediaRecorder audio capture, and AudioContext queue system for TTS playback. Document chat features include a redesigned upload-first layout, OCR for image support, suggested questions, and a citation preview system. **Unity 3D Avatar Integration** (October 2025): Always-on 3D avatar with real-time lip-sync for AI Tutor using Unity WebGL and uLipSync. Features **global persistent rendering** - Unity avatar loads once on app start and stays alive across all route changes, enabling instant availability (0s) on subsequent AI Tutor visits. First load takes ~28s (97MB WebGL), but avatar never reloads after that. TTS automatically routes through Unity avatar when ready, with graceful browser fallback during initial loading. Architecture: `client/public/unity-avatar/` (97 MB WebGL build), `UnityAvatarProvider` renders persistent Unity instance globally with visibility control, `useUnityAvatar` hook for state/visibility management, `useUnityBridge.ts` with triple-layer security (origin validation, handshake protocol, event.source checks). Visual 3D avatar panel (right desktop / bottom mobile) with translate-based show/hide animations. **Unity Audio Optimizations** (October 2025): Audio unlock button in Unity iframe with AudioContext resume to bypass browser autoplay policy; AUDIO_UNLOCKED state tracking propagated via PostMessage; HTML5 Audio fallback with Web Audio API AnalyserNode for amplitude-driven lip-sync when Unity audio fails; graceful degradation ensures continuous TTS playback. No breaking changes to existing features.

### Backend Architecture
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (384-dimensional embeddings).
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2 model via @xenova/transformers. Agentic RAG is employed for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System for context-aware prompt generation and validation. AI Tutor optimizations include intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and a progressive hint system.
*   **Voice Services**: Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) for authentic Indian accent support, with AssemblyAI STT and AWS Polly TTS as fallbacks. Enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion combined prosody, Hinglish code-switching optimization, and technical term capitalization. WebSocket protocol is used for real-time voice interaction in the AI Tutor. **Phase 1 Streaming TTS** (October 2025): Implements real-time sentence-by-sentence TTS generation with parallel synthesis, reducing first-audio latency from 5.4s to <1.5s. Features deterministic sequence-based chunk ordering, out-of-order delivery handling, TTS_SKIP for failed chunks, backward-compatible message format, and safe fallback to legacy streaming with proper audio source interruption to prevent overlapping playback. **Phase 2 Performance Optimizations** (October 2025): Phrase-level TTS caching with Redis/in-memory fallback reducing repeated generation costs by 40%; gzip audio compression achieving 50-60% bandwidth reduction with custom Express compression filter override (audio/mpeg explicitly compressed, bypassing default skip); Cache-Control headers with 24h TTL and Vary: Accept-Encoding for optimal CDN caching; comprehensive performance metrics tracking (latency, cache hit rate, compression ratio) via /api/tts/metrics endpoint. **Phase 3 Reliability Features** (October 2025): Circuit breaker pattern for TTS provider failover with configurable failure thresholds, automatic recovery detection, and graceful degradation to prevent cascading failures.
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