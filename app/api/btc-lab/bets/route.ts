import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";
import { KV, calcFee, timerPhase, type RealBet, type Strategy } from "@/lib/btc-lab/types";

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  try {
    const r = getRedis();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all";
    const strategyId = url.searchParams.get("strategyId");
    const outcome = url.searchParams.get("outcome");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Collect bet IDs
    let betIds: string[] = [];
    if (strategyId) {
      betIds = (await r.smembers(KV.strategyBets(strategyId))) || [];
    } else if (type === "real") {
      betIds = (await r.smembers(KV.betsReal)) || [];
    } else if (type === "paper") {
      betIds = (await r.smembers(KV.betsPaper)) || [];
    } else {
      const real = (await r.smembers(KV.betsReal)) || [];
      const paper = (await r.smembers(KV.betsPaper)) || [];
      betIds = [...real, ...paper];
    }

    if (!betIds.length) return NextResponse.json({ bets: [], total: 0 });

    const pipe = r.pipeline();
    for (const id of betIds) pipe.get(KV.bet(id));
    const raws = await pipe.exec();
    let bets: RealBet[] = raws
      .filter(Boolean)
      .map((b) => (typeof b === "string" ? JSON.parse(b) : b));

    // Filters
    if (outcome) bets = bets.filter((b) => b.outcome === outcome);
    const side = url.searchParams.get("side");
    if (side) bets = bets.filter((b) => b.side === side);
    const phase = url.searchParams.get("timerPhase");
    if (phase) bets = bets.filter((b) => b.timerPhase === phase);
    const tgtSrc = url.searchParams.get("targetSource");
    if (tgtSrc) bets = bets.filter((b) => b.targetPriceSource === tgtSrc);

    bets.sort((a, b) => (b.placedAt > a.placedAt ? 1 : -1));
    const total = bets.length;
    bets = bets.slice(offset, offset + limit);

    return NextResponse.json({ bets, total });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const r = getRedis();

    const id = `bet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const betType = body.betType || "paper";
    const price = body.executedPrice ?? body.intendedPrice ?? 0.5;
    const fee = calcFee(body.amountUSDC || 100, price, body.feeRate || 0.072);

    // Get strategy name
    let stratName = body.strategyName || "";
    if (body.strategyId && !stratName) {
      const raw = await r.get(KV.strategy(body.strategyId));
      if (raw) {
        const s: Strategy = typeof raw === "string" ? JSON.parse(raw) : raw;
        stratName = s.name;
      }
    }

    const bet: RealBet = {
      id,
      sessionId: body.sessionId || "",
      strategyId: body.strategyId || "",
      strategyName: stratName,
      betType,
      marketQuestion: body.marketQuestion || "",
      marketSlug: body.marketSlug || "",
      upTokenId: body.upTokenId || "",
      downTokenId: body.downTokenId || "",
      eventStartTime: body.eventStartTime || "",
      eventEndTime: body.eventEndTime || "",
      side: body.side || "UP",
      amountUSDC: body.amountUSDC || 100,
      intendedPrice: body.intendedPrice ?? 0.5,
      executedPrice: body.executedPrice ?? null,
      slippage: body.slippage ?? null,
      sharesReceived: body.sharesReceived ?? null,
      feeRate: body.feeRate || 0.072,
      feeCalculated: Math.round(fee * 10000) / 10000,
      feeActual: body.feeActual ?? null,
      targetPrice: body.targetPrice ?? null,
      targetPriceSource: body.targetPriceSource || "auto",
      cexMedianAtBet: body.cexMedianAtBet || 0,
      binancePriceAtBet: body.binancePriceAtBet ?? null,
      coinbasePriceAtBet: body.coinbasePriceAtBet ?? null,
      okxPriceAtBet: body.okxPriceAtBet ?? null,
      bybitPriceAtBet: body.bybitPriceAtBet ?? null,
      moveFromTarget: body.moveFromTarget ?? null,
      movePercent: body.movePercent ?? null,
      pmUpPriceAtBet: body.pmUpPriceAtBet ?? 0.5,
      pmDownPriceAtBet: body.pmDownPriceAtBet ?? 0.5,
      pmBidAtBet: body.pmBidAtBet ?? null,
      pmAskAtBet: body.pmAskAtBet ?? null,
      pmSpreadAtBet: body.pmSpreadAtBet ?? null,
      orderBookBids: body.orderBookBids || [],
      orderBookAsks: body.orderBookAsks || [],
      fairProbability: body.fairProbability ?? 0.5,
      edge: body.edge ?? 0,
      modelVolatility: body.modelVolatility ?? 15,
      secondsLeftAtBet: body.secondsLeftAtBet ?? 0,
      timerPhase: timerPhase(body.secondsLeftAtBet ?? 0),
      placedAt: new Date().toISOString(),
      txHash: body.txHash ?? null,
      orderId: body.orderId ?? null,
      orderStatus: body.orderStatus ?? null,
      outcome: "PENDING",
      resolvedPrice: null,
      resolvedAt: null,
      grossPnl: null,
      netPnl: null,
      roi: null,
      note: body.note ?? null,
      autoPlaced: body.autoPlaced ?? false,
      signalType: body.signalType ?? null,
    };

    await r.set(KV.bet(id), JSON.stringify(bet));
    await r.sadd(betType === "real" ? KV.betsReal : KV.betsPaper, id);
    if (bet.strategyId) {
      await r.sadd(KV.strategyBets(bet.strategyId), id);
      // Update strategy stats
      const sraw = await r.get(KV.strategy(bet.strategyId));
      if (sraw) {
        const s = typeof sraw === "string" ? JSON.parse(sraw) : sraw;
        s.totalBets = (s.totalBets || 0) + 1;
        if (betType === "real") s.totalRealBets = (s.totalRealBets || 0) + 1;
        else s.totalPaperBets = (s.totalPaperBets || 0) + 1;
        s.updatedAt = new Date().toISOString();
        await r.set(KV.strategy(bet.strategyId), JSON.stringify(s));
      }
    }

    return NextResponse.json(bet);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
