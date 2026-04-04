import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { PaperBet } from "@/lib/btc-lab-types";

interface StrategyStats {
  id: string;
  name: string;
  bets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  pnl: number;
  avgEdge: number;
}

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const r = getRedis();
  const ids: string[] = (await r.smembers("btc-lab:sessions")) || [];

  // Per-strategy accumulators
  const byStrategy: Record<string, {
    name: string; bets: number; wins: number; losses: number;
    pending: number; pnl: number; totalEdge: number;
  }> = {};

  let totalBets = 0, wins = 0, losses = 0, pending = 0;
  let totalPnl = 0, totalEdge = 0;

  for (const id of ids) {
    const betsRaw = await r.lrange(`btc-lab:session:${id}:bets`, 0, -1);
    for (const raw of betsRaw) {
      const bet: PaperBet =
        typeof raw === "string" ? JSON.parse(raw) : raw;

      const sid = bet.strategyId || "default";
      const sname = bet.strategyName || "Default";
      if (!byStrategy[sid]) {
        byStrategy[sid] = {
          name: sname, bets: 0, wins: 0, losses: 0,
          pending: 0, pnl: 0, totalEdge: 0,
        };
      }
      const s = byStrategy[sid];

      totalBets++;
      s.bets++;
      totalEdge += Math.abs(bet.edge);
      s.totalEdge += Math.abs(bet.edge);

      if (bet.outcome === "WIN") {
        wins++; s.wins++;
        totalPnl += bet.pnl || 0;
        s.pnl += bet.pnl || 0;
      } else if (bet.outcome === "LOSS") {
        losses++; s.losses++;
        totalPnl += bet.pnl || 0;
        s.pnl += bet.pnl || 0;
      } else {
        pending++; s.pending++;
      }
    }
  }

  const strategyStats: StrategyStats[] = Object.entries(byStrategy).map(
    ([id, s]) => ({
      id,
      name: s.name,
      bets: s.bets,
      wins: s.wins,
      losses: s.losses,
      pending: s.pending,
      winRate: s.bets - s.pending > 0
        ? Math.round((s.wins / (s.bets - s.pending)) * 100) : 0,
      pnl: Math.round(s.pnl * 100) / 100,
      avgEdge: s.bets > 0
        ? Math.round((s.totalEdge / s.bets) * 1000) / 10 : 0,
    })
  );

  return NextResponse.json({
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
    strategies: strategyStats,
  });
}
