import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV, calcBetPnl, type RealBet } from "@/lib/btc-lab/types";

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  try {
    const r = getRedis();
    // Get all bet IDs
    const realIds: string[] = (await r.smembers(KV.betsReal)) || [];
    const paperIds: string[] = (await r.smembers(KV.betsPaper)) || [];
    const allIds = [...realIds, ...paperIds];
    if (!allIds.length) return NextResponse.json({ settled: 0 });

    const pipe = r.pipeline();
    for (const id of allIds) pipe.get(KV.bet(id));
    const raws = await pipe.exec();
    const bets: RealBet[] = raws
      .filter(Boolean)
      .map((b) => (typeof b === "string" ? JSON.parse(b) : b));

    const pending = bets.filter((b) => b.outcome === "PENDING");
    if (!pending.length) return NextResponse.json({ settled: 0 });

    // Group by market slug to batch-check outcomes
    const bySlug: Record<string, RealBet[]> = {};
    for (const b of pending) {
      const slug = b.marketSlug || "unknown";
      if (!bySlug[slug]) bySlug[slug] = [];
      bySlug[slug].push(b);
    }

    let settled = 0;
    const affectedStrategies = new Set<string>();

    for (const [slug, slugBets] of Object.entries(bySlug)) {
      // Check if market is resolved via Gamma API
      try {
        const res = await fetch(
          `https://gamma-api.polymarket.com/events?slug=${slug}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const events = await res.json();
          if (events?.[0]?.closed) {
            const m = events[0].markets?.[0];
            const prices = JSON.parse(m?.outcomePrices || "[0,0]");
            const upPrice = parseFloat(prices[0]);
            // UP wins if outcomePrices[0] = 1, DOWN wins if = 0
            const outcome: "UP" | "DOWN" = upPrice > 0.5 ? "UP" : "DOWN";

            for (const b of slugBets) {
              const { grossPnl, netPnl, roi } = calcBetPnl(b, outcome);
              b.outcome = b.side === outcome ? "WIN" : "LOSS";
              b.grossPnl = grossPnl;
              b.netPnl = netPnl;
              b.roi = roi;
              b.resolvedAt = new Date().toISOString();
              await r.set(KV.bet(b.id), JSON.stringify(b));
              settled++;
              if (b.strategyId) affectedStrategies.add(b.strategyId);
            }
          }
        }
      } catch {
        // Skip this slug
      }
    }

    return NextResponse.json({ settled, checked: pending.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
