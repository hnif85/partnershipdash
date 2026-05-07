import { executeQuery } from "@/lib/database";

export type SegmentFilters = {
  search?: string;
  statusFilter?: string;
  churnFilter?: string;
};

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+${digits}`;
}

export async function resolveSegmentRecipients(filters: SegmentFilters) {
  const statusFilter = filters.statusFilter || "all";
  const churnFilter = filters.churnFilter || "all";
  const search = (filters.search || "").trim();

  const rows = await executeQuery<{
    guid: string;
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
    churn_status: string | null;
  }>(`
    SELECT c.guid, c.full_name, c.email, c.phone_number,
      CASE
        WHEN last_debit.last_debit_at IS NULL THEN 'pasif'
        WHEN last_debit.last_debit_at < NOW() - INTERVAL '30 days' THEN 'pasif'
        WHEN last_debit.last_debit_at < NOW() - INTERVAL '7 days' THEN 'idle'
        ELSE 'aktif'
      END AS churn_status
    FROM cms_customers c
    LEFT JOIN LATERAL (
      SELECT MAX(created_at) AS last_debit_at
      FROM credit_manager_transactions t
      WHERE t.user_id = c.guid::uuid AND LOWER(t.type) = 'debit'
    ) last_debit ON TRUE
    LEFT JOIN demo_excluded_emails dee ON dee.email = c.email AND dee.is_active = true
    WHERE dee.email IS NULL
      AND ($1::text = '' OR c.full_name ILIKE $2 OR c.email ILIKE $2)
  `, [search, `%${search}%`]);

  let filtered = rows;
  if (churnFilter !== "all") filtered = filtered.filter((r) => (r.churn_status || "") === churnFilter);
  if (statusFilter !== "all") {
    // Minimal V1: use basic active/inactive status mapping if requested
    filtered = filtered.filter((r) => statusFilter === "with_phone" ? !!r.phone_number : true);
  }

  const dedup = new Map<string, any>();
  for (const row of filtered) {
    const phone = normalizePhone(row.phone_number);
    if (!phone) continue;
    if (!dedup.has(phone)) {
      dedup.set(phone, {
        customer_guid: row.guid,
        full_name: row.full_name,
        email: row.email,
        phone_number: phone,
        churn_status: row.churn_status,
      });
    }
  }
  return Array.from(dedup.values());
}
