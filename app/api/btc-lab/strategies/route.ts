import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/kv";
import { fetchLocal } from "@/lib/btc-lab/local-api";

const LOCAL_API = process.env.BTC_LAB_LOCAL_API || "http://localhost:8765";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const data = await fetchLocal("/strategies");
  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const body = await req.json();
  try {
    const res = await fetch(`${LOCAL_API}/strategies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Local API offline" }, { status: 503 });
  }
}
