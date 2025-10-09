import { Router } from 'express';
import multer from 'multer';
import { voiceService } from '../services/voiceService';
import { enhancedVoiceService } from '../services/enhancedVoiceService';
import { s3Client } from '../objectStorage';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { nanoid } from 'nanoid';

const voiceRouter = Router();

// Validate AWS configuration on router initialization
const validateAWSConfig = () => {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    console.error('[VOICE] AWS_S3_BUCKET_NAME not configured');
  }
  if (!process.env.AWS_REGION) {
    console.error('[VOICE] AWS_REGION not configured');
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('[VOICE] AWS credentials not configured');
  }
};

validateAWSConfig();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

/**
 * POST /api/voice/transcribe
 * Upload audio file and get text transcription
 */
voiceRouter.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const language = (req.body.language || 'en') as 'hi' | 'en';
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`[VOICE API] Transcribing ${req.file.size} bytes in ${language}`);
    
    // Validate AWS configuration
    if (!process.env.AWS_S3_BUCKET_NAME || !process.env.AWS_REGION) {
      return res.status(500).json({ error: 'AWS S3 not configured properly' });
    }
    
    // Upload audio to S3
    const audioKey = `voice/${userId}/${nanoid()}.${req.file.mimetype.split('/')[1]}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: audioKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: {
          userId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );
    
    const audioUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;
    
    // Transcribe using AssemblyAI
    const result = await voiceService.transcribeAudio(audioUrl, language);
    
    res.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      audioUrl,
    });
  } catch (error) {
    console.error('[VOICE API] Transcription error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voice/synthesize
 * Convert text to speech with enhanced prosody
 * Body params:
 * - text: string (required)
 * - language: 'hi' | 'en' (default: 'en')
 * - emotion: string (optional, e.g., 'friendly', 'teaching', 'excited')
 * - intent: string (optional, e.g., 'request_explanation', 'submit_answer')
 * - personaId: string (optional, e.g., 'priya', 'amit')
 * - enhanced: boolean (default: true) - use enhanced voice service with prosody
 */
voiceRouter.post('/synthesize', async (req, res) => {
  try {
    const { 
      text, 
      language = 'en',
      emotion,
      intent,
      personaId,
      enhanced = true
    } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text too long (max 3000 characters)' });
    }
    
    console.log(`[VOICE API] Synthesizing ${text.length} chars in ${language}${intent ? ` (intent: ${intent})` : ''}${emotion ? ` (emotion: ${emotion})` : ''} [enhanced: ${enhanced}]`);
    
    let audioBuffer: Buffer;
    
    if (enhanced) {
      // Use enhanced voice service with all features (math, Hinglish, prosody)
      audioBuffer = await enhancedVoiceService.synthesize(text, {
        language: language as 'hi' | 'en',
        emotion: emotion || 'friendly',
        intent,
        personaId: personaId || 'priya',
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      });
    } else {
      // Use basic voice service (fallback for legacy calls)
      audioBuffer = await voiceService.synthesizeSpeech(text, language as 'hi' | 'en');
    }
    
    // Send audio file with caching headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
    
    // Cache TTS audio for 24 hours (same text will return cached version)
    // This works with our server-side TTS cache (Redis/memory)
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('Vary', 'Accept-Encoding'); // Vary by compression
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('[VOICE API] TTS error:', error);
    res.status(500).json({
      error: 'Failed to synthesize speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/voice/ask
 * Voice-to-voice AI interaction: STT → AI → TTS
 */
voiceRouter.post('/ask', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const language = (req.body.language || 'en') as 'hi' | 'en';
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Validate AWS configuration
    if (!process.env.AWS_S3_BUCKET_NAME || !process.env.AWS_REGION) {
      return res.status(500).json({ error: 'AWS S3 not configured properly' });
    }
    
    // Step 1: Upload to S3
    const audioKey = `voice/${userId}/${nanoid()}.${req.file.mimetype.split('/')[1]}`;
    
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: audioKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );
    
    const audioUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;
    
    // Step 2: Transcribe audio to text
    const transcription = await voiceService.transcribeAudio(audioUrl, language);
    
    // Step 3: Get AI response using optimized AI service
    const { optimizedAI } = await import('../services/optimizedAIService');
    const context = `Answer this ${language === 'hi' ? 'in Hindi' : 'in English'} for a student.`;
    const aiResult = await optimizedAI.generateResponse(transcription.text, context);
    
    // Step 4: Synthesize AI response to speech with enhanced prosody
    const audioBuffer = await enhancedVoiceService.synthesize(aiResult.response, {
      language,
      emotion: 'friendly',
      enableMathSpeech: true,
      enablePauses: true,
      enableEmphasis: true
    });
    
    // Send audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Transcript', encodeURIComponent(transcription.text));
    res.setHeader('X-AI-Response', encodeURIComponent(aiResult.response));
    res.setHeader('X-Model', aiResult.model || 'unknown');
    res.setHeader('X-Cost', aiResult.cost?.toString() || '0');
    res.send(audioBuffer);
  } catch (error) {
    console.error('[VOICE API] Voice ask error:', error);
    res.status(500).json({
      error: 'Failed to process voice request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default voiceRouter;
