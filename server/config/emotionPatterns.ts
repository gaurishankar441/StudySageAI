export type EmotionalState = 
  | 'confident'      // Student feels confident, wants to move forward
  | 'confused'       // Student is confused, needs clarification
  | 'frustrated'     // Student is frustrated, needs encouragement
  | 'bored'          // Student is disengaged, needs stimulation
  | 'neutral';       // Default state, balanced approach

export interface EmotionPattern {
  keywords: string[];
  phrases: string[];
  weight: number;
}

export const EMOTION_PATTERNS: Record<EmotionalState, EmotionPattern> = {
  confident: {
    keywords: [
      'got it', 'clear', 'easy', 'simple', 'understand', 'samajh gaya', 
      'samajh gayi', 'ho gaya', 'acha', 'sahi', 'theek', 'perfect',
      'next', 'more', 'aur', 'continue', 'chalo', 'ready'
    ],
    phrases: [
      'i got it',
      'makes sense',
      'i understand',
      'samajh aa gaya',
      'ho gaya yeh',
      'acha samajh gaya',
      'clear hai',
      'easy hai yeh',
      'next question',
      'aur do',
      'i can do this'
    ],
    weight: 0.85
  },

  confused: {
    keywords: [
      'confused', 'don\'t understand', 'nahi samajh', 'samajh nahi',
      'kya hai', 'kaise', 'kyu', 'why', 'how', 'what', 'unclear',
      'confusing', 'difficult', 'hard', 'mushkil', 'complex'
    ],
    phrases: [
      'i don\'t understand',
      'not clear',
      'confusing',
      'samajh nahi aaya',
      'samajh nahi aa raha',
      'kya matlab',
      'kaise hoga',
      'kyu hai yeh',
      'yeh kya hai',
      'explain again',
      'phir se samjhao',
      'what does this mean'
    ],
    weight: 0.90
  },

  frustrated: {
    keywords: [
      'frustrated', 'stuck', 'giving up', 'can\'t', 'impossible',
      'nahi ho raha', 'mushkil hai', 'bahut hard', 'uff', 'argh',
      'too hard', 'too difficult', 'can\'t do', 'hate', 'boring'
    ],
    phrases: [
      'i give up',
      'this is too hard',
      'i can\'t do this',
      'nahi ho raha',
      'bahut mushkil hai',
      'samajh hi nahi aa raha',
      'kuch nahi ho raha',
      'i\'m stuck',
      'phasa hua hoon',
      'bore ho gaya',
      'frustrated hoon'
    ],
    weight: 0.95
  },

  bored: {
    keywords: [
      'bored', 'boring', 'bore', 'slow', 'again', 'already know',
      'pata hai', 'jaanta hoon', 'jaanti hoon', 'simple', 'basic',
      'repeat', 'phir se', 'same'
    ],
    phrases: [
      'i\'m bored',
      'this is boring',
      'i already know',
      'too easy',
      'bahut simple hai',
      'pata hai mujhe',
      'jaanta hoon main',
      'phir se wahi',
      'same thing',
      'can we move on',
      'skip this'
    ],
    weight: 0.80
  },

  neutral: {
    keywords: [],
    phrases: [],
    weight: 0.50
  }
};

export const EMOTION_RESPONSE_MODIFIERS = {
  confident: {
    tone: 'encouraging and challenging',
    suggestedActions: ['increase difficulty', 'move to next concept', 'test with harder problems'],
    responseLength: 'concise',
    encouragement: 'high'
  },
  
  confused: {
    tone: 'patient and clarifying',
    suggestedActions: ['simplify explanation', 'provide examples', 'break into smaller steps'],
    responseLength: 'detailed',
    encouragement: 'medium'
  },
  
  frustrated: {
    tone: 'empathetic and supportive',
    suggestedActions: ['normalize difficulty', 'offer break', 'simplify drastically', 'provide encouragement'],
    responseLength: 'brief and supportive',
    encouragement: 'very high'
  },
  
  bored: {
    tone: 'engaging and stimulating',
    suggestedActions: ['increase difficulty', 'introduce new angle', 'add interesting facts', 'challenge'],
    responseLength: 'dynamic and varied',
    encouragement: 'medium'
  },
  
  neutral: {
    tone: 'balanced and professional',
    suggestedActions: ['standard teaching', 'assess understanding', 'provide examples'],
    responseLength: 'moderate',
    encouragement: 'medium'
  }
};
