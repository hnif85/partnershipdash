import { NextRequest, NextResponse } from "next/server";
import { ensureEmailSchema } from "@/lib/emailSchema";
import { executeQuery, executeQuerySingle } from "@/lib/database";
import { loadEmailSettings, sendBatchEmail, getPersonalizationVars } from "@/lib/emailSender";

/**
 * POST /api/email/campaigns/[id]?action=send
 * Mengirim campaign email ke semua recipient
 */
export async function POST(request: NextRequest) {
  try {
    await ensureEmailSchema();

    const url = new URL(request.url);
    const id = parseInt(url.pathname.split("/").filter(Boolean).pop() || "");
    const action = url.searchParams.get("action") || "send";

    if (!id) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const campaign = await executeQuerySingle<any>(
      "SELECT * FROM email_campaigns WHERE id = $1",
      [id]
    );

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (action === "preview_count") {
      // Just count how many recipients
      const { recipients, total } = await resolveRecipients(campaign);
      return NextResponse.json({ total, sample: recipients.slice(0, 20) });
    }

    if (action === "send") {
      if (campaign.status === "sent") {
        return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });
      }

      const settings = await loadEmailSettings();
      if (!settings) {
        return NextResponse.json(
          { error: "SMTP not configured. Please configure email settings first." },
          { status: 400 }
        );
      }

      // Mark as sending
      await executeQuery(
        "UPDATE email_campaigns SET status = 'sending', updated_at = NOW() WHERE id = $1",
        [id]
      );

      // Resolve recipients
      const { recipients } = await resolveRecipients(campaign);

      if (recipients.length === 0) {
        await executeQuery(
          "UPDATE email_campaigns SET status = 'failed', error_message = 'No recipients found', updated_at = NOW() WHERE id = $1",
          [id]
        );
        return NextResponse.json({ error: "No recipients found" }, { status: 400 });
      }

      // Insert recipients to tracking table
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const r of recipients) {
        const result = await sendBatchEmail(
          settings,
          [{
            email: r.email,
            fullName: r.full_name || "Sahabat MWX",
            variables: getPersonalizationVars(r),
          }],
          campaign.subject,
          campaign.html_body,
          campaign.plain_body,
        );

        if (result.sent > 0) {
          // Insert successful recipient record
          await executeQuery(
            `INSERT INTO email_campaign_recipients (campaign_id, customer_guid, email, full_name, variables_json, send_status, sent_at, provider_message_id)
             VALUES ($1, $2, $3, $4, $5, 'sent', NOW(), $6)`,
            [
              id,
              r.guid || null,
              r.email,
              r.full_name || "Sahabat MWX",
              JSON.stringify(getPersonalizationVars(r)),
              result.results[0]?.messageId || null,
            ]
          );
          sent++;
        } else {
          // Insert failed recipient record
          await executeQuery(
            `INSERT INTO email_campaign_recipients (campaign_id, customer_guid, email, full_name, variables_json, send_status, failed_at, error_message)
             VALUES ($1, $2, $3, $4, $5, 'failed', NOW(), $6)`,
            [
              id,
              r.guid || null,
              r.email,
              r.full_name || "Sahabat MWX",
              JSON.stringify(getPersonalizationVars(r)),
              result.results[0]?.error || "Unknown error",
            ]
          );
          failed++;
          if (result.results[0]?.error) {
            errors.push(`${r.email}: ${result.results[0].error}`);
          }
        }
      }

      // Update campaign
      const finalStatus = failed > 0 && sent === 0 ? "failed" : "sent";
      await executeQuery(
        `UPDATE email_campaigns
         SET status = $1, total_recipients = $2, sent_at = NOW(), completed_at = NOW(), error_message = $3, updated_at = NOW()
         WHERE id = $4`,
        [finalStatus, recipients.length, errors.length > 0 ? errors.slice(0, 5).join("; ") : null, id]
      );

      return NextResponse.json({
        ok: true,
        campaign_id: id,
        total: recipients.length,
        sent,
        failed,
        errors: errors.slice(0, 10),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process campaign" },
      { status: 500 }
    );
  }
}

/**
 * Resolve recipients based on campaign filter
 * Supports same multi-dimension filters as /api/email/recipients
 */
async function resolveRecipients(campaign: any): Promise<{ recipients: any[]; total: number }> {
  const filter = campaign.recipient_filter_json || {};

  let whereClause = `c.email IS NOT NULL AND c.email != '' AND dee.email IS NULL`;
  const params: any[] = [];
  let paramIdx = 0;

  // Filter by partner
  if (filter.partner) {
    paramIdx++;
    params.push(filter.partner);
    whereClause += ` AND c.referal_code = $${paramIdx}`;
  }

  // Filter by date range (created_at)
  if (filter.date_from) {
    paramIdx++;
    params.push(filter.date_from);
    whereClause += ` AND c.created_at >= $${paramIdx}::timestamp`;
  }
  if (filter.date_to) {
    paramIdx++;
    params.push(filter.date_to);
    whereClause += ` AND c.created_at <= $${paramIdx}::timestamp`;
  }

  // Filter by recent days
  if (filter.recent_days) {
    paramIdx++;
    params.push(`${filter.recent_days} days`);
    whereClause += ` AND c.created_at >= NOW() - $${paramIdx}::interval`;
  }

  // Filter by status (has transaction from credit_manager_transactions)
  if (filter.status === "has_transaction") {
    whereClause += ` AND EXISTS (SELECT 1 FROM credit_manager_transactions cmt WHERE cmt.customer_guid = c.guid)`;
  } else if (filter.status === "no_transaction") {
    whereClause += ` AND NOT EXISTS (SELECT 1 FROM credit_manager_transactions cmt WHERE cmt.customer_guid = c.guid)`;
  } else if (filter.status === "subscribed") {
    whereClause += ` AND EXISTS (SELECT 1 FROM user_products up WHERE up.customer_guid = c.guid AND up.status = 'Active')`;
  } else if (filter.status === "unsubscribed") {
    whereClause += ` AND NOT EXISTS (SELECT 1 FROM user_products up WHERE up.customer_guid = c.guid AND up.status = 'Active')`;
  }

  // Filter by event attendance
  if (filter.event_id) {
    paramIdx++;
    params.push(parseInt(filter.event_id));
    whereClause += ` AND (c.email IN (SELECT er.email FROM event_registrations er WHERE er.event_id = $${paramIdx})
                         OR c.guid IN (SELECT er.customer_guid FROM event_registrations er WHERE er.event_id = $${paramIdx}))`;
  }

  // Search by name or email
  if (filter.search) {
    paramIdx++;
    params.push(`%${filter.search}%`);
    whereClause += ` AND (c.full_name ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx})`;
  }

  // Custom query filter (advanced / legacy)
  if (filter.custom_query) {
    whereClause += ` AND (${filter.custom_query})`;
  }

  const recipients = await executeQuery<any>(
    `SELECT c.guid, c.full_name, c.email, c.phone_number, c.referal_code AS partner, c.created_at
     FROM cms_customers c
     LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
     WHERE ${whereClause}
     ORDER BY c.created_at DESC`,
    params
  );

  return { recipients, total: recipients.length };
}
