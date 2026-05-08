import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { sendWatZapText } from "@/lib/watZap";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";
import { getConversationHistory, generateConversationSummary, generateFollowUpResponse, getInActiveConversations } from "@/lib/helpdeskFollowUp";

export async function GET() {
  try {
    const inactiveConversations = await getInActiveConversations(24);
    
    return NextResponse.json({
      success: true,
      count: inactiveConversations.length,
      conversations: inactiveConversations.map(c => ({
        id: c.id,
        customerName: c.customer_name,
        phoneNumber: c.phone_number,
        lastMessageAt: c.last_message_at,
        status: c.status
      }))
    });
  } catch (error) {
    console.error("Failed to get inactive conversations:", error);
    return NextResponse.json({ error: "Failed to get inactive conversations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversation_id, action = "preview" } = await request.json();

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    const convResult = await pool.query(`
      SELECT id, phone_number, customer_name, status, last_message_at
      FROM helpdesk_conversations_v2 WHERE id = $1
    `, [conversation_id]);

    if (convResult.rows.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversation = convResult.rows[0];
    const messages = await getConversationHistory(conversation_id);

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages in conversation" }, { status: 400 });
    }

    const { summary, painPoints, lastIntent } = await generateConversationSummary(messages);

    if (action === "preview") {
      return NextResponse.json({
        conversationId: conversation_id,
        customerName: conversation.customer_name,
        phoneNumber: conversation.phone_number,
        lastMessageAt: conversation.last_message_at,
        totalMessages: messages.length,
        summary,
        painPoints,
        lastIntent,
        suggestedFollowUp: null
      });
    }

    const suggestedFollowUp = await generateFollowUpResponse(
      summary,
      painPoints,
      lastIntent,
      conversation.customer_name || "Pelanggan"
    );

    return NextResponse.json({
      conversationId: conversation_id,
      customerName: conversation.customer_name,
      phoneNumber: conversation.phone_number,
      lastMessageAt: conversation.last_message_at,
      totalMessages: messages.length,
      summary,
      painPoints,
      lastIntent,
      suggestedFollowUp
    });
  } catch (error) {
    console.error("Follow-up error:", error);
    return NextResponse.json({ error: "Failed to process follow-up" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { conversation_id, message, send = false } = await request.json();

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
    }

    const convResult = await pool.query(`
      SELECT id, phone_number, customer_name, provider
      FROM helpdesk_conversations_v2 WHERE id = $1
    `, [conversation_id]);

    if (convResult.rows.length === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { phone_number, customer_name, provider } = convResult.rows[0];

    if (!send) {
      const messages = await getConversationHistory(conversation_id);
      const { summary, painPoints, lastIntent } = await generateConversationSummary(messages);
      const suggestedFollowUp = await generateFollowUpResponse(
        summary,
        painPoints,
        lastIntent,
        customer_name || "Pelanggan"
      );

      return NextResponse.json({
        conversationId: conversation_id,
        customerName: customer_name,
        phoneNumber: phone_number,
        summary,
        painPoints,
        lastIntent,
        suggestedFollowUp
      });
    }

    if (!message) {
      return NextResponse.json({ error: "message required to send" }, { status: 400 });
    }

    let waMessageId = null;
    try {
      if (provider === "damcorp") {
        const result = await sendDamcorpText(phone_number, message);
        waMessageId = result.waMessageId || null;
      } else {
        const result = await sendWatZapText(phone_number, message);
        waMessageId = result.raw?.wamid || null;
      }
    } catch (error) {
      console.error("Send error:", error);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    await pool.query(`
      INSERT INTO helpdesk_messages_v2 
        (conversation_id, direction, sender_type, message_type, text_body, wa_message_id, delivery_status)
      VALUES ($1, 'outbound', 'bot', 'text', $2, $3, 'sent')
    `, [conversation_id, message, waMessageId]);

    await pool.query(`
      UPDATE helpdesk_conversations_v2 
      SET status = 'pending', last_message_at = NOW(), updated_at = NOW() 
      WHERE id = $1
    `, [conversation_id]);

    return NextResponse.json({
      success: true,
      conversationId: conversation_id,
      messageSent: message,
      waMessageId
    });
  } catch (error) {
    console.error("Follow-up send error:", error);
    return NextResponse.json({ error: "Failed to send follow-up" }, { status: 500 });
  }
}