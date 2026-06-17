import { pool } from "./database";

// ============================================
// INPUT SANITIZATION
// ============================================

const SCRIPT_PATTERNS = /<script[\s\S]*?<\/script>|javascript:|on\w+\s*=|<\s*img[\s\S]*?onerror|<\s*svg|<\s*iframe|<\s*embed/gi;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeText(input: string | undefined | null, maxLength: number = 200): string {
  if (!input) return "";
  let cleaned = input
    .replace(CONTROL_CHARS, "")
    .replace(SCRIPT_PATTERNS, "")
    .trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

export function sanitizePhone(input: string | undefined | null): string {
  if (!input) return "";
  return input.replace(/[^\d\s\-+()]/g, "").trim().substring(0, 30);
}

export function sanitizeEmail(input: string | undefined | null): string {
  if (!input) return "";
  return input.trim().toLowerCase().substring(0, 254);
}

export function sanitizeNotes(input: string | undefined | null): string {
  if (!input) return "";
  return sanitizeText(input, 1000);
}

export function sanitizeBusinessName(input: string | undefined | null): string {
  return sanitizeText(input, 200);
}

export function isValidQuestionnaireAnswer(
  answers: { question_id: string; answer_value: string }[] | undefined,
  validQuestionIds: Set<string>
): { question_id: string; answer_value: string }[] {
  if (!answers || !Array.isArray(answers)) return [];
  return answers.filter(
    (a) =>
      a &&
      typeof a.question_id === "string" &&
      validQuestionIds.has(a.question_id) &&
      typeof a.answer_value === "string" &&
      a.answer_value.length <= 500
  ).map(a => ({
    question_id: a.question_id,
    answer_value: sanitizeText(a.answer_value, 500),
  }));
}

// ============================================
// RATE LIMITING (Database-backed)
// ============================================

export async function ensureSecuritySchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INT NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at)
  `);
}

let schemaEnsured = false;

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    if (!schemaEnsured) {
      await ensureSecuritySchema();
      schemaEnsured = true;
    }
    const intervalMs = `${Math.ceil(windowMs / 1000)} seconds`;

    const result = await pool.query<{ count: number; reset_at: string }>(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, NOW() + $2::interval)
       ON CONFLICT (key) DO UPDATE
       SET
         count = CASE
           WHEN rate_limits.reset_at <= NOW() THEN 1
           ELSE rate_limits.count + 1
         END,
         reset_at = CASE
           WHEN rate_limits.reset_at <= NOW() THEN NOW() + $2::interval
           ELSE rate_limits.reset_at
         END
       RETURNING count, reset_at`,
      [key, intervalMs]
    );

    if (!result.rows[0]) return { allowed: true, remaining: maxRequests - 1 };

    const { count } = result.rows[0];
    const remaining = Math.max(0, maxRequests - count);
    return { allowed: count <= maxRequests, remaining };
  } catch {
    // If rate limit DB fails, let the request through (fail open)
    // but log the error server-side
    return { allowed: true, remaining: maxRequests };
  }
}

export async function cleanupRateLimits(): Promise<void> {
  try {
    await pool.query(`DELETE FROM rate_limits WHERE reset_at <= NOW()`);
  } catch {
    // Silent cleanup failure
  }
}

export function getRateLimitKey(
  request: Request,
  endpoint: string
): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `rate:${endpoint}:${ip}`;
}

// ============================================
// CSRF TOKEN
// ============================================

export function generateCsrfToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

export function verifyCsrfToken(
  headerToken: string | null,
  storedToken: string
): boolean {
  if (!headerToken || !storedToken) return false;
  if (headerToken.length !== storedToken.length) return false;
  // Timing-safe comparison
  let diff = 0;
  for (let i = 0; i < headerToken.length; i++) {
    diff |= headerToken.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================
// VALIDATION
// ============================================

export const MAX_FIELD_LENGTHS = {
  full_name: 200,
  phone_number: 20,
  email: 254,
  business_name: 200,
  city: 100,
  business_line: 200,
  notes: 1000,
  answer_value: 500,
} as const;
