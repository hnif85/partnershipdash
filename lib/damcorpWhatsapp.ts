type DamcorpSendResult = {
  waMessageId?: string;
  raw: any;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

function getBasicAuth(): string {
  const raw = process.env.DAMCORP_BASIC_AUTH;
  if (raw && raw.trim()) return raw.trim();

  const username = process.env.DAMCORP_USERNAME;
  const password = process.env.DAMCORP_PASSWORD;
  if (username && password) {
    return Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  }

  throw new Error("Damcorp auth is not configured. Set DAMCORP_BASIC_AUTH or DAMCORP_USERNAME + DAMCORP_PASSWORD");
}

export async function getDamcorpToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30000) return cachedToken.token;

  const res = await fetch("https://waba.damcorp.id/v2/users/login", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuth()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Damcorp login failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const token =
    data?.token ||
    data?.access_token ||
    data?.data?.token ||
    data?.result?.token ||
    data?.users?.[0]?.token;
  if (!token) throw new Error(`Damcorp token missing in login response: ${JSON.stringify(data)}`);

  cachedToken = { token, expiresAt: now + 50 * 60 * 1000 };
  return token;
}

export async function sendDamcorpText(to: string, body: string): Promise<DamcorpSendResult> {
  const token = await getDamcorpToken();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body },
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Damcorp send text failed: ${res.status} ${JSON.stringify(raw)}`);
  return { waMessageId: raw?.messages?.[0]?.id, raw };
}

export async function sendDamcorpImage(to: string, imageUrl: string, caption?: string): Promise<DamcorpSendResult> {
  const token = await getDamcorpToken();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: { link: imageUrl, caption: caption || "" },
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Damcorp send image failed: ${res.status} ${JSON.stringify(raw)}`);
  return { waMessageId: raw?.messages?.[0]?.id, raw };
}

export async function sendDamcorpDocument(to: string, documentUrl: string, filename?: string): Promise<DamcorpSendResult> {
  const token = await getDamcorpToken();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "document",
    document: { link: documentUrl, filename: filename || "document" },
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Damcorp send document failed: ${res.status} ${JSON.stringify(raw)}`);
  return { waMessageId: raw?.messages?.[0]?.id, raw };
}

export async function sendDamcorpAudio(to: string, audioUrl: string): Promise<DamcorpSendResult> {
  const token = await getDamcorpToken();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "audio",
    audio: { link: audioUrl },
  };

  const res = await fetch("https://waba.damcorp.id/v2/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Damcorp send audio failed: ${res.status} ${JSON.stringify(raw)}`);
  return { waMessageId: raw?.messages?.[0]?.id, raw };
}
