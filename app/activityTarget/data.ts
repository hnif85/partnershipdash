import { ActivitySlug } from "@/lib/activityMapping";

export type Activity = {
  slug: ActivitySlug;
  title: string;
  description: string;
  meta: string;
  target: number;
  achieved: number;
  // Pertambahan pencapaian dibandingkan minggu lalu (dalam jumlah trx)
  weekDelta: number;
  highlight?: boolean;
  // Optional flags for cards that don't follow the standard target flow
  hasTarget?: boolean;
  link?: boolean;
};

type OtherActivity = {
  slug: "other";
  title: string;
  description: string;
  meta: string;
  target: number;
  achieved: number;
  weekDelta: number;
  highlight?: boolean;
  hasTarget?: boolean;
  link?: boolean;
};

export type ActivityCard = Activity | OtherActivity;

// Targets dipertahankan; hanya pencapaian di-update sesuai data terbaru pengguna.
export const activities: Activity[] = [
  {
    slug: "mwx-academy",
    title: "MWX Academy",
    description: "Edukasi berkelanjutan untuk aktivasi dan monetisasi awal.",
    meta: "20 kelas x 50 peserta x 1 trx",
    target: 5000,
    achieved: 0,
    weekDelta: 0,
  },
  {
    slug: "webinar-berbayar",
    title: "Webinar Berbayar",
    description: "Value education & onboarding produk.",
    meta: "8 webinar x 40 peserta x 2 trx",
    target: 1000,
    achieved: 23,
    weekDelta: 0,
  },
  {
    slug: "impact-plus",
    title: "Impact Plus",
    description: "Program CSR/kemitraan untuk adopsi teknologi UMKM skala besar.",
    meta: "5 perusahaan x 12.000 trx",
    target: 50000,
    achieved: 312,
    weekDelta: 0,
    highlight: true,
  },
  {
    slug: "digital-activation",
    title: "Digital Activation",
    description: "Pembelian langsung dan reaktivasi via kanal digital.",
    meta: "1.000 pembelian x 1 trx",
    target: 20000,
    achieved: 69,
    weekDelta: 31,
  },
  {
    slug: "gov-non-gov-offline-activation",
    title: "Gov & Non-Gov Offline Activation",
    description: "Aktivasi berbasis institusi dan komunitas.",
    meta: "10 event x 100 UMKM x 1 trx",
    target: 13000,
    achieved: 31,
    weekDelta: 0,
  },
  {
    slug: "on-ground-activation",
    title: "On Ground Activation",
    description: "Aktivasi hands-on berbasis kota.",
    meta: "4 kota x 500 UMKM x 5 trx",
    target: 11000,
    achieved: 21,
    weekDelta: 0,
  },
];

export const otherActivityCard: OtherActivity = {
  slug: "other",
  title: "Other / Misc",
  description: "Aktivitas lain yang tetap dipantau.",
  meta: "Transaksi yang tidak masuk kategori lain",
  target: 0,
  achieved: 14,
  weekDelta: 14,
  highlight: false,
  hasTarget: false,
  link: false,
};

export const formatNumber = (value: number) => value.toLocaleString("id-ID");

export const computeProgress = (achieved: number, target: number) =>
  Math.min(Math.round((achieved / target) * 1000) / 10 || 0, 999);
