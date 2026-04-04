import { NextRequest, NextResponse } from "next/server";
import { getRedis, checkAuth } from "@/lib/kv";

// Control state stored in Redis:
// btc-lab:control → { running: bool, manualTarget: number|null, startedAt, stoppedAt }

export async function GET(req: NextRequest) {
  const denied = await checkAuth(req);
  if (denied) return denied;

  try {
    const r = getRedis();
    const raw = await r.get("btc-lab:control");
    const state = raw
      ? typeof raw === "string" ? JSON.parse(raw) : raw
      : { running: false, manualTarget: null, startedAt: null, stoppedAt: null };
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
      : { running: false, manualTarget: null, startedAt: null, stoppedAt: null };

    if (body.action === "start") {
      state.running = true;
      state.startedAt = new Date().toISOString();
      state.stoppedAt = null;
    } else if (body.action === "stop") {
      state.running = false;
      state.stoppedAt = new Date().toISOString();
    }

    if (body.manualTarget !== undefined) {
      state.manualTarget = body.manualTarget; // number or null to clear
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
