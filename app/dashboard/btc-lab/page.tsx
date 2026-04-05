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

const LOCAL = "http://localhost:8765";
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const localFetcher = (path: string) =>
  fetch(`${LOCAL}${path}`).then((r) => r.json()).catch(() => null);

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
  // Direct from FastAPI — faster, no Next.js proxy
  const { data: rawSessions } = useSWR(
    "/sessions", localFetcher, { refreshInterval: 2000 }
  );
  const sessions: SessionMeta[] = Array.isArray(rawSessions) ? rawSessions : [];

  // Latest session — ticks + bets
  const latestId = sessions[0]?.id;
  const { data: latestSession } = useSWR<Session>(
    latestId ? `/sessions/${latestId}/full` : null,
    async (path: string) => {
      const sid = latestId;
      const [ticks, betsAll] = await Promise.all([
        localFetcher(`/sessions/${sid}/ticks`),
        localFetcher(`/bets?limit=50`),
      ]);
      const meta = sessions.find((s) => s.id === sid) || {};
      const sessionBets = Array.isArray(betsAll)
        ? betsAll.filter((b: Record<string, unknown>) =>
            (b.session_id || b.sessionId) === sid)
        : [];
      return {
        ...meta,
        ticks: Array.isArray(ticks) ? ticks : [],
        orderBook: [],
        bets: sessionBets,
      } as unknown as Session;
    },
    { refreshInterval: 1000 }  // 1 second!
  );

  // Chart data — direct from FastAPI
  const chartIds = sessions.slice(0, chartCount).map((s) => s.id);
  const { data: chartSessions = [] } = useSWR<Session[]>(
    chartIds.length > 0 ? `chart:${chartIds.join(",")}` : null,
    async () => {
      const results = await Promise.all(
        chartIds.map(async (sid) => {
          const ticks = await localFetcher(`/sessions/${sid}/ticks`);
          const meta = sessions.find((s) => s.id === sid) || {};
          return { ...meta, ticks: Array.isArray(ticks) ? ticks : [], orderBook: [], bets: [] } as unknown as Session;
        })
      );
      return results;
    },
    { refreshInterval: 10000 }
  );

  // Summary — direct from FastAPI
  const { data: stats } = useSWR<SummaryData>(
    "/stats", localFetcher, { refreshInterval: 5000 }
  );

  // Health + mode info from local API
  const { data: health } = useSWR("/health", localFetcher, { refreshInterval: 5000 });

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

  // Read manual target from local API
  const { data: targetState } = useSWR("/target", localFetcher, { refreshInterval: 3000 });
  const localManualTarget = targetState?.mode === "manual" ? targetState.target : null;

  async function handleSetManualTarget(price: number | null) {
    try {
      await fetch(`${LOCAL}/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
      mutate("/target");
    } catch (e) {
      console.error("target error:", e);
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
          {stats && (() => {
            const s = stats as unknown as Record<string, unknown>;
            const all = (s.all || s) as Record<string, unknown>;
            const tb = Number(all.total_bets ?? all.totalBets ?? 0);
            const wr = Number(all.winrate ?? all.winRate ?? 0);
            const pnl = Number(all.total_pnl ?? all.totalPnl ?? 0);
            const fees = Number(all.total_fees ?? all.totalFees ?? 0);
            if (tb <= 0) return null;
            return <>
              <StatBadge label="Bets" value={String(tb)} />
              <StatBadge label="Win Rate" value={`${wr}%`}
                color={wr >= 50 ? "emerald" : "red"} />
              <StatBadge label="P&L"
                value={`${pnl >= 0 ? "+" : ""}$${pnl.toFixed(0)}`}
                color={pnl >= 0 ? "emerald" : "red"} />
              {fees > 0 && <StatBadge label="Fees" value={`$${fees.toFixed(0)}`} />}
            </>;
          })()}
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
          <div className="ml-auto flex items-center gap-2">
            {health?.makerMode ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] bg-cyan-900/50 text-cyan-400">
                MAKER {health.makerOrderTTL}s
              </span>
            ) : (
              <span className="rounded px-1.5 py-0.5 text-[9px] bg-orange-900/50 text-orange-400">
                TAKER
              </span>
            )}
            {health?.realBetting ? (
              <span className="rounded px-1.5 py-0.5 text-[9px] bg-red-900/50 text-red-400">
                REAL ${health.betAmount}
              </span>
            ) : (
              <span className="rounded px-1.5 py-0.5 text-[9px] bg-blue-900/50 text-blue-400">
                PAPER
              </span>
            )}
            {localManualTarget != null && (
              <span className="text-yellow-400">
                Target: ${Number(localManualTarget).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
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

      {/* Phase Performance */}
      {stats && (() => {
        const all = ((stats as unknown as Record<string, unknown>).all || stats) as Record<string, unknown>;
        const bp = all.by_phase as Record<string, {bets:number; wins:number; winrate:number; pnl:number}> | undefined;
        if (!bp) return null;
        const phases = [
          { key: "early", label: "Early (>3m)", ...bp.early },
          { key: "mid", label: "Mid (1-3m)", ...bp.mid },
          { key: "late", label: "Late (<1m)", ...bp.late },
        ].filter(p => p.bets > 0);
        if (!phases.length) return null;
        return (
          <div className="grid grid-cols-3 gap-2">
            {phases.map(p => (
              <div key={p.key} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-500">{p.label}</span>
                  <span className={`text-xs font-bold ${p.winrate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                    {p.winrate}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p.winrate >= 50 ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{width: `${p.winrate}%`}} />
                </div>
                <div className="flex justify-between mt-1 text-[9px] text-zinc-600">
                  <span>{p.bets} bets</span>
                  <span className={p.pnl >= 0 ? "text-emerald-500" : "text-red-500"}>
                    {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Inline Strategies */}
      {showSettings && <InlineStrategies />}

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
          manualTarget={localManualTarget}
          onSetManualTarget={handleSetManualTarget}
          onBetUpdate={() => {
            mutate(`/api/btc-lab/sessions/${latestId}`);
            mutate("/api/btc-lab/summary");
          }}
        />
      </section>

      {/* Polymarket Real Trades */}
      <PolymarketTrades />

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

function InlineStrategies() {
  const { data: raw } = useSWR("/strategies", localFetcher, { refreshInterval: 3000 });
  const strats = Array.isArray(raw) ? raw : [];
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function create() {
    if (!name.trim()) return;
    await fetch(`${LOCAL}/strategies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    setCreating(false);
    mutate("/strategies");
  }

  async function toggle(id: string, current: boolean) {
    await fetch(`${LOCAL}/strategies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    mutate("/strategies");
  }

  async function del(id: string) {
    await fetch(`${LOCAL}/strategies/${id}`, { method: "DELETE" });
    mutate("/strategies");
  }

  const fmt = (n: number) => `${Math.floor((n||0)/60)}:${String((n||0)%60).padStart(2,"0")}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-200">Strategies</h3>
        <div className="flex gap-2">
          {!creating && (
            <button onClick={() => setCreating(true)}
              className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500">
              + New
            </button>
          )}
          <a href="/dashboard/btc-lab/strategies"
            className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200">
            Full page
          </a>
        </div>
      </div>

      {creating && (
        <div className="flex gap-2 mb-3">
          <input value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Strategy name..." autoFocus
            className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-200 focus:outline-none" />
          <button onClick={create}
            className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Add</button>
          <button onClick={() => setCreating(false)}
            className="text-xs text-zinc-500">Cancel</button>
        </div>
      )}

      {strats.length === 0 ? (
        <p className="text-xs text-zinc-500">No strategies. Create one to start tracking.</p>
      ) : (
        <div className="space-y-2">
          {strats.map((s: Record<string, unknown>) => {
            const id = String(s.id || "");
            const active = Boolean(s.isActive ?? s.is_active);
            const pnl = Number(s.totalPnl ?? s.total_pnl ?? 0);
            const bets = Number(s.totalBets ?? s.total_bets ?? 0);
            const wr = Number(s.winrate ?? s.winRate ?? 0);
            const edge = Number(s.minEdge ?? s.min_edge ?? 7);
            const amt = Number(s.betAmountUSDC ?? s.bet_amount_usdc ?? 10);
            const tMin = Number(s.timerMin ?? s.timer_min ?? 0);
            const tMax = Number(s.timerMax ?? s.timer_max ?? 300);
            const auto = Boolean(s.autobet);
            const mirror = Boolean(s.mirror);

            return (
              <div key={id} className={`rounded-lg border p-3 ${
                active ? "border-zinc-700 bg-zinc-950" : "border-zinc-800 bg-zinc-950 opacity-50"
              }`}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: active ? String(s.color || "#3b82f6") : "#3f3f46" }} />
                  <span className="text-sm font-bold text-zinc-200">{String(s.name)}</span>
                  {mirror && <span className="text-[8px] px-1 rounded bg-red-900/50 text-red-400">MIRROR</span>}
                  {auto && <span className="text-[8px] px-1 rounded bg-emerald-900/50 text-emerald-400">AUTO</span>}
                  <span className="text-[9px] text-zinc-600 font-mono ml-1">{id.slice(0, 20)}</span>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => toggle(id, active)}
                      className={`rounded px-2 py-0.5 text-[9px] border ${
                        active ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-500"
                      }`}>{active ? "ON" : "OFF"}</button>
                    <button onClick={() => del(id)}
                      className="rounded px-2 py-0.5 text-[9px] border border-red-800/50 text-red-400 hover:bg-red-900/30">X</button>
                  </div>
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-zinc-500">
                  <span>edge&gt;{edge}%</span>
                  <span>${amt}</span>
                  <span>{fmt(tMax)}-{fmt(tMin)}</span>
                  {bets > 0 && <>
                    <span className={pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                      P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
                    </span>
                    <span>{bets} bets</span>
                    <span>{wr}% WR</span>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PolymarketTrades() {
  const { data: balance } = useSWR("/polymarket/balance", localFetcher, { refreshInterval: 10000 });
  const { data: trades } = useSWR("/polymarket/trades", localFetcher, { refreshInterval: 10000 });
  const [show, setShow] = useState(false);

  if (!balance || balance.error) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Polymarket Account (real)
        </h2>
        <button onClick={() => setShow(!show)}
          className="text-xs text-zinc-500 hover:text-zinc-300">
          {show ? "Hide trades" : "Show trades"}
        </button>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-zinc-200">{balance.totalTrades}</div>
            <div className="text-[10px] text-zinc-500">Trades</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-400">${balance.totalSpent?.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-500">Total Spent</div>
          </div>
          <div>
            <div className="text-lg font-bold text-zinc-200">{balance.totalShares?.toFixed(1)}</div>
            <div className="text-[10px] text-zinc-500">Total Shares</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 font-mono">{balance.wallet?.slice(0, 10)}...</div>
            <div className="text-[10px] text-zinc-500">Wallet</div>
          </div>
        </div>
        {balance.byOutcome && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Object.entries(balance.byOutcome as Record<string, Record<string, number>>).map(([outcome, data]) => (
              <div key={outcome} className={`rounded-lg p-2 ${
                outcome === "Up" ? "bg-emerald-950/30" : "bg-red-950/30"
              }`}>
                <span className={`text-xs font-bold ${
                  outcome === "Up" ? "text-emerald-400" : "text-red-400"
                }`}>{outcome}</span>
                <span className="text-xs text-zinc-500 ml-2">
                  {data.count} trades | ${data.spent?.toFixed(2)} | {data.shares?.toFixed(1)} shares
                </span>
              </div>
            ))}
          </div>
        )}
        {show && Array.isArray(trades) && (
          <div className="mt-3 space-y-1">
            {trades.map((t: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs text-zinc-400 border-t border-zinc-800 py-1">
                <span className={`font-bold ${t.outcome === "Up" ? "text-emerald-400" : "text-red-400"}`}>
                  {String(t.outcome)}
                </span>
                <span>{Number(t.size).toFixed(1)} shares</span>
                <span>@ {Number(t.price).toFixed(2)}</span>
                <span className="text-zinc-600">{String(t.status)}</span>
                <span className="text-zinc-600 font-mono ml-auto">{String(t.orderId || "").slice(0, 16)}...</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Old StrategiesPanel kept for reference but unused
function _StrategiesPanel({
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
