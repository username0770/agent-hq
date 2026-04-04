"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import type { SessionMeta, Session, AggregateStats } from "@/lib/btc-lab-types";
import LivePanel from "@/components/btc-lab/LivePanel";
import SessionHistory from "@/components/btc-lab/SessionHistory";

const SessionChart = dynamic(
  () => import("@/components/btc-lab/SessionChart"),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BtcLabPage() {
  const [chartCount, setChartCount] = useState(10);

  // Sessions list (meta only)
  const { data: sessions = [] } = useSWR<SessionMeta[]>(
    "/api/btc-lab/sessions",
    fetcher,
    { refreshInterval: 3000 }
  );

  // Latest session with full ticks (for live panel + chart)
  const latestId = sessions[0]?.id;
  const { data: latestSession } = useSWR<Session>(
    latestId ? `/api/btc-lab/sessions/${latestId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  // Chart data — load recent sessions with ticks
  const chartIds = sessions.slice(0, chartCount).map((s) => s.id);
  const { data: chartSessions = [] } = useSWR<Session[]>(
    chartIds.length > 0
      ? `/api/btc-lab/sessions?chart=${chartIds.join(",")}`
      : null,
    async (url: string) => {
      const ids = new URL(url, window.location.origin).searchParams
        .get("chart")
        ?.split(",") || [];
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/btc-lab/sessions/${id}`).then((r) => r.json())
        )
      );
      return results;
    },
    { refreshInterval: 5000 }
  );

  // Summary stats
  const { data: stats } = useSWR<AggregateStats>(
    "/api/btc-lab/summary",
    fetcher,
    { refreshInterval: 10000 }
  );

  const isLive = latestSession && !latestSession.completedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BTC Lab</h1>
          <p className="text-sm text-zinc-500">
            Paper trading on BTC 5-minute markets
          </p>
        </div>
        {stats && stats.totalBets > 0 && (
          <div className="flex gap-3">
            <StatBadge
              label="Bets"
              value={String(stats.totalBets)}
            />
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
            <StatBadge
              label="Avg Edge"
              value={`${stats.avgEdge}%`}
            />
          </div>
        )}
      </div>

      {/* LIVE Panel */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          {isLive && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          Live Session
        </h2>
        <LivePanel session={isLive ? latestSession! : null} />
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
