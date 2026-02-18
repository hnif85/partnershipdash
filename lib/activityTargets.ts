import { pool } from "./database";
import { ActivitySlug, mapReferralToActivity } from "./activityMapping";

export type ActivityAchievement = {
  slug: ActivitySlug;
  achieved: number; // jumlah transaksi
  uniqueBuyers: number; // distinct customer_guid
  revenueIdr: number; // total rupiah
};

// Ambil agregasi transaksi IDR berstatus finished dari DB, lalu map ke activity card.
export async function getActivityAchievementsFromDB(): Promise<Record<ActivitySlug, ActivityAchievement>> {
  const query = `
    SELECT
      COALESCE(rp.partner, 'N/A') AS referral_name,
      COUNT(*) AS trx_count,
      COUNT(DISTINCT t.customer_guid::uuid) AS buyers,
      COALESCE(SUM(t.grand_total), 0) AS revenue_idr
    FROM transactions t
    LEFT JOIN cms_customers c ON t.customer_guid::uuid = c.guid::uuid
    LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
    LEFT JOIN referral_partners rp ON c.referal_code = rp.code
    WHERE UPPER(t.valuta_code) = 'IDR'
      AND LOWER(t.status) = 'finished'
      AND (dee.email IS NULL)
    GROUP BY COALESCE(rp.partner, 'N/A')
  `;

  const { rows } = await pool.query<{
    referral_name: string | null;
    trx_count: string | number;
    buyers: string | number;
    revenue_idr: string | number;
  }>(query);

  const base: Record<ActivitySlug, ActivityAchievement> = {
    "mwx-academy": { slug: "mwx-academy", achieved: 0, uniqueBuyers: 0, revenueIdr: 0 },
    "webinar-berbayar": { slug: "webinar-berbayar", achieved: 0, uniqueBuyers: 0, revenueIdr: 0 },
    "impact-plus": { slug: "impact-plus", achieved: 0, uniqueBuyers: 0, revenueIdr: 0 },
    "digital-activation": { slug: "digital-activation", achieved: 0, uniqueBuyers: 0, revenueIdr: 0 },
    "gov-non-gov-offline-activation": {
      slug: "gov-non-gov-offline-activation",
      achieved: 0,
      uniqueBuyers: 0,
      revenueIdr: 0,
    },
    "on-ground-activation": { slug: "on-ground-activation", achieved: 0, uniqueBuyers: 0, revenueIdr: 0 },
  };

  for (const row of rows) {
    const slug = mapReferralToActivity(row.referral_name);
    base[slug].achieved += Number(row.trx_count) || 0;
    base[slug].uniqueBuyers += Number(row.buyers) || 0;
    base[slug].revenueIdr += Number(row.revenue_idr) || 0;
  }

  return base;
}
