import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { SessionMeta, PaperBet, AggregateStats } from "@/lib/btc-lab-types";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const r = getRedis();
  const ids: string[] = (await r.smembers("btc-lab:sessions")) || [];

  let totalBets = 0;
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let totalPnl = 0;
  let totalEdge = 0;

  for (const id of ids) {
    const betsRaw = await r.lrange(`btc-lab:session:${id}:bets`, 0, -1);
    for (const raw of betsRaw) {
      const bet: PaperBet =
        typeof raw === "string" ? JSON.parse(raw) : raw;
      totalBets++;
      totalEdge += Math.abs(bet.edge);
      if (bet.outcome === "WIN") {
        wins++;
        totalPnl += bet.pnl || 0;
      } else if (bet.outcome === "LOSS") {
        losses++;
        totalPnl += bet.pnl || 0;
      } else {
        pending++;
      }
    }
  }

  const stats: AggregateStats = {
    totalSessions: ids.length,
    totalBets,
    wins,
    losses,
    pending,
    winRate: totalBets - pending > 0
      ? Math.round((wins / (totalBets - pending)) * 100) : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    avgEdge: totalBets > 0
      ? Math.round((totalEdge / totalBets) * 1000) / 10 : 0,
  };

  return NextResponse.json(stats);
}
