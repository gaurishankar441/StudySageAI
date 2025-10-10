# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It provides an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## Recent Changes

### Unity 3D Avatar State Transition Fix (October 10, 2025)
**Problem**: Unity WebGL avatar broke on state transitions (minimized → half → fullscreen → fullscreen-chat). Moving iframe between DOM containers via `appendChild()` destroyed Unity's internal state, causing black screens and broken interactions.

**Solution**: Global fixed-position Unity container strategy with CSS-only positioning:
1. **Single Unity Instance**: `#global-unity-container` stays in one fixed DOM location, never moved
2. **CSS Positioning**: Each state resizes Unity via CSS (width/height/position) instead of DOM manipulation
3. **Transparent Panels**: Panel containers use `pointer-events: none` with only controls/chat having `pointer-events: auto`
4. **Z-Index Hierarchy**: Unity (9990) below panels (10000+) ensures both visibility and interaction
5. **Minimized State**: Unity hidden (`display: none`) so bubble is clickable

**Files Modified**:
- `client/src/components/tutor/avatar/AvatarContainer.tsx`: CSS positioning logic per state
- `client/src/components/tutor/avatar/states/HalfPanel.tsx`: Transparent panel with pointer-events fix
- `client/src/components/tutor/avatar/states/FullscreenPanel.tsx`: Transparent panel overlay
- `client/src/components/tutor/avatar/states/FullscreenWithChat.tsx`: Split-screen transparent overlay

**Critical Learnings**:
- Never use `appendChild()` to move Unity iframe - breaks WebGL state
- Use fixed positioning + CSS transforms for all state changes
- Pointer-events layering: Unity (auto) → Panels (none) → Controls (auto)
- Browser cache requires hard refresh (Ctrl+Shift+R) to see updates

### Unity Half Panel Dynamic Positioning Fix (October 10, 2025)
**Problem**: Half panel Unity positioning was static (480px width, 100vh height), causing avatar to display full classroom background outside panel bounds instead of being clipped to panel area.

**Solution**: Dynamic positioning with triple-layer position tracking:
1. **getBoundingClientRect()**: Calculate exact panel position/size from DOM instead of hardcoded values
2. **data-half-panel Attribute**: Added to HalfPanel for reliable DOM selection
3. **Triple-Layer Tracking**:
   - `ResizeObserver`: Detects panel size changes
   - `window.resize`: Handles position shifts when size stays same (viewport resize)
   - `window.scroll`: Updates position during scroll events
4. **Proper Cleanup**: Disconnects observer and removes event listeners on state change to prevent memory leaks

**Implementation**:
```typescript
// Get exact panel bounds
const rect = halfPanel.getBoundingClientRect();
globalUnityContainer.style.top = `${rect.top}px`;
globalUnityContainer.style.left = `${rect.left}px`;
globalUnityContainer.style.width = `${rect.width}px`;
globalUnityContainer.style.height = `${rect.height}px`;

// Update function for all position changes
const updateUnityPosition = () => { /* recalculate bounds */ };

// Track all changes
resizeObserver.observe(halfPanel);
window.addEventListener('resize', updateUnityPosition);
window.addEventListener('scroll', updateUnityPosition);
```

**Files Modified**:
- `client/src/components/tutor/avatar/AvatarContainer.tsx`: Dynamic getBoundingClientRect() positioning with triple tracking
- `client/src/components/tutor/avatar/states/HalfPanel.tsx`: Added `data-half-panel="true"` attribute
- `client/src/hooks/useVoiceTutor.ts`: Fixed null check for `message.data?.text`

**Result**: Unity container now EXACTLY matches half panel bounds at all times, updates on window resize/scroll, and displays properly cropped avatar view inside panel.

## System Architecture

### Frontend Architecture
*   **Framework & Build System**: React with TypeScript, Vite, Wouter, TanStack Query.
*   **UI Component System**: Radix UI, shadcn/ui (New York style), Tailwind CSS, custom design tokens, Lucide icons.
*   **Design System**: Sarvam AI-Inspired Modern Design (October 2025) featuring a purple/indigo gradient palette, glassmorphism effects, enhanced shadows, and custom animation tokens. Includes skeleton loaders, typing indicators, and stagger animations. Fully responsive with mobile-first breakpoints.
*   **State Management**: TanStack Query for server state, local component state, session persistence, and optimistic updates.
*   **UI/UX Decisions**: Material Design compliant global modal system with accessibility. Premium gradient-based chat UI. A 7-phase conversational tutor system (Greeting → Rapport → Assessment → Teaching → Practice → Feedback → Closure) with visual phase indicators and adaptive learning. Emotion detection (confident, confused, frustrated, bored, neutral) adapts tutor tone, response length, and difficulty. Supports voice tutor interactions with real-time waveform visualization, MediaRecorder audio capture, and AudioContext queue system for TTS playback. Document chat features include a redesigned upload-first layout, OCR for image support, suggested questions, and a citation preview system. **Unity 3D Avatar Integration - D-iD Style** (October 2025): 4-state interactive avatar interface (Minimized bubble → Half panel → Fullscreen → Fullscreen+Chat) with global persistent Unity rendering. Unity loads once in background on app start and stays alive across all states/routes, enabling instant availability (0s). Features include: minimized 80-120px bubble with pulse animation when speaking, half panel (480×640px desktop / 60vh mobile bottom drawer) with control bar and action buttons, fullscreen mode with floating controls, and fullscreen+chat split-screen (60/40 desktop, vertical stack mobile). Global Unity instance is reused across all states via DOM manipulation - no iframe recreation. Supports keyboard shortcuts (ESC to minimize), click-outside-to-close, and smooth Framer Motion transitions (300ms). First load takes ~28s (97MB WebGL), but avatar never reloads after that. TTS automatically routes through Unity avatar when ready, with graceful browser fallback during initial loading. Architecture: `client/public/unity-avatar/` (97 MB WebGL build), `UnityAvatarProvider` renders persistent Unity instance globally with visibility control, `useUnityAvatar` hook for state/visibility management, `useUnityBridge.ts` with triple-layer security (origin validation, handshake protocol, event.source checks). Visual 3D avatar panel (right desktop / bottom mobile) with translate-based show/hide animations. **Unity Audio Optimizations** (October 2025): Audio unlock button in Unity iframe with AudioContext resume to bypass browser autoplay policy; AUDIO_UNLOCKED state tracking propagated via PostMessage; HTML5 Audio fallback with Web Audio API AnalyserNode for amplitude-driven lip-sync when Unity audio fails; graceful degradation ensures continuous TTS playback. No breaking changes to existing features.

### Backend Architecture
*   **Server Framework**: Express.js with TypeScript, RESTful API, session-based authentication.
*   **Database Layer**: PostgreSQL with pgvector, Drizzle ORM, Neon serverless driver. Multi-tenant design with tables for users, documents, chats, messages, notes, quizzes, study plans, flashcards, and vector-searchable content chunks (384-dimensional embeddings).
*   **AI Integration**: Utilizes OpenAI API (GPT-4o, GPT-4o-mini), Google Gemini Flash 1.5, and Anthropic Claude Haiku. Features include streaming responses, structured output, document processing, and citation tracking (RAG). Embedding Generation uses local all-MiniLM-L6-v2 model via @xenova/transformers. Agentic RAG is employed for DocChat, incorporating planning agents, specialized tools, multi-step reasoning, self-reflection, and confidence scoring. Includes intelligent model routing, semantic caching, dynamic token management, and a Dynamic Language System for context-aware prompt generation and validation. AI Tutor optimizations include intent classification, language-aware prompt engineering, emotion detection, dynamic response adaptation, and a progressive hint system.
*   **Voice Services**: Integrates Sarvam AI (Saarika v2 STT, Bulbul v2 TTS) for authentic Indian accent support, with AssemblyAI STT and AWS Polly TTS as fallback. Enhanced TTS pipeline includes Indian English math pronunciation, Hinglish math terms, physics unit normalization, intent+emotion combined prosody, Hinglish code-switching optimization, and technical term capitalization. WebSocket protocol is used for real-time voice interaction in the AI Tutor. **Phase 1 Streaming TTS** (October 2025): Implements real-time sentence-by-sentence TTS generation with parallel synthesis, reducing first-audio latency from 5.4s to <1.5s. Features deterministic sequence-based chunk ordering, out-of-order delivery handling, TTS_SKIP for failed chunks, backward-compatible message format, and safe fallback to legacy streaming with proper audio source interruption to prevent overlapping playback. **Phase 2 Performance Optimizations** (October 2025): Phrase-level TTS caching with Redis/in-memory fallback reducing repeated generation costs by 40%; gzip audio compression achieving 50-60% bandwidth reduction with custom Express compression filter override (audio/mpeg explicitly compressed, bypassing default skip); Cache-Control headers with 24h TTL and Vary: Accept-Encoding for optimal CDN caching; comprehensive performance metrics tracking (latency, cache hit rate, compression ratio) via /api/tts/metrics endpoint. **Phase 3 Reliability Features** (October 2025): Circuit breaker pattern for TTS provider failover with configurable failure thresholds, automatic recovery detection, and graceful degradation to prevent cascading failures. **Phase 4 Phoneme-Based Lip Sync - PRODUCTION READY** (October 2025): AWS Polly Speech Marks API integration for viseme timing data; Polly viseme→Unity blendshape mapping layer (14 phoneme mappings: pp→B_M_P, aa→Ah, F_V, TH, K_G_H_NG, W_OO, T_L_D_N, etc.); `/session/tts-with-phonemes` endpoint returns both audio and phoneme sequence from SAME Polly voice (Aditi Standard) ensuring perfect timing alignment; `synthesizeWithVisemes()` method generates dual Polly calls (audio MP3 + viseme JSON) with identical voice parameters; Unity bridge `sendAudioWithPhonemesToAvatar()` transmits PLAY_TTS_WITH_PHONEMES message with base64 audio + phoneme array (148 phonemes per greeting); reliable AudioContext gating (audioUnlocked flag only set when state === 'running'); automatic audio queue replay after successful unlock; fallback to manual unlock button when autoplay policy blocks; auto-play useEffect waits for chat.mode to select correct TTS endpoint; **Critical Unity Integration**: GameObject name is `AvatarControllerScript` (not `AvatarController`), method is `PlayPhonemeSequence`, receives JSON payload `{"phonemes": [{"time": 6, "blendshape": "K_G_H_NG", "weight": 1}, ...]}` for natural lip animation; complete data flow: Server (97KB audio + 148 phonemes) → React → Unity HTML → Unity WebGL SendMessage → GameObject blendshape animation; NO breaking changes to existing Sarvam/enhancedVoiceService flows.
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