# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed to be a comprehensive study companion. It offers an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes, supporting multilingual learning (English, Hindi) across various content formats (PDFs, videos, audio, web content). The platform aims to provide grounded, citation-based AI responses to prevent hallucination, alongside a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. VaktaAI's vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## System Architecture

### Frontend
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design featuring a purple/indigo gradient palette, glassmorphism, enhanced shadows, and custom animation tokens. It is fully responsive and mobile-first.
*   **UI/UX Decisions**: Material Design compliant global modal system, premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual indicators, adaptive learning, and emotion detection. Voice tutor interactions include real-time waveform visualization. Document chat features an upload-first layout, OCR, suggested questions, and citation preview.
*   **Unity 3D Avatar Integration**: Features a 4-state interactive avatar (Minimized bubble → Half panel → Fullscreen → Fullscreen+Chat) with global persistent Unity rendering. TTS automatically routes through the Unity avatar with browser fallback, and includes Phoneme-Based Lip Sync using AWS Polly Speech Marks.

### Backend
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design for various data types including vector-searchable content.
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2. Agentic RAG for DocChat incorporates planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System. AI Tutor optimizes with intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and progressive hinting.
*   **Voice Services & Unified WebSocket Protocol**: All AI Tutor interactions (voice + text chat) use a unified WebSocket protocol for real-time streaming. Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) with AssemblyAI STT and AWS Polly TTS as fallbacks. The enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion prosody, Hinglish code-switching, and technical term capitalization. Streaming TTS uses real-time sentence-by-sentence generation with parallel synthesis. Optimizations include phrase-level TTS caching (Redis/in-memory), gzip audio compression, and Cache-Control headers. Reliability features include a circuit breaker pattern for TTS provider failover and avatar-aware TTS queueing (Smart TTS Queue with 5-state FSM).
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
*   Upstash Redis

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

## Recent Changes

### Admin Panel Implementation (Phase 1-6 COMPLETE)
**Date: October 11, 2025**

**✅ Core Infrastructure (Phase 1)**
- Database tables: `admin_configs`, `config_audit_log`, `unity_builds`
- Role-based middleware: `isAdmin`, `isSuperAdmin`, `hasPermission`, `logAdminAction`
- Base API routes at `/api/admin/*`
- Security: Encrypted API keys, full audit trail with IP/user/timestamp

**✅ AI Tutor Configuration UI (Phase 2)** - `/admin/tutor`
- Personas Tab: Add/Edit/Delete personas with Dialog/AlertDialog
- System Prompts Tab: Language-aware prompt editor with intent overrides
- First Messages Tab: Greeting templates and response variations (Hindi/English)
- Form state management with local onChange handlers (architect-reviewed)

**✅ Unity Build Manager (Phase 3)** - `/admin/unity`
- ZIP upload UI with file validation and FormData POST
- Backend: ZIP extraction → S3 upload → metadata storage → cleanup
- Build history display with activation system
- Audit logging for all build changes

**✅ Voice Settings UI (Phase 4)** - `/admin/voice`
- TTS Configuration: Primary/fallback provider selection (Sarvam AI, AWS Polly)
- Sarvam AI: Speaker selection (Hindi/English), Pitch/Pace/Loudness sliders
- AWS Polly: Voice selection, Engine (neural/standard), Speaking rate
- STT Configuration: Primary/fallback provider (Sarvam AI, AssemblyAI)
- TTS phrase-level caching settings (TTL, max size)
- All settings persist to backend with proper cache invalidation

**✅ API Management UI (Phase 5)** - `/admin/api`
- Provider-specific API key management:
  - OpenAI (API key, org, chat/embedding models)
  - Google Gemini (API key, models)
  - Anthropic Claude (API key, models)
  - Sarvam AI (API key, TTS/STT service toggles)
  - AWS (Access/Secret keys, Region, S3/Polly toggles)
- Show/hide password functionality for all keys
- Enable/disable switches for each provider
- Encrypted storage with audit trail

**✅ System Dashboard & Audit Logs (Phase 6)**
- AdminDashboard: Real-time stats (active personas, Unity build version, total configs)
- Quick action cards for all admin sections
- AdminAuditLogs (`/admin/audit`): Complete audit log viewer
  - Search by action/user ID
  - Filter by action type
  - Detailed log display with previous/new value comparison
  - Stats: Total logs, filtered results, unique actions

**🐛 Critical Bugs Fixed:**
1. **Unity Build Data Mismatch**: Frontend/backend schema alignment
2. **AdminTutorConfig Data Extraction**: Backend returns full config row, must extract `.value` in useEffect

**Architecture Notes:**
- All admin config UIs use same flow: `useQuery` for fetch, `useMutation` for save, invalidate on success
- Backend endpoint `/api/admin/configs` handles all category/key/value saves
- Security pattern: API keys masked with optional reveal, encrypted storage, full audit trail

**Admin Panel Routes:**
- `/admin` - Main dashboard with navigation cards
- `/admin/tutor` - AI Tutor configuration
- `/admin/unity` - Unity build manager
- `/admin/voice` - Voice settings
- `/admin/api` - API key management
- `/admin/audit` - Audit log viewer

**Testing Requirements:**
- Test admin access at `/admin` with admin user (vaktaai12@example.com)
- All CRUD operations on personas, prompts, first messages
- Unity build upload and activation
- Voice settings save and load
- API key management with show/hide
- Audit log filtering and search
- See `docs/admin-panel-testing.md` for comprehensive checklist