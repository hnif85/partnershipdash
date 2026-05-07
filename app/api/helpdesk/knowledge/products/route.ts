import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

export async function GET() {
  try {
    // Get product knowledge from database or return default
    const result = await pool.query(`
      SELECT id, name, content, is_active, updated_at 
      FROM helpdesk_product_knowledge 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      return NextResponse.json({ 
        product: result.rows[0],
        content: result.rows[0].content 
      });
    }

    // Return default product knowledge
    return NextResponse.json({ 
      product: null,
      content: null,
      message: "No product knowledge found" 
    });
  } catch (error) {
    console.error("Failed to fetch product knowledge:", error);
    return NextResponse.json({ error: "Failed to fetch product knowledge" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, name } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Upsert - update if exists, insert if not
    const result = await pool.query(`
      INSERT INTO helpdesk_product_knowledge (name, content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET content = $2, updated_at = NOW()
      RETURNING id, name, content, updated_at
    `, [name || "Default Product Knowledge", content]);

    return NextResponse.json({ 
      success: true, 
      product: result.rows[0] 
    });
  } catch (error) {
    console.error("Failed to save product knowledge:", error);
    return NextResponse.json({ error: "Failed to save product knowledge" }, { status: 500 });
  }
}