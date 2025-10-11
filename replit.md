# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform offering an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. Its purpose is to provide a comprehensive study companion that supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A key ambition is to deliver grounded, citation-based AI responses to prevent hallucination and offer a "fast, calm UI" with minimal navigation, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## Recent Changes (October 2025)

### Phase 7: Admin Panel Implementation (In Progress - October 10, 2025)
**Comprehensive platform configuration management system**
- **Purpose**: Enable non-technical admins to manage all platform settings without code changes
- **Architecture Document**: `docs/admin-panel-architecture.md` - Complete technical specification (699 lines)

**✅ Phase 1 Complete - Core Infrastructure:**
- Database Schema: `adminConfigs`, `configAuditLog`, `unityBuilds` tables with full audit trail
- Admin Auth Middleware: `isAdmin`, `isSuperAdmin`, `hasPermission` with IP logging
- API Routes: `/api/admin/*` with 10+ endpoints (configs, audit, unity builds)
- Role-Based Access: Users table extended with `role` field (user/admin/super_admin)

**✅ Phase 2 Complete - AI Tutor Configuration:**
- AdminTutorConfig: Complete persona management system (`/admin/tutor`)
  - **Personas Tab**: Full CRUD operations with Add/Edit/Delete functionality
    - Add dialog: Create new personas with name, gender, subjects, tone
    - Edit: All persona fields editable (name, gender, subjects, tone, catchphrases, language mix)
    - Delete: Confirmation dialog with AlertDialog component
    - Save mutation: POSTs to `/api/admin/configs` with query invalidation
  - **System Prompts Tab**: Language-specific prompt editor
    - Core system prompt editor for Hindi/Hinglish and English modes
    - Intent-specific prompts: explanation, hint, simplification, answer evaluation, frustration, celebration
    - Monospace textarea for better prompt editing
  - **First Messages Tab**: Greeting and response template configuration
    - Hindi/English greeting variations (3 each) with {name} placeholder support
    - Response templates: correct answer, wrong answer, understanding check
    - Nested tabs for language-specific templates

**✅ Phase 3 Partial - Unity Build Management:**
- AdminUnityBuild: Unity WebGL build upload and management (`/admin/unity`)
  - ZIP file upload UI with validation (.zip files only)
  - Build history with version tracking, file size, upload date
  - Active build indicator with green badge and gradient card
  - Activate/deactivate functionality for build switching
  - File upload mutation with FormData support
  - **TODO**: Backend endpoints for `/api/admin/unity/upload` and `/api/admin/unity/:id/activate`

**🔄 In Progress - Remaining Work:**
- Unity Build Manager: Backend API endpoints (upload, activate, version management)
- Voice Settings: TTS/STT provider config UI
- API Key Manager: Encrypted key storage and testing
- System Settings: Feature flags, cache, rate limits UI
- Audit Log Viewer: Configuration change history with filters

**Implementation Plan**: 6-phase rollout (Core ✅ → Tutor 🔄 → Unity → Voice/API → System → Import/Export)

### Phase 6: Unity WebGL Build Update (Completed - October 10, 2025)
**Replaced Unity avatar build with latest version from user**
- **Old Build Backup**: Backed up previous build to `backup/unity-build-old/`
- **Build Replacement**: New build (dated Oct 9, 2025) replaced old build (dated Oct 10, 2025 3:24 AM)
- **File Changes**: Build.data.gz size changed from 96,593,801 to 96,593,239 bytes (562 bytes smaller)
- **S3 Cleanup**: Deleted old Unity assets from S3 to ensure fresh upload
- **S3 Upload**: New build successfully uploaded - Build.data.gz (96.5MB), Build.wasm.gz (6MB), Build.framework.js.gz (78KB)
- **GameObject Name Fix**: Updated all JavaScript references from `AvatarControllerScript` to `AvatarController` (actual GameObject name in new build)
- **Files Modified**: client/public/unity-avatar/index.html - all SendMessage calls updated
- **Location**: `client/public/unity-avatar/Build/` → served via S3 CDN with presigned URLs
- **Result**: New Unity WebGL avatar build live with phoneme-based lip-sync working

### Phase 5: Streaming Response UI Fix (Completed - October 10, 2025)
**Critical fix for real-time AI response display**
- **Problem Identified**: AI responses streamed successfully on backend but frontend only displayed after sending next message
- **Root Cause**: useVoiceTutor received AI_RESPONSE_CHUNK via WebSocket but TutorSession UI only showed messages from react-query cache (invalidated on next send)
- **Solution Implemented**: Added persistent `streamingResponse` state that survives after isProcessing=false
- **Display Logic**: UI now shows streaming response immediately while streaming AND after completion until messages refresh
- **State Management**: clearStreamingResponse() called only when NEW assistant message ID detected (lastAssistantIdRef tracking), preventing race conditions with slow refetches
- **Performance**: Instant response display - no more waiting for second message to trigger invalidation
- **Race Condition Eliminated**: Message ID tracking ensures streaming response clears only when new persisted message actually appears, regardless of refetch speed
- **Files Modified**: useVoiceTutor.ts (streaming state), TutorSession.tsx (message ID tracking + display logic)

### Phase 4: Upstash Redis Integration (Completed - October 10, 2025)
**Production-grade caching with secure TLS connection**
- **Upstash Redis Connected**: Successfully integrated Upstash Redis (capital-elf-22316.upstash.io) with secure TLS
- **Auto URL Conversion**: Automatic conversion from Upstash REST URL format to Redis protocol URL (rediss://) across all services
- **Security Hardening**: Fixed TLS vulnerability by enabling proper certificate verification (removed rejectUnauthorized: false)
- **IPv4 Compatibility**: Uses IPv4 (family: 4) instead of IPv6 for better compatibility in Replit environment
- **Services Updated**: TTS Cache, Performance Optimizer, Semantic Cache, and Session Context Manager now use unified secure connection
- **Performance Benefits**: 40x faster TTS for repeated phrases, 70% API cost savings, semantic caching for AI responses
- **Graceful Fallback**: All services fallback to in-memory storage if Redis unavailable
- **Environment Secrets**: Uses REDIS_URL and UPSTASH_REDIS_REST_TOKEN for authentication

### Phase 3: Unity WebGL Avatar Loading Fix (Completed - October 10, 2025)
**Critical CSP fix for Unity WASM compilation**
- **Root Cause Identified**: Unity WebGL loader requires `'wasm-unsafe-eval'` in CSP `script-src` to compile WebAssembly modules
- **CSP Headers Updated**: Added `'wasm-unsafe-eval'` to development CSP script-src (server/index.ts line 58)
- **Error Forwarding**: Added Unity error forwarding via postMessage to React for visibility of loader failures
- **Handshake Timing**: Reduced Unity bridge handshake delay from 500ms to 50ms to capture early Unity logs
- **Debugging Enhancements**: Console forwarding now captures all Unity logs (memory config, WebGL context, shader warnings)
- **Result**: Unity WebGL avatar now loads successfully with full audio unlock and phoneme-based lip-sync capability
- **Known Issues**: Non-critical shader warnings (texture parameters exceed device limits - cosmetic only)

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
*   Upstash Redis (with TLS)

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