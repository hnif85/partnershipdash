import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";

// PUT /api/referral/manage/[id] - Update referral partner
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, partner, is_gov, is_new } = body;

    if (!code || !partner) {
      return NextResponse.json({
        error: "Code and partner name are required"
      }, { status: 400 });
    }

    console.log("PUT request for ID:", id, "Body:", body);

    // Check if partner exists
    const checkQuery = "SELECT id, code FROM referral_partners WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      console.log("Partner not found for ID:", id);
      return NextResponse.json({
        error: "Referral partner not found"
      }, { status: 404 });
    }

    const currentPartner = checkResult.rows[0];

    // Check if new code already exists (but not for this partner)
    const duplicateQuery = "SELECT id FROM referral_partners WHERE code = $1 AND id != $2";
    const duplicateResult = await pool.query(duplicateQuery, [code, id]);

    if (duplicateResult.rows.length > 0) {
      return NextResponse.json({
        error: "Referral code already exists for another partner"
      }, { status: 409 });
    }

    const updateQuery = `
      UPDATE referral_partners
      SET code = $1, partner = $2, is_gov = $3, is_new = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, code, partner, is_gov, is_new, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, [code, partner, is_gov, is_new !== undefined ? is_new : false, id]);

    const updatedPartner = result.rows[0];
    return NextResponse.json({
      message: "Referral partner updated successfully",
      partner: {
        id: updatedPartner.id,
        code: updatedPartner.code || '',
        partner: updatedPartner.partner || '',
        is_gov: updatedPartner.is_gov || false,
        is_new: updatedPartner.is_new || false,
        created_at: updatedPartner.created_at,
        updated_at: updatedPartner.updated_at
      }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral partner update error:", error);
    return NextResponse.json({
      error: message
    }, { status: 500 });
  }
}

// DELETE /api/referral/manage/[id] - Delete referral partner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if partner exists
    const checkQuery = "SELECT id, code, partner FROM referral_partners WHERE id = $1";
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        error: "Referral partner not found"
      }, { status: 404 });
    }

    const partnerData = checkResult.rows[0];

    // Check if partner has active users (referral codes that are being used)
    const usageQuery = `
      SELECT COUNT(DISTINCT c.guid) as user_count
      FROM cms_customers c
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE c.referal_code = $1 AND dee.email IS NULL
    `;
    const usageResult = await pool.query(usageQuery, [partnerData.code]);

    if (usageResult.rows[0].user_count > 0) {
      return NextResponse.json({
        error: `Cannot delete partner. ${usageResult.rows[0].user_count} active users are using this referral code.`
      }, { status: 400 });
    }

    // Proceed with deletion
    const deleteQuery = "DELETE FROM referral_partners WHERE id = $1";
    await pool.query(deleteQuery, [id]);

    return NextResponse.json({
      message: "Referral partner deleted successfully",
      partner: partnerData
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral partner deletion error:", error);
    return NextResponse.json({
      error: message
    }, { status: 500 });
  }
}