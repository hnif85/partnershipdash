import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/database";
import { ensureCrmSchema } from "@/lib/crmSchema";
import { checkRateLimit } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

// Seed default users function
async function seedDefaultUsers() {
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD;
  if (!defaultPassword || defaultPassword.length < 12) {
    console.warn("DEFAULT_USER_PASSWORD not set or too short; skipping seed users");
    return;
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  
  const defaultUsers = [
    { email: "superadmin@mwx.com", name: "Super Admin", role: "super_admin" },
    { email: "partnership@mwx.com", name: "Partnership Manager", role: "partnership" },
    { email: "crm@mwx.com", name: "CRM Agent", role: "crm" },
  ];

  for (const user of defaultUsers) {
    const existing = await pool.query(
      "SELECT id FROM crm_users WHERE email = $1",
      [user.email]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO crm_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
        [user.email, passwordHash, user.name, user.role]
      );
      console.log(`Created user: ${user.email} (${user.role})`);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureCrmSchema();
    await seedDefaultUsers();

    const body = await request.json();
    const { action, email, password, token, userId, name, role, isActive } = body;

    // Login action
    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password required" }, { status: 400 });
      }

      const ip = request.headers.get("x-forwarded-for") || "unknown";
      if (!checkRateLimit(`login:${ip}`, 20, 60000)) {
        return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
      }

      const userResult = await pool.query(
        "SELECT * FROM crm_users WHERE email = $1 AND is_active = true",
        [email]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const user = userResult.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Create JWT token
      const token = await new SignJWT({ 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name 
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(getJwtSecret());

      // Save session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await pool.query(
        `INSERT INTO crm_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      // Update last login
      await pool.query(
        "UPDATE crm_users SET last_login = NOW() WHERE id = $1",
        [user.id]
      );

      return NextResponse.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    }

    // Logout action
    if (action === "logout") {
      if (token) {
        await pool.query("DELETE FROM crm_sessions WHERE token = $1", [token]);
      }
      return NextResponse.json({ success: true });
    }

    // Get current user
    if (action === "me") {
      if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        
        const userResult = await pool.query(
          "SELECT id, email, name, role, is_active, last_login FROM crm_users WHERE id = $1",
          [payload.userId]
        );

        if (userResult.rows.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user: userResult.rows[0] });
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    // List users (super admin only)
    if (action === "list_users") {
      if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        
        if (payload.role !== "super_admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const users = await pool.query(
          "SELECT id, email, name, role, is_active, created_at, last_login FROM crm_users ORDER BY created_at DESC"
        );

        return NextResponse.json({ users: users.rows });
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    // Create user (super admin only)
    if (action === "create_user") {
      if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        
        if (payload.role !== "super_admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!email || !password || !name) {
          return NextResponse.json({ error: "Email, password, and name required" }, { status: 400 });
        }

        const newPasswordHash = await bcrypt.hash(password, 10);
        const newRole = role || "crm";

        const result = await pool.query(
          `INSERT INTO crm_users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role`,
          [email, newPasswordHash, name, newRole]
        );

        return NextResponse.json({ user: result.rows[0] });
      } catch (err: any) {
        if (err.code === "23505") {
          return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }
        throw err;
      }
    }

    // Update user (super admin only)
    if (action === "update_user") {
      if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        
        if (payload.role !== "super_admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!userId) {
          return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        let updates = [];
        let values = [];
        let paramIndex = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(name);
        }
        if (role !== undefined) {
          updates.push(`role = $${paramIndex++}`);
          values.push(role);
        }
        if (isActive !== undefined) {
          updates.push(`is_active = $${paramIndex++}`);
          values.push(isActive);
        }
        if (password !== undefined) {
          const newHash = await bcrypt.hash(password, 10);
          updates.push(`password_hash = $${paramIndex++}`);
          values.push(newHash);
        }

        if (updates.length === 0) {
          return NextResponse.json({ error: "No updates provided" }, { status: 400 });
        }

        values.push(userId);

        const result = await pool.query(
          `UPDATE crm_users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, email, name, role, is_active`,
          values
        );

        if (result.rows.length === 0) {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user: result.rows[0] });
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    // Delete user (super admin only)
    if (action === "delete_user") {
      if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
      }

      try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        
        if (payload.role !== "super_admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!userId) {
          return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Don't allow deleting yourself
        if (payload.userId === userId) {
          return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        await pool.query("DELETE FROM crm_sessions WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM crm_users WHERE id = $1", [userId]);

        return NextResponse.json({ success: true });
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (error) {
    console.error("Auth API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureCrmSchema();
    
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      
      const userResult = await pool.query(
        "SELECT id, email, name, role, is_active, last_login FROM crm_users WHERE id = $1",
        [payload.userId]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({ user: userResult.rows[0] });
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Auth API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}