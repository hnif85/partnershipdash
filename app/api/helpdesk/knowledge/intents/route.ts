import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, intent_name, keywords, priority, response_templates, 
             next_context, requires_param, is_active, created_at
      FROM helpdesk_intent_rules 
      ORDER BY priority DESC, intent_name ASC
    `);

    return NextResponse.json({ intents: result.rows });
  } catch (error) {
    console.error("Failed to fetch intents:", error);
    return NextResponse.json({ error: "Failed to fetch intents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { intent_name, keywords, priority, response_templates, next_context, requires_param, is_active } = await request.json();

    if (!intent_name || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: "Intent name and keywords array are required" }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO helpdesk_intent_rules (intent_name, keywords, priority, response_templates, next_context, requires_param, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, intent_name, keywords, priority, response_templates, next_context, requires_param, is_active, created_at
    `, [intent_name, keywords, priority || 100, response_templates || [], next_context || null, requires_param || [], is_active ?? true]);

    return NextResponse.json({ success: true, intent: result.rows[0] });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");
    const { id, intent_name, keywords, priority, response_templates, next_context, requires_param, is_active } = await request.json();

    if (!id || !intent_name) {
      return NextResponse.json({ error: "ID and intent name are required" }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE helpdesk_intent_rules 
      SET intent_name = $2, keywords = $3, priority = $4, response_templates = $5, 
          next_context = $6, requires_param = $7, is_active = $8
      WHERE id = $1
      RETURNING id, intent_name, keywords, priority, response_templates, next_context, requires_param, is_active, created_at
    `, [id, intent_name, keywords, priority, response_templates, next_context, requires_param, is_active]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Intent not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, intent: result.rows[0] });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await pool.query(`DELETE FROM helpdesk_intent_rules WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}