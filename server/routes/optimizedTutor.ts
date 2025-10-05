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
    
    try {
      const result = await optimizedAI.generateStreamingResponse(query, context, (chunk, meta) => {
        res.write(`data: ${JSON.stringify({ 
          chunk,
          cached: meta?.cached,
          model: meta?.model 
        })}\n\n`);
      });
      
      // Send final metadata on success
      res.write(`data: ${JSON.stringify({ 
        type: 'complete',
        meta: {
          cached: result.cached,
          model: result.model,
          cost: result.cost,
        }
      })}\n\n`);
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError) {
      // Send error metadata before closing stream
      console.error('[OPTIMIZED TUTOR STREAM] Stream error:', streamError);
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        error: 'Stream failed',
        message: streamError instanceof Error ? streamError.message : 'Unknown error',
        meta: {
          cached: false,
          cost: 0, // No cost on error (best effort)
        }
      })}\n\n`);
      
      res.write('data: [DONE]\n\n');
      res.end();
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
