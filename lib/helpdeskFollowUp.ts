import { pool } from "./database";
import { getProductKnowledgeFromDB } from "./helpdeskKnowledge";

const AI_URL = process.env.MEDIAWAVE_AI_URL || "https://ai-module.mediawave.co.id/completions";
const AI_KEY = process.env.MEDIAWAVE_AI_KEY || "F8B9F7282D17.3c4acf4ee92d90f3036dfec32066c4a3faae3222";

interface ConversationMessage {
  id: number;
  direction: string;
  sender_type: string;
  text_body: string;
  intent_detected: string | null;
  created_at: string;
}

interface ConversationSummary {
  conversationId: number;
  customerName: string;
  phoneNumber: string;
  lastMessageAt: string;
  totalMessages: number;
  messages: ConversationMessage[];
  summary: string;
  painPoints: string[];
  lastIntent: string | null;
  suggestedFollowUp: string;
}

export async function getConversationHistory(conversationId: number): Promise<ConversationMessage[]> {
  const result = await pool.query(`
    SELECT id, direction, sender_type, text_body, intent_detected, created_at
    FROM helpdesk_messages_v2
    WHERE conversation_id = $1
    ORDER BY created_at ASC
  `, [conversationId]);

  return result.rows;
}

export async function generateConversationSummary(messages: ConversationMessage[]): Promise<{
  summary: string;
  painPoints: string[];
  lastIntent: string | null;
}> {
  if (messages.length === 0) {
    return { summary: "Belum ada percakapan", painPoints: [], lastIntent: null };
  }

  const conversationText = messages
    .map(m => `${m.sender_type === 'customer' ? 'Customer' : 'Bot/Agent'}: ${m.text_body}`)
    .join('\n');

  const systemPrompt = `Anda adalah assistant yang menganalisis percakapan customer service.
Analisis percakapan berikut dan berikan:
1. Ringkasan singkat (max 3 kalimat)
2. Pain points yang customer alami (array JSON)
3. Intent terakhir yang terdeteksi

Format response JSON:
{
  "summary": "ringkasan percakapan",
  "painPoints": ["pain point 1", "pain point 2"],
  "lastIntent": "intent terakhir atau null"
}

Percakapan:
${conversationText}`;

  try {
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": AI_KEY
      },
      body: JSON.stringify({
        prompt: systemPrompt,
        max_tokens: 500,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.text || data.choices?.[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || "Ringkasan tidak tersedia",
        painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints : [],
        lastIntent: parsed.lastIntent || null
      };
    } catch {
      return {
        summary: content.substring(0, 200),
        painPoints: [],
        lastIntent: null
      };
    }
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return {
      summary: "Gagal menghasilkan ringkasan",
      painPoints: [],
      lastIntent: null
    };
  }
}

export async function generateFollowUpResponse(
  summary: string,
  painPoints: string[],
  lastIntent: string | null,
  customerName: string
): Promise<string> {
  const productKnowledge = await getProductKnowledgeFromDB();

  const systemPrompt = `Anda adalah customer service MWX Market yang ramah dan proaktif.
Berdasarkan ringkasan percakapan dengan customer, buat pesan follow-up yang:

1. Menunjukkan bahwa Anda mengingat percakapan sebelumnya
2. Mengakui pain point/persoalan customer
3. Menawarkan solusi konkret
4. Bersifat personal dan tidak terlalu panjang

INFORMASI CUSTOMER:
- Nama: ${customerName}
- Ringkasan percakapan sebelumnya: ${summary}
- Pain points: ${painPoints.length > 0 ? painPoints.join(", ") : "Tidak ada"}
- Intent terakhir: ${lastIntent || "Tidak terdeteksi"}

PRODUCT KNOWLEDGE:
${productKnowledge}

Contoh tone: "Halo [nama]! Saya ingat Anda bertanya tentang [topik]. Apakah ada yang bisa saya bantu lebih lanjut?"

Buat pesan follow-up (maksimal 1 paragraf, dalam bahasa Indonesia yang natural):`;

  try {
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": AI_KEY
      },
      body: JSON.stringify({
        prompt: systemPrompt,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.text || data.choices?.[0]?.message?.content || "Terima kasih telah menghubungi kami. Ada yang bisa kami bantu?";
  } catch (error) {
    console.error("Failed to generate follow-up:", error);
    return `Halo ${customerName}! Terima kasih telah menghubungi kami. Ada yang bisa kami bantu lebih lanjut?`;
  }
}

export async function getInActiveConversations(hoursInactive: number = 8): Promise<any[]> {
  const result = await pool.query(`
    SELECT 
      id, phone_number, customer_name, status, 
      last_message_at, created_at, bot_enabled
    FROM helpdesk_conversations_v2
    WHERE status IN ('active', 'pending')
    AND bot_enabled = true
    AND last_message_at < NOW() - INTERVAL '${hoursInactive} hours'
    AND (bot_paused_until IS NULL OR bot_paused_until < NOW())
    ORDER BY last_message_at ASC
    LIMIT 50
  `);

  return result.rows;
}