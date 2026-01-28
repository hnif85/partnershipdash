import { NextResponse } from "next/server";


const SOURCE_URL = "https://n8n.mediawave.co.id/webhook/s2_data";

type RawResponse =
  | Record<string, number | string>
  | Array<Record<string, number | string>>;

export async function GET() {
  try {
    const response = await fetch(SOURCE_URL, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: 502 },
      );
    }

    const raw = (await response.json()) as RawResponse;

    const record: Record<string, number> = {};
    if (Array.isArray(raw)) {
      raw.forEach((entry) => {
        Object.entries(entry || {}).forEach(([label, value]) => {
          const num = typeof value === "number" ? value : Number(value) || 0;
          record[label] = (record[label] || 0) + num;
        });
      });
    } else {
      Object.entries(raw || {}).forEach(([label, value]) => {
        const num = typeof value === "number" ? value : Number(value) || 0;
        record[label] = (record[label] || 0) + num;
      });
    }

    const dates = Object.entries(record).map(([label, count]) => ({
      label,
      count,
    }));

    return NextResponse.json({ dates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
