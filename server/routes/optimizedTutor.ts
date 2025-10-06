import express from 'express';
import { optimizedAI } from '../services/optimizedAIService';
import { costTracker } from '../services/costTracker';
import { semanticCache } from '../services/semanticCache';
import { tutorSessionService } from '../services/tutorSessionService';
import { enhancedVoiceService } from '../services/enhancedVoiceService';
import { intentClassifier } from '../services/intentClassifier';
import { promptBuilder } from '../services/promptBuilder';
import { storage } from '../storage';

export const optimizedTutorRouter = express.Router();

/**
 * POST /api/tutor/optimized/ask
 * Ask a question with intelligent model routing and caching
 */
optimizedTutorRouter.post('/ask', async (req, res) => {
  try {
    const { query, context, language, useCache = true } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    const result = await optimizedAI.generateResponse(query, context, {
      language: language || 'english',
      useCache,
    });
    
    res.json({
      response: result.response,
      meta: {
        optimized: true,
        cached: result.cached,
        model: result.model,
        cost: result.cost,
      }
    });
  } catch (error) {
    console.error('[OPTIMIZED TUTOR] Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
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
    const lastAIMessage = allMessages.reverse().find(m => m.role === 'assistant')?.content;
    
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
    
    // Store user message with intent metadata
    await storage.addMessage({
      chatId,
      role: 'user',
      content: query,
      metadata: {
        intent: intentResult.intent,
        intentConfidence: intentResult.confidence,
        entities: intentResult.entities
      }
    });
    
    // 🆕 BUILD LANGUAGE-AWARE SYSTEM PROMPT
    const localePrefix = user.locale?.split('-')[0].toLowerCase();
    const userLanguage: 'hi' | 'en' = (localePrefix === 'hi') ? 'hi' : 'en';
    const baseSystemPrompt = promptBuilder.buildSystemPrompt({
      userLanguage,
      subject: session.subject || 'General',
      topic: session.topic || 'General',
      level: session.level || 'intermediate',
      currentPhase: session.currentPhase || 'teaching',
      intent: intentResult.intent
    });
    
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

ADAPTIVE LEARNING:
Strong Concepts: ${session.adaptiveMetrics?.strongConcepts?.join(', ') || 'None yet'}
Misconceptions: ${session.adaptiveMetrics?.misconceptions?.join(', ') || 'None yet'}
    `.trim();
    
    let sessionContext = `${baseSystemPrompt}\n\n${personaContext}`;
    
    // Add entity-specific instructions
    if (intentResult.intent === 'submit_answer' && intentResult.entities?.answer) {
      sessionContext += `\n\nIMPORTANT: Student submitted answer: ${intentResult.entities.answer}${intentResult.entities.unit ? ' ' + intentResult.entities.unit : ''}. Evaluate if correct and provide feedback.`;
    }
    
    // Check if assessment phase - analyze response
    if (session.currentPhase === 'assessment') {
      const assessmentResult = tutorSessionService.analyzeResponse(query);
      await tutorSessionService.recordAssessment(chatId, assessmentResult);
      console.log(`[SESSION ASSESSMENT] Level: ${assessmentResult.level}, Score: ${assessmentResult.score}`);
    }
    
    // Generate AI response with session context
    const result = await optimizedAI.generateResponse(query, sessionContext, {
      language: persona.languageStyle.hindiPercentage > 50 ? 'hindi' : 'english',
      useCache: true
    });
    
    // Store AI message
    await storage.addMessage({
      chatId,
      role: 'assistant',
      content: result.response,
      metadata: {
        model: result.model,
        cost: result.cost,
        cached: result.cached,
        personaId: session.personaId
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
      response: result.response,
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
        personaId: session.personaId
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
    
    // Build context with session state
    const sessionContext = `
You are ${persona.name}, a ${persona.personality.toneOfVoice} ${session.subject} teacher.
Current Phase: ${session.currentPhase}
Student Level: ${session.level}
Student Name: ${session.profileSnapshot?.firstName || 'Student'}
Exam Target: ${session.profileSnapshot?.examTarget || 'General'}
Current Class: ${session.profileSnapshot?.currentClass || 'Class 12'}
Topic: ${session.topic}
Progress: ${session.progress}%

Personality: ${persona.personality.traits.join(', ')}
Language: ${persona.languageStyle.hindiPercentage}% Hindi, ${persona.languageStyle.englishPercentage}% English
Code-switch style: ${persona.languageStyle.codeSwitch}

Strong Concepts: ${session.adaptiveMetrics?.strongConcepts?.join(', ') || 'None yet'}
Misconceptions: ${session.adaptiveMetrics?.misconceptions?.join(', ') || 'None yet'}

Respond in ${persona.name}'s style. Use catchphrases like: ${persona.personality.catchphrases.slice(0, 2).join(', ')}.
    `.trim();
    
    // Check if assessment phase - analyze response
    if (session.currentPhase === 'assessment') {
      const assessmentResult = tutorSessionService.analyzeResponse(query);
      await tutorSessionService.recordAssessment(chatId, assessmentResult);
      console.log(`[SESSION ASSESSMENT] Level: ${assessmentResult.level}, Score: ${assessmentResult.score}`);
    }
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
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
    
    let terminalEventSent = false;
    let fullResponse = '';
    
    try {
      // Save user message first
      await storage.addMessage({
        chatId,
        role: 'user',
        content: query,
        tool: null,
        metadata: null
      });
      
      await optimizedAI.generateStreamingResponse(query, sessionContext, (chunk, meta) => {
        // Accumulate response
        if (meta?.type !== 'complete' && meta?.type !== 'error') {
          fullResponse += chunk;
        }
        if (meta?.type === 'complete') {
          terminalEventSent = true;
          res.write(`data: ${JSON.stringify({ 
            type: 'complete',
            content: chunk, // Include final content
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
            content: chunk, // Frontend expects 'content' field
            session: {
              currentPhase: session.currentPhase
            }
          })}\n\n`);
        }
      });
      
      // Save AI response to database
      if (fullResponse.trim()) {
        await storage.addMessage({
          chatId,
          role: 'assistant',
          content: fullResponse.trim(),
          tool: null,
          metadata: {
            personaId: session.personaId,
            emotion,
            phase: session.currentPhase
          }
        });
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
    
    // Synthesize with emotion and persona
    const audioBuffer = await enhancedVoiceService.synthesize(text, {
      emotion: emotion || 'friendly',
      personaId: session.personaId,
      language,
      enableMathSpeech: true,
      enablePauses: true
    });
    
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('[SESSION TTS] Error:', error);
    res.status(500).json({ error: 'Failed to synthesize speech' });
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
