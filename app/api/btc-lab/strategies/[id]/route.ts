import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV } from "@/lib/btc-lab/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const r = getRedis();
  const raw = await r.get(KV.strategy(id));
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
  const raw = await r.get(KV.strategy(id));
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const strat = typeof raw === "string" ? JSON.parse(raw) : raw;
  const allowed = ["name", "description", "color", "isActive",
                    "minEdge", "betAmountUSDC", "autobet", "autobetPhase",
                    "timerMin", "timerMax", "priceMin", "priceMax",
                    "mirror", "fairMin", "cooldown", "maxBetsPerWindow"];
  for (const k of allowed) {
    if (body[k] !== undefined) strat[k] = body[k];
  }
  strat.updatedAt = new Date().toISOString();
  await r.set(KV.strategy(id), JSON.stringify(strat));
  return NextResponse.json(strat);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  const { id } = await params;
  const r = getRedis();
  // Delete all bets for this strategy
  const betIds: string[] = (await r.smembers(KV.strategyBets(id))) || [];
  if (betIds.length) {
    const pipe = r.pipeline();
    for (const bid of betIds) {
      pipe.del(KV.bet(bid));
      pipe.srem(KV.betsReal, bid);
      pipe.srem(KV.betsPaper, bid);
    }
    await pipe.exec();
  }
  await r.del(KV.strategyBets(id));
  await r.del(KV.strategy(id));
  await r.srem(KV.strategiesList, id);
  return NextResponse.json({ ok: true, deletedBets: betIds.length });
}
