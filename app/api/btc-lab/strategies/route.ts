import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV, type Strategy } from "@/lib/btc-lab/types";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  try {
    const r = getRedis();
    const ids: string[] = (await r.smembers(KV.strategiesList)) || [];
    if (!ids.length) return NextResponse.json([]);
    const pipe = r.pipeline();
    for (const id of ids) pipe.get(KV.strategy(id));
    const results = await pipe.exec();
    const strategies = (results as (Strategy | null)[])
      .filter(Boolean)
      .map((s) => (typeof s === "string" ? JSON.parse(s) : s))
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
    return NextResponse.json(strategies);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const r = getRedis();
    const id = `strat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const strategy: Strategy = {
      id, name: body.name, description: body.description || "",
      color: body.color || "#10b981",
      isActive: true,
      minEdge: body.minEdge ?? 7,
      betAmountUSDC: body.betAmountUSDC ?? 10,
      autobet: body.autobet ?? false,
      autobetPhase: body.autobetPhase || "all",
      timerMin: body.timerMin ?? 0,
      timerMax: body.timerMax ?? 300,
      priceMin: body.priceMin ?? 0.01,
      priceMax: body.priceMax ?? 0.99,
      mirror: body.mirror ?? false,
      fairMin: body.fairMin ?? 0,
      cooldown: body.cooldown ?? 30,
      maxBetsPerWindow: body.maxBetsPerWindow ?? 5,
      createdAt: now, updatedAt: now,
      totalBets: 0, totalRealBets: 0, totalPaperBets: 0,
      winRate: 0, totalPnl: 0, totalFees: 0, avgEdge: 0,
    };
    await r.sadd(KV.strategiesList, id);
    await r.set(KV.strategy(id), JSON.stringify(strategy));
    return NextResponse.json(strategy);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
