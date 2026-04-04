import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV, calcBetPnl, type RealBet } from "@/lib/btc-lab/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const r = getRedis();
  const raw = await r.get(KV.bet(id));
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(typeof raw === "string" ? JSON.parse(raw) : raw);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json();
  const r = getRedis();
  const raw = await r.get(KV.bet(id));
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bet: RealBet = typeof raw === "string" ? JSON.parse(raw) : raw;

  // Settlement
  if (body.outcome && body.outcome !== "PENDING") {
    const { grossPnl, netPnl, roi, won } = calcBetPnl(bet, body.outcome === "WIN" ? bet.side : (bet.side === "UP" ? "DOWN" : "UP"));
    // Actually use the provided outcome directly
    bet.outcome = body.outcome;
    bet.grossPnl = grossPnl;
    bet.netPnl = body.outcome === "WIN" ? Math.abs(grossPnl) - (bet.feeActual ?? bet.feeCalculated) : grossPnl;
    bet.roi = bet.amountUSDC > 0 ? ((bet.netPnl ?? 0) / bet.amountUSDC) * 100 : 0;
    bet.resolvedAt = new Date().toISOString();
    if (body.resolvedPrice != null) bet.resolvedPrice = body.resolvedPrice;
  }

  // Other updatable fields
  const updatable = ["executedPrice", "feeActual", "txHash", "orderId",
                     "orderStatus", "note", "resolvedPrice"];
  for (const k of updatable) {
    if (body[k] !== undefined) (bet as unknown as Record<string, unknown>)[k] = body[k];
  }
  if (body.executedPrice != null && bet.intendedPrice) {
    bet.slippage = Math.round((body.executedPrice - bet.intendedPrice) * 10000) / 10000;
  }

  await r.set(KV.bet(id), JSON.stringify(bet));

  // Update strategy stats
  if (bet.strategyId && bet.outcome !== "PENDING") {
    await recalcStrategyStats(r, bet.strategyId);
  }

  return NextResponse.json(bet);
}

async function recalcStrategyStats(r: ReturnType<typeof getRedis>, stratId: string) {
  const betIds: string[] = (await r.smembers(KV.strategyBets(stratId))) || [];
  if (!betIds.length) return;
  const pipe = r.pipeline();
  for (const bid of betIds) pipe.get(KV.bet(bid));
  const raws = await pipe.exec();
  const bets: RealBet[] = raws.filter(Boolean).map((b) =>
    typeof b === "string" ? JSON.parse(b) : b
  );

  let wins = 0, losses = 0, pnl = 0, fees = 0, edgeSum = 0;
  let realCount = 0, paperCount = 0;
  for (const b of bets) {
    if (b.betType === "real") realCount++; else paperCount++;
    edgeSum += Math.abs(b.edge);
    fees += b.feeActual ?? b.feeCalculated;
    if (b.outcome === "WIN") { wins++; pnl += b.netPnl ?? 0; }
    else if (b.outcome === "LOSS") { losses++; pnl += b.netPnl ?? 0; }
  }
  const settled = wins + losses;

  const sraw = await r.get(KV.strategy(stratId));
  if (sraw) {
    const s = typeof sraw === "string" ? JSON.parse(sraw) : sraw;
    s.totalBets = bets.length;
    s.totalRealBets = realCount;
    s.totalPaperBets = paperCount;
    s.winRate = settled > 0 ? Math.round((wins / settled) * 100) : 0;
    s.totalPnl = Math.round(pnl * 100) / 100;
    s.totalFees = Math.round(fees * 100) / 100;
    s.avgEdge = bets.length > 0 ? Math.round((edgeSum / bets.length) * 1000) / 10 : 0;
    s.updatedAt = new Date().toISOString();
    await r.set(KV.strategy(stratId), JSON.stringify(s));
  }
}
