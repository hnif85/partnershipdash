import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { verifyAuth, requireRole, authErrorResponse } from "@/lib/auth";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT id, name, tone, greeting, closing, signature_phrases, 
             response_templates_json, is_active, created_at, updated_at
      FROM helpdesk_personas 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ personas: result.rows });
  } catch (error) {
    console.error("Failed to fetch personas:", error);
    return NextResponse.json({ error: "Failed to fetch personas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");

    const { name, tone, greeting, closing, signature_phrases, response_templates_json, is_active } = await request.json();

    if (!name || !tone) {
      return NextResponse.json({ error: "Name and tone are required" }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO helpdesk_personas (name, tone, greeting, closing, signature_phrases, response_templates_json, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, tone, greeting, closing, signature_phrases, is_active, created_at
    `, [name, tone, greeting || null, closing || null, signature_phrases || [], response_templates_json || {}, is_active ?? true]);

    return NextResponse.json({ success: true, persona: result.rows[0] });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request.headers);
    requireRole(user, "super_admin", "partnership");
    const { id, name, tone, greeting, closing, signature_phrases, response_templates_json, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const result = await pool.query(`
      UPDATE helpdesk_personas 
      SET name = $2, tone = $3, greeting = $4, closing = $5, signature_phrases = $6, 
          response_templates_json = $7, is_active = $8, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, tone, greeting, closing, signature_phrases, is_active, updated_at
    `, [id, name, tone, greeting, closing, signature_phrases, response_templates_json, is_active]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, persona: result.rows[0] });
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

    await pool.query(`DELETE FROM helpdesk_personas WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}