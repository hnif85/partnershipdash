import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

// GET /api/referral/manage - Get all referral partners
export async function GET(request: Request) {
  try {
    const query = `
      SELECT
        id,
        code,
        partner,
        is_gov,
        created_at,
        updated_at
      FROM referral_partners
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);

    const partners = result.rows.map(row => ({
      id: row.id,
      code: row.code || '',
      partner: row.partner || '',
      is_gov: row.is_gov || false,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({
      partners,
      total: partners.length
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral partners fetch error:", error);
    return NextResponse.json({
      error: message,
      partners: [],
      total: 0
    }, { status: 500 });
  }
}

// POST /api/referral/manage - Create new referral partner
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, partner, is_gov } = body;

    if (!code || !partner) {
      return NextResponse.json({
        error: "Code and partner name are required"
      }, { status: 400 });
    }

    // Check if code already exists
    const checkQuery = "SELECT id FROM referral_partners WHERE code = $1";
    const checkResult = await pool.query(checkQuery, [code]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        error: "Referral code already exists"
      }, { status: 409 });
    }

    const insertQuery = `
      INSERT INTO referral_partners (code, partner, is_gov, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, code, partner, is_gov, created_at, updated_at
    `;

    const result = await pool.query(insertQuery, [code, partner, is_gov]);

    return NextResponse.json({
      message: "Referral partner created successfully",
      partner: result.rows[0]
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral partner creation error:", error);
    return NextResponse.json({
      error: message
    }, { status: 500 });
  }
}