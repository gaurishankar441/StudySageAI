# VaktaAI - AI-Powered Study Companion

**VaktaAI** is a comprehensive educational platform that provides students with intelligent learning tools powered by OpenAI's GPT-5. The platform offers five core modules designed to enhance studying efficiency and comprehension through AI-assisted learning.

## ✨ Features

### 🎓 AI Tutor
Interactive conversational learning with real-time streaming responses. Get personalized tutoring sessions on any subject with adaptive teaching based on your understanding.

### 📚 DocChat
RAG-based (Retrieval Augmented Generation) document Q&A system. Upload PDFs, DOCX files, YouTube transcripts, or web content and ask questions with citation-backed answers.

### 📝 Quiz Generator
Auto-generate practice quizzes with multiple question types. Features instant grading with detailed explanations and performance tracking.

### 📅 Study Plan Manager
AI-powered study plan creation with intelligent task scheduling. 4-step wizard generates personalized learning schedules with exam countdown and task tracking.

### 📖 Smart Notes
Multi-source note ingestion with AI-powered summarization and auto-generated flashcards for spaced repetition learning.

## 🛠 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool & dev server)
- Wouter (routing)
- TanStack Query v5 (server state)
- shadcn/ui + Radix UI (components)
- Tailwind CSS (styling)

### Backend
- Express.js + TypeScript
- Drizzle ORM (type-safe database)
- Neon PostgreSQL (serverless)
- OpenID Connect (Replit Auth)
- Passport.js (authentication)

### AI & Storage
- OpenAI GPT-5 API
- Google Cloud Storage
- Server-Sent Events (SSE) for streaming

## 📋 Prerequisites

- Node.js 20+ (or 18+)
- PostgreSQL database access
- OpenAI API key
- Replit account (for OIDC authentication)

## ⚙️ Environment Variables

Required environment variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Session Management
SESSION_SECRET=your-random-secret-string

# OIDC Authentication (Replit)
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-replit-domain

# Object Storage (Google Cloud)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=your-bucket-id
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private
```

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/gaurishankar441/StudySageAI.git
   cd StudySageAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file or configure in Replit Secrets

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the app**
   Open `http://localhost:5000` in your browser

## 📂 Project Structure

```
.
├── client/                    # React frontend
│   └── src/
│       ├── components/        # UI components
│       │   ├── layout/       # App layout & navigation
│       │   ├── studyplan/    # Study plan wizard & views
│       │   ├── quiz/         # Quiz components
│       │   └── ui/           # shadcn UI components
│       ├── pages/            # Page components (routed)
│       ├── lib/              # Utils & query client
│       └── hooks/            # Custom React hooks
│
├── server/                    # Express backend
│   ├── services/             # Business logic
│   │   ├── aiService.ts      # AI operations manager
│   │   └── documentService.ts # Document processing
│   ├── routes.ts             # API endpoints
│   ├── storage.ts            # Database abstraction
│   ├── db.ts                 # Database connection
│   ├── openai.ts             # OpenAI API client
│   ├── replitAuth.ts         # OIDC authentication
│   ├── objectStorage.ts      # GCS integration
│   └── objectAcl.ts          # File access control
│
└── shared/                    # Shared types
    └── schema.ts              # Drizzle database schema
```

## 🔌 API Endpoints

### Authentication
```
GET  /api/auth/user         - Get authenticated user
```

### Documents
```
POST /api/documents/upload  - Upload file
POST /api/documents/by-url  - Add document by URL
POST /api/documents/from-upload - Process uploaded document
GET  /api/documents         - List user documents
GET  /api/documents/:id/status - Get processing status
```

### Chat & AI
```
POST /api/chats             - Create new chat
GET  /api/chats             - List user chats
GET  /api/chats/:id         - Get chat details
GET  /api/chats/:id/messages - Get chat history
POST /api/chats/:id/stream  - Stream AI response
POST /api/tutor/session     - Start tutor session
POST /api/docchat/session   - Start DocChat session
```

### Quiz
```
POST /api/quizzes           - Generate new quiz
GET  /api/quizzes           - List user quizzes
GET  /api/quizzes/:id       - Get quiz details
POST /api/quizzes/:id/attempts - Submit quiz attempt
```

### Study Plans
```
POST   /api/study-plans     - Create AI-powered study plan
GET    /api/study-plans     - List user plans
GET    /api/study-plans/:id - Get plan with tasks
PATCH  /api/study-plans/:id/tasks/:taskId - Update task status
```

### Notes & Flashcards
```
POST  /api/notes            - Create note from sources
GET   /api/notes            - List user notes
GET   /api/notes/:id        - Get note details
PATCH /api/notes/:id        - Update note
GET   /api/flashcards       - Get user flashcards
```

## 💻 Development

### Available Scripts

```bash
npm run dev      # Start dev server (frontend + backend)
npm run build    # Build for production
npm run start    # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Sync database schema
```

### Database Schema

The app uses Drizzle ORM with PostgreSQL. Key tables:
- `users` - User profiles
- `documents` - Uploaded files & content
- `chats` - Conversation sessions
- `messages` - Chat messages
- `quizzes` - Generated quizzes
- `quizQuestions` - Quiz questions
- `quizAttempts` - User submissions
- `studyPlans` - Study schedules
- `studyTasks` - Individual tasks
- `notes` - User notes
- `flashcards` - Spaced repetition cards
- `chunks` - RAG document chunks
- `sessions` - User sessions

## 🎯 Usage Examples

### Creating a Study Plan

1. Navigate to **Study Plan** page
2. Click **"Create Your First Study Plan"**
3. Complete the 4-step wizard:
   - **Basic Info**: Name, subject, topics, grade level
   - **Timeline**: Optional exam date
   - **Preferences**: Study intensity & session duration
   - **Features**: Select learning tools to include
4. AI generates a personalized schedule with tasks

### Taking a Quiz

1. Go to **Quiz** page
2. Click **"Generate New Quiz"**
3. Enter subject, topics, and difficulty
4. Answer questions and submit
5. View instant results with explanations

### Document Chat

1. Upload documents (PDF, DOCX) or add YouTube/web URLs
2. Wait for processing (status: "processing" → "ready")
3. Open **DocChat** and start a conversation
4. Ask questions about your documents
5. Get answers with source citations

## 🔐 Authentication

VaktaAI uses Replit's OpenID Connect (OIDC) authentication:
- Secure session-based auth with PostgreSQL storage
- 7-day session TTL
- Automatic user profile synchronization
- HTTP-only secure cookies

## 🌐 Deployment

### Using Replit

The app is optimized for Replit deployment:
1. Fork/import the repository
2. Configure environment variables in Secrets
3. Run `npm install` and `npm run db:push`
4. Click "Run" to start the application

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start
```

Make sure all environment variables are set in your hosting environment.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built on [Replit](https://replit.com)
- Powered by [OpenAI GPT-5](https://openai.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)

## 📞 Support

For issues and questions:
- Open an issue on [GitHub](https://github.com/gaurishankar441/StudySageAI/issues)
- Contact: [GitHub Profile](https://github.com/gaurishankar441)

---

**Built with ❤️ for students worldwide**
