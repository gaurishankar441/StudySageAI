export interface IntentPattern {
  keywords: string[];
  threshold: number;
}

export const INTENT_PATTERNS: Record<string, IntentPattern> = {
  request_explanation: {
    keywords: ['samjhao', 'explain', 'batao', 'sikha', 'teach', 'kya hai', 'what is', 'समझाओ', 'बताओ', 'सिखा'],
    threshold: 1
  },
  request_example: {
    keywords: ['example', 'udaharan', 'real life', 'application', 'practical', 'उदाहरण', 'example do'],
    threshold: 1
  },
  request_simplification: {
    keywords: ['samajh nahi', 'confused', 'aur simple', 'easier', 'नहीं समझ', 'समझ नहीं', 'zyada simple'],
    threshold: 1
  },
  ask_doubt: {
    keywords: ['doubt', 'question', 'why', 'kyu', 'kaise', 'how', 'क्यों', 'कैसे', 'doubt hai'],
    threshold: 1
  },
  request_practice: {
    keywords: ['practice', 'question', 'solve', 'abhyas', 'test me', 'अभ्यास', 'practice do', 'question do'],
    threshold: 1
  },
  submit_answer: {
    keywords: ['answer is', 'solution is', 'jawab', 'answer', 'option', 'जवाब', 'उत्तर'],
    threshold: 1
  },
  request_hint: {
    keywords: ['hint', 'help', 'stuck', 'madad', 'clue', 'मदद', 'hint do', 'help karo'],
    threshold: 1
  },
  request_solution: {
    keywords: ['solution', 'answer dikhao', 'hal', 'solve karo', 'हल', 'solution dikhao'],
    threshold: 1
  },
  change_topic: {
    keywords: ['next topic', 'change', 'different', 'doosra', 'alag', 'दूसरा', 'अलग', 'topic change'],
    threshold: 1
  },
  pause_session: {
    keywords: ['break', 'pause', 'ruk', 'stop', 'later', 'रुको', 'break chahiye', 'thak gaya'],
    threshold: 1
  },
  review_previous: {
    keywords: ['revise', 'review', 'previous', 'last', 'pehle wala', 'पहले वाला', 'revision'],
    threshold: 1
  },
  frustration: {
    keywords: ['mushkil', 'difficult', 'hard', 'nahi ho raha', "can't do", 'मुश्किल', 'कठिन', 'समझ नहीं आ रहा'],
    threshold: 1
  },
  needs_motivation: {
    keywords: ['fail', 'give up', 'not good', 'haar', 'हार', 'नहीं होगा', 'fail ho jaunga'],
    threshold: 1
  },
  celebration: {
    keywords: ['yay', 'got it', 'samajh aa gaya', 'easy now', 'समझ आ गया', 'ho gaya', 'हो गया', 'perfect'],
    threshold: 1
  },
  technical_issue: {
    keywords: ['not working', 'error', 'bug', 'problem', 'काम नहीं कर रहा', 'voice nahi', 'audio nahi'],
    threshold: 1
  },
  feature_query: {
    keywords: ['how to', 'kaise use', 'feature', 'progress kaise', 'कैसे देखूं', 'kaise dekhu'],
    threshold: 1
  },
  feedback: {
    keywords: ['good', 'bad', 'accha', 'बुरा', 'अच्छा', 'bahut accha', 'bekar', 'बेकार'],
    threshold: 1
  },
  casual_chat: {
    keywords: ['what is your name', 'who are you', 'naam kya', 'tumhara naam', 'तुम्हारा नाम', 'how are you'],
    threshold: 1
  },
  inappropriate: {
    keywords: [],
    threshold: 99
  }
};

export const CONTEXT_SHORTCUTS = {
  practiceMode: {
    numericAnswer: /^\d+(\.\d+)?(\s*(m\/s|kg|m|s|N|J|cal|mol|atm))?$/i,
    mcqAnswer: /^option\s*[a-d]$/i,
    booleanAnswer: /^(true|false|yes|no|haan|nahi|ha|na)$/i
  }
};
