const CREATEWHIZ_BASE_URL = "https://createwhiz.ai";
const CREATEWHIZ_API_URL = `${CREATEWHIZ_BASE_URL}/api/ext/deliverables`;

const buildAbsoluteUrl = (maybePath?: string | null) => {
  if (!maybePath) return "";
  if (maybePath.startsWith("http")) return maybePath;
  return `${CREATEWHIZ_BASE_URL}${maybePath}`;
};

export type Deliverable = {
  id?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  type?: string;
  duration?: string;
  captionText?: string;
  captionHashtags?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type DeliverablesResult = {
  guid?: string;
  userId?: string;
  deliverables: Deliverable[];
};

export async function getDeliverablesByGuid(guid: string): Promise<DeliverablesResult> {
  const token = process.env.CREATEWHIZ_SUPER_TOKEN;
  if (!token) {
    console.warn("[createwhiz] Missing CREATEWHIZ_SUPER_TOKEN env");
    return { deliverables: [] };
  }

  try {
    const response = await fetch(`${CREATEWHIZ_API_URL}/${encodeURIComponent(guid)}`, {
      method: "GET",
      headers: { "x-super-token": token },
      cache: "no-store",
    });

    if (!response.ok) {
      return { deliverables: [] };
    }

    const payload = await response.json();

    return {
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
  } catch (error) {
    console.error("[createwhiz] Fetch error", error);
    return { deliverables: [] };
  }
}
