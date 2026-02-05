export type Activity = {
  slug: string;
  title: string;
  description: string;
  meta: string;
  target: number;
  achieved: number;
  highlight?: boolean;
};

export const activities: Activity[] = [
  {
    slug: "mwx-academy",
    title: "MWX Academy",
    description: "Edukasi berkelanjutan untuk aktivasi dan monetisasi awal.",
    meta: "20 kelas x 50 peserta x 1 trx",
    target: 1000,
    achieved: 420,
  },
  {
    slug: "webinar-berbayar",
    title: "Webinar Berbayar",
    description: "Value education & onboarding produk.",
    meta: "8 webinar x 40 peserta x 2 trx",
    target: 640,
    achieved: 380,
  },
  {
    slug: "impact-plus-program-inti",
    title: "Impact Plus (Program Inti)",
    description: "Program CSR/kemitraan untuk adopsi teknologi UMKM skala besar.",
    meta: "5 perusahaan x 12.000 trx",
    target: 60000,
    achieved: 15000,
    highlight: true,
  },
  {
    slug: "digital-activation",
    title: "Digital Activation",
    description: "Pembelian langsung dan reaktivasi via kanal digital.",
    meta: "1.000 pembelian x 1 trx",
    target: 1000,
    achieved: 200,
  },
  {
    slug: "gov-non-gov-offline-activation",
    title: "Gov & Non-Gov Offline Activation",
    description: "Aktivasi berbasis institusi dan komunitas.",
    meta: "10 event x 100 UMKM x 1 trx",
    target: 1000,
    achieved: 300,
  },
  {
    slug: "on-ground-activation",
    title: "On Ground Activation",
    description: "Aktivasi hands-on berbasis kota.",
    meta: "4 kota x 500 UMKM x 5 trx",
    target: 10000,
    achieved: 4200,
  },
];

export const formatNumber = (value: number) => value.toLocaleString("id-ID");

export const computeProgress = (achieved: number, target: number) =>
  Math.min(Math.round((achieved / target) * 1000) / 10 || 0, 999);
