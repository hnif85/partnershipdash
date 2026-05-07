import { pool } from "../database";
import type {
  Persona,
  IntentRule,
  ConversationFlow,
  EscalationRule,
} from "./types";

const DEFAULT_PERSONA: Persona = {
  id: "default",
  name: "Asisten AI",
  tone: "friendly",
  greeting: "Halo! 👋 Terima kasih sudah menghubungi kami. Ada yang bisa saya bantu?",
  closing: "Terima kasih sudah chatting dengan kami. Jika ada pertanyaan lain, feel free untuk chat lagi ya! 😊",
  signaturePhrases: ["Silakan", "Dengan senang hati", "Berikut informasinya"],
  responseTemplates: {
    greeting: "Halo! 👋 Terima kasih sudah menghubungi kami. Ada yang bisa saya bantu?",
    default: "Mohon maaf, saya belum terlalu mengerti. Bisa dicoba formulasi yang berbeda atau langsung hubungi tim kami?",
    escalate: "Sepertinya butuh bantuan lebih lanjut. Saya akan menghubungkan Anda dengan tim kami. Mohon tunggu sebentar ya!",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEFAULT_INTENTS: IntentRule[] = [
  {
    id: 0,
    intentName: "salam",
    keywords: ["halo", "hai", "hello", "hi", "permisi", "selamat"],
    priority: 100,
    responseTemplates: ["Halo! 👋 Ada yang bisa saya bantu?", "Hai! Selamat datang! Ada yang bisa dinfo-in?"],
    nextContext: "greeting",
    isActive: true,
  },
  {
    id: 0,
    intentName: "tanya_produk",
    keywords: ["produk", "layanan", "apa itu", "apa saja", "fitur", "keunggulan"],
    priority: 80,
    responseTemplates: [
      "Kami menawarkan beberapa produk/layanan. Produk mana yang ingin Anda ketahui lebih lanjut?",
      "Boleh tau produk atau layanan apa yang Anda minati?",
    ],
    nextContext: "produk_inquiry",
    requiresParam: ["product_interest"],
    isActive: true,
  },
  {
    id: 0,
    intentName: "tanya_harga",
    keywords: ["harga", "biaya", "uang", "termasuk apa", "berapa", "paket", "murah", "mahal"],
    priority: 90,
    responseTemplates: [
      "Untuk informasi harga, bisa cerita dulu produk/layanan apa yang Anda minati?",
      "Saya bantu info harga ya.Anda tertarik paket yang mana?",
    ],
    nextContext: "harga_inquiry",
    requiresParam: ["product_type"],
    isActive: true,
  },
  {
    id: 0,
    intentName: "mau_daftar",
    keywords: ["daftar", "register", "signup", "join", "pake", "main", "mulai"],
    priority: 95,
    responseTemplates: [
      "Siap! Untuk mendaftar, Anda bisa klik link berikut atau saya bantu guided step by step!",
      "Great choice! Untuk mendaftar, saya butuh sedikit info nih. Nama Anda siapa?",
    ],
    nextContext: "onboarding",
    requiresParam: ["name", "contact"],
    isActive: true,
  },
  {
    id: 0,
    intentName: "tanya_cara",
    keywords: ["cara", "gimana", " bagaimana", "login", "pakai", "use"],
    priority: 70,
    responseTemplates: [
      "Bisa cerita dulu untuk fitur yang ingin Anda gunakan?",
      "Saya jelaskan step by step ya. Anda ingin tahu tentang apa dulu?",
    ],
    nextContext: "howto_inquiry",
    isActive: true,
  },
  {
    id: 0,
    intentName: "komplain",
    keywords: ["kesal", "kecewa", "gagal", "error", "problem", "tidak bisa", "tidak berhasil"],
    priority: 50,
    responseTemplates: [
      "Mohon maaf atas ketidaknyamanan ini. Boleh cerita detailnya biar saya bisa bantu?",
      "Oh tidak, maaf banget nih. Boleh info lebih detail agar bisa kami bantu?",
    ],
    nextContext: "komplain",
    action: "flag_priority",
    isActive: true,
  },
  {
    id: 0,
    intentName: "tanya_status",
    keywords: ["status", "mana", "where", "kd", "resi", "tracking"],
    priority: 60,
    responseTemplates: [
      "Bisa infokan nomor pesanan atau email yang Anda gunakan saat daftar?",
      "Mohon info no order atau email pendaftaran ya.",
    ],
    nextContext: "status_inquiry",
    requiresParam: ["order_id"],
    isActive: true,
  },
  {
    id: 0,
    intentName: "terima_kasih",
    keywords: ["terima kasih", "thanks", "thank you", "good", "bagus", "oke", "siap"],
    priority: 40,
    responseTemplates: [
      "Sama-sama! Ada yang lain bisa saya bantu?",
      "You're welcome! Feel free chat lagi jika butuh assistance lain ya! 😊",
    ],
    nextContext: "closing",
    isActive: true,
  },
  {
    id: 0,
    intentName: "spam",
    keywords: ["test", "cek", "halo?", "gan", "bang", "bokep", "jual", "beli"],
    priority: 10,
    responseTemplates: ["Saya bantu Anda ya. Ada yang bisa saya bantu?"],
    isActive: true,
  },
];

const DEFAULT_FLOWS: ConversationFlow[] = [
  {
    id: 0,
    flowName: "produk_inquiry",
    triggerKeywords: ["produk", "layanan", "fitur"],
    steps: [
      { step: "1", action: "greet", response: "Siap! Kami memiliki beberapa produk/layanan yang bisa Anda pilih." },
      { step: "2", action: "ask_needs", response: "Boleh cerita, kebutuhan Anda seperti apa? Atau ada industri tertentu?" },
      { step: "3", action: "recommend", condition: "needs_identified", nextStep: "4" },
      { step: "4", action: "present_options" },
      { step: "5", action: "ask_interest", nextStep: "6" },
      { step: "6", action: "handle_interest" },
    ],
    isActive: true,
  },
  {
    id: 0,
    flowName: "harga_inquiry",
    triggerKeywords: ["harga", "biaya", "uang"],
    steps: [
      { step: "1", action: "identify_product", response: "Anda tertarik paket yang mana ya?" },
      { step: "2", action: "get_product_info", condition: "product_selected" },
      { step: "3", action: "provide_quote" },
      { step: "4", action: "ask_nego" },
    ],
    isActive: true,
  },
  {
    id: 0,
    flowName: "onboarding",
    triggerKeywords: ["daftar", "register", "pake"],
    steps: [
      { step: "1", action: "welcome", response: "Welcome! Saya akan bantu Anda registrasi step by step." },
      { step: "2", action: "ask_name", response: "Pertama, boleh tau nama Anda?" },
      { step: "3", action: "ask_contact", condition: "name_provided" },
      { step: "4", action: "ask_interest", condition: "contact_provided" },
      { step: "5", action: "send_link", nextStep: "6" },
      { step: "6", action: "confirm" },
    ],
    isActive: true,
  },
];

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  // Disabled for now - causing issues
  // {
  //   id: 0,
  //   conditionType: "no_match",
  //   conditions: { maxAttempts: 3 },
  //   action: "ask_human",
  // },
  // {
  //   id: 0,
  //   conditionType: "negative_sentiment",
  //   conditions: { threshold: 0.7 },
  //   action: "flag_priority",
  // },
  // {
  //   id: 0,
  //   conditionType: "explicit_human",
  //   keywords: ["chat人工", "cs", "admin", "manager", "tidak"],
  //   action: "transfer_to_agent",
  // },
];

let cachedKnowledgeBase: KnowledgeBase | null = null;
let cacheLoaded = false;

export interface KnowledgeBase {
  personas: Record<string, Persona>;
  intents: IntentRule[];
  flows: ConversationFlow[];
  escalationRules: EscalationRule[];
}

export async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  if (cachedKnowledgeBase && cacheLoaded) {
    return cachedKnowledgeBase;
  }

  try {
    const personasResult = await pool.query<any>(
      "SELECT * FROM helpdesk_personas WHERE is_active = true"
    );
    
    const intentsResult = await pool.query<any>(
      "SELECT * FROM helpdesk_intent_rules WHERE is_active = true ORDER BY priority DESC"
    );
    
    const flowsResult = await pool.query<any>(
      "SELECT * FROM helpdesk_conversation_flows WHERE is_active = true"
    );
    
    const escalationResult = await pool.query<any>(
      "SELECT * FROM helpdesk_escalation_rules"
    );

    const personas: Record<string, Persona> = {};
    if (personasResult.rows.length > 0) {
      for (const row of personasResult.rows) {
        personas[row.id] = {
          id: row.id,
          name: row.name,
          tone: row.tone,
          greeting: row.greeting,
          closing: row.closing || DEFAULT_PERSONA.closing,
          signaturePhrases: row.signature_phrases || [],
          responseTemplates: row.response_templates_json || {},
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      }
    } else {
      personas["default"] = DEFAULT_PERSONA;
    }

    const intents: IntentRule[] = intentsResult.rows.map((row: any) => ({
      id: row.id,
      intentName: row.intent_name,
      keywords: row.keywords || [],
      priority: row.priority,
      responseTemplates: row.response_templates || [],
      nextContext: row.next_context,
      requiresParam: row.requires_param || [],
      isActive: row.is_active,
    }));

    const flows: ConversationFlow[] = flowsResult.rows.map((row: any) => ({
      id: row.id,
      flowName: row.flow_name,
      triggerKeywords: row.trigger_keywords || [],
      steps: row.steps_json || [],
      isActive: row.is_active,
    }));

    const escalationRules: EscalationRule[] = escalationResult.rows.map((row: any) => ({
      id: row.id,
      conditionType: row.condition_type,
      conditions: row.conditions_json || {},
      action: row.action,
    }));

    if (intents.length === 0) {
      intents.push(...DEFAULT_INTENTS);
    }
    if (flows.length === 0) {
      flows.push(...DEFAULT_FLOWS);
    }
    if (escalationRules.length === 0) {
      escalationRules.push(...DEFAULT_ESCALATION_RULES);
    }

    cachedKnowledgeBase = { personas, intents, flows, escalationRules };
    cacheLoaded = true;

    return cachedKnowledgeBase!;
  } catch (error) {
    console.warn("Failed to load knowledge base from DB, using defaults:", error);
    return {
      personas: { default: DEFAULT_PERSONA },
      intents: DEFAULT_INTENTS,
      flows: DEFAULT_FLOWS,
      escalationRules: DEFAULT_ESCALATION_RULES,
    };
  }
}

export function findMatchingIntent(
  message: string,
  intents: IntentRule[]
): { intent: IntentRule; matchScore: number } | null {
  const lowerMessage = message.toLowerCase();
  const words = lowerMessage.split(/\s+/);

  let bestMatch: { intent: IntentRule; matchScore: number } | null = null;

  for (const intent of intents) {
    let matchScore = 0;
    const intentKeywords = intent.keywords.map((k) => k.toLowerCase());

    for (const keyword of intentKeywords) {
      if (lowerMessage.includes(keyword)) {
        matchScore += 10;
      } else {
        for (const word of words) {
          if (word.includes(keyword) || keyword.includes(word)) {
            matchScore += 5;
          }
        }
      }
    }

    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.matchScore)) {
      bestMatch = { intent, matchScore };
    }
  }

  return bestMatch;
}

export function selectResponse(
  intent: IntentRule,
  context: Record<string, any>
): string {
  if (intent.responseTemplates.length === 0) {
    return DEFAULT_PERSONA.responseTemplates.default;
  }

  const randomIndex = Math.floor(Math.random() * intent.responseTemplates.length);
  let response = intent.responseTemplates[randomIndex];

  Object.keys(context).forEach((key) => {
    response = response.replace(new RegExp(`{{${key}}}`, "g"), context[key]);
  });

  return response;
}

export function shouldEscalate(
  message: string,
  turnCount: number,
  lastSentiment: string,
  rules: EscalationRule[]
): { shouldEscalate: boolean; action?: string; reason?: string } {
  const lowerMessage = message.toLowerCase();

  for (const rule of rules) {
    switch (rule.conditionType) {
      case "no_match":
        if (turnCount >= (rule.conditions.maxAttempts || 3)) {
          return { shouldEscalate: true, action: rule.action, reason: "Too many attempts" };
        }
        break;

      case "negative_sentiment":
        if (lastSentiment === "negative" && (rule.conditions.threshold || 0.7) <= 0.7) {
          return { shouldEscalate: true, action: rule.action, reason: "Negative sentiment detected" };
        }
        break;

      case "explicit_human":
        const humanKeywords = rule.conditions?.keywords || [];
        if (humanKeywords.some((k: string) => lowerMessage.includes(k))) {
          return { shouldEscalate: true, action: rule.action, reason: "Human agent requested" };
        }
        break;
    }
  }

  return { shouldEscalate: false };
}