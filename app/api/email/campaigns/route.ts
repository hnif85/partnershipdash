import { NextRequest, NextResponse } from "next/server";
import { ensureEmailSchema } from "@/lib/emailSchema";
import { executeQuery, executeQuerySingle } from "@/lib/database";

export async function GET(request: NextRequest) {
  await ensureEmailSchema();

  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const campaign = await executeQuerySingle<any>(
      "SELECT * FROM email_campaigns WHERE id = $1",
      [parseInt(id)]
    );
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get recipient stats
    const recipientStats = await executeQuery<any>(
      `SELECT send_status, COUNT(*)::int as count
       FROM email_campaign_recipients
       WHERE campaign_id = $1
       GROUP BY send_status`,
      [parseInt(id)]
    );

    // Get recent recipients (sample)
    const recipients = await executeQuery<any>(
      `SELECT id, email, full_name, send_status, sent_at, opened_at, clicked_at, failed_at, error_message
       FROM email_campaign_recipients
       WHERE campaign_id = $1
       ORDER BY id DESC
       LIMIT 500`,
      [parseInt(id)]
    );

    return NextResponse.json({
      campaign,
      recipientStats,
      recipients,
    });
  }

  const campaigns = await executeQuery<any>(
    `SELECT id, name, subject, sender_name, sender_email, status, total_recipients,
            scheduled_at, sent_at, completed_at, created_at, error_message
     FROM email_campaigns
     ORDER BY created_at DESC
     LIMIT 100`
  );

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const body = await request.json();

    const name = String(body?.name || "").trim();
    const subject = String(body?.subject || "").trim();
    const htmlBody = String(body?.html_body || "").trim();

    if (!name || !subject || !htmlBody) {
      return NextResponse.json(
        { error: "name, subject, and html_body are required" },
        { status: 400 }
      );
    }

    const created = await executeQuerySingle<any>(
      `INSERT INTO email_campaigns (name, subject, sender_name, sender_email, template_id, html_body, plain_body, recipient_filter_json, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
       RETURNING *`,
      [
        name,
        subject,
        body?.sender_name || "MWX Market",
        body?.sender_email || "noreply@mwxmarket.ai",
        body?.template_id || null,
        htmlBody,
        body?.plain_body || null,
        JSON.stringify(body?.recipient_filter || {}),
        body?.created_by || null,
      ]
    );

    return NextResponse.json({ campaign: created });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const body = await request.json();

    if (!body?.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = ["name", "subject", "sender_name", "sender_email", "template_id", "html_body", "plain_body", "recipient_filter_json", "status", "error_message"];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(field === "recipient_filter_json" ? JSON.stringify(body[field]) : body[field]);
      }
    }

    if (body?.status === "cancelled") {
      updates.push(`updated_at = NOW()`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    params.push(body.id);
    const query = `UPDATE email_campaigns SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const updated = await executeQuerySingle<any>(query, params);
    return NextResponse.json({ campaign: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const id = parseInt(request.nextUrl.searchParams.get("id") || "");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await executeQuery("DELETE FROM email_campaign_recipients WHERE campaign_id = $1", [id]);
    await executeQuery("DELETE FROM email_campaigns WHERE id = $1", [id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
