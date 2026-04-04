import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV, type RealBet } from "@/lib/btc-lab/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const r = getRedis();

  const betIds: string[] = (await r.smembers(KV.strategyBets(id))) || [];
  if (!betIds.length) {
    return NextResponse.json({
      totalBets: 0, winRate: 0, totalPnl: 0, totalFees: 0,
      avgEdge: 0, avgSlippage: 0,
      byTimerPhase: {}, byTargetSource: {}, bySide: {},
    });
  }

  const pipe = r.pipeline();
  for (const bid of betIds) pipe.get(KV.bet(bid));
  const raws = await pipe.exec();
  const bets: RealBet[] = raws
    .filter(Boolean)
    .map((b) => (typeof b === "string" ? JSON.parse(b) : b));

  let wins = 0, losses = 0, totalPnl = 0, totalFees = 0;
  let totalEdge = 0, totalSlippage = 0, slippageCount = 0;
  const byPhase: Record<string, { bets: number; wins: number; pnl: number }> = {};
  const bySource: Record<string, { bets: number; wins: number; pnl: number }> = {};
  const bySide: Record<string, { bets: number; wins: number; pnl: number }> = {};

  for (const b of bets) {
    totalEdge += Math.abs(b.edge);
    totalFees += b.feeActual ?? b.feeCalculated;
    if (b.slippage != null) { totalSlippage += Math.abs(b.slippage); slippageCount++; }

    const pnl = b.netPnl ?? 0;
    const won = b.outcome === "WIN";
    if (b.outcome === "WIN") { wins++; totalPnl += pnl; }
    else if (b.outcome === "LOSS") { losses++; totalPnl += pnl; }

    for (const [map, key] of [
      [byPhase, b.timerPhase], [bySource, b.targetPriceSource], [bySide, b.side],
    ] as [Record<string, { bets: number; wins: number; pnl: number }>, string][]) {
      if (!map[key]) map[key] = { bets: 0, wins: 0, pnl: 0 };
      map[key].bets++;
      if (won) map[key].wins++;
      map[key].pnl += pnl;
    }
  }

  const settled = wins + losses;
  return NextResponse.json({
    totalBets: bets.length,
    winRate: settled > 0 ? Math.round((wins / settled) * 100) : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    avgEdge: bets.length > 0 ? Math.round((totalEdge / bets.length) * 1000) / 10 : 0,
    avgSlippage: slippageCount > 0 ? Math.round((totalSlippage / slippageCount) * 10000) / 10000 : 0,
    byTimerPhase: byPhase,
    byTargetSource: bySource,
    bySide: bySide,
  });
}
