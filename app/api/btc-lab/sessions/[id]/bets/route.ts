import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { PaperBet } from "@/lib/btc-lab-types";
import { calcPmFee } from "@/lib/btc-lab-types";

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

  const bet: PaperBet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    side: body.side || "UP",
    amount: body.amount || 100,
    price: body.price || 0.5,
    cexMedianAtBet: body.cexMedianAtBet || 0,
    targetPrice: body.targetPrice || 0,
    targetSource: body.targetSource || "auto",
    moveAtBet: body.moveAtBet || 0,
    fairProbability: body.fairProbability || 0.5,
    edge: body.edge || 0,
    fee: Math.round(fee * 100) / 100,
    secondsLeftAtBet: body.secondsLeftAtBet || 0,
    timerAtBet: body.timerAtBet || (() => {
      const s = body.secondsLeftAtBet || 0;
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    })(),
    placedAt: new Date().toISOString(),
    outcome: "PENDING",
    pnl: null,
    settledAt: null,
  };

  await r.rpush(`btc-lab:session:${id}:bets`, JSON.stringify(bet));

  // Update bet count in meta
  const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
  if (metaRaw) {
    const meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
    meta.betCount = (meta.betCount || 0) + 1;
    await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));
  }

  return NextResponse.json(bet);
}
