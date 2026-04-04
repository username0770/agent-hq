import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";

const DEFAULT_STRATEGY = {
  enabled: true,
  name: "Default",
  mirror: false,
  minEdge: 7,
  timerMin: 0,
  timerMax: 300,
  betAmount: 100,
  maxBetsPerWindow: 5,
  cooldown: 30,
  priceMin: 0.01,
  priceMax: 0.99,
};

const DEFAULT_STRATEGIES = [
  {
    ...DEFAULT_STRATEGY,
    id: "aggressive",
    name: "Aggressive",
    enabled: true,
    mirror: false,
    minEdge: 3,
    betAmount: 50,
  },
  {
    ...DEFAULT_STRATEGY,
    id: "sniper",
    name: "Sniper",
    enabled: true,
    mirror: false,
    minEdge: 5,
    timerMax: 90,
    priceMin: 0.80,
  },
  {
    ...DEFAULT_STRATEGY,
    id: "contrarian",
    name: "Contrarian",
    enabled: false,
    mirror: true,
    minEdge: 5,
    timerMax: 120,
    maxBetsPerWindow: 3,
    priceMin: 0.75,
  },
];

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  try {
    const r = getRedis();
    const raw = await r.get("btc-lab:control");
    const state = raw
      ? typeof raw === "string" ? JSON.parse(raw) : raw
      : { running: false, manualTarget: null, strategies: DEFAULT_STRATEGIES,
          startedAt: null, stoppedAt: null };
    // Ensure strategies exist with defaults
    if (!state.strategies || !Array.isArray(state.strategies)) {
      state.strategies = DEFAULT_STRATEGIES;
    }
    // Backfill missing fields
    state.strategies = state.strategies.map((s: Record<string, unknown>, i: number) => ({
      ...DEFAULT_STRATEGIES[i] || DEFAULT_STRATEGY,
      ...s,
    }));
    return NextResponse.json(state);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const r = getRedis();

    const raw = await r.get("btc-lab:control");
    const state = raw
      ? typeof raw === "string" ? JSON.parse(raw) : raw
      : { running: false, manualTarget: null, strategies: DEFAULT_STRATEGIES,
          startedAt: null, stoppedAt: null };
    if (!state.strategies) state.strategies = DEFAULT_STRATEGIES;

    if (body.action === "start") {
      state.running = true;
      state.startedAt = new Date().toISOString();
      state.stoppedAt = null;
    } else if (body.action === "stop") {
      state.running = false;
      state.stoppedAt = new Date().toISOString();
    }

    if (body.manualTarget !== undefined) {
      state.manualTarget = body.manualTarget;
    }

    if (body.strategies) {
      state.strategies = body.strategies;
    }

    // Legacy: single settings update → apply to first strategy
    if (body.settings) {
      state.strategies[0] = { ...state.strategies[0], ...body.settings };
    }

    await r.set("btc-lab:control", JSON.stringify(state));
    return NextResponse.json(state);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
