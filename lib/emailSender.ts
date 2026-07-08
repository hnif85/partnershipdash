import nodemailer from "nodemailer";
import { executeQuerySingle } from "./database";

export type EmailSettings = {
  id: number;
  profile_name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  sender_name: string;
  sender_email: string;
  daily_limit: number;
  is_active: boolean;
};

export type SendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Memuat SMTP settings aktif dari database
 * Bisa filter berdasarkan profile_name jika diisi
 */
export async function loadEmailSettings(profileName?: string): Promise<EmailSettings | null> {
  if (profileName) {
    return executeQuerySingle<EmailSettings>(
      "SELECT * FROM email_settings WHERE profile_name = $1 AND is_active = true ORDER BY id DESC LIMIT 1",
      [profileName]
    );
  }
  return executeQuerySingle<EmailSettings>(
    "SELECT * FROM email_settings WHERE is_active = true ORDER BY id DESC LIMIT 1"
  );
}

/**
 * Personalisasi konten email dengan variabel dari recipient
 */
export function personalizeContent(
  html: string,
  plain: string | null,
  variables: Record<string, string>
): { html: string; plain: string | null } {
  let personalizedHtml = html;
  let personalizedPlain = plain;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    personalizedHtml = personalizedHtml.replace(placeholder, value);
    if (personalizedPlain) {
      personalizedPlain = personalizedPlain.replace(placeholder, value);
    }
  }

  return { html: personalizedHtml, plain: personalizedPlain };
}

/**
 * Mendapatkan variabel yang tersedia untuk personalisasi dari customer
 */
export function getPersonalizationVars(customer: any): Record<string, string> {
  return {
    nama: customer.full_name || customer.nama || "Sahabat MWX",
    email: customer.email || "",
    phone: customer.phone_number || customer.phone || "-",
    partner: customer.referal_code || customer.partner || "-",
    guid: customer.guid || "",
    created_at: customer.created_at
      ? new Date(customer.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-",
  };
}

/**
 * Mengirim email via SMTP
 */
export async function sendEmail(
  settings: EmailSettings,
  to: string,
  subject: string,
  htmlBody: string,
  plainBody?: string | null
): Promise<SendResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
    });

    const info = await transporter.sendMail({
      from: `"${settings.sender_name}" <${settings.sender_email}>`,
      to,
      subject,
      text: plainBody || undefined,
      html: htmlBody,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Kirim batch email (per-recipient)
 */
export async function sendBatchEmail(
  settings: EmailSettings,
  recipients: Array<{
    email: string;
    fullName: string;
    variables: Record<string, string>;
  }>,
  subject: string,
  htmlTemplate: string,
  plainTemplate: string | null,
  onProgress?: (sent: number, failed: number, total: number) => void
): Promise<{ sent: number; failed: number; results: SendResult[] }> {
  const results: SendResult[] = [];
  let sent = 0;
  let failed = 0;
  const total = recipients.length;

  for (const recipient of recipients) {
    const personalized = personalizeContent(htmlTemplate, plainTemplate, recipient.variables);
    const result = await sendEmail(
      settings,
      recipient.email,
      personalizeContent(subject, null, recipient.variables).html,
      personalized.html,
      personalized.plain
    );

    results.push(result);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(sent, failed, total);
    }

    // Delay antar email untuk menghindari rate limit (100ms)
    if (total > 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sent, failed, results };
}
