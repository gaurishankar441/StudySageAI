import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { documentService } from "./services/documentService";
import { aiServiceManager } from "./services/aiService";
import { aiService } from "./openai";
import { insertDocumentSchema, insertChatSchema, insertNoteSchema, insertQuizSchema, insertStudyPlanSchema } from "@shared/schema";
import multer from "multer";

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
  app.post('/api/documents/from-upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const { uploadURL, fileName, fileSize, fileType } = req.body;

      if (!uploadURL || !fileName) {
        return res.status(400).json({ message: "Upload URL and file name are required" });
      }

      // Extract file extension to determine source type
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      const sourceType = fileExtension === 'pdf' ? 'pdf' : 
                        fileExtension === 'docx' ? 'docx' : 
                        fileExtension === 'txt' ? 'text' : 
                        fileExtension === 'pptx' ? 'pptx' : 'text';

      // Initialize object storage service
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the upload URL to get the object path
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Get the file from object storage using GCS client
      const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
      const [fileBuffer] = await objectFile.download();

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
  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
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
      const sourceType = fileExtension === 'pdf' ? 'pdf' : 
                        fileExtension === 'docx' ? 'docx' : 
                        fileExtension === 'txt' ? 'text' : 
                        fileExtension === 'pptx' ? 'pptx' : 'text';

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
  app.get('/api/chats/:id/stream', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/chats/:id/stream', isAuthenticated, async (req: any, res) => {
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
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  const httpServer = createServer(app);
  return httpServer;
}
