import { NextRequest, NextResponse } from "next/server";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { executeQuery, executeQuerySingle } from "@/lib/database";
import { resolveSegmentRecipients } from "@/lib/crmSegments";
import { sendDamcorpText } from "@/lib/damcorpWhatsapp";

export async function GET(request: NextRequest) {
  await ensureCrmSchema();

  const mode = request.nextUrl.searchParams.get("mode") || "list";
  if (mode === "new_user_preview") {
    const templateName = (request.nextUrl.searchParams.get("template_name") || "").trim();
    if (!templateName) return NextResponse.json({ error: "template_name required" }, { status: 400 });

    const rows = await executeQuery<any>(
      `WITH new_users AS (
         SELECT c.guid, c.full_name, c.email, c.phone_number, c.referal_code AS partner, c.created_at
         FROM cms_customers c
         LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
         WHERE dee.email IS NULL
           AND c.created_at >= NOW() - INTERVAL '7 days'
           AND c.phone_number IS NOT NULL
       )
       SELECT nu.*
       FROM new_users nu
       WHERE NOT EXISTS (
         SELECT 1
         FROM crm_campaign_recipients r
         JOIN crm_campaigns cc ON cc.id = r.campaign_id
         WHERE r.customer_guid = nu.guid
           AND cc.template_name = $1
           AND r.send_status IN ('sent','delivered','read')
       )
       ORDER BY nu.created_at DESC`,
      [templateName]
    );

    return NextResponse.json({ total: rows.length, users: rows.slice(0, 1000) });
  }

  const campaigns = await executeQuery("SELECT * FROM crm_campaigns ORDER BY id DESC LIMIT 100");
  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema();
    const body = await request.json();

    if (body?.action === "send_new_user_template") {
      const templateName = String(body?.template_name || "").trim();
      let templateText = String(body?.template_text || "").trim();
      if (!templateName) {
        return NextResponse.json({ error: "template_name required" }, { status: 400 });
      }

      if (!templateText) {
        const tpl = await executeQuerySingle<any>(
          "SELECT template_text FROM crm_templates WHERE flow_type='new_user' AND template_name=$1 LIMIT 1",
          [templateName]
        );
        templateText = String(tpl?.template_text || "").trim();
      }

      if (!templateText) {
        return NextResponse.json({ error: "template_text not found for selected template" }, { status: 400 });
      }

      const campaign = await executeQuerySingle<{ id: number }>(
        `INSERT INTO crm_campaigns (name, message_type, template_name, text_body, status)
         VALUES ($1,'template',$2,$3,'running') RETURNING id`,
        [`New User - ${templateName}`, templateName, templateText]
      );
      const campaignId = campaign?.id as number;

      const recipients = await executeQuery<any>(
        `WITH new_users AS (
           SELECT c.guid, c.full_name, c.email, c.phone_number, c.referal_code AS partner, c.created_at
           FROM cms_customers c
           LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
           WHERE dee.email IS NULL
             AND c.created_at >= NOW() - INTERVAL '7 days'
             AND c.phone_number IS NOT NULL
         )
         SELECT nu.*
         FROM new_users nu
         WHERE NOT EXISTS (
           SELECT 1
           FROM crm_campaign_recipients r
           JOIN crm_campaigns cc ON cc.id = r.campaign_id
           WHERE r.customer_guid = nu.guid
             AND cc.template_name = $1
             AND r.send_status IN ('sent','delivered','read')
         )
         ORDER BY nu.created_at DESC`,
        [templateName]
      );

      let sent = 0;
      let failed = 0;
      for (const r of recipients) {
        try {
          const phone = String(r.phone_number || "");
          const normalized = phone.startsWith("+") ? phone : phone.startsWith("0") ? `+62${phone.slice(1)}` : phone.startsWith("62") ? `+${phone}` : `+${phone}`;
          const personalizedText = templateText.replaceAll("{{nama}}", String(r.full_name || "Sahabat MWX"));
          const result = await sendDamcorpText(normalized, personalizedText);
          await executeQuery(
            `INSERT INTO crm_campaign_recipients (campaign_id, customer_guid, phone_number, wa_message_id, send_status, provider_response_json, sent_at)
             VALUES ($1,$2,$3,$4,'sent',$5,NOW())`,
            [campaignId, r.guid, normalized, result.waMessageId || null, JSON.stringify(result.raw || {})]
          );
          sent += 1;
        } catch (err) {
          await executeQuery(
            `INSERT INTO crm_campaign_recipients (campaign_id, customer_guid, phone_number, send_status, error_message, failed_at)
             VALUES ($1,$2,$3,'failed',$4,NOW())`,
            [campaignId, r.guid, r.phone_number, err instanceof Error ? err.message : "send failed"]
          );
          failed += 1;
        }
      }

      await executeQuery("UPDATE crm_campaigns SET status='done', updated_at=NOW() WHERE id=$1", [campaignId]);
      return NextResponse.json({ ok: true, campaign_id: campaignId, template_name: templateName, total: recipients.length, sent, failed });
    }

    const name = String(body?.name || "").trim();
    const messageType = body?.message_type === "template" ? "template" : "text";
    if (!name) return NextResponse.json({ error: "Campaign name required" }, { status: 400 });

    const created = await executeQuerySingle<{ id: number }>(
      `INSERT INTO crm_campaigns (name, message_type, template_name, template_lang, template_components_json, text_body, status)
       VALUES ($1,$2,$3,$4,$5,$6,'draft') RETURNING id`,
      [name, messageType, body?.template_name || null, body?.template_lang || null, body?.template_components_json ? JSON.stringify(body.template_components_json) : null, body?.text_body || null]
    );

    return NextResponse.json({ id: created?.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed create campaign" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureCrmSchema();
    const body = await request.json();
    const campaignId = Number(body?.campaign_id);
    if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

    const campaign = await executeQuerySingle<any>("SELECT * FROM crm_campaigns WHERE id = $1", [campaignId]);
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const recipients = await resolveSegmentRecipients(body?.filters || {});
    if (recipients.length === 0) return NextResponse.json({ error: "No recipients" }, { status: 400 });

    await executeQuery("UPDATE crm_campaigns SET status='running', updated_at=NOW() WHERE id=$1", [campaignId]);

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        const result = await sendDamcorpText(recipient.phone_number, campaign.text_body || "Hello from CRM");
        await executeQuery(
          `INSERT INTO crm_campaign_recipients (campaign_id, customer_guid, phone_number, wa_message_id, send_status, provider_response_json, sent_at)
           VALUES ($1,$2,$3,$4,'sent',$5,NOW())`,
          [campaignId, recipient.customer_guid, recipient.phone_number, result.waMessageId || null, JSON.stringify(result.raw || {})]
        );
        sent += 1;
      } catch (err) {
        await executeQuery(
          `INSERT INTO crm_campaign_recipients (campaign_id, customer_guid, phone_number, send_status, error_message, failed_at)
           VALUES ($1,$2,$3,'failed',$4,NOW())`,
          [campaignId, recipient.customer_guid, recipient.phone_number, err instanceof Error ? err.message : "send failed"]
        );
        failed += 1;
      }
    }

    await executeQuery("UPDATE crm_campaigns SET status='done', updated_at=NOW() WHERE id=$1", [campaignId]);
    return NextResponse.json({ ok: true, sent, failed, total: recipients.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed send" }, { status: 500 });
  }
}
