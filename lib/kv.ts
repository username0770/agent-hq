import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN required. " +
        `Got URL=${url ? "set" : "missing"}, TOKEN=${token ? "set" : "missing"}`
      );
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

/**
 * Check auth: Bearer token (Python script) OR NextAuth session (browser).
 * Returns null if authorized, or a 401 Response.
 */
export async function checkAuth(
  req: NextRequest
): Promise<NextResponse | null> {
  // 1. Check Bearer token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.ADMIN_PASSWORD) {
      return null; // authorized
    }
  }

  // 2. Check NextAuth session cookie
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (session?.user) {
      return null; // authorized
    }
  } catch {
    // auth() may fail in some contexts, fall through to 401
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
