import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";

// Control state in Redis:
// btc-lab:control → { running, manualTarget, settings, startedAt, stoppedAt }

const DEFAULT_SETTINGS = {
  minEdge: 7,           // minimum edge % after fee to place bet
  timerMin: 0,          // earliest seconds left (0 = can bet until end)
  timerMax: 300,        // latest seconds left (300 = can bet from start)
  betAmount: 100,       // $ per bet
  maxBetsPerWindow: 5,  // max bets per 5min window
  cooldown: 30,         // seconds between bets
};

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  try {
    const r = getRedis();
    const raw = await r.get("btc-lab:control");
    const state = raw
      ? typeof raw === "string" ? JSON.parse(raw) : raw
      : { running: false, manualTarget: null, settings: DEFAULT_SETTINGS,
          startedAt: null, stoppedAt: null };
    // Ensure settings always has defaults
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
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
      : { running: false, manualTarget: null, settings: DEFAULT_SETTINGS,
          startedAt: null, stoppedAt: null };
    state.settings = { ...DEFAULT_SETTINGS, ...state.settings };

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

    if (body.settings) {
      state.settings = { ...state.settings, ...body.settings };
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
