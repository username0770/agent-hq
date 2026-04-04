"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface Strategy {
  id: string; name: string; description: string; color: string;
  isActive: boolean; minEdge: number; betAmountUSDC: number;
  autobet: boolean; autobetPhase: string;
  timerMin: number; timerMax: number; priceMin: number; priceMax: number;
  mirror: boolean; fairMin: number; cooldown: number; maxBetsPerWindow: number;
  totalBets: number; totalRealBets: number; totalPaperBets: number;
  winRate: number; totalPnl: number; totalFees: number; avgEdge: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

export default function StrategiesPage() {
  const { data: strategies = [] } = useSWR<Strategy[]>(
    "/api/btc-lab/strategies", fetcher, { refreshInterval: 5000 }
  );
  const [editing, setEditing] = useState<Strategy | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Strategy | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSave(data: Record<string, unknown>, id?: string) {
    await fetch(id ? `/api/btc-lab/strategies/${id}` : "/api/btc-lab/strategies", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    mutate("/api/btc-lab/strategies");
    setEditing(null); setCreating(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/btc-lab/strategies/${id}`, { method: "DELETE" });
    mutate("/api/btc-lab/strategies"); setDeleting(null);
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
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  }

  const fmt = (n: number) => `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-sm text-zinc-500">Manage betting strategies</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Add Strategy
        </button>
      </div>

      {strategies.length === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
          No strategies yet. Create one to start.
        </div>
      )}

      <div className="space-y-3">
        {strategies.map((s) => (
          <div key={s.id} className={`rounded-xl border bg-zinc-900 p-4 ${
            s.isActive ? "border-zinc-800" : "border-zinc-800 opacity-60"
          }`}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.isActive ? s.color : "#3f3f46" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-200">{s.name}</span>
                  {s.mirror && <span className="text-[9px] px-1 py-0.5 rounded bg-red-900/50 text-red-400">MIRROR</span>}
                  {s.autobet && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-900/50 text-emerald-400">AUTO</span>}
                  {s.description && <span className="text-xs text-zinc-500 truncate">{s.description}</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[11px] text-zinc-600">{s.id}</span>
                  <button onClick={() => copyId(s.id)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-300">{copied === s.id ? "ok!" : "[copy]"}</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleToggle(s)}
                  className={`rounded border px-2 py-0.5 text-[10px] ${s.isActive ? "border-emerald-700 text-emerald-400" : "border-zinc-700 text-zinc-500"}`}>
                  {s.isActive ? "Active" : "Paused"}</button>
                <button onClick={() => setEditing(s)}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200">Edit</button>
                <button onClick={() => setDeleting(s)}
                  className="rounded border border-red-800/50 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/30">Delete</button>
              </div>
            </div>

            {/* Config */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
              <span>Edge &gt;{s.minEdge ?? 7}%</span>
              <span>${s.betAmountUSDC ?? 10}</span>
              <span>Timer {fmt(s.timerMax ?? 300)}-{fmt(s.timerMin ?? 0)}</span>
              <span>Price {((s.priceMin ?? 0.01)*100).toFixed(0)}-{((s.priceMax ?? 0.99)*100).toFixed(0)}c</span>
              <span>Max {s.maxBetsPerWindow ?? 5}/window</span>
              <span>CD {s.cooldown ?? 30}s</span>
              {(s.fairMin ?? 0) > 0 && <span>Fair &gt;{((s.fairMin)*100).toFixed(0)}%</span>}
              <span>Phase: {s.autobetPhase || "all"}</span>
            </div>

            {/* Stats */}
            {s.totalBets > 0 ? (
              <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                <span className={s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}>{s.winRate}% WR</span>
                <span className={s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  P&L: {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(0)}</span>
                <span>Fees: ${s.totalFees.toFixed(0)}</span>
                <span>{s.totalBets} bets ({s.totalRealBets}R/{s.totalPaperBets}P)</span>
              </div>
            ) : <div className="mt-1 text-xs text-zinc-600">No bets yet</div>}
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <StrategyModal strategy={editing}
          onSave={(data) => handleSave(data, editing?.id)}
          onClose={() => { setCreating(false); setEditing(null); }} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Delete strategy?</h3>
            <p className="text-sm text-zinc-400 mb-1">Delete &quot;{deleting.name}&quot;?</p>
            {deleting.totalBets > 0 && (
              <p className="text-sm text-red-400 mb-4">{deleting.totalBets} bets will be permanently deleted.</p>)}
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="rounded-lg px-4 py-2 text-sm text-zinc-400">Cancel</button>
              <button onClick={() => handleDelete(deleting.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyModal({ strategy, onSave, onClose }: {
  strategy: Strategy | null;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [s, setS] = useState({
    name: strategy?.name || "",
    description: strategy?.description || "",
    color: strategy?.color || COLORS[0],
    minEdge: strategy?.minEdge ?? 7,
    betAmountUSDC: strategy?.betAmountUSDC ?? 10,
    autobet: strategy?.autobet ?? false,
    autobetPhase: strategy?.autobetPhase || "all",
    timerMin: strategy?.timerMin ?? 0,
    timerMax: strategy?.timerMax ?? 300,
    priceMin: strategy?.priceMin ?? 0.01,
    priceMax: strategy?.priceMax ?? 0.99,
    mirror: strategy?.mirror ?? false,
    fairMin: strategy?.fairMin ?? 0,
    cooldown: strategy?.cooldown ?? 30,
    maxBetsPerWindow: strategy?.maxBetsPerWindow ?? 5,
  });

  const fmt = (n: number) => `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold text-zinc-100 mb-4">
          {strategy ? "Edit Strategy" : "New Strategy"}
        </h3>

        <div className="space-y-4">
          {/* Name + Description + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Name</label>
              <input value={s.name} onChange={(e) => setS({...s, name: e.target.value})} autoFocus
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <input value={s.description} onChange={(e) => setS({...s, description: e.target.value})}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setS({...s, color: c})}
                  className={`h-7 w-7 rounded-full border-2 ${s.color === c ? "border-white" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Toggles row */}
          <div className="border-t border-zinc-800 pt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Auto-bet</label>
              <button onClick={() => setS({...s, autobet: !s.autobet})}
                className={`w-full rounded border px-2 py-1.5 text-xs font-medium ${
                  s.autobet ? "border-emerald-600 bg-emerald-900/30 text-emerald-400"
                            : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>
                {s.autobet ? "ON" : "OFF"}
              </button>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Mirror (contrarian)</label>
              <button onClick={() => setS({...s, mirror: !s.mirror})}
                className={`w-full rounded border px-2 py-1.5 text-xs font-medium ${
                  s.mirror ? "border-red-600 bg-red-900/30 text-red-400"
                           : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>
                {s.mirror ? "ON — opposite" : "OFF"}
              </button>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Timer phase</label>
              <div className="flex gap-0.5">
                {(["all","early","mid","late"] as const).map((p) => (
                  <button key={p} onClick={() => setS({...s, autobetPhase: p})}
                    className={`flex-1 rounded px-1 py-1.5 text-[10px] font-medium ${
                      s.autobetPhase === p ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Min Edge */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Min Edge % <span className="text-yellow-400">{s.minEdge}%</span></label>
              <input type="range" min={0} max={30} step={0.5} value={s.minEdge}
                onChange={(e) => setS({...s, minEdge: parseFloat(e.target.value)})}
                className="w-full accent-yellow-500" />
            </div>

            {/* Bet Amount */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Bet Amount USDC</label>
              <input type="number" min={1} max={1000} value={s.betAmountUSDC}
                onChange={(e) => setS({...s, betAmountUSDC: parseInt(e.target.value) || 10})}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none" />
            </div>

            {/* Timer from */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Timer from <span className="text-zinc-300">{fmt(s.timerMax)}</span></label>
              <input type="range" min={0} max={300} step={5} value={s.timerMax}
                onChange={(e) => setS({...s, timerMax: parseInt(e.target.value)})}
                className="w-full accent-yellow-500" />
            </div>

            {/* Timer to */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Timer to <span className="text-zinc-300">{fmt(s.timerMin)}</span></label>
              <input type="range" min={0} max={300} step={5} value={s.timerMin}
                onChange={(e) => setS({...s, timerMin: parseInt(e.target.value)})}
                className="w-full accent-yellow-500" />
            </div>

            {/* Price min */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Price min <span className="text-yellow-400">{(s.priceMin*100).toFixed(0)}c</span></label>
              <input type="range" min={0.01} max={0.99} step={0.01} value={s.priceMin}
                onChange={(e) => setS({...s, priceMin: parseFloat(e.target.value)})}
                className="w-full accent-yellow-500" />
            </div>

            {/* Price max */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Price max <span className="text-yellow-400">{(s.priceMax*100).toFixed(0)}c</span></label>
              <input type="range" min={0.01} max={0.99} step={0.01} value={s.priceMax}
                onChange={(e) => setS({...s, priceMax: parseFloat(e.target.value)})}
                className="w-full accent-yellow-500" />
            </div>

            {/* Fair min */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">
                Fair min <span className="text-yellow-400">{s.fairMin > 0 ? `${(s.fairMin*100).toFixed(0)}%` : "off"}</span>
              </label>
              <input type="range" min={0} max={1} step={0.01} value={s.fairMin}
                onChange={(e) => setS({...s, fairMin: parseFloat(e.target.value)})}
                className="w-full accent-yellow-500" />
              <p className="text-[9px] text-zinc-600">{s.fairMin > 0 ? "Bet when fair >= this (ignores edge)" : "Disabled"}</p>
            </div>

            {/* Cooldown */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Cooldown <span className="text-zinc-300">{s.cooldown}s</span></label>
              <input type="number" min={5} max={120} step={5} value={s.cooldown}
                onChange={(e) => setS({...s, cooldown: parseInt(e.target.value) || 30})}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none" />
            </div>

            {/* Max bets */}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Max bets/window</label>
              <input type="number" min={1} max={20} value={s.maxBetsPerWindow}
                onChange={(e) => setS({...s, maxBetsPerWindow: parseInt(e.target.value) || 5})}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:outline-none" />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">
            ${s.betAmountUSDC} | edge &gt;{s.minEdge}% | timer {fmt(s.timerMax)}-{fmt(s.timerMin)} | price {(s.priceMin*100).toFixed(0)}-{(s.priceMax*100).toFixed(0)}c | max {s.maxBetsPerWindow}/win | cd {s.cooldown}s
            {s.mirror && " | MIRROR"}{s.fairMin > 0 && ` | fair>${(s.fairMin*100).toFixed(0)}%`}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400">Cancel</button>
          <button onClick={() => s.name && onSave(s)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
