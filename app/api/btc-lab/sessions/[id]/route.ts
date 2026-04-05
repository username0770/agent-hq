import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/kv";
import { fetchLocal } from "@/lib/btc-lab/local-api";

const LOCAL_API = process.env.BTC_LAB_LOCAL_API || "http://localhost:8765";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;

  // Get session from sessions list
  const sessions = await fetchLocal("/sessions");
  const meta = Array.isArray(sessions)
    ? sessions.find((s: { id: string }) => s.id === id) : null;
  if (!meta) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get ticks
  const ticks = await fetchLocal(`/sessions/${id}/ticks`) || [];

  // Get bets for this session
  const bets = await fetchLocal(`/bets?strategy=&limit=100`) || [];
  const sessionBets = Array.isArray(bets)
    ? bets.filter((b: { session_id?: string; sessionId?: string }) =>
        (b.session_id || b.sessionId) === id)
    : [];

  return NextResponse.json({
    ...meta,
    ticks: Array.isArray(ticks) ? ticks : [],
    orderBook: [],
    bets: sessionBets,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // No-op for now — updates happen via Python script directly
  return NextResponse.json({ ok: true });
}
