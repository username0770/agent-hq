import { NextRequest, NextResponse } from "next/server";
import { fetchLocal } from "@/lib/btc-lab/local-api";

// Control state stored in local SQLite via FastAPI
// Fallback: in-memory on the Next.js server

let memoryControl = {
  running: false,
  manualTarget: null as number | null,
  targetMode: "auto" as string,
  strategies: [] as unknown[],
  startedAt: null as string | null,
  stoppedAt: null as string | null,
};

export async function GET() {
  // Try local API health check — if online, script is running
  const health = await fetchLocal("/health");
  const ctrl = { ...memoryControl, running: !!health };
  // Load strategies from local DB
  const strats = await fetchLocal("/strategies");
  if (Array.isArray(strats)) ctrl.strategies = strats;
  return NextResponse.json(ctrl);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "start") {
    memoryControl.running = true;
    memoryControl.startedAt = new Date().toISOString();
    memoryControl.stoppedAt = null;
  } else if (body.action === "stop") {
    memoryControl.running = false;
    memoryControl.stoppedAt = new Date().toISOString();
  }
  if (body.manualTarget !== undefined) {
    memoryControl.manualTarget = body.manualTarget;
  }
  if (body.targetMode !== undefined) {
    memoryControl.targetMode = body.targetMode;
  }
  if (body.strategies) {
    memoryControl.strategies = body.strategies;
  }

  return NextResponse.json(memoryControl);
}
