import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { PaperBet } from "@/lib/btc-lab-types";
import { calcPmFee, calcPnl } from "@/lib/btc-lab-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const r = getRedis();
  const raw = await r.lrange(`btc-lab:session:${id}:bets`, 0, -1);
  const bets = raw.map((b) => (typeof b === "string" ? JSON.parse(b) : b));
  return NextResponse.json(bets);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const r = getRedis();

  const fee = calcPmFee(body.amount || 100, body.price || 0.5);
  const s = body.secondsLeftAtBet || 0;

  const bet: PaperBet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    side: body.side || "UP",
    amount: body.amount || 100,
    price: body.price || 0.5,
    cexMedianAtBet: body.cexMedianAtBet || 0,
    targetPrice: body.targetPrice || 0,
    targetSource: body.targetSource || "auto",
    strategyId: body.strategyId || "default",
    strategyName: body.strategyName || "Default",
    moveAtBet: body.moveAtBet || 0,
    fairProbability: body.fairProbability || 0.5,
    edge: body.edge || 0,
    fee: Math.round(fee * 100) / 100,
    secondsLeftAtBet: s,
    timerAtBet: body.timerAtBet ||
      `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`,
    placedAt: new Date().toISOString(),
    outcome: "PENDING",
    pnl: null,
    settledAt: null,
  };

  await r.rpush(`btc-lab:session:${id}:bets`, JSON.stringify(bet));

  const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
  if (metaRaw) {
    const meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
    meta.betCount = (meta.betCount || 0) + 1;
    await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));
  }

  return NextResponse.json(bet);
}

// DELETE a bet or PATCH to recalculate/settle
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();
  const r = getRedis();
  const key = `btc-lab:session:${id}:bets`;

  const raw = await r.lrange(key, 0, -1);
  const bets: PaperBet[] = raw.map((b) =>
    typeof b === "string" ? JSON.parse(b) : b
  );

  // Delete a bet
  if (body.action === "delete" && body.betId) {
    const filtered = bets.filter((b) => b.id !== body.betId);
    await r.del(key);
    if (filtered.length > 0) {
      const p = r.pipeline();
      for (const b of filtered) p.rpush(key, JSON.stringify(b));
      await p.exec();
    }
    // Update meta
    const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
    if (metaRaw) {
      const meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
      meta.betCount = filtered.length;
      meta.totalPnl = filtered.reduce((s, b) => s + (b.pnl || 0), 0);
      await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));
    }
    return NextResponse.json({ ok: true, remaining: filtered.length });
  }

  // Recalculate/settle a bet manually
  if (body.action === "settle" && body.betId && body.outcome) {
    const updated = bets.map((b) => {
      if (b.id === body.betId) {
        const { pnl, won } = calcPnl(b, body.outcome);
        return {
          ...b,
          outcome: won ? "WIN" as const : "LOSS" as const,
          pnl,
          settledAt: new Date().toISOString(),
        };
      }
      return b;
    });
    await r.del(key);
    if (updated.length > 0) {
      const p = r.pipeline();
      for (const b of updated) p.rpush(key, JSON.stringify(b));
      await p.exec();
    }
    // Update meta
    const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
    if (metaRaw) {
      const meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
      meta.totalPnl = updated.reduce((s, b) => s + (b.pnl || 0), 0);
      await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
