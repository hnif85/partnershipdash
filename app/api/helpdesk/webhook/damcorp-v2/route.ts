import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";
import { generateAIReply, calculateLeadScore } from "@/lib/aiChat";

async function runAIReply(conversationId: number, inboundText: string, phoneNumber: string, contextJson: any, conversationHistory: any[] = []) {
  const context = {
    currentIntent: contextJson?.currentIntent || undefined,
    flowName: contextJson?.flowName || undefined,
    currentStep: contextJson?.currentStep || 0,
    collectedParams: contextJson?.collectedParams || {},
    lastBotMessage: contextJson?.lastBotMessage || undefined,
    turnCount: contextJson?.turnCount || 0,
    conversationHistory: conversationHistory.slice(-6),
  };

  const result = await generateAIReply(inboundText, context);

  if (result.reply) {
    try {
      const sendResult = await sendDamcorpText(phoneNumber, result.reply);

      await pool.query(
        `INSERT INTO helpdesk_messages_v2 
          (conversation_id, direction, sender_type, message_type, text_body, intent_detected, wa_message_id, delivery_status, payload_json)
         VALUES ($1, 'outbound', 'ai', 'text', $2, $3, $4, 'sent', $5)`,
        [
          conversationId,
          result.reply,
          result.intent,
          sendResult.waMessageId || null,
          JSON.stringify(sendResult.raw || {}),
        ]
      );

      await pool.query(
        `UPDATE helpdesk_conversations_v2 
         SET conversation_context_json = $2, last_intent = $3, last_message_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [conversationId, JSON.stringify(result.context), result.intent]
      );

      if (result.shouldEscalate) {
        await pool.query(
          `UPDATE helpdesk_conversations_v2 SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
          [conversationId]
        );
      }
    } catch (error) {
      console.error("Failed to send AI reply:", error);
    }
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const expectedToken = process.env.DAMCORP_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && challenge && expectedToken && token === expectedToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  const simpleToken = request.nextUrl.searchParams.get("verify_token");
  const simpleChallenge = request.nextUrl.searchParams.get("challenge");
  if (simpleChallenge && expectedToken && simpleToken === expectedToken) {
    return new NextResponse(simpleChallenge, { status: 200 });
  }

  return NextResponse.json({ ok: false, error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema();
    const payload = await request.json();

    console.log("=== DAMPORP V2 WEBHOOK ===");
    console.log(JSON.stringify(payload).substring(0, 1000));

    const eventId = payload?.id || payload?.entry?.[0]?.id || null;
    const message = payload?.messages?.[0] || payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const status = payload?.statuses?.[0] || payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];

    if (status?.id) {
      await pool.query(
        `UPDATE helpdesk_messages_v2 
         SET delivery_status = CASE 
           WHEN $2 = 'delivered' THEN 'delivered'
           WHEN $2 = 'read' THEN 'read'
           WHEN $2 = 'failed' THEN 'failed'
           ELSE delivery_status 
         END
         WHERE wa_message_id = $1`,
        [status.id, status.status]
      );
    }

    if (message?.from) {
      const phone = message.from.startsWith("+") ? message.from : `+${message.from}`;
      const textBody = message?.text?.body || "";
      const messageId = message?.id || null;
      const customerName = message?.profile?.name || null;

      let conversationId: number;
      let existingConv = await pool.query<any>(
        `SELECT * FROM helpdesk_conversations_v2 WHERE provider = 'damcorp' AND phone_number = $1 LIMIT 1`,
        [phone]
      );

      if (existingConv.rows.length === 0) {
        const inserted = await pool.query<any>(
          `INSERT INTO helpdesk_conversations_v2 (provider, phone_number, customer_name, status, last_message_at)
           VALUES ('damcorp', $1, $2, 'open', NOW()) RETURNING id`,
          [phone, customerName]
        );
        conversationId = inserted.rows[0].id;
      } else {
        conversationId = existingConv.rows[0].id;
        await pool.query(
          `UPDATE helpdesk_conversations_v2 
           SET status = 'open', customer_name = COALESCE(customer_name, $2), last_message_at = NOW(), updated_at = NOW() 
           WHERE id = $1`,
          [conversationId, customerName]
        );
      }

      await pool.query(
        `INSERT INTO helpdesk_messages_v2 
          (conversation_id, direction, sender_type, message_type, text_body, wa_message_id, delivery_status, payload_json)
         VALUES ($1, 'inbound', 'customer', 'text', $2, $3, 'received', $4)`,
        [conversationId, textBody, messageId, JSON.stringify(message)]
      );

      // Increment unread count for this conversation
      await pool.query(
        `UPDATE helpdesk_conversations_v2 
         SET unread_count = unread_count + 1 
         WHERE id = $1`,
        [conversationId]
      );

      const convResult = await pool.query<any>(
        "SELECT bot_enabled, bot_paused_until, conversation_context_json FROM helpdesk_conversations_v2 WHERE id = $1",
        [conversationId]
      );
      const conv = convResult.rows[0];
      const botEnabled = conv?.bot_enabled ?? true;
      const pausedUntil = conv?.bot_paused_until ? new Date(conv.bot_paused_until).getTime() : 0;
      const currentContext = conv?.conversation_context_json || {};

      // Get recent conversation history first
      const messagesResult = await pool.query<any>(
        `SELECT direction, text_body, created_at FROM helpdesk_messages_v2 
         WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [conversationId]
      );
      const recentMessages = messagesResult.rows.slice(-6).map((m: any) => ({
        direction: m.direction,
        text: m.text_body,
      }));

      if (botEnabled && textBody.trim() && (!pausedUntil || pausedUntil < Date.now())) {
        void runAIReply(conversationId, textBody, phone, currentContext, recentMessages).catch(console.error);
      }

      const convForScore = await pool.query<any>(
        "SELECT last_message_at FROM helpdesk_conversations_v2 WHERE id = $1",
        [conversationId]
      );

      const leadScore = calculateLeadScore(
        messagesResult.rows,
        {},
        convForScore.rows[0]?.last_message_at
      );

      await pool.query(
        `INSERT INTO helpdesk_lead_scores (conversation_id, score, category, factors_json)
         VALUES ($1, $2, $3, $4)`,
        [conversationId, leadScore.score, leadScore.category, JSON.stringify(leadScore.factors)]
      );

      await pool.query(
        `UPDATE helpdesk_conversations_v2 
         SET lead_score = $2, lead_category = $3, ai_analyzed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [conversationId, leadScore.score, leadScore.category]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Damcorp v2 webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }
}