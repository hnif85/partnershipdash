import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "Partnership Dash";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration - missing API key" }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.prompt) {
      return NextResponse.json({ error: "Prompt harus diisi" }, { status: 400 });
    }

    const prompt = String(body.prompt).trim();
    const tone = String(body.tone || "professional").trim();
    const includeUnsubscribe = body.include_unsubscribe !== false;
    const companyName = String(body.company_name || "MWX Market").trim();

    const systemPrompt = `Anda adalah spesialis desain email marketing untuk MWX Market, sebuah platform marketplace digital untuk UMKM di Indonesia.

Tugas Anda: Buat template HTML email marketing yang profesional, responsif, dan menarik berdasarkan deskripsi yang diberikan user.

SPESIFIKASI TEKNIS:
- Gunakan tabel-based layout (kompatibel dengan semua email client termasuk Outlook)
- Inline CSS (jangan pakai <style> di head kecuali untuk media queries)
- Maksimal lebar 600px, centered
- Responsif untuk mobile (pakai media query)
- Gunakan warna brand MWX Market: #1f3c88 (biru tua), #ffffff (putih), #f4f4f4 (abu background)
- Sertakan footer dengan informasi perusahaan dan alamat
- Gunakan placeholder {{nama}} untuk personalisasi nama penerima
- Gunakan placeholder {{email}} untuk personalisasi email

${includeUnsubscribe ? '- Sertakan link unsubscribe di footer dengan placeholder {{unsubscribe_url}}' : ''}

OUTPUT: Berikan ONLY HTML code (tanpa markdown formatting, tanpa \`\`\`html, langsung HTML saja).
Jangan tambahkan teks apapun sebelum atau sesudah HTML.`;

    const userPrompt = `Buatkan template email marketing dengan detail berikut:

DESKRIPSI: ${prompt}
NAMA PERUSAHAAN: ${companyName}
TONE: ${tone}
INCLUDE UNSUBSCRIBE: ${includeUnsubscribe ? "Ya" : "Tidak"}

Pastikan template memiliki:
1. Header dengan logo/company name
2. Hero section dengan headline
3. Body content sesuai deskripsi
4. Call-to-action button yang jelas
5. Footer lengkap`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: `AI request failed: ${response.status}` },
        { status: 503 }
      );
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 503 });
    }

    let html = result.choices?.[0]?.message?.content?.trim() || "";

    // Clean up markdown code blocks if AI wrapped them
    html = html.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

    // Auto-generate subject line from the content
    const subjectMatch = html.match(/<title>(.*?)<\/title>/i);
    const subjectLine = subjectMatch?.[1] || 
      html.match(/<h[1-2][^>]*>(.*?)<\/h[1-2]>/i)?.[1] || 
      "Email dari MWX Market";

    // Detect variables used
    const varRegex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let varMatch;
    while ((varMatch = varRegex.exec(html)) !== null) {
      variables.add(varMatch[1]);
    }

    // Also generate a plain text version
    const plainText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    return NextResponse.json({
      html,
      plain_text: plainText,
      subject_line: subjectLine,
      variables: Array.from(variables),
    });
  } catch (error) {
    console.error("[email-ai-generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
