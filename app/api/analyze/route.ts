import { NextRequest, NextResponse } from "next/server";

// Konfigurasi Runtime (Opsional: gunakan 'edge' jika ingin performa lebih cepat di Vercel)
export const runtime = "edge"; 

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "Partnership Dash";

// Konstanta Error
const AI_UNAVAILABLE = "AI not available";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    // 1. Validasi API Key Server-side
    if (!apiKey) {
      console.error("[analyze] Missing OPENROUTER_API_KEY");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // 2. Parsing & Validasi Body
    const body = await req.json().catch(() => null); // Handle malformed JSON
    if (!body?.source || !Array.isArray(body.data)) {
      return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
    }

    // 3. Pre-processing Data (Token Saving)
    // Ambil 30 item terakhir saja untuk hemat token, atau filter nilai 0 jika tidak relevan
    const trimmed = body.data.slice(-30); 
    const serialized = trimmed
      .map((d: any) => `${d.label}: ${Number(d.count) || 0}`)
      .join(", ");

    // Jika data kosong setelah diproses
    if (!serialized) {
      return NextResponse.json({ text: "Tidak ada data yang cukup untuk dianalisis." });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are an analytics assistant. Konteks: ini adalah data user yang diakuisisi dengan baseline funnel S1–S5.\nDefinisi:\nS1 – Terdaftar dalam Database (semua UMKM yang sudah masuk database lewat event/form/partnership; baseline semua user ada di sini).\nS2 – Memiliki Akun (subset S1, sudah registrasi akun valid; S2 = akumulasi S2+S3+S4+S5, artinya yang aktif/membeli pasti sudah punya akun).\nBerikan ringkasan singkat (<= 120 kata) dalam Bahasa Indonesia. Fokus pada: 1) Tren utama, 2) Anomali/outlier (jika ada), 3) Satu rekomendasi aksi.",
      },
      {
        role: "user",
        content: `Sumber: ${body.source.toUpperCase()}\nData: ${serialized}`,
      },
    ];

    console.log(`[analyze] Requesting ${OPENROUTER_MODEL} for ${body.source}`);
    console.log("[analyze] outbound messages:", JSON.stringify(messages, null, 2));

    // 4. Call OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": SITE_URL, // Penting untuk ranking OpenRouter
        "X-Title": SITE_NAME,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        max_tokens: 5000, // Sedikit dinaikkan untuk safety
        temperature: 0.2, // Rendah agar lebih deterministik/faktual
      }),
    });

    // 5. Log respons dan baca body
    const responseText = await response.text();
    console.log(
      `[analyze] OpenRouter status ${response.status} ${response.statusText} body:`,
      responseText.slice(0, 500),
    );

    if (!response.ok) {
      console.error(`[analyze] OpenRouter Error (${response.status}):`, responseText);
      return NextResponse.json(
        {
          error: AI_UNAVAILABLE,
          detail: `Upstream ${response.status} ${response.statusText}`,
        },
        { status: 503 },
      );
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (err) {
      console.error("[analyze] Failed to parse OpenRouter JSON:", err);
      return NextResponse.json({ error: AI_UNAVAILABLE }, { status: 503 });
    }
    const text = result.choices?.[0]?.message?.content?.trim();

    if (!text) {
      console.error("[analyze] Empty content received from OpenRouter");
      return NextResponse.json({ error: AI_UNAVAILABLE }, { status: 503 });
    }

    return NextResponse.json({ text });

  } catch (error) {
    console.error("[analyze] Unexpected error:", error);
    return NextResponse.json({ error: AI_UNAVAILABLE }, { status: 503 });
  }
}
