import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/kv";
import { fetchLocal } from "@/lib/btc-lab/local-api";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const data = await fetchLocal("/sessions");
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  // Sessions are created by the Python script directly in SQLite
  return NextResponse.json({ ok: true });
}
