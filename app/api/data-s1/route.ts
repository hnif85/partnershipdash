import { NextResponse } from "next/server";

const SOURCE_URL = "https://n8n.mediawave.co.id/webhook/data_s1";

type RawDatum = {
  ["count_Tanggal_Input_Data"]?: number;
  ["'Tanggal_Input_Data'"]?: string;
  ["Tanggal_Input_Data"]?: string;
  ["Tanggal Input Data"]?: string;
  ["count_Nama_Training/Sumber_Data"]?: number;
  ["'Nama_Training/Sumber_Data'"]?: string;
  ["Nama_Training/Sumber_Data"]?: string;
  ["Nama Training/Sumber Data"]?: string;
};

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as RawDatum[];

    const dateMap = new Map<
      string,
      { total: number; breakdown: { label: string; count: number }[] }
    >();

    data.forEach((item) => {
      const dateLabel =
        item["'Tanggal_Input_Data'"] ??
        item["Tanggal_Input_Data"] ??
        item["Tanggal Input Data"] ??
        "Unknown";
      const sourceLabel =
        item["'Nama_Training/Sumber_Data'"] ??
        item["Nama_Training/Sumber_Data"] ??
        item["Nama Training/Sumber Data"] ??
        "Unknown";
      const rawCount = item["count_Tanggal_Input_Data"];
      const count =
        typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount > 0
          ? rawCount
          : 1;

      if (!dateMap.has(dateLabel)) {
        dateMap.set(dateLabel, { total: 0, breakdown: [] });
      }
      const entry = dateMap.get(dateLabel)!;
      entry.total += count;
      const existing = entry.breakdown.find((b) => b.label === sourceLabel);
      if (existing) {
        existing.count += count;
      } else {
        entry.breakdown.push({ label: sourceLabel, count });
      }
    });

    const dates = Array.from(dateMap.entries()).map(([label, value]) => ({
      label,
      count: value.total,
    }));

    const compositions = Array.from(dateMap.entries()).map(([label, value]) => ({
      label,
      count: value.total,
      breakdown: value.breakdown.sort((a, b) => b.count - a.count),
    }));

    return NextResponse.json({ dates, compositions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
