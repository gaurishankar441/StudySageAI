# VaktaAI - AI-Powered Study Companion

## Overview
VaktaAI is an AI-powered educational platform designed as a comprehensive study companion. It provides an AI Tutor, Document Chat, Quiz Generation, Study Plan Management, and Smart Notes. The platform supports multilingual learning (English, Hindi) and various content formats (PDFs, videos, audio, web content). A core principle is to provide grounded, citation-based AI responses to prevent hallucination. VaktaAI aims for a "fast, calm UI" with minimal navigation clicks, real-time streaming, keyboard-first interactions, and strong accessibility. The business vision is to revolutionize personalized education through adaptive AI.

## User Preferences
Preferred communication style: Simple, everyday language (Hindi/English/Hinglish mix for Indian students).

## Recent Changes

### WebSocket TTS Payload Format Fix (October 10, 2025)

**Critical Bug Discovered**: TTS chunks were being sent with NESTED payload structure, violating the TTSChunkMessage interface contract and causing client-side audio decoding errors.

**Root Cause**:
```typescript
// ❌ WRONG (Nested structure):
{
  type: 'TTS_CHUNK',
  data: {
    sequence: 1,
    data: 'base64audio...',  // Nested!
    text: 'sentence'
  }
}

// ✅ CORRECT (Flat structure):
{
  type: 'TTS_CHUNK',
  data: 'base64audio...',     // Direct base64!
  chunkIndex: 1,
  totalChunks: 5
}
```

**Complete Fix Applied**:

1. **Fixed generateAndStreamSentenceTTS** (server/services/voiceStreamService.ts:704-716):
   - Changed from nested `data.data` to flat `data: finalAudioData`
   - Replaced `sequence` with `chunkIndex` and `totalChunks`
   - Properly typed as `TTSChunkMessage`

2. **Fixed streamTTSChunksRealtime** (server/services/voiceStreamService.ts:289-299):
   - Same flat payload structure applied
   - Matches TTSChunkMessage interface exactly
   - Both streaming paths now consistent

3. **Standardized Error Messages**:
   - Replaced deprecated `TTS_SKIP` with proper `ERROR` type
   - Added `code`, `message`, and `recoverable` fields
   - Aligns with VoiceMessage interface

4. **Fixed TTS_END Messages**:
   - Changed from nested `data.totalChunks` to flat `totalChunks`
   - Properly typed as `TTSEndMessage`

**Result**:
- ✅ All TTS streaming paths emit correct flat payloads
- ✅ Client can decode audio without format mismatches
- ✅ Both real-time and buffered flows are consistent
- ✅ Error handling standardized across all paths

### TRUE Streaming Voice System - Performance Fix (October 10, 2025)

**Critical Performance Issue Resolved**: Voice responses were slow because the system waited for the COMPLETE AI response before generating TTS, creating a sequential bottleneck.

**Root Cause**: 
```typescript
// OLD (SLOW - Sequential):
1. Wait for COMPLETE AI response (5-10 seconds) ❌
2. Split response into sentences
3. Generate TTS for all sentences
4. Stream audio

// This meant users waited 5-10 seconds before hearing ANYTHING!
```

**Solution - TRUE Real-Time Streaming**:
```typescript
// NEW (FAST - Parallel):
1. AI starts streaming response ✅
2. Accumulate text until sentence boundary detected
3. IMMEDIATELY generate TTS for completed sentence
4. Stream audio chunk while AI continues generating next sentence
5. Repeat → First audio plays in ~1-2 seconds!
```

**Implementation**:
1. **Switched to Streaming AI**: `optimizedAI.generateStreamingResponse()` instead of `generateResponse()`
2. **Sentence-Level Chunking**: Accumulates streaming text chunks until sentence boundary (`/[।.!?]\s+|[।.!?]$/`)
3. **Immediate TTS Generation**: New helper `generateAndStreamSentenceTTS()` generates and sends TTS for each sentence AS SOON AS it's complete
4. **Parallel Processing**: While first sentence audio plays, AI generates next sentence and its TTS in parallel

**Result**:
- ✅ **~5x faster perceived latency** - First audio plays in 1-2 seconds instead of 5-10 seconds
- ✅ Natural conversational flow - sentences stream smoothly one after another
- ✅ Still uses TTS caching for common phrases
- ✅ Emotion, intent, and phoneme-based lip-sync preserved

### Unity Half Panel Positioning - Complete Fix (October 10, 2025)

**Critical Bug Discovered**: HalfPanel appeared on LEFT side of desktop screen instead of RIGHT side, breaking the entire avatar UX.

**Root Causes**:
1. **CSS Inheritance Bug**: Mobile `left-0` wasn't reset with `md:left-auto`, causing desktop panel to stick to LEFT
2. **Fallback Positioning Wrong**: Used `top: 0, height: 100vh` instead of matching actual Tailwind classes
3. **Border Radius**: Control bar had wrong rounding on desktop

**Complete Solution**:

1. **Fixed HalfPanel CSS** (client/src/components/tutor/avatar/states/HalfPanel.tsx):
```typescript
// OLD (WRONG) - Panel on LEFT:
className={`fixed z-[10000] pointer-events-none
  md:right-0 md:bottom-0 md:top-0 md:w-[480px]  // ❌ left-0 not reset!
  bottom-0 left-0 right-0 h-[60vh]`}

// NEW (CORRECT) - Panel on RIGHT:
className={`fixed z-[10000] pointer-events-none
  bottom-0 left-0 right-0 h-[60vh]
  md:left-auto md:right-0 md:bottom-0 md:top-0 md:w-[480px] md:h-auto`}  // ✅ Reset left!
```

2. **Fixed Fallback Positioning** (client/src/components/tutor/avatar/AvatarContainer.tsx):
```typescript
// Unity container fallback - EXACTLY matches HalfPanel
globalUnityContainer.style.bottom = '16px';   // ✅ bottom-4
globalUnityContainer.style.right = '16px';    // ✅ right-4
globalUnityContainer.style.width = '480px';   // ✅ w-[480px]
globalUnityContainer.style.height = '600px';  // ✅ h-[600px]
globalUnityContainer.style.top = 'auto';      // ✅ Reset
globalUnityContainer.style.left = 'auto';     // ✅ Reset
```

3. **Fixed Control Bar Border**: `rounded-t-2xl md:rounded-t-none md:rounded-tl-2xl` for correct desktop appearance

4. **Fixed Backdrop Blur Z-Index**: Unity container z-index changed from 9990 → 9999 to sit ABOVE backdrop (9998) so backdrop blur doesn't affect the avatar

5. **Fixed Unity Iframe Sizing**: Unity container now accounts for control bar height (48px). Unity height = panel height - 48px, and Unity top = panel top + 48px, ensuring Unity fits EXACTLY in the visible avatar area below the control bar

**Z-Index Layering**:
- Background page content: default
- Backdrop with blur: 9998
- Unity avatar container: 9999 (ABOVE blur, BELOW controls)
- Panel controls: 10000

**Result**: 
- ✅ Half-panel now correctly appears on RIGHT side of desktop
- ✅ Unity avatar positioned correctly within panel bounds
- ✅ Backdrop blur only affects background page, NOT the Unity avatar
- ✅ Smooth slide-in animation from right (desktop) or bottom (mobile)
- ✅ All 4 avatar states working: minimized → half-panel → fullscreen → fullscreen+chat

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