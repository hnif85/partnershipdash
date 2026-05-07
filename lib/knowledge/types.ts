export type PersonaTone = "formal" | "casual" | "friendly";

export interface Persona {
  id: string;
  name: string;
  tone: PersonaTone;
  greeting: string;
  closing: string;
  signaturePhrases: string[];
  responseTemplates: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntentRule {
  id: number;
  intentName: string;
  keywords: string[];
  priority: number;
  responseTemplates: string[];
  nextContext?: string;
  requiresParam?: string[];
  isActive: boolean;
}

export interface FlowStep {
  step: string;
  action: string;
  response?: string;
  condition?: string;
  nextStep?: string;
}

export interface ConversationFlow {
  id: number;
  flowName: string;
  triggerKeywords: string[];
  steps: FlowStep[];
  isActive: boolean;
}

export interface EscalationRule {
  id: number;
  conditionType: "no_match" | "negative_sentiment" | "explicit_human" | "too_many_attempts";
  conditions: Record<string, any>;
  action: "transfer_to_agent" | "close_conversation" | "flag_priority" | "ask_human";
  createdAt: Date;
}

export interface KnowledgeBase {
  personas: Record<string, Persona>;
  intents: IntentRule[];
  flows: ConversationFlow[];
  escalationRules: EscalationRule[];
}

export interface ConversationContext {
  currentIntent?: string;
  flowName?: string;
  currentStep?: number;
  collectedParams: Record<string, string>;
  lastBotMessage?: string;
  turnCount: number;
}

export interface LeadScore {
  score: number;
  category: "cold" | "warm" | "medium" | "hot";
  factors: {
    intentSignal: number;
    engagementSpeed: number;
    frequencyScore: number;
    transactionHistory: number;
    recencyScore: number;
  };
  calculatedAt: Date;
}

export interface AIAnalysisResult {
  intent: string;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  entities: Record<string, string>;
  suggestedReply?: string;
}