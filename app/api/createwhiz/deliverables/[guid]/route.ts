import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CREATEWHIZ_BASE_URL = "https://createwhiz.ai";
const CREATEWHIZ_API_URL = `${CREATEWHIZ_BASE_URL}/api/ext/deliverables`;

const buildAbsoluteUrl = (maybePath?: string | null) => {
  if (!maybePath) return "";
  if (maybePath.startsWith("http")) return maybePath;
  return `${CREATEWHIZ_BASE_URL}${maybePath}`;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ guid: string }> },
) {
  const { guid: rawGuid } = await params;

  const token = process.env.CREATEWHIZ_SUPER_TOKEN;
  if (!token) {
    console.error("[createwhiz] Missing CREATEWHIZ_SUPER_TOKEN env");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const targetGuid = rawGuid;
  if (!targetGuid) {
    return NextResponse.json({ error: "Missing deliverable guid" }, { status: 400 });
  }

  try {
    const response = await fetch(`${CREATEWHIZ_API_URL}/${encodeURIComponent(targetGuid)}`, {
      method: "GET",
      headers: {
        "x-super-token": token,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[createwhiz] Upstream error ${response.status}: ${text}`);
      return NextResponse.json(
        { error: "Failed to fetch deliverables from CreateWhiz" },
        { status: response.status },
      );
    }

    const payload = await response.json();

    const normalized = {
      guid: payload.guid,
      userId: payload.userId,
      deliverables: Array.isArray(payload.deliverables)
        ? payload.deliverables.map((item: any) => ({
            ...item,
            fileUrl: buildAbsoluteUrl(item.fileUrl),
            thumbnailUrl: buildAbsoluteUrl(item.thumbnailUrl),
          }))
        : [],
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("[createwhiz] Unexpected error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
