"use client";

import { useState } from "react";
import useSWR, { mutate, useSWRConfig } from "swr";
import dynamic from "next/dynamic";
import type { SessionMeta, Session } from "@/lib/btc-lab-types";

interface StrategyStats {
  id: string; name: string; bets: number; wins: number;
  losses: number; pending: number; winRate: number;
  pnl: number; avgEdge: number;
}

interface SummaryData {
  totalSessions: number; totalBets: number; wins: number;
  losses: number; pending: number; winRate: number;
  totalPnl: number; avgEdge: number;
  strategies: StrategyStats[];
}
import LivePanel from "@/components/btc-lab/LivePanel";
import SessionHistory from "@/components/btc-lab/SessionHistory";

const SessionChart = dynamic(
  () => import("@/components/btc-lab/SessionChart"),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Strategy {
  id: string;
  name: string;
  enabled: boolean;
  mirror: boolean;
  fairMin: number;
  minEdge: number;
  timerMin: number;
  timerMax: number;
  betAmount: number;
  maxBetsPerWindow: number;
  cooldown: number;
  priceMin: number;
  priceMax: number;
}

interface ControlState {
  running: boolean;
  manualTarget: number | null;
  targetMode: "auto" | "manual";
  strategies: Strategy[];
  startedAt: string | null;
  stoppedAt: string | null;
}

export default function BtcLabPage() {
  const [chartCount, setChartCount] = useState(10);
  const [showSettings, setShowSettings] = useState(false);

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
  const { data: stats } = useSWR<SummaryData>(
    "/api/btc-lab/summary",
    fetcher,
    { refreshInterval: 10000 }
  );

  const isLive = latestSession && !latestSession.completedAt;

  async function sendControl(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/btc-lab/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) console.error("control:", await res.text());
    } catch (e) {
      console.error("control error:", e);
    }
    mutate("/api/btc-lab/control");
  }

  async function handleSetManualTarget(price: number | null) {
    await sendControl({
      manualTarget: price,
      targetMode: price !== null ? "manual" : "auto",
    });
    if (latestId) {
      try {
        await fetch(`/api/btc-lab/sessions/${latestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meta: {
              targetPrice: price ?? undefined,
              targetSource: price !== null ? "manual" : "auto",
            },
          }),
        });
      } catch (e) {
        console.error("update session error:", e);
      }
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
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                showSettings
                  ? "border-yellow-600 text-yellow-400 bg-yellow-900/20"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Settings
            </button>
            {control?.running ? (
              <button
                onClick={() => sendControl({ action: "stop" })}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                Stop
              </button>
            ) : (
              <button
                onClick={() => sendControl({ action: "start" })}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Start
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

      {/* Strategy Balances */}
      {stats?.strategies && stats.strategies.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {stats.strategies.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-400">
                  {s.name}
                </span>
                <span className={`text-sm font-bold ${
                  s.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}>
                  {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-zinc-500">
                <span>{s.bets} bets</span>
                <span className="text-emerald-500">{s.wins}W</span>
                <span className="text-red-500">{s.losses}L</span>
                {s.pending > 0 && <span>{s.pending} pending</span>}
                <span className={s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}>
                  {s.winRate}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strategies Panel */}
      {showSettings && control?.strategies && (
        <StrategiesPanel
          strategies={control.strategies}
          onSave={(strats) => {
            sendControl({ strategies: strats });
          }}
        />
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
          onBetUpdate={() => {
            mutate(`/api/btc-lab/sessions/${latestId}`);
            mutate("/api/btc-lab/summary");
          }}
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

function StrategiesPanel({
  strategies,
  onSave,
}: {
  strategies: Strategy[];
  onSave: (s: Strategy[]) => void;
}) {
  const [strats, setStrats] = useState(strategies.map(s => ({ ...s })));
  const colors = ["emerald", "blue", "orange"];

  function update(idx: number, patch: Partial<Strategy>) {
    const copy = strats.map((s, i) => i === idx ? { ...s, ...patch } : s);
    setStrats(copy);
  }

  return (
    <div className="rounded-xl border border-yellow-800/50 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-200">Strategies</h3>
        <button
          onClick={() => onSave(strats)}
          className="rounded-lg bg-yellow-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-yellow-500"
        >
          Save All
        </button>
      </div>

      <div className="space-y-4">
        {strats.map((s, i) => {
          const c = colors[i] || "zinc";
          const tmn = `${Math.floor(s.timerMin/60)}:${String(s.timerMin%60).padStart(2,"0")}`;
          const tmx = `${Math.floor(s.timerMax/60)}:${String(s.timerMax%60).padStart(2,"0")}`;

          return (
            <div key={s.id} className={`rounded-lg border p-4 ${
              s.enabled ? `border-${c}-800/50 bg-${c}-950/10` : "border-zinc-800 bg-zinc-950 opacity-60"
            }`}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => update(i, { enabled: !s.enabled })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    s.enabled ? "bg-emerald-600" : "bg-zinc-700"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    s.enabled ? "left-5" : "left-0.5"
                  }`} />
                </button>
                <input
                  value={s.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="bg-transparent text-sm font-bold text-zinc-200 border-b border-transparent focus:border-zinc-600 focus:outline-none"
                />
                {s.mirror && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
                    MIRROR
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 ml-auto">
                  ${s.betAmount} | edge &gt;{s.minEdge}% | {tmx}-{tmn} | {(s.priceMin*100).toFixed(0)}-{(s.priceMax*100).toFixed(0)}c
                </span>
              </div>

              {s.enabled && (
                <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-4">
                  {/* Mirror toggle */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Mirror (contrarian)</label>
                    <button
                      onClick={() => update(i, { mirror: !s.mirror })}
                      className={`w-full rounded border px-2 py-1 text-xs font-medium transition-colors ${
                        s.mirror
                          ? "border-red-600 bg-red-900/30 text-red-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {s.mirror ? "ON — bet opposite" : "OFF — bet normal"}
                    </button>
                  </div>
                  {/* Fair Min (Sure Thing mode) */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">
                      Fair min {s.fairMin ? `${(s.fairMin*100).toFixed(0)}%` : "off"}
                    </label>
                    <div className="flex items-center gap-1">
                      <input type="range" min={0} max={1} step={0.01} value={s.fairMin || 0}
                        onChange={(e) => update(i, { fairMin: parseFloat(e.target.value) })}
                        className="flex-1 accent-yellow-500" />
                      <span className="text-xs font-mono w-10 text-right">
                        {s.fairMin ? `${(s.fairMin*100).toFixed(0)}%` : "off"}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600">
                      {s.fairMin && s.fairMin > 0 ? "Bet when fair >= this (ignores edge)" : "Disabled — use edge"}
                    </p>
                  </div>

                  {/* Edge */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Min Edge %</label>
                    <div className="flex items-center gap-1">
                      <input type="range" min={0} max={30} step={0.5} value={s.minEdge}
                        onChange={(e) => update(i, { minEdge: parseFloat(e.target.value) })}
                        className="flex-1 accent-yellow-500" />
                      <span className="text-xs font-mono w-8 text-right text-yellow-400">{s.minEdge}</span>
                    </div>
                  </div>

                  {/* Bet Amount */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Bet $</label>
                    <input type="number" min={1} max={1000} step={10} value={s.betAmount}
                      onChange={(e) => update(i, { betAmount: parseInt(e.target.value) || 100 })}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none" />
                  </div>

                  {/* Timer Min (stop betting) */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Timer from {tmx}</label>
                    <div className="flex items-center gap-1">
                      <input type="range" min={0} max={300} step={5} value={s.timerMax}
                        onChange={(e) => update(i, { timerMax: parseInt(e.target.value) })}
                        className="flex-1 accent-yellow-500" />
                      <span className="text-xs font-mono w-10 text-right">{tmx}</span>
                    </div>
                  </div>

                  {/* Timer Max (start betting) */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Timer to {tmn}</label>
                    <div className="flex items-center gap-1">
                      <input type="range" min={0} max={300} step={5} value={s.timerMin}
                        onChange={(e) => update(i, { timerMin: parseInt(e.target.value) })}
                        className="flex-1 accent-yellow-500" />
                      <span className="text-xs font-mono w-10 text-right">{tmn}</span>
                    </div>
                  </div>

                  {/* Price range */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Price min {(s.priceMin*100).toFixed(0)}c</label>
                    <input type="range" min={0.01} max={0.99} step={0.01} value={s.priceMin}
                      onChange={(e) => update(i, { priceMin: parseFloat(e.target.value) })}
                      className="w-full accent-yellow-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Price max {(s.priceMax*100).toFixed(0)}c</label>
                    <input type="range" min={0.01} max={0.99} step={0.01} value={s.priceMax}
                      onChange={(e) => update(i, { priceMax: parseFloat(e.target.value) })}
                      className="w-full accent-yellow-500" />
                  </div>

                  {/* Max bets + cooldown */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Max bets/window</label>
                    <input type="number" min={1} max={20} value={s.maxBetsPerWindow}
                      onChange={(e) => update(i, { maxBetsPerWindow: parseInt(e.target.value) || 5 })}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Cooldown (sec)</label>
                    <input type="number" min={5} max={120} step={5} value={s.cooldown}
                      onChange={(e) => update(i, { cooldown: parseInt(e.target.value) || 30 })}
                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
