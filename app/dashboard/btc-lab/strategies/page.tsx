"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

interface Strategy {
  id: string; name: string; description: string; color: string;
  isActive: boolean; totalBets: number; totalRealBets: number;
  totalPaperBets: number; winRate: number; totalPnl: number;
  totalFees: number; avgEdge: number;
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

  async function handleSave(data: { name: string; description: string; color: string }, id?: string) {
    const url = id ? `/api/btc-lab/strategies/${id}` : "/api/btc-lab/strategies";
    const method = id ? "PATCH" : "POST";
    await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strategies</h1>
          <p className="text-sm text-zinc-500">Manage betting strategies for BTC Lab</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
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
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: s.isActive ? s.color : "#3f3f46" }}
              />
              <span className="font-bold text-zinc-200">{s.name}</span>
              {s.description && (
                <span className="text-xs text-zinc-500">{s.description}</span>
              )}
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
            {s.totalBets > 0 ? (
              <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                <span className={s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}>
                  {s.winRate}% WR
                </span>
                <span className={s.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                  P&L: {s.totalPnl >= 0 ? "+" : ""}${s.totalPnl.toFixed(0)}
                </span>
                <span>Fees: ${s.totalFees.toFixed(0)}</span>
                <span>{s.totalBets} bets ({s.totalRealBets}R / {s.totalPaperBets}P)</span>
                <span>Avg edge: {s.avgEdge}%</span>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-600">No bets yet</div>
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
            <p className="text-sm text-zinc-400 mb-4">
              Delete &quot;{deleting.name}&quot;?
              {deleting.totalBets > 0 && ` ${deleting.totalBets} bets and all stats will be permanently deleted.`}
            </p>
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
  onSave: (data: { name: string; description: string; color: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(strategy?.name || "");
  const [desc, setDesc] = useState(strategy?.description || "");
  const [color, setColor] = useState(strategy?.color || COLORS[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h3 className="text-lg font-bold text-zinc-100 mb-4">
          {strategy ? "Edit Strategy" : "New Strategy"}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
          </div>
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
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400">Cancel</button>
          <button onClick={() => name && onSave({ name, description: desc, color })}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
