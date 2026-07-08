import { NextRequest, NextResponse } from "next/server";
import { ensureEmailSchema } from "@/lib/emailSchema";
import { executeQuery, executeQuerySingle } from "@/lib/database";

export async function GET(request: NextRequest) {
  await ensureEmailSchema();

  const profileName = request.nextUrl.searchParams.get("profile");

  if (profileName) {
    // Get specific profile
    const settings = await executeQuery<any>(
      `SELECT id, profile_name, host, port, secure, username, sender_name, sender_email, daily_limit, is_active, created_at, updated_at
       FROM email_settings WHERE profile_name = $1 ORDER BY id DESC LIMIT 1`,
      [profileName]
    );
    if (settings.length > 0) {
      const s = settings[0];
      return NextResponse.json({
        settings: { ...s, password: "********", password_exists: true },
      });
    }
    return NextResponse.json({ settings: null });
  }

  // Get all profiles (no password returned)
  const allProfiles = await executeQuery<any>(
    `SELECT id, profile_name, host, port, secure, username, sender_name, sender_email, daily_limit, is_active, created_at, updated_at
     FROM email_settings ORDER BY is_active DESC, updated_at DESC`
  );

  // Mask passwords
  const profiles = allProfiles.map((p: any) => ({
    ...p,
    password: "********",
    password_exists: true,
  }));

  // Get active profile
  const activeProfile = profiles.find((p: any) => p.is_active) || null;

  return NextResponse.json({ profiles, activeProfile });
}

export async function POST(request: NextRequest) {
  try {
    await ensureEmailSchema();
    const body = await request.json();

    const action = body?.action || "save";

    if (action === "set_active") {
      // Switch active profile
      const profileId = parseInt(body?.profile_id);
      if (!profileId) {
        return NextResponse.json({ error: "profile_id required" }, { status: 400 });
      }
      await executeQuery("UPDATE email_settings SET is_active = false WHERE is_active = true");
      await executeQuery("UPDATE email_settings SET is_active = true, updated_at = NOW() WHERE id = $1", [profileId]);
      return NextResponse.json({ ok: true, activeProfileId: profileId });
    }

    if (action === "delete") {
      const profileId = parseInt(body?.profile_id);
      if (!profileId) {
        return NextResponse.json({ error: "profile_id required" }, { status: 400 });
      }
      const profile = await executeQuerySingle<any>("SELECT is_active FROM email_settings WHERE id = $1", [profileId]);
      await executeQuery("DELETE FROM email_settings WHERE id = $1", [profileId]);
      // If deleted profile was active, activate the most recent remaining one
      if (profile?.is_active) {
        const nextProfile = await executeQuerySingle<any>(
          "SELECT id FROM email_settings ORDER BY updated_at DESC LIMIT 1"
        );
        if (nextProfile) {
          await executeQuery("UPDATE email_settings SET is_active = true WHERE id = $1", [nextProfile.id]);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Default: Save new profile
    const profileName = String(body?.profile_name || "Default").trim();
    const host = String(body?.host || "smtp.gmail.com").trim();
    const port = parseInt(body?.port || "587");
    const secure = body?.secure === true || port === 465;
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const senderName = String(body?.sender_name || "MWX Market").trim();
    const senderEmail = String(body?.sender_email || "").trim();
    const dailyLimit = parseInt(body?.daily_limit || "500");
    const setActive = body?.set_active !== false;

    if (!username || !senderEmail) {
      return NextResponse.json(
        { error: "username and sender_email are required" },
        { status: 400 }
      );
    }

    // Check if updating existing profile
    const existingProfile = await executeQuerySingle<any>(
      "SELECT id FROM email_settings WHERE profile_name = $1 ORDER BY id DESC LIMIT 1",
      [profileName]
    );

    let created: any;
    if (existingProfile && !body?.force_new) {
      // Update existing profile
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let idx = 1;

      updateFields.push(`host = $${idx++}`); updateParams.push(host);
      updateFields.push(`port = $${idx++}`); updateParams.push(port);
      updateFields.push(`secure = $${idx++}`); updateParams.push(secure);
      updateFields.push(`username = $${idx++}`); updateParams.push(username);
      updateFields.push(`sender_name = $${idx++}`); updateParams.push(senderName);
      updateFields.push(`sender_email = $${idx++}`); updateParams.push(senderEmail);
      updateFields.push(`daily_limit = $${idx++}`); updateParams.push(dailyLimit);
      if (password && password !== "********") {
        updateFields.push(`password = $${idx++}`); updateParams.push(password);
      }
      updateFields.push(`updated_at = NOW()`);

      if (setActive) {
        await executeQuery("UPDATE email_settings SET is_active = false WHERE is_active = true");
        updateFields.push(`is_active = true`);
      }

      updateParams.push(existingProfile.id);
      created = await executeQuerySingle<any>(
        `UPDATE email_settings SET ${updateFields.join(", ")} WHERE id = $${idx} RETURNING id, profile_name, host, port, secure, username, sender_name, sender_email, daily_limit, is_active, created_at, updated_at`,
        updateParams
      );

      if (setActive) {
        // Deactivate others (in case the update query didn't)
        await executeQuery(
          "UPDATE email_settings SET is_active = false WHERE id != $1 AND is_active = true",
          [existingProfile.id]
        );
      }
    } else {
      // Insert new profile
      if (setActive) {
        await executeQuery("UPDATE email_settings SET is_active = false WHERE is_active = true");
      }
      if (!password) {
        return NextResponse.json(
          { error: "password is required for new profile" },
          { status: 400 }
        );
      }

      created = await executeQuerySingle<any>(
        `INSERT INTO email_settings (profile_name, host, port, secure, username, password, sender_name, sender_email, daily_limit, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, profile_name, host, port, secure, username, sender_name, sender_email, daily_limit, is_active, created_at, updated_at`,
        [profileName, host, port, secure, username, password, senderName, senderEmail, dailyLimit, setActive]
      );
    }

    return NextResponse.json({
      settings: { ...created, password: "********", password_exists: true },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save settings" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await ensureEmailSchema();
    await executeQuery("UPDATE email_settings SET is_active = false WHERE is_active = true");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to deactivate settings" },
      { status: 500 }
    );
  }
}
