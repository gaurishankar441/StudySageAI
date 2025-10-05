import express from 'express';
import { optimizedAI } from '../services/optimizedAIService';
import { costTracker } from '../services/costTracker';
import { semanticCache } from '../services/semanticCache';

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
