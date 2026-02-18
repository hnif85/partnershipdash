import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { ACTIVITY_SLUGS } from "@/lib/activityMapping";

// GET /api/referral/manage - Get all referral partners
export async function GET(request: NextRequest) {
  try {
    const query = `
      SELECT
        id,
        code,
        partner,
        is_gov,
        activity_slug,
        is_new,
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
      activity_slug: row.activity_slug || null,
      is_new: row.is_new || false,
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, partner, is_gov, activity_slug } = body;

    if (!code || !partner) {
      return NextResponse.json({
        error: "Code and partner name are required"
      }, { status: 400 });
    }

    if (activity_slug && !ACTIVITY_SLUGS.includes(activity_slug)) {
      return NextResponse.json({ error: "Invalid activity slug" }, { status: 400 });
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
      INSERT INTO referral_partners (code, partner, is_gov, activity_slug, is_new, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, code, partner, is_gov, activity_slug, is_new, created_at, updated_at
    `;

    const result = await pool.query(insertQuery, [code, partner, is_gov, activity_slug ?? null, false]);

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

// PUT /api/referral/manage/[id] - Update existing referral partner
export async function PUT(request: NextRequest, context: any) {
  try {
    const { params } = context as { params: { id: string } };
    const id = params.id;
    const body = await request.json();
    const { code, partner, is_gov, is_new, activity_slug } = body;

    if (!partner) {
      return NextResponse.json({
        error: "Partner name is required"
      }, { status: 400 });
    }

    if (activity_slug && !ACTIVITY_SLUGS.includes(activity_slug)) {
      return NextResponse.json({ error: "Invalid activity slug" }, { status: 400 });
    }

    // Check if partner exists
    const checkQuery = "SELECT id FROM referral_partners WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        error: "Referral partner not found"
      }, { status: 404 });
    }

    // Check if new code already exists (if code is being changed)
    const currentQuery = "SELECT code FROM referral_partners WHERE id = $1";
    const currentResult = await pool.query(currentQuery, [id]);
    const currentCode = currentResult.rows[0].code;

    if (code !== currentCode) {
      const conflictQuery = "SELECT id FROM referral_partners WHERE code = $1";
      const conflictResult = await pool.query(conflictQuery, [code]);

      if (conflictResult.rows.length > 0) {
        return NextResponse.json({
          error: "Referral code already exists"
        }, { status: 409 });
      }
    }

    const updateQuery = `
      UPDATE referral_partners
      SET code = $1, partner = $2, is_gov = $3, activity_slug = $4, is_new = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING id, code, partner, is_gov, activity_slug, is_new, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [code, partner, is_gov, activity_slug ?? null, is_new, id]);

    return NextResponse.json({
      message: "Referral partner updated successfully",
      partner: result.rows[0]
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral partner update error:", error);
    return NextResponse.json({
      error: message
    }, { status: 500 });
  }
}
