import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSessionStore } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { documentService } from "./services/documentService";
import { aiServiceManager } from "./services/aiService";
import { aiService } from "./openai";
import { insertDocumentSchema, insertChatSchema, insertNoteSchema, insertQuizSchema, insertStudyPlanSchema } from "@shared/schema";
import multer from "multer";
import { optimizedTutorRouter } from "./routes/optimizedTutor";
import voiceRouter from "./routes/voice";
import testValidationRouter from "./routes/testValidation";
import { uploadLimiter, aiLimiter } from "./middleware/security";
import type { VoiceWebSocketClient, VoiceMessage } from "./types/voiceWebSocket";
import { parse as parseUrl } from 'url';
import { parse as parseQuery } from 'querystring';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Document routes
  // For files already uploaded to object storage via ObjectUploader
  app.post('/api/documents/from-upload', isAuthenticated, uploadLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { uploadURL, fileName, fileSize, fileType } = req.body;

      if (!uploadURL || !fileName) {
        return res.status(400).json({ message: "Upload URL and file name are required" });
      }

      // Extract file extension to determine source type
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
      
      const sourceType = fileExtension === 'pdf' ? 'pdf' : 
                        fileExtension === 'docx' ? 'docx' : 
                        fileExtension === 'txt' ? 'text' : 
                        fileExtension === 'pptx' ? 'pptx' : 
                        imageExtensions.includes(fileExtension || '') ? 'image' : 'text';

      // Initialize object storage service
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the upload URL to get the object path
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Get the file from object storage using S3 client
      const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      const fileBuffer = await objectStorageService.downloadBuffer(objectFile);

      console.log(`Processing document for user ${userId}: ${fileName} (${fileBuffer.length} bytes)`);
      
      // Convert buffer to string for text files
      const content = sourceType === 'text' ? fileBuffer.toString('utf-8') : fileBuffer;
      
      // Process document
      const docId = await documentService.ingestDocument(
        userId,
        fileName,
        sourceType,
        content,
        undefined,
        normalizedPath
      );

      console.log(`Document ${docId} created for user ${userId}`);

      // Set ACL policy
      await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private"
      });

      res.json({ documentId: docId, status: 'processing' });
    } catch (error) {
      console.error("Document processing error:", error);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // For direct file upload (legacy/alternative method)
  app.post('/api/documents/upload', isAuthenticated, uploadLimiter, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const file = req.file;
      const { title } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Upload file to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file.buffer,
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      // Extract file extension to determine source type
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
      
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'];
      
      const sourceType = fileExtension === 'pdf' ? 'pdf' : 
                        fileExtension === 'docx' ? 'docx' : 
                        fileExtension === 'txt' ? 'text' : 
                        fileExtension === 'pptx' ? 'pptx' : 
                        imageExtensions.includes(fileExtension || '') ? 'image' : 'text';

      // Convert buffer to string for text files
      const content = sourceType === 'text' ? file.buffer.toString('utf-8') : file.buffer;

      // Process document
      const docId = await documentService.ingestDocument(
        userId,
        title || file.originalname,
        sourceType,
        content,
        undefined,
        uploadURL
      );

      // Set ACL policy
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private"
      });

      res.json({ documentId: docId, status: 'processing' });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.post('/api/documents/by-url', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { url, title } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Determine source type from URL
      let sourceType = 'web';
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        sourceType = 'youtube';
      }

      // Process document from URL
      const docId = await documentService.ingestDocument(
        userId,
        title || url,
        sourceType,
        '',
        url
      );

      res.json({ documentId: docId, status: 'processing' });
    } catch (error) {
      console.error("Document URL processing error:", error);
      
      // Return 400 for user-facing errors (missing captions, invalid URLs, etc.)
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('captions') || errorMsg.includes('transcript') || 
          errorMsg.includes('private') || errorMsg.includes('restricted') ||
          errorMsg.includes('Invalid') || errorMsg.includes('disabled')) {
        return res.status(400).json({ message: errorMsg });
      }
      
      // Return 500 for server errors
      res.status(500).json({ message: "Failed to process document from URL" });
    }
  });

  // For direct text content submission
  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { title, content, sourceType = 'text' } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      // Process text document
      const docId = await documentService.ingestDocument(
        userId,
        title || 'Text Document',
        sourceType,
        content
      );

      res.json({ documentId: docId, status: 'processing' });
    } catch (error) {
      console.error("Text document processing error:", error);
      res.status(500).json({ message: "Failed to process text document" });
    }
  });

  app.get('/api/documents/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const document = await storage.getDocument(id);
      if (!document || document.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json({
        status: document.status,
        pages: document.pages,
        tokens: document.tokens,
        metadata: document.metadata
      });
    } catch (error) {
      console.error("Error fetching document status:", error);
      res.status(500).json({ message: "Failed to fetch document status" });
    }
  });

  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const document = await storage.getDocument(id);
      if (!document || document.userId !== userId) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Chat routes
  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const chatData = insertChatSchema.parse({ ...req.body, userId });

      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  app.get('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const chats = await storage.getChatsByUser(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.get('/api/chats/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const chat = await storage.getChat(id);
      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ message: "Chat not found" });
      }

      res.json(chat);
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.get('/api/chats/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const chat = await storage.getChat(id);
      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const messages = await storage.getChatMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Streaming chat endpoint (GET for EventSource)
  app.get('/api/chats/:id/stream', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const message = req.query.message as string;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const chat = await storage.getChat(id);
      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      if (chat.mode === 'tutor') {
        for await (const chunk of aiServiceManager.streamTutorResponse(id, message, userId)) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      } else if (chat.mode === 'docchat') {
        const { response } = await aiServiceManager.sendDocChatMessage(id, message, userId);
        res.write(`data: ${JSON.stringify({ type: 'complete', content: response })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
      res.end();
    }
  });

  // Streaming chat endpoint (POST for regular API calls)
  app.post('/api/chats/:id/stream', isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { message } = req.body;

      const chat = await storage.getChat(id);
      if (!chat || chat.userId !== userId) {
        return res.status(404).json({ message: "Chat not found" });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      if (chat.mode === 'tutor') {
        for await (const chunk of aiServiceManager.streamTutorResponse(id, message, userId)) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      } else if (chat.mode === 'docchat') {
        const { response } = await aiServiceManager.sendDocChatMessage(id, message, userId);
        res.write(`data: ${JSON.stringify({ type: 'complete', content: response })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in streaming chat:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
      res.end();
    }
  });

  // Optimized Tutor routes (with intelligent routing & caching)
  app.use('/api/tutor/optimized', isAuthenticated, aiLimiter, optimizedTutorRouter);
  
  // Voice routes (Sarvam AI primary, AssemblyAI/Polly fallback)
  app.use('/api/voice', isAuthenticated, voiceRouter);
  
  // Test Validation routes (JEE/NEET accuracy testing)
  app.use('/api/test', isAuthenticated, testValidationRouter);

  // Tutor routes
  app.post('/api/tutor/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { subject, level, topic, language = 'en' } = req.body;

      const chat = await aiServiceManager.startTutorSession(userId, subject, level, topic, language);
      res.json(chat);
    } catch (error) {
      console.error("Error starting tutor session:", error);
      res.status(500).json({ message: "Failed to start tutor session" });
    }
  });

  // Quick Tool endpoint with SSE streaming
  app.post('/api/tutor/quick-tool', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const {
        sessionId,
        toolType,
        subject,
        level,
        topic,
        userQuery,
        difficulty,
        language = 'en',
        examBoard,
        subtopic,
        exampleType,
        qTypes,
        count = 5,
        summaryTurns = 10
      } = req.body;

      if (!toolType || !subject || !level || !topic) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const result = await aiServiceManager.executeQuickTool(
        sessionId,
        toolType,
        {
          subject,
          level,
          topic,
          userQuery,
          difficulty,
          language,
          examBoard,
          subtopic,
          exampleType,
          qTypes,
          count,
          summaryTurns
        },
        userId,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'complete', content: result })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in quick tool:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to execute quick tool' })}\n\n`);
      res.end();
    }
  });

  // New Quick Tool with kind parameter (Indian curriculum focused)
  app.post('/api/tutor/quick-tool/:kind', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { kind } = req.params;
      const {
        sessionId,
        subject,
        board,
        class: className,
        level,
        topic,
        language = 'en',
        userNotes
      } = req.body;

      if (!['explain', 'hint', 'example', 'practice5', 'summary'].includes(kind)) {
        return res.status(400).json({ message: "Invalid tool kind" });
      }

      if (!subject || !topic) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Summary requires sessionId for chat history
      if (kind === 'summary' && !sessionId) {
        return res.status(400).json({ message: "Summary requires active chat session" });
      }

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Use the existing executeQuickTool method
      const result = await aiServiceManager.executeQuickTool(
        sessionId,
        kind,
        {
          subject,
          level: level || 'Intermediate',
          topic,
          userQuery: userNotes,
          difficulty: 'medium',
          language,
          examBoard: board,
          subtopic: topic,
          exampleType: 'Solved Example',
          qTypes: 'mixed type',
          count: 5,
          summaryTurns: 10
        },
        userId,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'complete', content: result })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in quick tool:", error);
      const message = error instanceof Error ? error.message : 'Failed to execute quick tool';
      res.status(500).json({ message });
    }
  });

  // Voice transcription endpoint using OpenAI Whisper
  app.post('/api/tutor/transcribe', isAuthenticated, upload.single('audio'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      console.log(`Transcribing audio for user ${userId}: ${audioFile.size} bytes`);

      // Call OpenAI Whisper API for transcription
      const formData = new FormData();
      formData.append('file', new Blob([audioFile.buffer]), 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', req.body.language || 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Whisper API error:', error);
        throw new Error('Failed to transcribe audio');
      }

      const result = await response.json();
      console.log('Transcription successful:', result.text);

      res.json({ 
        transcript: result.text,
        language: result.language || req.body.language || 'en'
      });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Text-to-speech endpoint (Enhanced with TTSSanitizer, emotion, prosody, Garima voice)
  app.post('/api/tutor/tts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { text, language = 'en', emotion = 'friendly', intent, personaId = 'garima' } = req.body;

      if (!text) {
        return res.status(400).json({ message: "No text provided" });
      }

      if (text.length > 3000) {
        return res.status(400).json({ message: "Text too long (max 3000 characters)" });
      }

      console.log(`Generating speech for user ${userId}: ${text.substring(0, 50)}...`);

      // Use Enhanced Voice Service with all features (TTSSanitizer, math, Hinglish, prosody, Garima voice)
      const { enhancedVoiceService } = await import('./services/enhancedVoiceService');
      const audioBuffer = await enhancedVoiceService.synthesize(text, {
        language: language === 'hi' ? 'hi' : 'en',
        emotion: emotion || 'friendly',
        intent,
        personaId: personaId || 'garima',
        enableMathSpeech: true,
        enablePauses: true,
        enableEmphasis: true
      });

      // Send audio response
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
      res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ message: "Failed to generate speech" });
    }
  });

  // DocChat routes
  app.post('/api/docchat/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { docIds, language = 'en' } = req.body;

      const chat = await aiServiceManager.startDocChatSession(userId, docIds, language);
      res.json(chat);
    } catch (error) {
      console.error("Error starting DocChat session:", error);
      res.status(500).json({ message: "Failed to start DocChat session" });
    }
  });

  // DocChat Quick Actions endpoint
  app.post('/api/docchat/action', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { action, docIds, language = 'en', level, examBoard, constraints = {} } = req.body;

      if (!action || !docIds || docIds.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      const result = await aiServiceManager.executeDocChatAction(
        action,
        docIds,
        { language, level, examBoard, ...constraints },
        userId,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ type: 'complete', content: result })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in DocChat action:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to execute action' })}\n\n`);
      res.end();
    }
  });

  // DocChat Suggested Questions endpoint
  app.get('/api/docchat/:chatId/suggested-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { chatId } = req.params;
      const count = parseInt(req.query.count || '3', 10);

      const questions = await aiServiceManager.generateSuggestedQuestions(chatId, userId, count);
      res.json({ questions });
    } catch (error) {
      console.error("Error generating suggested questions:", error);
      res.status(500).json({ message: "Failed to generate suggested questions" });
    }
  });

  // Analytics endpoint for tracking feature usage
  app.post('/api/analytics/event', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { eventType, eventData } = req.body;
      
      // Log analytics event (in production, send to analytics service)
      console.log(`[ANALYTICS] User: ${userId}, Event: ${eventType}`, eventData);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Quiz routes
  app.post('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const {
        title,
        source,
        sourceId,
        sourceUrl,
        subject,
        topic,
        difficulty,
        questionCount,
        questionTypes,
        language = 'en'
      } = req.body;

      let finalSourceId = sourceId;

      // If URL provided (YouTube/Website), create document first
      if (sourceUrl && (source === 'youtube' || source === 'website')) {
        const docTitle = title || `${source === 'youtube' ? 'YouTube' : 'Web'} content for ${topic}`;
        finalSourceId = await documentService.ingestDocument(
          userId,
          docTitle,
          source,
          '',
          sourceUrl
        );
      }

      const quiz = await aiServiceManager.generateQuiz(
        userId,
        title,
        source,
        finalSourceId,
        subject,
        topic,
        difficulty,
        questionCount,
        questionTypes,
        language
      );

      res.json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ message: "Failed to create quiz" });
    }
  });

  app.get('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const quizzes = await storage.getQuizzesByUser(userId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get('/api/quizzes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const quiz = await storage.getQuiz(id);
      if (!quiz || quiz.userId !== userId) {
        return res.status(404).json({ message: "Quiz not found" });
      }

      const questions = await storage.getQuizQuestions(id);
      res.json({ quiz, questions });
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ message: "Failed to fetch quiz" });
    }
  });

  app.post('/api/quizzes/:id/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { answers, timeSpent } = req.body;

      const result = await aiServiceManager.gradeQuizAttempt(id, userId, answers, timeSpent);
      res.json(result);
    } catch (error) {
      console.error("Error grading quiz attempt:", error);
      res.status(500).json({ message: "Failed to grade quiz attempt" });
    }
  });

  // Study Plan routes
  app.post('/api/study-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const {
        name,
        subject,
        topics,
        gradeLevel,
        examDate,
        intensity,
        sessionDuration,
        language = 'en'
      } = req.body;

      const plan = await aiServiceManager.generateStudyPlan(
        userId,
        name,
        subject,
        topics,
        gradeLevel,
        examDate ? new Date(examDate) : null,
        intensity,
        sessionDuration,
        language
      );

      res.json(plan);
    } catch (error) {
      console.error("Error creating study plan:", error);
      res.status(500).json({ message: "Failed to create study plan" });
    }
  });

  app.get('/api/study-plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const plans = await storage.getStudyPlansByUser(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching study plans:", error);
      res.status(500).json({ message: "Failed to fetch study plans" });
    }
  });

  app.get('/api/study-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const plan = await storage.getStudyPlan(id);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Study plan not found" });
      }

      const tasks = await storage.getStudyTasks(id);
      res.json({ plan, tasks });
    } catch (error) {
      console.error("Error fetching study plan:", error);
      res.status(500).json({ message: "Failed to fetch study plan" });
    }
  });

  app.patch('/api/study-plans/:id/tasks/:taskId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id, taskId } = req.params;
      const updates = req.body;

      const plan = await storage.getStudyPlan(id);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Study plan not found" });
      }

      const task = await storage.updateStudyTask(taskId, updates);
      res.json(task);
    } catch (error) {
      console.error("Error updating study task:", error);
      res.status(500).json({ message: "Failed to update study task" });
    }
  });

  // Notes routes
  app.post('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { title, sourceIds, sourceUrls, template = 'cornell', language = 'en' } = req.body;

      let finalSourceIds = sourceIds || [];

      // If URLs provided, create documents first
      if (sourceUrls && sourceUrls.length > 0) {
        for (const url of sourceUrls) {
          // Determine source type from URL
          let sourceType = 'web';
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            sourceType = 'youtube';
          }
          
          const docId = await documentService.ingestDocument(
            userId,
            title || url,
            sourceType,
            '',
            url
          );
          finalSourceIds.push(docId);
        }
      }

      const note = await aiServiceManager.generateNoteFromSources(
        userId,
        title,
        finalSourceIds,
        template,
        language
      );

      res.json(note);
    } catch (error) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.get('/api/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const notes = await storage.getNotesByUser(userId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const note = await storage.getNote(id);
      if (!note || note.userId !== userId) {
        return res.status(404).json({ message: "Note not found" });
      }

      const flashcards = await storage.getFlashcardsByNote(id);
      res.json({ note, flashcards });
    } catch (error) {
      console.error("Error fetching note:", error);
      res.status(500).json({ message: "Failed to fetch note" });
    }
  });

  app.patch('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const updates = req.body;

      const note = await storage.getNote(id);
      if (!note || note.userId !== userId) {
        return res.status(404).json({ message: "Note not found" });
      }

      const updatedNote = await storage.updateNote(id, updates);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Flashcard routes
  app.get('/api/flashcards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const flashcards = await storage.getFlashcardsByUser(userId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  // Object storage routes for file serving
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      // Get the full request path which includes /objects/
      const fullPath = req.path;
      console.log('Accessing object path:', fullPath, 'for user:', userId);
      
      const objectFile = await objectStorageService.getObjectEntityFile(fullPath);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        console.log('Access denied for object:', fullPath);
        return res.sendStatus(403);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const { contentType } = req.body;
      console.log('[UPLOAD] Generating presigned URL with contentType:', contentType);
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(contentType);
      console.log('[UPLOAD] Generated URL:', uploadURL.substring(0, 100) + '...');
      res.json({ uploadURL });
    } catch (error) {
      console.error('[UPLOAD] Error generating presigned URL:', error);
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  });

  // Dashboard API endpoints
  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      console.log('[STATS] userId:', userId);

      // Get all chats (tutoring sessions)
      const chats = await storage.getChatsByUser(userId);
      console.log('[STATS] chats count:', chats.length, 'chats:', JSON.stringify(chats.slice(0, 2)));
      const activeSessions = chats.length;

      // Get quiz attempts for accuracy calculation
      const quizzes = await storage.getQuizzesByUser(userId);
      let totalScore = 0;
      let totalPossibleScore = 0;
      
      for (const quiz of quizzes) {
        const attempts = await storage.getQuizAttempts(quiz.id, userId);
        for (const attempt of attempts) {
          if (attempt.score !== null && attempt.totalScore !== null) {
            totalScore += attempt.score;
            totalPossibleScore += attempt.totalScore;
          }
        }
      }
      
      const quizAccuracy = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0;

      // Estimate study time from chat count (each chat ~30 min average)
      const studyTime = Math.round(chats.length * 0.5); // hours

      // Get study plans for goals
      const studyPlans = await storage.getStudyPlansByUser(userId);
      const activePlans = studyPlans.filter(plan => plan.status === 'active');
      const completedPlans = studyPlans.filter(plan => plan.status === 'completed');
      const totalGoals = activePlans.length + completedPlans.length;
      const goalsAchieved = completedPlans.length;

      res.json({
        activeSessions,
        quizAccuracy,
        studyTime,
        goalsAchieved,
        totalGoals,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      console.log('[ACTIVITY] userId:', userId);
      const activities: any[] = [];

      // Get recent chats
      const chats = await storage.getChatsByUser(userId);
      console.log('[ACTIVITY] chats count:', chats.length);
      const recentChats = chats
        .filter(chat => chat.createdAt)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, 3);

      for (const chat of recentChats) {
        const timeAgo = getTimeAgo(new Date(chat.createdAt!));
        activities.push({
          id: `chat-${chat.id}`,
          type: chat.mode === 'tutor' ? 'tutor' : 'docchat',
          title: chat.mode === 'tutor' 
            ? `${chat.subject || 'General'} tutoring on ${chat.topic}` 
            : `DocChat session on ${chat.topic || 'Document'}`,
          time: timeAgo,
          icon: 'MessageCircle',
        });
      }

      // Get recent quiz attempts
      const quizzes = await storage.getQuizzesByUser(userId);
      const allAttempts: any[] = [];
      
      for (const quiz of quizzes) {
        const attempts = await storage.getQuizAttempts(quiz.id, userId);
        for (const attempt of attempts) {
          if (attempt.completedAt) {
            allAttempts.push({ ...attempt, quizTitle: quiz.title });
          }
        }
      }

      const recentAttempts = allAttempts
        .sort((a: any, b: any) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, 2);

      for (const attempt of recentAttempts) {
        const accuracy = (attempt.score !== null && attempt.totalScore !== null && attempt.totalScore > 0)
          ? Math.round((attempt.score / attempt.totalScore) * 100)
          : 0;
        const timeAgo = getTimeAgo(new Date(attempt.completedAt!));
        activities.push({
          id: `quiz-${attempt.id}`,
          type: 'quiz',
          title: `Scored ${accuracy}% on ${attempt.quizTitle || 'Quiz'}`,
          time: timeAgo,
          icon: 'CheckCircle',
        });
      }

      // Get recent study plan updates
      const studyPlans = await storage.getStudyPlansByUser(userId);
      const recentPlans = studyPlans
        .filter(plan => plan.updatedAt)
        .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
        .slice(0, 2);

      for (const plan of recentPlans) {
        const timeAgo = getTimeAgo(new Date(plan.updatedAt!));
        activities.push({
          id: `plan-${plan.id}`,
          type: 'study-plan',
          title: `Updated Study Plan: ${plan.name}`,
          time: timeAgo,
          icon: 'Calendar',
        });
      }

      // Sort all activities by time and return top 5
      const sortedActivities = activities
        .sort((a, b) => {
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        })
        .slice(0, 5);

      res.json(sortedActivities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get('/api/tasks/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const upcomingTasks: any[] = [];

      // Get all active study plans
      const studyPlans = await storage.getStudyPlansByUser(userId);
      const activePlans = studyPlans.filter(plan => plan.status === 'active');

      // Get tasks from all active plans
      for (const plan of activePlans) {
        const tasks = await storage.getStudyTasks(plan.id);
        const pendingTasks = tasks.filter(task => task.status === 'pending' && task.dueAt);

        for (const task of pendingTasks) {
          const dueDate = new Date(task.dueAt!);
          const now = new Date();
          const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          let status = 'upcoming';
          if (diffDays <= 0) status = 'due-today';
          else if (diffDays === 1) status = 'tomorrow';

          upcomingTasks.push({
            id: task.id,
            title: task.title,
            subject: plan.subject || 'General',
            duration: `${task.durationMin || 30} min`,
            type: task.type === 'tutor' ? 'AI Tutor' : 
                  task.type === 'quiz' ? 'Quiz' : 
                  task.type === 'read' ? 'Reading' : 
                  task.type === 'flashcards' ? 'Flashcards' : 'Task',
            status,
            icon: task.type === 'tutor' ? 'BookOpen' : 
                  task.type === 'quiz' ? 'ClipboardList' : 
                  task.type === 'read' ? 'BookOpen' : 'Brain',
            dueAt: task.dueAt,
          });
        }
      }

      // Sort by due date and return top 5
      const sortedTasks = upcomingTasks
        .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        .slice(0, 5);

      res.json(sortedTasks);
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error);
      res.status(500).json({ message: "Failed to fetch upcoming tasks" });
    }
  });

  // Admin endpoint to re-embed all documents with new embedding model
  app.post('/api/admin/reembed-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      
      // Get all documents for the user
      const documents = await storage.getDocumentsByUser(userId);
      
      if (documents.length === 0) {
        return res.json({ 
          message: 'No documents found to re-embed',
          processedCount: 0,
          totalCount: 0
        });
      }

      console.log(`[Re-embedding] Starting re-embedding for ${documents.length} documents`);
      
      let processedCount = 0;
      let errorCount = 0;
      const errors: { docId: string; title: string; error: string }[] = [];

      // Process each document
      for (const doc of documents) {
        try {
          console.log(`[Re-embedding] Processing document ${doc.id}: ${doc.title}`);
          
          // Get all chunks for this document
          const existingChunks = await storage.getChunksByDocument(doc.id);
          
          if (existingChunks.length === 0) {
            console.log(`[Re-embedding] No chunks found for ${doc.id}, skipping`);
            continue;
          }

          // Generate new embeddings for all chunks
          const chunkTexts = existingChunks.map(c => c.text);
          const batchSize = 100;
          let allEmbeddings: number[][] = [];
          
          for (let i = 0; i < chunkTexts.length; i += batchSize) {
            const batch = chunkTexts.slice(i, i + batchSize);
            const embeddings = await aiService.generateEmbeddings(batch);
            allEmbeddings = allEmbeddings.concat(embeddings);
          }

          // Update chunks with new embeddings
          for (let i = 0; i < existingChunks.length; i++) {
            const chunk = existingChunks[i];
            await storage.updateChunkEmbedding(chunk.id, allEmbeddings[i]);
          }

          console.log(`[Re-embedding] ✅ Completed ${doc.title}: ${existingChunks.length} chunks updated`);
          processedCount++;
        } catch (error) {
          console.error(`[Re-embedding] ❌ Error processing ${doc.id}:`, error);
          errorCount++;
          errors.push({
            docId: doc.id,
            title: doc.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        message: 'Re-embedding completed',
        processedCount,
        errorCount,
        totalCount: documents.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('[Re-embedding] Fatal error:', error);
      res.status(500).json({ 
        message: 'Failed to re-embed documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server for real-time voice tutor
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/tutor/voice'
  });

  console.log('[WebSocket] Voice Tutor WebSocket server initialized on /tutor/voice');

  // Keep track of active voice sessions
  const voiceSessions = new Map<string, VoiceWebSocketClient>();

  // Heartbeat interval for keep-alive
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as VoiceWebSocketClient;
      
      if (client.isAlive === false) {
        console.log(`[WebSocket] Terminating inactive connection for user ${client.userId}`);
        return client.terminate();
      }
      
      client.isAlive = false;
      client.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  // WebSocket authentication helper
  async function authenticateWebSocket(req: any): Promise<string | null> {
    try {
      // Extract session ID from cookie
      const cookies = req.headers.cookie || '';
      const sessionMatch = cookies.match(/connect\.sid=s%3A([^;.]+)/);
      
      if (!sessionMatch) {
        console.log('[WebSocket] No session cookie found');
        return null;
      }

      const sessionId = sessionMatch[1];
      
      // Get session store instance
      const sessionStore = getSessionStore();

      if (!sessionStore) {
        console.error('[WebSocket] Session store not initialized');
        return null;
      }

      // Get session data from PostgreSQL
      return new Promise((resolve) => {
        sessionStore.get(sessionId, (err: any, session: any) => {
          if (err || !session) {
            console.log('[WebSocket] Session not found or error:', err);
            resolve(null);
            return;
          }
          
          const userId = session.userId;
          if (!userId) {
            console.log('[WebSocket] No userId in session');
            resolve(null);
            return;
          }
          
          console.log(`[WebSocket] Authenticated user ${userId} from session`);
          resolve(userId);
        });
      });
    } catch (error) {
      console.error('[WebSocket] Authentication error:', error);
      return null;
    }
  }

  // WebSocket connection handler
  wss.on('connection', async (ws: VoiceWebSocketClient, req) => {
    console.log('[WebSocket] New voice connection attempt');
    
    // Parse query parameters
    const { query } = parseUrl(req.url || '', true);
    const chatId = query.chatId as string;

    if (!chatId) {
      ws.close(4001, 'Missing chatId parameter');
      return;
    }

    try {
      // Authenticate the WebSocket connection
      const authenticatedUserId = await authenticateWebSocket(req);
      
      if (!authenticatedUserId) {
        console.log('[WebSocket] Authentication failed');
        ws.close(4401, 'Unauthorized - Authentication required');
        return;
      }

      // Verify chat exists
      const chat = await storage.getChat(chatId);
      if (!chat) {
        ws.close(4404, 'Chat not found');
        return;
      }

      // CRITICAL: Verify the authenticated user owns this chat
      if (chat.userId !== authenticatedUserId) {
        console.log(`[WebSocket] Authorization failed: User ${authenticatedUserId} attempted to access chat owned by ${chat.userId}`);
        ws.close(4403, 'Forbidden - You do not own this chat');
        return;
      }

      // Attach session metadata to WebSocket client
      ws.userId = authenticatedUserId;
      ws.chatId = chatId;
      ws.sessionId = `voice_${chatId}_${Date.now()}`;
      ws.isAlive = true;
      ws.audioBuffer = [];
      ws.isTTSActive = false;

      // Store in active sessions
      voiceSessions.set(ws.sessionId, ws);

      console.log(`[WebSocket] ✅ Voice session established: ${ws.sessionId} for authenticated user ${ws.userId}`);

      // Send initial session state
      const sessionState: VoiceMessage = {
        type: 'SESSION_STATE',
        timestamp: new Date().toISOString(),
        sessionId: ws.sessionId,
        chatId: ws.chatId,
        currentPhase: 'greeting',
        personaId: 'priya',
        language: chat.language === 'hi' ? 'hi' : 'en',
        isVoiceActive: true
      };
      ws.send(JSON.stringify(sessionState));

      // Pong handler for keep-alive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Message handler
      ws.on('message', async (data: Buffer) => {
        try {
          const message: VoiceMessage = JSON.parse(data.toString());
          
          // Handle different message types
          switch (message.type) {
            case 'AUDIO_CHUNK':
              // Will be implemented in voiceStreamService
              console.log(`[WebSocket] Received audio chunk for ${ws.sessionId}`);
              break;
              
            case 'INTERRUPT':
              console.log(`[WebSocket] TTS interruption requested for ${ws.sessionId}`);
              ws.isTTSActive = false;
              // Stop any ongoing TTS streaming
              break;
              
            case 'PING':
              ws.send(JSON.stringify({ 
                type: 'PONG', 
                timestamp: new Date().toISOString() 
              }));
              break;
              
            default:
              console.log(`[WebSocket] Unknown message type: ${message.type}`);
          }
        } catch (error) {
          console.error('[WebSocket] Message processing error:', error);
          const errorMsg: VoiceMessage = {
            type: 'ERROR',
            timestamp: new Date().toISOString(),
            code: 'MESSAGE_PROCESSING_ERROR',
            message: 'Failed to process message',
            recoverable: true
          };
          ws.send(JSON.stringify(errorMsg));
        }
      });

      // Error handler
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for ${ws.sessionId}:`, error);
      });

      // Close handler
      ws.on('close', (code, reason) => {
        console.log(`[WebSocket] Connection closed for ${ws.sessionId}: ${code} ${reason}`);
        if (ws.sessionId) {
          voiceSessions.delete(ws.sessionId);
        }
      });

    } catch (error) {
      console.error('[WebSocket] Connection setup error:', error);
      ws.close(4000, 'Internal server error');
    }
  });

  // Expose WebSocket server for external access if needed
  (httpServer as any).wss = wss;

  return httpServer;
}

// Helper functions for time calculation
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function parseTimeAgo(timeStr: string): number {
  if (timeStr.includes('min')) {
    const mins = parseInt(timeStr);
    return mins;
  }
  if (timeStr.includes('hour')) {
    const hours = parseInt(timeStr);
    return hours * 60;
  }
  if (timeStr === 'Yesterday') return 24 * 60;
  if (timeStr.includes('days')) {
    const days = parseInt(timeStr);
    return days * 24 * 60;
  }
  return 999999; // Very old
}
