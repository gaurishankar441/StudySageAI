import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { documentService } from "./services/documentService";
import { aiServiceManager } from "./services/aiService";
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
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Document routes
  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
                        fileExtension === 'pptx' ? 'pptx' : 'document';

      // Process document
      const docId = await documentService.ingestDocument(
        userId,
        title || file.originalname,
        sourceType,
        file.buffer,
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
      const userId = req.user.claims.sub;
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
      res.status(500).json({ message: "Failed to process document from URL" });
    }
  });

  app.get('/api/documents/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Chat routes
  app.post('/api/chats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const chats = await storage.getChatsByUser(userId);
      res.json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  app.get('/api/chats/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { subject, level, topic, language = 'en' } = req.body;

      const chat = await aiServiceManager.startTutorSession(userId, subject, level, topic, language);
      res.json(chat);
    } catch (error) {
      console.error("Error starting tutor session:", error);
      res.status(500).json({ message: "Failed to start tutor session" });
    }
  });

  // DocChat routes
  app.post('/api/docchat/session', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { docIds, language = 'en' } = req.body;

      const chat = await aiServiceManager.startDocChatSession(userId, docIds, language);
      res.json(chat);
    } catch (error) {
      console.error("Error starting DocChat session:", error);
      res.status(500).json({ message: "Failed to start DocChat session" });
    }
  });

  // Quiz routes
  app.post('/api/quizzes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const {
        title,
        source,
        sourceId,
        subject,
        topic,
        difficulty,
        questionCount,
        questionTypes,
        language = 'en'
      } = req.body;

      const quiz = await aiServiceManager.generateQuiz(
        userId,
        title,
        source,
        sourceId,
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
      const userId = req.user.claims.sub;
      const quizzes = await storage.getQuizzesByUser(userId);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ message: "Failed to fetch quizzes" });
    }
  });

  app.get('/api/quizzes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const plans = await storage.getStudyPlansByUser(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching study plans:", error);
      res.status(500).json({ message: "Failed to fetch study plans" });
    }
  });

  app.get('/api/study-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { title, sourceIds, template = 'cornell', language = 'en' } = req.body;

      const note = await aiServiceManager.generateNoteFromSources(
        userId,
        title,
        sourceIds,
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
      const userId = req.user.claims.sub;
      const notes = await storage.getNotesByUser(userId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.get('/api/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const flashcards = await storage.getFlashcardsByUser(userId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  // Object storage routes for file serving
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
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
