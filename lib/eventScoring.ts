export type PriorityLevel = "HIGH" | "MEDIUM" | "LOW" | null;

export type QuestionAnswer = {
  question_id: string;
  question_section: string;
  question_type: string;
  answer_value: string;
  order_index: number;
};

export type ScoringResult = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  priority: PriorityLevel;
  breakdown: {
    section: string;
    score: number;
    maxScore: number;
    questions: {
      question_id: string;
      score: number;
      answer: string;
    }[];
  }[];
};

const SCORING_RULES: Record<string, Record<string, number>> = {
  Kapasitas_Bayar: {
    "< Rp1.000.000": 1,
    "Rp1.000.000 \u2013 Rp3.000.000": 2,
    "> Rp3.000.000": 3,
    "Tidak, masih menggunakan satu rekening yang sama": 1,
    "Ya, sepenuhnya terpisah": 3,
    "Tidak ada pencatatan formal (hanya berdasarkan ingatan atau struk)": 1,
    "Pencatatan manual di buku besar secara teratur": 2,
    "Menggunakan aplikasi keuangan (seperti Moka, BukuWarung, atau POS lainnya)": 3,
    "Tidak menentu dan sulit diprediksi": 1,
    "Cukup stabil, namun fluktuatif secara musiman": 2,
    "Sangat stabil": 3,
  },
  Motivasi_Berkembang: {
    "Merasa kondisi saat ini sudah cukup (zona nyaman)": 1,
    "Ada keinginan berkembang, tapi belum ada rencana detail": 2,
    "Ya, memiliki target tertulis yang terukur": 3,
    "Kebutuhan pribadi atau mendesak di luar usaha": 1,
    "Modal kerja operasional rutin": 2,
    "Investasi untuk meningkatkan penjualan (seperti menambah alat/stok/promosi)": 3,
    "Belum memiliki dan belum berencana mengurus": 1,
    "Sedang dalam proses pengurusan": 2,
    "Sudah memiliki NIB/dokumen legal lainnya": 3,
    "Tidak pernah": 1,
    "Jarang (hanya jika ada undangan/gratis)": 2,
    "Sering (lebih dari 2 kali)": 3,
  },
  Kesiapan_Digital: {
    "Hanya toko fisik (offline)": 1,
    "Hanya media sosial (WhatsApp, Instagram, FB) tanpa sistem transaksi otomatis": 2,
    "Marketplace (Shopee, Tokopedia, dll) dan media sosial secara aktif": 3,
    "Belum menyediakan pembayaran digital": 1,
    "Ada, tapi pelanggan lebih banyak membayar tunai": 2,
    "Ya, sebagian besar transaksi menggunakan QRIS/Transfer": 3,
    "Tidak bersedia membagikan data apa pun": 1,
    "Ragu-ragu, perlu penjelasan lebih lanjut": 2,
    "Sangat bersedia (selama keamanan data pribadi terjaga)": 3,
    "Di bawah SMA": 1,
    "SMA/Sederajat": 2,
    "Perguruan Tinggi (Sarjana/Diploma)": 3,
    "Jarang digunakan untuk urusan bisnis": 1,
    "Hanya sesekali untuk membalas chat pelanggan": 2,
    "Ya, smartphone adalah alat utama operasional saya": 3,
    "Belum menggunakan sistem apapun": 1,
    "Hanya pencatatan sederhana (Excel/notes)": 2,
    "Ya, menggunakan POS/digital register secara rutin": 3,
  },
};

const SECTION_MAX_SCORES: Record<string, number> = {
  Kapasitas_Bayar: 12,
  Motivasi_Berkembang: 15,
  Kesiapan_Digital: 15,
};

export function calculatePriority(answers: QuestionAnswer[]): ScoringResult {
  const breakdown: ScoringResult["breakdown"] = [];
  let totalScore = 0;
  let maxScore = 0;

  const sections = ["Kapasitas_Bayar", "Motivasi_Berkembang", "Kesiapan_Digital"];

  for (const section of sections) {
    const sectionAnswers = answers.filter((a) => a.question_section === section);
    const sectionRules = SCORING_RULES[section];
    const maxSectionScore = SECTION_MAX_SCORES[section];

    let sectionScore = 0;
    const questionScores: ScoringResult["breakdown"][0]["questions"] = [];

    for (const answer of sectionAnswers) {
      const score = sectionRules[answer.answer_value] || 1;
      sectionScore += score;
      questionScores.push({
        question_id: answer.question_id,
        score,
        answer: answer.answer_value,
      });
    }

    const questionCount = sectionAnswers.length;
    const expectedQuestions = getExpectedQuestionCount(section);
    if (questionCount < expectedQuestions) {
      const missingScore = (expectedQuestions - questionCount) * 1;
      sectionScore = Math.max(0, sectionScore - missingScore * 0.5);
    }

    breakdown.push({
      section,
      score: sectionScore,
      maxScore: maxSectionScore,
      questions: questionScores,
    });

    totalScore += sectionScore;
    maxScore += maxSectionScore;
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  let priority: PriorityLevel = null;
  if (percentage > 83) {
    priority = "HIGH";
  } else if (percentage >= 62) {
    priority = "MEDIUM";
  } else {
    priority = "LOW";
  }

  return {
    totalScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    priority,
    breakdown,
  };
}

function getExpectedQuestionCount(section: string): number {
  switch (section) {
    case "Kapasitas_Bayar":
      return 4;
    case "Motivasi_Berkembang":
      return 5;
    case "Kesiapan_Digital":
      return 6;
    default:
      return 0;
  }
}

export function getPriorityColor(priority: PriorityLevel): string {
  switch (priority) {
    case "HIGH":
      return "bg-green-100 text-green-800 border-green-300";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "LOW":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

export function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case "HIGH":
      return "Prioritas Tinggi";
    case "MEDIUM":
      return "Prioritas Sedang";
    case "LOW":
      return "Prioritas Rendah";
    default:
      return "Belum Dinilai";
  }
}

export function getPriorityScoreDisplay(priority: PriorityLevel, percentage: number): string {
  if (!priority) return "-";
  return `${priority} (${percentage.toFixed(1)}%)`;
}