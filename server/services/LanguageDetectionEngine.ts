export type DetectedLanguage = 'hindi' | 'hinglish' | 'english';
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number; // 0-1
  confidenceLevel: ConfidenceLevel;
  analysis: {
    lexical: LexicalAnalysis;
    syntactic: SyntacticAnalysis;
    statistical: StatisticalAnalysis;
    contextual?: ContextualAnalysis;
  };
  detectionMethod: 'multi_layer' | 'fallback';
  processingTime: number;
}

interface LexicalAnalysis {
  devanagariCount: number;
  latinCount: number;
  devanagariRatio: number;
  hindiWords: string[];
  englishWords: string[];
  mixedWords: string[];
}

interface SyntacticAnalysis {
  sentenceStructure: 'hindi' | 'english' | 'mixed';
  grammarPatterns: string[];
  wordOrder: 'SOV' | 'SVO' | 'mixed'; // Subject-Object-Verb vs Subject-Verb-Object
}

interface StatisticalAnalysis {
  charDistribution: { [key: string]: number };
  wordFrequency: { [key: string]: number };
  ngramPatterns: string[];
  languageScore: { hindi: number; english: number; hinglish: number };
}

interface ContextualAnalysis {
  conversationHistory: DetectedLanguage[];
  userPreference?: DetectedLanguage;
  topicLanguage?: DetectedLanguage;
  consistencyScore: number;
}

export class LanguageDetectionEngine {
  // Devanagari Unicode range
  private readonly DEVANAGARI_REGEX = /[\u0900-\u097F]/g;
  private readonly LATIN_REGEX = /[a-zA-Z]/g;
  
  // Common Hindi words (romanized and Devanagari)
  private readonly HINDI_WORDS = new Set([
    'hai', 'hain', 'ka', 'ki', 'ke', 'ko', 'se', 'me', 'par', 'aur',
    'kya', 'kaise', 'kyu', 'kyun', 'kab', 'kaha', 'kaun', 'kitna',
    'yeh', 'voh', 'woh', 'is', 'us', 'in', 'un', 'ye', 'wo',
    'main', 'tu', 'tum', 'aap', 'hum', 'unka', 'uska', 'mera', 'tera', 'tumhara',
    'samajh', 'samjha', 'samjhe', 'nahi', 'nahin', 'tha', 'thi', 'the',
    'dekho', 'dekha', 'chalo', 'acha', 'accha', 'theek', 'thik', 'sahi',
    'bilkul', 'bahut', 'bohot', 'jyada', 'zyada', 'kam', 'kuch', 'koi',
    'sab', 'sabhi', 'har', 'ek', 'do', 'teen', 'char', 'paanch',
    'क्या', 'है', 'हैं', 'का', 'की', 'के', 'को', 'से', 'में', 'पर', 'और',
    'यह', 'वह', 'इस', 'उस', 'मैं', 'तुम', 'आप', 'हम', 'समझ', 'नहीं'
  ]);
  
  // Common English technical/academic words
  private readonly ENGLISH_WORDS = new Set([
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'ought',
    'velocity', 'acceleration', 'force', 'momentum', 'energy', 'power',
    'equation', 'formula', 'theorem', 'proof', 'solution', 'calculate',
    'physics', 'chemistry', 'biology', 'mathematics', 'science'
  ]);
  
  // Common Hinglish patterns (code-switching indicators)
  private readonly HINGLISH_PATTERNS = [
    /\b(samajh|samjha)\s+(aa|gaya|gayi)\b/i,
    /\b(clear|understand)\s+(hai|ho)\b/i,
    /\b(dekho|chalo|acha)\s+[a-z]+\b/i,
    /\b[a-z]+\s+(hai|hain|tha|thi|the)\b/i,
    /\b(yeh|voh|is|us)\s+[a-z]+\b/i,
  ];

  /**
   * Main detection method - Multi-layer analysis
   */
  async detectLanguage(
    text: string,
    context?: {
      conversationHistory?: Array<{ language: DetectedLanguage }>;
      userPreference?: DetectedLanguage;
      topic?: string;
    }
  ): Promise<LanguageDetectionResult> {
    const startTime = Date.now();
    
    try {
      // Layer 1: Lexical Analysis
      const lexical = this.analyzeLexical(text);
      
      // Layer 2: Syntactic Analysis
      const syntactic = this.analyzeSyntactic(text);
      
      // Layer 3: Statistical Analysis
      const statistical = this.analyzeStatistical(text);
      
      // Layer 4: Contextual Analysis (if context provided)
      const contextual = context ? this.analyzeContextual(text, context) : undefined;
      
      // Combine all layers for final decision
      const finalDecision = this.combineAnalysis(lexical, syntactic, statistical, contextual);
      
      const processingTime = Date.now() - startTime;
      
      return {
        ...finalDecision,
        analysis: { lexical, syntactic, statistical, contextual },
        detectionMethod: 'multi_layer',
        processingTime
      };
      
    } catch (error) {
      console.error('[LANG DETECTION] Multi-layer analysis failed, using fallback:', error);
      return this.fallbackDetection(text, Date.now() - startTime);
    }
  }

  /**
   * Layer 1: Lexical Analysis - Script and word-level detection
   */
  private analyzeLexical(text: string): LexicalAnalysis {
    const devanagariChars = text.match(this.DEVANAGARI_REGEX) || [];
    const latinChars = text.match(this.LATIN_REGEX) || [];
    const totalChars = devanagariChars.length + latinChars.length;
    
    const devanagariCount = devanagariChars.length;
    const latinCount = latinChars.length;
    const devanagariRatio = totalChars > 0 ? devanagariCount / totalChars : 0;
    
    // Word analysis
    const words = text.toLowerCase().split(/\s+/);
    const hindiWords: string[] = [];
    const englishWords: string[] = [];
    const mixedWords: string[] = [];
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\u0900-\u097Fa-zA-Z]/g, '');
      if (!cleanWord) continue;
      
      const hasDevanagari = this.DEVANAGARI_REGEX.test(cleanWord);
      const hasLatin = this.LATIN_REGEX.test(cleanWord);
      
      if (hasDevanagari && !hasLatin) {
        hindiWords.push(cleanWord);
      } else if (!hasDevanagari && hasLatin) {
        if (this.HINDI_WORDS.has(cleanWord)) {
          hindiWords.push(cleanWord);
        } else if (this.ENGLISH_WORDS.has(cleanWord)) {
          englishWords.push(cleanWord);
        } else {
          // Check length and common patterns
          if (cleanWord.length <= 3) {
            englishWords.push(cleanWord);
          } else {
            mixedWords.push(cleanWord);
          }
        }
      } else if (hasDevanagari && hasLatin) {
        mixedWords.push(cleanWord);
      }
    }
    
    return {
      devanagariCount,
      latinCount,
      devanagariRatio,
      hindiWords,
      englishWords,
      mixedWords
    };
  }

  /**
   * Layer 2: Syntactic Analysis - Grammar and sentence structure
   */
  private analyzeSyntactic(text: string): SyntacticAnalysis {
    const sentences = text.split(/[.!?।]+/).filter(s => s.trim().length > 0);
    
    let hindiStructureCount = 0;
    let englishStructureCount = 0;
    const grammarPatterns: string[] = [];
    
    for (const sentence of sentences) {
      const words = sentence.trim().toLowerCase().split(/\s+/);
      
      // Hindi typically uses SOV (Subject-Object-Verb) structure
      // English uses SVO (Subject-Verb-Object) structure
      
      // Check for Hindi verb endings at end of sentence (common in SOV)
      const lastWord = words[words.length - 1];
      if (lastWord && /(?:ta|ti|te|ga|gi|ge|na|ni|ne|ya|yi|ye)$/.test(lastWord)) {
        hindiStructureCount++;
        grammarPatterns.push('hindi_verb_ending');
      }
      
      // Check for Hindi postpositions (ka, ki, ke, ko, se, me, par)
      const hasPostpositions = words.some(w => ['ka', 'ki', 'ke', 'ko', 'se', 'me', 'par'].includes(w));
      if (hasPostpositions) {
        hindiStructureCount++;
        grammarPatterns.push('hindi_postposition');
      }
      
      // Check for English auxiliary verbs early in sentence (common in SVO)
      const hasEarlyAuxiliary = words.slice(0, 3).some(w => 
        ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'will', 'would', 'can', 'could'].includes(w)
      );
      if (hasEarlyAuxiliary) {
        englishStructureCount++;
        grammarPatterns.push('english_auxiliary');
      }
      
      // Check for Hinglish code-switching patterns
      for (const pattern of this.HINGLISH_PATTERNS) {
        if (pattern.test(sentence)) {
          grammarPatterns.push('hinglish_pattern');
          break;
        }
      }
    }
    
    const sentenceStructure: 'hindi' | 'english' | 'mixed' = 
      hindiStructureCount > englishStructureCount * 1.5 ? 'hindi' :
      englishStructureCount > hindiStructureCount * 1.5 ? 'english' : 'mixed';
    
    const wordOrder: 'SOV' | 'SVO' | 'mixed' =
      hindiStructureCount > englishStructureCount ? 'SOV' :
      englishStructureCount > hindiStructureCount ? 'SVO' : 'mixed';
    
    return {
      sentenceStructure,
      grammarPatterns,
      wordOrder
    };
  }

  /**
   * Layer 3: Statistical Analysis - Character distribution and patterns
   */
  private analyzeStatistical(text: string): StatisticalAnalysis {
    const chars = text.toLowerCase().split('');
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // Character distribution
    const charDistribution: { [key: string]: number } = {};
    for (const char of chars) {
      charDistribution[char] = (charDistribution[char] || 0) + 1;
    }
    
    // Word frequency
    const wordFrequency: { [key: string]: number } = {};
    for (const word of words) {
      const cleanWord = word.replace(/[^\u0900-\u097Fa-zA-Z]/g, '');
      if (cleanWord) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;
      }
    }
    
    // N-gram patterns (bigrams and trigrams)
    const ngramPatterns: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (this.isCommonHindiNgram(bigram)) {
        ngramPatterns.push(`hindi_bigram:${bigram}`);
      }
    }
    
    // Language scoring based on statistical features
    const hindiIndicators = Object.keys(wordFrequency).filter(w => this.HINDI_WORDS.has(w)).length;
    const englishIndicators = Object.keys(wordFrequency).filter(w => this.ENGLISH_WORDS.has(w)).length;
    const totalIndicators = hindiIndicators + englishIndicators;
    
    const languageScore = {
      hindi: totalIndicators > 0 ? hindiIndicators / totalIndicators : 0,
      english: totalIndicators > 0 ? englishIndicators / totalIndicators : 0,
      hinglish: 0
    };
    
    // Hinglish score (code-mixing indicator)
    if (hindiIndicators > 0 && englishIndicators > 0) {
      const mixingRatio = Math.min(hindiIndicators, englishIndicators) / Math.max(hindiIndicators, englishIndicators);
      languageScore.hinglish = mixingRatio * 0.8 + 0.2; // Boost if both present
    }
    
    return {
      charDistribution,
      wordFrequency,
      ngramPatterns,
      languageScore
    };
  }

  /**
   * Layer 4: Contextual Analysis - Conversation history and user preferences
   */
  private analyzeContextual(
    text: string,
    context: {
      conversationHistory?: Array<{ language: DetectedLanguage }>;
      userPreference?: DetectedLanguage;
      topic?: string;
    }
  ): ContextualAnalysis {
    const conversationHistory = context.conversationHistory?.map(h => h.language) || [];
    
    // Calculate consistency score
    let consistencyScore = 0;
    if (conversationHistory.length > 0) {
      const recentLanguages = conversationHistory.slice(-5); // Last 5 messages
      const languageCounts: { [key: string]: number } = {};
      
      for (const lang of recentLanguages) {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      }
      
      const mostFrequent = Object.keys(languageCounts).reduce((a, b) => 
        languageCounts[a] > languageCounts[b] ? a : b
      );
      
      consistencyScore = languageCounts[mostFrequent] / recentLanguages.length;
    }
    
    // Topic-based language inference
    let topicLanguage: DetectedLanguage | undefined;
    if (context.topic) {
      const topicLower = context.topic.toLowerCase();
      if (/physics|chemistry|biology|mathematics|science/.test(topicLower)) {
        topicLanguage = 'english'; // Technical subjects lean English
      }
    }
    
    return {
      conversationHistory,
      userPreference: context.userPreference,
      topicLanguage,
      consistencyScore
    };
  }

  /**
   * Combine all layers for final decision
   */
  private combineAnalysis(
    lexical: LexicalAnalysis,
    syntactic: SyntacticAnalysis,
    statistical: StatisticalAnalysis,
    contextual?: ContextualAnalysis
  ): { language: DetectedLanguage; confidence: number; confidenceLevel: ConfidenceLevel } {
    
    // Scoring weights for each layer
    const LEXICAL_WEIGHT = 0.3;
    const SYNTACTIC_WEIGHT = 0.25;
    const STATISTICAL_WEIGHT = 0.25;
    const CONTEXTUAL_WEIGHT = 0.2;
    
    // Calculate scores for each language
    const scores = { hindi: 0, hinglish: 0, english: 0 };
    
    // Layer 1: Lexical scoring
    if (lexical.devanagariRatio > 0.6) {
      scores.hindi += LEXICAL_WEIGHT * 1.0;
    } else if (lexical.devanagariRatio > 0.2) {
      scores.hinglish += LEXICAL_WEIGHT * 1.0;
    } else {
      const hindiWordRatio = lexical.hindiWords.length / (lexical.hindiWords.length + lexical.englishWords.length + 1);
      if (hindiWordRatio > 0.5) {
        scores.hinglish += LEXICAL_WEIGHT * 0.8;
        scores.hindi += LEXICAL_WEIGHT * 0.2;
      } else {
        scores.english += LEXICAL_WEIGHT * 1.0;
      }
    }
    
    // Layer 2: Syntactic scoring
    if (syntactic.sentenceStructure === 'hindi') {
      scores.hindi += SYNTACTIC_WEIGHT * 0.7;
      scores.hinglish += SYNTACTIC_WEIGHT * 0.3;
    } else if (syntactic.sentenceStructure === 'english') {
      scores.english += SYNTACTIC_WEIGHT * 1.0;
    } else {
      scores.hinglish += SYNTACTIC_WEIGHT * 1.0;
    }
    
    // Layer 3: Statistical scoring
    scores.hindi += STATISTICAL_WEIGHT * statistical.languageScore.hindi;
    scores.english += STATISTICAL_WEIGHT * statistical.languageScore.english;
    scores.hinglish += STATISTICAL_WEIGHT * statistical.languageScore.hinglish;
    
    // Layer 4: Contextual scoring (if available)
    if (contextual) {
      const contextBoost = CONTEXTUAL_WEIGHT * contextual.consistencyScore;
      
      if (contextual.userPreference) {
        scores[contextual.userPreference] += contextBoost * 0.6;
      }
      
      if (contextual.conversationHistory.length > 0) {
        const recentLang = contextual.conversationHistory[contextual.conversationHistory.length - 1];
        scores[recentLang] += contextBoost * 0.4;
      }
    }
    
    // Determine winner
    const language = Object.keys(scores).reduce((a, b) => 
      scores[a as DetectedLanguage] > scores[b as DetectedLanguage] ? a : b
    ) as DetectedLanguage;
    
    const confidence = scores[language];
    
    // Map confidence to level
    const confidenceLevel: ConfidenceLevel = 
      confidence >= 0.9 ? 'very_high' :
      confidence >= 0.75 ? 'high' :
      confidence >= 0.6 ? 'medium' : 'low';
    
    return { language, confidence, confidenceLevel };
  }

  /**
   * Fallback detection (simple regex-based, similar to original)
   */
  private fallbackDetection(text: string, processingTime: number): LanguageDetectionResult {
    const hindiChars = text.match(this.DEVANAGARI_REGEX);
    const hindiCount = hindiChars ? hindiChars.length : 0;
    
    let language: DetectedLanguage;
    let confidence: number;
    
    if (hindiCount > 10) {
      language = 'hindi';
      confidence = 0.7;
    } else if (hindiCount > 3) {
      language = 'hinglish';
      confidence = 0.6;
    } else {
      language = 'english';
      confidence = 0.7;
    }
    
    return {
      language,
      confidence,
      confidenceLevel: confidence >= 0.75 ? 'high' : 'medium',
      analysis: {
        lexical: { devanagariCount: hindiCount, latinCount: 0, devanagariRatio: 0, hindiWords: [], englishWords: [], mixedWords: [] },
        syntactic: { sentenceStructure: 'mixed', grammarPatterns: [], wordOrder: 'mixed' },
        statistical: { charDistribution: {}, wordFrequency: {}, ngramPatterns: [], languageScore: { hindi: 0, english: 0, hinglish: 0 } }
      },
      detectionMethod: 'fallback',
      processingTime
    };
  }

  /**
   * Helper: Check if bigram is common Hindi n-gram
   */
  private isCommonHindiNgram(bigram: string): boolean {
    const commonHindiBigrams = [
      'kya hai', 'samajh aa', 'aa gaya', 'ho gaya', 'kaise hai',
      'dekho yeh', 'chalo ab', 'theek hai', 'sahi hai', 'clear hai'
    ];
    return commonHindiBigrams.includes(bigram);
  }

  /**
   * Get language name in user-friendly format
   */
  getLanguageName(lang: DetectedLanguage): string {
    const names = {
      hindi: 'Hindi',
      hinglish: 'Hinglish (Hindi-English mix)',
      english: 'English'
    };
    return names[lang];
  }

  /**
   * Quick detection (lexical only, for performance-critical paths)
   */
  quickDetect(text: string): DetectedLanguage {
    const hindiChars = text.match(this.DEVANAGARI_REGEX);
    const hindiCount = hindiChars ? hindiChars.length : 0;
    
    if (hindiCount > 10) return 'hindi';
    if (hindiCount > 3) return 'hinglish';
    return 'english';
  }
}

export const languageDetectionEngine = new LanguageDetectionEngine();
