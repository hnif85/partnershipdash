import { NextResponse } from "next/server";
import { ensureEmailSchema } from "@/lib/emailSchema";
import { executeQuery } from "@/lib/database";

export async function GET() {
  await ensureEmailSchema();

  try {
    // Stats overview
    const totalCampaigns = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaigns"
    );

    const sentCampaigns = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaigns WHERE status = 'sent'"
    );

    const totalRecipients = await executeQuery<{ total: string }>(
      "SELECT COALESCE(SUM(total_recipients), 0) as total FROM email_campaigns"
    );

    const totalSent = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaign_recipients WHERE send_status IN ('sent','delivered','opened','clicked')"
    );

    const totalFailed = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaign_recipients WHERE send_status IN ('failed','bounced')"
    );

    const totalOpened = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaign_recipients WHERE opened_at IS NOT NULL"
    );

    const totalClicked = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_campaign_recipients WHERE clicked_at IS NOT NULL"
    );

    const totalCustomers = await executeQuery<{ count: string }>(
      `SELECT COUNT(*) as count FROM cms_customers c
       LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
       WHERE dee.email IS NULL AND c.email IS NOT NULL`
    );

    const hasSettings = await executeQuery<{ count: string }>(
      "SELECT COUNT(*) as count FROM email_settings WHERE is_active = true"
    );

    const recentCampaigns = await executeQuery<any>(
      "SELECT id, name, subject, status, total_recipients, created_at, sent_at, completed_at FROM email_campaigns ORDER BY created_at DESC LIMIT 10"
    );

    return NextResponse.json({
      stats: {
        totalCampaigns: parseInt(totalCampaigns[0]?.count || "0"),
        sentCampaigns: parseInt(sentCampaigns[0]?.count || "0"),
        totalRecipients: parseInt(totalRecipients[0]?.total || "0"),
        totalSent: parseInt(totalSent[0]?.count || "0"),
        totalFailed: parseInt(totalFailed[0]?.count || "0"),
        totalOpened: parseInt(totalOpened[0]?.count || "0"),
        totalClicked: parseInt(totalClicked[0]?.count || "0"),
        openRate: parseInt(totalSent[0]?.count || "0") > 0
          ? ((parseInt(totalOpened[0]?.count || "0") / parseInt(totalSent[0]?.count || "1")) * 100).toFixed(1)
          : "0",
        clickRate: parseInt(totalSent[0]?.count || "0") > 0
          ? ((parseInt(totalClicked[0]?.count || "0") / parseInt(totalSent[0]?.count || "1")) * 100).toFixed(1)
          : "0",
        totalCustomers: parseInt(totalCustomers[0]?.count || "0"),
        smtpConfigured: parseInt(hasSettings[0]?.count || "0") > 0,
      },
      recentCampaigns,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}
