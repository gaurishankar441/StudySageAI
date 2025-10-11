import express from 'express';
import { optimizedAI } from '../services/optimizedAIService';
import { costTracker } from '../services/costTracker';
import { semanticCache } from '../services/semanticCache';
import { tutorSessionService } from '../services/tutorSessionService';
import { enhancedVoiceService } from '../services/enhancedVoiceService';
import { intentClassifier } from '../services/intentClassifier';
import { emotionDetector } from '../services/emotionDetector';
import { responseAdapter } from '../config/responseAdaptation';
import { hintService } from '../services/hintService';
import { storage } from '../storage';
import { LanguageDetectionEngine, type DetectedLanguage } from '../services/LanguageDetectionEngine';
import { SessionContextManager } from '../services/SessionContextManager';
import { DynamicPromptEngine } from '../services/DynamicPromptEngine';
import { ResponseValidator } from '../services/ResponseValidator';
import { performanceOptimizer, metricsTracker } from '../services/PerformanceOptimizer';
import type { IntentResult } from '../types/intents';

// Initialize new services
const languageDetector = new LanguageDetectionEngine();
const sessionContextManager = new SessionContextManager();
const dynamicPromptEngine = new DynamicPromptEngine();
const responseValidator = new ResponseValidator();

export const optimizedTutorRouter = express.Router();

/**
 * POST /api/tutor/optimized/ask
 * 🎯 Phase 6: AI Tutor with Dual Output (chat_md + speak_ssml)
 * Now generates both display text and speech SSML simultaneously
 */
optimizedTutorRouter.post('/ask', async (req, res) => {
  try {
    const { chatId, userQuery, persona, language, emotion } = req.body;
    
    if (!chatId || !userQuery) {
      return res.status(400).json({ error: 'chatId and userQuery required' });
    }
    
    // 1. Load chat context (last 10 messages)
    const contextMessages = await storage.getChatMessages(chatId, 10);
    
    // 2. Store user message first
    await storage.addMessage({
      chatId,
      role: 'user',
      content: userQuery,
      tool: null,
      metadata: null
    });
    
    // 3. Generate dual output (chat_md + speak_ssml)
    const { generateDualOutput } = await import('../services/aiDualOutput');
    
    const dualOutput = await generateDualOutput({
      userQuery,
      contextMessages: contextMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      persona: (persona || 'Priya') as 'Priya' | 'Amit',
      language: (language || 'en') as 'en' | 'hi' | 'hinglish',
      emotion: emotion || 'neutral'
    });
    
    // 4. Store assistant message with dual output metadata
    const assistantMsg = await storage.addMessage({
      chatId,
      role: 'assistant',
      content: dualOutput.chat_md,
      tool: null,
      metadata: {
        speakSSML: dualOutput.speak_ssml,
        speakMeta: dualOutput.speak_meta,
        source: dualOutput.metadata?.source || 'ai'
      }
    });
    
    console.log(`[TUTOR ASK DUAL] ✅ Generated dual output for chat ${chatId}`);
    
    // 5. Return chat markdown + speak availability
    res.json({
      response: dualOutput.chat_md,
      messageId: assistantMsg.id,
      speak_available: true,
      meta: {
        source: dualOutput.metadata?.source || 'ai',
        persona,
        language
      }
    });
  } catch (error) {
    console.error('[TUTOR ASK DUAL] Error:', error);
    res.status(500).json({ error: 'Failed to generate dual output response' });
  }
});

/**
 * POST /api/tutor/optimized/ask-stream
 * Ask a question with streaming response
 */
optimizedTutorRouter.post('/ask-stream', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    let terminalEventSent = false; // Track if terminal event (complete/error) was sent
    
    try {
      const result = await optimizedAI.generateStreamingResponse(query, context, (chunk, meta) => {
        // Service now sends typed events: chunk, complete, error
        if (meta?.type === 'complete') {
          // Completion event from service
          terminalEventSent = true;
          res.write(`data: ${JSON.stringify({ 
            type: 'complete',
            cached: meta.cached,
            model: meta.model,
            cost: meta.cost
          })}\n\n`);
        } else if (meta?.type === 'error') {
          // Error event from service with partial cost
          terminalEventSent = true;
          res.write(`data: ${JSON.stringify({ 
            type: 'error',
            error: meta.error || 'Stream failed',
            partialResponse: meta.partialResponse,
            cost: meta.cost || 0,
            model: meta.model
          })}\n\n`);
        } else {
          // Regular chunk
          res.write(`data: ${JSON.stringify({ 
            chunk,
            cached: meta?.cached,
            model: meta?.model 
          })}\n\n`);
        }
      });
      
      // Close stream (completion/error already sent via onChunk)
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      // Only send fallback error if service didn't already emit terminal event
      // (This handles setup errors before streaming starts)
      console.error('[OPTIMIZED TUTOR STREAM] Stream error:', streamError);
      
      if (!terminalEventSent && !res.writableEnded) {
        // Service failed before sending any terminal event
        res.write(`data: ${JSON.stringify({ 
          type: 'error',
          error: 'Stream initialization failed',
          message: streamError instanceof Error ? streamError.message : 'Unknown error'
        })}\n\n`);
        
        res.write('data: [DONE]\n\n');
        res.end();
      } else if (terminalEventSent && !res.writableEnded) {
        // Service already sent error event, just close stream
        res.write('data: [DONE]\n\n');
        res.end();
      }
      // If res.writableEnded, stream already closed, nothing to do
    }
  } catch (error) {
    console.error('[OPTIMIZED TUTOR STREAM] Setup error:', error);
    res.status(500).json({ error: 'Failed to initialize stream' });
  }
});

/**
 * POST /api/tutor/optimized/quiz
 * Generate JEE/NEET optimized quiz
 */
optimizedTutorRouter.post('/quiz', async (req, res) => {
  try {
    const { subject, topic, count = 5, difficulty = 'medium' } = req.body;
    
    if (!subject || !topic) {
      return res.status(400).json({ error: 'Subject and topic are required' });
    }
    
    const quiz = await optimizedAI.generateQuiz(subject, topic, count, difficulty);
    
    res.json({
      quiz,
      meta: {
        subject,
        topic,
        count,
        difficulty,
        optimized: true,
      }
    });
  } catch (error) {
    console.error('[OPTIMIZED QUIZ] Error:', error);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

/**
 * GET /api/tutor/optimized/stats
 * Get cost tracking statistics
 */
optimizedTutorRouter.get('/stats', async (req, res) => {
  try {
    const breakdown = costTracker.getCostBreakdown();
    const savings = costTracker.getSavingsVsGPT4();
    const cacheStats = await semanticCache.getStats();
    
    res.json({
      cost: {
        daily: costTracker.getDailyCost(),
        breakdown,
        savings,
        projected: {
          monthly: costTracker.getProjectedMonthlyCost(200000 / 30), // 10K students, 20 queries/month
          perStudent: costTracker.getProjectedMonthlyCost(200000 / 30) / 10000,
        }
      },
      cache: cacheStats,
    });
  } catch (error) {
    console.error('[OPTIMIZED STATS] Error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/tutor/optimized/cache/clear
 * Clear semantic cache
 */
optimizedTutorRouter.post('/cache/clear', async (req, res) => {
  try {
    await semanticCache.clear();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    console.error('[CACHE CLEAR] Error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * POST /api/tutor/optimized/session/start
 * Start a new 7-phase tutor session with profile integration
 */
optimizedTutorRouter.post('/session/start', async (req, res) => {
  try {
    const { chatId: providedChatId, subject, topic, level, language, personaId } = req.body;
    const userId = (req as any).user?.id;
    
    if (!subject || !topic || !userId) {
      return res.status(400).json({ error: 'subject, topic, and authentication required' });
    }
    
    // Get user profile
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create chat if chatId not provided
    let chatId = providedChatId;
    if (!chatId) {
      const chat = await storage.createChat({
        userId,
        mode: 'tutor',
        subject: subject || 'general',
        level: level || 'intermediate',
        language: language || 'en',
        topic,
        title: `${subject}: ${topic}`,
      });
      chatId = chat.id;
    }
    
    // Initialize session with profile data and persona
    const session = await tutorSessionService.initializeSession(
      chatId, 
      userId, 
      subject, 
      topic, 
      user,
      personaId // Pass persona selection
    );
    
    // Get greeting template with persona
    const template = tutorSessionService.getCurrentPhaseTemplate(session);
    const greeting = tutorSessionService.fillSessionTemplate(template, session);
    
    // Save greeting message to chat
    if (greeting && greeting.trim()) {
      await storage.addMessage({
        chatId,
        role: 'assistant',
        content: greeting.trim(),
        tool: null,
        metadata: {
          personaId: session.personaId,
          emotion: template.emotion,
          phase: 'greeting',
          isGreeting: true
        }
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        chatId: session.chatId,
        currentPhase: session.currentPhase,
        progress: session.progress,
        personaId: session.personaId,
        level: session.level,
        subject: session.subject,
        topic: session.topic
      },
      message: greeting,
      emotion: template.emotion,
      requiresResponse: template.requiresResponse
    });
  } catch (error) {
    console.error('[SESSION START] Error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * POST /api/tutor/optimized/session/ask
 * Ask a question in an active tutor session with phase-aware responses
 */
optimizedTutorRouter.post('/session/ask', async (req, res) => {
  try {
    const { chatId, query } = req.body;
    const userId = (req as any).user?.id;
    
    if (!chatId || !query || !userId) {
      return res.status(400).json({ error: 'chatId, query, and authentication required' });
    }
    
    // Get session
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get persona
    const persona = tutorSessionService.getPersona(session);
    
    // Get user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Get last AI message for context
    const allMessages = await storage.getChatMessages(chatId, 10);
    const lastAIMessage = [...allMessages].reverse().find(m => m.role === 'assistant')?.content;
    
    // 🆕 INTENT CLASSIFICATION
    const intentResult = await intentClassifier.classify(query, {
      currentPhase: session.currentPhase,
      currentTopic: session.topic,
      lastAIMessage,
      isInPracticeMode: session.currentPhase === 'practice'
    });
    
    console.log(`[INTENT] Detected: ${intentResult.intent} (confidence: ${intentResult.confidence})`);
    if (intentResult.entities && Object.keys(intentResult.entities).length > 0) {
      console.log(`[INTENT] Entities:`, intentResult.entities);
    }
    
    // 🆕 EMOTION DETECTION
    const localePrefix = user.locale?.split('-')[0]?.toLowerCase() ?? 'en';
    const userLanguage: 'hi' | 'en' = (localePrefix === 'hi') ? 'hi' : 'en';
    
    const recentMessages = allMessages.slice(-4).map(m => ({
      role: m.role,
      content: m.content
    }));
    
    const emotionResult = await emotionDetector.detectEmotion(
      query,
      recentMessages,
      userLanguage
    );
    
    console.log(`[EMOTION] Detected: ${emotionResult.emotion} (confidence: ${emotionResult.confidence.toFixed(2)}) via ${emotionResult.detectionMethod}`);
    if (emotionResult.reasoning) {
      console.log(`[EMOTION] Reasoning: ${emotionResult.reasoning}`);
    }
    
    // 🔥 MULTI-LAYER LANGUAGE DETECTION
    const startLangDetection = Date.now();
    
    // Check cache first
    const cachedLangResult = await performanceOptimizer.getCachedLanguageDetection(query);
    let langDetection = cachedLangResult;
    
    if (!cachedLangResult) {
      // Perform detection with conversation history
      const langHistory = allMessages.slice(-5).map(m => m.content);
      
      langDetection = await languageDetector.detectLanguage(query, {
        conversationHistory: langHistory.map((text, idx) => ({
          language: 'unknown' as any
        })),
        topic: session.topic
      });
      
      // Cache result
      await performanceOptimizer.cacheLanguageDetection(query, langDetection);
    }
    
    const langDetectionTime = Date.now() - startLangDetection;
    metricsTracker.record('language_detection_ms', langDetectionTime);
    
    if (langDetection) {
      console.log(`[LANGUAGE] Detected: ${langDetection.language} (${langDetection.confidenceLevel}) - ${langDetectionTime}ms ${cachedLangResult ? '(cached)' : ''}`);
      console.log(`[LANGUAGE] Analysis - Devanagari: ${langDetection.analysis.lexical.devanagariCount}, Hindi Words: ${langDetection.analysis.lexical.hindiWords.length}`);
      console.log(`[LANGUAGE] Confidence: ${(langDetection.confidence * 100).toFixed(1)}% - Method: ${langDetection.detectionMethod}`);
    }
    
    const detectedLang = langDetection?.language || 'english';
    
    // 🔥 GET/UPDATE SESSION CONTEXT
    let sessionCtx = await sessionContextManager.getContext(userId, chatId);
    
    // Update session context with language detection
    if (langDetection) {
      await sessionContextManager.addLanguageDetection(
        userId,
        chatId,
        langDetection.language,
        langDetection.confidence
      );
    }
    
    // Update session context with emotion
    await sessionContextManager.addEmotionDetection(
      userId,
      chatId,
      emotionResult.emotion,
      emotionResult.confidence
    );
    
    // Update session metrics
    await sessionContextManager.updateContext(userId, chatId, {
      messageCount: (sessionCtx?.messageCount || 0) + 1,
      lastMessageTime: Date.now(),
      currentTopic: session.topic,
      currentSubject: session.subject,
      currentPhase: session.currentPhase
    });
    
    // Get updated context
    sessionCtx = await sessionContextManager.getContext(userId, chatId);
    
    // 💾 LOG LANGUAGE DETECTION TO DATABASE
    if (langDetection) {
      // Calculate scores from analysis
      const lexicalScore = langDetection.analysis.lexical.devanagariRatio;
      const syntacticScore = langDetection.analysis.syntactic.wordOrder === 'SOV' ? 0.8 : 
                              langDetection.analysis.syntactic.wordOrder === 'SVO' ? 0.2 : 0.5;
      const statisticalScore = langDetection.analysis.statistical.languageScore.hindi;
      const contextualScore = langDetection.analysis.contextual?.consistencyScore || 0;
      
      await storage.logLanguageDetection({
        userId,
        chatId,
        inputText: query,
        detectedLanguage: langDetection.language,
        confidence: langDetection.confidence,
        confidenceLevel: langDetection.confidenceLevel,
        lexicalScore,
        syntacticScore,
        statisticalScore,
        contextualScore,
        processingTime: langDetectionTime,
        detectionMethod: langDetection.detectionMethod,
        metadata: {
          devanagariCount: langDetection.analysis.lexical.devanagariCount,
          hindiWords: langDetection.analysis.lexical.hindiWords.length,
          englishWords: langDetection.analysis.lexical.englishWords.length
        }
      });
    }
    
    // Store user message with intent + emotion + language metadata
    await storage.addMessage({
      chatId,
      role: 'user',
      content: query,
      metadata: {
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        entities: intentResult.entities,
        emotion: emotionResult.emotion,
        emotionConfidence: emotionResult.confidence,
        detectedLanguage: detectedLang,
        languageConfidence: langDetection?.confidence,
        languageDetectionTime: langDetectionTime
      }
    });
    
    // 🔥 GENERATE DYNAMIC CONTEXT-AWARE PROMPT
    const promptContext = {
      // Language context
      detectedLanguage: detectedLang,
      languageConfidence: langDetection?.confidence || 0.5,
      preferredLanguage: sessionCtx?.preferredLanguage,
      
      // Emotional context
      currentEmotion: emotionResult.emotion,
      emotionConfidence: emotionResult.confidence,
      emotionalStability: sessionCtx?.emotionalHistory?.length ? 
        sessionCtx.emotionalHistory.slice(-3).filter(e => e.emotion === emotionResult.emotion).length / 3 : 0.5,
      
      // Learning context
      subject: session.subject || 'General',
      topic: session.topic || 'General',
      level: session.level || 'intermediate',
      currentPhase: session.currentPhase || 'teaching',
      
      // Intent context
      intent: intentResult.intent,
      
      // Session context
      messageCount: sessionCtx?.messageCount || 0,
      misconceptions: session.adaptiveMetrics?.misconceptions || [],
      strongConcepts: session.adaptiveMetrics?.strongConcepts || [],
      avgResponseTime: sessionCtx?.avgResponseTime
    };
    
    const generatedPrompt = dynamicPromptEngine.generateSystemPrompt(promptContext);
    
    console.log(`[DYNAMIC PROMPT] Generated with adaptations: ${generatedPrompt.adaptations.join(', ')}`);
    console.log(`[DYNAMIC PROMPT] Guidelines: ${generatedPrompt.responseGuidelines.length} rules applied`);
    
    // Add persona-specific context
    const personaContext = `
PERSONA:
You are ${persona.name}, a ${persona.personality.toneOfVoice} ${session.subject} teacher.
Student Name: ${session.profileSnapshot?.firstName || 'Student'}
Exam Target: ${session.profileSnapshot?.examTarget || 'General'}
Current Class: ${session.profileSnapshot?.currentClass || 'Class 12'}
Progress: ${session.progress}%

Personality Traits: ${persona.personality.traits.join(', ')}
Voice Style: ${persona.languageStyle.hindiPercentage}% Hindi, ${persona.languageStyle.englishPercentage}% English
Catchphrases: ${persona.personality.catchphrases.slice(0, 2).join(', ')}
    `.trim();
    
    let sessionContext = `${generatedPrompt.systemPrompt}\n\n${personaContext}\n\n${generatedPrompt.responseGuidelines.join('\n')}`;
    
    // Add entity-specific instructions
    if (intentResult.intent === 'submit_answer' && intentResult.entities?.answer) {
      sessionContext += `\n\nIMPORTANT: Student submitted answer: ${intentResult.entities.answer}${intentResult.entities.unit ? ' ' + intentResult.entities.unit : ''}. Evaluate if correct and provide feedback.`;
    }
    
    // 🆕 PROGRESSIVE HINT SYSTEM
    let hintMetadata: Record<string, any> = {};
    let hintDisclaimer = '';
    let updatedHintState: any = null;
    
    if (intentResult.intent === 'request_hint') {
      const existingHintState = hintService.getHintState(allMessages);
      
      const problemContext = session.topic || 'Current problem';
      const hintState = existingHintState || hintService.initializeHintState(problemContext);
      
      console.log(`[HINT] Current state: Level ${hintState.currentLevel}, Used ${hintState.totalHintsUsed}/4`);
      
      const advancement = hintService.advanceHintLevel(hintState);
      
      if (!advancement.canAdvance) {
        console.log(`[HINT] Cannot advance: ${advancement.message}`);
        
        updatedHintState = { 
          ...hintState, 
          lastHintTimestamp: new Date().toISOString() 
        };
        
        if (advancement.message?.includes('Take a moment')) {
          const timeSinceLastHint = Date.now() - new Date(hintState.lastHintTimestamp).getTime();
          const timeRemaining = Math.max(0, 30000 - timeSinceLastHint);
          const cooldownMsg = hintService.generateCooldownMessage(timeRemaining, userLanguage);
          sessionContext += `\n\nIMPORTANT: Student asked for hint too soon. Respond with: "${cooldownMsg}"`;
        } else {
          sessionContext += `\n\nIMPORTANT: Maximum hints reached. Encourage student to try solving with given information.`;
        }
        
        hintMetadata = { 
          hintDenied: true, 
          reason: advancement.message,
          currentLevel: hintState.currentLevel,
          totalHintsUsed: hintState.totalHintsUsed
        };
      } else {
        const hintPrompt = hintService.buildHintPrompt(
          advancement.nextLevel,
          userLanguage,
          problemContext,
          query,
          hintState.previousHints
        );
        
        sessionContext = hintPrompt;
        
        updatedHintState = advancement.newState;
        hintMetadata = hintService.generateHintMetadata(advancement.nextLevel, advancement.newState);
        hintDisclaimer = hintService.formatHintDisclaimer(advancement.nextLevel, userLanguage);
        
        console.log(`[HINT] Providing Level ${advancement.nextLevel}/4 hint - Total hints: ${advancement.newState.totalHintsUsed}`);
      }
    }
    
    // Check if assessment phase - analyze response
    if (session.currentPhase === 'assessment') {
      const assessmentResult = tutorSessionService.analyzeResponse(query);
      await tutorSessionService.recordAssessment(chatId, assessmentResult);
      console.log(`[SESSION ASSESSMENT] Level: ${assessmentResult.level}, Score: ${assessmentResult.score}`);
    }
    
    // Generate AI response with session context
    const startAIGeneration = Date.now();
    const result = await optimizedAI.generateResponse(query, sessionContext, {
      language: persona.languageStyle.hindiPercentage > 50 ? 'hindi' : 'english',
      useCache: intentResult.intent === 'request_hint' ? false : true
    });
    const aiGenerationTime = Date.now() - startAIGeneration;
    metricsTracker.record('ai_generation_ms', aiGenerationTime);
    
    const finalResponse = result.response + hintDisclaimer;
    
    if (updatedHintState) {
      updatedHintState = hintService.updateHintStateWithResponse(updatedHintState, result.response);
    }
    
    // 🔥 VALIDATE RESPONSE QUALITY
    const startValidation = Date.now();
    const validation = await responseValidator.validate(finalResponse, {
      expectedLanguage: detectedLang,
      userEmotion: emotionResult.emotion,
      currentPhase: session.currentPhase,
      subject: session.subject || 'General',
      topic: session.topic || 'General',
      userMessage: query
    });
    const validationTime = Date.now() - startValidation;
    metricsTracker.record('validation_ms', validationTime);
    
    console.log(`[VALIDATION] Overall Score: ${(validation.overallScore * 100).toFixed(1)}% - Valid: ${validation.isValid} (${validationTime}ms)`);
    console.log(`[VALIDATION] Language Match: ${(validation.layers.languageMatch.score * 100).toFixed(1)}%, Tone: ${(validation.layers.toneAppropriate.score * 100).toFixed(1)}%, Quality: ${(validation.layers.educationalQuality.score * 100).toFixed(1)}%, Safety: ${(validation.layers.safety.score * 100).toFixed(1)}%`);
    
    if (validation.issues.length > 0) {
      console.log(`[VALIDATION] Issues: ${validation.issues.join(', ')}`);
    }
    
    if (validation.recommendations.length > 0) {
      console.log(`[VALIDATION] Recommendations: ${validation.recommendations.join(', ')}`);
    }
    
    // 💾 LOG VALIDATION RESULTS TO DATABASE
    const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await storage.logResponseValidation({
      userId,
      chatId,
      messageId: aiMessageId,
      expectedLanguage: detectedLang,
      userEmotion: emotionResult.emotion,
      currentPhase: session.currentPhase,
      isValid: validation.isValid,
      overallScore: validation.overallScore,
      languageMatchScore: validation.layers.languageMatch.score,
      toneScore: validation.layers.toneAppropriate.score,
      qualityScore: validation.layers.educationalQuality.score,
      safetyScore: validation.layers.safety.score,
      issues: validation.issues,
      recommendations: validation.recommendations,
      shouldRegenerate: validation.shouldRegenerate,
      metadata: {
        detectedLanguage: validation.layers.languageMatch.detectedLanguage,
        wordCount: finalResponse.split(/\s+/).length
      }
    });
    
    // Store AI message with hint metadata + validation
    await storage.addMessage({
      chatId,
      role: 'assistant',
      content: finalResponse,
      metadata: {
        model: result.model,
        cost: result.cost,
        cached: result.cached,
        personaId: session.personaId,
        actualWordCount: finalResponse.split(/\s+/).length,
        ...hintMetadata,
        hintState: updatedHintState,
        // 🔥 Validation metadata
        validation: {
          isValid: validation.isValid,
          overallScore: validation.overallScore,
          languageMatchScore: validation.layers.languageMatch.score,
          toneScore: validation.layers.toneAppropriate.score,
          qualityScore: validation.layers.educationalQuality.score,
          safetyScore: validation.layers.safety.score,
          issues: validation.issues,
          recommendations: validation.recommendations,
          validationTime: validationTime
        },
        // Performance metrics
        timings: {
          languageDetection: langDetectionTime,
          aiGeneration: aiGenerationTime,
          validation: validationTime,
          total: langDetectionTime + aiGenerationTime + validationTime
        }
      }
    });
    
    // Get current chat messages to check if should auto-advance
    const messages = await storage.getChatMessages(chatId);
    if (tutorSessionService.shouldAutoAdvance(session, messages.length)) {
      await tutorSessionService.advancePhase(chatId);
      console.log(`[SESSION] Auto-advanced to next phase`);
    }
    
    // Determine emotion based on phase
    let emotion = 'friendly';
    if (session.currentPhase === 'greeting' || session.currentPhase === 'rapport') {
      emotion = 'enthusiastic';
    } else if (session.currentPhase === 'teaching') {
      emotion = 'teaching';
    } else if (session.currentPhase === 'practice') {
      emotion = 'encouraging';
    } else if (session.currentPhase === 'feedback') {
      emotion = 'celebratory';
    }
    
    res.json({
      response: finalResponse,
      session: {
        currentPhase: session.currentPhase,
        progress: session.progress,
        level: session.level
      },
      emotion,
      meta: {
        cached: result.cached,
        model: result.model,
        cost: result.cost,
        personaId: session.personaId,
        ...hintMetadata
      }
    });
  } catch (error) {
    console.error('[SESSION ASK] Error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

/**
 * POST /api/tutor/optimized/session/ask-stream
 * Ask a question in an active tutor session with streaming response
 */
optimizedTutorRouter.post('/session/ask-stream', async (req, res) => {
  try {
    const { chatId, query } = req.body;
    const userId = (req as any).user?.id;
    
    if (!chatId || !query || !userId) {
      return res.status(400).json({ error: 'chatId, query, and authentication required' });
    }
    
    // Get session
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get persona
    const persona = tutorSessionService.getPersona(session);
    
    // 🔥 STEP 1: LANGUAGE DETECTION WITH 4-LAYER ANALYSIS
    const startLangDetection = Date.now();
    
    // Check cache first
    const cachedLangResult = await performanceOptimizer.getCachedLanguageDetection(query);
    let langDetection = cachedLangResult;
    
    if (!cachedLangResult) {
      // No cache hit - run detection
      langDetection = await languageDetector.detectLanguage(query, {
        conversationHistory: [],
        userPreference: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
        topic: session.topic
      });
      
      // Cache result
      await performanceOptimizer.cacheLanguageDetection(query, langDetection);
    }
    
    const langDetectionTime = Date.now() - startLangDetection;
    metricsTracker.record('language_detection_ms', langDetectionTime);
    
    const detectedLang = langDetection?.language || 'english';
    console.log(`[STREAM LANG] Detected: ${detectedLang} (${langDetection?.confidence.toFixed(2)}, ${langDetection?.confidenceLevel}) - ${langDetectionTime}ms`);
    
    // 🔥 STEP 2: ADD LANGUAGE DETECTION TO SESSION CONTEXT
    await sessionContextManager.addLanguageDetection(
      userId,
      chatId,
      detectedLang,
      langDetection?.confidence || 0.5
    );
    
    // Get current context
    let sessionCtx = await sessionContextManager.getContext(userId, chatId);
    
    // 💾 LOG LANGUAGE DETECTION TO DATABASE
    if (langDetection) {
      const lexicalScore = langDetection.analysis.lexical.devanagariRatio;
      const syntacticScore = langDetection.analysis.syntactic.wordOrder === 'SOV' ? 0.8 : 
                              langDetection.analysis.syntactic.wordOrder === 'SVO' ? 0.2 : 0.5;
      const statisticalScore = langDetection.analysis.statistical.languageScore.hindi;
      const contextualScore = langDetection.analysis.contextual?.consistencyScore || 0;
      
      await storage.logLanguageDetection({
        userId,
        chatId,
        inputText: query,
        detectedLanguage: langDetection.language,
        confidence: langDetection.confidence,
        confidenceLevel: langDetection.confidenceLevel,
        lexicalScore,
        syntacticScore,
        statisticalScore,
        contextualScore,
        processingTime: langDetectionTime,
        detectionMethod: langDetection.detectionMethod,
        metadata: {
          devanagariCount: langDetection.analysis.lexical.devanagariCount,
          hindiWords: langDetection.analysis.lexical.hindiWords.length,
          englishWords: langDetection.analysis.lexical.englishWords.length
        }
      });
    }
    
    // 🔥 STEP 3: INTENT CLASSIFICATION + EMOTION DETECTION
    const intent = await intentClassifier.classify(query, {
      currentPhase: session.currentPhase,
      lastAIMessage: undefined, // TODO: Get from chat messages
      currentTopic: session.topic,
      isInPracticeMode: session.currentPhase === 'practice'
    });
    const emotionResult = await emotionDetector.detectEmotion(query, []);
    
    console.log(`[STREAM INTENT] ${intent.intent} (${(intent.confidence * 100).toFixed(0)}%) | EMOTION: ${emotionResult.emotion}`);
    
    // Add emotion detection to session context
    await sessionContextManager.addEmotionDetection(
      userId,
      chatId,
      emotionResult.emotion,
      emotionResult.confidence
    );
    
    sessionCtx = await sessionContextManager.getContext(userId, chatId);
    
    // Check if assessment phase - analyze response
    if (session.currentPhase === 'assessment') {
      const assessmentResult = tutorSessionService.analyzeResponse(query);
      await tutorSessionService.recordAssessment(chatId, assessmentResult);
      console.log(`[SESSION ASSESSMENT] Level: ${assessmentResult.level}, Score: ${assessmentResult.score}`);
    }
    
    // 🔥 STEP 4: GENERATE DYNAMIC PROMPT USING MULTI-FACTOR ANALYSIS
    const promptResult = dynamicPromptEngine.generateSystemPrompt({
      detectedLanguage: detectedLang,
      preferredLanguage: session.profileSnapshot?.preferredLanguage as DetectedLanguage,
      languageConfidence: langDetection?.confidence || 0.5,
      currentEmotion: emotionResult.emotion,
      emotionConfidence: emotionResult.confidence,
      emotionalStability: sessionCtx?.emotionalHistory && sessionCtx.emotionalHistory.length > 0 ? 
        (sessionCtx.emotionalHistory.filter(e => e.emotion === emotionResult.emotion).length / sessionCtx.emotionalHistory.length) : 0.5,
      subject: session.subject,
      topic: session.topic,
      level: session.level || 'beginner',
      currentPhase: session.currentPhase,
      intent: intent.intent,
      misconceptions: session.adaptiveMetrics?.misconceptions || [],
      strongConcepts: session.adaptiveMetrics?.strongConcepts || []
    });
    
    const systemPrompt = promptResult.systemPrompt;
    console.log(`[STREAM PROMPT] Generated ${systemPrompt.length} chars for ${detectedLang} | ${emotionResult.emotion} | ${session.currentPhase}`);
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Determine emotion for frontend
    let emotion = emotionResult.emotion || 'friendly';
    
    let terminalEventSent = false;
    let fullResponse = '';
    
    try {
      // Save user message first with intent + emotion + language metadata
      await storage.addMessage({
        chatId,
        role: 'user',
        content: query,
        tool: null,
        metadata: {
          intent: intent.intent,
          intentConfidence: intent.confidence,
          emotion: emotionResult.emotion,
          emotionConfidence: emotionResult.confidence,
          detectedLanguage: detectedLang,
          languageConfidence: langDetection?.confidence || 0
        }
      });
      
      // 🔥 STEP 5: GENERATE AI RESPONSE WITH STREAMING
      const startAIGeneration = Date.now();
      let aiModel = 'unknown';
      let aiCost = 0;
      let aiCached = false;
      
      await optimizedAI.generateStreamingResponse(query, systemPrompt, (chunk, meta) => {
        // Accumulate response and metadata
        if (meta?.type !== 'complete' && meta?.type !== 'error') {
          fullResponse += chunk;
        }
        
        // Track metadata
        if (meta?.model) aiModel = meta.model;
        if (meta?.cost) aiCost = meta.cost;
        if (meta?.cached !== undefined) aiCached = meta.cached;
        
        if (meta?.type === 'complete') {
          terminalEventSent = true;
          res.write(`data: ${JSON.stringify({ 
            type: 'complete',
            content: chunk,
            session: {
              currentPhase: session.currentPhase,
              progress: session.progress,
              level: session.level
            },
            emotion,
            cached: meta.cached,
            model: meta.model,
            cost: meta.cost,
            personaId: session.personaId
          })}\n\n`);
        } else if (meta?.type === 'error') {
          terminalEventSent = true;
          res.write(`data: ${JSON.stringify({ 
            type: 'error',
            error: meta.error || 'Stream failed'
          })}\n\n`);
        } else {
          // Send chunk with proper format: type + content
          res.write(`data: ${JSON.stringify({ 
            type: 'chunk',
            content: chunk,
            session: {
              currentPhase: session.currentPhase
            }
          })}\n\n`);
        }
      });
      
      const aiGenerationTime = Date.now() - startAIGeneration;
      metricsTracker.record('ai_generation_ms', aiGenerationTime);
      
      // 🔥 STEP 6: VALIDATE RESPONSE QUALITY
      const startValidation = Date.now();
      const validation = await responseValidator.validate(fullResponse, {
        expectedLanguage: detectedLang,
        userEmotion: emotionResult.emotion,
        currentPhase: session.currentPhase,
        subject: session.subject || 'General',
        topic: session.topic || 'General',
        userMessage: query
      });
      const validationTime = Date.now() - startValidation;
      metricsTracker.record('validation_ms', validationTime);
      
      console.log(`[STREAM VALIDATION] Score: ${(validation.overallScore * 100).toFixed(1)}% - Valid: ${validation.isValid} (${validationTime}ms)`);
      
      // 💾 SAVE AI RESPONSE TO DATABASE FIRST (to get message ID)
      let savedMessage = null;
      if (fullResponse.trim()) {
        savedMessage = await storage.addMessage({
          chatId,
          role: 'assistant',
          content: fullResponse.trim(),
          tool: null,
          metadata: {
            model: aiModel,
            cost: aiCost,
            cached: aiCached,
            personaId: session.personaId,
            emotion,
            phase: session.currentPhase,
            actualWordCount: fullResponse.split(/\s+/).length,
            // 🔥 Validation metadata
            validation: {
              isValid: validation.isValid,
              overallScore: validation.overallScore,
              languageMatchScore: validation.layers.languageMatch.score,
              toneScore: validation.layers.toneAppropriate.score,
              qualityScore: validation.layers.educationalQuality.score,
              safetyScore: validation.layers.safety.score,
              issues: validation.issues,
              recommendations: validation.recommendations,
              validationTime: validationTime
            },
            // Performance metrics
            timings: {
              languageDetection: langDetectionTime,
              aiGeneration: aiGenerationTime,
              validation: validationTime,
              total: langDetectionTime + aiGenerationTime + validationTime
            }
          }
        });
        
        // 💾 NOW LOG VALIDATION RESULTS WITH ACTUAL MESSAGE ID
        if (savedMessage?.id) {
          await storage.logResponseValidation({
            userId,
            chatId,
            messageId: savedMessage.id,
            expectedLanguage: detectedLang,
            userEmotion: emotionResult.emotion,
            currentPhase: session.currentPhase,
            isValid: validation.isValid,
            overallScore: validation.overallScore,
            languageMatchScore: validation.layers.languageMatch.score,
            toneScore: validation.layers.toneAppropriate.score,
            qualityScore: validation.layers.educationalQuality.score,
            safetyScore: validation.layers.safety.score,
            issues: validation.issues,
            recommendations: validation.recommendations,
            shouldRegenerate: validation.shouldRegenerate,
            metadata: {
              detectedLanguage: validation.layers.languageMatch.detectedLanguage,
              wordCount: fullResponse.split(/\s+/).length
            }
          });
        }
      }
      
      // Check if should auto-advance phase
      const messages = await storage.getChatMessages(chatId);
      if (tutorSessionService.shouldAutoAdvance(session, messages.length)) {
        await tutorSessionService.advancePhase(chatId);
        console.log(`[SESSION STREAM] Auto-advanced to next phase`);
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      console.error('[SESSION ASK STREAM] Error:', streamError);
      if (!terminalEventSent && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error',
          error: 'Stream failed'
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  } catch (error) {
    console.error('[SESSION ASK STREAM] Setup error:', error);
    res.status(500).json({ error: 'Failed to initialize stream' });
  }
});

/**
 * POST /api/tutor/optimized/session/tts
 * Generate TTS with emotion-based prosody for tutor response
 * 🚀 PHASE 2-3: Now with caching, compression, and metrics!
 */
optimizedTutorRouter.post('/session/tts', async (req, res) => {
  try {
    const { chatId, text, emotion } = req.body;
    
    if (!chatId || !text) {
      return res.status(400).json({ error: 'chatId and text required' });
    }
    
    // Get session to determine persona and language
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const persona = tutorSessionService.getPersona(session);
    const language = persona.languageStyle.hindiPercentage > 50 ? 'hi' : 'en';
    const personaId = session.personaId;
    
    console.log(`[SESSION TTS] Generating for chatId ${chatId}: ${text.substring(0, 50)}...`);
    
    const startTime = Date.now();
    
    // 🚀 PHASE 2.1: Check cache first
    const { ttsCacheService } = await import('../services/ttsCacheService');
    const { audioCompression } = await import('../services/audioCompression');
    const { ttsMetrics } = await import('../services/ttsMetrics');
    
    let audioBuffer = await ttsCacheService.get(text, language, emotion, personaId);
    let cached = false;
    
    if (audioBuffer) {
      cached = true;
      console.log(`[SESSION TTS] 💾 Cache hit! (${Date.now() - startTime}ms)`);
    } else {
      // Cache miss - generate new audio
      audioBuffer = await enhancedVoiceService.synthesize(text, {
        emotion: emotion || 'friendly',
        personaId,
        language,
        enableMathSpeech: true,
        enablePauses: true
      });
      
      // Store in cache
      await ttsCacheService.set(text, language, audioBuffer, emotion, personaId);
      console.log(`[SESSION TTS] 🔨 Generated and cached (${Date.now() - startTime}ms)`);
    }
    
    const genTime = Date.now() - startTime;
    
    // 🚀 PHASE 2.2: Compress if beneficial
    let finalBuffer = audioBuffer;
    let compressed = false;
    let compressedSize = audioBuffer.length;
    
    if (audioCompression.shouldCompress(audioBuffer.length)) {
      const compressionResult = await audioCompression.compress(audioBuffer);
      finalBuffer = compressionResult.compressed;
      compressed = true;
      compressedSize = compressionResult.compressedSize;
      console.log(`[SESSION TTS] 📦 Compressed ${audioBuffer.length} → ${compressedSize} bytes (${compressionResult.compressionRatio.toFixed(1)}% saved)`);
    }
    
    // 🚀 PHASE 2.4: Record metrics
    ttsMetrics.record({
      sentence: text,
      language,
      generationTime: genTime,
      cached,
      compressed,
      audioSize: audioBuffer.length,
      compressedSize: compressed ? compressedSize : undefined,
      sequence: 0,
      sessionId: chatId,
    });
    
    res.set({
      'Content-Type': 'audio/wav', // Always use valid MIME type
      'Content-Length': finalBuffer.length,
      'X-TTS-Cached': cached ? 'true' : 'false',
      'X-TTS-Compressed': compressed ? 'true' : 'false',
    });
    
    res.send(finalBuffer);
  } catch (error) {
    console.error('[SESSION TTS] Error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

/**
 * POST /api/tutor/optimized/session/tts-with-phonemes
 * 🎯 Phase 5: Generate TTS with phoneme data from SSML for Unity lip-sync
 * NOW ACCEPTS SSML (not plain text) + uses unified caching
 * Returns: { audio: base64, phonemes: [{time, blendshape, weight}] }
 */
optimizedTutorRouter.post('/session/tts-with-phonemes', async (req, res) => {
  try {
    const { chatId, ssml, persona, language } = req.body;
    
    if (!chatId || !ssml) {
      return res.status(400).json({ error: 'chatId and ssml required' });
    }
    
    // Get session
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const personaId = persona || session.personaId || 'Priya';
    const lang = (language || 'en') as 'hi' | 'en' | 'hinglish';
    
    console.log(`[TTS+PHONEMES SSML] Generating for chatId ${chatId}: ${ssml.substring(0, 50)}...`);
    
    const startTime = Date.now();
    
    // Import services
    const { ttsCacheService } = await import('../services/ttsCacheService');
    const { voiceService } = await import('../services/voiceService');
    const { mapPollyVisemesToUnityPhonemes } = await import('../utils/visemeMapping');
    
    let audioBuffer: Buffer;
    let phonemes: Array<{time: number; blendshape: string; weight: number}> = [];
    let cached = false;
    
    // Voice config for Polly
    const voiceId = lang === 'hi' ? 'Aditi' : 'Aditi'; // Indian English
    const engine = 'standard'; // SSML + visemes work with standard
    
    // 1. Check unified cache (audio + phonemes)
    const cachedData = await ttsCacheService.getUnified(ssml, {
      voiceId,
      engine,
      language: lang,
      persona: personaId
    });
    
    if (cachedData) {
      cached = true;
      audioBuffer = cachedData.audio;
      phonemes = cachedData.phonemes;
      console.log(`[TTS+PHONEMES SSML] 💾 Unified cache hit! Audio + Phonemes (${Date.now() - startTime}ms)`);
    } else {
      // 2. Generate NEW audio + visemes from SSML with Polly
      try {
        const result = await voiceService.synthesizeSSMLWithVisemes(ssml, {
          voiceId,
          engine,
          language: lang
        });
        
        audioBuffer = result.audio;
        
        if (result.visemes.length > 0) {
          phonemes = mapPollyVisemesToUnityPhonemes(result.visemes);
          console.log(`[TTS+PHONEMES SSML] ✅ Generated ${phonemes.length} phonemes from SSML`);
        } else {
          console.warn('[TTS+PHONEMES SSML] No visemes from Polly');
        }
        
        // Store in unified cache
        await ttsCacheService.setUnified(
          ssml,
          { voiceId, engine, language: lang, persona: personaId },
          { audio: audioBuffer, phonemes }
        );
        console.log(`[TTS+PHONEMES SSML] 🔨 Generated and cached (${Date.now() - startTime}ms)`);
      } catch (synthError) {
        console.error('[TTS+PHONEMES SSML] Polly synthesis failed:', synthError);
        throw new Error('Failed to generate TTS with phonemes from SSML');
      }
    }
    
    // 3. Convert audio to base64
    const audioBase64 = audioBuffer.toString('base64');
    
    const genTime = Date.now() - startTime;
    console.log(`[TTS+PHONEMES SSML] ✅ Complete in ${genTime}ms - Audio: ${audioBuffer.length} bytes, Phonemes: ${phonemes.length}`);
    
    // Return JSON with audio and phonemes
    res.json({
      audio: audioBase64,
      phonemes,
      metadata: {
        cached,
        generationTime: genTime,
        audioSize: audioBuffer.length,
        phonemeCount: phonemes.length,
      }
    });
  } catch (error) {
    console.error('[TTS+PHONEMES SSML] Error:', error);
    res.status(500).json({ error: 'Failed to generate TTS with phonemes from SSML' });
  }
});

/**
 * GET /api/tutor/optimized/session/:chatId
 * Get session status and resume context
 */
optimizedTutorRouter.get('/session/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Generate resume context
    const resumeText = await tutorSessionService.generateResumeContext(chatId);
    
    res.json({
      session: {
        id: session.id,
        chatId: session.chatId,
        currentPhase: session.currentPhase,
        progress: session.progress,
        personaId: session.personaId,
        level: session.level,
        subject: session.subject,
        topic: session.topic,
        adaptiveMetrics: session.adaptiveMetrics
      },
      resumeText,
      canResume: true
    });
  } catch (error) {
    console.error('[SESSION GET] Error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /api/tutor/optimized/session/checkpoint
 * Record a checkpoint passed
 */
optimizedTutorRouter.post('/session/checkpoint', async (req, res) => {
  try {
    const { chatId, checkpointName } = req.body;
    
    if (!chatId || !checkpointName) {
      return res.status(400).json({ error: 'chatId and checkpointName required' });
    }
    
    const updatedSession = await tutorSessionService.recordCheckpoint(chatId, checkpointName);
    
    res.json({
      success: true,
      session: {
        currentPhase: updatedSession.currentPhase,
        progress: updatedSession.progress,
        checkpointsPassed: updatedSession.adaptiveMetrics?.checkpointsPassed || 0
      }
    });
  } catch (error) {
    console.error('[SESSION CHECKPOINT] Error:', error);
    res.status(500).json({ error: 'Failed to record checkpoint' });
  }
});

/**
 * POST /api/tutor/optimized/session/advance
 * Manually advance to next phase
 */
optimizedTutorRouter.post('/session/advance', async (req, res) => {
  try {
    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({ error: 'chatId required' });
    }
    
    const updatedSession = await tutorSessionService.advancePhase(chatId);
    const template = tutorSessionService.getCurrentPhaseTemplate(updatedSession);
    const message = tutorSessionService.fillSessionTemplate(template, updatedSession);
    
    res.json({
      success: true,
      session: {
        currentPhase: updatedSession.currentPhase,
        progress: updatedSession.progress
      },
      message,
      emotion: template.emotion
    });
  } catch (error) {
    console.error('[SESSION ADVANCE] Error:', error);
    res.status(500).json({ error: 'Failed to advance phase' });
  }
});

/**
 * GET /api/tutor/optimized/sessions/user
 * Get all tutor sessions for current user (for resume functionality)
 */
optimizedTutorRouter.get('/sessions/user', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const sessions = await storage.getTutorSessionByUserId(userId);
    
    // Filter for resumable sessions (not in closure phase, recent activity)
    const resumableSessions = sessions.filter(session => 
      session.currentPhase !== 'closure' && 
      session.progress < 100
    ).slice(0, 5); // Limit to 5 most recent
    
    res.json({
      sessions: resumableSessions.map(s => ({
        id: s.id,
        chatId: s.chatId,
        subject: s.subject,
        topic: s.topic,
        currentPhase: s.currentPhase,
        progress: s.progress,
        personaId: s.personaId,
        level: s.level,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('[USER SESSIONS] Error:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});
