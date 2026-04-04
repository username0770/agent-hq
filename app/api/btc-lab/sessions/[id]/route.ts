import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import type { SessionMeta, Session } from "@/lib/btc-lab-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  const { id } = await params;
  const r = getRedis();

  const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
  if (!metaRaw) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const meta: SessionMeta =
    typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;

  // Check if caller wants ticks
  const url = new URL(req.url);
  const withTicks = url.searchParams.get("ticks") !== "false";

  let ticks: unknown[] = [];
  let orderBook: unknown[] = [];
  let bets: unknown[] = [];

  if (withTicks) {
    const ticksRaw = await r.lrange(`btc-lab:session:${id}:ticks`, 0, -1);
    ticks = ticksRaw.map((t) => (typeof t === "string" ? JSON.parse(t) : t));
  }

  const obRaw = await r.lrange(`btc-lab:session:${id}:orderbook`, -1, -1);
  orderBook = obRaw.map((o) => (typeof o === "string" ? JSON.parse(o) : o));

  const betsRaw = await r.lrange(`btc-lab:session:${id}:bets`, 0, -1);
  bets = betsRaw.map((b) => (typeof b === "string" ? JSON.parse(b) : b));

  const session: Session = {
    ...meta,
    ticks: ticks as Session["ticks"],
    orderBook: orderBook as Session["orderBook"],
    bets: bets as Session["bets"],
  };

  return NextResponse.json(session);
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

  // Append tick
  if (body.tick) {
    await r.rpush(
      `btc-lab:session:${id}:ticks`,
      JSON.stringify(body.tick)
    );
    // Keep max 600 ticks per session (20 minutes worth)
    await r.ltrim(`btc-lab:session:${id}:ticks`, -600, -1);
    return NextResponse.json({ ok: true });
  }

  // Append orderbook snapshot
  if (body.orderBook) {
    await r.rpush(
      `btc-lab:session:${id}:orderbook`,
      JSON.stringify(body.orderBook)
    );
    // Keep max 60 snapshots
    await r.ltrim(`btc-lab:session:${id}:orderbook`, -60, -1);
    return NextResponse.json({ ok: true });
  }

  // Update meta fields (resolvedOutcome, completedAt, targetPrice)
  if (body.meta) {
    const metaRaw = await r.get(`btc-lab:session:${id}:meta`);
    if (metaRaw) {
      const meta =
        typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
      Object.assign(meta, body.meta);
      await r.set(`btc-lab:session:${id}:meta`, JSON.stringify(meta));
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No action" }, { status: 400 });
}
