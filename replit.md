# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform offering an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. Its purpose is to provide a comprehensive study companion that supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A key ambition is to deliver grounded, citation-based AI responses to prevent hallucination and offer a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## Recent Changes (October 2025)

### Phase 2: Unified WebSocket Protocol for AI Tutor (Completed)
**Migration from HTTP to WebSocket for all AI Tutor interactions**
- **Unified Protocol**: All AI Tutor communications (voice + text chat) now use WebSocket instead of mixed HTTP/WebSocket architecture
- **New Message Types**: Added TEXT_QUERY (client→server), AI_RESPONSE_CHUNK (server→client streaming), AI_RESPONSE_COMPLETE (server→client metadata)
- **Simplified Architecture**: Removed 200+ lines of complex HTTP streaming code (EventSource/Fetch) from TutorSession component
- **Better Performance**: True real-time streaming with 1-2 second latency to first response
- **Avatar State Integration**: TTS generation strictly controlled by avatar state - text-only responses when avatar closed, voice synthesis only when avatar ready
- **Type Safety**: Fully typed WebSocket messages with flat payload format for consistency
- **Backward Compatible**: Voice recording and existing features maintained
- **Session Management**: WebSocket connection tracks userId, chatId, sessionId, language, personaId for context-aware streaming

### Phase 1: Avatar State Machine & Smart TTS Queue (Completed)
**5-state FSM with avatar-aware TTS queueing**
- Avatar states: CLOSED → LOADING → READY → PLAYING → ERROR with proper transitions
- Smart TTS Queue validates avatar readiness before enqueuing audio
- Server-side Avatar State Service for centralized state management
- All TTS controls removed from UI - fully server-driven based on avatar state
- AVATAR_STATE messages properly routed through WebSocket handler

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design with a purple/indigo gradient palette, glassmorphism, enhanced shadows, and custom animation tokens. Fully responsive, mobile-first design.
*   **State Management**: TanStack Query for server state, local component state, session persistence, and optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system, premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual indicators and adaptive learning. Emotion detection for adaptive tutor tone and response. Voice tutor interactions with real-time waveform visualization, MediaRecorder, and AudioContext for TTS. Document chat includes upload-first layout, OCR, suggested questions, and citation preview.
*   **Unity 3D Avatar Integration**: Features a 4-state interactive avatar (Minimized bubble → Half panel → Fullscreen → Fullscreen+Chat) with global persistent Unity rendering. Unity loads once and stays alive across routes via CSS-only positioning and z-index management. Includes dynamic positioning for half panel, and TTS automatically routes through Unity avatar with browser fallback. Phoneme-Based Lip Sync uses AWS Polly Speech Marks for viseme timing, mapping to Unity blendshapes via a dedicated endpoint.

### Backend
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2. Agentic RAG for DocChat incorporates planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System. AI Tutor optimizes with intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and progressive hinting.
*   **Voice Services & Unified WebSocket Protocol**: **ALL AI Tutor interactions (voice + text chat) use WebSocket** for real-time streaming. Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) with AssemblyAI STT and AWS Polly TTS as fallbacks. Enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion prosody, Hinglish code-switching, and technical term capitalization. Streaming TTS uses real-time sentence-by-sentence generation with parallel synthesis. **WebSocket message types**: TEXT_QUERY (text chat), AUDIO_CHUNK (voice), AI_RESPONSE_CHUNK (streaming), AI_RESPONSE_COMPLETE (metadata), PHONEME_TTS_CHUNK (lip-sync), AVATAR_STATE (state management). Optimizations include phrase-level TTS caching (Redis/in-memory), gzip audio compression, and Cache-Control headers. Reliability features include circuit breaker pattern for TTS provider failover and avatar-aware TTS queueing (Smart TTS Queue with 5-state FSM).
*   **File Storage**: AWS S3 for object storage, using presigned URLs.
*   **Authentication and Authorization**: Custom email/password with bcrypt, server-side sessions in PostgreSQL, HTTP-only secure cookies, and session-based middleware.
*   **Security Hardening**: Global and specific API rate limiting, Helmet.js, and environment-aware Content Security Policy (CSP).

## External Dependencies

### Third-Party APIs
*   OpenAI API
*   AWS S3
*   Google Gemini API
*   Anthropic API
*   Sarvam AI (STT/TTS)
*   AssemblyAI (STT)
*   AWS Polly (TTS)

### Database Services
*   Neon PostgreSQL
*   Drizzle Kit
*   Redis

### Frontend Libraries
*   @tanstack/react-query
*   wouter
*   @radix-ui/*
*   @uppy/*
*   react-hook-form
*   lucide-react
*   Tesseract.js

### Backend Libraries
*   express
*   passport
*   openid-client
*   drizzle-orm
*   multer
*   connect-pg-simple
*   memoizee
*   @langchain/*
*   ioredis
*   @xenova/transformers