// Mapping referral -> activity slug for activityTarget dashboard.
// Keep this file data-only so it can be reused by API helpers and pages.

export type ActivitySlug =
  | "mwx-academy"
  | "webinar-berbayar"
  | "impact-plus"
  | "digital-activation"
  | "gov-non-gov-offline-activation"
  | "on-ground-activation";

export const ACTIVITY_SLUGS: ActivitySlug[] = [
  "impact-plus",
  "gov-non-gov-offline-activation",
  "on-ground-activation",
  "webinar-berbayar",
  "mwx-academy",
  "digital-activation",
];

export const ACTIVITY_LABELS: Record<ActivitySlug, string> = {
  "impact-plus": "Impact Plus (CSR/BUMN)",
  "gov-non-gov-offline-activation": "Gov & Non-Gov Offline Activation",
  "on-ground-activation": "On Ground Activation",
  "webinar-berbayar": "Webinar Berbayar",
  "mwx-academy": "MWX Academy",
  "digital-activation": "Digital Activation",
};

type ReferralRule = {
  slug: ActivitySlug;
  patterns: RegExp[];
  note?: string;
};

// Order matters: first match wins. Keep most specific first.
export const REFERRAL_RULES: ReferralRule[] = [
  {
    slug: "impact-plus",
    note: "CSR/korporasi dan BUMN",
    patterns: [
      /smesco/i,
      /rumah\s+bumn/i,
      /\bcliff\b/i,
      /csr/i,
      /corporate/i,
      /bumn/i,
    ],
  },
  {
    slug: "gov-non-gov-offline-activation",
    note: "Pemerintah/instansi daerah dan lembaga lokal",
    patterns: [
      /kabupaten/i,
      /pemkab/i,
      /pemkot/i,
      /pemprov/i,
      /dinas/i,
      /disdag/i,
      /dinkop/i,
      /oga\s+sukabumi/i,
      /trainer\s+sukabumi/i,
    ],
  },
  {
    slug: "on-ground-activation",
    note: "Event/komunitas kota secara luring",
    patterns: [
      /kompak\s*tangsel/i,
      /tangan\s+diatas/i,
      /rohmat\s+digital/i,
      /chapter/i,
      /kota\b/i,
      /roadshow/i,
      /offline/i,
      /tracking\s*iklan/i,
    ],
  },
  {
    slug: "webinar-berbayar",
    note: "Event online berbayar / tiket",
    patterns: [
      /ai\s*untuk\s*umkm/i,
      /webinar/i,
      /zoom/i,
      /ticket|tiket/i,
      /berbayar/i,
    ],
  },
  {
    slug: "mwx-academy",
    note: "Kelas/bootcamp internal MWX",
    patterns: [
      /academy/i,
      /bootcamp/i,
      /pelatihan/i,
      /kelas/i,
      /training/i,
    ],
  },
  {
    slug: "digital-activation",
    note: "Fallback digital & referral kosong",
    patterns: [
      /^n\/a$/i,
      /^$/,
      /ads/i,
      /online/i,
    ],
  },
];

export const FALLBACK_SLUG: ActivitySlug = "digital-activation";

// Return the first matching activity slug; otherwise fallback.
export function mapReferralToActivity(referralRaw: string | null | undefined): ActivitySlug {
  const referral = (referralRaw || "").trim();
  for (const rule of REFERRAL_RULES) {
    if (rule.patterns.some((regex) => regex.test(referral))) {
      return rule.slug;
    }
  }
  return FALLBACK_SLUG;
}

// Helper to quickly categorize a batch of referrals (e.g., from XLSX rows).
export function tallyByActivity(referrals: Array<string | null | undefined>): Record<ActivitySlug, number> {
  const tally: Record<ActivitySlug, number> = {
    "mwx-academy": 0,
    "webinar-berbayar": 0,
    "impact-plus": 0,
    "digital-activation": 0,
    "gov-non-gov-offline-activation": 0,
    "on-ground-activation": 0,
  };

  referrals.forEach((ref) => {
    const slug = mapReferralToActivity(ref);
    tally[slug] += 1;
  });

  return tally;
}
