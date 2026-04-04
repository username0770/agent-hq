import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { SessionMeta } from "@/lib/btc-lab-types";
import { calcPnl } from "@/lib/btc-lab-types";

export async function GET(req: NextRequest) {
  try {
    const denied = await checkAuth(req);
    if (denied) return denied;

    const r = getRedis();
    const ids: string[] = await r.smembers("btc-lab:sessions") || [];

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

  const pipeline = r.pipeline();
  for (const id of ids) {
    pipeline.get(`btc-lab:session:${id}:meta`);
  }
  const results = await pipeline.exec();
  const sessions = (results as (SessionMeta | null)[])
    .filter(Boolean)
    .sort((a, b) => (b!.createdAt > a!.createdAt ? 1 : -1));

  return NextResponse.json(sessions);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/btc-lab/sessions error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const body = await req.json();
  const { id, question, eventStartTime, endDate, targetPrice } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const r = getRedis();

  // Settle previous session's bets if needed
  const allIds: string[] = await r.smembers("btc-lab:sessions") || [];
  if (allIds.length > 0) {
    // Find most recent session
    const pipeline = r.pipeline();
    for (const sid of allIds) {
      pipeline.get(`btc-lab:session:${sid}:meta`);
    }
    const metas = (await pipeline.exec()) as (SessionMeta | null)[];
    const sorted = metas
      .filter(Boolean)
      .sort((a, b) => (b!.createdAt > a!.createdAt ? 1 : -1));
    const prev = sorted[0];

    if (prev && !prev.completedAt && prev.id !== id) {
      // Determine outcome from target vs last tick
      const ticks = await r.lrange(`btc-lab:session:${prev.id}:ticks`, -1, -1);
      if (ticks.length > 0) {
        const lastTick = typeof ticks[0] === "string"
          ? JSON.parse(ticks[0]) : ticks[0];
        const lastMedian = lastTick?.cexMedian || lastTick?.binance;
        const outcome: "UP" | "DOWN" =
          lastMedian && prev.targetPrice && lastMedian >= prev.targetPrice
            ? "UP" : "DOWN";

        // Settle bets
        const betsRaw = await r.lrange(
          `btc-lab:session:${prev.id}:bets`, 0, -1);
        let totalPnl = 0;
        let betCount = 0;
        const settledBets = [];
        for (const raw of betsRaw) {
          const bet = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (bet.outcome === "PENDING") {
            const { pnl, won } = calcPnl(bet, outcome);
            bet.outcome = won ? "WIN" : "LOSS";
            bet.pnl = pnl;
            bet.settledAt = new Date().toISOString();
            totalPnl += pnl;
          }
          betCount++;
          settledBets.push(bet);
        }

        // Rewrite bets list
        if (settledBets.length > 0) {
          await r.del(`btc-lab:session:${prev.id}:bets`);
          const bp = r.pipeline();
          for (const b of settledBets) {
            bp.rpush(`btc-lab:session:${prev.id}:bets`, JSON.stringify(b));
          }
          await bp.exec();
        }

        // Update previous session meta
        prev.resolvedOutcome = outcome;
        prev.completedAt = new Date().toISOString();
        prev.totalPnl = totalPnl;
        prev.betCount = betCount;
        await r.set(`btc-lab:session:${prev.id}:meta`, JSON.stringify(prev));
      }
    }
  }

  // Create new session
  const meta: SessionMeta = {
    id,
    question: question || "",
    eventStartTime: eventStartTime || "",
    endDate: endDate || "",
    targetPrice: targetPrice ?? null,
    resolvedOutcome: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    betCount: 0,
    totalPnl: 0,
  };

  await r.sadd("btc-lab:sessions", id);
  await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));

  return NextResponse.json(meta);
}
