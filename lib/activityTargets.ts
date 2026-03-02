import { pool } from "./database";
import { ActivitySlug, mapReferralToActivity } from "./activityMapping";

export type ActivityAchievement = {
  slug: ActivitySlug;
  achieved: number; // jumlah transaksi
  uniqueBuyers: number; // distinct customer_guid
  revenueIdr: number; // total rupiah
};

export type ActivityCustomer = {
  guid?: string;
  full_name: string;
  email: string;
  phone_number: string;
  city: string;
  country: string;
  referal_code: string;
  referral_partner: string;
  created_at?: string;
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

// Ambil daftar customer yang dipetakan ke activity tertentu (berdasarkan referral partner)
export async function getActivityCustomersFromDB(
  slug: ActivitySlug,
  limit: number = 2000
): Promise<ActivityCustomer[]> {
  // Jika tidak ada database, kembalikan kosong agar UI tetap jalan.
  if (!process.env.DATABASE_URL) return [];

  // Petakan regex rules ke SQL untuk menghindari fetch seluruh tabel.
  const query = `
    WITH categorized AS (
      SELECT
        c.guid,
        c.full_name,
        c.email,
        c.phone_number,
        c.city,
        c.country,
        COALESCE(c.referal_code, '') AS referal_code,
        COALESCE(rp.partner, 'N/A') AS referral_partner,
        c.created_at,
        CASE
          WHEN rp.partner ~* '(smesco|rumah\\s+bumn|\\bcliff\\b|csr|corporate|bumn)' THEN 'impact-plus'
          WHEN rp.partner ~* '(kabupaten|pemkab|pemkot|pemprov|dinas|disdag|dinkop|oga\\s+sukabumi|trainer\\s+sukabumi)' THEN 'gov-non-gov-offline-activation'
          WHEN rp.partner ~* '(kompak\\s*tangsel|tangan\\s+diatas|rohmat\\s+digital|chapter|kota\\b|roadshow|offline|tracking\\s*iklan)' THEN 'on-ground-activation'
          WHEN rp.partner ~* '(ai\\s*untuk\\s*umkm|webinar|zoom|ticket|tiket|berbayar)' THEN 'webinar-berbayar'
          WHEN rp.partner ~* '(academy|bootcamp|pelatihan|kelas|training)' THEN 'mwx-academy'
          WHEN rp.partner ~* '^(n/a)$' OR rp.partner IS NULL OR rp.partner ~* '^$' OR rp.partner ~* 'ads' OR rp.partner ~* 'online' THEN 'digital-activation'
          ELSE 'digital-activation' -- fallback sama seperti mapReferralToActivity
        END AS activity_slug
      FROM cms_customers c
      LEFT JOIN referral_partners rp ON c.referal_code = rp.code
      LEFT JOIN demo_excluded_emails dee ON c.email = dee.email AND dee.is_active = true
      WHERE dee.email IS NULL
    )
    SELECT guid, full_name, email, phone_number, city, country, referal_code, referral_partner, created_at
    FROM categorized
    WHERE activity_slug = $1
    ORDER BY created_at DESC NULLS LAST
    LIMIT $2
  `;

  const values = [slug, limit];
  const { rows } = await pool.query<ActivityCustomer>(query, values);

  // Normalisasi teks agar konsisten di UI
  return rows.map((row) => ({
    ...row,
    full_name: row.full_name || row.email || "Unknown User",
    email: row.email || "",
    phone_number: row.phone_number || "",
    city: row.city || "",
    country: row.country || "",
    referal_code: row.referal_code || "",
    referral_partner: row.referral_partner || "N/A",
  }));
}
