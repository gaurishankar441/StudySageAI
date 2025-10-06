export interface IntentProsodyConfig {
  pitch: number;
  pace: number;
  loudness: number;
  pauseMultiplier: number;
  emphasisWords: string[];
}

export const INTENT_PROSODY_MAP: Record<string, IntentProsodyConfig> = {
  request_explanation: {
    pitch: -0.05,
    pace: 0.95,
    loudness: 1.0,
    pauseMultiplier: 1.2,
    emphasisWords: ['because', 'reason', 'therefore', 'thus', 'so', 'kyunki', 'isliye']
  },
  
  request_example: {
    pitch: 0.08,
    pace: 1.05,
    loudness: 1.05,
    pauseMultiplier: 1.0,
    emphasisWords: ['example', 'instance', 'like', 'such as', 'udaharan', 'jaise']
  },
  
  request_simplification: {
    pitch: -0.08,
    pace: 0.9,
    loudness: 0.95,
    pauseMultiplier: 1.3,
    emphasisWords: ['simple', 'easy', 'basic', 'means', 'matlab', 'saral']
  },
  
  request_definition: {
    pitch: -0.03,
    pace: 0.93,
    loudness: 1.0,
    pauseMultiplier: 1.1,
    emphasisWords: ['definition', 'defined as', 'means', 'paribhasha', 'matlab']
  },
  
  request_step_by_step: {
    pitch: 0.0,
    pace: 0.92,
    loudness: 1.0,
    pauseMultiplier: 1.4,
    emphasisWords: ['step', 'first', 'next', 'then', 'finally', 'pehle', 'phir', 'ant mein']
  },
  
  request_formula: {
    pitch: -0.05,
    pace: 0.88,
    loudness: 1.05,
    pauseMultiplier: 1.5,
    emphasisWords: ['formula', 'equation', 'equals', 'sutra', 'samikaran']
  },
  
  submit_answer: {
    pitch: 0.1,
    pace: 1.0,
    loudness: 1.05,
    pauseMultiplier: 0.8,
    emphasisWords: ['correct', 'wrong', 'right', 'sahi', 'galat', 'excellent']
  },
  
  request_hint: {
    pitch: 0.05,
    pace: 1.05,
    loudness: 1.0,
    pauseMultiplier: 1.0,
    emphasisWords: ['hint', 'clue', 'think about', 'consider', 'socho', 'vichar karo']
  },
  
  ask_doubt: {
    pitch: -0.03,
    pace: 0.95,
    loudness: 0.98,
    pauseMultiplier: 1.1,
    emphasisWords: ['because', 'actually', 'let me explain', 'see', 'dekho', 'samjho']
  },
  
  request_elaboration: {
    pitch: 0.0,
    pace: 1.0,
    loudness: 1.0,
    pauseMultiplier: 1.1,
    emphasisWords: ['more', 'detail', 'further', 'specifically', 'adhik', 'vistaar se']
  },
  
  confusion: {
    pitch: -0.08,
    pace: 0.88,
    loudness: 0.95,
    pauseMultiplier: 1.4,
    emphasisWords: ['let me clarify', 'understand', 'see', 'simple', 'samjho', 'dekho']
  },
  
  frustration: {
    pitch: -0.1,
    pace: 0.85,
    loudness: 0.9,
    pauseMultiplier: 1.5,
    emphasisWords: ['ok', 'alright', 'together', 'step by step', 'thik hai', 'saath mein']
  },
  
  greeting: {
    pitch: 0.12,
    pace: 1.1,
    loudness: 1.08,
    pauseMultiplier: 0.9,
    emphasisWords: ['hello', 'hi', 'welcome', 'great', 'namaste', 'swagat']
  },
  
  request_practice: {
    pitch: 0.08,
    pace: 1.05,
    loudness: 1.05,
    pauseMultiplier: 1.0,
    emphasisWords: ['try', 'practice', 'solve', 'attempt', 'koshish', 'abhyas']
  },
  
  request_summary: {
    pitch: 0.0,
    pace: 1.08,
    loudness: 1.02,
    pauseMultiplier: 1.2,
    emphasisWords: ['summary', 'key points', 'main', 'important', 'mukhya', 'mahatva']
  },
  
  request_analogy: {
    pitch: 0.05,
    pace: 1.0,
    loudness: 1.0,
    pauseMultiplier: 1.1,
    emphasisWords: ['like', 'similar', 'imagine', 'think of', 'jaise', 'socho']
  },
  
  appreciation: {
    pitch: 0.15,
    pace: 1.08,
    loudness: 1.1,
    pauseMultiplier: 0.9,
    emphasisWords: ['great', 'excellent', 'wonderful', 'amazing', 'badhiya', 'shandar']
  },
  
  off_topic: {
    pitch: 0.0,
    pace: 1.0,
    loudness: 1.0,
    pauseMultiplier: 1.0,
    emphasisWords: ['focus', 'topic', 'study', 'vishay', 'dhyan']
  },
  
  end_session: {
    pitch: 0.05,
    pace: 1.0,
    loudness: 1.0,
    pauseMultiplier: 1.1,
    emphasisWords: ['bye', 'goodbye', 'later', 'alvida', 'phir milenge']
  }
};

export const INTENT_PROSODY_DEFAULT: IntentProsodyConfig = {
  pitch: 0.0,
  pace: 1.0,
  loudness: 1.0,
  pauseMultiplier: 1.0,
  emphasisWords: []
};
