export type SummarySection = {
  title: string;
  bullets: string[];
  citations: string[];
};

export type RiskFlag = {
  code: string;
  severity: 'low' | 'medium' | 'high';
  rationale: string;
  citations: string[];
};

export type SummaryResponse = {
  doc_id?: number;
  style: string;
  sections: SummarySection[];
  risks: RiskFlag[];
  redactions_applied: boolean;
};

export type SummaryRequest = {
  style: 'clinical' | 'patient-friendly' | 'insurance-appeal';
  include_risks?: boolean;
  max_sections?: number;
};

export type ChatResponse = {
  answer: string;
  citations: string[];
  context_used: boolean;
  model_used: string;
  timestamp: string;
};

export type DocumentSnippet = {
  text: string;
  citation: string;
  relevance_score: number;
};

export type ConversationalChatRequest = {
  user_message: string;
  context_document?: string;
  conversation_history: Array<{role: string, content: string}>;
  user_documents: Array<{id: string, filename: string, summary?: string}>;
  include_insights?: boolean;
  conversational_mode?: boolean;
};
