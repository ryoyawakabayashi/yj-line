import { SupportModeState } from './support';

export type ConversationMode = 'diagnosis' | 'ai_chat' | 'followup' | 'support' | 'flow' | 'career_diagnosis';

export type FollowupStep = 'ask_applied' | 'ask_count' | 'ask_trouble' | 'complete';

export interface FollowupAnswers {
  hasApplied?: 'yes' | 'no' | 'not_yet';
  applicationCount?: '1' | '2-3' | '4+';
  trouble?: 'no_match' | 'language' | 'how_to' | 'not_yet';
  action?: 'search_ai' | 'search_site' | 'skip';
}

export interface CareerDiagnosisAnswers {
  q1?: 'A' | 'B';
  q2?: 'A' | 'B';
  q3?: 'A' | 'B';
  q4?: 'A' | 'B';
  q5?: 'A' | 'B';
  q6?: 'A' | 'B';
  q7?: 'A' | 'B';
  q8?: 'A' | 'B';
}

export interface ConversationState {
  mode: ConversationMode;
  currentQuestion?: number | null;
  answers?: DiagnosisAnswers;
  selectedIndustries?: string[];
  lang?: string;
  q4_step?: 'select_major' | 'select_region' | 'select_prefecture';
  selectedRegion?: string;
  followupStep?: FollowupStep;
  followupAnswers?: FollowupAnswers;
  supportState?: SupportModeState;
  flowId?: string;
  waitingNodeId?: string;
  variables?: Record<string, any>;
  careerAnswers?: CareerDiagnosisAnswers;
}

export interface DiagnosisAnswers {
  living_in_japan?: 'yes' | 'no_planned' | 'no_plan';
  gender?: 'male' | 'female' | 'other';
  urgency?: 'immediate' | 'within_2weeks' | 'not_urgent';
  region?: string;
  prefecture?: string;
  japanese_level?: 'n1' | 'n2' | 'n3' | 'n4' | 'n5' | 'no_japanese';
  industry?: string;
  work_style?: 'fulltime' | 'parttime' | 'both';
}

export interface UserStatus {
  userId: string;
  lang: string;
  richMenuId?: string;
  ai_chat_count: number;
  diagnosis_count: number;
  total_usage_count: number;
  first_used?: Date;
  last_used?: Date;
  timestamp: Date;
}

export interface IntentDetection {
  intent: 'job_search' | 'greeting' | 'contact' | 'support_request' | 'unknown';
  confidence: number;
  pattern: 'exact' | 'conditional' | 'implicit' | 'none';
  trigger: string | null;
  action: 'start_diagnosis_immediately' | 'confirm_then_start' | 'greet' | 'show_contact' | 'show_support_menu' | 'use_openai';
  extractedInfo?: {
    location?: string;
    industry?: string;
    japaneseLevel?: string;
    urgency?: string;
  };
}
