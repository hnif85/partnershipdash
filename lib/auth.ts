import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export interface AuthUser {
  userId: number;
  email: string;
  role: "super_admin" | "partnership" | "crm";
  name: string;
}

export async function verifyAuth(headers: Headers): Promise<AuthUser> {
  const authHeader = headers.get("authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");

  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as unknown as AuthUser;
}

export function requireRole(user: AuthUser, ...roles: string[]) {
  if (!roles.includes(user.role)) throw new Error("Forbidden");
}

export function authErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 60000);
