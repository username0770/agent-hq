"use client";

import { useState } from "react";
import useSWR, { mutate, useSWRConfig } from "swr";
import dynamic from "next/dynamic";
import type { SessionMeta, Session, AggregateStats } from "@/lib/btc-lab-types";
import LivePanel from "@/components/btc-lab/LivePanel";
import SessionHistory from "@/components/btc-lab/SessionHistory";

const SessionChart = dynamic(
  () => import("@/components/btc-lab/SessionChart"),
  { ssr: false }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface BetSettings {
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
  settings: BetSettings;
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
  const { data: stats } = useSWR<AggregateStats>(
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
    await sendControl({ manualTarget: price });
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

      {/* Settings Panel */}
      {showSettings && control?.settings && (
        <SettingsPanel
          settings={control.settings}
          onSave={(s) => {
            sendControl({ settings: s });
            setShowSettings(false);
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

function SettingsPanel({
  settings,
  onSave,
}: {
  settings: BetSettings;
  onSave: (s: BetSettings) => void;
}) {
  const [s, setS] = useState({ ...settings });

  const timerMinLabel = `${Math.floor(s.timerMin / 60)}:${String(s.timerMin % 60).padStart(2, "0")}`;
  const timerMaxLabel = `${Math.floor(s.timerMax / 60)}:${String(s.timerMax % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-xl border border-yellow-800/50 bg-zinc-900 p-5">
      <h3 className="text-sm font-bold text-zinc-200 mb-4">Betting Settings</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        {/* Min Edge */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Min Edge after fee (%)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={1} max={30} step={0.5}
              value={s.minEdge}
              onChange={(e) => setS({ ...s, minEdge: parseFloat(e.target.value) })}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono font-bold text-yellow-400 w-12 text-right">
              {s.minEdge}%
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            Ставка только когда edge &gt; {s.minEdge}% после комиссии
          </p>
        </div>

        {/* Timer range: min (latest bet) */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Timer: earliest bet (seconds left)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={300} step={5}
              value={s.timerMin}
              onChange={(e) => setS({ ...s, timerMin: parseInt(e.target.value) })}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono font-bold text-zinc-300 w-12 text-right">
              {timerMinLabel}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            Не ставить когда осталось меньше {s.timerMin}с
          </p>
        </div>

        {/* Timer range: max (earliest bet) */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Timer: latest bet (seconds left)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={300} step={5}
              value={s.timerMax}
              onChange={(e) => setS({ ...s, timerMax: parseInt(e.target.value) })}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono font-bold text-zinc-300 w-12 text-right">
              {timerMaxLabel}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            Не ставить когда осталось больше {s.timerMax}с
          </p>
        </div>

        {/* Bet amount */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Bet amount ($)</label>
          <input
            type="number" min={1} max={1000} step={10}
            value={s.betAmount}
            onChange={(e) => setS({ ...s, betAmount: parseInt(e.target.value) || 100 })}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-yellow-500 focus:outline-none"
          />
        </div>

        {/* Max bets per window */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Max bets per window</label>
          <input
            type="number" min={1} max={20} step={1}
            value={s.maxBetsPerWindow}
            onChange={(e) => setS({ ...s, maxBetsPerWindow: parseInt(e.target.value) || 5 })}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-yellow-500 focus:outline-none"
          />
        </div>

        {/* Cooldown */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Cooldown between bets (sec)</label>
          <input
            type="number" min={5} max={120} step={5}
            value={s.cooldown}
            onChange={(e) => setS({ ...s, cooldown: parseInt(e.target.value) || 30 })}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-yellow-500 focus:outline-none"
          />
        </div>

        {/* Price Min */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Min market price to buy
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0.01} max={0.99} step={0.01}
              value={s.priceMin}
              onChange={(e) => setS({ ...s, priceMin: parseFloat(e.target.value) })}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono font-bold text-yellow-400 w-12 text-right">
              {(s.priceMin * 100).toFixed(0)}c
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            Только рынки с ценой {(s.priceMin * 100).toFixed(0)}%+ ({(s.priceMin * 100).toFixed(0)}c+)
          </p>
        </div>

        {/* Price Max */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">
            Max market price to buy
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0.01} max={0.99} step={0.01}
              value={s.priceMax}
              onChange={(e) => setS({ ...s, priceMax: parseFloat(e.target.value) })}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-sm font-mono font-bold text-yellow-400 w-12 text-right">
              {(s.priceMax * 100).toFixed(0)}c
            </span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1">
            Не покупать дороже {(s.priceMax * 100).toFixed(0)}c
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">
        ${s.betAmount} при edge &gt; {s.minEdge}% | таймер {timerMaxLabel}–{timerMinLabel} | цена {(s.priceMin*100).toFixed(0)}c–{(s.priceMax*100).toFixed(0)}c | макс {s.maxBetsPerWindow} ставок | пауза {s.cooldown}с
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onSave(s)}
          className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-500"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
