export type IntentType =
  | 'request_explanation'
  | 'request_example'
  | 'request_simplification'
  | 'ask_doubt'
  | 'request_practice'
  | 'submit_answer'
  | 'request_hint'
  | 'request_solution'
  | 'change_topic'
  | 'pause_session'
  | 'review_previous'
  | 'frustration'
  | 'needs_motivation'
  | 'celebration'
  | 'technical_issue'
  | 'feature_query'
  | 'feedback'
  | 'casual_chat'
  | 'inappropriate';

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, any>;
  multipleIntents?: IntentType[];
}

export interface MessageMetadata {
  intent?: IntentType;
  intentConfidence?: number;
  entities?: Record<string, any>;
  emotion?: string;
  emotionConfidence?: number;
  sentiment?: number;
  personaId?: string;
  isGreeting?: boolean;
  hintLevel?: number;
  responseStrategy?: string;
}
