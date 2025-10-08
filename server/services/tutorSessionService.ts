// Tutor Session Orchestration Service
// Manages 7-phase conversation flow, adaptive learning, and state machine

import { storage } from '../storage';
import { InsertTutorSession, TutorSession, User } from '@shared/schema';
import { 
  selectPersonaBySubject,
  getPersonaCatchphrase,
  TUTOR_PERSONAS,
  PersonaConfig
} from '../config/tutorPersonas';
import {
  getGreetingTemplate,
  getRapportTemplate,
  getTeachingTemplate,
  getPracticeTemplate,
  getFeedbackTemplate,
  getClosureTemplate,
  fillTemplate,
  TemplateVariant
} from '../config/phaseTemplates';

// Phase progression order
export const PHASE_ORDER = [
  'greeting',
  'rapport',
  'assessment',
  'teaching',
  'practice',
  'feedback',
  'closure'
] as const;

export type Phase = typeof PHASE_ORDER[number];

// Student level classification
export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

// Assessment result
export interface AssessmentResult {
  score: number; // 0-100
  level: StudentLevel;
  misconceptions: string[];
  strengths: string[];
}

// Session context for resume
export interface SessionContext {
  currentPhase: Phase;
  progress: number;
  lastQuestion?: string;
  lastAnswer?: string;
  checkpointsPassed: number;
  adaptiveMetrics: {
    diagnosticScore: number;
    misconceptions: string[];
    strongConcepts: string[];
  };
}

export class TutorSessionService {
  // Initialize new session with profile data
  async initializeSession(
    chatId: string,
    userId: string,
    subject: string,
    topic: string,
    user: User,
    personaId?: string // Optional: auto-select if not provided
  ): Promise<TutorSession> {
    // Select persona (use provided or auto-select based on subject)
    const persona = personaId 
      ? TUTOR_PERSONAS[personaId] || selectPersonaBySubject(subject)
      : selectPersonaBySubject(subject);
    
    // Get chat to extract language preference
    const chat = await storage.getChat(chatId);
    const chatLanguage = chat?.language || 'en';
    
    // Convert chat language code to preferred language format
    // 'en' → 'english' (pure English)
    // 'hi' → 'hinglish' (Hindi with English mix)
    const preferredLanguage = chatLanguage === 'hi' ? 'hinglish' : 'english';
    
    // Create profile snapshot
    const profileSnapshot = {
      firstName: user.firstName || 'Student',
      lastName: user.lastName || '',
      currentClass: user.currentClass || 'Class 12',
      examTarget: user.examTarget || 'JEE',
      educationBoard: user.educationBoard || 'CBSE',
      subjects: user.subjects || [subject],
      preferredLanguage
    };
    
    // Create session
    const session: InsertTutorSession = {
      chatId,
      userId,
      currentPhase: 'greeting',
      personaId: persona.id,
      subject,
      topic,
      level: 'beginner', // Will update after assessment
      progress: 0,
      profileSnapshot,
      adaptiveMetrics: {
        diagnosticScore: 0,
        checkpointsPassed: 0,
        misconceptions: [],
        strongConcepts: []
      }
    };
    
    return await storage.createTutorSession(session);
  }
  
  // Get or create session
  async getOrCreateSession(
    chatId: string,
    userId: string,
    subject: string,
    topic: string,
    user: User
  ): Promise<TutorSession> {
    const existing = await storage.getTutorSession(chatId);
    if (existing) {
      return existing;
    }
    
    return await this.initializeSession(chatId, userId, subject, topic, user);
  }
  
  // Get current phase template
  getCurrentPhaseTemplate(session: TutorSession): TemplateVariant {
    const timeOfDay = this.getTimeOfDay();
    
    switch (session.currentPhase) {
      case 'greeting':
        return getGreetingTemplate(timeOfDay);
      
      case 'rapport':
        const examTarget = session.profileSnapshot?.examTarget || 'JEE';
        return getRapportTemplate(examTarget);
      
      case 'teaching':
        return getTeachingTemplate('hook');
      
      case 'practice':
        return getPracticeTemplate('problem_introduction');
      
      case 'feedback':
        const performance = session.progress >= 70 ? 'strong_performance'
          : session.progress >= 40 ? 'good_progress'
          : 'needs_practice';
        return getFeedbackTemplate(performance);
      
      case 'closure':
        return getClosureTemplate(session.progress >= 60);
      
      default:
        return {
          text: 'Chalo aage badhte hain!',
          emotion: 'friendly'
        };
    }
  }
  
  // Fill template with session data
  fillSessionTemplate(template: TemplateVariant, session: TutorSession, additionalVars: Record<string, string> = {}): string {
    const persona = TUTOR_PERSONAS[session.personaId];
    const profile = session.profileSnapshot || {};
    
    const variables = {
      studentName: profile.firstName || 'Student',
      teacherName: persona?.name || 'Teacher',
      subject: session.subject || '',
      topic: session.topic || '',
      currentClass: profile.currentClass || 'Class 12',
      examTarget: profile.examTarget || 'JEE',
      checkpointsPassed: String(session.adaptiveMetrics?.checkpointsPassed || 0),
      ...additionalVars
    };
    
    return fillTemplate(template.text, variables);
  }
  
  // Advance to next phase
  async advancePhase(chatId: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const currentIndex = PHASE_ORDER.indexOf(session.currentPhase as Phase);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      return session; // Already at last phase
    }
    
    const nextPhase = PHASE_ORDER[currentIndex + 1];
    const newProgress = Math.round(((currentIndex + 1) / PHASE_ORDER.length) * 100);
    
    return await storage.updateTutorSession(chatId, {
      currentPhase: nextPhase,
      progress: newProgress
    });
  }
  
  // Record assessment result and adjust level
  async recordAssessment(
    chatId: string,
    assessmentResult: AssessmentResult
  ): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      diagnosticScore: assessmentResult.score,
      misconceptions: assessmentResult.misconceptions,
      strongConcepts: assessmentResult.strengths
    };
    
    return await storage.updateTutorSession(chatId, {
      level: assessmentResult.level,
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Record checkpoint passed
  async recordCheckpoint(chatId: string, checkpointName: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const checkpointsPassed = (session.adaptiveMetrics?.checkpointsPassed || 0) + 1;
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      checkpointsPassed
    };
    
    // Increase progress by 5% for each checkpoint
    const newProgress = Math.min(session.progress + 5, 100);
    
    return await storage.updateTutorSession(chatId, {
      progress: newProgress,
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Add misconception
  async recordMisconception(chatId: string, misconception: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const misconceptions = session.adaptiveMetrics?.misconceptions || [];
    if (!misconceptions.includes(misconception)) {
      misconceptions.push(misconception);
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      misconceptions
    };
    
    return await storage.updateTutorSession(chatId, {
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Add strong concept
  async recordStrength(chatId: string, concept: string): Promise<TutorSession> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const strongConcepts = session.adaptiveMetrics?.strongConcepts || [];
    if (!strongConcepts.includes(concept)) {
      strongConcepts.push(concept);
    }
    
    const updatedMetrics = {
      ...session.adaptiveMetrics,
      strongConcepts
    };
    
    return await storage.updateTutorSession(chatId, {
      adaptiveMetrics: updatedMetrics
    });
  }
  
  // Generate resume context
  async generateResumeContext(chatId: string): Promise<string> {
    const session = await storage.getTutorSession(chatId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const persona = TUTOR_PERSONAS[session.personaId];
    const profile = session.profileSnapshot || {};
    const catchphrase = getPersonaCatchphrase(session.personaId);
    
    const resumeText = `${catchphrase} ${profile.firstName}! Aapka session resume kar rahe hain! 🔄

Pichli baar hum ruk gaye the: ${session.currentPhase} phase mein
Progress: ${session.progress}%
Topic: ${session.topic}

Checkpoints cleared: ${session.adaptiveMetrics?.checkpointsPassed || 0}
Level: ${session.level}

Chalo wahi se continue karte hain!`;

    return resumeText;
  }
  
  // Check if phase should auto-advance
  shouldAutoAdvance(session: TutorSession, messageCount: number): boolean {
    // Greeting phase: Auto-advance after 1-2 messages
    if (session.currentPhase === 'greeting' && messageCount >= 2) {
      return true;
    }
    
    // Rapport phase: Auto-advance after student responds
    if (session.currentPhase === 'rapport' && messageCount >= 4) {
      return true;
    }
    
    return false;
  }
  
  // Get time of day
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  
  // Get persona for session
  getPersona(session: TutorSession): PersonaConfig {
    return TUTOR_PERSONAS[session.personaId] || TUTOR_PERSONAS.priya;
  }
  
  // Analyze student response for level assessment
  analyzeResponse(response: string, expectedAnswer?: string): AssessmentResult {
    const normalized = response.toLowerCase().trim();
    
    // Simple heuristic assessment
    let score = 0;
    let level: StudentLevel = 'beginner';
    const misconceptions: string[] = [];
    const strengths: string[] = [];
    
    // Self-assessment patterns
    if (normalized.includes('naya') || normalized.includes('pehli baar')) {
      score = 0;
      level = 'beginner';
    } else if (normalized.includes('thoda') || normalized.includes('yaad nahi')) {
      score = 30;
      level = 'beginner';
    } else if (normalized.includes('basics clear') || normalized.includes('practice')) {
      score = 60;
      level = 'intermediate';
    } else if (normalized.includes('confident') || normalized.includes('tough questions')) {
      score = 90;
      level = 'advanced';
      strengths.push('Strong conceptual foundation');
    }
    
    // If expected answer provided, do simple matching
    if (expectedAnswer) {
      const expectedNorm = expectedAnswer.toLowerCase();
      if (normalized.includes(expectedNorm)) {
        score = Math.max(score, 70);
        level = score >= 70 ? 'intermediate' : 'beginner';
        strengths.push('Correct understanding');
      } else {
        misconceptions.push('Concept clarity needed');
      }
    }
    
    return {
      score,
      level,
      misconceptions,
      strengths
    };
  }
}

export const tutorSessionService = new TutorSessionService();
