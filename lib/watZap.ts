type WatZapSendResult = {
  status: string;
  message: string;
  waMessageId?: string;
  raw: any;
};

type WatZapGroup = {
  id: string;
  name: string;
  participants: Array<{
    number: string;
    name: string;
    role: string;
  }>;
};

const BASE_URL = process.env.WATZAP_BASE_URL || "https://api.watzap.id/v1";
const API_KEY = process.env.WATZAP_API_KEY;
const NUMBER_KEY = process.env.WATZAP_NUMBER_KEY;

function getHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

export async function checkWatZapKey(): Promise<{
  valid: boolean;
  data?: any;
  error?: string;
}> {
  if (!API_KEY) {
    return { valid: false, error: "WATZAP_API_KEY not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/checking_key`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ api_key: API_KEY }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status) {
      return { valid: true, data };
    }

    return { valid: false, error: data.message || "Invalid API key" };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function validateWatZapNumber(
  phoneNo: string
): Promise<{ valid: boolean; message?: string }> {
  if (!API_KEY || !NUMBER_KEY) {
    return { valid: false, message: "API key or Number key not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/validate_number`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        api_key: API_KEY,
        number_key: NUMBER_KEY,
        phone_no: phoneNo,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === "200") {
      return { valid: true };
    }

    return { valid: false, message: data.message || "Invalid number" };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendWatZapText(
  phoneNo: string,
  message: string,
  waitUntilSend: boolean = false
): Promise<WatZapSendResult> {
  if (!API_KEY || !NUMBER_KEY) {
    throw new Error("WATZAP_API_KEY or WATZAP_NUMBER_KEY not configured");
  }

  const res = await fetch(`${BASE_URL}/send_message`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      api_key: API_KEY,
      number_key: NUMBER_KEY,
      phone_no: phoneNo,
      message,
      wait_until_send: waitUntilSend ? "1" : "0",
    }),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WatZap send failed: ${res.status} ${JSON.stringify(raw)}`);
  }

  return {
    status: raw.status || "200",
    message: raw.message || "Message sent",
    raw,
  };
}

export async function sendWatZapImage(
  phoneNo: string,
  imageUrl: string,
  caption?: string,
  separateCaption: boolean = false
): Promise<WatZapSendResult> {
  if (!API_KEY || !NUMBER_KEY) {
    throw new Error("WATZAP_API_KEY or WATZAP_NUMBER_KEY not configured");
  }

  const res = await fetch(`${BASE_URL}/send_image_url`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      api_key: API_KEY,
      number_key: NUMBER_KEY,
      phone_no: phoneNo,
      url: imageUrl,
      message: caption || "",
      separate_caption: separateCaption ? "1" : "0",
    }),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WatZap send image failed: ${res.status} ${JSON.stringify(raw)}`);
  }

  return {
    status: raw.status || "200",
    message: raw.message || "Image sent",
    raw,
  };
}

export async function sendWatZapFile(
  phoneNo: string,
  fileUrl: string
): Promise<WatZapSendResult> {
  if (!API_KEY || !NUMBER_KEY) {
    throw new Error("WATZAP_API_KEY or WATZAP_NUMBER_KEY not configured");
  }

  const res = await fetch(`${BASE_URL}/send_file_url`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      api_key: API_KEY,
      number_key: NUMBER_KEY,
      phone_no: phoneNo,
      url: fileUrl,
    }),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WatZap send file failed: ${res.status} ${JSON.stringify(raw)}`);
  }

  return {
    status: raw.status || "200",
    message: raw.message || "File sent",
    raw,
  };
}

export async function sendWatZapToGroup(
  groupId: string,
  message: string
): Promise<WatZapSendResult> {
  if (!API_KEY || !NUMBER_KEY) {
    throw new Error("WATZAP_API_KEY or WATZAP_NUMBER_KEY not configured");
  }

  const res = await fetch(`${BASE_URL}/send_message_group`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      api_key: API_KEY,
      number_key: NUMBER_KEY,
      group_id: groupId,
      message,
    }),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WatZap send to group failed: ${res.status} ${JSON.stringify(raw)}`);
  }

  return {
    status: raw.status || "200",
    message: raw.message || "Message sent to group",
    raw,
  };
}

export async function getWatZapGroups(): Promise<{
  success: boolean;
  groups?: WatZapGroup[];
  error?: string;
}> {
  if (!API_KEY || !NUMBER_KEY) {
    return { success: false, error: "API key or Number key not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/groups`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        api_key: API_KEY,
        number_key: NUMBER_KEY,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.groups) {
      const groups: WatZapGroup[] = Object.entries(data.groups).map(
        ([id, group]: [string, any]) => ({
          id,
          name: group.name,
          participants: group.participants || [],
        })
      );
      return { success: true, groups };
    }

    return { success: false, error: data.message || "Failed to get groups" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function setWatZapWebhook(endpointUrl: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (!API_KEY || !NUMBER_KEY) {
    return { success: false, error: "API key or Number key not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/set_webhook`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        api_key: API_KEY,
        number_key: NUMBER_KEY,
        endpoint_url: endpointUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === "200") {
      return { success: true, message: data.message };
    }

    return { success: false, error: data.message || "Failed to set webhook" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getWatZapWebhook(): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  if (!API_KEY || !NUMBER_KEY) {
    return { success: false, error: "API key or Number key not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/get_webhook`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        api_key: API_KEY,
        number_key: NUMBER_KEY,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === "200") {
      return { success: true, url: data.message };
    }

    return { success: false, error: data.message || "Failed to get webhook" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function unsetWatZapWebhook(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (!API_KEY || !NUMBER_KEY) {
    return { success: false, error: "API key or Number key not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL}/unset_webhook`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        api_key: API_KEY,
        number_key: NUMBER_KEY,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.status === "200") {
      return { success: true, message: data.message };
    }

    return { success: false, error: data.message || "Failed to unset webhook" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}