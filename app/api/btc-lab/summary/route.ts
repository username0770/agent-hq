import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/kv";
import { fetchLocal } from "@/lib/btc-lab/local-api";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  // Try local SQLite API first
  const local = await fetchLocal("/stats");
  if (local) {
    return NextResponse.json({ ...local, source: "sqlite" });
  }

  // Fallback: empty stats
  const empty = {
    total_bets: 0, wins: 0, losses: 0, pending: 0,
    winrate: 0, total_pnl: 0, total_fees: 0, avg_edge: 0,
    by_phase: {},
  };
  return NextResponse.json({
    paper: empty, real: empty, all: empty,
    source: "offline",
  });
}
