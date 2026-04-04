"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import dynamic from "next/dynamic";
import type { SessionMeta, Session, AggregateStats } from "@/lib/btc-lab-types";
import LivePanel from "@/components/btc-lab/LivePanel";
import SessionHistory from "@/components/btc-lab/SessionHistory";

const SessionChart = dynamic(
  () => import("@/components/btc-lab/SessionChart"),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ControlState {
  running: boolean;
  manualTarget: number | null;
  startedAt: string | null;
  stoppedAt: string | null;
}

export default function BtcLabPage() {
  const [chartCount, setChartCount] = useState(10);

  // Control state
  const { data: control } = useSWR<ControlState>(
    "/api/btc-lab/control",
    fetcher,
    { refreshInterval: 3000 }
  );

  // Sessions list
  const { data: sessions = [] } = useSWR<SessionMeta[]>(
    "/api/btc-lab/sessions",
    fetcher,
    { refreshInterval: 3000 }
  );

  // Latest session with full ticks
  const latestId = sessions[0]?.id;
  const { data: latestSession } = useSWR<Session>(
    latestId ? `/api/btc-lab/sessions/${latestId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  // Chart data
  const chartIds = sessions.slice(0, chartCount).map((s) => s.id);
  const { data: chartSessions = [] } = useSWR<Session[]>(
    chartIds.length > 0
      ? `/api/btc-lab/sessions?chart=${chartIds.join(",")}`
      : null,
    async (url: string) => {
      const ids = new URL(url, window.location.origin).searchParams
        .get("chart")
        ?.split(",") || [];
      return Promise.all(
        ids.map((id) =>
          fetch(`/api/btc-lab/sessions/${id}`).then((r) => r.json())
        )
      );
    },
    { refreshInterval: 5000 }
  );

  // Summary
  const { data: stats } = useSWR<AggregateStats>(
    "/api/btc-lab/summary",
    fetcher,
    { refreshInterval: 10000 }
  );

  const isLive = latestSession && !latestSession.completedAt;

  async function sendControl(body: Record<string, unknown>) {
    await fetch("/api/btc-lab/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    mutate("/api/btc-lab/control");
  }

  async function handleSetManualTarget(price: number | null) {
    await sendControl({ manualTarget: price });
    // Also update current session meta if exists
    if (latestId && price !== null) {
      await fetch(`/api/btc-lab/sessions/${latestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: { targetPrice: price, targetSource: "manual" },
        }),
      });
      mutate(`/api/btc-lab/sessions/${latestId}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BTC Lab</h1>
          <p className="text-sm text-zinc-500">
            Paper trading on BTC 5-minute markets
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Stats */}
          {stats && stats.totalBets > 0 && (
            <>
              <StatBadge label="Bets" value={String(stats.totalBets)} />
              <StatBadge
                label="Win Rate"
                value={`${stats.winRate}%`}
                color={stats.winRate >= 50 ? "emerald" : "red"}
              />
              <StatBadge
                label="P&L"
                value={`${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(0)}`}
                color={stats.totalPnl >= 0 ? "emerald" : "red"}
              />
            </>
          )}
          {/* Control buttons */}
          <div className="flex gap-2 ml-2">
            {control?.running ? (
              <button
                onClick={() => sendControl({ action: "stop" })}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Stop Script
              </button>
            ) : (
              <button
                onClick={() => sendControl({ action: "start" })}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Start Script
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Script status bar */}
      {control && (
        <div className={`rounded-lg px-4 py-2 text-xs flex items-center gap-2 ${
          control.running
            ? "bg-emerald-950/30 border border-emerald-800/30 text-emerald-400"
            : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-500"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${
            control.running ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
          }`} />
          {control.running
            ? `Script running since ${new Date(control.startedAt!).toLocaleTimeString()}`
            : control.stoppedAt
              ? `Script stopped at ${new Date(control.stoppedAt).toLocaleTimeString()}`
              : "Script not started"}
          {control.manualTarget !== null && (
            <span className="ml-auto text-yellow-400">
              Manual target: ${control.manualTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      )}

      {/* LIVE Panel */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          {isLive && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          Live Session
        </h2>
        <LivePanel
          session={isLive ? latestSession! : null}
          manualTarget={control?.manualTarget ?? null}
          onSetManualTarget={handleSetManualTarget}
        />
      </section>

      {/* Chart */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Price Chart
          </h2>
          <div className="flex gap-1">
            {[10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setChartCount(n)}
                className={`rounded px-2 py-0.5 text-xs ${
                  chartCount === n
                    ? "bg-zinc-700 text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <SessionChart sessions={chartSessions} height={350} />
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Session History ({sessions.length})
        </h2>
        <SessionHistory sessions={sessions} />
      </section>
    </div>
  );
}

function StatBadge({
  label,
  value,
  color = "zinc",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const colors: Record<string, string> = {
    zinc: "text-zinc-300",
    emerald: "text-emerald-400",
    red: "text-red-400",
  };
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-center">
      <div className={`text-sm font-bold ${colors[color] || colors.zinc}`}>
        {value}
      </div>
      <div className="text-[10px] text-zinc-500">{label}</div>
    </div>
  );
}
