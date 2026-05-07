import { loadKnowledgeBase, findMatchingIntent, selectResponse, shouldEscalate, type KnowledgeBase } from "./knowledge/base";
import type { AIAnalysisResult, LeadScore, ConversationContext } from "./knowledge/types";
import { getProductKnowledge } from "./knowledge/productData";

const AI_URL = process.env.MEDIAWAVE_AI_URL || "https://ai-module.mediawave.co.id/completions";
const AI_KEY = process.env.MEDIAWAVE_AI_KEY || "F8B9F7282D17.3c4acf4ee92d90f3036dfec32066c4a3faae3222";

export interface SendMessageOptions {
  phoneNumber: string;
  message: string;
  personaId?: string;
  conversationId?: number;
  customerData?: Record<string, any>;
}

export interface AIReplyResult {
  reply: string;
  intent: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  context: ConversationContext;
}

export async function analyzeWithAI(
  message: string,
  context?: Record<string, any>
): Promise<AIAnalysisResult> {
  try {
    const kb = await loadKnowledgeBase();
    const matchResult = findMatchingIntent(message, kb.intents);

    if (matchResult) {
      return {
        intent: matchResult.intent.intentName,
        confidence: Math.min(matchResult.matchScore / 20, 1),
        sentiment: "neutral",
        entities: {},
        suggestedReply: selectResponse(matchResult.intent, context || {}),
      };
    }

    const systemPrompt = `Anda adalah asisten customer service yang cerdas. 
Tugas Anda adalah:
1. Mengidentifikasi intent dari pesan customer
2. Memberikan respons yang sesuai dan helpful
3. Jika tidak yakin, respond dengan sopan dan arahkan ke informasi yang jelas

Berikut adalah konteks conversation: ${JSON.stringify(context || {})}`;

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "X-Key": AI_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        service: "CreateWhiz",
        ai: "vertex",
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
        top_p: 1,
        debug: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));

    return {
      intent: data.intent || "unknown",
      confidence: 0.5,
      sentiment: data.sentiment || "neutral",
      entities: data.entities || {},
      suggestedReply: data.reply || data.choices?.[0]?.message?.content,
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return {
      intent: "error",
      confidence: 0,
      sentiment: "neutral",
      entities: {},
      suggestedReply: "Mohon maaf, ada sedikit masalah. Bisa dicoba lagi?",
    };
  }
}

export async function generateAIReply(
  message: string,
  context: ConversationContext,
  customerData?: Record<string, any>
): Promise<AIReplyResult> {
  try {
    const kb = await loadKnowledgeBase();
    const defaultPersona = kb.personas.default || {
      greeting: "Halo! 👋 Ada yang bisa saya bantu?, kami dari MWX Market memiliki banyak alternatif produk seusude dengan usa anda",
      closing: "Terima kasih! Ada yang lain bisa bantu?",
    };

    const matchResult = findMatchingIntent(message, kb.intents);

    // Only use simple response for very high confidence keyword matches (score >= 18)
    // For everything else, use AI with full product knowledge for better answers
    if (matchResult && matchResult.matchScore >= 18) {
      const escalation = shouldEscalate(
        message,
        context.turnCount,
        "neutral",
        kb.escalationRules
      );

      if (escalation.shouldEscalate) {
        const escalateMessage = defaultPersona.responseTemplates?.escalate || 
          "Mohon tunggu sebentar, saya akan menghubungkan Anda dengan tim kami.";
        return {
          reply: escalateMessage,
          intent: matchResult.intent.intentName,
          shouldEscalate: true,
          escalationReason: escalation.reason,
          context: {
            ...context,
            currentIntent: matchResult.intent.intentName,
            turnCount: context.turnCount + 1,
            conversationHistory: context.conversationHistory,
          },
        };
      }

      const reply = selectResponse(matchResult.intent, {
        ...context.collectedParams,
        ...customerData,
      });

      return {
        reply,
        intent: matchResult.intent.intentName,
        shouldEscalate: false,
        context: {
          ...context,
          currentIntent: matchResult.intent.intentName,
          currentStep: context.currentStep + 1,
          turnCount: context.turnCount + 1,
          lastBotMessage: reply,
          conversationHistory: context.conversationHistory,
        },
      };
    }

    const productKnowledge = getProductKnowledge();

    const turnCount = context?.turnCount || 0;
    const lastIntent = context?.currentIntent || "belum ada";
    const lastBotMessage = context?.lastBotMessage || "";
    const conversationHistory = context?.conversationHistory || [];

    // Format conversation history for the prompt
    const historyText = conversationHistory.length > 0 
      ? conversationHistory.map((m: any) => `${m.direction === 'inbound' ? 'Customer' : 'Anda'}: ${m.text}`).join('\n')
      : "Belum ada percakapan sebelumnya";

    const systemPrompt = `Anda adalah customer service MWX Market yang pintar dan mengingat percakapan sebelumnya.
Gaya: ${defaultPersona.tone || "friendly"}

Riwayat percakapan:
${historyText}

${productKnowledge ? "\n// =========================================\n// PRODUCT KNOWLEDGE\n// =========================================\n" + productKnowledge + "\n// =========================================\n" : ""}

Instruksi PENTING:
  1. PASTI INGAT konteks percakapan sebelumnya! Jika customer mengulang pertanyaan atau bilang "seperti tadi", "ya seperti yang tadi tanya", langsung jawab tanpa perlu meminta klarifikasi lagi
  2. Jawab dengan ringkas dan padat (maksimal 3 kalimat)
  3. Gunakan bahasa Indonesia natural
  4. Jangan gunakan tanda asterisk (*) atau format markdown bold
  5. JANGAN pernah memperkenalkan diri lagi jika sudah ada percakapan sebelumnya
  6. Tutup dengan sopan dan tawarkan bantuan lain
  7. Di akhir respons, tambahkan: [INTENT: nama_intent]`;

const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "X-Key": AI_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        service: "CreateWhiz",
        ai: "vertex",
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.8,
        top_p: 1,
        debug: false,
      }),
    });

    const data = await response.json().catch(() => ({}));
    
    // Extract AI reply - check multiple possible response formats
    let aiReply = null;
    
    // Format 1: MediaWave style (data.content)
    if (data.data?.content) {
      aiReply = data.data.content;
    }
    // Format 2: OpenAI style
    else if (data.choices && data.choices[0]?.message?.content) {
      aiReply = data.choices[0].message.content;
    }
    // Format 3: Direct reply field
    else if (data.reply) {
      aiReply = data.reply;
    }
    // Format 4: Content in other fields
    else if (data.result?.content) {
      aiReply = data.result.content;
    }
    else if (data.text) {
      aiReply = data.text;
    }
    else if (data.output?.text) {
      aiReply = data.output.text;
    }
    
    // If no valid reply, use fallback
    if (!aiReply || aiReply.trim() === "") {
      console.log("AI returned empty response, using fallback");
      aiReply = defaultPersona.greeting || "Mohon maaf, ada sedikit gangguan. Bisa dicoba lagi?";
    }

    // Extract intent from AI response if present
    const intentMatch = aiReply.match(/\[INTENT:\s*(\w+)\]/i);
    const detectedIntent = intentMatch ? intentMatch[1] : "ai_generated";
    
    // Remove the [INTENT: ...] tag from the final reply
    const finalReply = aiReply.replace(/\[INTENT:.*?\]\s*/gi, "");

    return {
      reply: finalReply,
      intent: detectedIntent,
      shouldEscalate: false,
      context: {
        ...context,
        currentIntent: detectedIntent,
        turnCount: context.turnCount + 1,
        lastBotMessage: aiReply,
        conversationHistory: context.conversationHistory,
      },
    };
  } catch (error) {
    console.error("AI reply generation error:", error);
    const kb = await loadKnowledgeBase();
    const defaultPersona = kb.personas.default;

    return {
      reply: defaultPersona?.responseTemplates?.default || "Mohon maaf, ada sedikit gangguan. Bisa dicoba lagi?",
      intent: "error",
      shouldEscalate: false,
      context: {
        ...context,
        turnCount: context.turnCount + 1,
      },
    };
  }
}

export function calculateLeadScore(
  conversationHistory: Array<{ direction: string; text_body?: string; created_at?: Date }>,
  customerData?: Record<string, any>,
  lastMessageAt?: Date
): LeadScore {
  const now = new Date();

  let intentSignal = 0;
  let engagementSpeed = 0;
  let frequencyScore = 0;
  let transactionHistory = 0;
  let recencyScore = 0;

  const buyingKeywords = [
    "beli", "harga", "paket", "daftar", "order", "pesan",
    "demo", "coba", "trial", "subscribe", "upgrade",
    "biaya", "uang", "bayar", "transfer", "invoice",
  ];

  const lastMessages = conversationHistory.slice(-5);
  for (const msg of lastMessages) {
    if (msg.text_body) {
      const lowerText = msg.text_body.toLowerCase();
      if (buyingKeywords.some((k) => lowerText.includes(k))) {
        intentSignal += 6;
      }
    }
  }
  intentSignal = Math.min(intentSignal, 30);

  const inboundMessages = conversationHistory.filter((m) => m.direction === "inbound");
  if (inboundMessages.length > 0) {
    const lastInbound = inboundMessages[inboundMessages.length - 1];
    if (lastInbound.created_at) {
      const hoursSinceLastMessage = (now.getTime() - new Date(lastInbound.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage <= 1) {
        engagementSpeed = 20;
      } else if (hoursSinceLastMessage <= 24) {
        engagementSpeed = 15;
      } else if (hoursSinceLastMessage <= 72) {
        engagementSpeed = 10;
      } else {
        engagementSpeed = 5;
      }
    }
  }

  frequencyScore = Math.min(conversationHistory.length * 3, 15);

  if (customerData?.hasTransaction || customerData?.total_transactions > 0) {
    transactionHistory = 25;
  } else if (customerData?.credit_used > 0) {
    transactionHistory = 15;
  }

  if (lastMessageAt) {
    const daysSinceLastContact = (now.getTime() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastContact <= 1) {
      recencyScore = 10;
    } else if (daysSinceLastContact <= 7) {
      recencyScore = 7;
    } else if (daysSinceLastContact <= 30) {
      recencyScore = 4;
    } else {
      recencyScore = 1;
    }
  }

  const totalScore = intentSignal + engagementSpeed + frequencyScore + transactionHistory + recencyScore;

  let category: LeadScore["category"];
  if (totalScore >= 76) {
    category = "hot";
  } else if (totalScore >= 51) {
    category = "medium";
  } else if (totalScore >= 26) {
    category = "warm";
  } else {
    category = "cold";
  }

  return {
    score: Math.min(totalScore, 100),
    category,
    factors: {
      intentSignal,
      engagementSpeed,
      frequencyScore,
      transactionHistory,
      recencyScore,
    },
    calculatedAt: now,
  };
}

export function getLeadCategoryColor(category: string): string {
  switch (category) {
    case "hot":
      return "#ef4444";
    case "medium":
      return "#f97316";
    case "warm":
      return "#eab308";
    case "cold":
      return "#6b7280";
    default:
      return "#6b7280";
  }
}

export function getLeadCategoryLabel(category: string): string {
  switch (category) {
    case "hot":
      return "🔥 Hot";
    case "medium":
      return "🟠 Medium";
    case "warm":
      return "🟡 Warm";
    case "cold":
      return "⚪ Cold";
    default:
      return "⚪ Unknown";
  }
}