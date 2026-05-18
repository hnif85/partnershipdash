import { pool } from "./database";

export type AttendanceResult = {
  success: boolean;
  already_attended: boolean;
  registration_id?: string;
  full_name?: string;
  email?: string;
  attended_at?: string;
  message: string;
};

export async function checkInToEvent(
  eventId: string,
  email: string
): Promise<{ found: boolean; attendance: AttendanceResult }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  const checkResult = await pool.query(
    `SELECT * FROM event_registrations 
     WHERE event_id = $1 AND email ILIKE $2
     LIMIT 1`,
    [eventId, email]
  );

  if (checkResult.rows.length === 0) {
    return {
      found: false,
      attendance: {
        success: false,
        already_attended: false,
        message: "Email tidak ditemukan dalam daftar peserta event ini. Silakan lakukan pendaftaran terlebih dahulu.",
      },
    };
  }

  const registration = checkResult.rows[0];

  if (registration.attended_at) {
    return {
      found: true,
      attendance: {
        success: true,
        already_attended: true,
        registration_id: registration.id,
        full_name: registration.full_name,
        email: registration.email,
        attended_at: registration.attended_at,
        message: "Anda sudah melakukan absensi sebelumnya.",
      },
    };
  }

  const updateResult = await pool.query(
    `UPDATE event_registrations 
     SET attended_at = NOW(), status = 'attended'
     WHERE id = $1
     RETURNING *`,
    [registration.id]
  );

  const updated = updateResult.rows[0];

  return {
    found: true,
    attendance: {
      success: true,
      already_attended: false,
      registration_id: updated.id,
      full_name: updated.full_name,
      email: updated.email,
      attended_at: updated.attended_at,
      message: "Absensi berhasil! Terima kasih telah hadir.",
    },
  };
}

export function formatAttendanceTime(timestamp: string | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatAttendanceDate(timestamp: string | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}