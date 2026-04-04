"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface Strategy {
  id: string; name: string; description: string; color: string;
  isActive: boolean; minEdge: number; betAmountUSDC: number;
  autobet: boolean; autobetPhase: string;
  totalBets: number; totalRealBets: number; totalPaperBets: number;
  winRate: number; totalPnl: number; totalFees: number; avgEdge: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];
const PHASES = ["all", "early", "mid", "late"];

export default function StrategiesPage() {
  const { data: strategies = [] } = useSWR<Strategy[]>(
    "/api/btc-lab/strategies", fetcher, { refreshInterval: 5000 }
  );
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Strategy | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSave(data: Record<string, unknown>, id?: string) {
    const url = id ? `/api/btc-lab/strategies/${id}` : "/api/btc-lab/strategies";
    await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    mutate("/api/btc-lab/strategies");
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/btc-lab/strategies/${id}`, { method: "DELETE" });
    mutate("/api/btc-lab/strategies");
    setDeleting(null);
  }

  async function handleToggle(s: Strategy) {
    await fetch(`/api/btc-lab/strategies/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    mutate("/api/btc-lab/strategies");
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-sm text-zinc-500">Manage betting strategies for BTC Lab</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Add Strategy
        </button>
      </div>

      {strategies.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          No strategies yet. Create one to start tracking bets.
        </div>
      )}

      <div className="space-y-3">
        {strategies.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.isActive ? s.color : "#3f3f46" }} />
              <div>
                <span className="font-bold text-zinc-200">{s.name}</span>
                {s.description && (
                  <span className="ml-2 text-xs text-zinc-500">{s.description}</span>
                )}
                {/* ID with copy */}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[11px] text-zinc-600">{s.id}</span>
                  <button onClick={() => copyId(s.id)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors">
                    {copied === s.id ? "ok!" : "[copy]"}
                  </button>
                </div>
              </div>
              <div className="ml-auto flex gap-2">
                <button onClick={() => handleToggle(s)}
                  className={`rounded border px-2 py-0.5 text-[10px] ${
                    s.isActive ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-500"
                  }`}>
                  {s.isActive ? "Active" : "Paused"}
                </button>
                <button onClick={() => setEditing(s)}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200">
                  Edit
                </button>
                <button onClick={() => setDeleting(s)}
                  className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30">
                  Delete
                </button>
              </div>
            </div>

            {/* Config summary */}
            <div className="mt-2 flex gap-3 text-[10px] text-zinc-600">
              <span>Edge &gt;{s.minEdge ?? 7}%</span>
              <span>${s.betAmountUSDC ?? 10} USDC</span>
              <span>Autobet: {s.autobet ? "ON" : "OFF"}</span>
              <span>Phase: {s.autobetPhase || "all"}</span>
            </div>

            {/* Stats */}
            {s.totalBets > 0 ? (
              <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                <span className={s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}>
                  {s.winRate}% WR
                </span>
                <span className={s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  P&L: {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(0)}
                </span>
                <span>Fees: ${s.totalFees.toFixed(0)}</span>
                <span>{s.totalBets} bets ({s.totalRealBets}R / {s.totalPaperBets}P)</span>
              </div>
            ) : (
              <div className="mt-1 text-xs text-zinc-600">No bets yet</div>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit modal */}
      {(creating || editing) && (
        <StrategyModal
          strategy={editing}
          onSave={(data) => handleSave(data, editing?.id)}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Delete strategy?</h3>
            <p className="text-sm text-zinc-400 mb-1">
              Delete &quot;{deleting.name}&quot;?
            </p>
            {deleting.totalBets > 0 && (
              <p className="text-sm text-red-400 mb-4">
                {deleting.totalBets} bets and all stats will be permanently deleted.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button onClick={() => handleDelete(deleting.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyModal({
  strategy, onSave, onClose,
}: {
  strategy: Strategy | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(strategy?.name || "");
  const [desc, setDesc] = useState(strategy?.description || "");
  const [color, setColor] = useState(strategy?.color || COLORS[0]);
  const [minEdge, setMinEdge] = useState(strategy?.minEdge ?? 7);
  const [betAmount, setBetAmount] = useState(strategy?.betAmountUSDC ?? 10);
  const [autobet, setAutobet] = useState(strategy?.autobet ?? false);
  const [phase, setPhase] = useState(strategy?.autobetPhase || "all");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold text-zinc-100 mb-4">
          {strategy ? "Edit Strategy" : "New Strategy"}
        </h3>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-3">Auto-betting parameters</h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Min Edge */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Min Edge (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={30} step={0.5} value={minEdge}
                    onChange={(e) => setMinEdge(parseFloat(e.target.value))}
                    className="flex-1 accent-yellow-500" />
                  <span className="text-sm font-mono font-bold text-yellow-400 w-10 text-right">{minEdge}%</span>
                </div>
              </div>

              {/* Bet Amount */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Bet Amount (USDC)</label>
                <input type="number" min={1} max={1000} step={1} value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value) || 10)}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
              </div>

              {/* Autobet toggle */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Auto-bet</label>
                <button onClick={() => setAutobet(!autobet)}
                  className={`w-full rounded border px-3 py-2 text-sm font-medium transition-colors ${
                    autobet
                      ? "border-emerald-600 bg-emerald-900/30 text-emerald-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500"
                  }`}>
                  {autobet ? "ON — auto-place bets" : "OFF — manual only"}
                </button>
              </div>

              {/* Timer phase */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Timer phase</label>
                <div className="flex gap-1">
                  {PHASES.map((p) => (
                    <button key={p} onClick={() => setPhase(p)}
                      className={`flex-1 rounded px-2 py-2 text-xs font-medium ${
                        phase === p
                          ? "bg-zinc-700 text-zinc-200"
                          : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400">Cancel</button>
          <button
            onClick={() => name && onSave({
              name, description: desc, color,
              minEdge, betAmountUSDC: betAmount, autobet, autobetPhase: phase,
            })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
